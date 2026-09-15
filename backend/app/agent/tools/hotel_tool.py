import random
from typing import List, Dict

def search_hotels(city: str, checkin: str, checkout: str) -> List[Dict]:
    """Return mock hotel options."""
    hotel_names = [
        "Grand Plaza", "City Inn", "Seaview Resort", "Mountain Lodge",
        "Bayview Hotel", "Skyline Suites", "Palm Resort", "Comfort Stay"
    ]
    num = random.choice([2, 3])
    hotels = []
    for _ in range(num):
        name = random.choice(hotel_names)
        price_per_night = random.randint(80, 350)
        rating = round(random.uniform(3.0, 5.0), 1)
        hotels.append({
            "name": name,
            "price_per_night": price_per_night,
            "rating": rating
        })
    return hotels