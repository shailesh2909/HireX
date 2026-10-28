"""
OCR Service — Stage 1 of the Identity & Trust pipeline.

Architecture:
  OCRService acts as a pure function: image bytes in, structured result out.
  It is injected into the orchestrator and can be swapped for any other
  OCR backend by implementing the same interface.

Why EasyOCR over pure Tesseract?
  - EasyOCR handles skewed, blurry, and low-light IDs better out of the box.
  - Tesseract is used as a fallback because it is faster and sometimes
    more accurate on clean, machine-printed text.
  - PaddleOCR can be added as a third engine via the same interface.

Preprocessing pipeline (order matters):
  1. Denoise  — reduces salt-and-pepper noise from camera compression
  2. Deskew   — fixes rotation up to ±15°
  3. Contrast — CLAHE enhances text edges against busy backgrounds
  4. Threshold — adaptive binarisation for uneven lighting

ID Number Validation:
  Country-specific regex patterns. Adding a new country = adding one entry
  to ID_PATTERNS. No code changes required elsewhere.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageEnhance

from app.core.exceptions import IDNumberInvalid, IDNumberNotFound, ImageQualityTooLow
from app.core.security import get_logger

logger = get_logger(__name__)

# ── Country-specific ID patterns ──────────────────────────────────────────────
# Format: { country_code: [(pattern_name, compiled_regex), ...] }
ID_PATTERNS: dict[str, list[tuple[str, re.Pattern[str]]]] = {
    "IN": [
        ("AADHAAR", re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")),
        ("PAN",     re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")),
        ("VOTER",   re.compile(r"\b[A-Z]{3}[0-9]{7}\b")),
    ],
    "US": [
        ("SSN",     re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
        ("DL",      re.compile(r"\b[A-Z]\d{7}\b")),
    ],
    "GB": [
        ("PASSPORT", re.compile(r"\b[0-9]{9}\b")),
        ("NI",       re.compile(r"\b[A-Z]{2}\d{6}[A-Z]\b")),
    ],
    "IN_COMPANY": [
        ("CIN", re.compile(r"\b[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b")),
        ("GSTIN", re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b")),
    ],
    "US_COMPANY": [
        ("EIN", re.compile(r"\b\d{2}-\d{7}\b")),
    ],
    "GENERIC": [
        ("NUMERIC_9", re.compile(r"\b\d{9,12}\b")),
        ("ALPHANUM",  re.compile(r"\b[A-Z0-9]{8,14}\b")),
    ],
}


@dataclass
class OCROutput:
    passed: bool
    id_number: str | None = None          # plaintext; caller encrypts before storage
    id_number_pattern: str | None = None
    id_country: str | None = None
    ocr_confidence: float = 0.0
    raw_extracted_text: str = ""
    engine_used: str = ""
    preprocessing_applied: list[str] = field(default_factory=list)
    failure_reason: str | None = None


class OCRService:
    """
    Stateless OCR service.  Instantiate once and reuse across requests.
    EasyOCR model is loaded lazily and cached to avoid cold-start latency.
    """

    def __init__(
        self,
        languages: list[str] | None = None,
        min_confidence: float = 0.70,
        country_hint: str | None = None,
    ) -> None:
        self._languages = languages or ["en"]
        self._min_confidence = min_confidence
        self._country_hint = country_hint
        self._reader: Any = None   # EasyOCR Reader (lazy)

    # ── Public API ────────────────────────────────────────────────────────────

    async def process(self, image_bytes: bytes) -> OCROutput:
        """
        Full OCR pipeline: preprocess → extract → detect ID → validate.
        Raises ImageQualityTooLow if the image is unusable.
        Returns OCROutput with passed=False (not raised) for soft failures.
        """
        logger.info("ocr.start", image_size=len(image_bytes))

        img_array = self._bytes_to_array(image_bytes)
        self._quality_gate(img_array)

        processed, steps = self._preprocess(img_array)
        logger.debug("ocr.preprocessed", steps=steps)

        # Primary: EasyOCR
        try:
            text, confidence, engine = await self._extract_easyocr(processed)
        except Exception as exc:
            logger.warning("ocr.easyocr_failed", error=str(exc))
            # Fallback: Tesseract
            try:
                text, confidence, engine = self._extract_tesseract(processed)
            except Exception as exc2:
                return OCROutput(
                    passed=False,
                    engine_used="none",
                    failure_reason=f"All OCR engines failed: {exc2}",
                    preprocessing_applied=steps,
                )

        logger.debug("ocr.extracted", engine=engine, confidence=confidence, text_len=len(text))

        if confidence < self._min_confidence:
            return OCROutput(
                passed=False,
                ocr_confidence=confidence,
                raw_extracted_text=text,
                engine_used=engine,
                preprocessing_applied=steps,
                failure_reason=f"OCR confidence {confidence:.2f} below threshold {self._min_confidence}",
            )

        id_number, pattern, country = self._detect_id_number(text)

        if id_number is None:
            raise IDNumberNotFound("No valid ID number pattern found in extracted text")

        return OCROutput(
            passed=True,
            id_number=id_number,
            id_number_pattern=pattern,
            id_country=country,
            ocr_confidence=confidence,
            raw_extracted_text=text,
            engine_used=engine,
            preprocessing_applied=steps,
        )

    # ── Preprocessing ─────────────────────────────────────────────────────────

    def _preprocess(self, img: np.ndarray) -> tuple[np.ndarray, list[str]]:
        steps: list[str] = []

        # 1. Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            steps.append("grayscale")
        else:
            gray = img.copy()

        # 2. Assess image Laplacian variance (blur) and global contrast
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        contrast_score = gray.std()

        # 3. Denoise (fast NLMeans for document images)
        denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
        steps.append("denoise")
        current_img = denoised

        # 4. Apply Deskewing only when the assessment indicates the image isn't too blurry
        if blur_score > 50:
            deskewed, angle = self._deskew(current_img)
            if abs(angle) > 0.5:
                current_img = deskewed
                steps.append(f"deskew({angle:.1f}°)")

        # 5. Apply CLAHE for shadow recovery only if global contrast is low
        if contrast_score < 50.0:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            current_img = clahe.apply(current_img)
            steps.append("clahe")

        # 6. Adaptive threshold for binarisation
        binary = cv2.adaptiveThreshold(
            current_img, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2,
        )
        steps.append("adaptive_threshold")

        return binary, steps

    @staticmethod
    def _deskew(img: np.ndarray) -> tuple[np.ndarray, float]:
        """Estimate skew angle via Hough lines and rotate to correct."""
        edges = cv2.Canny(img, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=10)
        if lines is None:
            return img, 0.0

        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 != x1:
                angles.append(np.degrees(np.arctan2(y2 - y1, x2 - x1)))

        if not angles:
            return img, 0.0

        angle = float(np.median(angles))
        if abs(angle) > 15:  # ignore implausible skew
            return img, 0.0

        h, w = img.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, angle

    # ── OCR Engines ───────────────────────────────────────────────────────────

    def _get_reader(self) -> Any:
        if self._reader is None:
            import easyocr  # type: ignore[import-untyped]
            self._reader = easyocr.Reader(self._languages, gpu=False, verbose=False)
        return self._reader

    async def _extract_easyocr(self, img: np.ndarray) -> tuple[str, float, str]:
        """Run EasyOCR. Returns (full_text, mean_confidence, engine_name)."""
        reader = self._get_reader()
        # EasyOCR returns [(bbox, text, prob), ...]
        results = reader.readtext(img, detail=1, paragraph=False)
        if not results:
            return "", 0.0, "easyocr"
        texts = [r[1] for r in results]
        confs = [float(r[2]) for r in results]
        return " ".join(texts), float(np.mean(confs)), "easyocr"

    @staticmethod
    def _extract_tesseract(img: np.ndarray) -> tuple[str, float, str]:
        """Tesseract fallback. Returns (full_text, estimated_confidence, engine_name)."""
        import pytesseract  # type: ignore[import-untyped]
        pil_img = Image.fromarray(img)
        config = r"--oem 3 --psm 6"
        data = pytesseract.image_to_data(pil_img, config=config, output_type=pytesseract.Output.DICT)
        confs = [int(c) for c in data["conf"] if str(c).isdigit() and int(c) >= 0]
        text = pytesseract.image_to_string(pil_img, config=config).strip()
        confidence = float(np.mean(confs)) / 100.0 if confs else 0.0
        return text, confidence, "tesseract"

    # ── ID Detection ──────────────────────────────────────────────────────────

    def _detect_id_number(self, text: str) -> tuple[str | None, str | None, str | None]:
        """
        Try country-specific patterns first, fall back to GENERIC.
        Returns (id_number, pattern_name, country_code) or (None, None, None).
        """
        text_clean = re.sub(r"\s{2,}", " ", text.upper())

        # Prefer country hint if provided
        search_order = []
        if self._country_hint and self._country_hint in ID_PATTERNS:
            search_order.append(self._country_hint)
        search_order.extend(k for k in ID_PATTERNS if k not in (self._country_hint, "GENERIC"))
        search_order.append("GENERIC")

        for country in search_order:
            for pattern_name, regex in ID_PATTERNS[country]:
                match = regex.search(text_clean)
                if match:
                    raw = match.group(0).replace(" ", "")
                    return raw, pattern_name, country

        return None, None, None

    # ── Quality gate ──────────────────────────────────────────────────────────

    @staticmethod
    def _quality_gate(img: np.ndarray) -> None:
        h, w = img.shape[:2]
        if h < 100 or w < 100:
            raise ImageQualityTooLow("Image too small (min 100×100 px)")
        if img.std() < 10:
            raise ImageQualityTooLow("Image has too little contrast (possibly blank)")

    @staticmethod
    def _bytes_to_array(data: bytes) -> np.ndarray:
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ImageQualityTooLow("Could not decode image — unsupported format or corrupt data")
        return img
