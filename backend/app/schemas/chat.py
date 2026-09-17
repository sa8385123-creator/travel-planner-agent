from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    tool_calls: List[dict] = []
    options: Optional[List[str]] = None  # <-- NEW

class SessionSummary(BaseModel):
    id: str
    created_at: datetime
    preview: str
    pinned: bool

class SessionMessage(BaseModel):
    role: str
    content: str

class SessionUpdateRequest(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None