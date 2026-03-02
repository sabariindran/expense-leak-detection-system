# categorize.py

import re
from typing import Dict, List


CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "food": [
        "zomato", "swiggy", "pizza", "biryani", "mess", "cafe",
        "restaurant", "kitchen", "food", "juice", "tea", "bakery",
        "grill", "broilers", "milk", "hotel", "annapoorani",
        "rose milk", "frozen bottle", "chai", "bhavan", "treat",
        "paradise", "court", "hot breads"
    ],
    "shopping": [
        "amazon", "flipkart", "myntra", "meesho", "zepto",
        "marketplace", "super market", "supermarket",
        "departmental", "store", "stores", "mart",
        "retail", "collection", "traders", "agency",
        "enterprises", "provisional", "groceries",
        "pay groceries", "dress", "fashion", "spices"
    ],
    "travel": [
        "uber", "ola", "rapido", "irctc", "tourism",
        "transport", "metro", "petrol", "fuels",
        "fuel", "diesel", "petroleum", "pump",
        "motors", "automobiles", "auto", "tyre"
    ],
    "subscription": [
        "airtel", "www airtel", "payments bank",
        "netflix", "spotify", "prime", "youtube",
        "hotstar", "renewal", "subscription",
        "membership", "autopay"
    ],
    "education": [
        "school", "college", "university",
        "academy", "computer center",
        "students", "tuition", "training",
        "institute"
    ],
    "entertainment": [
        "pvr", "inox", "cinema", "theatre",
        "entertainment", "movie", "district"
    ],
    "health": [
        "medical", "pharmacy", "clinic",
        "hospital", "medicals", "apollo",
        "health", "diagnostic"
    ],
    "bills": [
        "electric", "electricity", "water",
        "gas", "wifi", "broadband",
        "recharge", "bill", "insurance",
        "rent", "emi", "loan", "communication"
    ],
}


NOISE_WORDS = [
    "private limited", "pvt ltd", "ltd", "limited",
    "india", "online", "order", "payment",
    "payments", "bank", "upi", "ref", "txn",
    "xxxx", "xxxxxxxxxx"
]


def _clean_name(name: str) -> str:
    if not isinstance(name, str):
        return ""

    name = name.lower()
    name = re.sub(r"[^a-z0-9\s]", " ", name)

    for noise in NOISE_WORDS:
        name = name.replace(noise, " ")

    name = re.sub(r"\s+", " ", name).strip()
    return name


def categorize_merchant(name: str) -> str:
    cleaned = _clean_name(name)

    if not cleaned:
        return "others"

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in cleaned:
                return category

    return "others"
