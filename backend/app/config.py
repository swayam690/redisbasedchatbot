import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_DB = int(os.getenv("REDIS_DB", 0))

FAQ_CACHE_TTL = 3600  # 1 hour
SESSION_TTL = 86400    # 24 hours
RATE_LIMIT_WINDOW = 60 # 60 seconds
RATE_LIMIT_MAX = 30    # max 30 requests per minute
