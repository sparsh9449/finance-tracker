MERCHANT_RULES: list[tuple[str, str]] = [
    # Streaming
    ("netflix", "ENTERTAINMENT"),
    ("spotify", "ENTERTAINMENT"),
    ("hulu", "ENTERTAINMENT"),
    ("disney", "ENTERTAINMENT"),
    ("youtube premium", "ENTERTAINMENT"),
    ("apple tv", "ENTERTAINMENT"),
    ("hbo", "ENTERTAINMENT"),
    ("paramount", "ENTERTAINMENT"),
    ("peacock", "ENTERTAINMENT"),
    # Music / podcasts
    ("apple music", "ENTERTAINMENT"),
    ("tidal", "ENTERTAINMENT"),
    # Food delivery
    ("doordash", "FOOD_AND_DRINK"),
    ("ubereats", "FOOD_AND_DRINK"),
    ("uber eats", "FOOD_AND_DRINK"),
    ("grubhub", "FOOD_AND_DRINK"),
    ("instacart", "FOOD_AND_DRINK"),
    ("postmates", "FOOD_AND_DRINK"),
    # Rideshare
    ("uber", "TRANSPORTATION"),
    ("lyft", "TRANSPORTATION"),
    # Cloud / software
    ("github", "GENERAL_SERVICES"),
    ("aws", "GENERAL_SERVICES"),
    ("google cloud", "GENERAL_SERVICES"),
    ("digitalocean", "GENERAL_SERVICES"),
    ("openai", "GENERAL_SERVICES"),
    ("notion", "GENERAL_SERVICES"),
    ("figma", "GENERAL_SERVICES"),
    ("adobe", "GENERAL_SERVICES"),
    ("dropbox", "GENERAL_SERVICES"),
    ("zoom", "GENERAL_SERVICES"),
    ("slack", "GENERAL_SERVICES"),
    ("microsoft 365", "GENERAL_SERVICES"),
    ("office 365", "GENERAL_SERVICES"),
    ("google one", "GENERAL_SERVICES"),
    ("icloud", "GENERAL_SERVICES"),
    # Fitness
    ("peloton", "PERSONAL_CARE"),
    ("planet fitness", "PERSONAL_CARE"),
    ("equinox", "PERSONAL_CARE"),
    ("anytime fitness", "PERSONAL_CARE"),
    # Shopping
    ("amazon", "GENERAL_MERCHANDISE"),
    ("walmart", "GENERAL_MERCHANDISE"),
    ("target", "GENERAL_MERCHANDISE"),
    ("costco", "GENERAL_MERCHANDISE"),
    # Utilities / bills
    ("at&t", "RENT_AND_UTILITIES"),
    ("verizon", "RENT_AND_UTILITIES"),
    ("t-mobile", "RENT_AND_UTILITIES"),
    ("comcast", "RENT_AND_UTILITIES"),
    ("xfinity", "RENT_AND_UTILITIES"),
    ("spectrum", "RENT_AND_UTILITIES"),
    # Insurance
    ("geico", "GENERAL_SERVICES"),
    ("progressive", "GENERAL_SERVICES"),
    ("state farm", "GENERAL_SERVICES"),
]


def categorize(name: str | None, merchant: str | None, plaid_category: str | None) -> str:
    search = (merchant or name or "").lower()
    for keyword, category in MERCHANT_RULES:
        if keyword in search:
            return category
    return plaid_category or "UNCATEGORIZED"
