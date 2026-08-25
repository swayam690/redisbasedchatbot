import json
import time
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.models import AgentTakeoverRequest, AgentMessageRequest
from app.redis_client import redis_db
from app.routers.chat import broadcast_to_session

router = APIRouter(prefix="/api/agent", tags=["Human Agent Handoff"])

@router.get("/tickets")
async def get_tickets():
    """Fetch pending and active escalated tickets from Redis."""
    pending_raw = redis_db.hgetall("tickets:pending")
    active_raw = redis_db.hgetall("tickets:active")
    resolved_raw = redis_db.hgetall("tickets:resolved")

    def parse_tickets(raw_dict):
        result = []
        for sid, val in raw_dict.items():
            try:
                result.append(json.loads(val))
            except Exception:
                pass
        return result

    return {
        "pending": parse_tickets(pending_raw),
        "active": parse_tickets(active_raw),
        "resolved": parse_tickets(resolved_raw)
    }

@router.post("/takeover")
async def takeover_session(request: AgentTakeoverRequest):
    """Human support specialist takes over a customer chat session."""
    session_id = request.session_id

    # 1. Update session state in Redis
    state_raw = redis_db.get(f"session:{session_id}:state")
    state = json.loads(state_raw) if state_raw else {}
    state["human_agent_active"] = True
    state["assigned_agent"] = request.agent_name
    state["takeover_at"] = time.time()
    redis_db.setex(f"session:{session_id}:state", 86400, json.dumps(state))

    # 2. Move ticket from pending to active in Redis
    ticket_raw = redis_db.client.hget("tickets:pending", session_id)
    ticket_data = json.loads(ticket_raw) if ticket_raw else {
        "session_id": session_id,
        "customer_name": "Customer",
        "requested_at": time.time()
    }
    ticket_data["status"] = "active"
    ticket_data["assigned_agent"] = request.agent_name
    ticket_data["started_at"] = time.time()

    redis_db.client.hdel("tickets:pending", session_id)
    redis_db.hset("tickets:active", session_id, json.dumps(ticket_data))

    # 3. Create system message in chat
    system_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "text": f"🎉 {request.agent_name} has joined the conversation to assist you!",
        "timestamp": time.time(),
        "needs_agent": False
    }
    redis_db.rpush(f"session:{session_id}:messages", json.dumps(system_msg))
    await broadcast_to_session(session_id, system_msg)

    # 4. Broadcast via Redis PubSub
    redis_db.publish("agent_events", json.dumps({
        "event": "takeover_started",
        "session_id": session_id,
        "agent": request.agent_name
    }))

    return {"status": "success", "session_id": session_id, "agent": request.agent_name}

@router.post("/message")
async def send_agent_message(request: AgentMessageRequest):
    """Human support specialist sends a message to customer."""
    session_id = request.session_id

    agent_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "agent",
        "text": request.message,
        "agent_name": request.agent_name,
        "timestamp": time.time()
    }

    # Store in Redis
    redis_db.rpush(f"session:{session_id}:messages", json.dumps(agent_msg))

    # Broadcast to customer and agent websockets
    await broadcast_to_session(session_id, agent_msg)

    return agent_msg

@router.post("/resolve/{session_id}")
async def resolve_ticket(session_id: str):
    """Mark a customer ticket as resolved in Redis."""
    state_raw = redis_db.get(f"session:{session_id}:state")
    state = json.loads(state_raw) if state_raw else {}
    state["human_agent_active"] = False
    state["resolved"] = True
    redis_db.setex(f"session:{session_id}:state", 86400, json.dumps(state))

    # Move ticket to resolved hash
    active_raw = redis_db.client.hget("tickets:active", session_id)
    ticket_data = json.loads(active_raw) if active_raw else {"session_id": session_id}
    ticket_data["status"] = "resolved"
    ticket_data["resolved_at"] = time.time()

    redis_db.client.hdel("tickets:active", session_id)
    redis_db.hset("tickets:resolved", session_id, json.dumps(ticket_data))

    system_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "sender": "system",
        "text": "This support ticket has been marked as RESOLVED. Thank you for choosing OmniCustomer Service!",
        "timestamp": time.time()
    }
    redis_db.rpush(f"session:{session_id}:messages", json.dumps(system_msg))
    await broadcast_to_session(session_id, system_msg)

    return {"status": "success", "session_id": session_id}
