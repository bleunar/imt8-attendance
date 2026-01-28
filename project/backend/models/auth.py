"""
Pydantic models for authentication.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    """Request model for user login."""
    identifier: str  # Can be email or school_id
    password: str


class TokenResponse(BaseModel):
    """Response model for access token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until expiration


class RefreshResponse(BaseModel):
    """Response model for token refresh."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RecoveryRequest(BaseModel):
    """Request model for password recovery."""
    email: EmailStr


class RecoveryVerify(BaseModel):
    """Request model to verify OTP and reset password."""
    email: EmailStr
    otp: str
    new_password: str


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
