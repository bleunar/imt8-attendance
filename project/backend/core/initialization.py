"""
Initialization module for Core Attendance application.

Handles startup checks and initial data setup:
- Database connection check
- SMTP server check
- Admin account creation
"""


from datetime import datetime, timezone
from utilities.database import check_database_connection, execute_one, execute_insert
from utilities.email import check_smtp_connection
from core.security import hash_password
from core.logging import get_logger
from config import settings

logger = get_logger(__name__)


async def check_services() -> bool:
    """
    Check all required services on startup.
    
    Checks:
        1. Database connection (5 attempts, 10s timeout)
        2. SMTP connection (5 attempts, 10s timeout)
    
    Returns:
        True if all services are available, False otherwise
    """
    logger.info("Service Initialization Starting")
    
    # Check database connection
    db_ok = await check_database_connection(max_attempts=5, timeout_seconds=10)
    if not db_ok:
        logger.error("Database connection failed. Application cannot start.")
        return False
    
    # Check SMTP connection (optional in development)
    smtp_ok = await check_smtp_connection(max_attempts=5, timeout_seconds=10)
    if not smtp_ok:
        if settings.ENVIRONMENT == "production":
            logger.error("SMTP connection failed. Application cannot start in production.")
            return False
        else:
            logger.warning("SMTP connection failed. Email features will be unavailable.")
    
    logger.info("Service Initialization Complete")
    
    return True


async def ensure_admin_account() -> bool:
    """
    Ensure an admin account exists in the database.
    
    Creates a default admin account if none exists using
    credentials from environment variables.
    
    Returns:
        True if admin exists or was created, False on error
    """
    try:
        # Check if any admin account exists
        admin = await execute_one(
            "SELECT id FROM accounts WHERE role = 'admin' LIMIT 1"
        )
        
        if admin:
            logger.info(f"[Admin] Admin account already exists (ID: {admin['id']})")
            return True
        
        # Create default admin account
        logger.info("[Admin] No admin account found. Creating default admin...")
        
        password_hash = hash_password(settings.ADMIN_PASSWORD)
        now = datetime.now(timezone.utc)
        
        admin_id = await execute_insert(
            """
            INSERT INTO accounts (role, email, password_hash, first_name, last_name, created_at, updated_at)
            VALUES ('admin', %s, %s, 'System', 'Administrator', %s, %s)
            """,
            (settings.ADMIN_EMAIL, password_hash, now, now)
        )
        
        logger.info(f"[Admin] Created admin account: Email: {settings.ADMIN_EMAIL}, ID: {admin_id}")
        logger.warning("[Admin] Please change the default password after first login!")
        
        return True
        
    except Exception as e:
        logger.error(f"[Admin] Failed to ensure admin account: {str(e)}")
        return False


async def initialize_app() -> bool:
    """
    Run all initialization tasks.
    
    Call this on application startup to:
        1. Check database connection
        2. Check SMTP connection
        3. Ensure admin account exists
    
    Returns:
        True if initialization successful, False otherwise
    """
    # Check services first
    services_ok = await check_services()
    if not services_ok:
        return False
    
    # Ensure admin account exists
    admin_ok = await ensure_admin_account()
    if not admin_ok:
        return False
    
    return True
