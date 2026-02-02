"""
Performance endpoints for Core Attendance application.
"""

from fastapi import APIRouter, Depends
from models.performance import PerformanceResponse, PerformanceStat
from utilities.database import execute_query
from utilities.dependencies import require_admin_or_manager, get_current_user
from utilities.storage import get_profile_picture_url

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.get("/", response_model=PerformanceResponse)
async def get_performance_stats(
    search: str | None = None,
    job_id: int | None = None,
    status: str = "all",
    role: str = "student",
    suspended: str = "false",
    user: dict = Depends(get_current_user)
):
    """
    Get performance statistics.
    
    Admin/Manager: Can view all students/managers.
    Student: Can ONLY view their own stats (filters ignored/overridden).
    
    Filters (Admin/Manager only):
    - search: Filter by name
    - job_id: Filter by assigned job
    - status: 'active' (online), 'inactive' (offline), 'all' (default: active)
    - role: 'student', 'manager', or 'all'
    - suspended: 'true', 'false', 'all' (default: false - show non-suspended only)
    
    Sorts by Total Rendered Hours (DESC) by default.
    """
    # 1. Base Query: Fetch Accounts + Job Info + Activity Summary
    # We need: Account Info, Job Name, Active Status (is_online), Duration Stats
    
    # Check "Online" status: does the user have any session with time_out IS NULL?
    # We can do this with a subquery or join.
    
    query = """
        SELECT 
            a.id as account_id,
            a.school_id,
            CONCAT(a.first_name, ' ', a.last_name) as name,
            j.name as job_name,
            j.id as job_id,
            
            -- Calculate if online: count of active sessions for this user
            (SELECT COUNT(*) FROM job_activity ja_active 
             WHERE ja_active.account_id = a.id 
             AND ja_active.time_out IS NULL 
             AND ja_active.invalidated_at IS NULL) > 0 as is_online,
             
            -- Sum of time adjustments (in minutes)
            (SELECT COALESCE(SUM(adjustment_minutes), 0) FROM time_adjustments ta 
             WHERE ta.account_id = a.id) as adjustment_minutes,
             
            -- Activity Data for aggregation
            TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out) as duration_minutes,
            DATE(ja.time_in) as activity_date,
            YEARWEEK(ja.time_in, 1) as activity_week
            
        FROM accounts a
        LEFT JOIN account_jobs aj ON a.id = aj.account_id
        LEFT JOIN jobs j ON aj.job_id = j.id
        LEFT JOIN job_activity ja ON a.id = ja.account_id AND ja.invalidated_at IS NULL
        
        WHERE 1=1
    """
    
    params = []
    
    # Suspended filter
    if suspended == "false":
        query += " AND a.suspended_at IS NULL"
    elif suspended == "true":
        query += " AND a.suspended_at IS NOT NULL"
    # "all" shows both suspended and non-suspended
    
    # Role filter
    if role == "all":
        query += " AND a.role IN ('student', 'manager')"
    elif role in ('student', 'manager'):
        query += " AND a.role = %s"
        params.append(role)
    
    # Note: The above query joins activity. If a user has NO activity, they appear once (ja fields NULL).
    # If they have 100 activities, they appear 100 times.
    # We filter completed sessions for stats, but we still need the user row if no stats.
    
    # Additional WHERE clause filtering
    
    # Authorization Check & Scoping
    if user['role'] == 'student':
        # Students can only see themselves
        # We enforce filtering by their ID
        query += " AND a.id = %s"
        params.append(user['id'])
    else:
        # Admin/Manager filters
        if search:
            query += " AND (a.first_name LIKE %s OR a.last_name LIKE %s OR a.school_id LIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            
        if job_id:
            query += " AND j.id = %s"
            params.append(job_id)
        
    rows = await execute_query(query, params)
    
    # Aggregation in Python
    # Structure: { account_id: { name, job_name, is_online, total_minutes, adjustment_minutes, days, weeks } }
    stats_map = {}
    
    for row in rows:
        acc_id = row['account_id']
        
        # Apply Status Filter logic post-fetch or during map population
        is_online = bool(row['is_online'])
        
        if status == 'active' and not is_online:
            continue
        if status == 'inactive' and is_online:
            continue
            
        if acc_id not in stats_map:
            stats_map[acc_id] = {
                'name': row['name'],
                'school_id': row['school_id'],
                'job_name': row['job_name'],
                'is_online': is_online,
                'total_minutes': 0,
                'adjustment_minutes': row['adjustment_minutes'] or 0,  # From subquery
                'days': set(),
                'weeks': set()
            }
            
        data = stats_map[acc_id]
        
        # Only aggregate VALID completed activity
        # Check if this ROW corresponds to a completed activity
        if row['duration_minutes'] is not None:
             # Ensure we don't count active sessions or invalidated ones as "completed hours"
             # The join includes all activity. 
             # Wait, the query needs to be careful not to mix active session rows with null duration.
             # TIMESTAMPDIFF returns NULL if time_out is NULL.
             # So just check if duration_minutes is not None.
             data['total_minutes'] += row['duration_minutes']
             data['days'].add(row['activity_date'])
             data['weeks'].add(row['activity_week'])

    results = []
    for acc_id, data in stats_map.items():
        activity_hours = float(data['total_minutes']) / 60
        adjustment_hours = float(data['adjustment_minutes']) / 60
        total_hours = round(activity_hours + adjustment_hours, 2)
        
        num_days = len(data['days'])
        num_weeks = len(data['weeks'])
        
        avg_daily = round(activity_hours / num_days, 2) if num_days > 0 else 0.0
        avg_weekly = round(activity_hours / num_weeks, 2) if num_weeks > 0 else 0.0
        
        results.append(PerformanceStat(
            account_id=acc_id,
            name=data['name'],
            school_id=data['school_id'],
            job_name=data['job_name'],
            is_online=data['is_online'],
            total_rendered_hours=total_hours,
            avg_daily_hours=avg_daily,
            avg_weekly_hours=avg_weekly,
            adjustment_hours=round(adjustment_hours, 2),
            profile_picture=get_profile_picture_url(acc_id)
        ))
        
    # Sort by Total Rendered Hours (DESC), then Name (ASC)
    results.sort(key=lambda x: (-x.total_rendered_hours, x.name))
    
    return PerformanceResponse(items=results, total=len(results))

