"""
Scheduler module for periodic tasks.
"""

from datetime import datetime, time, timedelta, timezone
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from models.attendance import ActivityListResponse
from utilities.database import execute_query, execute_update
from config import settings

scheduler = AsyncIOScheduler()

async def auto_close_sessions():
    """
    Auto-closes active sessions at 11:00 PM local time.
    Calculates the 11 PM cutoff in configured TIMEZONE and converts to UTC.
    Updates all open sessions (time_out IS NULL) to use this calculated UTC time.
    """
    try:
        current_tz = pytz.timezone(settings.TIMEZONE)
        now_local = datetime.now(current_tz)
        
        # Calculate 11:00 PM for "today" in local time
        # If we are running exactly at 11:00 PM, today is correct.
        cutoff_local = current_tz.localize(datetime.combine(now_local.date(), time(23, 0)))
        
        # Convert to UTC
        cutoff_utc = cutoff_local.astimezone(pytz.UTC)
        
        print(f"[SCHEDULER] Running auto-close. Local: {cutoff_local}, UTC Cutoff: {cutoff_utc}")

        # Find active sessions
        # Logic: Close ANY session that is still open. 
        # Using the calculated cutoff time as the time_out time.
        
        # Note: If a session started AFTER 11 PM (e.g. 11:30 PM), should it be closed?
        # If this job runs at 11:00 PM, then sessions starting after won't exist yet.
        # If this job runs later (catch up), we might close 11:30 PM sessions with an 11:00 PM timestamp?
        # That would be weird (time_out < time_in).
        # Safe guard: Only update where time_in < cutoff_utc
        
        now = datetime.now(timezone.utc)
        result = await execute_update(
            """
            UPDATE job_activity 
            SET time_out = %s, updated_at = %s, properties = JSON_SET(COALESCE(properties, '{}'), '$.auto_closed', true)
            WHERE (time_out IS NULL OR time_out = '0000-00-00 00:00:00')
              AND time_in < %s
            """,
            (cutoff_utc, now, cutoff_utc)
        )
        
        if result > 0:
            print(f"[SCHEDULER] Auto-closed {result} active sessions.")
            
    except Exception as e:
        print(f"[SCHEDULER] Error in auto_close_sessions: {e}")

def start_scheduler():
    """Start the scheduler and add jobs."""
    # Run at 23:00 (11 PM) daily in the configured timezone
    scheduler.add_job(
        auto_close_sessions,
        CronTrigger(hour=23, minute=0, timezone=settings.TIMEZONE),
        id="auto_close_sessions",
        replace_existing=True
    )
    scheduler.start()
    print(f"[SCHEDULER] Service started. Timezone: {settings.TIMEZONE}")

def shutdown_scheduler():
    """Shutdown the scheduler."""
    scheduler.shutdown()
    print("[SCHEDULER] Service stopped.")
