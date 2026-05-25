from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.api import deps
from app.db.session import get_db
from app.schemas import chatbot as schemas
from app.schemas.es_chat import ESChatMessageCreate, ESChatMessage
from app.modules.chatbot.service import chatbot_service
from app.memory.es_service import es_memory
from app.models.user import User
from app.models.chat import ChatThread
import uuid
import json
from datetime import datetime

router = APIRouter()

@router.get("/threads", response_model=List[Dict[str, Any]])
async def get_chat_threads(
    current_user: User = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get all chat threads for the current user from PostgreSQL (Source of Truth)."""
    result = await db.execute(
        select(ChatThread)
        .where(ChatThread.user_id == str(current_user.id))
        .order_by(desc(ChatThread.is_pinned), desc(ChatThread.updated_at))
    )
    threads = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "title": t.title,
            "is_pinned": t.is_pinned,
            "updated_at": t.updated_at.isoformat() if t.updated_at else t.created_at.isoformat(),
            "created_at": t.created_at.isoformat()
        }
        for t in threads
    ]

@router.patch("/threads/{thread_id}", response_model=Dict[str, Any])
async def update_chat_thread(
    thread_id: str,
    update_data: dict, # Expecting {"title": "new title", "is_pinned": True}
    current_user: User = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update thread metadata (Rename / Pin) in PostgreSQL."""
    result = await db.execute(
        select(ChatThread).where(ChatThread.id == thread_id, ChatThread.user_id == str(current_user.id))
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    if "title" in update_data:
        thread.title = update_data["title"]
    if "is_pinned" in update_data:
        thread.is_pinned = update_data["is_pinned"]
        
    await db.commit()
    await db.refresh(thread)
    
    return {
        "id": thread.id,
        "title": thread.title,
        "is_pinned": thread.is_pinned,
        "updated_at": thread.updated_at.isoformat() if thread.updated_at else thread.created_at.isoformat()
    }

@router.get("/threads/{thread_id}/messages", response_model=List[ESChatMessage])
async def get_thread_messages(
    thread_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all messages for a specific thread from Elasticsearch."""
    try:
        messages = await es_memory.get_recent_messages(session_id=thread_id, user_id=str(current_user.id), limit=100)
        return messages
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Could not retrieve thread messages: {e}")
        return []

@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_thread(
    thread_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a chat thread from both PostgreSQL and Elasticsearch."""
    result = await db.execute(
        select(ChatThread).where(ChatThread.id == thread_id, ChatThread.user_id == str(current_user.id))
    )
    thread = result.scalar_one_or_none()
    if thread:
        await db.delete(thread)
        await db.commit()
        
    try:
        await es_memory.delete_session(session_id=thread_id, user_id=str(current_user.id))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Could not delete ES chat thread: {e}")

@router.post("/chat")
async def chat_with_agricosmo_stream(
    request: schemas.ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events (SSE) streaming endpoint for AI responses.
    Saves context asynchronously to Elasticsearch and creates thread in Postgres if new.
    """
    is_new_thread = False
    if not request.thread_id:
        is_new_thread = True
        session_id = str(uuid.uuid4())
    else:
        session_id = request.thread_id

    user_id = str(current_user.id)
    new_msg_content = request.messages[-1].content
    
    # 1. Create thread in PG if new
    if is_new_thread:
        new_thread = ChatThread(
            id=session_id,
            user_id=user_id,
            title=new_msg_content[:30] + "..." if len(new_msg_content) > 30 else new_msg_content
        )
        db.add(new_thread)
        await db.commit()
    
    # 2. Background task to save User message to L2
    user_msg_es = ESChatMessageCreate(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=new_msg_content,
        importance_score=5 # Default
    )
    
    async def _safe_add_message(msg):
        try:
            await es_memory.add_message(msg)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to save User message to ES: {e}")

    background_tasks.add_task(_safe_add_message, user_msg_es)
    
    # 3. Setup Context
    context = request.context or {}
    context["user_region"] = current_user.region
    context["user_role"] = current_user.role.value if current_user.role else "farmer"
    
    async def event_generator():
        full_response = ""
        # First event: send the assigned thread_id so the frontend knows the session
        yield f"data: {json.dumps({'thread_id': session_id})}\n\n"
        
        async for chunk in chatbot_service.stream_chat(session_id, user_id, new_msg_content, context):
            if chunk.startswith("data: ") and "[DONE]" not in chunk:
                try:
                    data = json.loads(chunk[6:])
                    if 'content' in data:
                        full_response += data['content']
                except:
                    pass
            yield chunk
            
        # Stream is done. Save AI message to ES.
        if full_response:
            ai_msg_es = ESChatMessageCreate(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=full_response,
                importance_score=5
            )
            import asyncio
            async def _save_ai_msg():
                try:
                    await es_memory.add_message(ai_msg_es)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to save AI message to ES: {e}")
            asyncio.ensure_future(_save_ai_msg())
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
