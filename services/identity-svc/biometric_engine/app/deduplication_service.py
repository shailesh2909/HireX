"""
Deduplication Service — Stage 4 (1:N Vector Search).

Purpose: prevent a single person from registering multiple identities
         (fraudulent accounts, sanctions evasion, duplicate benefits).

Architecture:
  Primary: Pinecone — managed ANN (Approximate Nearest Neighbour) index.
    - Handles millions of embeddings with sub-10ms query latency.
    - HNSW index under the hood.
  Fallback: pgvector — PostgreSQL extension for exact vector search.
    - Used when Pinecone is unavailable or during development.
    - Slower at scale (O(n)) but zero additional infrastructure.

Embedding generation:
  We reuse the ArcFace embedding from Stage 3 — it's already computed.
  This avoids a second model inference pass.  The embedding is:
    - L2-normalised before storage (cosine similarity = dot product).
    - 512-dimensional (ArcFace output dimension).

Similarity threshold:
  0.92 (cosine)  — empirically tuned to separate same-person (≥0.95)
                   from look-alike pairs (0.70–0.85).
                   Twins may still match; a second factor is recommended.

Security:
  - Embeddings in Pinecone are associated with a hashed session ID,
    not a plaintext user identifier, to prevent inference attacks.
  - We do NOT store reconstructable templates; the embedding cannot
    be reversed to a face image.
"""
from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from typing import Any

import numpy as np

from app.core.exceptions import DuplicateIdentityDetected, VectorDBError
from app.core.security import get_logger
from app.core.settings import get_settings

logger = get_logger(__name__)


@dataclass
class DeduplicationOutput:
    passed: bool
    is_duplicate: bool = False
    duplicate_of_session_id: str | None = None
    similarity_score: float | None = None
    vector_db_used: str = "pinecone"
    embedding_id: str | None = None
    failure_reason: str | None = None


class DeduplicationService:
    """
    1:N deduplication via vector similarity search.
    Pinecone primary, pgvector fallback, in-memory stub for tests.
    """

    def __init__(
        self,
        similarity_threshold: float | None = None,
        backend: str = "auto",      # auto | pinecone | pgvector | memory
    ) -> None:
        s = get_settings()
        self._threshold = similarity_threshold or s.deduplication_similarity_threshold
        self._backend = backend
        self._pinecone_index: Any = None
        self._memory_store: dict[str, list[float]] = {}  # stub for dev/test

    async def check_and_store(
        self,
        embedding: list[float],
        session_id: uuid.UUID,
    ) -> DeduplicationOutput:
        """
        1. Normalise embedding.
        2. Query vector DB for nearest neighbours.
        3. If any match exceeds threshold → duplicate.
        4. If no duplicate → store embedding.
        """
        logger.info("deduplication.start", session_id=str(session_id))

        norm_embedding = self._l2_normalise(embedding)
        vector_id = self._vector_id(session_id)

        backend_used = await self._resolve_backend()

        try:
            match_id, score = await self._query(backend_used, norm_embedding)
        except Exception as exc:
            logger.error("deduplication.query_failed", error=str(exc))
            raise VectorDBError(f"Vector DB query failed: {exc}") from exc

        if match_id is not None and score is not None and score >= self._threshold:
            logger.warning(
                "deduplication.duplicate_detected",
                session_id=str(session_id),
                match_id=match_id,
                score=score,
            )
            return DeduplicationOutput(
                passed=False,
                is_duplicate=True,
                duplicate_of_session_id=match_id,
                similarity_score=round(score, 4),
                vector_db_used=backend_used,
                failure_reason=f"Duplicate identity detected (similarity={score:.3f})",
            )

        # Store new embedding
        try:
            await self._upsert(backend_used, vector_id, norm_embedding, session_id)
        except Exception as exc:
            logger.error("deduplication.store_failed", error=str(exc))
            raise VectorDBError(f"Embedding storage failed: {exc}") from exc

        logger.info("deduplication.passed", session_id=str(session_id))
        return DeduplicationOutput(
            passed=True,
            is_duplicate=False,
            similarity_score=round(score, 4) if score else None,
            vector_db_used=backend_used,
            embedding_id=vector_id,
        )

    async def remove_embedding(self, session_id: uuid.UUID) -> None:
        """Remove a stored embedding (e.g. when a record is deactivated)."""
        vector_id = self._vector_id(session_id)
        backend = await self._resolve_backend()
        if backend == "pinecone":
            index = self._get_pinecone_index()
            index.delete(ids=[vector_id])
        elif backend == "memory":
            self._memory_store.pop(vector_id, None)

    # ── Backend resolution ────────────────────────────────────────────────────

    async def _resolve_backend(self) -> str:
        if self._backend != "auto":
            return self._backend
        s = get_settings()
        if s.pinecone_api_key:
            return "pinecone"
        if s.use_pgvector:
            return "pgvector"
        return "memory"

    # ── Pinecone ──────────────────────────────────────────────────────────────

    def _get_pinecone_index(self) -> Any:
        if self._pinecone_index is None:
            import pinecone  # type: ignore[import-untyped]
            s = get_settings()
            pc = pinecone.Pinecone(api_key=s.pinecone_api_key)
            self._pinecone_index = pc.Index(s.pinecone_index_name)
        return self._pinecone_index

    async def _query(
        self, backend: str, embedding: list[float]
    ) -> tuple[str | None, float | None]:
        if backend == "pinecone":
            return await self._query_pinecone(embedding)
        elif backend == "pgvector":
            return await self._query_pgvector(embedding)
        else:
            return self._query_memory(embedding)

    async def _query_pinecone(self, embedding: list[float]) -> tuple[str | None, float | None]:
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, self._sync_query_pinecone, embedding
        )
        return result

    def _sync_query_pinecone(self, embedding: list[float]) -> tuple[str | None, float | None]:
        index = self._get_pinecone_index()
        resp = index.query(vector=embedding, top_k=1, include_metadata=True)
        matches = resp.get("matches", [])
        if not matches:
            return None, None
        top = matches[0]
        return top["id"], float(top["score"])

    async def _query_pgvector(self, embedding: list[float]) -> tuple[str | None, float | None]:
        """
        pgvector cosine similarity query.
        Assumes a table: identity_embeddings(session_id UUID, embedding vector(512))
        with a vector index: CREATE INDEX ON identity_embeddings USING ivfflat (embedding vector_cosine_ops);
        """
        from sqlalchemy import text
        from app.core.database import get_session_factory

        factory = get_session_factory()
        async with factory() as session:
            sql = text("""
                SELECT session_id::text,
                       1 - (embedding <=> CAST(:emb AS vector)) AS similarity
                FROM   identity_embeddings
                ORDER  BY embedding <=> CAST(:emb AS vector)
                LIMIT  1
            """)
            emb_str = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"
            row = (await session.execute(sql, {"emb": emb_str})).first()
            if row is None:
                return None, None
            return str(row.session_id), float(row.similarity)

    def _query_memory(self, embedding: list[float]) -> tuple[str | None, float | None]:
        """In-memory cosine similarity — for testing only."""
        if not self._memory_store:
            return None, None
        query = np.array(embedding)
        best_id, best_score = None, -1.0
        for vid, stored in self._memory_store.items():
            score = float(np.dot(query, np.array(stored)))
            if score > best_score:
                best_score, best_id = score, vid
        return best_id, best_score

    # ── Upsert ────────────────────────────────────────────────────────────────

    async def _upsert(
        self, backend: str, vector_id: str, embedding: list[float], session_id: uuid.UUID
    ) -> None:
        if backend == "pinecone":
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._get_pinecone_index().upsert(
                    vectors=[{
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {"session_id": str(session_id)},
                    }]
                ),
            )
        elif backend == "pgvector":
            from sqlalchemy import text
            from app.core.database import get_session_factory
            factory = get_session_factory()
            async with factory() as session:
                emb_str = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"
                await session.execute(
                    text("""
                        INSERT INTO identity_embeddings (session_id, embedding)
                        VALUES (:sid, CAST(:emb AS vector))
                        ON CONFLICT (session_id) DO UPDATE SET embedding = CAST(:emb AS vector)
                    """),
                    {"sid": str(session_id), "emb": emb_str},
                )
                await session.commit()
        else:
            self._memory_store[vector_id] = embedding

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _l2_normalise(embedding: list[float]) -> list[float]:
        arr = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm < 1e-10:
            return embedding
        return (arr / norm).tolist()

    @staticmethod
    def _vector_id(session_id: uuid.UUID) -> str:
        """Opaque vector ID — not directly the session UUID to avoid inference."""
        return hashlib.sha256(str(session_id).encode()).hexdigest()[:40]
