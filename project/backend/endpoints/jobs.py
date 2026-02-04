"""
Job management endpoints for Core Attendance application.

Provides CRUD operations for jobs and job assignments.
"""

from datetime import datetime, timezone
import math
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional

from models.jobs import (
    JobCreate, JobUpdate, JobResponse, JobListResponse,
    JobAssign, AccountJobResponse, JobAssignBulk, JobUnassignBulk
)


from models.auth import MessageResponse
from utilities.database import execute_query, execute_one, execute_insert, execute_update
from utilities.dependencies import get_current_user, require_admin, require_admin_or_manager
from utilities.id_generator import generate_long_id


router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_admin_or_manager)
):
    """
    List all jobs with filtering and pagination.
    
    Admin and Manager roles only.
    """
    # Build query
    conditions = []
    params = []
    
    if department:
        conditions.append("department = %s")
        params.append(department)
    
    if search:
        conditions.append("(name LIKE %s OR description LIKE %s)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern] * 2)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_result = await execute_one(
        f"SELECT COUNT(*) as total FROM jobs WHERE {where_clause}",
        tuple(params)
    )
    total = count_result["total"]
    
    # Calculate pagination
    offset = (page - 1) * page_size
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Get jobs
    jobs = await execute_query(
        f"""
        SELECT 
            id, department, name, description, created_at, updated_at,
            (SELECT COUNT(*) FROM account_jobs WHERE job_id = jobs.id) as member_count
        FROM jobs 
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (page_size, offset)
    )
    
    return JobListResponse(
        items=[JobResponse(**job) for job in jobs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get a specific job by ID.
    
    Admin and Manager roles only.
    """
    job = await execute_one(
        """
        SELECT id, department, name, description, created_at, updated_at
        FROM jobs 
        WHERE id = %s
        """,
        (job_id,)
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return JobResponse(**job)


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobCreate,
    user: dict = Depends(require_admin)
):
    """
    Create a new job.
    
    Admin role only.
    """
    # Generate unique ID
    job_id = generate_long_id()
    
    # Insert job
    now = datetime.now(timezone.utc)
    await execute_insert(
        """
        INSERT INTO jobs (id, department, name, description, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (job_id, data.department, data.name, data.description, now, now)
    )
    
    return await get_job(job_id, user)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    data: JobUpdate,
    user: dict = Depends(require_admin)
):
    """
    Update a job.
    
    Admin role only.
    """
    # Check if job exists
    existing = await execute_one(
        "SELECT id FROM jobs WHERE id = %s",
        (job_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Build update query
    updates = []
    params = []
    
    if data.department is not None:
        updates.append("department = %s")
        params.append(data.department)
    
    if data.name is not None:
        updates.append("name = %s")
        params.append(data.name)
    
    if data.description is not None:
        updates.append("description = %s")
        params.append(data.description)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Add updated_at
    updates.append("updated_at = %s")
    params.append(datetime.now(timezone.utc))
    params.append(job_id)
    
    await execute_update(
        f"UPDATE jobs SET {', '.join(updates)} WHERE id = %s",
        tuple(params)
    )
    
    return await get_job(job_id, user)


@router.delete("/{job_id}", response_model=MessageResponse)
async def delete_job(
    job_id: str,
    user: dict = Depends(require_admin)
):
    """
    Delete a job.
    
    Admin role only.
    """
    # Check if job exists
    existing = await execute_one(
        "SELECT id FROM jobs WHERE id = %s",
        (job_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Delete job (cascades to account_jobs)
    await execute_update(
        "DELETE FROM jobs WHERE id = %s",
        (job_id,)
    )
    
    return MessageResponse(message="Job deleted successfully")


@router.get("/{job_id}/assignments", response_model=list[AccountJobResponse])
async def list_job_assignments(
    job_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    List all accounts assigned to a job.
    
    Admin and Manager roles only.
    """
    # Check if job exists
    job = await execute_one(
        "SELECT id, name FROM jobs WHERE id = %s",
        (job_id,)
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get assignments
    assignments = await execute_query(
        """
        SELECT aj.account_id, aj.job_id, aj.assigned_at, aj.assigned_by, aj.expires_at,
               CONCAT(a.first_name, ' ', a.last_name) as account_name,
               j.name as job_name,
               a.department
        FROM account_jobs aj
        JOIN accounts a ON aj.account_id = a.id
        JOIN jobs j ON aj.job_id = j.id
        WHERE aj.job_id = %s
        ORDER BY aj.assigned_at DESC
        """,
        (job_id,)
    )
    
    return [AccountJobResponse(**a) for a in assignments]


@router.post("/{job_id}/assign", response_model=AccountJobResponse)
async def assign_job(
    job_id: str,
    data: JobAssign,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Assign a job to an account.
    
    Note: One student can only have one job (enforced at application level).
    
    Admin and Manager roles only.
    """
    # Check if job exists
    job = await execute_one(
        "SELECT id, name FROM jobs WHERE id = %s",
        (job_id,)
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if account exists and is a student
    account = await execute_one(
        """
        SELECT id, role, first_name, last_name 
        FROM accounts 
        WHERE id = %s
        """,
        (data.account_id,)
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if account["role"] not in ["student", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student and manager accounts can be assigned to jobs"
        )
    
    # Check if student already has a job
    existing_job = await execute_one(
        "SELECT job_id FROM account_jobs WHERE account_id = %s",
        (data.account_id,)
    )
    
    if existing_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student already has a job assigned. Please unassign first."
        )
    
    # Create assignment
    now = datetime.now(timezone.utc)
    await execute_insert(
        """
        INSERT INTO account_jobs (account_id, job_id, assigned_by, expires_at, assigned_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (data.account_id, job_id, user["id"], data.expires_at, now)
    )
    
    return AccountJobResponse(
        account_id=data.account_id,
        job_id=job_id,
        account_name=f"{account['first_name'] or ''} {account['last_name'] or ''}".strip() or None,
        job_name=job["name"],
        assigned_at=now,
        assigned_by=user["id"],
        expires_at=data.expires_at
    )


@router.delete("/{job_id}/unassign/{account_id}", response_model=MessageResponse)
async def unassign_job(
    job_id: str,
    account_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Unassign a job from an account.
    
    Admin and Manager roles only.
    """
    # Check if assignment exists
    existing = await execute_one(
        "SELECT account_id FROM account_jobs WHERE job_id = %s AND account_id = %s",
        (job_id, account_id)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Delete assignment
    await execute_update(
        "DELETE FROM account_jobs WHERE job_id = %s AND account_id = %s",
        (job_id, account_id)
    )
    
    return MessageResponse(message="Job unassigned successfully")


@router.post("/{job_id}/assign/bulk", response_model=MessageResponse)
async def assign_job_bulk(
    job_id: str,
    data: JobAssignBulk,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Bulk assign a job to multiple accounts.
    Ignores accounts that are not students or already have assignments.
    """
    # Check job
    job = await execute_one("SELECT id FROM jobs WHERE id = %s", (job_id,))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    success_count = 0
    now = datetime.now(timezone.utc)

    for account_id in data.account_ids:
        # Check account role
        account = await execute_one(
            "SELECT role FROM accounts WHERE id = %s", 
            (account_id,)
        )
        if not account or account["role"] not in ["student", "manager"]:
            continue

        # Check existing assignment
        existing = await execute_one(
            "SELECT job_id FROM account_jobs WHERE account_id = %s",
            (account_id,)
        )
        if existing:
            continue

        # Create assignment
        await execute_insert(
            """
            INSERT INTO account_jobs (account_id, job_id, assigned_by, expires_at, assigned_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (account_id, job_id, user["id"], data.expires_at, now)
        )
        success_count += 1

    return MessageResponse(message=f"Successfully assigned {success_count} students")


@router.post("/{job_id}/unassign/bulk", response_model=MessageResponse)
async def unassign_job_bulk(
    job_id: str,
    data: JobUnassignBulk,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Bulk unassign a job from multiple accounts.
    """
    if not data.account_ids:
        return MessageResponse(message="No accounts selected")

    # Delete assignments
    # Using ANY() for bulk delete
    placeholders = ",".join(["%s"] * len(data.account_ids))
    query = f"DELETE FROM account_jobs WHERE job_id = %s AND account_id IN ({placeholders})"
    
    await execute_update(query, (job_id, *data.account_ids))
    
    return MessageResponse(message="Successfully unassigned selected students")
