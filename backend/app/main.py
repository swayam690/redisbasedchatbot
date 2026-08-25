import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, faqs, agent, analytics, redis_inspector
from app.redis_client import redis_db
from app.ai_engine import ai_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_chatbot")

app = FastAPI(
    title="OmniCustomer Service AI Chatbot API",
    description="FastAPI + Redis + React powered Customer Support Chatbot System",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router)
app.include_router(faqs.router)
app.include_router(agent.router)
app.include_router(analytics.router)
app.include_router(redis_inspector.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing OmniCustomer Service AI Backend...")
    # Seed initial FAQs into Redis
    ai_engine.seed_faqs()
    logger.info("Redis Status: %s", redis_db.get_info())

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "OmniCustomer Service AI Chatbot Backend",
        "framework": "FastAPI",
        "redis": redis_db.get_info()
    }
