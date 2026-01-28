"""
Pydantic models for jobs.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):
    """Request model for creating a job."""
    department: Optional[str] = None
    name: str
    description: Optional[str] = None


class JobUpdate(BaseModel):
    """Request model for updating a job."""
    department: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class JobResponse(BaseModel):
    """Response model for job data."""
    id: int
    department: Optional[str] = None
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    member_count: int = 0
    
    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Response model for paginated job list."""
    items: list[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class JobAssign(BaseModel):
    """Request model for assigning a job to an account."""
    account_id: int
    expires_at: Optional[datetime] = None


class JobAssignBulk(BaseModel):
    """Request model for bulk assigning jobs."""
    account_ids: list[int]
    expires_at: Optional[datetime] = None


class JobUnassignBulk(BaseModel):
    """Request model for bulk unassigning jobs."""
    account_ids: list[int]


class AccountJobResponse(BaseModel):
    """Response model for account-job assignment."""
    account_id: int
    job_id: int
    account_name: Optional[str] = None
    job_name: Optional[str] = None
    assigned_at: datetime
    assigned_by: Optional[int] = None
    expires_at: Optional[datetime] = None
    department: Optional[str] = None
