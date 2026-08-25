import json
import logging
import time
import redis
import fakeredis
from app.config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB

logger = logging.getLogger("redis_service")
logging.basicConfig(level=logging.INFO)

class RedisService:
    def __init__(self):
        self.is_fake = False
        self.client = None
        self.connect()

    def connect(self):
        try:
            # Try connecting to real Redis server
            r = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                db=REDIS_DB,
                decode_responses=True,
                socket_timeout=1.5
            )
            r.ping()
            self.client = r
            self.is_fake = False
            logger.info("Connected successfully to Native Redis Server at %s:%s", REDIS_HOST, REDIS_PORT)
        except Exception as e:
            logger.warning("Could not connect to Native Redis (%s). Using high-performance Fakeredis engine.", e)
            self.client = fakeredis.FakeStrictRedis(decode_responses=True)
            self.is_fake = True

    # Helper methods for standard Redis operations
    def get(self, key: str):
        return self.client.get(key)

    def setex(self, key: str, time_sec: int, value: str):
        return self.client.setex(key, time_sec, value)

    def set(self, key: str, value: str):
        return self.client.set(key, value)

    def delete(self, *keys: str):
        if keys:
            return self.client.delete(*keys)
        return 0

    def incr(self, key: str, amount: int = 1):
        return self.client.incr(key, amount)

    def hset(self, name: str, key: str = None, value: str = None, mapping: dict = None):
        if mapping:
            return self.client.hset(name, mapping=mapping)
        return self.client.hset(name, key, value)

    def hgetall(self, name: str):
        return self.client.hgetall(name)

    def hincrby(self, name: str, key: str, amount: int = 1):
        return self.client.hincrby(name, key, amount)

    def rpush(self, key: str, *values):
        return self.client.rpush(key, *values)

    def lrange(self, key: str, start: int, stop: int):
        return self.client.lrange(key, start, stop)

    def zincrby(self, name: str, amount: float, value: str):
        return self.client.zincrby(name, amount, value)

    def zrevrange(self, name: str, start: int, stop: int, withscores: bool = False):
        return self.client.zrevrange(name, start, stop, withscores=withscores)

    def keys(self, pattern: str = "*"):
        return self.client.keys(pattern)

    def ttl(self, key: str):
        return self.client.ttl(key)

    def type(self, key: str):
        return self.client.type(key)

    def publish(self, channel: str, message: str):
        return self.client.publish(channel, message)

    def pubsub(self):
        return self.client.pubsub()

    def get_info(self):
        return {
            "mode": "In-Memory Engine (Fakeredis)" if self.is_fake else "Native Redis Server",
            "host": REDIS_HOST,
            "port": REDIS_PORT,
            "connected": True,
            "total_keys": len(self.client.keys("*"))
        }

# Global Redis instance singleton
redis_db = RedisService()
