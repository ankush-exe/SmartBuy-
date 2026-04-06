"""
gemini_service.py - Shared Google Gemini client wrapper.
"""
import logging
import os

import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-1.5-flash"
PLACEHOLDER_API_KEYS = {"your_gemini_api_key_here"}


def ask_gemini(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the generated text.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in PLACEHOLDER_API_KEYS:
        raise RuntimeError("GEMINI_API_KEY not configured")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 512,
                "response_mime_type": "application/json",
            },
        )
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise

    text = getattr(response, "text", "") or ""
    text = text.strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    return text
