# OmniSupport AI — Enterprise Customer Service Chatbot System

A full-stack customer service platform built with **FastAPI**, **Redis**, and **React**.

## 🌟 Key Features

1. **Customer Support Portal (`/`)**
   - Interactive real-time chat with AI intent classification (Order Tracking, Returns/Refunds, Tech Support, Password Resets).
   - WebSocket streaming + REST fallback.
   - Voice Speech-to-Text input (Web Speech API) & TTS Voice Reader out-loud toggle.
   - Interactive UI Cards (Step-by-step Order Progress Bar, Refund Portal, CSAT 5-Star Feedback rating).

2. **Redis Performance & FAQ Caching Layer**
   - Ultra-fast FAQ lookups (`<5ms`) stored in Redis string keys (`setex`) with automatic 1-hour TTL.
   - Conversation history stored in Redis lists (`session:<id>:messages`).
   - Real-time Redis Pub/Sub events for support agent handoff.

3. **Human Agent Workspace**
   - Live ticket queue (`tickets:pending` & `tickets:active`).
   - One-click agent takeover & live bi-directional messaging with customers.
   - Canned preset responses dropdown.

4. **Analytics & CSAT Dashboard**
   - Real-time Redis metrics (`INCR`, `ZADD`).
   - AI Auto-Resolution Rate, CSAT Average, Top Inquiry breakdown, and Cache Hit ratio.

5. **Redis Store Inspector**
   - Real-time view of active Redis keys, data types, TTL countdowns, and raw payload contents.

---

## 🛠️ System Architecture & Stack

- **Backend**: FastAPI (Python 3.11), Uvicorn, WebSockets, Pydantic v2.
- **Caching & Messaging Engine**: Redis (with automatic fallback to `fakeredis` in-memory engine).
- **Frontend**: React 18, Vite 5, Lucide Icons, Glassmorphic Vanilla CSS styling.

---

## 🚀 Quickstart Guide

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python run.py
```
*Backend runs on `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*
