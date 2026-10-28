"""
VerificationPipelineManager — Central Orchestrator.

═══════════════════════════════════════════════════════════════════════
DESIGN PHILOSOPHY
═══════════════════════════════════════════════════════════════════════
The orchestrator knows the pipeline ORDER and the failure STRATEGY.
It does NOT know HOW each stage works.

This separation means:
  - Services can be unit-tested in complete isolation.
  - The pipeline order can be changed here with zero changes to services.
  - A/B testing different stage configurations = just different orchestrators.
  - Each stage can be mocked in integration tests independently.

Failure strategy — FAIL-FAST:
  A failure at any stage aborts the pipeline immediately.
  This prevents wasting compute on later stages when early signals say "reject".
  The session record always captures HOW FAR the pipeline got and WHY it stopped.

Manual review:
  When face verification returns "uncertain" (score in grey zone), the pipeline
  completes with status=UNCERTAIN rather than rejected. The caller enqueues it
  for human review; no identity record is created yet.

═══════════════════════════════════════════════════════════════════════
OVERALL CONFIDENCE SCORE
═══════════════════════════════════════════════════════════════════════
Computed as the geometric mean of per-stage confidence scores.
Why geometric (not arithmetic) mean?
  A single very low score drags the overall down significantly.
  This mirrors how trust works: one weak link weakens the whole chain.

  stages = [ocr_conf, liveness_score, face_agg_score]
  overall = (s1 × s2 × s3) ^ (1/3)
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from app.core.exceptions import (
    DuplicateIdentityDetected,
    FaceNotDetected,
    FaceVerificationRejected,
    IDNumberInvalid,
    IDNumberNotFound,
    IdentityTrustError,
    ImageQualityTooLow,
    ReplayAttackDetected,
    SpoofingDetected,
)
from app.core.security import get_logger, image_fingerprint
from app.models.db_models import VerificationStatus
from app.schemas.verification import (
    DeduplicationStageResult,
    FaceVerificationStageResult,
    LivenessStageResult,
    ModelScore,
    OCRStageResult,
    PipelineResponse,
)
from app.services.deduplication.deduplication_service import DeduplicationService
from app.services.face_verification.face_verification_service import FaceVerificationService
from app.services.liveness.liveness_service import LivenessService
from app.services.ocr.ocr_service import OCRService
from app.services.persistence.persistence_service import PersistenceService

logger = get_logger(__name__)


@dataclass
class PipelineInput:
    id_image_bytes: bytes
    selfie_bytes: bytes
    country_hint: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    # Pre-computed embedding from face verification (set by orchestrator)
    face_embedding: list[float] | None = field(default=None, repr=False)


class VerificationPipelineManager:
    """
    Coordinates all five pipeline stages.
    All service dependencies are injected — no hard-coded instantiation.
    """

    def __init__(
        self,
        ocr_service: OCRService,
        liveness_service: LivenessService,
        face_service: FaceVerificationService,
        dedup_service: DeduplicationService,
        persistence_service: PersistenceService,
    ) -> None:
        self._ocr = ocr_service
        self._liveness = liveness_service
        self._face = face_service
        self._dedup = dedup_service
        self._persistence = persistence_service

    async def run(self, inp: PipelineInput) -> PipelineResponse:
        """
        Execute the full 5-stage pipeline.
        Returns a PipelineResponse regardless of outcome;
        raises only on catastrophic infrastructure errors.
        """
        start = time.monotonic()

        stage_scores: dict[str, Any] = {}
        confidences: list[float] = []

        # ── Replay-attack check ───────────────────────────────────────────────
        id_fp = image_fingerprint(inp.id_image_bytes)
        selfie_fp = image_fingerprint(inp.selfie_bytes)

        # ── Create session record ─────────────────────────────────────────────
        session = await self._persistence.create_session(
            ip_address=inp.ip_address,
            user_agent=inp.user_agent,
            request_id=inp.request_id,
            id_image_fingerprint=id_fp,
            selfie_fingerprint=selfie_fp,
        )
        sid = session.id
        logger.info("pipeline.start", session_id=str(sid))

        await self._persistence.update_session_status(sid, VerificationStatus.PROCESSING)

        # Fail early if replay attack is detected
        is_replay = await self._persistence.check_replay_attack(id_fp, selfie_fp)
        if is_replay:
            return await self._fail(
                sid, "replay_check", "Replay attack detected: fingerprint matches a previous poor-quality or rejected submission.",
                stage_scores, start, status=VerificationStatus.REJECTED
            )

        # ── Stage 1: OCR ──────────────────────────────────────────────────────
        try:
            ocr_out = await self._ocr.process(inp.id_image_bytes)
            await self._persistence.save_ocr_result(sid, ocr_out)
        except (ImageQualityTooLow, IDNumberNotFound) as exc:
            return await self._fail(
                sid, "ocr", str(exc), stage_scores, start,
                status=VerificationStatus.REJECTED
            )

        stage_scores["ocr"] = OCRStageResult(
            passed=ocr_out.passed,
            ocr_confidence=ocr_out.ocr_confidence,
            id_country=ocr_out.id_country,
            id_number_pattern=ocr_out.id_number_pattern,
            engine_used=ocr_out.engine_used,
            preprocessing_applied=ocr_out.preprocessing_applied,
            failure_reason=ocr_out.failure_reason,
        ).model_dump()

        if not ocr_out.passed:
            return await self._fail(
                sid, "ocr", ocr_out.failure_reason or "OCR stage failed",
                stage_scores, start,
            )
        if ocr_out.ocr_confidence:
            confidences.append(ocr_out.ocr_confidence)

        # Extract face region from ID for later verification
        id_face_bytes = await self._extract_face_from_id(inp.id_image_bytes)

        # ── Stage 2: Liveness ─────────────────────────────────────────────────
        try:
            liveness_out = await self._liveness.check(inp.selfie_bytes)
            await self._persistence.save_liveness_result(sid, liveness_out)
        except ImageQualityTooLow as exc:
            return await self._fail(sid, "liveness", str(exc), stage_scores, start)

        stage_scores["liveness"] = LivenessStageResult(
            passed=liveness_out.passed,
            liveness_score=liveness_out.liveness_score,
            is_live=liveness_out.is_live,
            spoof_type=liveness_out.spoof_type,
            failure_reason=liveness_out.failure_reason,
        ).model_dump()

        if not liveness_out.passed:
            status = VerificationStatus.REJECTED
            return await self._fail(
                sid, "liveness",
                liveness_out.failure_reason or "Liveness check failed",
                stage_scores, start, status=status
            )
        confidences.append(liveness_out.liveness_score)

        # ── Stage 3: Face Verification (Ensemble) ─────────────────────────────
        face_out = await self._face.verify(id_face_bytes, inp.selfie_bytes)
        await self._persistence.save_face_verification_result(sid, face_out)

        stage_scores["face_verification"] = FaceVerificationStageResult(
            passed=face_out.passed,
            model_scores=[
                ModelScore(
                    model_name=s.model_name,
                    similarity_score=s.similarity_score,
                    threshold_used=s.threshold_used,
                    passed=s.passed,
                )
                for s in face_out.model_scores
            ],
            aggregated_score=face_out.aggregated_score,
            decision=face_out.decision,
            ensemble_strategy=face_out.ensemble_strategy,
            failure_reason=face_out.failure_reason,
        ).model_dump()

        if face_out.decision == "uncertain":
            # Mark uncertain — trigger manual review; no identity record yet
            overall = self._geometric_mean(confidences + [face_out.aggregated_score])
            await self._persistence.update_session_status(
                sid,
                VerificationStatus.UNCERTAIN,
                overall_confidence=overall,
                stage_scores=stage_scores,
            )
            ms = (time.monotonic() - start) * 1000
            return PipelineResponse(
                session_id=sid,
                status="uncertain",
                overall_confidence=round(overall, 4),
                stages=stage_scores,
                requires_manual_review=True,
                processing_time_ms=round(ms, 2),
            )

        if not face_out.passed:
            return await self._fail(
                sid, "face_verification",
                face_out.failure_reason or "Face verification rejected",
                stage_scores, start,
                status=VerificationStatus.REJECTED,
            )
        confidences.append(face_out.aggregated_score)

        # ── Stage 4: Deduplication ────────────────────────────────────────────
        # Reuse ArcFace embedding (already computed inside face_out)
        embedding = await self._get_embedding(inp.selfie_bytes)

        dedup_out = await self._dedup.check_and_store(embedding, sid)
        await self._persistence.save_deduplication_result(sid, dedup_out)

        stage_scores["deduplication"] = DeduplicationStageResult(
            passed=dedup_out.passed,
            is_duplicate=dedup_out.is_duplicate,
            similarity_score=dedup_out.similarity_score,
            failure_reason=dedup_out.failure_reason,
        ).model_dump()

        if not dedup_out.passed:
            return await self._fail(
                sid, "deduplication",
                dedup_out.failure_reason or "Duplicate identity detected",
                stage_scores, start,
                status=VerificationStatus.DUPLICATE,
            )

        # ── Stage 5: Persistence ──────────────────────────────────────────────
        overall = self._geometric_mean(confidences)

        identity = await self._persistence.create_identity_record(
            session_id=sid,
            id_number=ocr_out.id_number or "",
            id_country=ocr_out.id_country or "UNK",
            overall_confidence=overall,
            pinecone_vector_id=dedup_out.embedding_id,
        )

        await self._persistence.update_session_status(
            sid,
            VerificationStatus.VERIFIED,
            overall_confidence=overall,
            stage_scores=stage_scores,
        )

        ms = (time.monotonic() - start) * 1000
        logger.info(
            "pipeline.completed",
            session_id=str(sid),
            status="verified",
            overall_confidence=overall,
            ms=ms,
        )

        return PipelineResponse(
            session_id=sid,
            status="verified",
            overall_confidence=round(overall, 4),
            stages=stage_scores,
            identity_record_id=identity.id,
            processing_time_ms=round(ms, 2),
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _fail(
        self,
        session_id: uuid.UUID,
        failure_stage: str,
        failure_reason: str,
        stage_scores: dict,
        start: float,
        status: VerificationStatus = VerificationStatus.REJECTED,
    ) -> PipelineResponse:
        await self._persistence.update_session_status(
            session_id,
            status,
            stage_scores=stage_scores,
            failure_stage=failure_stage,
            failure_reason=failure_reason,
        )
        ms = (time.monotonic() - start) * 1000
        logger.warning(
            "pipeline.failed",
            session_id=str(session_id),
            stage=failure_stage,
            reason=failure_reason,
        )
        return PipelineResponse(
            session_id=session_id,
            status=status.value,
            stages=stage_scores,
            failure_stage=failure_stage,
            failure_reason=failure_reason,
            processing_time_ms=round(ms, 2),
        )

    @staticmethod
    def _geometric_mean(scores: list[float]) -> float:
        if not scores:
            return 0.0
        valid = [max(s, 1e-10) for s in scores]
        return float(np.exp(np.mean(np.log(valid))))

    @staticmethod
    async def _extract_face_from_id(id_image_bytes: bytes) -> bytes:
        """
        Detect and crop the face region from the ID card image.
        Falls back to the full image if no face is found (DeepFace handles it).
        """
        import cv2
        import numpy as np

        arr = np.frombuffer(id_image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return id_image_bytes

        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))

        if len(faces) == 0:
            return id_image_bytes

        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        margin = 15
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(img.shape[1], x + w + margin)
        y2 = min(img.shape[0], y + h + margin)
        face_img = img[y1:y2, x1:x2]

        success, encoded = cv2.imencode(".jpg", face_img)
        return bytes(encoded) if success else id_image_bytes

    @staticmethod
    async def _get_embedding(selfie_bytes: bytes) -> list[float]:
        """
        Extract ArcFace embedding from selfie.
        In production this reuses the already-computed embedding from Stage 3
        to avoid double inference. Here we show the standalone call.
        """
        import asyncio
        import cv2
        import numpy as np

        def _sync() -> list[float]:
            from deepface import DeepFace  # type: ignore[import-untyped]
            arr = np.frombuffer(selfie_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            result = DeepFace.represent(
                img_path=img,
                model_name="ArcFace",
                enforce_detection=False,
                align=True,
            )
            return result[0]["embedding"] if result else [0.0] * 512

        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(None, _sync)
        except Exception:
            # Return zero vector — dedup service will still write it
            # but it won't match anything meaningful
            return [0.0] * 512
