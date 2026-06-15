# API Specifications

## 1. Chat Completion
`POST /api/chat/`
Converts natural language into Oracle SQL, executes it securely, and returns structured data.

**Request:**
```json
{
  "message": "Show top 10 customers by balance",
  "session_id": "optional-uuid"
}
```

**Response:**
```json
{
  "sql": "SELECT customer_name, balance FROM customers ORDER BY balance DESC FETCH FIRST 10 ROWS ONLY",
  "reasoning": "Sorted customers by balance descending to find the top 10.",
  "confidence": 0.95,
  "explanation": "These are the 10 customers with the highest account balances.",
  "suggested_chart": "bar",
  "query_type": "SELECT",
  "data": [
    {"customer_name": "Acme Corp", "balance": 500000}
  ]
}
```

## 2. Schema Upload
`POST /api/schema/upload`
Uploads a DDL or SQL file to update the database schema context.

**Request:** `multipart/form-data` with a file field `file`.

**Response:**
```json
{
  "tables": ["Customers", "Branches", "Loans"],
  "columns_count": 15,
  "raw_ddl": "CREATE TABLE..."
}
```
