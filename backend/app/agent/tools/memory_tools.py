from app.db.mongo import user_profiles


async def save_preference(user_id: str, key: str, value: str):
    """Save or update a user's preference in MongoDB."""

    await user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {f"preferences.{key}": value}},
        upsert=True,
    )

    return {
        "success": True,
        "message": f"Preference '{key}' saved successfully.",
        "user_id": user_id,
        "key": key,
        "value": value,
    }


async def get_user_preferences(user_id: str):
    """Retrieve a user's saved preferences."""

    doc = await user_profiles.find_one(
        {"user_id": user_id}
    )

    if doc and "preferences" in doc:
        return doc["preferences"]

    return {}