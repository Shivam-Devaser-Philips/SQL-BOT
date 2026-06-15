from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from schemas.chat import ChatRequest, ChatResponse
from agents.grok import generate_sql_with_grok, GrokResponse
from services.validation import analyze_sql_query
from services.oracle_service import DatabaseService
from database.config import get_db
from database.models import QueryHistoryModel, AuditLogModel, UserModel
from security.auth import get_current_user
from utils.glossary import GlossaryEngine
import json

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # 1. Lookup business glossary definitions
    glossary_engine = GlossaryEngine()
    glossary_matches = glossary_engine.lookup(request.message)

    # 2. Extract database schema summary as context for Grok
    db_service = DatabaseService()
    metadata = db_service.get_metadata()
    schema_summary = []
    for table, info in metadata.items():
        cols = [f"{col['name']} ({col['type']}{' PK' if col['pk'] else ''})" for col in info['columns']]
        fkeys = [f"FK {fk['from_col']} -> {fk['to_table']}({fk['to_col']})" for fk in info['foreign_keys']]
        schema_summary.append(f"Table {table}:\n  Columns: {', '.join(cols)}\n  Constraints: {', '.join(fkeys)}")
    schema_context = "\n".join(schema_summary)

    # 3. Retrieve recent chat history for session context (last 10 messages)
    history_records = db.query(QueryHistoryModel)\
        .filter(QueryHistoryModel.username == current_user.username)\
        .order_by(QueryHistoryModel.timestamp.desc())\
        .limit(10).all()
        
    history_context = []
    # Reverse to keep chronological order
    for rec in reversed(history_records):
        history_context.append({"role": "user", "content": rec.prompt})
        history_context.append({"role": "assistant", "content": rec.sql})

    try:
        # 4. Invoke Grok Agent to convert natural language to SQL
        grok_response = await generate_sql_with_grok(
            query=request.message, 
            schema_context=schema_context, 
            history=history_context
        )

        # 5. Validate SQL safety
        validation = analyze_sql_query(grok_response.sql)
        
        if validation["action"] == "REJECT":
            # Log rejected attempt
            audit = AuditLogModel(
                username=current_user.username,
                prompt=request.message,
                generated_sql=grok_response.sql,
                execution_status="REJECTED",
                rows_returned=0,
                confidence=grok_response.confidence
            )
            db.add(audit)
            db.commit()
            
            return ChatResponse(
                sql=grok_response.sql,
                reasoning=grok_response.reasoning,
                confidence=grok_response.confidence,
                explanation=f"Query blocked: {validation['reason']}",
                suggested_chart="none",
                query_type=grok_response.query_type,
                error=validation["reason"]
            )
            
        if validation["action"] == "CONFIRM" and not request.confirm_dml:
            return ChatResponse(
                sql=grok_response.sql,
                reasoning=grok_response.reasoning,
                confidence=grok_response.confidence,
                explanation="This operation requires write confirmation before executing.",
                suggested_chart="none",
                query_type=grok_response.query_type,
                requires_confirmation=True
            )

        # 6. Execute SQL query
        query_results = db_service.execute_query(grok_response.sql)
        
        if query_results["status"] == "error":
            audit = AuditLogModel(
                username=current_user.username,
                prompt=request.message,
                generated_sql=grok_response.sql,
                execution_status="FAILED",
                rows_returned=0,
                confidence=grok_response.confidence
            )
            db.add(audit)
            db.commit()
            
            return ChatResponse(
                sql=grok_response.sql,
                reasoning=grok_response.reasoning,
                confidence=grok_response.confidence,
                explanation=f"Database execution failed: {query_results['detail']}",
                suggested_chart="none",
                query_type=grok_response.query_type,
                error=query_results["detail"]
            )

        # 7. Fetch explain plan
        plan = db_service.execute_explain_plan(grok_response.sql)

        # 8. Record audit log
        rows_count = len(query_results.get("rows", []))
        audit = AuditLogModel(
            username=current_user.username,
            prompt=request.message,
            generated_sql=grok_response.sql,
            execution_status="SUCCESS",
            rows_returned=rows_count,
            confidence=grok_response.confidence
        )
        db.add(audit)

        # 9. Record query history
        history = QueryHistoryModel(
            username=current_user.username,
            prompt=request.message,
            sql=grok_response.sql,
            query_type=grok_response.query_type
        )
        db.add(history)
        db.commit()

        # 10. Return Response
        return ChatResponse(
            sql=grok_response.sql,
            reasoning=grok_response.reasoning,
            confidence=grok_response.confidence,
            explanation=grok_response.explanation,
            suggested_chart=grok_response.suggested_chart,
            query_type=grok_response.query_type,
            data=query_results.get("rows", []),
            execution_plan=plan,
            requires_confirmation=False,
            glossary=glossary_matches,
            engine_used=query_results["engine"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat execution exception: {str(e)}"
        )
