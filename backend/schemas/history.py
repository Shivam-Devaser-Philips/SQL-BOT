from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class HistoryItemResponse(BaseModel):
    id: int
    username: Optional[str]
    prompt: str
    sql: str
    query_type: str
    timestamp: datetime

    class Config:
        from_attributes = True
