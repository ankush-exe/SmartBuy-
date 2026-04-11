METRO_CITIES = {
    "mumbai", "delhi", "bengaluru", "bangalore", "hyderabad",
    "chennai", "kolkata", "pune", "ahmedabad", "surat",
}

TIER2_CITIES = {
    "jaipur", "lucknow", "kanpur", "nagpur", "indore", "thane",
    "bhopal", "visakhapatnam", "patna", "vadodara", "ghaziabad",
    "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot",
    "coimbatore", "madurai", "kochi", "chandigarh", "amritsar",
}

FAST_SELLERS = {"amazon", "flipkart", "myntra", "ajio", "tata cliq"}


def get_city_tier(city: str) -> str:
    normalized_city = city.strip().lower()
    if normalized_city in METRO_CITIES:
        return "metro"
    if normalized_city in TIER2_CITIES:
        return "tier2"
    return "tier3"


def estimate_delivery(city: str, source: str, price: float) -> dict:
    tier = get_city_tier(city)
    seller = source.strip().lower() if source else ""
    is_fast_seller = any(name in seller for name in FAST_SELLERS)

    if tier == "metro":
        days = "1-2 days" if is_fast_seller else "3-4 days"
    elif tier == "tier2":
        days = "2-3 days" if is_fast_seller else "4-5 days"
    else:
        days = "4-5 days" if is_fast_seller else "5-7 days"

    free_delivery = False
    if is_fast_seller and price and price >= 499:
        free_delivery = True
    elif "amazon" in seller:
        free_delivery = True

    return {
        "estimated_days": days,
        "free_delivery": free_delivery,
        "city": city.strip().title(),
        "tier": tier,
    }
