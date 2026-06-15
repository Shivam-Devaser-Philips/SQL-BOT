from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.config import get_db
from database.models import UserModel
from schemas.auth import UserRegister, UserLogin, TokenResponse
from security.auth import get_password_hash, verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered."
        )
        
    hashed = get_password_hash(user_data.password)
    new_user = UserModel(
        username=user_data.username,
        hashed_password=hashed,
        role=user_data.role or "User"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role,
        username=new_user.username
    )

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username
    )

@router.post("/oauth2-token", response_model=TokenResponse)
def oauth2_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username
    )
