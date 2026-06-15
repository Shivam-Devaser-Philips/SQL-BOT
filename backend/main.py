from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Banking Analytics Copilot API is running."}

# Include routers here (to be implemented)
from api.chat import router as chat_router
from api.schema import router as schema_router

app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(schema_router, prefix="/api/schema", tags=["schema"])
