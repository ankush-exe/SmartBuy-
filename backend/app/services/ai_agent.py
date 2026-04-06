"""
ai_agent.py - AI Decision Engine using Google Gemini API.
Sends top matched products to Gemini and returns best pick + reasoning.
Falls back to rule-based decision if API key is missing.
"""
import json
import logging
import os
from typing import List, Dict, Any

from app.services.currency import format_inr_amount
from app.services.gemini_service import ask_gemini

logger = logging.getLogger(__name__)

PLACEHOLDER_API_KEYS = {"your_gemini_api_key_here"}


# ---------------------------------------------------------------------------
# Rule-based fallback (no API key needed)
# ---------------------------------------------------------------------------

def _rule_based_decision(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Simple rule-based best-product selection when AI is unavailable.
    Scores each product: 60% rating + 40% inverse-price.
    """
    if not products:
        return {"best_product": None, "reasoning": "No products to compare.", "source": "rule-based"}

    max_price = max(p.get("price", 1) for p in products) or 1

    def score(p):
        rating_norm = p.get("rating", 0) / 5.0
        price_norm = 1 - (p.get("price", 0) / max_price)
        return 0.6 * rating_norm + 0.4 * price_norm

    best = max(products, key=score)

    reasoning_parts = [
        f"Selected **{best['title']}** from {best['source']}.",
        f"It has a strong rating of {best['rating']}/5 with a price of {format_inr_amount(best['price'])}.",
    ]
    if best.get("delivery"):
        reasoning_parts.append(f"Delivery estimate: {best['delivery']}.")

    alternatives = [p for p in products if p["title"] != best["title"]]
    if alternatives:
        alt_titles = ", ".join(a["title"][:40] for a in alternatives[:2])
        reasoning_parts.append(f"Alternatives considered: {alt_titles}.")

    return {
        "best_product": best,
        "reasoning": " ".join(reasoning_parts),
        "source": "rule-based",
    }


# ---------------------------------------------------------------------------
# AI-powered decision
# ---------------------------------------------------------------------------

def _build_prompt(products: List[Dict[str, Any]], query: str) -> str:
    products_json = json.dumps(products, indent=2)
    return f"""You are a smart product recommendation assistant.

User searched for: "{query}"

Here are the top candidate products found across multiple stores:

{products_json}

Your task:
1. Compare these products based on price, rating, delivery time, and overall value.
2. All prices are already converted to INR. Treat the `price` field as Indian rupees and use the rupee symbol (₹) in your explanation.
3. Select the BEST option for the user.
4. Provide a concise explanation (2-4 sentences) of why it's the best choice.
5. Mention what trade-offs the alternatives offer.

Respond ONLY with valid JSON in this exact format:
{{
  "best_product_title": "exact title string from the list",
  "reasoning": "Your explanation here"
}}"""


async def run_ai_decision(
    products: List[Dict[str, Any]],
    query: str,
) -> Dict[str, Any]:
    """
    Call Google Gemini to pick the best product and explain why.
    Returns rule-based result if GEMINI_API_KEY is not set.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        logger.info("GEMINI_API_KEY not configured - using rule-based decision.")
        return _rule_based_decision(products)

    prompt = _build_prompt(products, query)

    try:
        raw_text = ask_gemini(prompt)

        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        ai_result = json.loads(raw_text)
        best_title = ai_result.get("best_product_title", "")
        reasoning = ai_result.get("reasoning", "No reasoning provided.")

        # Find matching product object
        best_product = next(
            (p for p in products if p["title"].lower() == best_title.lower()),
            products[0],  # fallback to first if title doesn't match exactly
        )

        return {
            "best_product": best_product,
            "reasoning": reasoning,
            "source": "gemini-ai",
        }

    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("Failed to parse Gemini response: %s", exc)
    except Exception as exc:
        logger.error("Gemini AI request failed: %s", exc)

    logger.info("AI call failed - falling back to rule-based decision.")
    return _rule_based_decision(products)
