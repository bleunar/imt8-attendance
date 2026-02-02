"""
Attendance endpoints for Core Attendance application.

Provides time in/out punch and activity log viewing.
"""

import math
import json
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from typing import Optional

from config import settings
from models.attendance import (
    PunchRequest, PunchResponse, ActivityRecord, 
    ActivityListResponse, StudentSummary, AttendanceSummaryResponse,
    ActivityUpdate, ActivityInvalidate, BulkActionRequest, BulkInvalidateRequest, BulkAdjustRequest
)
from utilities.database import execute_query, execute_one, execute_insert, execute_update
from utilities.dependencies import require_admin_or_manager, get_current_user
from utilities.storage import get_profile_picture_url
from utilities.limiter import limiter


router = APIRouter(prefix="/attendance", tags=["Attendance"])


def ensure_activity_timezone(activity: dict) -> dict:
    """Ensure all datetime fields in activity dict are timezone-aware (UTC)."""
    fields = ["time_in", "time_out", "created_at", "invalidated_at"]
    for field in fields:
        val = activity.get(field)
        if val and isinstance(val, datetime) and val.tzinfo is None:
            activity[field] = val.replace(tzinfo=timezone.utc)
            
    # Parse properties if it's a JSON string
    if activity.get("properties") and isinstance(activity["properties"], str):
        try:
            activity["properties"] = json.loads(activity["properties"])
        except json.JSONDecodeError:
            activity["properties"] = {}
            
    return activity


@router.post("/punch", response_model=PunchResponse)
@limiter.limit("32/minute")
async def punch(request: Request, data: PunchRequest):
    """
    Time in/out punch using school ID.
    
    This is a public endpoint (no authentication required).
    
    Logic:
    - If student has no active session (no time_in without time_out): Create new time_in
    - If student has active session: Complete it with time_out
    """
    # Find student or manager by school_id
    account = await execute_one(
        """
        SELECT id, first_name, last_name, suspended_at, role
        FROM accounts 
        WHERE school_id = %s AND (role = 'student' OR role = 'manager')
        """,
        (data.school_id,)
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Double check your School ID, or contact the administrator."
        )
    
    if account.get("suspended_at"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact administrator."
        )
    
    # Get account name
    account_name = f"{account['first_name'] or ''} {account['last_name'] or ''}".strip()
    if not account_name:
        account_name = f"{account['role'].capitalize()} #{account['id']}"
    
    # Check for active session (time_in without time_out)
    # We fetch the latest open session regardless of date first, then check date logic in Python
    active_session = await execute_one(
        """
        SELECT time_in
        FROM job_activity 
        WHERE account_id = %s 
          AND (time_out IS NULL OR CAST(time_out AS CHAR) = '0000-00-00 00:00:00')
        ORDER BY time_in DESC
        LIMIT 1
        """,
        (account["id"],)
    )
    
    now = datetime.now(timezone.utc)
    
    # STRICT DAY CHECK:
    # If active session exists, strict check if it belongs to "Today" in School Timezone.
    # If it's from yesterday (even if < 24h ago in UTC), we force a NEW session.
    if active_session:
        tz = ZoneInfo(settings.TIMEZONE)
        now_local = now.astimezone(tz)
        session_time_local = active_session["time_in"].replace(tzinfo=timezone.utc).astimezone(tz)
        
        if session_time_local.date() != now_local.date():
            # Session is from a previous day. Ignore it and treat as "No Active Session".
            # This triggers the creation of a NEW activity below.
            active_session = None

    
    if active_session:
        # Calculate duration
        time_diff = now - active_session["time_in"].replace(tzinfo=timezone.utc)
        duration_minutes = time_diff.total_seconds() / 60

        invalidation_updates = ""
        invalidation_values = []

        # Check for minimum duration (10 minutes)
        if duration_minutes < 10:
            if not data.force_early_timeout:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="EARLY_TIMEOUT_WARNING"
                )
            else:
                # Force invalidate
                invalidation_updates = ", invalidated_at = %s, invalidation_notes = %s"
                invalidation_values = [now, "Timed out too early (< 10 mins)"]

        # Time out - complete the session
        # We allow time out even if they are currently jobless (e.g. removed while working)
        await execute_update(
            f"""
            UPDATE job_activity 
            SET time_out = %s, updated_at = %s{invalidation_updates}
            WHERE account_id = %s AND (time_out IS NULL OR CAST(time_out AS CHAR) = '0000-00-00 00:00:00')
            """,
            (now, now, *invalidation_values, account["id"])
        )
        
        # Get profile picture URL
        profile_picture = get_profile_picture_url(account["id"])

        return PunchResponse(
            status="time_out",
            timestamp=now,
            title=f"Goodbye, {account_name}",
            message=f"Time out recorded",
            student_name=account_name,
            profile_picture=profile_picture
        )
    else:
        # Time in - create new session
        # REQUIREMENT: Must have an assigned job to time in
        job_assignment = await execute_one(
            """
            SELECT aj.job_id, j.name as job_name 
            FROM account_jobs aj
            JOIN jobs j ON aj.job_id = j.id
            WHERE aj.account_id = %s 
            LIMIT 1
            """,
            (account["id"],)
        )
        
        if not job_assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is jobless. Please contact your manager to assign you to a job."
            )

        # Prepare properties with job info
        properties = json.dumps({
            "job_information": {
                "id": job_assignment["job_id"],
                "name": job_assignment["job_name"]
            }
        })

        # We explicitly set time_out to NULL to indicate an active session
        await execute_insert(
            """
            INSERT INTO job_activity (account_id, time_in, time_out, properties, created_at, updated_at)
            VALUES (%s, %s, NULL, %s, %s, %s)
            """,
            (account["id"], now, properties, now, now)
        )
        
        # Get profile picture URL
        profile_picture = get_profile_picture_url(account["id"])
        
        return PunchResponse(
            status="time_in",
            timestamp=now,
            title=f"Hello, {account_name}",
            message=f"Time in recorded",
            student_name=account_name,
            profile_picture=profile_picture
        )


@router.get("/public/active", response_model=list[str])
@router.get("/public/active", response_model=list[str])
@limiter.limit("32/minute")
async def get_public_active_sessions(
    request: Request,
    date_from: Optional[datetime] = None
):
    """
    Get list of names of currently active students.
    
    Public endpoint for kiosk display.
    """
    # Determine time filter
    time_condition = "DATE(ja.time_in) = UTC_DATE()"
    params = []
    
    if date_from:
        time_condition = "ja.time_in >= %s"
        params.append(date_from)

    rows = await execute_query(
        f"""
        SELECT DISTINCT CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) as name
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE (ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00')
          AND {time_condition}
          AND ja.invalidated_at IS NULL
        ORDER BY name
        """,
        tuple(params)
    )
    return [r["name"].strip() for r in rows if r["name"].strip()]


@router.get("/public/today", response_model=list[ActivityRecord])
@router.get("/public/today", response_model=list[ActivityRecord])
@limiter.limit("32/minute")
async def get_public_today_activity(
    request: Request,
    date_from: Optional[datetime] = None
):
    """
    Get all activity records for today (public).
    
    If date_from is provided, returns activities since that time (for timezone support).
    Otherwise defaults to UTC date.
    """
    
    # Determine time filter
    time_condition = "DATE(ja.time_in) = UTC_DATE()"
    params = []
    
    if date_from:
        time_condition = "ja.time_in >= %s"
        params.append(date_from)

    activities = await execute_query(
        f"""
        SELECT ja.id, ja.account_id, ja.time_in, 
               IF(CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00', NULL, ja.time_out) as time_out, 
               ja.properties, ja.created_at,
               ja.invalidated_at, ja.invalidation_notes,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               a.school_id,
               CASE 
                   WHEN CAST(ja.time_out AS CHAR) != '0000-00-00 00:00:00'
                   THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                   ELSE NULL 
               END as duration_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE {time_condition}
          AND ja.invalidated_at IS NULL
        ORDER BY 
            (ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00') DESC, 
            CASE 
                WHEN (ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00') 
                THEN CONCAT(a.first_name, ' ', a.last_name) 
                ELSE NULL 
            END ASC,
            ja.time_in DESC
        """,
        tuple(params)
    )
    
    # Add profile picture URL to each activity
    for activity in activities:
        activity["account_profile_picture"] = get_profile_picture_url(activity["account_id"])
    
    return [ActivityRecord(**ensure_activity_timezone(a)) for a in activities]


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    account_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    active_only: bool = False,
    sort_by: str = Query("time_in", pattern="^(time_in|time_out|account_name|duration_minutes)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    user: dict = Depends(require_admin_or_manager)
):
    """
    List activity logs with filtering, pagination, and sorting.
    
    Admin and Manager roles only.
    """
    # Build query
    conditions = []
    params = []
    
    if account_id:
        conditions.append("ja.account_id = %s")
        params.append(account_id)
    
    
    # 1. Account Filter (Global)
    if account_id:
        conditions.append("ja.account_id = %s")
        params.append(account_id)
    
    # 2. Date Filters vs Active Logic
    # If active_only is set, we only show active.
    # If not, we show (Date Range OR Active)
    
    if active_only:
        conditions.append("(ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00') AND DATE(ja.time_in) = UTC_DATE()")
    else:
        # Build date condition group
        date_conditions = []
        
        if date_from:
            date_conditions.append("ja.time_in >= %s")
            params.append(date_from)
        
        if date_to:
            if date_to.hour == 0 and date_to.minute == 0 and date_to.second == 0:
                date_to = date_to.replace(hour=23, minute=59, second=59, microsecond=999999)
            date_conditions.append("ja.time_in <= %s")
            params.append(date_to)

        if date_conditions:
            # Combine: ( (Date Match) OR (Is Active) )
            date_sql = " AND ".join(date_conditions)
            conditions.append(f"({date_sql} OR (ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00'))")
            
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_result = await execute_one(
        f"""
        SELECT COUNT(*) as total 
        FROM job_activity ja
        WHERE {where_clause}
        """,
        tuple(params)
    )
    total = count_result["total"]
    
    # Calculate pagination
    offset = (page - 1) * page_size
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Determine ORDER BY clause
    # Map frontend sort keys to database columns/aliases
    sort_mapping = {
        "time_in": "ja.time_in",
        "time_out": "time_out", # Can use alias or ja.time_out, but alias handles the 0000 logic via IF in SELECT? No, ORDER BY runs after SELECT logic? 
                                # Actually, standard SQL: ORDER BY can use aliases.
                                # But let's be safe. sorting by optional time_out:
                                # If we use the alias `time_out` from select, it has NULLs.
                                # Let's use `ja.time_out` directly or the expression.
                                # For simplicity, let's try alias `time_out` first as it's cleaner if supported.
                                # MySQL supports aliases in ORDER BY.
        "account_name": "account_name",
        "duration_minutes": "duration_minutes"
    }
    
    sort_col = sort_mapping.get(sort_by, "ja.time_in")
    
    # Force active sessions to the top, then sort by user preference
    order_clause = f"(ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00') DESC, {sort_col} {sort_order.upper()}"
    
    # Get activities
    activities = await execute_query(
        f"""
        SELECT ja.id, ja.account_id, ja.time_in, 
               IF(CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00', NULL, ja.time_out) as time_out,
               ja.properties, ja.created_at,
               ja.invalidated_at, ja.invalidation_notes,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               a.school_id,
               CASE 
                   WHEN CAST(ja.time_out AS CHAR) != '0000-00-00 00:00:00'
                   THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                   ELSE NULL 
               END as duration_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (page_size, offset)
    )
    
    
    # Add profile picture URL to each activity
    for activity in activities:
        activity["account_profile_picture"] = get_profile_picture_url(activity["account_id"])

    return ActivityListResponse(
        items=[ActivityRecord(**ensure_activity_timezone(a)) for a in activities],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/student/{student_id}", response_model=ActivityListResponse)
async def get_student_activities(
    student_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user: dict = Depends(get_current_user)
):
    """
    Get a specific student's activity history.
    
    Admin/Manager: Can access any student.
    Student: Can ONLY access their own history.
    """
    # Authorization Check
    if user["role"] == "student" and user["id"] != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own activity history"
        )
        
    if user["role"] == "manager" or user["role"] == "admin":
        # Check if student exists (only needed if looking up someone else)
        student = await execute_one(
            "SELECT id FROM accounts WHERE id = %s",
            (student_id,)
        )
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
    
    return await list_activities(
        page=page,
        page_size=page_size,
        account_id=student_id,
        date_from=date_from,
        date_to=date_to,
        sort_by="time_in",
        sort_order="desc",
        user=user
    )


@router.get("/summary", response_model=AttendanceSummaryResponse)
async def get_attendance_summary(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    department: Optional[str] = None,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get attendance summary with total time per student.
    
    Calculates total sessions and total time for each student.
    
    Admin and Manager roles only.
    """
    # Build query
    conditions = []
    params = []
    
    if date_from:
        conditions.append("ja.time_in >= %s")
        params.append(date_from)
    
    if date_to:
        conditions.append("ja.time_in <= %s")
        params.append(date_to)
    
    if department:
        conditions.append("a.department = %s")
        params.append(department)
    
    # Include both active and completed sessions
    # conditions.append("(ja.time_out IS NOT NULL AND ja.time_out != '0000-00-00 00:00:00')")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get summary
    summaries = await execute_query(
        f"""
        SELECT 
            a.id as account_id,
            CONCAT(a.first_name, ' ', a.last_name) as account_name,
            a.school_id,
            COUNT(*) as total_sessions,
            SUM(TIMESTAMPDIFF(MINUTE, ja.time_in, COALESCE(NULLIF(CAST(ja.time_out AS CHAR), '0000-00-00 00:00:00'), UTC_TIMESTAMP()))) as total_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE {where_clause}
        GROUP BY a.id, a.first_name, a.last_name, a.school_id
        ORDER BY total_minutes DESC
        """,
        tuple(params)
    )
    
    items = [
        StudentSummary(
            account_id=s["account_id"],
            account_name=s["account_name"] or f"Student #{s['account_id']}",
            school_id=s["school_id"],
            total_sessions=s["total_sessions"],
            total_minutes=s["total_minutes"] or 0,
            total_hours=round((s["total_minutes"] or 0) / 60, 2)
        )
        for s in summaries
    ]
    
    return AttendanceSummaryResponse(
        items=items,
        total=len(items),
        date_from=date_from,
        date_to=date_to
    )


@router.get("/active", response_model=list[ActivityRecord])
async def get_active_sessions(
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get all currently active sessions (timed in but not timed out).
    
    Admin and Manager roles only.
    """
    activities = await execute_query(
        """
        SELECT ja.id, ja.account_id, ja.time_in, 
               IF(CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00', NULL, ja.time_out) as time_out, 
               ja.properties, ja.created_at,
               ja.invalidated_at, ja.invalidation_notes,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               a.school_id,
               NULL as duration_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE (ja.time_out IS NULL OR CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00')
          AND DATE(ja.time_in) = UTC_DATE()
        ORDER BY ja.time_in DESC
        """
    )
    
    return [ActivityRecord(**ensure_activity_timezone(a)) for a in activities]


@router.get("/overdue/count", response_model=dict)
async def get_overdue_count(
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get the count of overdue activities.
    Overdue = Active (no time_out) AND started before today (UTC) AND not invalidated.
    
    Admin and Manager roles only.
    """
    result = await execute_one(
        """
        SELECT COUNT(*) as count
        FROM job_activity
        WHERE (time_out IS NULL OR CAST(time_out AS CHAR) = '0000-00-00 00:00:00')
          AND DATE(time_in) < UTC_DATE()
          AND invalidated_at IS NULL;
        """
    )
    
    return {"count": result["count"]}


@router.put("/{activity_id}", response_model=ActivityRecord)
async def update_activity(
    activity_id: int,
    data: ActivityUpdate,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Update activity time in/out.
    
    Admin and Manager roles only.
    """
    # Check if activity exists
    activity = await execute_one(
        "SELECT * FROM job_activity WHERE id = %s",
        (activity_id,)
    )
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    updates = []
    params = []
    
    if data.time_in:
        updates.append("time_in = %s")
        params.append(data.time_in)
        
    if data.time_out:
        updates.append("time_out = %s")
        params.append(data.time_out)

    if data.invalidation_notes is not None:
        updates.append("invalidation_notes = %s")
        params.append(data.invalidation_notes)
        
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
        
    # Add updated_at
    updates.append("updated_at = %s")
    params.append(datetime.now(timezone.utc))
    params.append(activity_id)
    
    await execute_update(
        f"UPDATE job_activity SET {', '.join(updates)} WHERE id = %s",
        tuple(params)
    )
    
    # Fetch updated record
    updated_rec = await execute_one(
        """
        SELECT ja.id, ja.account_id, ja.time_in, 
               IF(CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00', NULL, ja.time_out) as time_out, 
               ja.properties, ja.created_at,
               ja.invalidated_at, ja.invalidation_notes,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               a.school_id,
               CASE 
                   WHEN CAST(ja.time_out AS CHAR) != '0000-00-00 00:00:00'
                   THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                   ELSE NULL 
               END as duration_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE ja.id = %s
        """,
        (activity_id,)
    )
    
    return ActivityRecord(**ensure_activity_timezone(updated_rec))


@router.put("/{activity_id}/invalidate", response_model=ActivityRecord)
async def invalidate_activity(
    activity_id: int,
    data: ActivityInvalidate,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Invalidate an activity record.
    
    Admin and Manager roles only.
    """
    # Check if activity exists and get time_in/time_out
    activity = await execute_one(
        "SELECT id, time_in, time_out FROM job_activity WHERE id = %s",
        (activity_id,)
    )
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
        
    now = datetime.now(timezone.utc)
    
    # If time_out is NULL or zero-date, auto-fill with time_in + 30 minutes
    time_out_is_empty = (
        activity["time_out"] is None or 
        str(activity["time_out"]) == "0000-00-00 00:00:00"
    )
    
    if time_out_is_empty and activity["time_in"]:
        auto_time_out = activity["time_in"] + timedelta(minutes=30)
        await execute_update(
            """
            UPDATE job_activity 
            SET invalidated_at = %s, invalidation_notes = %s, time_out = %s, updated_at = %s
            WHERE id = %s
            """,
            (now, data.notes, auto_time_out, now, activity_id)
        )
    else:
        await execute_update(
            """
            UPDATE job_activity 
            SET invalidated_at = %s, invalidation_notes = %s, updated_at = %s
            WHERE id = %s
            """,
            (now, data.notes, now, activity_id)
        )
    
    # Fetch updated record
    updated_rec = await execute_one(
        """
        SELECT ja.id, ja.account_id, ja.time_in, 
               IF(CAST(ja.time_out AS CHAR) = '0000-00-00 00:00:00', NULL, ja.time_out) as time_out, 
               ja.properties, ja.created_at,
               ja.invalidated_at, ja.invalidation_notes,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               a.school_id,
               CASE 
                   WHEN CAST(ja.time_out AS CHAR) != '0000-00-00 00:00:00'
                   THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                   ELSE NULL 
               END as duration_minutes
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE ja.id = %s
        """,
        (activity_id,)
    )

    return ActivityRecord(**ensure_activity_timezone(updated_rec))

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Delete an activity record permanently.
    
    Admin and Manager roles only.
    """
    # Check if activity exists
    activity = await execute_one(
        "SELECT id FROM job_activity WHERE id = %s",
        (activity_id,)
    )
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
        
    await execute_update(
        "DELETE FROM job_activity WHERE id = %s",
        (activity_id,)
    )
    return None

@router.put("/{activity_id}/revalidate")
async def revalidate_activity(
    activity_id: int,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Revalidate an activity record by clearing invalidation status.
    
    Admin and Manager roles only.
    """
    # Check if activity exists
    activity = await execute_one(
        "SELECT id FROM job_activity WHERE id = %s",
        (activity_id,)
    )
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
        
    now = datetime.now(timezone.utc)
    await execute_update(
        """
        UPDATE job_activity 
        SET invalidated_at = NULL, invalidation_notes = NULL, updated_at = %s
        WHERE id = %s
        """,
        (now, activity_id)
    )
    
    updated_activity = await execute_one(
        """
        SELECT 
            ja.id,
            ja.account_id,
            ja.time_in,
            ja.time_out,
            ja.invalidated_at,
            ja.invalidation_notes,
            TIMESTAMPDIFF(MINUTE, ja.time_in, COALESCE(ja.time_out, NOW())) as duration_minutes,
            CONCAT(a.first_name, ' ', a.last_name) as account_name,
            a.school_id
        FROM job_activity ja
        JOIN accounts a ON ja.account_id = a.id
        WHERE ja.id = %s
        """,
        (activity_id,)
    )
    
    
    return ensure_activity_timezone(updated_activity)


# --- Bulk Operations ---

@router.post("/bulk/close", response_model=dict)
async def bulk_close(
    data: BulkActionRequest,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Close multiple active sessions.
    Sets time_out to NOW for all selected active sessions.
    """
    if not data.ids:
        return {"count": 0}
        
    now = datetime.now(timezone.utc)
    
    # Generate placeholders
    placeholders = ",".join(["%s"] * len(data.ids))
    
    # We only close sessions that are actually active (time_out IS NULL or '0000...')
    await execute_update(
        f"""
        UPDATE job_activity 
        SET time_out = %s, updated_at = %s
        WHERE id IN ({placeholders}) 
        AND (time_out IS NULL OR CAST(time_out AS CHAR) = '0000-00-00 00:00:00')
        """,
        (now, now, *data.ids)
    )
    
    return {"message": "Activities closed successfully"}


@router.post("/bulk/invalidate", response_model=dict)
async def bulk_invalidate(
    data: BulkInvalidateRequest,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Invalidate multiple activities.
    For activities without time_out, auto-set time_out = time_in + 30 minutes.
    """
    if not data.ids:
        return {"count": 0}
        
    now = datetime.now(timezone.utc)
    placeholders = ",".join(["%s"] * len(data.ids))
    
    # First, update time_out for activities that don't have one (overdue)
    await execute_update(
        f"""
        UPDATE job_activity 
        SET time_out = DATE_ADD(time_in, INTERVAL 30 MINUTE), updated_at = %s
        WHERE id IN ({placeholders})
          AND (time_out IS NULL OR CAST(time_out AS CHAR) = '0000-00-00 00:00:00')
        """,
        (now, *data.ids)
    )
    
    # Then invalidate all specified activities
    await execute_update(
        f"""
        UPDATE job_activity 
        SET invalidated_at = %s, invalidation_notes = %s, updated_at = %s
        WHERE id IN ({placeholders})
        """,
        (now, data.notes, now, *data.ids)
    )
    
    return {"message": "Activities invalidated successfully"}


@router.post("/bulk/revalidate", response_model=dict)
async def bulk_revalidate(
    data: BulkActionRequest,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Revalidate multiple activities.
    """
    if not data.ids:
        return {"count": 0}
        
    now = datetime.now(timezone.utc)
    placeholders = ",".join(["%s"] * len(data.ids))
    
    await execute_update(
        f"""
        UPDATE job_activity 
        SET invalidated_at = NULL, invalidation_notes = NULL, updated_at = %s
        WHERE id IN ({placeholders})
        """,
        (now, *data.ids)
    )
    
    return {"message": "Activities revalidated successfully"}


@router.post("/bulk/delete", response_model=dict)
async def bulk_delete(
    data: BulkActionRequest,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Delete multiple activities permanently.
    """
    if not data.ids:
        return {"count": 0}
        
    placeholders = ",".join(["%s"] * len(data.ids))
    
    await execute_update(
        f"DELETE FROM job_activity WHERE id IN ({placeholders})",
        tuple(data.ids)
    )
    
    return {"message": "Activities deleted successfully"}


@router.post("/bulk/adjust", response_model=dict)
async def bulk_adjust(
    data: BulkAdjustRequest,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Adjust times for multiple activities.
    Updates time_in/time_out if provided.
    WARNING: Sets strict datetime overrides.
    """
    if not data.ids:
        return {"count": 0}
        
    updates = []
    params = []
    
    if data.time_in:
        updates.append("time_in = %s")
        params.append(data.time_in)
        
    if data.time_out:
        updates.append("time_out = %s")
        params.append(data.time_out)
        
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    updates.append("updated_at = %s")
    params.append(datetime.now(timezone.utc))
    
    # placeholders for IDs
    id_placeholders = ",".join(["%s"] * len(data.ids))
    params.extend(data.ids)
    
    await execute_update(
        f"""
        UPDATE job_activity 
        SET {', '.join(updates)}
        WHERE id IN ({id_placeholders})
        """,
        tuple(params)
    )
    
    return {"message": "Activities adjusted successfully"}
