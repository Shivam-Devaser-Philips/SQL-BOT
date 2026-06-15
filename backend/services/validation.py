import re
from fastapi import HTTPException

# SQL keywords that are potentially dangerous
FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", 
    "ALTER", "GRANT", "REVOKE", "MERGE"
]

def validate_sql(query: str) -> bool:
    """
    Validates the SQL query to ensure it only contains SELECT statements.
    Rejects any query containing DML or DDL keywords.
    """
    upper_query = query.upper()
    
    for keyword in FORBIDDEN_KEYWORDS:
        # Check for whole word match to avoid matching parts of column names
        if re.search(rf'\b{keyword}\b', upper_query):
            raise HTTPException(
                status_code=403, 
                detail=f"Query rejected: Found forbidden keyword '{keyword}'. Only SELECT queries are allowed."
            )
            
    if not upper_query.strip().startswith("SELECT") and not upper_query.strip().startswith("WITH"):
        raise HTTPException(
            status_code=403,
            detail="Query rejected: Query must start with SELECT or WITH."
        )
        
    return True
