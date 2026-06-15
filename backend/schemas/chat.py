from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    confirm_dml: Optional[bool] = False
    
class ChatResponse(BaseModel):
    sql: str
    reasoning: str
    confidence: float
    explanation: str
    suggested_chart: str
    query_type: str
    data: Optional[List[dict]] = None
    execution_plan: Optional[List[str]] = None
    requires_confirmation: Optional[bool] = False
    glossary: Optional[List[dict]] = None
    engine_used: Optional[str] = None
    error: Optional[str] = None
