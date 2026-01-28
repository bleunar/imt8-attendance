from datetime import datetime, timezone, date
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Query

from models.schedules import (
    StudentScheduleResponse, ScheduleRequestCreate, ScheduleOverrideResponse,
    ManagerScheduleReview
)
from models.auth import MessageResponse
from utilities.database import execute_query, execute_one, execute_insert, execute_update
from utilities.dependencies import get_current_user, require_admin_or_manager

router = APIRouter(prefix="/schedules", tags=["Schedules"])

def derive_status(item):
    if item["cancelled_at"]:
        return "Cancelled"
    if item["rejected_at"]:
        return "Rejected"
    if item["approved_at"]:
        return "Approved"
    return "Pending"

@router.get("/my", response_model=dict)
async def get_my_schedule(
    user: dict = Depends(get_current_user)
):
    """
    Get the current user's schedule (active weekdays) and absence requests/overrides.
    """
    if user["role"] != "student":
         # Maybe managers want to see their own? For now, students primarily.
         # But the requirement says "students can view their schedule".
         pass

    # 1. Get Weekly Schedule
    schedule = await execute_one(
        "SELECT * FROM student_schedules WHERE account_id = %s",
        (user["id"],)
    )
    
    # Pack schedule data
    # weekdays is JSON in DB, already parsed by execute_one/aiomysql if configured? 
    # Usually aiomysql returns dict for row, but JSON fields might be string or pre-parsed depending on driver settings.
    # We'll assume we might need to parse if it comes as string.
    weekdays = []
    if schedule and schedule["weekdays"]:
        weekdays = json.loads(schedule["weekdays"]) if isinstance(schedule["weekdays"], str) else schedule["weekdays"]

    # 2. Get Overrides (Future and Recent Past? Or all?)
    # Let's get all for now, maybe limit by date later.
    overrides = await execute_query(
        """
        SELECT 
            id, account_id, date, request_notes, response_notes,
            approved_at, rejected_at, cancelled_at, manager_id, created_at
        FROM schedule_overrides 
        WHERE account_id = %s
        ORDER BY date DESC
        """,
        (user["id"],)
    )

    formatted_overrides = []
    for o in overrides:
        item = dict(o)
        item["status"] = derive_status(item)
        formatted_overrides.append(item)

    return {
        "schedule": {"weekdays": weekdays},
        "overrides": formatted_overrides
    }

@router.post("/requests", response_model=ScheduleOverrideResponse)
async def create_request(
    data: ScheduleRequestCreate,
    user: dict = Depends(get_current_user)
):
    """
    Student requests an absence.
    """
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can request absences")

    # Check if request already exists for this date
    existing = await execute_one(
        "SELECT id FROM schedule_overrides WHERE account_id = %s AND date = %s",
        (user["id"], data.date)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Request already exists for this date")

    now = datetime.now(timezone.utc)
    
    override_id = await execute_insert(
        """
        INSERT INTO schedule_overrides (account_id, date, request_notes, created_at)
        VALUES (%s, %s, %s, %s)
        """,
        (user["id"], data.date, data.request_notes, now)
    )

    # Return created item
    new_item = await execute_one(
        "SELECT * FROM schedule_overrides WHERE id = %s",
        (override_id,)
    )
    item_dict = dict(new_item)
    item_dict["status"] = "Pending"
    return item_dict

@router.put("/requests/{request_id}/cancel", response_model=ScheduleOverrideResponse)
async def cancel_request(
    request_id: int,
    user: dict = Depends(get_current_user)
):
    """
    Student cancels their pending request.
    """
    # Verify ownership
    req = await execute_one(
        "SELECT * FROM schedule_overrides WHERE id = %s AND account_id = %s",
        (request_id, user["id"])
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Only allow cancelling if not already processed? Or allow cancelling approved ones too (if in future)?
    # "cancelled_at" implies it's a state.
    # If already passed date?
    
    now = datetime.now(timezone.utc)
    await execute_update(
        "UPDATE schedule_overrides SET cancelled_at = %s WHERE id = %s",
        (now, request_id)
    )
    
    updated = await execute_one("SELECT * FROM schedule_overrides WHERE id = %s", (request_id,))
    item = dict(updated)
    item["status"] = derive_status(item)
    return item

# --- Manager Endpoints ---
@router.get("/overview", response_model=dict)
async def get_daily_overview(
    date_query: date,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get overview for a specific date:
    - scheduled_students: List of students who have this weekday in their schedule.
    - active_students: List of students physically present (job_activity).
    - absent_requests: Overrides for this date.
    """
    
    # 1. Calculate Weekday (1-7 or 0-6). Python weekday(): Mon=0, Sun=6.
    # We need to match what we store in DB. Let's assume standard ISO 1-7 (Mon=1) or 0-6.
    # The prompt didn't specify, but "weekdays JSON" usually implies some convention.
    # Let's assume 0=Mon, 6=Sun to match Python's default for consistency, or check previous logs.
    # User comment: "(e.g. [1,2,3] is Mon-Wed)". So 1-based, Mon=1.
    py_weekday = date_query.isoweekday() # 1=Mon, 7=Sun
    
    # 2. Get Scheduled Students
    # JSON_CONTAINS(weekdays, '1') might require casting integer to string if stored as strings or numbers.
    # If stored as [1, 2, 3] (numbers), JSON_CONTAINS(weekdays, 1) works.
    
    scheduled_students = await execute_query(
        f"""
        SELECT s.account_id, a.first_name, a.last_name, a.school_id, j.name as job_name
        FROM student_schedules s
        JOIN accounts a ON s.account_id = a.id
        LEFT JOIN account_jobs aj ON a.id = aj.account_id
        LEFT JOIN jobs j ON aj.job_id = j.id
        WHERE JSON_CONTAINS(s.weekdays, CAST(%s AS JSON))
        """,
        (py_weekday,)
    )
    
    # 3. Get Active Students (Time In today, no Time Out or Time Out > now?)
    # Actually just check if they have a record for today? 
    # Or currently active? "compare to the list of students that are actively on duty"
    # Active means: time_in is not null, time_out is null.
    # And ideally for *this date*. 
    
    # If checking past dates, "actively on duty" doesn't make sense. It means "were on duty".
    # For today: time_out IS NULL.
    # For generic date: Any activity that started on that date.
    
    active_activity = await execute_query(
        """
        SELECT ja.account_id, ja.time_in, ja.time_out
        FROM job_activity ja
        WHERE DATE(ja.time_in) = %s
        """,
        (date_query,)
    )
    
    # 4. Get Overrides for this date
    overrides = await execute_query(
        """
        SELECT o.*, a.first_name, a.last_name
        FROM schedule_overrides o
        JOIN accounts a ON o.account_id = a.id
        WHERE o.date = %s
        """,
        (date_query,)
    )

    # Process Overrides to include status
    processed_overrides = []
    for o in overrides:
        item = dict(o)
        item["status"] = derive_status(item)
        processed_overrides.append(item)

    return {
        "date": date_query,
        "scheduled": [dict(s) for s in scheduled_students],
        "activity": [dict(a) for a in active_activity],
        "requests": processed_overrides
    }

@router.get("/requests", response_model=List[ScheduleOverrideResponse])
async def list_requests(
    status_filter: Optional[str] = Query(None, pattern="^(Pending|Approved|Rejected|Cancelled)$"),
    user: dict = Depends(require_admin_or_manager)
):
    """
    List absence requests.
    """
    # We might want to filter by status. 
    # Since status is computed, we filter in SQL using the null checks?
    # Pending: approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL
    
    where_clause = "1=1"
    if status_filter == "Pending":
        where_clause += " AND approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL"
    elif status_filter == "Approved":
        where_clause += " AND approved_at IS NOT NULL"
    elif status_filter == "Rejected":
        where_clause += " AND rejected_at IS NOT NULL"
    elif status_filter == "Cancelled":
         where_clause += " AND cancelled_at IS NOT NULL"

    requests = await execute_query(
        f"SELECT * FROM schedule_overrides WHERE {where_clause} ORDER BY date DESC"
    )
    
    results = []
    for r in requests:
        item = dict(r)
        item["status"] = derive_status(item)
        results.append(item)
    return results

@router.put("/requests/{request_id}/approve", response_model=ScheduleOverrideResponse)
async def approve_request(
    request_id: int,
    data: ManagerScheduleReview,
    user: dict = Depends(require_admin_or_manager)
):
    now = datetime.now(timezone.utc)
    await execute_update(
        """
        UPDATE schedule_overrides 
        SET approved_at = %s, response_notes = %s, manager_id = %s, rejected_at = NULL, cancelled_at = NULL
        WHERE id = %s
        """,
        (now, data.response_notes, user["id"], request_id)
    )
    updated = await execute_one("SELECT * FROM schedule_overrides WHERE id = %s", (request_id,))
    item = dict(updated)
    item["status"] = derive_status(item)
    return item

@router.put("/requests/{request_id}/reject", response_model=ScheduleOverrideResponse)
async def reject_request(
    request_id: int,
    data: ManagerScheduleReview,
    user: dict = Depends(require_admin_or_manager)
):
    now = datetime.now(timezone.utc)
    await execute_update(
        """
        UPDATE schedule_overrides 
        SET rejected_at = %s, response_notes = %s, manager_id = %s, approved_at = NULL, cancelled_at = NULL
        WHERE id = %s
        """,
        (now, data.response_notes, user["id"], request_id)
    )
    updated = await execute_one("SELECT * FROM schedule_overrides WHERE id = %s", (request_id,))
    item = dict(updated)
    item["status"] = derive_status(item)
    return item
