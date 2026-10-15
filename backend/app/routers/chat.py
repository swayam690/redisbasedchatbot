import json
import time
import uuid
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models import ChatMessageRequest, ChatMessageResponse, RatingRequest, CachedPromptRequest, CachedPromptResponse
from app.redis_client import redis_db
from app.ai_engine import ai_engine
from app.config import SESSION_TTL

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("/cached-prompt", response_model=CachedPromptResponse)
async def get_cached_prompt(request: CachedPromptRequest = CachedPromptRequest()):
    """Retrieve made-up context information stored in Redis cache or populate if missing."""
    res = ai_engine.get_or_create_cached_prompt(
        prompt_key=request.prompt_key or "user_vip_context",
        user_query=request.user_query or "What is the return policy for VIP members?",
        force_refresh=request.force_refresh or False
    )
    return res


# Active WebSocket connections mapping: session_id -> List[WebSocket]
active_connections: dict[str, List[WebSocket]] = {}

async def broadcast_to_session(session_id: str, message_dict: dict):
    """Send websocket message to all clients listening on this session_id (customer + agent)."""
    if session_id in active_connections:
        dead_sockets = []
        for ws in active_connections[session_id]:
            try:
                await ws.send_text(json.dumps(message_dict))
            except Exception:
                dead_sockets.append(ws)
        for ws in dead_sockets:
            active_connections[session_id].remove(ws)

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest):
    """Process incoming customer chat message via REST."""
    session_id = request.session_id
    user_msg_text = request.message

    # 1. Store customer message in Redis List
    cust_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "customer",
        "text": user_msg_text,
        "customer_name": request.customer_name or "Guest Customer",
        "timestamp": time.time()
    }
    redis_db.rpush(f"session:{session_id}:messages", json.dumps(cust_msg))
    redis_db.client.expire(f"session:{session_id}:messages", SESSION_TTL)

    # Broadcast customer message via websocket if active
    await broadcast_to_session(session_id, cust_msg)

    # 2. Generate response via AI Engine
    ai_response = ai_engine.process_message(session_id, user_msg_text, request.customer_name or "Guest Customer")

    # 3. Store AI/System response in Redis List
    redis_db.rpush(f"session:{session_id}:messages", json.dumps(ai_response))

    # Broadcast AI response via websocket
    await broadcast_to_session(session_id, ai_response)

    return ai_response

@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Retrieve complete chat history for a session from Redis."""
    raw_msgs = redis_db.lrange(f"session:{session_id}:messages", 0, -1)
    messages = []
    for raw in raw_msgs:
        try:
            messages.append(json.loads(raw))
        except Exception:
            pass
    
    # Get session state
    state_raw = redis_db.get(f"session:{session_id}:state")
    state = json.loads(state_raw) if state_raw else {}

    return {
        "session_id": session_id,
        "messages": messages,
        "state": state
    }

@router.post("/rate")
async def rate_chat(request: RatingRequest):
    """Submit CSAT score and rating feedback for session."""
    redis_db.hincrby("analytics:csat", "total_ratings", 1)
    redis_db.hincrby("analytics:csat", f"star_{request.score}", 1)
    
    # Store feedback in Redis List
    feedback_entry = {
        "session_id": request.session_id,
        "score": request.score,
        "feedback": request.feedback,
        "timestamp": time.time()
    }
    redis_db.rpush("analytics:feedbacks", json.dumps(feedback_entry))
    
    return {"status": "success", "message": "Thank you for your feedback!"}

@router.websocket("/ws/{session_id}")
async def chat_websocket(websocket: WebSocket, session_id: str):
    """Bi-directional WebSocket connection for instant streaming & dual customer-agent interaction."""
    await websocket.accept()
    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(websocket)

    # Track active session count in Redis
    redis_db.hincrby("analytics:counters", "active_ws_connections", 1)

    try:
        # Send connection welcome event
        await websocket.send_text(json.dumps({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "sender": "system",
            "text": "Connected to Customer Support Real-time Gateway.",
            "timestamp": time.time()
        }))

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                user_msg = payload.get("message", "").strip()
                cust_name = payload.get("customer_name", "Guest Customer")

                if user_msg:
                    # Construct customer message
                    cust_msg = {
                        "id": str(uuid.uuid4()),
                        "session_id": session_id,
                        "sender": "customer",
                        "text": user_msg,
                        "customer_name": cust_name,
                        "timestamp": time.time()
                    }
                    redis_db.rpush(f"session:{session_id}:messages", json.dumps(cust_msg))
                    redis_db.client.expire(f"session:{session_id}:messages", SESSION_TTL)

                    # Broadcast customer message
                    await broadcast_to_session(session_id, cust_msg)

                    # Check AI response
                    ai_response = ai_engine.process_message(session_id, user_msg, cust_name)
                    redis_db.rpush(f"session:{session_id}:messages", json.dumps(ai_response))
                    await broadcast_to_session(session_id, ai_response)

            except Exception as e:
                await websocket.send_text(json.dumps({
                    "sender": "system",
                    "text": f"Error processing WebSocket message: {str(e)}",
                    "timestamp": time.time()
                }))

    except WebSocketDisconnect:
        if session_id in active_connections and websocket in active_connections[session_id]:
            active_connections[session_id].remove(websocket)
        redis_db.hincrby("analytics:counters", "active_ws_connections", -1)
