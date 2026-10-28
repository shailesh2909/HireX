from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import difflib
import fitz  # PyMuPDF

app = FastAPI(title="Forensics & Verification API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the OCR Reader in memory (loads models once at startup)
print("Loading OCR Models... (This takes a few seconds)")
reader = easyocr.Reader(['en']) 
print("Models Loaded. Ready for forensics.")



# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "engine": "forensics_verification", "version": "1.0.0"}


# ── Existing route: Document forensics for company-svc bridge ─────────────────

@app.post("/api/forensics/verify-document")
async def verify_document(
    expected_name: str = Form(...),
    document: UploadFile = File(...)
):
    try:
        contents = await document.read()
        target_name = expected_name.lower().strip()
        
        is_pdf = document.filename.lower().endswith('.pdf') or document.content_type == 'application/pdf'
        extracted_text_list = [] # We will store text from all pages here

        if is_pdf:
            print("📄 PDF detected! Scanning up to the first 3 pages...")
            pdf_doc = fitz.open(stream=contents, filetype="pdf")
            if len(pdf_doc) == 0:
                raise Exception("The uploaded PDF is empty.")
            
            # Limit to 3 pages to keep the API fast!
            pages_to_scan = min(3, len(pdf_doc))
            
            for page_num in range(pages_to_scan):
                print(f"   -> Rendering and reading Page {page_num + 1}...")
                page = pdf_doc.load_page(page_num)
                pix = page.get_pixmap(dpi=200)
                image_bytes = pix.tobytes("png")
                
                # Run OCR on this specific page and add to our master list
                page_text = reader.readtext(image_bytes, detail=0)
                extracted_text_list.extend(page_text)
                
            pdf_doc.close()
        else:
            print("🔍 Running AI text extraction on standard image...")
            extracted_text_list = reader.readtext(contents, detail=0)

        # Combine all extracted text from ALL scanned pages into one giant string
        full_document_text = " ".join(extracted_text_list).lower()

        # 4. Difflib Fuzzy Matching Engine
        words = full_document_text.split()
        name_length = len(target_name.split())
        highest_score = 0.0

        if name_length > 0 and len(words) >= name_length:
            for i in range(len(words) - name_length + 1):
                window_text = " ".join(words[i:i+name_length])
                score = difflib.SequenceMatcher(None, target_name, window_text).ratio()
                if score > highest_score:
                    highest_score = score
        elif len(words) > 0 and len(words) < name_length:
            highest_score = difflib.SequenceMatcher(None, target_name, full_document_text).ratio()

        # 5. The Judge-Grade Decision Gate (85% Match Required)
        threshold = 0.85
        passed = highest_score >= threshold

        return JSONResponse(content={
            "expected_name": expected_name,
            "highest_match_score": round(highest_score, 4),
            "passed": passed,
            # We cut the preview to 300 chars so it doesn't flood Postman
            "extracted_preview": full_document_text[:300] + "..." if full_document_text else "No text found."
        })

    except Exception as e:
        print(f"🚨 Forensics Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    # Runs the Python service on Port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)