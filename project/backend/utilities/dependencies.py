"""
FastAPI dependencies for Core Attendance application.

Provides authentication and authorization dependencies for route handlers.
"""

from typing import Optional, List, Callable
from functools import wraps
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.auth import verify_access_token
from utilities.database import execute_one


# Security scheme for JWT bearer tokens
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user.
    
    Validates the access token and returns the user data.
    
    Raises:
        HTTPException: If token is missing, invalid, or user not found
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify the token
    payload = verify_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = await execute_one(
        """
        SELECT id, role, department, school_id, email, 
               first_name, middle_name, last_name, suspended_at
        FROM accounts 
        WHERE id = %s
        """,
        (user_id,)
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if user.get("suspended_at"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Dependency to optionally get the current user.
    
    Returns None if not authenticated instead of raising an exception.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory for role-based access control.
    
    Args:
        allowed_roles: List of roles that are allowed to access the endpoint
    
    Returns:
        A dependency function that validates user roles
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: dict = Depends(require_roles(["admin"]))):
            return {"message": "Admin access granted"}
    """
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return user
    
    return role_checker


# Pre-defined role dependencies for convenience
require_admin = require_roles(["admin"])
require_admin_or_manager = require_roles(["admin", "manager"])
require_any_role = require_roles(["admin", "manager", "student"])
