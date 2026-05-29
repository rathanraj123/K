"""
PostgreSQL + pgvector memory service.
Drop-in replacement for ElasticsearchMemoryService using SQLAlchemy + pgvector.

Falls back gracefully:
- Semantic search unavailable on SQLite (no pgvector) → returns empty list
- pgvector extension missing → logs warning, returns empty list
"""
import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy import select, delete, text
from app.db.session import AsyncSessionLocal
from app.models.chat import ChatMessage, ChatThread, ChatSummary
from app.core.config import settings

logger = logging.getLogger(__name__)

_IS_POSTGRES = "postgresql" in settings.DATABASE_URL


class PostgresMemoryService:
    """
    Chat memory backed by PostgreSQL + pgvector.
    Provides the same interface as ElasticsearchMemoryService.
    """

    # ─── Message Storage ────────────────────────────────────────────

    async def add_message(self, message) -> Any:
        """
        Store a single chat message in PostgreSQL.
        Accepts ESChatMessageCreate or a dict with the same fields.
        Returns a simple dict representation.
        """
        try:
            # Support both Pydantic models and plain dicts
            if hasattr(message, "model_dump"):
                data = message.model_dump()
            else:
                data = dict(message)

            msg_id = data.get("message_id") or str(uuid.uuid4())
            session_id = data.get("session_id", "")
            user_id = data.get("user_id", "")
            role = data.get("role", "user")
            content = data.get("content", "")
            importance = data.get("importance_score", 5)

            async with AsyncSessionLocal() as db:
                # Ensure thread exists
                thread_res = await db.get(ChatThread, session_id)
                if not thread_res:
                    thread_res = ChatThread(
                        id=session_id,
                        user_id=user_id,
                        title=content[:40] + "..." if len(content) > 40 else content,
                    )
                    db.add(thread_res)

                msg = ChatMessage(
                    id=msg_id,
                    thread_id=session_id,
                    user_id=user_id,
                    role=role,
                    content=content,
                    importance_score=importance,
                )
                db.add(msg)
                await db.commit()

            logger.debug(f"Saved message {msg_id} to PostgreSQL (session={session_id})")
            return {
                "message_id": msg_id,
                "session_id": session_id,
                "user_id": user_id,
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"PostgresMemoryService.add_message failed: {e}")
            raise

    async def get_recent_messages(
        self, session_id: str, user_id: str, limit: int = 50
    ) -> List[Any]:
        """
        Retrieve the most recent messages for a specific chat session.
        Returns messages in chronological order (oldest first).
        """
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ChatMessage)
                    .where(
                        ChatMessage.thread_id == session_id,
                        ChatMessage.user_id == user_id,
                    )
                    .order_by(ChatMessage.created_at.desc())
                    .limit(limit)
                )
                messages = result.scalars().all()

            # Return in chronological order (oldest first)
            messages = list(reversed(messages))
            return [self._msg_to_dict(m) for m in messages]
        except Exception as e:
            logger.error(f"PostgresMemoryService.get_recent_messages failed: {e}")
            return []

    async def semantic_search(
        self, query_vector: List[float], user_id: str, limit: int = 5
    ) -> List[Any]:
        """
        Semantic KNN search using pgvector cosine distance.
        Falls back to empty list on SQLite or if pgvector is not available.
        """
        if not _IS_POSTGRES:
            logger.debug("Semantic search skipped: not running on PostgreSQL")
            return []

        try:
            vector_literal = "[" + ",".join(str(v) for v in query_vector) + "]"
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text(
                        """
                        SELECT id, thread_id, user_id, role, content, created_at
                        FROM chat_messages
                        WHERE user_id = :user_id
                          AND embedding IS NOT NULL
                        ORDER BY embedding <=> CAST(:qv AS vector)
                        LIMIT :lim
                        """
                    ),
                    {"user_id": user_id, "qv": vector_literal, "lim": limit},
                )
                rows = result.fetchall()

            return [
                {
                    "message_id": str(row.id),
                    "session_id": str(row.thread_id),
                    "user_id": str(row.user_id),
                    "role": row.role,
                    "content": row.content,
                    "timestamp": row.created_at.isoformat() if row.created_at else "",
                }
                for row in rows
            ]
        except Exception as e:
            logger.warning(f"Semantic search failed (pgvector unavailable?): {e}")
            return []

    # ─── Session / Thread Management ────────────────────────────────

    async def get_session_history(
        self, user_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Retrieve a list of recent unique chat sessions for a user.
        Returns sessions sorted by most recent message.
        """
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ChatThread)
                    .where(ChatThread.user_id == user_id)
                    .order_by(ChatThread.updated_at.desc(), ChatThread.created_at.desc())
                    .limit(limit)
                )
                threads = result.scalars().all()

            return [
                {
                    "id": t.id,
                    "title": t.title,
                    "updated_at": (
                        t.updated_at.isoformat() if t.updated_at else t.created_at.isoformat()
                    ),
                }
                for t in threads
            ]
        except Exception as e:
            logger.error(f"PostgresMemoryService.get_session_history failed: {e}")
            return []

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """
        Delete all messages and the thread itself for a given session.
        """
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    delete(ChatMessage).where(
                        ChatMessage.thread_id == session_id,
                        ChatMessage.user_id == user_id,
                    )
                )
                thread = await db.get(ChatThread, session_id)
                if thread and thread.user_id == user_id:
                    await db.delete(thread)
                await db.commit()
            return True
        except Exception as e:
            logger.error(f"PostgresMemoryService.delete_session failed: {e}")
            return False

    async def add_summary(self, summary) -> Any:
        """
        Persist a compressed memory summary to chat_summaries table.
        Accepts ESMemorySummary or a dict.
        """
        try:
            if hasattr(summary, "model_dump"):
                data = summary.model_dump()
            else:
                data = dict(summary)

            async with AsyncSessionLocal() as db:
                cs = ChatSummary(
                    id=data.get("summary_id") or str(uuid.uuid4()),
                    session_id=data.get("session_id", ""),
                    user_id=data.get("user_id", ""),
                    summary_content=data.get("content", ""),
                    covered_message_ids=data.get("covered_message_ids"),
                )
                db.add(cs)
                await db.commit()
            return summary
        except Exception as e:
            logger.error(f"PostgresMemoryService.add_summary failed: {e}")
            raise

    # ─── Helpers ────────────────────────────────────────────────────

    def _msg_to_dict(self, m: ChatMessage) -> dict:
        return {
            "message_id": str(m.id),
            "session_id": str(m.thread_id),
            "user_id": str(m.user_id) if m.user_id else "",
            "role": m.role,
            "content": m.content,
            "importance_score": m.importance_score,
            "timestamp": m.created_at.isoformat() if m.created_at else "",
        }


pg_memory = PostgresMemoryService()
