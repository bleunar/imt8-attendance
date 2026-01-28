"""
Pydantic models for time adjustments.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TimeAdjustmentCreate(BaseModel):
    """Request model for creating a time adjustment."""
    account_id: int
    adjustment_minutes: int  # Positive = add time, Negative = deduct time
    reason: str


class TimeAdjustmentResponse(BaseModel):
    """Response model for a time adjustment."""
    id: int
    account_id: int
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    adjustment_minutes: int
    reason: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TimeAdjustmentListResponse(BaseModel):
    """Paginated response for listing time adjustments."""
    items: list[TimeAdjustmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
