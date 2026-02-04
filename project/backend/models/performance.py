"""
Pydantic models for performance dashboard.
"""

from pydantic import BaseModel
from typing import Optional


class PerformanceStat(BaseModel):
    """
    Performance statistics for a student.
    """
    account_id: str
    name: str
    total_rendered_hours: float
    avg_daily_hours: float
    avg_weekly_hours: float
    adjustment_hours: float = 0.0  # Hours from time_adjustments table
    job_name: Optional[str] = None
    school_id: Optional[str] = None
    is_online: bool = False
    profile_picture: Optional[str] = None
    
    class Config:
        from_attributes = True


class PerformanceResponse(BaseModel):
    """
    Response model for performance endpoint.
    """
    items: list[PerformanceStat]
    total: int
