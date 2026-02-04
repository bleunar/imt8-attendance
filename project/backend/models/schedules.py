from datetime import date, datetime, time
from typing import Optional, List
from pydantic import BaseModel, Field

# Shared Models
class ScheduleBase(BaseModel):
    weekdays: List[int] = Field(..., description="List of weekdays (0=Mon, 6=Sun) or (1=Mon, 7=Sun) depending on FE logic. Usually 0-6 in Py, 1-7 in DB/JS maybe? Let's assume 1-7 for DB if that was the comment, or just list.")

class StudentScheduleResponse(BaseModel):
    id: int
    account_id: str
    weekdays: List[int]
    created_at: datetime
    updated_at: datetime

class ScheduleOverrideBase(BaseModel):
    date: date
    request_notes: str

class ScheduleRequestCreate(ScheduleOverrideBase):
    pass

class ScheduleOverrideResponse(BaseModel):
    id: int
    account_id: str
    date: date
    request_notes: str
    response_notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    manager_id: Optional[str] = None
    created_at: datetime
    
    # Computed status for convenience, though frontend can derive
    status: str

    class Config:
        from_attributes = True

class ManagerScheduleReview(BaseModel):
    response_notes: Optional[str] = None
