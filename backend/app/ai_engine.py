import re
import uuid
import time
import json
from typing import Dict, Any, List
from app.redis_client import redis_db
from app.config import FAQ_CACHE_TTL

# Mock database of FAQs (seed data)
INITIAL_FAQS = [
    {
        "id": "faq_1",
        "question": "What is your return policy?",
        "answer": "We offer a 30-day hassle-free return policy. Items must be unused, in original packaging, and accompanied by proof of purchase. Return shipping is FREE for premier members!",
        "category": "Returns & Refunds",
        "keywords": ["return", "refund", "policy", "30 days", "exchange", "money back"]
    },
    {
        "id": "faq_2",
        "question": "How long does shipping take?",
        "answer": "Standard domestic shipping takes 3–5 business days. Express shipping delivers in 1–2 business days. International orders typically take 7–14 business days.",
        "category": "Shipping & Delivery",
        "keywords": ["shipping", "delivery", "time", "days", "dispatch", "courier", "express"]
    },
    {
        "id": "faq_3",
        "question": "How do I reset my password?",
        "answer": "Click on 'Forgot Password' on the login screen, enter your registered email address, and follow the link sent to your inbox to reset your password within 15 minutes.",
        "category": "Account & Tech Support",
        "keywords": ["password", "reset", "forgot", "login", "account", "access", "change password"]
    },
    {
        "id": "faq_4",
        "question": "What payment methods do you accept?",
        "answer": "We accept major Credit/Debit Cards (Visa, MasterCard, Amex), PayPal, Apple Pay, Google Pay, and Shop Pay Installments.",
        "category": "Billing & Payment",
        "keywords": ["payment", "pay", "credit card", "paypal", "apple pay", "visa", "billing"]
    },
    {
        "id": "faq_5",
        "question": "How can I contact a human customer support agent?",
        "answer": "You can request human assistance anytime by typing 'human agent' or clicking the 'Request Live Agent' button below. Our specialists are available 24/7.",
        "category": "General",
        "keywords": ["human", "agent", "representative", "person", "support team", "help desk", "talk to human"]
    }
]

# Mock Order Database
MOCK_ORDERS = {
    "12345": {
        "order_id": "#12345",
        "status": "In Transit",
        "item": "AeroPro Noise-Canceling Wireless Headphones",
        "carrier": "FedEx Express",
        "tracking_num": "FX-99201482-US",
        "est_delivery": "Tomorrow by 5:00 PM",
        "progress_step": 3, # 1: Placed, 2: Shipped, 3: Out for Delivery, 4: Delivered
        "destination": "Seattle, WA"
    },
    "98765": {
        "order_id": "#98765",
        "status": "Delivered",
        "item": "UltraErgo Mechanical Keyboard - RGB Blue Switches",
        "carrier": "UPS Ground",
        "tracking_num": "UPS-771829-WA",
        "est_delivery": "Delivered yesterday at 2:15 PM",
        "progress_step": 4,
        "destination": "Portland, OR"
    },
    "55443": {
        "order_id": "#55443",
        "status": "Processing",
        "item": "Smart Desk Mat - Extended XL",
        "carrier": "USPS Priority",
        "tracking_num": "USPS-3341-PENDING",
        "est_delivery": "Friday, Aug 28",
        "progress_step": 1,
        "destination": "San Francisco, CA"
    }
}

class CustomerServiceAIEngine:
    def __init__(self):
        self.seed_faqs()

    def seed_faqs(self):
        """Seed Redis with default FAQs if empty."""
        for faq in INITIAL_FAQS:
            key = f"faq:{faq['id']}"
            if not redis_db.get(key):
                redis_db.setex(key, FAQ_CACHE_TTL, json.dumps(faq))
                redis_db.hset("faqs:index", faq["id"], faq["question"])

    def get_all_faqs(self) -> List[Dict[str, Any]]:
        """Retrieve all FAQs from Redis or DB."""
        faqs = []
        keys = redis_db.keys("faq:*")
        for k in keys:
            data = redis_db.get(k)
            if data:
                try:
                    faqs.append(json.loads(data))
                except Exception:
                    pass
        return faqs

    def process_message(self, session_id: str, user_message: str, customer_name: str = "Guest") -> Dict[str, Any]:
        """Main NLP pipeline to answer user query using Redis cached context and intent routing."""
        start_time = time.time()
        msg_clean = user_message.strip().lower()
        
        # 1. Update Analytics in Redis
        redis_db.hincrby("analytics:counters", "total_messages", 1)

        # 2. Check if Human Agent has already taken over session
        session_state_json = redis_db.get(f"session:{session_id}:state")
        session_state = json.loads(session_state_json) if session_state_json else {}
        
        if session_state.get("human_agent_active"):
            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "system",
                "text": "Your conversation is currently assigned to a live human agent. They will reply shortly!",
                "timestamp": time.time(),
                "intent": "human_escalation",
                "confidence": 1.0,
                "cache_hit": False,
                "processing_time_ms": proc_time,
                "needs_agent": True
            }

        # 3. Intent Detection Routing
        
        # A. Human Agent Request Intent
        if any(w in msg_clean for w in ["human", "representative", "agent", "person", "real worker", "escalate", "talk to human"]):
            redis_db.hincrby("analytics:counters", "human_escalations", 1)
            redis_db.zincrby("analytics:top_intents", 1, "Human Agent Request")
            
            # Set session state in Redis
            session_state["needs_agent"] = True
            session_state["human_requested_at"] = time.time()
            redis_db.setex(f"session:{session_id}:state", 86400, json.dumps(session_state))
            
            # Publish event to Redis PubSub for agent dashboard notification
            redis_db.publish("agent_events", json.dumps({
                "event": "agent_requested",
                "session_id": session_id,
                "customer_name": customer_name,
                "last_message": user_message,
                "timestamp": time.time()
            }))
            
            # Push ticket into Redis Pending Queue
            ticket_data = {
                "session_id": session_id,
                "customer_name": customer_name,
                "last_message": user_message,
                "requested_at": time.time(),
                "status": "pending"
            }
            redis_db.hset("tickets:pending", session_id, json.dumps(ticket_data))

            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "ai",
                "text": f"I've initiated a handoff to our live customer support team for you, {customer_name}! A customer service representative will join this chat in a moment. You can continue typing details below.",
                "timestamp": time.time(),
                "intent": "human_escalation",
                "confidence": 0.99,
                "actions": [
                    {"label": "Cancel Agent Request", "action_type": "query", "payload": "cancel agent request"},
                    {"label": "Check Ticket Status", "action_type": "query", "payload": "what is my ticket status"}
                ],
                "card_data": {
                    "type": "ticket_created",
                    "title": "Human Support Escalated",
                    "status": "Queued for Next Specialist",
                    "est_wait": "< 2 minutes"
                },
                "cache_hit": False,
                "processing_time_ms": proc_time,
                "needs_agent": True
            }

        # B. Order Tracking Intent (Extract order number via regex or pattern)
        order_match = re.search(r'#?(\d{5})', msg_clean)
        if order_match or any(w in msg_clean for w in ["order", "track", "package", "where is my", "shipment"]):
            redis_db.hincrby("analytics:counters", "order_queries", 1)
            redis_db.zincrby("analytics:top_intents", 1, "Order Tracking")

            order_id = order_match.group(1) if order_match else "12345"
            order_info = MOCK_ORDERS.get(order_id, MOCK_ORDERS["12345"])

            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "ai",
                "text": f"I checked our shipping database for Order **{order_info['order_id']}**! Here is the latest status:",
                "timestamp": time.time(),
                "intent": "order_tracking",
                "confidence": 0.96,
                "card_data": {
                    "type": "order_tracking",
                    "order_id": order_info["order_id"],
                    "item": order_info["item"],
                    "status": order_info["status"],
                    "carrier": order_info["carrier"],
                    "tracking_num": order_info["tracking_num"],
                    "est_delivery": order_info["est_delivery"],
                    "progress_step": order_info["progress_step"],
                    "destination": order_info["destination"]
                },
                "actions": [
                    {"label": "Try Another Order (#98765)", "action_type": "query", "payload": "track order #98765"},
                    {"label": "Request Return / Refund", "action_type": "query", "payload": f"return order {order_info['order_id']}"},
                    {"label": "Speak to Live Agent", "action_type": "escalate", "payload": "human agent"}
                ],
                "cache_hit": False,
                "processing_time_ms": proc_time
            }

        # C. Return & Refund Eligibility Intent
        if any(w in msg_clean for w in ["refund", "return", "send back", "exchange"]):
            redis_db.hincrby("analytics:counters", "refund_queries", 1)
            redis_db.zincrby("analytics:top_intents", 1, "Returns & Refunds")

            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "ai",
                "text": "Our return process is fast and 100% automated! You have **30 days** from delivery to initiate a full refund. Would you like to check return eligibility or generate a prepaid shipping label?",
                "timestamp": time.time(),
                "intent": "returns_refunds",
                "confidence": 0.94,
                "card_data": {
                    "type": "refund_portal",
                    "policy_days": 30,
                    "return_fee": "FREE ($0.00)",
                    "instant_credit": True
                },
                "actions": [
                    {"label": "Check Return Eligibility", "action_type": "query", "payload": "check refund eligibility for my order"},
                    {"label": "Generate Return Label", "action_type": "query", "payload": "generate prepaid return label"},
                    {"label": "Speak to Support Agent", "action_type": "escalate", "payload": "human agent"}
                ],
                "cache_hit": False,
                "processing_time_ms": proc_time
            }

        # D. Technical Support & App Troubleshooting
        if any(w in msg_clean for w in ["bug", "error", "crash", "login", "password", "not working", "broken", "issue", "troubleshoot"]):
            redis_db.hincrby("analytics:counters", "tech_queries", 1)
            redis_db.zincrby("analytics:top_intents", 1, "Technical Support")

            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "ai",
                "text": "I'm sorry to hear you're experiencing technical trouble! Let's troubleshoot step-by-step:",
                "timestamp": time.time(),
                "intent": "tech_support",
                "confidence": 0.92,
                "card_data": {
                    "type": "troubleshooting_guide",
                    "steps": [
                        "1. Clear your browser cache or app cookies.",
                        "2. Ensure your app is updated to version v2.4.1.",
                        "3. Try logging out and logging back in via OTP.",
                        "4. Disable browser extensions (e.g. ad-blockers) temporarily."
                    ]
                },
                "actions": [
                    {"label": "Reset Password Now", "action_type": "query", "payload": "how to reset password"},
                    {"label": "Issue Not Resolved - Contact Agent", "action_type": "escalate", "payload": "human agent"}
                ],
                "cache_hit": False,
                "processing_time_ms": proc_time
            }

        # E. Redis FAQ Cache Lookup Engine
        faqs = self.get_all_faqs()
        best_faq = None
        best_score = 0
        cache_hit = False

        for faq in faqs:
            score = 0
            # Check title overlap
            q_words = set(faq["question"].lower().split())
            user_words = set(msg_clean.split())
            common = q_words.intersection(user_words)
            score += len(common) * 2

            # Check keyword match
            for kw in faq.get("keywords", []):
                if kw in msg_clean:
                    score += 3

            if score > best_score:
                best_score = score
                best_faq = faq

        if best_faq and best_score >= 2:
            # Check if FAQ was fetched directly from Redis cache
            redis_db.hincrby("analytics:counters", "faq_cache_hits", 1)
            redis_db.zincrby("analytics:top_intents", 1, f"FAQ: {best_faq['category']}")
            cache_hit = True

            proc_time = round((time.time() - start_time) * 1000, 2)
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "sender": "ai",
                "text": best_faq["answer"],
                "timestamp": time.time(),
                "intent": f"faq_{best_faq['category'].lower().replace(' ', '_')}",
                "confidence": 0.95,
                "card_data": {
                    "type": "faq_answer",
                    "category": best_faq["category"],
                    "question": best_faq["question"]
                },
                "actions": [
                    {"label": "Was this helpful?", "action_type": "query", "payload": "yes helpful"},
                    {"label": "Need more help? Talk to Agent", "action_type": "escalate", "payload": "human agent"}
                ],
                "cache_hit": cache_hit,
                "source": "pulled it from redis",
                "processing_time_ms": proc_time
            }

        # F. Fallback AI Response
        redis_db.hincrby("analytics:counters", "fallback_responses", 1)
        redis_db.zincrby("analytics:top_intents", 1, "General Inquiry")
        proc_time = round((time.time() - start_time) * 1000, 2)

        return {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "sender": "ai",
            "text": f"Thank you for contacting customer service! I can assist you with order status, shipping estimates, return shipping labels, billing questions, or password resets. \n\nHow can I help you today?",
            "timestamp": time.time(),
            "intent": "general_inquiry",
            "confidence": 0.85,
            "actions": [
                {"label": "Track Order #12345", "action_type": "query", "payload": "track order #12345"},
                {"label": "Return & Refund Policy", "action_type": "query", "payload": "what is return policy"},
                {"label": "Talk to Human Agent", "action_type": "escalate", "payload": "human agent"}
            ],
            "cache_hit": False,
            "source": "live_ai",
            "processing_time_ms": proc_time
        }

    def get_or_create_cached_prompt(self, prompt_key: str = "user_vip_context", user_query: str = "What is the return policy for VIP members?", force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch cached prompt & made-up info from Redis, or populate Redis cache if missing."""
        redis_key = f"prompt_cache:{prompt_key}"

        if not force_refresh:
            cached_data = redis_db.get(redis_key)
            if cached_data:
                parsed = json.loads(cached_data)
                ttl = redis_db.ttl(redis_key)
                return {
                    "status": "success",
                    "source": "pulled it from redis",
                    "cache_hit": True,
                    "key": redis_key,
                    "information": parsed,
                    "message": "Information successfully pulled from Redis cache!",
                    "ttl_seconds": ttl if (isinstance(ttl, int) and ttl > 0) else 3600
                }

        # Made up information to be stored in Redis cache
        made_up_info = {
            "prompt_key": prompt_key,
            "user_query": user_query,
            "customer_profile": {
                "user_id": "USR-88219-VIP",
                "customer_name": "Alex Mercer",
                "tier": "VIP Premier Gold",
                "account_balance": "$150.00 Store Credit"
            },
            "recent_order_context": {
                "order_id": "#12345",
                "item": "AeroPro Noise-Canceling Wireless Headphones",
                "status": "In Transit - Out for Delivery",
                "carrier": "FedEx Express"
            },
            "cached_prompt_response": (
                "VIP Premier Gold members receive an exclusive 60-day hassle-free return window "
                "with free return shipping, automated instant store credit refund, and a dedicated 24/7 concierge."
            ),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }

        # Store in Redis with 1 hour TTL (3600 seconds)
        redis_db.setex(redis_key, 3600, json.dumps(made_up_info))

        return {
            "status": "success",
            "source": "populated into redis cache (initial write)",
            "cache_hit": False,
            "key": redis_key,
            "information": made_up_info,
            "message": "Information generated and cached in Redis. Make the request again to pull it from redis!",
            "ttl_seconds": 3600
        }

ai_engine = CustomerServiceAIEngine()

