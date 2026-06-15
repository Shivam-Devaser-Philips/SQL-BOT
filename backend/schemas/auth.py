from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    username: str
    password: str
    role: Optional[str] = "User"

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
