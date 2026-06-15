from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    
class ChatResponse(BaseModel):
    sql: str
    reasoning: str
    confidence: float
    explanation: str
    suggested_chart: str
    query_type: str
    data: Optional[List[dict]] = None
    error: Optional[str] = None
