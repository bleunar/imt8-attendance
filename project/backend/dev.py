#!/usr/bin/env python3
"""
Development server runner for Core Attendance application.

Usage:
    python3 dev.py

This script starts the FastAPI application with hot reload enabled
for development purposes.
"""

import uvicorn
from config import settings


def main():
    """Run the development server."""
    print("=" * 50)
    print("  ITSD Attendance - Development Server")
    print("=" * 50)
    print(f"  Environment: {settings.ENVIRONMENT}")
    print(f"  Server: http://{settings.HOST}:{settings.PORT}")
    print(f"  Database: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}")
    print("=" * 50)
    print()
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        reload_dirs=["./"],
    )


if __name__ == "__main__":
    main()
