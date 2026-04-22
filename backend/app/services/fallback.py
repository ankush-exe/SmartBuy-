"""
fallback.py - Loads the curated SmartBuy AI mock product catalog.
"""
import json
import os
import logging
import re
from urllib.parse import quote
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

MOCK_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "mock_data.json"
)

ADULT_WELLNESS_KEYWORDS = {
    "18",
    "18+",
    "adult",
    "condom",
    "condoms",
    "contraceptive",
    "contraception",
    "durex",
    "kamasutra",
    "lubricant",
    "lube",
    "personal",
    "wellness",
}

ADULT_WELLNESS_PRODUCTS = [
    {
        "title": "Durex Extra Safe Condoms Pack",
        "price": 299,
        "currency": "INR",
        "rating": 4.5,
        "source": "Adult Wellness Catalog",
        "url": "https://www.durexindia.com/",
        "delivery": "Discreet delivery available",
        "reviews_count": 1420,
        "in_stock": True,
    },
    {
        "title": "Durex Mutual Climax Condoms Pack",
        "price": 349,
        "currency": "INR",
        "rating": 4.4,
        "source": "Adult Wellness Catalog",
        "url": "https://www.durexindia.com/",
        "delivery": "Discreet delivery available",
        "reviews_count": 1180,
        "in_stock": True,
    },
    {
        "title": "KamaSutra Dotted Condoms Pack",
        "price": 220,
        "currency": "INR",
        "rating": 4.2,
        "source": "Adult Wellness Catalog",
        "url": "https://www.kamasutra.com/",
        "delivery": "Discreet delivery available",
        "reviews_count": 860,
        "in_stock": True,
    },
    {
        "title": "Water Based Personal Lubricant",
        "price": 399,
        "currency": "INR",
        "rating": 4.3,
        "source": "Adult Wellness Catalog",
        "url": "https://example.com/adult-wellness/lubricant",
        "delivery": "Discreet delivery available",
        "reviews_count": 740,
        "in_stock": True,
    },
    {
        "title": "Adult Wellness Protection Kit",
        "price": 599,
        "currency": "INR",
        "rating": 4.1,
        "source": "Adult Wellness Catalog",
        "url": "https://example.com/adult-wellness/protection-kit",
        "delivery": "Discreet delivery available",
        "reviews_count": 510,
        "in_stock": True,
    },
]

def _placeholder_thumbnail(title: str) -> str:
    label = quote(title[:48] or "Product")
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'>"
        "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>"
        "<stop stop-color='#1f2937'/><stop offset='1' stop-color='#111827'/>"
        "</linearGradient></defs>"
        "<rect width='640' height='640' rx='32' fill='url(#g)'/>"
        "<circle cx='320' cy='240' r='88' fill='#374151'/>"
        "<rect x='180' y='360' width='280' height='28' rx='14' fill='#6b7280'/>"
        "<rect x='140' y='410' width='360' height='22' rx='11' fill='#4b5563'/>"
        f"<text x='320' y='520' text-anchor='middle' font-family='Arial' font-size='28' fill='#e5e7eb'>{label}</text>"
        "</svg>"
    )
    return f"data:image/svg+xml;utf8,{svg}"


def _ensure_thumbnail(product: Dict[str, Any]) -> Dict[str, Any]:
    enriched = dict(product)
    if not str(enriched.get("thumbnail", "")).strip():
        enriched["thumbnail"] = _placeholder_thumbnail(str(enriched.get("title", "Product")))
    return enriched


def _query_tokens(query: str) -> set[str]:
    return set(re.findall(r"[a-z0-9+]+", query.lower()))


def _is_adult_wellness_query(query: str) -> bool:
    tokens = _query_tokens(query)
    normalized = query.strip().lower()
    return (
        bool(tokens & ADULT_WELLNESS_KEYWORDS)
        or "18+" in normalized
        or "adult wellness" in normalized
        or "personal lubricant" in normalized
    )


def get_adult_wellness_products(query: str) -> List[Dict[str, Any]]:
    """Return age-restricted adult wellness fallback rows when live search has no data."""
    if not _is_adult_wellness_query(query):
        return []

    logger.info("Using adult wellness fallback catalog for query '%s'.", query)
    return [_ensure_thumbnail(product) for product in ADULT_WELLNESS_PRODUCTS]


def load_mock_data() -> List[Dict[str, Any]]:
    """Load the full product catalog from mock_data.json."""
    try:
        with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        products = data.get("products", [])
        if not isinstance(products, list):
            logger.error("mock_data.json 'products' payload must be a list.")
            return []
            
        for p in products:
            if "currency" not in p:
                p["currency"] = "USD"

        return [_ensure_thumbnail(product) for product in products]
    except FileNotFoundError:
        logger.error("mock_data.json not found at %s", MOCK_DATA_PATH)
        return []
    except json.JSONDecodeError as e:
        logger.error("Failed to parse mock_data.json: %s", e)
        return []


def get_mock_products() -> List[Dict[str, Any]]:
    """Return the full curated mock product catalog."""
    products = load_mock_data()
    logger.info("Loaded %d products from the mock catalog.", len(products))
    return products


def get_fallback_products(query: str) -> List[Dict[str, Any]]:
    """Backward-compatible alias for older imports."""
    adult_products = get_adult_wellness_products(query)
    if adult_products:
        return adult_products

    logger.info("Using mock catalog for query '%s'.", query)
    return get_mock_products()
