import random
from typing import List, Dict

def search_flights(origin: str, destination: str, date: str) -> List[Dict]:
    """Return mock flight options."""
    airlines = ["Delta", "American Airlines", "United", "Southwest", "JetBlue"]
    # generate 2-3 flights
    num = random.choice([2, 3])
    flights = []
    for _ in range(num):
        airline = random.choice(airlines)
        price = random.randint(150, 800)
        # random times
        dep_hour = random.randint(5, 22)
        dep_min = random.choice([0, 15, 30, 45])
        arr_hour = (dep_hour + random.randint(1, 6)) % 24
        arr_min = random.choice([0, 15, 30, 45])
        departure_time = f"{dep_hour:02d}:{dep_min:02d}"
        arrival_time = f"{arr_hour:02d}:{arr_min:02d}"
        flights.append({
            "airline": airline,
            "price": price,
            "departure_time": departure_time,
            "arrival_time": arrival_time
        })
    return flights