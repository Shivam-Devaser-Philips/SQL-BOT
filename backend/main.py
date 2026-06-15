from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db_service import init_db

app = FastAPI(
    title="Banking Analytics Copilot API",
    description="Backend services for the AI-powered banking analytics copilot.",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Banking Analytics Copilot API is running."}

# Include routers here
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.schema import router as schema_router
from api.history import router as history_router
from api.audit import router as audit_router
from api.settings import router as settings_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(schema_router, prefix="/api/schema", tags=["schema"])
app.include_router(history_router, prefix="/api/history", tags=["history"])
app.include_router(audit_router, prefix="/api/audit", tags=["audit"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
