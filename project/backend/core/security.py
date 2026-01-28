"""
Security utilities for Core Attendance application.

Provides password hashing and token generation functions.
"""

import secrets
import string
from passlib.context import CryptContext


# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
    
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against
    
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_recovery_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure recovery token.
    
    Args:
        length: Length of the token
    
    Returns:
        Random hex token string
    """
    return secrets.token_hex(length // 2)


def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP (One-Time Password).
    
    Args:
        length: Number of digits in the OTP
    
    Returns:
        Numeric OTP string
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_random_password(length: int = 12) -> str:
    """
    Generate a random password.
    
    Args:
        length: Length of the password
    
    Returns:
        Random password string with letters, digits, and special characters
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))
