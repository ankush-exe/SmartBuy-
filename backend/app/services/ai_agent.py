"""
ai_agent.py - AI Decision Engine using Anthropic Claude API.
Sends top matched products to Claude and returns best pick + reasoning.
Falls back to rule-based decision if API key is missing.
"""
import json
import logging
import os
from typing import List, Dict, Any

import httpx

from app.services.currency import format_inr_amount

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
PLACEHOLDER_API_KEYS = {"your_anthropic_api_key_here"}


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
    Call Anthropic Claude to pick the best product and explain why.
    Returns rule-based result if ANTHROPIC_API_KEY is not set.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        logger.info("ANTHROPIC_API_KEY not configured – using rule-based decision.")
        return _rule_based_decision(products)

    prompt = _build_prompt(products, query)

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}],
    }

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    try:
        timeout = httpx.Timeout(connect=3.0, read=15.0, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
            response.raise_for_status()

        data = response.json()
        raw_text = data["content"][0]["text"].strip()

        # Strip markdown code fences if present
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
            "source": "claude-ai",
        }

    except httpx.HTTPStatusError as e:
        logger.error("Anthropic API HTTP error %s: %s", e.response.status_code, e.response.text)
    except httpx.RequestError as e:
        logger.error("Anthropic API request error: %s", e)
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error("Failed to parse AI response: %s", e)

    logger.info("AI call failed – falling back to rule-based decision.")
    return _rule_based_decision(products)
