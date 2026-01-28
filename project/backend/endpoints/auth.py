"""
Authentication endpoints for Core Attendance application.

Provides login, logout, token refresh, and password recovery.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from typing import Optional

from models.auth import (
    LoginRequest, TokenResponse, RefreshResponse,
    RecoveryRequest, RecoveryVerify, MessageResponse
)
from core.auth import (
    create_access_token, create_refresh_token,
    verify_refresh_token, set_refresh_cookie, clear_refresh_cookie
)
from core.security import verify_password, hash_password, generate_otp
from utilities.database import execute_one, execute_update
from utilities.email import EmailService
from utilities.dependencies import get_current_user
from config import settings


from utilities.otp import get_otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Get OTP Service
otp_service = get_otp_service()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response):
    """
    Authenticate user and return access token.
    
    Accepts email or school_id as identifier.
    Sets refresh token as HTTP-only cookie.
    """
    # Try to find user by email or school_id
    user = await execute_one(
        """
        SELECT id, role, email, password_hash, suspended_at
        FROM accounts 
        WHERE email = %s OR school_id = %s
        """,
        (request.identifier, request.identifier)
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if suspended
    if user.get("suspended_at"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create tokens
    access_token = create_access_token(
        user_id=user["id"],
        role=user["role"],
        email=user["email"]
    )
    refresh_token = create_refresh_token(user_id=user["id"])
    
    # Set refresh token cookie
    set_refresh_cookie(response, refresh_token)
    
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_EXPIRY
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response, user: dict = Depends(get_current_user)):
    """
    Logout user by clearing refresh token cookie.
    """
    clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: Request, response: Response):
    """
    Refresh access token using refresh token cookie.
    """
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # Verify refresh token
    payload = verify_refresh_token(refresh_token)
    if not payload:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Get user from database
    user_id = payload.get("sub")
    user = await execute_one(
        """
        SELECT id, role, email, suspended_at
        FROM accounts 
        WHERE id = %s
        """,
        (user_id,)
    )
    
    if not user:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if user.get("suspended_at"):
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    # Create new tokens
    access_token = create_access_token(
        user_id=user["id"],
        role=user["role"],
        email=user["email"]
    )
    new_refresh_token = create_refresh_token(user_id=user["id"])
    
    # Set new refresh token cookie
    set_refresh_cookie(response, new_refresh_token)
    
    return RefreshResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_EXPIRY
    )


@router.post("/recovery/request", response_model=MessageResponse)
async def request_recovery(request: RecoveryRequest):
    """
    Request password recovery OTP via email.
    """
    # Find user by email
    user = await execute_one(
        """
        SELECT id, email, first_name, last_name
        FROM accounts 
        WHERE email = %s
        """,
        (request.email,)
    )
    
    # Always return success to prevent email enumeration
    if not user:
        return MessageResponse(
            message="If the email exists, a recovery OTP has been sent."
        )
    
    # Generate OTP
    otp = generate_otp(6)
    
    # Store OTP with 10 minute expiration
    otp_service.set_otp(request.email, otp, expiry_seconds=600)
    
    # Get user name
    name = user.get("first_name") or "User"
    if user.get("last_name"):
        name = f"{name} {user['last_name']}"
    
    # Send recovery email
    await EmailService.send_recovery_email(
        to=request.email,
        otp=otp,
        name=name
    )
    
    return MessageResponse(
        message="If the email exists, a recovery OTP has been sent."
    )


@router.post("/recovery/verify", response_model=MessageResponse)
async def verify_recovery(request: RecoveryVerify):
    """
    Verify OTP and reset password.
    """
    # Get stored OTP
    stored_otp = otp_service.get_otp(request.email)
    
    if not stored_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new one."
        )
    
    # Verify OTP
    if stored_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # Update password
    password_hash = hash_password(request.new_password)
    rows_updated = await execute_update(
        """
        UPDATE accounts 
        SET password_hash = %s, password_last_updated = NOW()
        WHERE email = %s
        """,
        (password_hash, request.email)
    )
    
    if rows_updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Clear OTP
    # Clear OTP
    otp_service.delete_otp(request.email)
    
    return MessageResponse(
        message="Password has been reset successfully. Please login with your new password."
    )

