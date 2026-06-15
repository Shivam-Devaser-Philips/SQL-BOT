from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter()

class SchemaInfo(BaseModel):
    tables: List[str]
    columns_count: int
    raw_ddl: str

# In memory schema storage for the sake of local testing without DB
MOCK_SCHEMA_STORE = {}

@router.post("/upload", response_model=SchemaInfo)
async def upload_schema(file: UploadFile = File(...)):
    if not file.filename.endswith('.sql') and not file.filename.endswith('.ddl'):
        raise HTTPException(status_code=400, detail="Only .sql or .ddl files are supported.")
        
    content = await file.read()
    ddl_string = content.decode("utf-8")
    
    # Very basic parsing to count CREATE TABLE statements
    tables_found = [line.split(" ")[2] for line in ddl_string.split('\n') if line.upper().startswith("CREATE TABLE")]
    
    MOCK_SCHEMA_STORE['latest'] = ddl_string
    
    return SchemaInfo(
        tables=tables_found,
        columns_count=len(tables_found) * 5, # Mock count
        raw_ddl=ddl_string
    )

@router.get("/", response_model=Dict[str, Any])
async def get_schema():
    if 'latest' not in MOCK_SCHEMA_STORE:
        return {"status": "No schema uploaded yet."}
    
    return {
        "status": "success",
        "ddl": MOCK_SCHEMA_STORE['latest']
    }
