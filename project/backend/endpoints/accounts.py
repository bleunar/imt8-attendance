"""
Account management endpoints for Core Attendance application.

Provides CRUD operations for user accounts.
"""

import math
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from typing import Optional

from models.accounts import (
    AccountCreate, AccountUpdate, AccountResponse, AccountListResponse,
    ProfileUpdate, PasswordUpdate
)
from models.auth import MessageResponse
from core.security import hash_password, verify_password
from utilities.database import execute_query, execute_one, execute_insert, execute_update
from utilities.dependencies import get_current_user, require_admin, require_admin_or_manager
from utilities.storage import (
    save_profile_picture, delete_profile_picture, get_profile_picture_url,
    validate_image, MAX_FILE_SIZE, ALLOWED_CONTENT_TYPES
)
from utilities.id_generator import generate_long_id


router = APIRouter(prefix="/accounts", tags=["Accounts"])



@router.get("", response_model=AccountListResponse)
async def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_admin_or_manager)
):
    """
    List all accounts with filtering and pagination.
    
    Admin and Manager roles only.
    """
    # Build query
    conditions = []
    params = []
    
    if role:
        if "," in role:
            # Handle multiple roles (e.g. "student,manager")
            roles = [r.strip() for r in role.split(",")]
            placeholders = ", ".join(["%s"] * len(roles))
            conditions.append(f"role IN ({placeholders})")
            params.extend(roles)
        else:
            conditions.append("role = %s")
            params.append(role)
    
    if department:
        conditions.append("department = %s")
        params.append(department)
    
    if search:
        conditions.append(
            "(email LIKE %s OR first_name LIKE %s OR last_name LIKE %s OR school_id LIKE %s)"
        )
        search_pattern = f"%{search}%"
        params.extend([search_pattern] * 4)

    # Restrict visibility for managers (cannot see admins)
    if user["role"] == "manager":
        conditions.append("role != 'admin'")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_result = await execute_one(
        f"SELECT COUNT(*) as total FROM accounts WHERE {where_clause}",
        tuple(params)
    )
    total = count_result["total"]
    
    # Calculate pagination
    offset = (page - 1) * page_size
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Get accounts
    accounts = await execute_query(
        f"""
        SELECT a.id, a.role, a.department, a.school_id, a.email, 
               a.first_name, a.middle_name, a.last_name, a.birth_date, a.gender, a.course, a.year_level,
               a.created_at, a.updated_at, a.suspended_at,
               (
                   SELECT j.name 
                   FROM account_jobs aj 
                   JOIN jobs j ON aj.job_id = j.id 
                   WHERE aj.account_id = a.id 
                   ORDER BY aj.assigned_at DESC 
                   LIMIT 1
               ) as current_job
        FROM accounts a
        WHERE {where_clause}
        ORDER BY a.created_at DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (page_size, offset)
    )
    
    # Add profile picture URL to each account
    for acc in accounts:
        acc["profile_picture"] = get_profile_picture_url(acc["id"])
    
    return AccountListResponse(
        items=[AccountResponse(**acc) for acc in accounts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/profile", response_model=AccountResponse)
async def get_profile(user: dict = Depends(get_current_user)):
    """
    Get current user's profile.
    """
    account = await execute_one(
        """
        SELECT id, role, department, school_id, email, 
               first_name, middle_name, last_name, birth_date, gender, course, year_level,
               created_at, updated_at, suspended_at
        FROM accounts 
        WHERE id = %s
        """,
        (user["id"],)
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Add profile picture URL
    account["profile_picture"] = get_profile_picture_url(account["id"])
    
    return AccountResponse(**account)


@router.put("/profile", response_model=AccountResponse)
async def update_profile(
    data: ProfileUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update current user's profile.
    
    Users can only update their own basic information.
    """
    
    # 1. Role-based restrictions
    if user["role"] == "student":
        # Students can ONLY update gender and birth_date
        # We ignore other fields if sent, or we could raise 403.
        # Given potential frontend confusion, ignoring is often safer, BUT
        # for security, we should ensure no other fields are processed.
        
        # Explicitly clear restricted fields from data for students
        data.first_name = None
        data.middle_name = None
        data.last_name = None
        data.department = None
        data.course = None
        data.year_level = None
        data.email = None
        data.school_id = None
    
    # 2. Build update query
    updates = []
    params = []
    
    # Common fields (allowed for everyone)
    if data.gender is not None:
        updates.append("gender = %s")
        params.append(data.gender)

    if data.birth_date is not None:
        updates.append("birth_date = %s")
        params.append(data.birth_date)
        
    # Admin/Manager fields
    if user["role"] != "student":
        if data.first_name is not None and data.first_name.strip():
            updates.append("first_name = %s")
            params.append(data.first_name)
        
        if data.middle_name is not None:
            updates.append("middle_name = %s")
            params.append(data.middle_name)
        
        if data.last_name is not None and data.last_name.strip():
            updates.append("last_name = %s")
            params.append(data.last_name)

        if data.department is not None and data.department.strip():
            updates.append("department = %s")
            params.append(data.department)

        if data.course is not None and data.course.strip():
            updates.append("course = %s")
            params.append(data.course)

        if data.year_level is not None:
            updates.append("year_level = %s")
            params.append(data.year_level)
            
        if data.email is not None and data.email.strip():
            # Check uniqueness
            check = await execute_one(
                "SELECT id FROM accounts WHERE email = %s AND id != %s",
                (data.email, user["id"])
            )
            if check:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            updates.append("email = %s")
            params.append(data.email)
            
        if data.school_id is not None and data.school_id.strip():
            # Check uniqueness
            check = await execute_one(
                "SELECT id FROM accounts WHERE school_id = %s AND id != %s",
                (data.school_id, user["id"])
            )
            if check:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="School ID already registered"
                )
            updates.append("school_id = %s")
            params.append(data.school_id)
    
    if not updates:
        # It's possible a student sent only restricted fields, effectively resulting in no updates
        # In this case we can just return the current profile without error
        return await get_profile(user)
    
    # Add updated_at
    updates.append("updated_at = %s")
    params.append(datetime.now(timezone.utc))
    params.append(user["id"])
    
    await execute_update(
        f"UPDATE accounts SET {', '.join(updates)} WHERE id = %s",
        tuple(params)
    )
    
    return await get_profile(user)


@router.put("/profile/password", response_model=MessageResponse)
async def update_password(
    data: PasswordUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update current user's password.
    """
    # Get current password hash
    account = await execute_one(
        "SELECT password_hash FROM accounts WHERE id = %s",
        (user["id"],)
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Verify current password
    if not verify_password(data.current_password, account["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_hash = hash_password(data.new_password)
    now = datetime.now(timezone.utc)
    await execute_update(
        """
        UPDATE accounts 
        SET password_hash = %s, password_last_updated = %s, updated_at = %s
        WHERE id = %s
        """,
        (new_hash, now, now, user["id"])
    )
    
    return MessageResponse(message="Password updated successfully")


# ============================================================================
# Profile Picture Endpoints
# ============================================================================

@router.post("/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload a profile picture for the current user.
    
    The image will be converted to WebP format and saved as {user_id}.webp.
    Maximum file size: 5MB. Allowed types: JPEG, PNG, WebP, GIF.
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
        )
    
    # Read file content
    file_bytes = await file.read()
    
    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size: 5MB"
        )
    
    # Save profile picture
    try:
        picture_url = save_profile_picture(user["id"], file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile picture: {str(e)}"
        )
    
    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": picture_url
    }


@router.delete("/profile/picture")
async def remove_own_profile_picture(
    user: dict = Depends(get_current_user)
):
    """
    Remove the current user's profile picture.
    """
    deleted = delete_profile_picture(user["id"])
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile picture found"
        )
    
    return {"message": "Profile picture removed successfully"}


@router.delete("/{account_id}/picture")
async def remove_user_profile_picture(
    account_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Remove a user's profile picture (admin/manager only).
    """
    # Check if account exists
    existing = await execute_one(
        "SELECT id, role FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Permission check for Managers
    if user["role"] == "manager" and existing["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only manage Student accounts"
        )
    
    deleted = delete_profile_picture(account_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile picture found for this user"
        )
    
    return {"message": "Profile picture removed successfully"}


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Get a specific account by ID.
    
    Admin and Manager roles only.
    """
    account = await execute_one(
        """
        SELECT id, role, department, school_id, email, 
               first_name, middle_name, last_name, birth_date, gender, course, year_level,
               created_at, updated_at, suspended_at
        FROM accounts 
        WHERE id = %s
        """,
        (account_id,)
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Add profile picture URL
    account["profile_picture"] = get_profile_picture_url(account_id)
    
    return AccountResponse(**account)



@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Create a new account.
    
    Admin: Can create any role.
    Manager: Can only create Student accounts.
    """
    # Permission check for Managers
    if user["role"] == "manager" and data.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only create Student accounts"
        )

    # Check if email already exists
    existing = await execute_one(
        "SELECT id FROM accounts WHERE email = %s",
        (data.email,)
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if school_id already exists (if provided)
    if data.school_id:
        existing = await execute_one(
            "SELECT id FROM accounts WHERE school_id = %s",
            (data.school_id,)
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID already registered"
            )
    
    # Hash password
    password_hash = hash_password(data.password)
    
    # Generate unique ID
    account_id = generate_long_id()
    
    # Insert account
    now = datetime.now(timezone.utc)
    await execute_insert(
        """
        INSERT INTO accounts 
        (id, role, department, school_id, email, password_hash, 
         first_name, middle_name, last_name, birth_date, gender, course, year_level, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            account_id, data.role, data.department, data.school_id, data.email, password_hash,
            data.first_name, data.middle_name, data.last_name, data.birth_date, data.gender,
            data.course, data.year_level, now, now
        )
    )
    
    return await get_account(account_id, user)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    data: AccountUpdate,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Update an account.
    
    Admin: Can update any account.
    Manager: Can only update Student accounts.
    """
    # Check if account exists
    existing = await execute_one(
        "SELECT id, role FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Permission check for Managers
    if user["role"] == "manager":
        if existing["role"] != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only update Student accounts"
            )
        if data.role and data.role != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot promote accounts"
            )
    
    # Build update query
    updates = []
    params = []
    
    if data.role is not None:
        updates.append("role = %s")
        params.append(data.role)
    
    if data.department is not None:
        updates.append("department = %s")
        params.append(data.department)
    
    if data.school_id is not None:
        # Check uniqueness
        check = await execute_one(
            "SELECT id FROM accounts WHERE school_id = %s AND id != %s",
            (data.school_id, account_id)
        )
        if check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="School ID already registered"
            )
        updates.append("school_id = %s")
        params.append(data.school_id)
    
    if data.email is not None:
        # Check uniqueness
        check = await execute_one(
            "SELECT id FROM accounts WHERE email = %s AND id != %s",
            (data.email, account_id)
        )
        if check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        updates.append("email = %s")
        params.append(data.email)
    
    if data.password is not None:
        updates.append("password_hash = %s")
        updates.append("password_last_updated = NOW()")
        params.append(hash_password(data.password))
    
    if data.first_name is not None:
        updates.append("first_name = %s")
        params.append(data.first_name)
    
    if data.middle_name is not None:
        updates.append("middle_name = %s")
        params.append(data.middle_name)
    
    if data.last_name is not None:
        updates.append("last_name = %s")
        params.append(data.last_name)
    
    if data.birth_date is not None:
        updates.append("birth_date = %s")
        params.append(data.birth_date)
    
    if data.gender is not None:
        updates.append("gender = %s")
        params.append(data.gender)

    if data.course is not None:
        updates.append("course = %s")
        params.append(data.course)

    if data.year_level is not None:
        updates.append("year_level = %s")
        params.append(data.year_level)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Add updated_at
    updates.append("updated_at = %s")
    params.append(datetime.now(timezone.utc))
    params.append(account_id)
    
    await execute_update(
        f"UPDATE accounts SET {', '.join(updates)} WHERE id = %s",
        tuple(params)
    )
    
    return await get_account(account_id, user)


@router.delete("/{account_id}", response_model=MessageResponse)
async def delete_account(
    account_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Suspend an account (soft delete).
    
    Admin: Can suspend any account.
    Manager: Can only suspend Student accounts.
    """
    # Prevent self-deletion
    if account_id == user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own account"
        )
    
    # Check if account exists
    existing = await execute_one(
        "SELECT id, role, suspended_at FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Permission check for Managers
    if user["role"] == "manager" and existing["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only suspend Student accounts"
        )
    
    if existing.get("suspended_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already suspended"
        )
    
    # Suspend account
    now = datetime.now(timezone.utc)
    await execute_update(
        "UPDATE accounts SET suspended_at = %s, updated_at = %s WHERE id = %s",
        (now, now, account_id)
    )
    
    return MessageResponse(message="Account suspended successfully")


@router.post("/{account_id}/restore", response_model=MessageResponse)
async def restore_account(
    account_id: str,
    user: dict = Depends(require_admin_or_manager)
):
    """
    Restore a suspended account.
    
    Admin: Can restore any account.
    Manager: Can only restore Student accounts.
    """
    # Check if account exists
    existing = await execute_one(
        "SELECT id, role, suspended_at FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Permission check for Managers
    if user["role"] == "manager" and existing["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only restore Student accounts"
        )

    if not existing.get("suspended_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not suspended"
        )
    
    # Restore account
    now = datetime.now(timezone.utc)
    await execute_update(
        "UPDATE accounts SET suspended_at = NULL, updated_at = %s WHERE id = %s",
        (now, account_id)
    )
    
    return MessageResponse(message="Account restored successfully")


@router.delete("/{account_id}/permanent", response_model=MessageResponse)
async def permanent_delete_account(
    account_id: str,
    user: dict = Depends(require_admin)
):
    """
    Permanently delete an account.
    
    WARNING: This action is irreversible and will delete all associated data
    (job assignments, activity logs, etc.) if cascades are set, or fail if not.
    
    Admin role only.
    """
    # Prevent self-deletion
    if account_id == user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
        
    # Check if account exists
    existing = await execute_one(
        "SELECT id FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Delete account
    # Assuming foreign keys have ON DELETE CASCADE or similar, otherwise we need to manual clean
    # The database schema isn't fully visible here, but usually for extensive delete
    # we might want to manually clean cascading if not enforcing cascade.
    # We'll assume simple delete for now.
    await execute_update(
        "DELETE FROM accounts WHERE id = %s",
        (account_id,)
    )
    
    return MessageResponse(message="Account permanently deleted")


@router.post("/maintenance/move-up", response_model=MessageResponse)
async def move_up_students(
    user: dict = Depends(require_admin)
):
    """
    Move up students to the next semester/year level.
    
    Logic:
    - X.1 -> X.2 (Add 0.1)
    - X.2 -> (X+1).1 (Add 0.9)
    - Applies to students with year_level between 1 and 6.2 (exclusive of 6.2 for update source)
    """
    
    result = await execute_update(
        """
        UPDATE accounts
        SET 
            year_level = CASE 
                WHEN ROUND(year_level * 10) %% 10 = 1 THEN year_level + 0.1 
                WHEN ROUND(year_level * 10) %% 10 = 2 THEN year_level + 0.9
                ELSE year_level 
            END,
            updated_at = %s
        WHERE role = 'student'
          AND year_level >= 1
          AND year_level < 4.15
          AND (ROUND(year_level * 10) %% 10 IN (1, 2))
        """,
        (datetime.now(timezone.utc),)
    )
    
    return MessageResponse(message=f"Moved up {result} students successfully")
