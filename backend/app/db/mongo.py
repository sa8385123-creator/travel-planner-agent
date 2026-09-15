import os
import certifi
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env from the backend directory relative to this file
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=dotenv_path)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set")

client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
database = client["travel_planner"]

# Collections
user_profiles = database["user_profiles"]
past_trips = database["past_trips"]
