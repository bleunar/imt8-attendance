"""
Attendance API - Main Application

FastAPI application entry point with all routers and middleware.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.initialization import initialize_app
from core.logging import setup_logging, get_logger
from utilities.database import DatabasePool
from utilities.limiter import setup_limiter
from endpoints import auth, accounts, jobs, attendance, performance, system, time_adjustments, leaderboards

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Attendance API Starting...")
    
    # Run initialization
    init_success = await initialize_app()
    if not init_success:
        logger.error("Application initialization failed!")
        logger.error("Please check your configuration and try again.")
        # In development, we might want to continue anyway
        if settings.ENVIRONMENT == "production":
            raise RuntimeError("Application initialization failed")
    
    logger.info("Application started successfully!")
    logger.info(f"API available at http://{settings.HOST}:{settings.PORT}")
    logger.info(f"API docs at http://{settings.HOST}:{settings.PORT}/docs")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await DatabasePool.close_pool()
    logger.info("Database pool closed")


# Create FastAPI application
app = FastAPI(
    title="ITSD Attendance API",
    description="Student attendance tracking system API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Setup Rate Limiting
setup_limiter(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to log unhandled errors."""
    logger.exception(f"Unhandled exception processing request: {request.method} {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(jobs.router)
app.include_router(attendance.router)
app.include_router(performance.router)
app.include_router(leaderboards.router)
app.include_router(system.router)
app.include_router(time_adjustments.router)

# Mount static files for uploads (profile pictures, etc.)
from fastapi.staticfiles import StaticFiles
from pathlib import Path

uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "name": "ITSD Attendance API",
        "version": "1.3.0",
        "status": "running",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }
