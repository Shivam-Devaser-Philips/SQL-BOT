from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.config import get_db
from database.models import QueryHistoryModel, UserModel
from schemas.history import HistoryItemResponse
from security.auth import get_current_user
from services.oracle_service import DatabaseService
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[HistoryItemResponse])
def get_history(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(QueryHistoryModel)
    
    # Filter by user if not Admin, admins can see all history
    if current_user.role != "Admin":
        query = query.filter(QueryHistoryModel.username == current_user.username)
        
    if search:
        query = query.filter(
            (QueryHistoryModel.prompt.ilike(f"%{search}%")) |
            (QueryHistoryModel.sql.ilike(f"%{search}%"))
        )
        
    return query.order_by(QueryHistoryModel.timestamp.desc()).limit(1000).all()

@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    item = db.query(QueryHistoryModel).filter(QueryHistoryModel.id == history_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found.")
        
    # Check permission
    if current_user.role != "Admin" and item.username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to delete this history item.")
        
    db.delete(item)
    db.commit()
    return

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(QueryHistoryModel)
    if current_user.role != "Admin":
        query = query.filter(QueryHistoryModel.username == current_user.username)
        
    query.delete(synchronize_session=False)
    db.commit()
    return

@router.post("/re-run/{history_id}")
def rerun_history_query(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    item = db.query(QueryHistoryModel).filter(QueryHistoryModel.id == history_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found.")
        
    if current_user.role != "Admin" and item.username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to re-run this query.")
        
    db_service = DatabaseService()
    result = db_service.execute_query(item.sql)
    return result
