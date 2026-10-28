import difflib
from typing import Dict, Any
from app.services.ocr.ocr_service import OCRService

def check_fuzzy_match(query: str, text: str, threshold: float = 0.85) -> bool:
    if not query or not text:
        return False
        
    query_lower = query.lower()
    text_lower = text.lower()
    
    if query_lower in text_lower:
        return True
        
    words = text_lower.split()
    query_words_len = len(query_lower.split())
    
    # Try matching against word chunks of roughly the same word count as the query
    for i in range(len(words) - query_words_len + 1):
        window = " ".join(words[i:i + query_words_len])
        if difflib.SequenceMatcher(None, query_lower, window).ratio() >= threshold:
            return True
            
    # Try one word longer to account for suffixes like "Inc." or "Pvt Ltd"
    for i in range(len(words) - query_words_len):
        window = " ".join(words[i:i + query_words_len + 1])
        if difflib.SequenceMatcher(None, query_lower, window).ratio() >= threshold:
            return True
            
    return False

class DocumentCrossReferenceService:
    def __init__(self, ocr_service: OCRService):
        self._ocr = ocr_service

    async def verify_document(self, document_bytes: bytes, user_verified_name: str, country_hint: str) -> Dict[str, Any]:
        """
        Uses OCR to extract text from a business document, finds the Tax ID,
        and cross-references the extracted name against the user's verified personal name.
        """
        # We reuse OCRService, but give a country hint prioritizing company patterns
        ocr_out = await self._ocr.process(document_bytes)
        
        tax_id = ocr_out.id_number
        tax_id_pattern = ocr_out.id_number_pattern
        raw_text = ocr_out.raw_extracted_text
        
        if not ocr_out.passed or not tax_id:
            return {
                "tax_id": None,
                "tax_id_pattern": None,
                "extracted_name": None,
                "name_match": False,
                "passed": False,
                "failure_reason": f"OCR failed to find valid Tax ID: {ocr_out.failure_reason}"
            }
        
        # Document Cross-Reference
        # Uses fuzzy matching (85% threshold) to account for minor OCR noise or legal suffixes
        name_match = check_fuzzy_match(user_verified_name, raw_text, threshold=0.85)
        
        passed = name_match
        failure_reason = None if passed else "The user's verified name does not appear on the business document with sufficient confidence."
        
        return {
            "tax_id": tax_id,
            "tax_id_pattern": tax_id_pattern,
            "extracted_name": raw_text[:100],  # Mocking extracted name
            "name_match": name_match,
            "passed": passed,
            "failure_reason": failure_reason
        }
