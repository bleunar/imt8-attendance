"""
Leaderboard endpoints for Core Attendance application.
"""

from fastapi import APIRouter, Depends
from typing import List
from utilities.database import execute_query
from utilities.dependencies import get_current_user
from utilities.storage import get_profile_picture_url

router = APIRouter(prefix="/leaderboards", tags=["Leaderboards"])


@router.get("/top-performers")
async def get_top_performers(
    limit: int = 50,
    date_from: str | None = None,
    date_to: str | None = None,
    user: dict = Depends(get_current_user)
):
    """
    Get top performing students based on total time rendered.
    Accessible to all authenticated users.
    
    Args:
        limit: Number of top performers to return (default: 50, max: 100)
        date_from: Optional start date filter (YYYY-MM-DD)
        date_to: Optional end date filter (YYYY-MM-DD)
    
    Returns:
        List of students sorted by total time rendered (descending)
    """
    # Cap the limit to prevent abuse
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 10
    
    # Build date filter condition
    date_filter = ""
    params = []
    
    if date_from and date_to:
        date_filter = "AND DATE(ja.time_in) BETWEEN %s AND %s"
        params = [date_from, date_to, limit]
    else:
        params = [limit]
    
    query = f"""
        SELECT 
            a.id,
            a.school_id,
            CONCAT(a.first_name, ' ', a.last_name) as name,
            a.first_name,
            a.last_name,
            j.name as job_name,
            j.id as job_id,
            
            -- Total time from completed activities (not invalidated)
            COALESCE(SUM(
                CASE 
                    WHEN ja.time_out IS NOT NULL AND YEAR(ja.time_out) > 0
                    THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                    ELSE 0
                END
            ), 0) as total_minutes,
            
            -- Time adjustments (filtered by date if provided)
            COALESCE((
                SELECT SUM(adjustment_minutes) 
                FROM time_adjustments ta
                WHERE ta.account_id = a.id
                {f"AND DATE(ta.created_at) BETWEEN '{date_from}' AND '{date_to}'" if date_from and date_to else ""}
            ), 0) as adjustment_minutes,
            
            -- Count of completed activities
            COUNT(CASE 
                WHEN ja.time_out IS NOT NULL AND YEAR(ja.time_out) > 0
                THEN 1 
            END) as completed_count,
            
            -- Check if currently online
            (SELECT COUNT(*) FROM job_activity ja_online 
             WHERE ja_online.account_id = a.id 
             AND (ja_online.time_out IS NULL OR YEAR(ja_online.time_out) = 0)
             AND ja_online.invalidated_at IS NULL) > 0 as is_online
             
        FROM accounts a
        LEFT JOIN account_jobs aj ON a.id = aj.account_id
        LEFT JOIN jobs j ON aj.job_id = j.id
        LEFT JOIN job_activity ja ON a.id = ja.account_id 
            AND ja.invalidated_at IS NULL
            {date_filter}
        
        WHERE a.role = 'student'
          AND a.suspended_at IS NULL
        
        GROUP BY a.id, a.school_id, a.first_name, a.last_name, j.name, j.id
        HAVING (
            COALESCE(SUM(
                CASE 
                    WHEN ja.time_out IS NOT NULL AND YEAR(ja.time_out) > 0
                    THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                    ELSE 0
                END
            ), 0) + 
            COALESCE((
                SELECT SUM(adjustment_minutes) 
                FROM time_adjustments ta
                WHERE ta.account_id = a.id
                {f"AND DATE(ta.created_at) BETWEEN '{date_from}' AND '{date_to}'" if date_from and date_to else ""}
            ), 0)
        ) > 0
        ORDER BY (
            COALESCE(SUM(
                CASE 
                    WHEN ja.time_out IS NOT NULL AND YEAR(ja.time_out) > 0
                    THEN TIMESTAMPDIFF(MINUTE, ja.time_in, ja.time_out)
                    ELSE 0
                END
            ), 0) + 
            COALESCE((
                SELECT SUM(adjustment_minutes) 
                FROM time_adjustments ta
                WHERE ta.account_id = a.id
                {f"AND DATE(ta.created_at) BETWEEN '{date_from}' AND '{date_to}'" if date_from and date_to else ""}
            ), 0)
        ) DESC
        LIMIT %s
    """
    
    results = await execute_query(query, tuple(params))
    
    # Format results
    leaderboard = []
    for idx, row in enumerate(results, start=1):
        total_time = row["total_minutes"] + row["adjustment_minutes"]
        hours = total_time // 60
        minutes = total_time % 60
        
        leaderboard.append({
            "rank": idx,
            "id": row["id"],
            "school_id": row["school_id"],
            "name": row["name"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "profile_picture": get_profile_picture_url(row["id"]),
            "job_name": row["job_name"],
            "job_id": row["job_id"],
            "total_minutes": total_time,
            "total_hours": hours,
            "total_hours_formatted": f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m",
            "completed_count": row["completed_count"],
            "is_online": bool(row["is_online"])
        })
    
    return leaderboard
