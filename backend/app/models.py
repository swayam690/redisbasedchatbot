from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    customer_name: Optional[str] = "Guest Customer"
    metadata: Optional[Dict[str, Any]] = None

class ActionButton(BaseModel):
    label: str
    action_type: str  # e.g. "query", "escalate", "order_status", "url"
    payload: str

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str # "ai", "customer", "agent", "system"
    text: str
    timestamp: float
    intent: Optional[str] = "general"
    confidence: Optional[float] = 0.95
    actions: Optional[List[ActionButton]] = []
    card_data: Optional[Dict[str, Any]] = None
    cache_hit: Optional[bool] = False
    source: Optional[str] = "live_ai"
    processing_time_ms: Optional[float] = 0.0
    needs_agent: Optional[bool] = False

class FAQCreateRequest(BaseModel):
    question: str
    answer: str
    category: str = "General"
    keywords: List[str] = []

class FAQResponse(BaseModel):
    id: str
    question: str
    answer: str
    category: str
    keywords: List[str]
    cache_hit: Optional[bool] = False

class AgentTakeoverRequest(BaseModel):
    session_id: str
    agent_id: str = "Agent_Sarah"
    agent_name: str = "Sarah Jenkins (Senior Specialist)"

class AgentMessageRequest(BaseModel):
    session_id: str
    agent_name: str = "Sarah Jenkins"
    message: str

class RatingRequest(BaseModel):
    session_id: str
    score: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

class CachedPromptRequest(BaseModel):
    prompt_key: Optional[str] = "user_vip_context"
    user_query: Optional[str] = "What is the return policy for VIP members?"
    force_refresh: Optional[bool] = False

class CachedPromptResponse(BaseModel):
    status: str
    source: str
    cache_hit: bool
    key: str
    information: Dict[str, Any]
    message: str
    ttl_seconds: int

