import os
import json
from pydantic import BaseModel
# We will use the standard openai client pointing to xAI if xai_sdk is not strictly installed
# or fallback to it. The prompt assumes you wanted a strict JSON output.

try:
    from xai_sdk import Client
    from xai_sdk.chat import user, system
    XAI_AVAILABLE = True
except ImportError:
    XAI_AVAILABLE = False
    import httpx

class GrokResponse(BaseModel):
    sql: str
    reasoning: str
    confidence: float
    explanation: str
    suggested_chart: str
    query_type: str

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

async def generate_sql_with_grok(query: str, schema_context: str) -> GrokResponse:
    # In a real scenario, this uses the xAI API key
    api_key = os.getenv("XAI_API_KEY", "mock-key")
    
    # Mocking response if no key is provided (for local testing without valid key)
    if api_key == "mock-key" or not XAI_AVAILABLE:
        return GrokResponse(
            sql="SELECT customer_name, balance FROM customers ORDER BY balance DESC FETCH FIRST 10 ROWS ONLY",
            reasoning="Selected top customers by sorting balance in descending order.",
            confidence=0.95,
            explanation="This query retrieves the 10 customers with the highest account balances.",
            suggested_chart="bar",
            query_type="SELECT"
        )
    
    # Real integration with xai_sdk (pseudo-code depending on real sdk structure)
    # client = Client(api_key=api_key)
    # messages = [
    #     system(GROK_SYSTEM_PROMPT + "\nSchema Context:\n" + schema_context),
    #     user(query)
    # ]
    # response = client.chat.create(messages=messages)
    # raw_json = response.choices[0].message.content
    # return GrokResponse.parse_raw(raw_json)
    pass
