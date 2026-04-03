"""
main.py - FastAPI application entry point for SmartBuy AI.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import firebase_admin
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials
from dotenv import load_dotenv

from app.routes.search import router as search_router

BACKEND_DIR = Path(__file__).resolve().parent.parent
PLACEHOLDER_API_KEYS = {"your_anthropic_api_key_here"}
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Firebase
# ---------------------------------------------------------------------------
def initialize_firebase() -> bool:
    service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if not service_account_path:
        logger.info("Firebase Admin: NOT CONFIGURED (history + personalized suggestions disabled)")
        return False

    key_path = Path(service_account_path)
    if not key_path.is_absolute():
        key_path = BACKEND_DIR / key_path

    if not key_path.exists():
        logger.warning("Firebase Admin key not found at %s", key_path)
        return False

    try:
        firebase_admin.get_app()
        logger.info("Firebase Admin: ALREADY INITIALIZED")
        return True
    except ValueError:
        pass

    try:
        cred = credentials.Certificate(str(key_path))
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin: INITIALIZED")
        return True
    except Exception as exc:
        logger.exception("Firebase Admin initialization failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SmartBuy AI backend starting...")
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    api_key_set = bool(api_key) and api_key not in PLACEHOLDER_API_KEYS
    serpapi_key = os.getenv("SERPAPI_API_KEY", "").strip()
    serpapi_key_set = bool(serpapi_key) and serpapi_key != "your_serpapi_api_key_here"
    logger.info(
        "Anthropic API key: %s",
        "SET" if api_key_set else "NOT CONFIGURED (rule-based fallback active)",
    )
    logger.info(
        "SerpApi key: %s",
        "SET" if serpapi_key_set else "NOT CONFIGURED (live shopping + suggestions disabled)",
    )
    initialize_firebase()
    yield
    logger.info("SmartBuy AI backend shutting down.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SmartBuy AI",
    description="Agentic price comparison system with AI-powered decision making.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SmartBuy AI"}
