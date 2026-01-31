"""
System status endpoints for Core Attendance application.

Provides system health checks and status information.
"""

from fastapi import APIRouter, Request
from utilities.email import check_smtp_connection
from utilities.database import execute_query
from utilities.limiter import limiter

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/status")
@limiter.limit("16/minute")
async def get_system_status(request: Request):
    """
    Check system health status.
    
    Verifies connectivity to critical services like Email and Database.
    """
    # Check email service status
    email_online = await check_smtp_connection(max_attempts=1, timeout_seconds=3)
    
    # Check database status
    database_online = False
    try:
        await execute_query("SELECT 1")
        database_online = True
    except Exception:
        database_online = False
    
    overall_status = "online"
    if not email_online:
        overall_status = "degraded"
    if not database_online:
        overall_status = "offline"
    
    return {
        "email_service": "online" if email_online else "offline",
        "database": "online" if database_online else "offline",
        "status": overall_status
    }
