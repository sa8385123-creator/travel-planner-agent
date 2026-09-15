# Tools the agent calls to read/write long-term memory in MongoDB:
# get_user_profile, save_preference, save_past_trip.
# Day 5.

from app.db.mongo import user_profiles  # Assuming this is the Motor collection

async def save_preference(user_id: str, key: str, value: str):
    """Upsert a preference for a user.
    
    Stores the preference inside a 'preferences' dict field in the user_profiles collection.
    """
    await user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {f"preferences.{key}": value}},
        upsert=True,
    )

async def get_user_preferences(user_id: str):
    """Retrieve preferences dict for a user.
    
    Returns the preferences dict if found, otherwise an empty dict.
    """
    doc = await user_profiles.find_one({"user_id": user_id})
    if doc and "preferences" in doc:
        return doc["preferences"]
    return {}