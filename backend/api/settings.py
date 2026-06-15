from fastapi import APIRouter, Depends, HTTPException, status
from security.auth import get_current_user
from database.models import UserModel
from services.oracle_service import get_connection_config, save_connection_config, DatabaseService
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class SettingsUpdate(BaseModel):
    db_type: str
    oracle_host: Optional[str] = "localhost"
    oracle_port: Optional[str] = "1521"
    oracle_service_name: Optional[str] = "FREE"
    oracle_username: Optional[str] = "system"
    oracle_password: Optional[str] = ""

@router.get("/")
def get_settings(current_user: UserModel = Depends(get_current_user)):
    config = get_connection_config()
    # Mask password for security
    config_copy = config.copy()
    if "oracle_password" in config_copy:
        config_copy["oracle_password"] = "********" if config_copy["oracle_password"] else ""
    return {
        "status": "success",
        "settings": config_copy
    }

@router.post("/")
def update_settings(
    settings: SettingsUpdate,
    current_user: UserModel = Depends(get_current_user)
):
    current_config = get_connection_config()
    
    new_config = settings.model_dump()
    # If password is masked, keep the existing password
    if new_config.get("oracle_password") == "********":
        new_config["oracle_password"] = current_config.get("oracle_password", "")
        
    save_connection_config(new_config)
    
    # Try testing connection
    db_service = DatabaseService()
    try:
        conn, engine_type = db_service.get_connection()
        conn.close()
        test_status = "Connected successfully"
    except Exception as e:
        test_status = f"Saved, but connection test failed: {str(e)}"
        
    return {
        "status": "success",
        "message": "Connection settings updated.",
        "test_connection": test_status
    }
