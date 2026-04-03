"""
shopping_search.py - Live product search and autocomplete via SerpApi.
Falls back to the local mock catalog when the API is unavailable.
"""
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
DEFAULT_COUNTRY = "in"
DEFAULT_LANGUAGE = "en"
PLACEHOLDER_API_KEYS = {"your_serpapi_api_key_here"}


def _get_serpapi_api_key() -> str:
    return os.getenv("SERPAPI_API_KEY", "").strip()


def _parse_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    match = re.search(r"[\d,.]+", str(value))
    if not match:
        return None

    try:
        return float(match.group().replace(",", ""))
    except ValueError:
        return None


def _parse_int(value: Any) -> int:
    parsed = _parse_float(value)
    if parsed is None:
        return 0
    return max(0, int(parsed))


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _matches_query_prefix(value: str, query: str) -> bool:
    normalized_value = _normalize_text(value).lower()
    normalized_query = _normalize_text(query).lower()
    if not normalized_query:
        return False

    if normalized_value.startswith(normalized_query):
        return True

    return any(token.startswith(normalized_query) for token in re.findall(r"[a-z0-9]+", normalized_value))


def _dedupe_suggestions(values: List[str], limit: int) -> List[str]:
    suggestions = []
    seen = set()

    for value in values:
        normalized = _normalize_text(value)
        if not normalized:
            continue

        key = normalized.lower()
        if key in seen:
            continue

        suggestions.append(normalized)
        seen.add(key)

        if len(suggestions) >= limit:
            break

    return suggestions


def _detect_currency(price_text: str, default: str = "INR") -> str:
    upper_text = price_text.upper()
    if "₹" in price_text or "INR" in upper_text:
        return "INR"
    if "$" in price_text or "USD" in upper_text:
        return "USD"
    return default


def _derive_delivery(result: Dict[str, Any]) -> str:
    if isinstance(result.get("delivery"), str) and result["delivery"].strip():
        return result["delivery"].strip()

    extensions = result.get("extensions")
    if isinstance(extensions, list):
        for entry in extensions:
            text = str(entry).strip()
            if text:
                return text

    return "See retailer"


def _derive_stock_state(result: Dict[str, Any]) -> bool:
    searchable_fields = [
        result.get("delivery"),
        result.get("snippet"),
        result.get("badge"),
        result.get("tag"),
        result.get("second_hand_condition"),
    ]
    extensions = result.get("extensions")
    if isinstance(extensions, list):
        searchable_fields.extend(extensions)

    haystack = " ".join(str(field).lower() for field in searchable_fields if field)
    return "out of stock" not in haystack and "sold out" not in haystack


def _normalize_result(result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    title = str(result.get("title", "")).strip()
    source = str(result.get("source", "Google Shopping")).strip()
    if not title:
        return None

    price = _parse_float(result.get("extracted_price"))
    price_text = str(result.get("price", "")).strip()
    if price is None:
        price = _parse_float(price_text)
    if price is None:
        return None

    return {
        "title": title,
        "price": price,
        "currency": _detect_currency(price_text),
        "source": source or "Google Shopping",
        "url": str(result.get("product_link") or result.get("link") or "#").strip() or "#",
        "delivery": _derive_delivery(result),
        "reviews_count": _parse_int(result.get("reviews")),
        "rating": _parse_float(result.get("rating")) or 0.0,
        "in_stock": _derive_stock_state(result),
        "thumbnail": str(result.get("thumbnail", "")).strip(),
        "snippet": str(result.get("snippet", "")).strip(),
    }


def derive_title_suggestions(query: str, products: List[Dict[str, Any]], limit: int = 6) -> List[str]:
    """
    Build lightweight suggestions from product titles without any hardcoded list.
    """
    normalized_query = _normalize_text(query)
    if not normalized_query:
        return []

    normalized_query_lower = normalized_query.lower()
    candidates = []
    for product in products:
        title = _normalize_text(product.get("title"))
        if not title:
            continue

        words = title.split()
        for index in range(len(words)):
            leading_word = _normalize_text(words[index]).lower()
            if not leading_word.startswith(normalized_query_lower):
                continue

            candidate = " ".join(words[index:index + 3]).strip(" -_,")
            if candidate:
                candidates.append(candidate)
                break

    return _dedupe_suggestions(candidates, limit)


async def get_autocomplete_suggestions(query: str, limit: int = 6) -> Dict[str, Any]:
    """
    Fetch live Google autocomplete suggestions from SerpApi.
    """
    api_key = _get_serpapi_api_key()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        logger.info("SERPAPI_API_KEY not configured; skipping autocomplete search.")
        return {"suggestions": [], "source": "unavailable", "error": "SerpApi key not configured"}

    params = {
        "engine": "google_autocomplete",
        "q": query,
        "api_key": api_key,
        "gl": os.getenv("SERPAPI_GL", DEFAULT_COUNTRY),
        "hl": os.getenv("SERPAPI_HL", DEFAULT_LANGUAGE),
        "client": "gws-wiz",
        "no_cache": "false",
    }

    timeout = httpx.Timeout(connect=3.0, read=10.0, write=8.0, pool=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(SERPAPI_ENDPOINT, params=params)
            response.raise_for_status()

        payload = response.json()
        raw_suggestions = payload.get("suggestions", [])
        if not isinstance(raw_suggestions, list):
            logger.warning("SerpApi autocomplete response did not contain a suggestions list.")
            return {"suggestions": [], "source": "unavailable", "error": "Invalid SerpApi response"}

        suggestions = []
        for item in raw_suggestions:
            value = item.get("value") if isinstance(item, dict) else item
            if _matches_query_prefix(str(value or ""), query):
                suggestions.append(str(value))

        suggestions = _dedupe_suggestions(suggestions, limit)
        logger.info("SerpApi returned %d autocomplete suggestions for '%s'", len(suggestions), query)
        return {"suggestions": suggestions, "source": "google-autocomplete", "error": None}
    except httpx.HTTPStatusError as exc:
        logger.error("SerpApi autocomplete HTTP error %s: %s", exc.response.status_code, exc.response.text)
    except httpx.RequestError as exc:
        logger.error("SerpApi autocomplete request error: %s", exc)
    except ValueError as exc:
        logger.error("Failed to parse SerpApi autocomplete response: %s", exc)

    return {"suggestions": [], "source": "unavailable", "error": "SerpApi autocomplete failed"}


async def search_google_shopping(query: str, limit: int = 60) -> Dict[str, Any]:
    """
    Search SerpApi Google Shopping and return normalized raw product rows.
    """
    api_key = _get_serpapi_api_key()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        logger.info("SERPAPI_API_KEY not configured; skipping live shopping search.")
        return {"products": [], "source": "unavailable", "error": "SerpApi key not configured"}

    params = {
        "engine": "google_shopping",
        "q": query,
        "num": min(max(limit, 1), 100),
        "api_key": api_key,
        "gl": os.getenv("SERPAPI_GL", DEFAULT_COUNTRY),
        "hl": os.getenv("SERPAPI_HL", DEFAULT_LANGUAGE),
        "no_cache": "false",
    }

    timeout = httpx.Timeout(connect=3.0, read=12.0, write=8.0, pool=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(SERPAPI_ENDPOINT, params=params)
            response.raise_for_status()

        payload = response.json()
        shopping_results = payload.get("shopping_results", [])
        if not isinstance(shopping_results, list):
            logger.warning("SerpApi response did not contain a shopping_results list.")
            return {"products": [], "source": "unavailable", "error": "Invalid SerpApi response"}

        logger.info(
            "SerpApi raw shopping_results count for '%s': %d",
            query,
            len(shopping_results),
        )

        normalized_products = []
        for result in shopping_results:
            product = _normalize_result(result)
            if product is not None:
                normalized_products.append(product)
            if len(normalized_products) >= limit:
                break

        missing_thumbnails = sum(1 for product in normalized_products if not product.get("thumbnail"))
        logger.info(
            "SerpApi returned %d normalized shopping results for '%s' (%d without thumbnails)",
            len(normalized_products),
            query,
            missing_thumbnails,
        )
        return {"products": normalized_products, "source": "google-shopping", "error": None}
    except httpx.HTTPStatusError as exc:
        logger.error("SerpApi HTTP error %s: %s", exc.response.status_code, exc.response.text)
    except httpx.RequestError as exc:
        logger.error("SerpApi request error: %s", exc)
    except ValueError as exc:
        logger.error("Failed to parse SerpApi response: %s", exc)

    return {"products": [], "source": "unavailable", "error": "SerpApi request failed"}
