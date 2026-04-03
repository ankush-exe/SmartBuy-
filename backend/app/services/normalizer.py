"""
normalizer.py - Normalize raw product dicts into a consistent schema.
Ensures all downstream services receive clean, typed data.
"""
import re
import logging
from urllib.parse import quote
from typing import List, Dict, Any, Optional

from app.services.currency import DEFAULT_CURRENCY, convert_usd_to_inr

logger = logging.getLogger(__name__)


def _placeholder_thumbnail(title: str) -> str:
    label = quote((title or "Product")[:48])
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'>"
        "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>"
        "<stop stop-color='#111827'/><stop offset='1' stop-color='#1f2937'/>"
        "</linearGradient></defs>"
        "<rect width='640' height='640' rx='32' fill='url(#g)'/>"
        "<circle cx='320' cy='230' r='96' fill='#374151'/>"
        "<rect x='170' y='360' width='300' height='30' rx='15' fill='#6b7280'/>"
        "<rect x='140' y='415' width='360' height='22' rx='11' fill='#4b5563'/>"
        f"<text x='320' y='520' text-anchor='middle' font-family='Arial' font-size='28' fill='#e5e7eb'>{label}</text>"
        "</svg>"
    )
    return f"data:image/svg+xml;utf8,{svg}"

def _clean_text(value: Any, default: str = "") -> str:
    """Normalize arbitrary scalar input to a compact string."""
    if value is None:
        return default
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or default


def _extract_float(value: Any) -> Optional[float]:
    """Best-effort numeric extraction for strings like '$699.99' or '4.7/5'."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    match = re.search(r"-?[\d,.]+", str(value))
    if not match:
        return None

    try:
        return float(match.group().replace(",", ""))
    except ValueError:
        return None


def _clamp_rating(rating: Any) -> float:
    """Ensure rating is a float clamped to [0.0, 5.0]."""
    r = _extract_float(rating)
    if r is None:
        return 0.0
    return round(max(0.0, min(5.0, r)), 1)


def _clamp_price(price: Any) -> float:
    """Ensure price is a non-negative float."""
    p = _extract_float(price)
    if p is None:
        return 0.0
    return round(max(0.0, p), 2)


def _safe_int(value: Any, default: int = 0) -> int:
    """Convert arbitrary scalar input to a non-negative integer."""
    parsed = _extract_float(value)
    if parsed is None:
        return default
    return max(0, int(parsed))


def _coerce_bool(value: Any, default: bool = True) -> bool:
    """Convert common string and numeric flags to booleans."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y", "in stock"}:
            return True
        if normalized in {"false", "0", "no", "n", "out of stock"}:
            return False
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    return default


def _normalize_currency(value: Any, default: str = DEFAULT_CURRENCY) -> str:
    """Normalize a raw currency code/symbol to an ISO-like value."""
    text = _clean_text(value, default=default).upper()
    if text in {"₹", "INR"}:
        return "INR"
    if text in {"$", "USD"}:
        return "USD"
    return text or default


def normalize_product(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Normalize a single raw product dict.
    Returns None if essential fields are missing/invalid.
    """
    if not isinstance(raw, dict):
        return None

    title = _clean_text(raw.get("title", ""))[:120]
    if not title:
        return None

    source_currency = _normalize_currency(raw.get("currency", DEFAULT_CURRENCY))
    raw_price = _clamp_price(raw.get("price", 0))
    price_inr = convert_usd_to_inr(raw_price) if source_currency == "USD" else raw_price
    rating = _clamp_rating(raw.get("rating", 0))
    source = _clean_text(raw.get("source", "Unknown"), default="Unknown")

    return {
        "title": title,
        "price": price_inr,
        "currency": DEFAULT_CURRENCY,
        "rating": rating,
        "source": source,
        "url": _clean_text(raw.get("url", "#"), default="#"),
        "delivery": _clean_text(raw.get("delivery", "N/A"), default="N/A"),
        "reviews_count": _safe_int(raw.get("reviews_count", 0)),
        "in_stock": _coerce_bool(raw.get("in_stock", True), default=True),
        "thumbnail": _clean_text(raw.get("thumbnail", ""), default=_placeholder_thumbnail(title)),
        "snippet": _clean_text(raw.get("snippet", ""), default=""),
        # Computed score used by matcher (higher = better)
        "_score": round(rating * 20 - price_inr * 0.0001, 4),
    }


def normalize_products(raw_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize a list of products, filtering out invalid entries."""
    normalized = []
    for raw in raw_list:
        product = normalize_product(raw)
        if product is not None:
            normalized.append(product)
    logger.info("Normalized %d/%d products", len(normalized), len(raw_list))
    return normalized
