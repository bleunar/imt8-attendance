"""
Profile picture storage utilities.

Handles saving, deleting, and retrieving profile pictures.
All images are converted to WebP format and named by user ID.
"""

import io
from pathlib import Path
from typing import Optional

from PIL import Image

# Configuration
UPLOAD_DIR = Path("uploads/profile_pictures")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
OUTPUT_FORMAT = "WEBP"
MAX_DIMENSION = 512  # Max width/height for resizing


def ensure_upload_dir() -> None:
    """Create upload directory if it doesn't exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_image(content_type: str, file_size: int) -> tuple[bool, str]:
    """
    Validate image file type and size.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        return False, f"Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size: 5MB"
    
    return True, ""


def save_profile_picture(user_id: int, file_bytes: bytes) -> str:
    """
    Convert image to WebP and save as {user_id}.webp.
    
    Args:
        user_id: The user's account ID
        file_bytes: Raw image file bytes
        
    Returns:
        URL path to the saved image (e.g., "/uploads/profile_pictures/123.webp")
    """
    ensure_upload_dir()
    
    # Open and process image
    image = Image.open(io.BytesIO(file_bytes))
    file_path = UPLOAD_DIR / f"{user_id}.webp"
    
    # Check for animation (GIF/WebP)
    is_animated = getattr(image, "is_animated", False) and image.n_frames > 1
    
    if is_animated:
        # Save as animated WebP
        # We skip resizing for animated images to avoid frame processing complexity
        # The file size limit (5MB) acts as the primary constraint
        image.save(
            file_path,
            format=OUTPUT_FORMAT,
            save_all=True,
            minimize_size=True,
            loop=0,  # Infinite loop
            quality=85
        )
    else:
        # Convert to RGB if necessary (for transparency handling)
        if image.mode in ("RGBA", "LA", "P"):
            # Create white background for transparent images
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize if larger than max dimension (maintain aspect ratio)
        if image.width > MAX_DIMENSION or image.height > MAX_DIMENSION:
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
        
        # Save as static WebP
        image.save(file_path, format=OUTPUT_FORMAT, quality=85)
    
    # Return URL with cache buster (must call after save so file exists)
    return get_profile_picture_url(user_id)


def delete_profile_picture(user_id: int) -> bool:
    """
    Delete profile picture for a user.
    
    Args:
        user_id: The user's account ID
        
    Returns:
        True if file was deleted, False if it didn't exist
    """
    file_path = UPLOAD_DIR / f"{user_id}.webp"
    
    if file_path.exists():
        file_path.unlink()
        return True
    
    return False


def get_profile_picture_url(user_id: int) -> Optional[str]:
    """
    Get profile picture URL if it exists.
    
    Args:
        user_id: The user's account ID
        
    Returns:
        URL path with cache-busting param if picture exists, None otherwise
    """
    file_path = UPLOAD_DIR / f"{user_id}.webp"
    
    if file_path.exists():
        # Add file modification time as cache buster to prevent stale images
        mtime = int(file_path.stat().st_mtime)
        return f"/uploads/profile_pictures/{user_id}.webp?v={mtime}"
    
    return None


def profile_picture_exists(user_id: int) -> bool:
    """Check if a profile picture exists for the user."""
    file_path = UPLOAD_DIR / f"{user_id}.webp"
    return file_path.exists()
