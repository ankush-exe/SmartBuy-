"""
currency.py - Currency conversion helpers for SmartBuy AI.
Converts source catalog prices from USD to INR using a configurable demo rate.
"""
import logging
import os

logger = logging.getLogger(__name__)

DEFAULT_USD_TO_INR_RATE = 92.40
DEFAULT_CURRENCY = "INR"
PLACEHOLDER_USD_TO_INR_RATE = {"your_usd_to_inr_rate_here"}


def get_usd_to_inr_rate() -> float:
    """Return the configured USD to INR conversion rate for the demo."""
    raw_rate = os.getenv("USD_TO_INR_RATE", "").strip()
    if not raw_rate or raw_rate in PLACEHOLDER_USD_TO_INR_RATE:
        return DEFAULT_USD_TO_INR_RATE

    try:
        rate = float(raw_rate)
    except ValueError:
        logger.warning(
            "Invalid USD_TO_INR_RATE '%s'; using default %.2f",
            raw_rate,
            DEFAULT_USD_TO_INR_RATE,
        )
        return DEFAULT_USD_TO_INR_RATE

    if rate <= 0:
        logger.warning(
            "Non-positive USD_TO_INR_RATE '%s'; using default %.2f",
            raw_rate,
            DEFAULT_USD_TO_INR_RATE,
        )
        return DEFAULT_USD_TO_INR_RATE

    return round(rate, 4)


def convert_usd_to_inr(amount_usd: float) -> float:
    """Convert a USD amount to INR using the configured demo rate."""
    return round(max(0.0, amount_usd) * get_usd_to_inr_rate(), 2)


def format_inr_amount(amount_inr: float) -> str:
    """Return a simple INR-formatted amount for backend-generated prose."""
    return f"₹{amount_inr:,.2f}"
