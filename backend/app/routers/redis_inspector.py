from fastapi import APIRouter
from app.redis_client import redis_db
import json

router = APIRouter(prefix="/api/redis", tags=["Redis Inspector"])

@router.get("/keys")
async def list_redis_keys():
    """Returns a real-time list of all keys in Redis with their data types, TTLs, and value summaries."""
    keys = redis_db.keys("*")
    key_details = []

    for k in keys:
        k_type = redis_db.type(k)
        k_ttl = redis_db.ttl(k)
        val_preview = ""

        try:
            if k_type == "string":
                raw = redis_db.get(k)
                val_preview = raw[:120] + "..." if len(raw) > 120 else raw
            elif k_type == "hash":
                data = redis_db.hgetall(k)
                val_preview = json.dumps(data)[:120]
            elif k_type == "list":
                data = redis_db.lrange(k, 0, 4)
                val_preview = f"List ({len(data)} items sample): " + json.dumps(data)[:100]
            elif k_type == "zset":
                data = redis_db.zrevrange(k, 0, 4, withscores=True)
                val_preview = f"SortedSet: {data}"
            else:
                val_preview = f"[{k_type}]"
        except Exception as e:
            val_preview = f"Error reading: {str(e)}"

        key_details.append({
            "key": k,
            "type": k_type,
            "ttl": k_ttl,
            "value_preview": val_preview
        })

    key_details.sort(key=lambda x: x["key"])

    return {
        "redis_engine": redis_db.get_info(),
        "total_keys": len(keys),
        "keys": key_details
    }
