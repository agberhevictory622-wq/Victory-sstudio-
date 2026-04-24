import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints
from app.utils.db import engine, Base
import uvicorn

# Initialize Database (optional automatic creation for MVP)
# In production, use migrations (alembic)
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AuraSuture SaaS API",
    description="Professional AI Tailoring & Pattern Engineering Backend",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routes
app.include_router(endpoints.router, prefix="/api/v1")

# Static File Handlers (For User Uploads & Generated Assets)
os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/generated", exist_ok=True)
os.makedirs("static/pdfs", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve React Frontend in Production
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")

@app.get("/health")
async def health_check():
    """System Health Monitoring Endpoint"""
    return {
        "status": "operational",
        "api_engine": "FastAPI",
        "vision_pipeline": "Active",
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
