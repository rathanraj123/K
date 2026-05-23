from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from app.api import deps
from app.schemas import chatbot as schemas
from app.schemas.es_chat import ESChatMessageCreate, ESChatMessage
from app.modules.chatbot.service import chatbot_service
from app.memory.es_service import es_memory
from app.models.user import User
import uuid
import json

router = APIRouter()

@router.get("/threads", response_model=List[Dict[str, Any]])
async def get_chat_threads(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all chat threads for the current user from Elasticsearch."""
    try:
        sessions = await es_memory.get_session_history(user_id=str(current_user.id), limit=50)
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not retrieve chat history")

@router.get("/threads/{thread_id}/messages", response_model=List[ESChatMessage])
async def get_thread_messages(
    thread_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all messages for a specific thread from Elasticsearch."""
    messages = await es_memory.get_recent_messages(session_id=thread_id, user_id=str(current_user.id), limit=100)
    return messages

@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_thread(
    thread_id: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> None:
    """Delete a chat thread from Elasticsearch."""
    await es_memory.delete_session(session_id=thread_id, user_id=str(current_user.id))

@router.post("/chat")
async def chat_with_agricosmo_stream(
    request: schemas.ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Server-Sent Events (SSE) streaming endpoint for AI responses.
    Saves context asynchronously to Elasticsearch.
    """
    session_id = request.thread_id or str(uuid.uuid4())
    user_id = str(current_user.id)
    new_msg_content = request.messages[-1].content
    
    # 1. Background task to save User message to L2
    user_msg_es = ESChatMessageCreate(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=new_msg_content,
        importance_score=5 # Default
    )
    background_tasks.add_task(es_memory.add_message, user_msg_es)
    
    # 2. Setup Context
    context = request.context or {}
    context["user_region"] = current_user.region
    
    # 3. We define an internal background task to capture the full AI response and save it
    # We must intercept the stream to construct the final message for ES, but streaming
    # must not be delayed. So we yield the generator, but wrap it.
    
    async def event_generator():
        full_response = ""
        # First event: send the assigned thread_id so the frontend knows the session
        yield f"data: {json.dumps({'thread_id': session_id})}\n\n"
        
        async for chunk in chatbot_service.stream_chat(session_id, user_id, new_msg_content, context):
            if chunk.startswith("data: ") and "[DONE]" not in chunk:
                # Extract content to build the full response for DB saving
                try:
                    data = json.loads(chunk[6:])
                    if 'content' in data:
                        full_response += data['content']
                except:
                    pass
            yield chunk
            
        # Stream is done. Save AI message to ES.
        # ensure_future is safe inside an async generator (unlike create_task which needs a running loop context)
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
