from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from database.config import get_db
from database.models import SchemaMetadataModel, UserModel
from security.auth import get_current_user
from services.oracle_service import DatabaseService
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import sqlite3
import os

router = APIRouter()

class ConnectionSettings(BaseModel):
    db_type: str
    oracle_host: Optional[str] = ""
    oracle_port: Optional[str] = ""
    oracle_service_name: Optional[str] = ""
    oracle_username: Optional[str] = ""
    oracle_password: Optional[str] = ""

@router.get("/active")
def get_active_schema(current_user: UserModel = Depends(get_current_user)):
    """
    Returns the actual, live schema parsed from the active database.
    This dynamically queries Oracle (USER_TABLES etc) or the seeded SQLite DB.
    """
    db_service = DatabaseService()
    metadata = db_service.get_metadata()
    return {
        "status": "success",
        "engine": db_service.get_connection_config().get("db_type", "sqlite"),
        "schema": metadata
    }

@router.post("/upload")
async def upload_schema(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Accepts DDL (.sql/.ddl) or JSON schema uploads.
    Executes DDL on the active database to create tables dynamically, 
    making them visible in the schema explorer and AI context.
    """
    filename = file.filename.lower()
    content_bytes = await file.read()
    raw_content = content_bytes.decode("utf-8")
    
    file_type = "DDL"
    if filename.endswith(".json"):
        file_type = "JSON"
    elif not filename.endswith(".sql") and not filename.endswith(".ddl"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload .sql, .ddl or .json files."
        )

    # 1. Store upload in database metadata history
    schema_record = SchemaMetadataModel(
        name=file.filename,
        file_type=file_type,
        raw_content=raw_content
    )
    
    # 2. Try executing DDL to update active DB structure
    execution_message = ""
    if file_type == "DDL":
        db_service = DatabaseService()
        conn, engine_type = db_service.get_connection()
        try:
            cursor = conn.cursor()
            # SQLite does not support multiple commands via execute, we use executescript
            if engine_type == "sqlite":
                cursor.executescript(raw_content)
            else:
                # Oracle supports executescript via custom execution or multi-block
                # Here we run each statement split by semicolon
                statements = [s.strip() for s in raw_content.split(";") if s.strip()]
                for stmt in statements:
                    cursor.execute(stmt)
            conn.commit()
            execution_message = " DDL executed successfully on active database."
        except Exception as e:
            conn.rollback()
            execution_message = f" Note: schema saved, but DDL execution failed: {str(e)}"
        finally:
            conn.close()
            
    # Auto-generate summary
    summary = f"Uploaded {file_type} schema {file.filename} containing DDL/JSON specifications.{execution_message}"
    schema_record.summary = summary
    
    db.add(schema_record)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Schema {file.filename} uploaded.{execution_message}",
        "summary": summary
    }

@router.get("/uploads", response_model=List[Dict[str, Any]])
def get_uploaded_schemas(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    records = db.query(SchemaMetadataModel).order_by(SchemaMetadataModel.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "file_type": r.file_type,
            "summary": r.summary,
            "created_at": r.created_at
        } for r in records
    ]

@router.delete("/uploads/{schema_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schema(
    schema_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    record = db.query(SchemaMetadataModel).filter(SchemaMetadataModel.id == schema_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Schema metadata record not found.")
    db.delete(record)
    db.commit()
    return
