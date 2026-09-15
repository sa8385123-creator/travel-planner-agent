from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any

class UserProfile(BaseModel):
    user_id: str
    preferences: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PastTrip(BaseModel):
    user_id: str
    destination: str
    start_date: str  # stored as ISO string or similar; keep as str for simplicity
    end_date: str
    summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
