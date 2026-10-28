import time
from dataclasses import dataclass
from typing import Any, Dict
from app.core.security import get_logger
from app.company.company_persistence_service import CompanyPersistenceService, DuplicateCompanyError
from app.company.company_enrichment_service import CompanyEnrichmentService
from app.company.company_registry_service import CompanyRegistryService
from app.company.document_cross_reference_service import DocumentCrossReferenceService

logger = get_logger(__name__)

@dataclass
class CompanyPipelineInput:
    company_name: str
    claimed_domain: str
    user_email: str
    user_verified_name: str
    country_hint: str
    business_document_bytes: bytes | None = None

class CompanyVerificationPipelineManager:
    def __init__(
        self,
        persistence_service: CompanyPersistenceService,
        enrichment_service: CompanyEnrichmentService,
        registry_service: CompanyRegistryService,
        document_service: DocumentCrossReferenceService,
    ):
        self._persistence = persistence_service
        self._enrichment = enrichment_service
        self._registry = registry_service
        self._document = document_service

    async def run(self, inp: CompanyPipelineInput) -> Dict[str, Any]:
        """
        Orchestrates the 5-stage company verification pipeline.
        Returns a dict summarizing the outcome.
        """
        start = time.monotonic()
        stage_scores: dict[str, Any] = {}
        
        # Session initialization
        session = await self._persistence.create_session(
            company_name=inp.company_name,
            claimed_domain=inp.claimed_domain,
            user_email=inp.user_email,
            user_verified_name=inp.user_verified_name
        )
        sid = session.id
        logger.info("company_pipeline.start", session_id=str(sid))
        
        await self._persistence.update_session_status(sid, "processing")
        
        # ── Stage 1 & 2: Metadata Enrichment & Ownership Linkage ─────────────
        enrich_out = await self._enrichment.enrich_and_link(inp.company_name, inp.claimed_domain, inp.user_email)
        await self._persistence.save_enrichment_result(sid, enrich_out)
        stage_scores["enrichment"] = enrich_out
        
        if not enrich_out["passed"]:
            return await self._fail(sid, "enrichment", enrich_out["failure_reason"], stage_scores)
            
        verification_level = 1 # Passed Stage 1 & 2
        
        # If no document is provided, the pipeline stops at Level 1
        if not inp.business_document_bytes:
            await self._persistence.update_session_status(
                sid, "verified", verification_level=verification_level, stage_scores=stage_scores
            )
            return self._success(sid, verification_level, stage_scores, start)

        # ── Stage 4: Document Cross-Reference ─────────────────────────────────
        doc_out = await self._document.verify_document(inp.business_document_bytes, inp.user_verified_name, inp.country_hint)
        await self._persistence.save_ocr_result(sid, doc_out)
        stage_scores["document_cross_reference"] = doc_out
        
        if not doc_out["passed"]:
            return await self._fail(sid, "document_cross_reference", doc_out["failure_reason"], stage_scores)
        
        tax_id = doc_out["tax_id"]

        # ── Stage 3: Business Registry Check ──────────────────────────────────
        reg_out = await self._registry.check_registry(inp.company_name, tax_id, inp.country_hint)
        await self._persistence.save_registry_result(sid, reg_out)
        stage_scores["registry_check"] = reg_out
        
        if not reg_out["passed"]:
            return await self._fail(sid, "registry_check", reg_out["failure_reason"], stage_scores)
            
        verification_level = 2 # Passed all stages
        
        # ── Stage 5: Global Duplicate Prevention & Persistence ────────────────
        try:
            record = await self._persistence.create_company_record(
                session_id=sid,
                tax_id=tax_id,
                company_name=inp.company_name,
                verification_level=verification_level
            )
        except DuplicateCompanyError as e:
            # Caught unique constraint violation on encrypted_tax_id from persistence service
            failure_reason = f"Global Duplicate Prevention: {str(e)}"
            return await self._fail(sid, "duplicate_prevention", failure_reason, stage_scores, status="duplicate")

        await self._persistence.update_session_status(
            sid, "verified", verification_level=verification_level, stage_scores=stage_scores
        )
        
        return self._success(sid, verification_level, stage_scores, start, record.id)

    async def _fail(self, session_id, stage, reason, scores, status="rejected"):
        await self._persistence.update_session_status(
            session_id, status, stage_scores=scores, failure_stage=stage, failure_reason=reason
        )
        return {
            "session_id": str(session_id),
            "status": status,
            "failure_stage": stage,
            "failure_reason": reason,
            "stages": scores
        }
        
    def _success(self, session_id, level, scores, start, record_id=None):
        ms = (time.monotonic() - start) * 1000
        return {
            "session_id": str(session_id),
            "status": "verified",
            "verification_level": level,
            "stages": scores,
            "company_record_id": str(record_id) if record_id else None,
            "processing_time_ms": round(ms, 2)
        }
