from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AuditLogResponse(BaseModel):
    id: int
    username: Optional[str]
    timestamp: datetime
    prompt: str
    generated_sql: Optional[str]
    execution_status: str
    rows_returned: int
    confidence: float

    class Config:
        from_attributes = True

class AuditSummary(BaseModel):
    total_queries: int
    success_count: int
    rejected_count: int
    failed_count: int
    avg_confidence: float
    recent_logs: List[AuditLogResponse]
