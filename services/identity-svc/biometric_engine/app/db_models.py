"""
Database Models.

Schema design decisions:
- UUIDs as PKs: avoids enumeration attacks, safe for distributed inserts.
- Encrypted ID numbers: stored with Fernet symmetric encryption.
- Scores stored as JSONB: flexible per-stage score breakdown without
  a separate scores table for each pipeline run.
- pgvector column on IdentityRecord: backup vector store when Pinecone
  is unavailable. Requires `CREATE EXTENSION vector;` in Postgres.
- Raw image bytes are NOT stored by default (store_raw_images=false).
  Only HMAC fingerprints are kept for replay detection.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Enumerations ──────────────────────────────────────────────────────────────

class VerificationStatus(str, PyEnum):
    PENDING    = "pending"
    PROCESSING = "processing"
    VERIFIED   = "verified"
    REJECTED   = "rejected"
    UNCERTAIN  = "uncertain"   # triggers manual review queue
    DUPLICATE  = "duplicate"


class PipelineStage(str, PyEnum):
    OCR              = "ocr"
    LIVENESS         = "liveness"
    FACE_VERIFICATION = "face_verification"
    DEDUPLICATION    = "deduplication"
    PERSISTENCE      = "persistence"


# ── Core Tables ───────────────────────────────────────────────────────────────

class VerificationSession(Base):
    """
    One session = one complete verification attempt.
    Links all sub-stage results and is the entry point for the pipeline.
    """
    __tablename__ = "verification_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Overall state
    status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus), nullable=False, default=VerificationStatus.PENDING
    )
    overall_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Aggregate score breakdown — persisted as JSON for flexibility
    stage_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    failure_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Replay-attack prevention: store HMAC of uploaded images
    id_image_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    selfie_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Metadata
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Relationships
    ocr_result: Mapped[OCRResult | None] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    liveness_result: Mapped[LivenessResult | None] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    face_result: Mapped[FaceVerificationResult | None] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    dedup_result: Mapped[DeduplicationResult | None] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    identity_record: Mapped[IdentityRecord | None] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_vs_status", "status"),
        Index("ix_vs_created_at", "created_at"),
        Index("ix_vs_id_fingerprint", "id_image_fingerprint"),
    )


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Encrypted — never store plaintext ID number
    encrypted_id_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    id_number_pattern: Mapped[str | None] = mapped_column(String(64), nullable=True)  # e.g. "AADHAAR"
    id_country: Mapped[str | None] = mapped_column(String(8), nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # for debugging
    engine_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preprocessing_applied: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[VerificationSession] = relationship(back_populates="ocr_result")


class LivenessResult(Base):
    __tablename__ = "liveness_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    liveness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_live: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    spoof_type: Mapped[str | None] = mapped_column(String(64), nullable=True)  # e.g. "print", "replay"
    model_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    selfie_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)

    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[VerificationSession] = relationship(back_populates="liveness_result")


class FaceVerificationResult(Base):
    __tablename__ = "face_verification_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Per-model scores stored in JSONB for forward compatibility
    model_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    aggregated_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    decision: Mapped[str | None] = mapped_column(String(16), nullable=True)  # verified/rejected/uncertain
    ensemble_strategy: Mapped[str | None] = mapped_column(String(32), nullable=True)

    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[VerificationSession] = relationship(back_populates="face_result")


class DeduplicationResult(Base):
    __tablename__ = "deduplication_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    is_duplicate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duplicate_of_session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    vector_db_used: Mapped[str | None] = mapped_column(String(16), nullable=True)

    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[VerificationSession] = relationship(back_populates="dedup_result")


class IdentityRecord(Base):
    """
    Persisted after all pipeline stages pass.
    The single source of truth for a verified identity.
    """
    __tablename__ = "identity_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_sessions.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    encrypted_id_number: Mapped[str] = mapped_column(Text, nullable=False)
    id_country: Mapped[str] = mapped_column(String(8), nullable=False)
    pinecone_vector_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    overall_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    session: Mapped[VerificationSession | None] = relationship(back_populates="identity_record")

    __table_args__ = (
        Index("ix_ir_encrypted_id", "encrypted_id_number"),
        Index("ix_ir_active", "is_active"),
    )


class AuditLog(Base):
    """
    Immutable audit trail — every decision at every stage.
    Append-only: rows are never updated or deleted.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    stage: Mapped[str] = mapped_column(String(64), nullable=False)
    event: Mapped[str] = mapped_column(String(128), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    decision: Mapped[str | None] = mapped_column(String(32), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    actor: Mapped[str | None] = mapped_column(String(64), nullable=True)  # "system" or user id

    session: Mapped[VerificationSession] = relationship(back_populates="audit_logs")

    __table_args__ = (
        Index("ix_al_session_id", "session_id"),
        Index("ix_al_stage", "stage"),
        Index("ix_al_created_at", "created_at"),
    )

# ── Company Verification Tables ──────────────────────────────────────────────────

class CompanyVerificationSession(Base):
    __tablename__ = "company_verification_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    verification_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    claimed_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_verified_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    stage_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    failure_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    enrichment_result: Mapped[CompanyEnrichmentResult | None] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    registry_result: Mapped[CompanyRegistryResult | None] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    ocr_result: Mapped[CompanyOCRResult | None] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    
    company_record: Mapped[CompanyRecord | None] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    audit_logs: Mapped[list[CompanyAuditLog]] = relationship(back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_cvs_status", "status"),
        Index("ix_cvs_created_at", "created_at"),
    )

class CompanyEnrichmentResult(Base):
    __tablename__ = "company_enrichment_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_verification_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    official_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    headquarters: Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[CompanyVerificationSession] = relationship(back_populates="enrichment_result")

class CompanyRegistryResult(Base):
    __tablename__ = "company_registry_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_verification_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    registry_used: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    company_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[CompanyVerificationSession] = relationship(back_populates="registry_result")

class CompanyOCRResult(Base):
    __tablename__ = "company_ocr_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_verification_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    encrypted_tax_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_id_pattern: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extracted_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    name_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped[CompanyVerificationSession] = relationship(back_populates="ocr_result")

class CompanyRecord(Base):
    __tablename__ = "company_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("company_verification_sessions.id", ondelete="SET NULL"), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    encrypted_tax_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    verification_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    session: Mapped[CompanyVerificationSession | None] = relationship(back_populates="company_record")

    __table_args__ = (
        Index("ix_cr_encrypted_tax_id", "encrypted_tax_id"),
        Index("ix_cr_is_active", "is_active"),
    )

class CompanyAuditLog(Base):
    __tablename__ = "company_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_verification_sessions.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    stage: Mapped[str] = mapped_column(String(64), nullable=False)
    event: Mapped[str] = mapped_column(String(128), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    decision: Mapped[str | None] = mapped_column(String(32), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    actor: Mapped[str | None] = mapped_column(String(64), nullable=True)

    session: Mapped[CompanyVerificationSession] = relationship(back_populates="audit_logs")

    __table_args__ = (
        Index("ix_cal_session_id", "session_id"),
        Index("ix_cal_stage", "stage"),
        Index("ix_cal_created_at", "created_at"),
    )
