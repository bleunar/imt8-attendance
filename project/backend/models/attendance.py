"""
Pydantic models for attendance.
"""

from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import datetime


class PunchRequest(BaseModel):
    """Request model for time in/out punch."""
    school_id: str
    force_early_timeout: bool = False


class PunchResponse(BaseModel):
    """Response model for punch action."""
    status: Literal["time_in", "time_out"]
    timestamp: datetime
    title: str
    message: str
    student_name: Optional[str] = None
    profile_picture: Optional[str] = None


class ActivityRecord(BaseModel):
    """Response model for a single activity record."""
    id: int
    account_id: str
    account_name: Optional[str] = None
    account_profile_picture: Optional[str] = None
    school_id: Optional[str] = None
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    duration_minutes: Optional[int] = None  # Calculated on-the-fly
    properties: Optional[dict] = None
    invalidated_at: Optional[datetime] = None
    invalidation_notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    """Response model for paginated activity list."""
    items: list[ActivityRecord]
    total: int
    page: int
    page_size: int
    total_pages: int


class StudentSummary(BaseModel):
    """Summary of a student's total time."""
    account_id: str
    account_name: str
    school_id: Optional[str] = None
    total_sessions: int
    total_minutes: int
    total_hours: float


class AttendanceSummaryResponse(BaseModel):
    """Response model for attendance summary."""
    items: list[StudentSummary]
    total: int
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class ActivityUpdate(BaseModel):
    """Request model for updating an activity."""
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
    invalidation_notes: Optional[str] = None


class ActivityInvalidate(BaseModel):
    """Request model for invalidating an activity."""
    notes: str


# Bulk Operations
class BulkActionRequest(BaseModel):
    """Base request for bulk actions."""
    ids: List[int]

class BulkInvalidateRequest(BulkActionRequest):
    """Request for bulk invalidation."""
    notes: str

class BulkAdjustRequest(BulkActionRequest):
    """Request for bulk time adjustment."""
    time_in: Optional[datetime] = None
    time_out: Optional[datetime] = None
