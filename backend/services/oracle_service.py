import os
import json
import sqlite3
from sqlalchemy import create_engine, text

# Try importing oracledb
try:
    import oracledb
    ORACLEDB_AVAILABLE = True
except ImportError:
    ORACLEDB_AVAILABLE = False

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "databases", "settings.json")

def get_connection_config():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Default fallback
    return {
        "db_type": "sqlite",
        "oracle_host": os.getenv("ORACLE_HOST", "localhost"),
        "oracle_port": os.getenv("ORACLE_PORT", "1521"),
        "oracle_service_name": os.getenv("ORACLE_SERVICE_NAME", "FREE"),
        "oracle_username": os.getenv("ORACLE_USER", "system"),
        "oracle_password": os.getenv("ORACLE_PASSWORD", "SysPassword1"),
        "sqlite_path": os.path.join(os.path.dirname(__file__), "..", "sql_app.db")
    }

def save_connection_config(config: dict):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(config, f, indent=2)

class DatabaseService:
    def __init__(self):
        self.config = get_connection_config()

    def get_connection(self):
        config = get_connection_config()
        db_type = config.get("db_type", "sqlite")
        
        if db_type == "oracle" and ORACLEDB_AVAILABLE:
            try:
                # Initialize thick or thin client
                # Standard oracledb in thin mode:
                dsn = f"{config['oracle_host']}:{config['oracle_port']}/{config['oracle_service_name']}"
                conn = oracledb.connect(
                    user=config['oracle_username'],
                    password=config['oracle_password'],
                    dsn=dsn
                )
                return conn, "oracle"
            except Exception as e:
                print(f"Failed to connect to Oracle DB, falling back to SQLite. Error: {e}")
                
        # SQLite Fallback
        sqlite_path = config.get("sqlite_path", "./sql_app.db")
        conn = sqlite3.connect(sqlite_path)
        # Enable dictionary access
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"

    def execute_query(self, query: str) -> dict:
        """
        Executes a read-only query and returns structured column-row data.
        """
        conn, engine_type = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query)
            
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                raw_rows = cursor.fetchall()
                
                rows = []
                for row in raw_rows:
                    if engine_type == "sqlite":
                        rows.append(dict(row))
                    else:  # Oracle
                        # Oracle fetchall returns tuples
                        rows.append(dict(zip(columns, row)))
                        
                return {
                    "status": "success",
                    "engine": engine_type,
                    "columns": columns,
                    "rows": rows
                }
            else:
                conn.commit()
                return {
                    "status": "success",
                    "engine": engine_type,
                    "columns": ["message"],
                    "rows": [{"message": "Statement completed successfully."}]
                }
        except Exception as e:
            return {
                "status": "error",
                "engine": engine_type,
                "detail": str(e)
            }
        finally:
            conn.close()

    def execute_explain_plan(self, query: str) -> list:
        """
        Returns execution plan rows for Oracle or SQLite.
        """
        conn, engine_type = self.get_connection()
        try:
            cursor = conn.cursor()
            if engine_type == "oracle":
                cursor.execute(f"EXPLAIN PLAN FOR {query}")
                cursor.execute("SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY())")
                rows = cursor.fetchall()
                return [r[0] for r in rows]
            else:
                # SQLite explain query plan
                cursor.execute(f"EXPLAIN QUERY PLAN {query}")
                rows = cursor.fetchall()
                # SQLite returns (selectid, order, from, detail)
                plan = []
                for row in rows:
                    plan.append(f"Order: {row[1]} | From: {row[2]} | Detail: {row[3]}")
                return plan
        except Exception as e:
            return [f"Failed to fetch execution plan: {str(e)}"]
        finally:
            conn.close()

    def get_metadata(self) -> dict:
        """
        Scrapes databases metadata for schema views and details.
        """
        conn, engine_type = self.get_connection()
        schema = {}
        try:
            cursor = conn.cursor()
            if engine_type == "sqlite":
                # Scrape SQLite tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                tables = [r[0] for r in cursor.fetchall()]
                
                for table in tables:
                    cursor.execute(f"PRAGMA table_info({table});")
                    cols = cursor.fetchall()
                    
                    # Also scrape foreign keys
                    cursor.execute(f"PRAGMA foreign_key_list({table});")
                    fkeys = cursor.fetchall()
                    
                    schema[table] = {
                        "columns": [{"name": c[1], "type": c[2], "pk": c[5] == 1} for c in cols],
                        "foreign_keys": [{"to_table": fk[2], "from_col": fk[3], "to_col": fk[4]} for fk in fkeys if fk[3] is not None]
                    }
            else:
                # Oracle metadata queries
                # Fetch tables
                cursor.execute("SELECT table_name FROM user_tables")
                tables = [r[0] for r in cursor.fetchall()]
                
                for table in tables:
                    cursor.execute(f"""
                        SELECT column_name, data_type 
                        FROM user_tab_columns 
                        WHERE table_name = '{table}'
                    """)
                    cols = cursor.fetchall()
                    
                    # Get primary keys
                    cursor.execute(f"""
                        SELECT cols.column_name 
                        FROM user_constraints cons 
                        JOIN user_cons_columns cols ON cons.constraint_name = cols.constraint_name 
                        WHERE cons.constraint_type = 'P' AND cons.table_name = '{table}'
                    """)
                    pks = [r[0] for r in cursor.fetchall()]
                    
                    # Get foreign keys
                    cursor.execute(f"""
                        SELECT a.column_name AS from_col, c_pk.table_name AS to_table, b.column_name AS to_col
                        FROM user_cons_columns a
                        JOIN user_constraints c ON a.constraint_name = c.constraint_name
                        JOIN user_constraints c_pk ON c.r_constraint_name = c_pk.constraint_name
                        JOIN user_cons_columns b ON c_pk.constraint_name = b.constraint_name AND b.position = a.position
                        WHERE c.constraint_type = 'R' AND a.table_name = '{table}'
                    """)
                    fkeys = cursor.fetchall()
                    
                    schema[table] = {
                        "columns": [{"name": c[0], "type": c[1], "pk": c[0] in pks} for c in cols],
                        "foreign_keys": [{"to_table": fk[1], "from_col": fk[0], "to_col": fk[2]} for fk in fkeys]
                    }
        except Exception as e:
            print(f"Error reading metadata: {e}")
        finally:
            conn.close()
            
        return schema
