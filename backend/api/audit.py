from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.config import get_db
from database.models import AuditLogModel, UserModel
from schemas.audit import AuditSummary, AuditLogResponse
from security.auth import get_admin_user
from typing import List

router = APIRouter()

@router.get("/", response_model=AuditSummary)
def get_audit_logs(
    db: Session = Depends(get_db), 
    admin_user: UserModel = Depends(get_admin_user)
):
    total = db.query(AuditLogModel).count()
    success = db.query(AuditLogModel).filter(AuditLogModel.execution_status == "SUCCESS").count()
    rejected = db.query(AuditLogModel).filter(AuditLogModel.execution_status == "REJECTED").count()
    failed = db.query(AuditLogModel).filter(AuditLogModel.execution_status == "FAILED").count()
    
    avg_conf_query = db.query(func.avg(AuditLogModel.confidence)).scalar()
    avg_conf = float(avg_conf_query) if avg_conf_query is not None else 0.0
    
    logs = db.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).limit(100).all()
    
    return AuditSummary(
        total_queries=total,
        success_count=success,
        rejected_count=rejected,
        failed_count=failed,
        avg_confidence=round(avg_conf, 2),
        recent_logs=logs
    )
