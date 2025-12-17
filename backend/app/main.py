"""
Carbon Scheduler API
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import carbon


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Carbon Scheduler API starting up...")
    yield
    # Shutdown
    print("👋 Carbon Scheduler API shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Carbon Scheduler API",
    description="API for scheduling tasks when the UK grid is greenest",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(carbon.router)


# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Carbon Scheduler API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "carbon-scheduler-api"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
