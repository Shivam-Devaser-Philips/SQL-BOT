from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.chat import ChatRequest, ChatResponse
from agents.grok import generate_sql_with_grok
from services.validation import validate_sql
from database.config import get_db
# In a real app, you would import an execution service for Oracle DB here
# from database.execute import execute_sql

router = APIRouter()

# Mock schema context for now
MOCK_SCHEMA_CONTEXT = """
Table: Customers (customer_id PK, customer_name, balance, branch_id)
Table: Branches (branch_id PK, branch_name, location)
Table: Loans (loan_id PK, customer_id FK, amount, status)
"""

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Ask Grok agent to generate SQL
        grok_response = await generate_sql_with_grok(request.message, MOCK_SCHEMA_CONTEXT)
        
        # 2. Validate SQL for safety (detect DELETE, UPDATE, etc.)
        validate_sql(grok_response.sql)
        
        # 3. Execute SQL (mocked for now, assuming SQLite or no DB until fully configured)
        # result_data = execute_sql(grok_response.sql, db)
        mock_data = [
            {"customer_name": "Acme Corp", "balance": 500000},
            {"customer_name": "Globex", "balance": 450000}
        ]
        
        # 4. Return the combined response
        return ChatResponse(
            sql=grok_response.sql,
            reasoning=grok_response.reasoning,
            confidence=grok_response.confidence,
            explanation=grok_response.explanation,
            suggested_chart=grok_response.suggested_chart,
            query_type=grok_response.query_type,
            data=mock_data
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
