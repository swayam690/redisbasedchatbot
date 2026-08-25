import json
import uuid
import time
from typing import List
from fastapi import APIRouter, HTTPException
from app.models import FAQCreateRequest, FAQResponse
from app.redis_client import redis_db
from app.config import FAQ_CACHE_TTL

router = APIRouter(prefix="/api/faqs", tags=["FAQs & Cache"])

@router.get("", response_model=List[FAQResponse])
async def list_faqs():
    """List all FAQs. Reads directly from Redis cache."""
    start_time = time.time()
    faqs = []
    keys = redis_db.keys("faq:*")
    
    for key in keys:
        raw = redis_db.get(key)
        if raw:
            try:
                faq_dict = json.loads(raw)
                faq_dict["cache_hit"] = True
                faqs.append(faq_dict)
            except Exception:
                pass
    
    return faqs

@router.post("", response_model=FAQResponse)
async def create_faq(request: FAQCreateRequest):
    """Add a new FAQ article and cache it immediately in Redis with TTL."""
    faq_id = f"faq_{uuid.uuid4().hex[:8]}"
    faq_data = {
        "id": faq_id,
        "question": request.question,
        "answer": request.answer,
        "category": request.category,
        "keywords": request.keywords or [request.question.lower()]
    }

    # Write to Redis string cache with TTL
    redis_db.setex(f"faq:{faq_id}", FAQ_CACHE_TTL, json.dumps(faq_data))
    
    # Write to Redis Hash Index
    redis_db.hset("faqs:index", faq_id, request.question)

    faq_data["cache_hit"] = False
    return faq_data

@router.delete("/{faq_id}")
async def delete_faq(faq_id: str):
    """Delete an FAQ article and invalidate its Redis cache key."""
    deleted_count = redis_db.delete(f"faq:{faq_id}")
    redis_db.client.hdel("faqs:index", faq_id)

    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found in Redis cache.")

    return {"status": "success", "message": f"FAQ {faq_id} removed from Redis cache."}
