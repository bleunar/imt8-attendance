"""
Time adjustments endpoints for Core Attendance application.
Allows managers/admins to add or deduct time for students.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from models.time_adjustment import (
    TimeAdjustmentCreate,
    TimeAdjustmentResponse,
    TimeAdjustmentListResponse
)
from utilities.database import execute_query, execute_insert, execute_update
from utilities.dependencies import require_admin_or_manager, require_admin, get_current_user
import math

router = APIRouter(prefix="/time-adjustments", tags=["Time Adjustments"])


@router.post("/", response_model=TimeAdjustmentResponse)
async def create_adjustment(
    data: TimeAdjustmentCreate,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Create a new time adjustment for a student.
    
    - Positive adjustment_minutes = add time (e.g., overtime)
    - Negative adjustment_minutes = deduct time (e.g., late)
    
    Admin/Manager only.
    """
    # Verify target account exists and is a student
    account_query = "SELECT id, role FROM accounts WHERE id = %s"
    accounts = await execute_query(account_query, [data.account_id])
    
    if not accounts:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if accounts[0]['role'] != 'student':
        raise HTTPException(status_code=400, detail="Adjustments can only be made for student accounts")
    
    # Insert the adjustment
    insert_query = """
        INSERT INTO time_adjustments (account_id, manager_id, adjustment_minutes, reason)
        VALUES (%s, %s, %s, %s)
    """
    adjustment_id = await execute_insert(insert_query, [
        data.account_id,
        user['id'],
        data.adjustment_minutes,
        data.reason
    ])
    
    # Fetch the created record with manager name
    fetch_query = """
        SELECT 
            ta.id,
            ta.account_id,
            ta.manager_id,
            CONCAT(a.first_name, ' ', a.last_name) as manager_name,
            ta.adjustment_minutes,
            ta.reason,
            ta.created_at
        FROM time_adjustments ta
        LEFT JOIN accounts a ON ta.manager_id = a.id
        WHERE ta.id = %s
    """
    result = await execute_query(fetch_query, [adjustment_id])
    
    return TimeAdjustmentResponse(**result[0])


@router.get("/", response_model=TimeAdjustmentListResponse)
async def list_adjustments(
    account_id: str | None = Query(None, description="Filter by student account ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """
    List time adjustments.
    
    - Admin/Manager: Can view all or filter by account_id.
    - Student: Can only view their own adjustments.
    """
    # Authorization
    if user['role'] == 'student':
        # Students can only see their own adjustments
        account_id = user['id']
    
    # Build query
    base_query = """
        SELECT 
            ta.id,
            ta.account_id,
            ta.manager_id,
            CONCAT(a.first_name, ' ', a.last_name) as manager_name,
            ta.adjustment_minutes,
            ta.reason,
            ta.created_at
        FROM time_adjustments ta
        LEFT JOIN accounts a ON ta.manager_id = a.id
    """
    
    count_query = "SELECT COUNT(*) as total FROM time_adjustments ta"
    
    where_clause = ""
    params = []
    
    if account_id:
        where_clause = " WHERE ta.account_id = %s"
        params.append(account_id)
    
    # Get total count
    count_result = await execute_query(count_query + where_clause, params)
    total = count_result[0]['total']
    
    # Pagination
    offset = (page - 1) * page_size
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Fetch items
    order_clause = " ORDER BY ta.created_at DESC"
    limit_clause = " LIMIT %s OFFSET %s"
    
    items_query = base_query + where_clause + order_clause + limit_clause
    items = await execute_query(items_query, params + [page_size, offset])
    
    return TimeAdjustmentListResponse(
        items=[TimeAdjustmentResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.delete("/{adjustment_id}")
async def delete_adjustment(
    adjustment_id: int,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Delete a time adjustment.
    
    Admin/Manager only.
    """
    # Check if adjustment exists
    check_query = "SELECT id FROM time_adjustments WHERE id = %s"
    existing = await execute_query(check_query, [adjustment_id])
    
    if not existing:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    # Delete
    delete_query = "DELETE FROM time_adjustments WHERE id = %s"
    await execute_update(delete_query, [adjustment_id])
    
    return {"message": "Adjustment deleted successfully"}
