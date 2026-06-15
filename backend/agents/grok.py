import os
import json
import httpx
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

try:
    from xai_sdk import Client
    from xai_sdk.chat import user, system
    XAI_AVAILABLE = True
except ImportError:
    XAI_AVAILABLE = False

class GrokResponse(BaseModel):
    sql: str
    reasoning: str
    confidence: float
    explanation: str
    suggested_chart: str = Field(description="Must be one of: line, bar, pie, scatter, none")
    query_type: str = Field(description="Must be one of: SELECT, DML, DDL, PLSQL")

GROK_SYSTEM_PROMPT = """You are a Senior Solution Architect, Principal Full Stack Engineer, Oracle Database Expert, and Banking Domain Expert.
Your task is to convert natural language queries into efficient Oracle SQL.

Rules:
- Never hallucinate tables or columns. Use ONLY the provided schema.
- Return ONLY valid JSON matching the exact schema below. No markdown formatting, no backticks, no extra text.
- Confidence score must be between 0.0 and 1.0. If confidence < 0.70, explain what is ambiguous in the reasoning.
- Prefer Oracle syntax (e.g., FETCH FIRST 10 ROWS ONLY instead of LIMIT).
- Supported suggested charts: line, bar, pie, scatter, none.

JSON Output Schema:
{
  "sql": "SELECT ...",
  "reasoning": "short explanation of how you built the query",
  "confidence": 0.95,
  "explanation": "business explanation of the result",
  "suggested_chart": "bar",
  "query_type": "SELECT"
}"""

# A smart local parser to simulate Grok generation for offline/testing scenarios
def offline_query_generator(query: str) -> GrokResponse:
    q = query.lower()
    
    if "top" in q and "customer" in q:
        return GrokResponse(
            sql="SELECT c.customer_name, ca.balance, ca.account_number FROM customers c JOIN casa_accounts ca ON c.customer_id = ca.customer_id ORDER BY ca.balance DESC FETCH FIRST 10 ROWS ONLY",
            reasoning="Joined customers with casa_accounts and ordered by balance descending to get the top depositors.",
            confidence=0.98,
            explanation="Retrieving the top 10 depositors across current and savings accounts.",
            suggested_chart="bar",
            query_type="SELECT"
        )
    elif "branch" in q and ("exposure" in q or "loan" in q):
        return GrokResponse(
            sql="SELECT b.branch_name, SUM(l.loan_amount) AS total_exposure FROM branches b JOIN loans l ON b.branch_id = l.branch_id GROUP BY b.branch_name ORDER BY total_exposure DESC",
            reasoning="Grouped loans by branch name and summed loan amounts to identify branch-level exposure.",
            confidence=0.96,
            explanation="Aggregating total active outstanding loans per branch location to analyze risk exposure.",
            suggested_chart="bar",
            query_type="SELECT"
        )
    elif "casa" in q and ("trend" in q or "growth" in q):
        return GrokResponse(
            sql="SELECT opened_date, SUM(balance) AS total_balance FROM casa_accounts GROUP BY opened_date ORDER BY opened_date ASC",
            reasoning="Aggregated CASA account balances grouped by opening date to project deposit progression.",
            confidence=0.92,
            explanation="CASA growth trends displaying deposit balances over time based on account creation date.",
            suggested_chart="line",
            query_type="SELECT"
        )
    elif "archive" in q and "inactive" in q:
        return GrokResponse(
            sql="""CREATE OR REPLACE PROCEDURE archive_inactive_accounts AS
BEGIN
  -- Insert inactive accounts into log/history
  -- Note: This is an example administrative PL/SQL procedure
  UPDATE casa_accounts SET status = 'INACTIVE' WHERE balance < 100.0;
  COMMIT;
END;""",
            reasoning="Constructed a PL/SQL procedure to flag low-balance accounts as inactive.",
            confidence=0.95,
            explanation="A stored PL/SQL procedure designed to run as a batch process to manage inactive accounts.",
            suggested_chart="none",
            query_type="PLSQL"
        )
    elif "loan" in q:
        return GrokResponse(
            sql="SELECT l.loan_id, c.customer_name, l.loan_amount, l.interest_rate, l.status FROM loans l JOIN customers c ON l.customer_id = c.customer_id",
            reasoning="Joined loans and customers to list active portfolio values.",
            confidence=0.95,
            explanation="General listing of active loan portfolio items.",
            suggested_chart="pie",
            query_type="SELECT"
        )
    
    # Generic select fallback
    return GrokResponse(
        sql="SELECT * FROM customers FETCH FIRST 10 ROWS ONLY",
        reasoning="Selected top 10 customers from table.",
        confidence=0.75,
        explanation="Standard database lookup for customers list.",
        suggested_chart="none",
        query_type="SELECT"
    )

async def generate_sql_with_grok(query: str, schema_context: str, history: List[Dict[str, str]] = None) -> GrokResponse:
    api_key = os.getenv("XAI_API_KEY", "mock-key")
    
    if api_key == "mock-key" or api_key == "":
        return offline_query_generator(query)

    # Format chat history for follow-up session memory (max last 10 messages)
    history_context = ""
    if history:
        history_context = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history[-10:]])

    # Try official SDK first
    if XAI_AVAILABLE:
        try:
            client = Client(api_key=api_key)
            system_prompt = GROK_SYSTEM_PROMPT + "\n\nSCHEMA CONTEXT:\n" + schema_context
            if history_context:
                system_prompt += "\n\nSESSION CONTEXT:\n" + history_context
                
            messages = [
                system(system_prompt),
                user(query)
            ]
            response = client.chat.create(messages=messages)
            raw_json = response.choices[0].message.content
            # Clean up potential markdown formatting block wrapper
            if raw_json.startswith("```json"):
                raw_json = raw_json[7:-3].strip()
            elif raw_json.startswith("```"):
                raw_json = raw_json[3:-3].strip()
            return GrokResponse.model_validate_json(raw_json)
        except Exception as e:
            print(f"xAI SDK execution failed: {e}. Falling back to Direct HTTP API...")

    # Fallback to direct httpx calls
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            system_prompt = GROK_SYSTEM_PROMPT + "\n\nSCHEMA CONTEXT:\n" + schema_context
            if history_context:
                system_prompt += "\n\nSESSION CONTEXT:\n" + history_context
                
            payload = {
                "model": "grok-beta",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                "response_format": {"type": "json_object"}
            }
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            res = await client.post("https://api.x.ai/v1/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            res_data = res.json()
            raw_content = res_data["choices"][0]["message"]["content"]
            return GrokResponse.model_validate_json(raw_content)
    except Exception as e:
        print(f"Direct Grok API call failed: {e}. Falling back to offline query parser...")
        return offline_query_generator(query)
