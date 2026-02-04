"""
ID Generator utility for Core Attendance application.

Provides functions to generate unique IDs using segments from UUIDv4.
UUIDv4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
               group1   grp2 grp3 grp4 group5
"""

import uuid


def generate_long_id() -> str:
    """
    Generate a 16-character unique ID for primary keys.
    
    Combines group 2 (4 chars) and group 5 (12 chars) of UUIDv4.
    
    Returns:
        A 16-character lowercase hexadecimal string.
        Example: 'a1b2c3d4e5f6g7h8'
    
    Usage:
        account_id = generate_long_id()
        job_id = generate_long_id()
    """
    u = uuid.uuid4()
    parts = str(u).split('-')
    # parts[1] = group 2 (4 chars), parts[4] = group 5 (12 chars)
    return parts[1] + parts[4]


def generate_short_id() -> str:
    """
    Generate an 8-character ID for future use (reference codes, etc.).
    
    Uses group 1 (8 chars) of UUIDv4.
    
    Returns:
        An 8-character lowercase hexadecimal string.
        Example: 'a1b2c3d4'
    
    Usage:
        reference_code = generate_short_id()
    """
    u = uuid.uuid4()
    parts = str(u).split('-')
    # parts[0] = group 1 (8 chars)
    return parts[0]
