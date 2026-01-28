"""
System status endpoints for Core Attendance application.

Provides system health checks and status information.
"""

from fastapi import APIRouter
from utilities.email import check_smtp_connection
from utilities.database import execute_query
from core.scheduler import scheduler

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/status")
async def get_system_status():
    """
    Check system health status.
    
    Verifies connectivity to critical services like Email and Database,
    and checks the status of background jobs.
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
        
    # Check scheduler status
    scheduler_status = {
        "status": "running" if scheduler.running else "stopped",
        "jobs": []
    }
    
    if scheduler.running:
        job = scheduler.get_job("auto_close_sessions")
        if job:
            scheduler_status["jobs"].append({
                "id": job.id,
                "name": "Auto-Close Sessions",
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None
            })
    
    overall_status = "online"
    if not email_online:
        overall_status = "degraded"
    if not database_online:
        overall_status = "offline"
    
    return {
        "email_service": "online" if email_online else "offline",
        "database": "online" if database_online else "offline",
        "scheduler": scheduler_status,
        "status": overall_status
    }
