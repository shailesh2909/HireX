"""
Persistence Service — Stage 5.

Responsibilities:
  1. Write the final IdentityRecord (verified users only).
  2. Append an immutable AuditLog entry for every stage decision.
  3. Update the VerificationSession status.
  4. Encrypt sensitive fields before write.

Design decisions:
  - All DB writes are in a single transaction to avoid partial state.
  - AuditLog is append-only; no UPDATE or DELETE ever touches it.
  - Raw image bytes are NEVER written here; only HMAC fingerprints.
  - The service returns structured objects so the orchestrator can
    include record IDs in the API response without extra queries.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PersistenceError
from app.core.security import encrypt_field, get_logger
from app.models.db_models import (
    AuditLog,
    DeduplicationResult,
    FaceVerificationResult,
    IdentityRecord,
    LivenessResult,
    OCRResult,
    VerificationSession,
    VerificationStatus,
)
from app.services.deduplication.deduplication_service import DeduplicationOutput
from app.services.face_verification.face_verification_service import FaceVerificationOutput
from app.services.liveness.liveness_service import LivenessOutput
from app.services.ocr.ocr_service import OCROutput

logger = get_logger(__name__)


class PersistenceService:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Session lifecycle ─────────────────────────────────────────────────────

    async def create_session(
        self,
        ip_address: str | None = None,
        user_agent: str | None = None,
        request_id: str | None = None,
        id_image_fingerprint: str | None = None,
        selfie_fingerprint: str | None = None,
    ) -> VerificationSession:
        session = VerificationSession(
            status=VerificationStatus.PENDING,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            id_image_fingerprint=id_image_fingerprint,
            selfie_fingerprint=selfie_fingerprint,
        )
        self._db.add(session)
        await self._db.flush()
        await self._log(session.id, "session", "created", details={"ip": ip_address})
        logger.info("persistence.session_created", session_id=str(session.id))
        return session

    async def update_session_status(
        self,
        session_id: uuid.UUID,
        status: VerificationStatus,
        overall_confidence: float | None = None,
        stage_scores: dict | None = None,
        failure_stage: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        stmt = select(VerificationSession).where(VerificationSession.id == session_id)
        result = await self._db.execute(stmt)
        session = result.scalar_one_or_none()
        if session is None:
            raise PersistenceError(f"Session {session_id} not found")

        session.status = status
        if overall_confidence is not None:
            session.overall_confidence = overall_confidence
        if stage_scores is not None:
            session.stage_scores = stage_scores
        if failure_stage is not None:
            session.failure_stage = failure_stage
        if failure_reason is not None:
            session.failure_reason = failure_reason

        await self._db.flush()

    async def check_replay_attack(self, id_fp: str, selfie_fp: str) -> bool:
        """Check if these exact images were used in a failed or fraudulent session previously."""
        from sqlalchemy import or_
        stmt = select(VerificationSession).where(
            or_(
                VerificationSession.id_image_fingerprint == id_fp,
                VerificationSession.selfie_fingerprint == selfie_fp
            ),
            VerificationSession.status.in_([VerificationStatus.REJECTED, VerificationStatus.DUPLICATE])
        ).limit(1)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none() is not None

    # ── Stage result writers ──────────────────────────────────────────────────

    async def save_ocr_result(self, session_id: uuid.UUID, output: OCROutput) -> None:
        record = OCRResult(
            session_id=session_id,
            # Encrypt ID number — never store plaintext
            encrypted_id_number=encrypt_field(output.id_number) if output.id_number else None,
            id_number_pattern=output.id_number_pattern,
            id_country=output.id_country,
            ocr_confidence=output.ocr_confidence,
            raw_extracted_text=output.raw_extracted_text if not output.passed else None,
            engine_used=output.engine_used,
            preprocessing_applied=output.preprocessing_applied,
            passed=output.passed,
            failure_reason=output.failure_reason,
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(
            session_id, "ocr",
            "passed" if output.passed else "failed",
            confidence=output.ocr_confidence,
            details={"engine": output.engine_used, "pattern": output.id_number_pattern},
        )

    async def save_liveness_result(self, session_id: uuid.UUID, output: LivenessOutput) -> None:
        record = LivenessResult(
            session_id=session_id,
            liveness_score=output.liveness_score,
            is_live=output.is_live,
            spoof_type=output.spoof_type,
            model_version=output.model_version,
            passed=output.passed,
            failure_reason=output.failure_reason,
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(
            session_id, "liveness",
            "passed" if output.passed else "failed",
            confidence=output.liveness_score,
            details={"spoof_type": output.spoof_type},
        )

    async def save_face_verification_result(
        self, session_id: uuid.UUID, output: FaceVerificationOutput
    ) -> None:
        model_scores_json = [
            {
                "model": s.model_name,
                "score": s.similarity_score,
                "threshold": s.threshold_used,
                "passed": s.passed,
                "error": s.error,
            }
            for s in output.model_scores
        ]
        record = FaceVerificationResult(
            session_id=session_id,
            model_scores=model_scores_json,
            aggregated_score=output.aggregated_score,
            decision=output.decision,
            ensemble_strategy=output.ensemble_strategy,
            passed=output.passed,
            failure_reason=output.failure_reason,
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(
            session_id, "face_verification",
            output.decision,
            confidence=output.aggregated_score,
            details={"models": len(output.model_scores)},
        )

    async def save_deduplication_result(
        self, session_id: uuid.UUID, output: DeduplicationOutput
    ) -> None:
        record = DeduplicationResult(
            session_id=session_id,
            is_duplicate=output.is_duplicate,
            duplicate_of_session_id=(
                uuid.UUID(output.duplicate_of_session_id)
                if output.duplicate_of_session_id else None
            ),
            similarity_score=output.similarity_score,
            vector_db_used=output.vector_db_used,
            passed=output.passed,
            failure_reason=output.failure_reason,
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(
            session_id, "deduplication",
            "duplicate" if output.is_duplicate else "unique",
            confidence=output.similarity_score,
        )

    # ── Identity record ───────────────────────────────────────────────────────

    async def create_identity_record(
        self,
        session_id: uuid.UUID,
        id_number: str,
        id_country: str,
        overall_confidence: float,
        pinecone_vector_id: str | None = None,
    ) -> IdentityRecord:
        record = IdentityRecord(
            session_id=session_id,
            encrypted_id_number=encrypt_field(id_number),
            id_country=id_country,
            overall_confidence=overall_confidence,
            pinecone_vector_id=pinecone_vector_id,
            is_active=True,
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(
            session_id, "persistence",
            "identity_record_created",
            confidence=overall_confidence,
            details={"record_id": str(record.id), "country": id_country},
        )
        logger.info(
            "persistence.identity_record_created",
            record_id=str(record.id),
            session_id=str(session_id),
        )
        return record

    # ── Audit log ─────────────────────────────────────────────────────────────

    async def _log(
        self,
        session_id: uuid.UUID,
        stage: str,
        event: str,
        confidence: float | None = None,
        decision: str | None = None,
        details: dict | None = None,
    ) -> None:
        entry = AuditLog(
            session_id=session_id,
            stage=stage,
            event=event,
            confidence=confidence,
            decision=decision,
            details=details,
            actor="system",
        )
        self._db.add(entry)
        # No explicit flush — caller controls transaction boundary
