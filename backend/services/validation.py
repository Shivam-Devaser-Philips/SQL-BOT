import re

# SQL keywords classification
REJECTED_KEYWORDS = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE", "CREATE"]
CONFIRMATION_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "MERGE"]

def analyze_sql_query(query: str) -> dict:
    """
    Analyzes the SQL query and returns whether it can be run immediately, 
    requires a confirmation token, or is strictly rejected.
    """
    upper_query = query.upper()
    
    # Remove strings and comments to avoid matching keywords inside text literals
    clean_query = re.sub(r"'(.*?)'", "", upper_query)
    clean_query = re.sub(r"--.*?\n", "", clean_query)
    clean_query = re.sub(r"/\*.*?\*/", "", clean_query, flags=re.DOTALL)

    # Check for DDL/administrative commands (Strict Reject)
    for keyword in REJECTED_KEYWORDS:
        if re.search(r"\b" + keyword + r"\b", clean_query):
            return {
                "safe": False,
                "action": "REJECT",
                "reason": f"Query contains forbidden DDL/Administrative keyword: '{keyword}'."
            }

    # Check for DML write commands (Require Confirmation)
    for keyword in CONFIRMATION_KEYWORDS:
        if re.search(r"\b" + keyword + r"\b", clean_query):
            return {
                "safe": False,
                "action": "CONFIRM",
                "reason": f"Query contains write operation: '{keyword}'. Requires user approval before execution."
            }

    # Ensure it is a read-only query
    if not clean_query.strip().startswith("SELECT") and not clean_query.strip().startswith("WITH"):
        # Could be an explain plan or something, let's allow EXPLAIN
        if clean_query.strip().startswith("EXPLAIN"):
            return {
                "safe": True,
                "action": "EXECUTE",
                "reason": "Explain plan query."
            }
        return {
            "safe": False,
            "action": "REJECT",
            "reason": "Queries must be standard read-only SELECT or WITH operations."
        }

    return {
        "safe": True,
        "action": "EXECUTE",
        "reason": "Safe SELECT query."
    }
