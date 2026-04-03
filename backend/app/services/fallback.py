"""
fallback.py - Loads the curated SmartBuy AI mock product catalog.
"""
import json
import os
import logging
from urllib.parse import quote
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

MOCK_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "mock_data.json"
)

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
    logger.info("Using mock catalog for query '%s'.", query)
    return get_mock_products()
