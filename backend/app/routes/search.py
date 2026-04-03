"""
routes/search.py - POST /search endpoint.
Orchestrates the SmartBuy AI search pipeline:
  query → live shopping search → normalize → match → AI decision → response
"""
import asyncio
import logging
import time
import hashlib
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from firebase_admin import auth as firebase_auth, firestore
from pydantic import BaseModel, field_validator

from app.services.currency import DEFAULT_CURRENCY, get_usd_to_inr_rate
from app.services.normalizer import normalize_products
from app.services.matcher import match_products
from app.services.ai_agent import run_ai_decision
from app.services.shopping_search import (
    get_autocomplete_suggestions,
    search_google_shopping,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be empty")
        if len(v) > 200:
            raise ValueError("query too long (max 200 chars)")
        return v


class SearchResponse(BaseModel):
    query: str
    best: Dict[str, Any]
    results: list
    explanation: str
    data_source: str
    decision_source: str
    currency: str
    exchange_rate_usd_to_inr: float
    took_ms: int


class SuggestionResponse(BaseModel):
    query: str
    suggestions: list[str]
    personal_count: int = 0
    source: str


class FeedItem(BaseModel):
    query: str
    product: Dict[str, Any]
    data_source: str
    cached_at: int


class FeedResponse(BaseModel):
    items: list[FeedItem]


class HistoryPayload(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def history_query_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be empty")
        if len(v) > 200:
            raise ValueError("query too long (max 200 chars)")
        return v


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def _normalize_history_query(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _history_collection(uid: str):
    return firestore.client().collection("users").document(uid).collection("searches")


def _feed_collection(uid: str):
    return firestore.client().collection("users").document(uid).collection("feed_cache")


def _serialize_timestamp(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def get_verified_uid(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except firebase_auth.ExpiredIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except firebase_auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token verification failed") from exc


def _get_personalized_suggestions(uid: str, query: str, limit: int) -> list[str]:
    normalized_query = _normalize_history_query(query)
    if not normalized_query:
        return []

    docs = (
        _history_collection(uid)
        .order_by("count", direction=firestore.Query.DESCENDING)
        .limit(max(limit * 4, 20))
        .get()
    )

    suggestions = []
    seen = set()
    for doc in docs:
        payload = doc.to_dict() or {}
        stored_query = _normalize_history_query(payload.get("query", ""))
        if not stored_query or not stored_query.startswith(normalized_query):
            continue
        if stored_query in seen:
            continue

        suggestions.append(stored_query)
        seen.add(stored_query)

        if len(suggestions) >= limit:
            break

    return suggestions


def _feed_cache_doc_id(query: str) -> str:
    normalized_query = _normalize_history_query(query)
    return hashlib.sha256(normalized_query.encode()).hexdigest()[:32]


def _clean_product_payload(product: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in product.items() if not k.startswith("_")}


async def _build_feed_item(query: str) -> Dict[str, Any] | None:
    search_result = await search_google_shopping(query, limit=60)
    raw_products = search_result["products"]
    data_source = search_result["source"]
    if not raw_products:
        logger.info("Skipping feed item for '%s' because live shopping returned no products.", query)
        return None

    normalized = normalize_products(raw_products)
    if not normalized:
        return None

    top_products = match_products(normalized, query, top_n=1)
    if not top_products:
        return None

    return {
        "query": query,
        "product": _clean_product_payload(top_products[0]),
        "data_source": data_source,
        "cached_at": int(time.time()),
    }


async def _get_feed_item(uid: str, query: str, cache_ttl_seconds: int) -> Dict[str, Any] | None:
    normalized_query = _normalize_history_query(query)
    if not normalized_query:
        return None

    doc_ref = _feed_collection(uid).document(_feed_cache_doc_id(normalized_query))

    try:
        cached_doc = doc_ref.get()
        if cached_doc.exists:
            payload = cached_doc.to_dict() or {}
            cached_at = int(payload.get("cached_at") or 0)
            product = payload.get("product")
            if (
                cached_at >= int(time.time()) - cache_ttl_seconds
                and isinstance(product, dict)
                and product.get("title")
            ):
                return {
                    "query": payload.get("query") or normalized_query,
                    "product": _clean_product_payload(product),
                    "data_source": str(payload.get("data_source") or "cache"),
                    "cached_at": cached_at,
                }
    except Exception as exc:
        logger.info("Feed cache read failed for '%s': %s", normalized_query, exc)

    fresh_item = await _build_feed_item(normalized_query)
    if fresh_item is None:
        return None

    try:
        doc_ref.set(fresh_item, merge=True)
    except Exception as exc:
        logger.info("Feed cache write failed for '%s': %s", normalized_query, exc)

    return fresh_item


@router.get("/suggestions", response_model=SuggestionResponse)
async def suggestions(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(6, ge=1, le=10),
    authorization: str | None = Header(default=None),
) -> SuggestionResponse:
    query = q.strip()
    if not query:
        return SuggestionResponse(query="", suggestions=[], personal_count=0, source="none")

    personalized = []
    personalized_enabled = False
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.removeprefix("Bearer ").strip()
            decoded = firebase_auth.verify_id_token(token)
            uid = decoded["uid"]
            personalized = _get_personalized_suggestions(uid, query, limit)
            personalized_enabled = True
        except Exception as exc:
            logger.info("Personalized suggestions unavailable: %s", exc)

    autocomplete_result = await get_autocomplete_suggestions(query, limit=limit)
    live_suggestions = autocomplete_result["suggestions"]
    suggestion_source = autocomplete_result["source"]

    merged = []
    seen = set()
    personal_count = 0
    personalized_keys = {_normalize_history_query(item) for item in personalized}
    for value in personalized + live_suggestions:
        normalized = value.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue

        merged.append(normalized)
        seen.add(key)
        if key in personalized_keys:
            personal_count += 1
        if len(merged) >= limit:
            break

    if personalized and suggestion_source not in {"none", ""}:
        source = f"personalized+{suggestion_source}"
    elif personalized:
        source = "personalized"
    elif personalized_enabled and not merged:
        source = "personalized"
    else:
        source = suggestion_source

    return SuggestionResponse(
        query=query,
        suggestions=merged,
        personal_count=personal_count,
        source=source,
    )


@router.get("/feed", response_model=FeedResponse)
async def feed(uid: str = Depends(get_verified_uid)) -> FeedResponse:
    try:
        docs = (
            _history_collection(uid)
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(8)
            .get()
        )
    except Exception as exc:
        logger.warning("[feed] Failed to read history: %s", exc)
        return FeedResponse(items=[])

    queries = []
    seen = set()
    for doc in docs:
        payload = doc.to_dict() or {}
        normalized_query = _normalize_history_query(payload.get("query", ""))
        if not normalized_query or normalized_query in seen:
            continue
        seen.add(normalized_query)
        queries.append(normalized_query)

    if not queries:
        return FeedResponse(items=[])

    items = await asyncio.gather(*[
        _get_feed_item(uid, query, cache_ttl_seconds=60 * 60 * 12)
        for query in queries
    ])

    return FeedResponse(items=[item for item in items if item is not None])


@router.post("/history")
async def save_search(
    payload: HistoryPayload,
    uid: str = Depends(get_verified_uid),
) -> Dict[str, str]:
    query = _normalize_history_query(payload.query)
    doc_id = hashlib.sha256(f"{uid}:{query}".encode()).hexdigest()[:32]

    try:
        _history_collection(uid).document(doc_id).set(
            {
                "query": query,
                "count": firestore.Increment(1),
                "timestamp": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as exc:
        logger.warning("[history] Firestore write failed: %s", exc)

    return {"status": "ok"}


@router.get("/history")
async def get_history(uid: str = Depends(get_verified_uid)) -> Dict[str, list[Dict[str, Any]]]:
    try:
        docs = (
            _history_collection(uid)
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(20)
            .get()
        )
    except Exception as exc:
        logger.warning("[history] Firestore read failed: %s", exc)
        return {"history": []}

    return {
        "history": [
            {
                "query": d.get("query"),
                "count": d.get("count"),
                "timestamp": _serialize_timestamp(d.get("timestamp")),
            }
            for d in docs
        ]
    }

@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest) -> SearchResponse:
    t0 = time.monotonic()
    query = body.query
    logger.info("Search request: '%s'", query)

    # ── Step 1: Search live Google Shopping results ──────────────────────────
    search_result = await search_google_shopping(query, limit=60)
    raw_products = search_result["products"]
    data_source = search_result["source"]
    logger.info(
        "Live search source=%s query='%s' raw_products=%d error=%s",
        data_source,
        query,
        len(raw_products),
        search_result.get("error"),
    )

    if not raw_products:
        raise HTTPException(
            status_code=503,
            detail=search_result.get("error") or "Live product search is currently unavailable.",
        )

    # ── Step 3: Normalize ────────────────────────────────────────────────────
    normalized = normalize_products(raw_products)
    logger.info("Normalized %d products for '%s'", len(normalized), query)
    if not normalized:
        raise HTTPException(status_code=500, detail="Products could not be processed.")

    # ── Step 4: Match (rank only relevant products) ─────────────────────────
    top_products = match_products(normalized, query, top_n=60)
    logger.info("Matched %d ranked products for '%s'", len(top_products), query)
    if not top_products:
        raise HTTPException(status_code=404, detail="No matching products found for this query.")

    # ── Step 5: AI Decision ──────────────────────────────────────────────────
    ai_result = await run_ai_decision(top_products, query)

    best = ai_result["best_product"]
    reasoning = ai_result["reasoning"]
    decision_source = ai_result["source"]
    currency = DEFAULT_CURRENCY
    exchange_rate = round(get_usd_to_inr_rate(), 4)

    # Remove internal scoring key before returning
    results_clean = [{k: v for k, v in p.items() if not k.startswith("_")} for p in top_products]
    best_clean = {k: v for k, v in best.items() if not k.startswith("_")}

    took_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        "Search complete in %dms | source=%s | decision=%s",
        took_ms, data_source, decision_source,
    )

    return SearchResponse(
        query=query,
        best=best_clean,
        results=results_clean,
        explanation=reasoning,
        data_source=data_source,
        decision_source=decision_source,
        currency=currency,
        exchange_rate_usd_to_inr=exchange_rate,
        took_ms=took_ms,
    )
