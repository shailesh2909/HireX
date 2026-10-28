import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import PersistenceError
from app.core.security import encrypt_field, get_logger
from app.db_models import (
    CompanyVerificationSession,
    CompanyEnrichmentResult,
    CompanyRegistryResult,
    CompanyOCRResult,
    CompanyRecord,
    CompanyAuditLog
)

class DuplicateCompanyError(Exception):
    pass

logger = get_logger(__name__)

class CompanyPersistenceService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_session(
        self,
        company_name: str | None = None,
        claimed_domain: str | None = None,
        user_email: str | None = None,
        user_verified_name: str | None = None,
    ) -> CompanyVerificationSession:
        session = CompanyVerificationSession(
            status="pending",
            verification_level=0,
            company_name=company_name,
            claimed_domain=claimed_domain,
            user_email=user_email,
            user_verified_name=user_verified_name,
        )
        self._db.add(session)
        await self._db.flush()
        await self._log(session.id, "session", "created", details={"company_name": company_name})
        return session

    async def update_session_status(
        self,
        session_id: uuid.UUID,
        status: str,
        verification_level: int | None = None,
        stage_scores: dict | None = None,
        failure_stage: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        stmt = select(CompanyVerificationSession).where(CompanyVerificationSession.id == session_id)
        result = await self._db.execute(stmt)
        session = result.scalar_one_or_none()
        if session is None:
            raise PersistenceError(f"Company session {session_id} not found")

        session.status = status
        if verification_level is not None:
            session.verification_level = verification_level
        if stage_scores is not None:
            session.stage_scores = stage_scores
        if failure_stage is not None:
            session.failure_stage = failure_stage
        if failure_reason is not None:
            session.failure_reason = failure_reason

        await self._db.flush()

    async def save_enrichment_result(self, session_id: uuid.UUID, output: dict) -> None:
        record = CompanyEnrichmentResult(
            session_id=session_id,
            official_domain=output.get("official_domain"),
            headquarters=output.get("headquarters"),
            domain_match=output.get("domain_match", False),
            passed=output.get("passed", False),
            failure_reason=output.get("failure_reason"),
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(session_id, "enrichment", "passed" if output.get("passed") else "failed")

    async def save_registry_result(self, session_id: uuid.UUID, output: dict) -> None:
        record = CompanyRegistryResult(
            session_id=session_id,
            registry_used=output.get("registry_used"),
            is_active=output.get("is_active", False),
            company_status=output.get("company_status"),
            passed=output.get("passed", False),
            failure_reason=output.get("failure_reason"),
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(session_id, "registry", "passed" if output.get("passed") else "failed")

    async def save_ocr_result(self, session_id: uuid.UUID, output: dict) -> None:
        record = CompanyOCRResult(
            session_id=session_id,
            encrypted_tax_id=encrypt_field(output["tax_id"]) if output.get("tax_id") else None,
            tax_id_pattern=output.get("tax_id_pattern"),
            extracted_name=output.get("extracted_name"),
            name_match=output.get("name_match", False),
            passed=output.get("passed", False),
            failure_reason=output.get("failure_reason"),
        )
        self._db.add(record)
        await self._db.flush()
        await self._log(session_id, "ocr_cross_reference", "passed" if output.get("passed") else "failed")

    async def create_company_record(
        self,
        session_id: uuid.UUID,
        tax_id: str,
        company_name: str,
        verification_level: int,
    ) -> CompanyRecord:
        record = CompanyRecord(
            session_id=session_id,
            encrypted_tax_id=encrypt_field(tax_id),
            company_name=company_name,
            verification_level=verification_level,
            is_active=True,
        )
        self._db.add(record)
        
        try:
            await self._db.flush()
            await self._log(session_id, "persistence", "company_record_created")
            return record
        except IntegrityError:
            # Caught unique constraint violation on encrypted_tax_id
            await self._db.rollback()
            await self._log(session_id, "persistence", "duplicate_prevention_triggered")
            raise DuplicateCompanyError("A company with this Tax ID already exists.")

    async def _log(
        self,
        session_id: uuid.UUID,
        stage: str,
        event: str,
        confidence: float | None = None,
        decision: str | None = None,
        details: dict | None = None,
    ) -> None:
        entry = CompanyAuditLog(
            session_id=session_id,
            stage=stage,
            event=event,
            confidence=confidence,
            decision=decision,
            details=details,
            actor="system",
        )
        self._db.add(entry)
