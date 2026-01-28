"""
JWT token management for Core Attendance application.

Handles creation and verification of access and refresh tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Response

from config import settings


def create_access_token(user_id: int, role: str, email: str) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: The user's database ID
        role: The user's role
        email: The user's email
    
    Returns:
        Encoded JWT access token string
    """
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_ACCESS_EXPIRY)
    
    payload = {
        "sub": str(user_id),
        "role": role,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        user_id: The user's database ID
    
    Returns:
        Encoded JWT refresh token string
    """
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_EXPIRY)
    
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> Optional[dict]:
    """
    Verify and decode an access token.
    
    Args:
        token: The JWT token string
    
    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Verify it's an access token
        if payload.get("type") != "access":
            return None
        
        return payload
        
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    """
    Verify and decode a refresh token.
    
    Args:
        token: The JWT token string
    
    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None
        
        return payload
        
    except JWTError:
        return None


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Set the refresh token as an HTTP-only cookie.
    
    Args:
        response: FastAPI Response object
        refresh_token: The refresh token to set
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.JWT_REFRESH_EXPIRY,
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    """
    Clear the refresh token cookie.
    
    Args:
        response: FastAPI Response object
    """
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
