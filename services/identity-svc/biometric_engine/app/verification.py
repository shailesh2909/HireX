"""
Verification API Routes.

Route design:
  POST /sessions          — create a new verification session
  POST /sessions/{id}/run — upload images and run full pipeline (sync)
  POST /sessions/{id}/run-async — enqueue pipeline as Celery task (async)
  GET  /sessions/{id}     — poll session status
  GET  /sessions/{id}/result — get full result with stage breakdown

Sync vs Async:
  Sync:  simpler client code; times out for slow models (>30s on cold start).
  Async: returns task_id immediately; client polls /tasks/{task_id}.
  Both are supported — operators can choose at deployment time.

File upload:
  Images are received as multipart/form-data (UploadFile).
  They are read into memory as bytes and NEVER written to disk by default.
  The bytes are passed directly to the pipeline.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.exceptions import IdentityTrustError
from app.core.security import get_logger, image_fingerprint
from app.models.db_models import VerificationSession
from app.orchestrator.pipeline_manager import PipelineInput, VerificationPipelineManager
from app.schemas.verification import (
    AsyncTaskResponse,
    CreateSessionResponse,
    IdentityRecordResponse,
    PipelineResponse,
    TaskStatusResponse,
)
from app.tasks.verification_tasks import run_verification_async
from app.utils.dependencies import get_pipeline_manager

logger = get_logger(__name__)
router = APIRouter(prefix="/v1/verification", tags=["Verification"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── POST /sessions ────────────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new verification session",
)
async def create_session(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> CreateSessionResponse:
    from app.services.persistence.persistence_service import PersistenceService
    svc = PersistenceService(db)
    session = await svc.create_session(
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=str(uuid.uuid4()),
    )
    await db.commit()
    return CreateSessionResponse(session_id=session.id, status="pending")


# ── POST /sessions/{session_id}/run  (synchronous) ───────────────────────────

@router.post(
    "/sessions/{session_id}/run",
    response_model=PipelineResponse,
    summary="Run full verification pipeline (synchronous)",
    description=(
        "Upload ID card image and selfie. Runs all 5 stages synchronously. "
        "Use /run-async for long-running workloads."
    ),
)
async def run_pipeline(
    session_id: uuid.UUID,
    request: Request,
    id_image: Annotated[UploadFile, File(description="ID card photo (JPEG/PNG)")],
    selfie: Annotated[UploadFile, File(description="Live selfie photo (JPEG/PNG)")],
    country_hint: Annotated[str | None, Form()] = None,
    pipeline: VerificationPipelineManager = Depends(get_pipeline_manager),
) -> PipelineResponse:

    id_bytes = await _read_image(id_image)
    selfie_bytes = await _read_image(selfie)

    inp = PipelineInput(
        id_image_bytes=id_bytes,
        selfie_bytes=selfie_bytes,
        country_hint=country_hint,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=str(uuid.uuid4()),
    )

    try:
        return await pipeline.run(inp)
    except IdentityTrustError as exc:
        raise HTTPException(status_code=exc.status_code, detail={
            "error_code": exc.error_code,
            "message": str(exc),
        }) from exc


# ── POST /sessions/{session_id}/run-async ────────────────────────────────────

@router.post(
    "/sessions/{session_id}/run-async",
    response_model=AsyncTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue pipeline as async Celery task",
)
async def run_pipeline_async(
    session_id: uuid.UUID,
    request: Request,
    id_image: Annotated[UploadFile, File()],
    selfie: Annotated[UploadFile, File()],
    country_hint: Annotated[str | None, Form()] = None,
) -> AsyncTaskResponse:

    id_bytes = await _read_image(id_image)
    selfie_bytes = await _read_image(selfie)

    task = run_verification_async.delay(
        session_id=str(session_id),
        id_image_bytes=id_bytes,
        selfie_bytes=selfie_bytes,
        country_hint=country_hint,
        ip_address=request.client.host if request.client else None,
    )

    return AsyncTaskResponse(
        task_id=task.id,
        session_id=session_id,
        status="queued",
        poll_url=f"/v1/verification/tasks/{task.id}",
    )


# ── GET /tasks/{task_id} ──────────────────────────────────────────────────────

@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    summary="Poll async task status",
)
async def get_task_status(task_id: str) -> TaskStatusResponse:
    from app.tasks.verification_tasks import celery_app
    result = celery_app.AsyncResult(task_id)

    if result.state == "PENDING":
        return TaskStatusResponse(task_id=task_id, status="pending")
    elif result.state == "STARTED":
        return TaskStatusResponse(task_id=task_id, status="processing")
    elif result.state == "SUCCESS":
        return TaskStatusResponse(
            task_id=task_id,
            status="success",
            result=PipelineResponse(**result.get()),
        )
    else:  # FAILURE
        return TaskStatusResponse(
            task_id=task_id,
            status="failure",
            error=str(result.info),
        )


# ── GET /sessions/{session_id} ────────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}",
    response_model=dict,
    summary="Get session status and summary",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    stmt = select(VerificationSession).where(VerificationSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": str(session.id),
        "status": session.status.value,
        "overall_confidence": session.overall_confidence,
        "failure_stage": session.failure_stage,
        "failure_reason": session.failure_reason,
        "created_at": session.created_at.isoformat(),
    }


# ── Utility ───────────────────────────────────────────────────────────────────

async def _read_image(upload: UploadFile) -> bytes:
    content_type = upload.content_type or ""
    if content_type not in ("image/jpeg", "image/png", "image/webp", ""):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {content_type}. Use JPEG or PNG.",
        )
    data = await upload.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large ({len(data)} bytes). Max {MAX_IMAGE_SIZE} bytes.",
        )
    if len(data) < 1024:
        raise HTTPException(status_code=422, detail="Image file is too small or empty.")
    return data
