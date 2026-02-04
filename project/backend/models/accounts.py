"""
Pydantic models for accounts.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import date, datetime


class AccountCreate(BaseModel):
    """Request model for creating an account."""
    role: Literal["admin", "manager", "student"]
    department: Optional[str] = None
    school_id: Optional[str] = None
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    course: Optional[str] = None
    year_level: Optional[float] = None


class AccountUpdate(BaseModel):
    """Request model for updating an account."""
    role: Optional[Literal["admin", "manager", "student"]] = None
    department: Optional[str] = None
    school_id: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    course: Optional[str] = None
    year_level: Optional[float] = None


class AccountResponse(BaseModel):
    """Response model for account data."""
    id: str
    role: str
    department: Optional[str] = None
    school_id: Optional[str] = None
    email: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    course: Optional[str] = None
    year_level: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    current_job: Optional[str] = None
    profile_picture: Optional[str] = None  # URL to profile picture
    
    class Config:
        from_attributes = True


class AccountListResponse(BaseModel):
    """Response model for paginated account list."""
    items: list[AccountResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProfileUpdate(BaseModel):
    """Request model for updating own profile."""
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year_level: Optional[float] = None


class PasswordUpdate(BaseModel):
    """Request model for updating password."""
    current_password: str
    new_password: str
