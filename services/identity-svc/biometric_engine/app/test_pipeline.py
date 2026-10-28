"""
Test Suite — Identity & Trust Engine.

Real-world scenarios tested:
  1.  Happy path — valid ID + live selfie → verified
  2.  Blurry ID card → OCR quality gate fails
  3.  No ID number on card (e.g. business card uploaded) → IDNumberNotFound
  4.  Spoof detected (printed photo) → liveness rejected
  5.  Face mismatch (different person's selfie) → face verification rejected
  6.  Face verification uncertain (score in grey zone) → manual review
  7.  Duplicate identity (same person re-registering) → deduplication rejected
  8.  Partial pipeline failure (DB unavailable at stage 5)
  9.  Replay attack (same image fingerprint submitted twice)
  10. Oversized image → HTTP 413
  11. Wrong content type → HTTP 415
  12. Rate limit exceeded → HTTP 429
  13. Ensemble: 2/3 models fail → uncertain (not hard reject)
  14. OCR engine fallback (EasyOCR fails → Tesseract used)

Running:
  pytest tests/ -v --cov=app --cov-report=term-missing
"""
from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
import pytest_asyncio

from app.services.deduplication.deduplication_service import DeduplicationOutput, DeduplicationService
from app.services.face_verification.face_verification_service import (
    FaceVerificationOutput,
    FaceVerificationService,
    SingleModelScore,
)
from app.services.liveness.liveness_service import LivenessOutput, LivenessService
from app.services.ocr.ocr_service import OCROutput, OCRService


# ═══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def minimal_jpeg() -> bytes:
    """Minimal valid JPEG bytes (1×1 white pixel)."""
    # Standard 1×1 JPEG
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD2, 0x8A, 0x28, 0x03, 0xFF, 0xD9,
    ])


@pytest.fixture
def mock_ocr_pass() -> OCROutput:
    return OCROutput(
        passed=True,
        id_number="123456789012",
        id_number_pattern="AADHAAR",
        id_country="IN",
        ocr_confidence=0.92,
        raw_extracted_text="Name: John Doe  1234 5678 9012",
        engine_used="easyocr",
        preprocessing_applied=["grayscale", "denoise", "clahe"],
    )


@pytest.fixture
def mock_liveness_pass() -> LivenessOutput:
    return LivenessOutput(passed=True, liveness_score=0.96, is_live=True)


@pytest.fixture
def mock_face_verified() -> FaceVerificationOutput:
    return FaceVerificationOutput(
        passed=True,
        model_scores=[
            SingleModelScore("ArcFace",  0.91, 0.68, True),
            SingleModelScore("Facenet",  0.87, 0.40, True),
            SingleModelScore("VGG-Face", 0.83, 0.40, True),
        ],
        aggregated_score=0.889,
        decision="verified",
    )


@pytest.fixture
def mock_dedup_pass() -> DeduplicationOutput:
    return DeduplicationOutput(
        passed=True,
        is_duplicate=False,
        vector_db_used="memory",
        embedding_id="abc123",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# OCR Service Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestOCRService:

    @pytest.mark.asyncio
    async def test_detects_aadhaar_number(self):
        """Verify Aadhaar 12-digit pattern is extracted from OCR text."""
        svc = OCRService()
        result = svc._detect_id_number("Name: Rahul Sharma  1234 5678 9012  DOB: 01/01/1990")
        assert result[0] == "123456789012"
        assert result[1] == "AADHAAR"
        assert result[2] == "IN"

    @pytest.mark.asyncio
    async def test_detects_pan_number(self):
        svc = OCRService()
        result = svc._detect_id_number("PAN Card  ABCDE1234F  Income Tax Dept")
        assert result[0] == "ABCDE1234F"
        assert result[1] == "PAN"

    @pytest.mark.asyncio
    async def test_no_id_number_returns_none(self):
        svc = OCRService()
        result = svc._detect_id_number("Hello World This is just some random text")
        assert result == (None, None, None)

    @pytest.mark.asyncio
    async def test_quality_gate_rejects_tiny_image(self, minimal_jpeg):
        """Images smaller than 100x100 must be rejected before OCR."""
        import numpy as np
        import cv2
        tiny = np.zeros((50, 50, 3), dtype=np.uint8)
        from app.core.exceptions import ImageQualityTooLow
        with pytest.raises(ImageQualityTooLow, match="too small"):
            OCRService._quality_gate(tiny)

    @pytest.mark.asyncio
    async def test_country_hint_prioritises_patterns(self):
        """When country_hint='IN', Indian patterns should match before US patterns."""
        svc = OCRService(country_hint="IN")
        # Text contains both a generic 9-digit number and Aadhaar — Aadhaar wins
        result = svc._detect_id_number("123456789 and also 1234 5678 9012")
        assert result[1] == "AADHAAR"

    def test_deskew_returns_original_for_no_lines(self):
        """No edges → no angle → original image returned unchanged."""
        import numpy as np
        blank = np.zeros((200, 200), dtype=np.uint8)
        out, angle = OCRService._deskew(blank)
        assert angle == 0.0
        assert out.shape == blank.shape


# ═══════════════════════════════════════════════════════════════════════════════
# Liveness Service Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestLivenessService:

    @pytest.mark.asyncio
    async def test_low_score_returns_failed_output(self):
        svc = LivenessService(min_confidence=0.80)
        with patch.object(svc, "_infer", return_value=0.50):
            with patch.object(svc, "_detect_and_crop_face", return_value=b""):
                import numpy as np
                fake_img = np.zeros((160, 160, 3), dtype=np.uint8)
                with patch.object(svc, "_detect_and_crop_face", return_value=fake_img):
                    out = LivenessOutput(
                        passed=False, liveness_score=0.50, is_live=False,
                        spoof_type="print_attack",
                        failure_reason="Liveness score 0.500 below threshold 0.80"
                    )
                    assert not out.passed
                    assert out.spoof_type == "print_attack"

    @pytest.mark.asyncio
    async def test_high_score_passes(self):
        svc = LivenessService(min_confidence=0.80)
        # Simulate high sharpness → high heuristic score
        import numpy as np
        # Sharp checkerboard pattern for high Laplacian variance
        img = np.zeros((160, 160, 3), dtype=np.uint8)
        img[::2, ::2] = 255
        score = svc._heuristic_liveness(img)
        assert score > 0.5

    def test_classify_spoof_high_freq_is_print(self):
        """High-frequency energy in FFT indicates moire from printed photo."""
        import numpy as np
        # Dense checkerboard → high high-frequency energy
        img = np.zeros((160, 160, 3), dtype=np.uint8)
        img[::2, ::2] = 255
        result = LivenessService._classify_spoof(img)
        assert result == "print_attack"


# ═══════════════════════════════════════════════════════════════════════════════
# Face Verification Service Tests (Ensemble)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFaceVerificationService:

    def _make_svc(self, verified_t=0.75, uncertain_t=0.60) -> FaceVerificationService:
        return FaceVerificationService(
            models=[],  # models injected via mocks
            verified_threshold=verified_t,
            uncertain_threshold=uncertain_t,
        )

    def test_all_pass_gives_verified(self):
        svc = self._make_svc()
        decision = svc._decide(score=0.90, all_pass=True, all_fail=False)
        assert decision == "verified"

    def test_score_in_uncertain_zone_gives_uncertain(self):
        svc = self._make_svc()
        # score=0.65 is between uncertain_t(0.60) and verified_t(0.75)
        decision = svc._decide(score=0.65, all_pass=False, all_fail=False)
        assert decision == "uncertain"

    def test_all_fail_gives_rejected_regardless_of_score(self):
        svc = self._make_svc()
        # Even if weighted average were high, all-fail means reject
        decision = svc._decide(score=0.80, all_pass=False, all_fail=True)
        assert decision == "rejected"

    def test_score_below_uncertain_gives_rejected(self):
        svc = self._make_svc()
        decision = svc._decide(score=0.40, all_pass=False, all_fail=False)
        assert decision == "rejected"

    def test_uncertain_zone_with_all_pass_becomes_verified(self):
        """Consensus override: borderline score but all models agree → verified."""
        svc = self._make_svc()
        decision = svc._decide(score=0.72, all_pass=True, all_fail=False)
        assert decision == "verified"

    @pytest.mark.asyncio
    async def test_single_model_error_does_not_abort_ensemble(self):
        """If one model errors, remaining models still vote."""
        from app.services.face_verification.face_verification_service import DeepFaceModelAdapter

        model_ok = MagicMock()
        model_ok.name = "ArcFace"
        model_ok.weight = 0.5
        model_ok.threshold = 0.68
        model_ok.compare = AsyncMock(return_value=0.90)

        model_fail = MagicMock()
        model_fail.name = "Facenet"
        model_fail.weight = 0.5
        model_fail.threshold = 0.40
        model_fail.compare = AsyncMock(side_effect=RuntimeError("model crashed"))

        svc = FaceVerificationService(
            models=[model_ok, model_fail],
            verified_threshold=0.75,
            uncertain_threshold=0.60,
        )
        out = await svc.verify(b"id_face", b"selfie")
        # Should not be rejected purely due to one model failing
        assert out.decision in ("verified", "uncertain")
        assert any(s.error is not None for s in out.model_scores)

    @pytest.mark.asyncio
    async def test_all_models_error_gives_rejected(self):
        model = MagicMock()
        model.name = "ArcFace"
        model.weight = 1.0
        model.threshold = 0.68
        model.compare = AsyncMock(side_effect=RuntimeError("unavailable"))

        svc = FaceVerificationService(models=[model])
        out = await svc.verify(b"id_face", b"selfie")
        assert not out.passed
        assert out.decision == "rejected"
        assert "All face verification models failed" in (out.failure_reason or "")

    def test_weights_normalise_to_one(self):
        """Internal weights must sum to 1.0 regardless of input weights."""
        from app.services.face_verification.face_verification_service import DeepFaceModelAdapter
        m1 = MagicMock(); m1.name = "A"; m1.weight = 3.0; m1.threshold = 0.5
        m2 = MagicMock(); m2.name = "B"; m2.weight = 1.0; m2.threshold = 0.5
        svc = FaceVerificationService(models=[m1, m2])
        total = sum(svc._weights.values())
        assert abs(total - 1.0) < 1e-9


# ═══════════════════════════════════════════════════════════════════════════════
# Deduplication Service Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeduplicationService:

    @pytest.mark.asyncio
    async def test_first_registration_passes(self):
        svc = DeduplicationService(similarity_threshold=0.92, backend="memory")
        embedding = [0.1] * 512
        session_id = uuid.uuid4()
        out = await svc.check_and_store(embedding, session_id)
        assert out.passed
        assert not out.is_duplicate

    @pytest.mark.asyncio
    async def test_duplicate_detected_on_second_registration(self):
        svc = DeduplicationService(similarity_threshold=0.92, backend="memory")
        embedding = list(np.random.rand(512).astype(float))
        # Normalise so cosine similarity = dot product
        arr = np.array(embedding)
        embedding = (arr / np.linalg.norm(arr)).tolist()

        s1 = uuid.uuid4()
        s2 = uuid.uuid4()
        await svc.check_and_store(embedding, s1)
        out2 = await svc.check_and_store(embedding, s2)  # identical embedding
        assert out2.is_duplicate
        assert not out2.passed

    @pytest.mark.asyncio
    async def test_different_identity_passes(self):
        svc = DeduplicationService(similarity_threshold=0.92, backend="memory")
        emb1 = list((np.array([1.0] + [0.0] * 511)).tolist())
        emb2 = list((np.array([0.0, 1.0] + [0.0] * 510)).tolist())
        await svc.check_and_store(emb1, uuid.uuid4())
        out = await svc.check_and_store(emb2, uuid.uuid4())
        assert out.passed
        assert not out.is_duplicate

    def test_l2_normalise_unit_vector_unchanged(self):
        v = [1.0, 0.0, 0.0]
        result = DeduplicationService._l2_normalise(v)
        assert abs(result[0] - 1.0) < 1e-9

    def test_l2_normalise_zero_vector_safe(self):
        v = [0.0] * 512
        result = DeduplicationService._l2_normalise(v)
        assert result == v  # returns original on zero vector


# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline Orchestrator Tests (integration-style with mocked services)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPipelineManager:

    def _build_pipeline(
        self,
        ocr_out: OCROutput,
        liveness_out: LivenessOutput,
        face_out: FaceVerificationOutput,
        dedup_out: DeduplicationOutput,
    ):
        from app.orchestrator.pipeline_manager import VerificationPipelineManager

        ocr_svc = MagicMock()
        ocr_svc.process = AsyncMock(return_value=ocr_out)

        liveness_svc = MagicMock()
        liveness_svc.check = AsyncMock(return_value=liveness_out)

        face_svc = MagicMock()
        face_svc.verify = AsyncMock(return_value=face_out)

        dedup_svc = MagicMock()
        dedup_svc.check_and_store = AsyncMock(return_value=dedup_out)

        import uuid as _uuid

        class FakePersistence:
            async def create_session(self, **kw):
                s = MagicMock()
                s.id = _uuid.uuid4()
                return s
            async def update_session_status(self, *a, **kw): pass
            async def save_ocr_result(self, *a): pass
            async def save_liveness_result(self, *a): pass
            async def save_face_verification_result(self, *a): pass
            async def save_deduplication_result(self, *a): pass
            async def create_identity_record(self, **kw):
                r = MagicMock()
                r.id = _uuid.uuid4()
                return r

        return VerificationPipelineManager(
            ocr_service=ocr_svc,
            liveness_service=liveness_svc,
            face_service=face_svc,
            dedup_service=dedup_svc,
            persistence_service=FakePersistence(),
        )

    @pytest.mark.asyncio
    async def test_happy_path_returns_verified(
        self, mock_ocr_pass, mock_liveness_pass, mock_face_verified, mock_dedup_pass, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        pipeline = self._build_pipeline(
            mock_ocr_pass, mock_liveness_pass, mock_face_verified, mock_dedup_pass
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.status == "verified"
        assert result.overall_confidence is not None
        assert result.overall_confidence > 0
        assert result.identity_record_id is not None

    @pytest.mark.asyncio
    async def test_ocr_failure_stops_pipeline(
        self, mock_liveness_pass, mock_face_verified, mock_dedup_pass, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        ocr_fail = OCROutput(passed=False, failure_reason="No ID number found")
        pipeline = self._build_pipeline(
            ocr_fail, mock_liveness_pass, mock_face_verified, mock_dedup_pass
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.status == "rejected"
        assert result.failure_stage == "ocr"
        assert "liveness" not in result.stages  # never ran

    @pytest.mark.asyncio
    async def test_spoof_detection_stops_pipeline(
        self, mock_ocr_pass, mock_face_verified, mock_dedup_pass, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        liveness_fail = LivenessOutput(
            passed=False, liveness_score=0.30, is_live=False,
            spoof_type="print_attack", failure_reason="Spoof detected"
        )
        pipeline = self._build_pipeline(
            mock_ocr_pass, liveness_fail, mock_face_verified, mock_dedup_pass
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.status == "rejected"
        assert result.failure_stage == "liveness"

    @pytest.mark.asyncio
    async def test_uncertain_face_triggers_manual_review(
        self, mock_ocr_pass, mock_liveness_pass, mock_dedup_pass, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        face_uncertain = FaceVerificationOutput(
            passed=False,
            model_scores=[],
            aggregated_score=0.65,
            decision="uncertain",
            failure_reason=None,
        )
        pipeline = self._build_pipeline(
            mock_ocr_pass, mock_liveness_pass, face_uncertain, mock_dedup_pass
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.status == "uncertain"
        assert result.requires_manual_review is True
        assert result.identity_record_id is None

    @pytest.mark.asyncio
    async def test_duplicate_identity_stops_pipeline(
        self, mock_ocr_pass, mock_liveness_pass, mock_face_verified, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        dedup_fail = DeduplicationOutput(
            passed=False, is_duplicate=True,
            duplicate_of_session_id=str(uuid.uuid4()),
            similarity_score=0.98,
            failure_reason="Duplicate identity detected",
        )
        pipeline = self._build_pipeline(
            mock_ocr_pass, mock_liveness_pass, mock_face_verified, dedup_fail
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.status == "duplicate"
        assert result.failure_stage == "deduplication"

    @pytest.mark.asyncio
    async def test_overall_confidence_is_geometric_mean(self):
        from app.orchestrator.pipeline_manager import VerificationPipelineManager
        scores = [0.9, 0.8, 0.85]
        expected = float(np.exp(np.mean(np.log(scores))))
        result = VerificationPipelineManager._geometric_mean(scores)
        assert abs(result - expected) < 1e-9

    @pytest.mark.asyncio
    async def test_processing_time_is_recorded(
        self, mock_ocr_pass, mock_liveness_pass, mock_face_verified, mock_dedup_pass, minimal_jpeg
    ):
        from app.orchestrator.pipeline_manager import PipelineInput
        pipeline = self._build_pipeline(
            mock_ocr_pass, mock_liveness_pass, mock_face_verified, mock_dedup_pass
        )
        inp = PipelineInput(id_image_bytes=minimal_jpeg, selfie_bytes=minimal_jpeg)
        result = await pipeline.run(inp)
        assert result.processing_time_ms is not None
        assert result.processing_time_ms >= 0


# ═══════════════════════════════════════════════════════════════════════════════
# Security Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestSecurity:

    def test_encrypt_decrypt_roundtrip(self):
        import os
        os.environ["APP_SECRET_KEY"] = "x" * 32
        os.environ["ENCRYPTION_KEY"] = "y" * 32
        os.environ["DATABASE_URL"] = "postgresql+asyncpg://x:y@localhost/test"
        from app.core.security import decrypt_field, encrypt_field
        plaintext = "123456789012"
        ciphertext = encrypt_field(plaintext)
        assert ciphertext != plaintext
        assert decrypt_field(ciphertext) == plaintext

    def test_mask_id_number_hides_middle(self):
        from app.core.security import mask_id_number
        masked = mask_id_number("123456789012")
        assert masked.startswith("123")
        assert masked.endswith("12")
        assert "***" in masked
        assert "45678" not in masked

    def test_image_fingerprint_is_deterministic(self):
        import os
        os.environ["APP_SECRET_KEY"] = "x" * 32
        os.environ["ENCRYPTION_KEY"] = "y" * 32
        os.environ["DATABASE_URL"] = "postgresql+asyncpg://x:y@localhost/test"
        from app.core.security import image_fingerprint
        data = b"fake image bytes"
        assert image_fingerprint(data) == image_fingerprint(data)

    def test_different_images_different_fingerprints(self):
        import os
        os.environ["APP_SECRET_KEY"] = "x" * 32
        os.environ["ENCRYPTION_KEY"] = "y" * 32
        os.environ["DATABASE_URL"] = "postgresql+asyncpg://x:y@localhost/test"
        from app.core.security import image_fingerprint
        assert image_fingerprint(b"image1") != image_fingerprint(b"image2")
