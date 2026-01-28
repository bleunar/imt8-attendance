"""
OTP Service for handling One-Time Passwords.

Provides an abstraction layer for OTP storage, supporting:
- MemoryOTPStore: For development (non-persistent)
- RedisOTPStore: For production (persistent, distributed)
"""

import redis
from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Optional
from config import settings

class OTPStore(ABC):
    """Abstract base class for OTP storage."""
    
    @abstractmethod
    def set_otp(self, key: str, otp: str, expiry_seconds: int = 600) -> None:
        """Store OTP with expiration."""
        pass
    
    @abstractmethod
    def get_otp(self, key: str) -> Optional[str]:
        """Retrieve OTP if valid."""
        pass
    
    @abstractmethod
    def delete_otp(self, key: str) -> None:
        """Delete OTP."""
        pass

class MemoryOTPStore(OTPStore):
    """In-memory OTP storage for development."""
    
    def __init__(self):
        # Format: {key: {"otp": "123456", "expires_at": timestamp}}
        # Note: Simple implementation relies on check-time expiry validation
        # or external cleanup if needed. For dev, simple dict is fine.
        # But wait, to properly implement expiration we need timestamps.
        # Ideally, we store (otp, timestamp).
        # Actually, let's keep it simple and just store the data.
        # Validation of time is usually done on retrieval or we trust the store to expire it.
        # Redis expires automatically. Memory store needs manual check? 
        # Or we can just store the OTP and rely on the Logic in Auth to check expiry AGAIN?
        # NO, the interface says `set_otp` takes `expiry_seconds`.
        # Redis handles it. Memory store must handle it or we assume Auth checks strict time.
        # Existing auth logic checked `expires` timestamp.
        # Let's adapt the service to handle expiry internally or just store it.
        # To match Redis behavior (key disappears), MemoryStore should check time on get.
        from datetime import datetime
        self._storage = {}

    def set_otp(self, key: str, otp: str, expiry_seconds: int = 600) -> None:
        from datetime import datetime, timedelta
        self._storage[key] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(seconds=expiry_seconds)
        }

    def get_otp(self, key: str) -> Optional[str]:
        from datetime import datetime
        data = self._storage.get(key)
        if not data:
            return None
        
        if datetime.now() > data["expires_at"]:
            self.delete_otp(key)
            return None
            
        return data["otp"]

    def delete_otp(self, key: str) -> None:
        if key in self._storage:
            del self._storage[key]


class RedisOTPStore(OTPStore):
    """Redis-backed OTP storage for production."""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )

    def set_otp(self, key: str, otp: str, expiry_seconds: int = 600) -> None:
        # Key prefix to avoid collisions
        redis_key = f"otp:{key}"
        self.redis_client.setex(redis_key, expiry_seconds, otp)

    def get_otp(self, key: str) -> Optional[str]:
        redis_key = f"otp:{key}"
        return self.redis_client.get(redis_key)

    def delete_otp(self, key: str) -> None:
        redis_key = f"otp:{key}"
        self.redis_client.delete(redis_key)


def get_otp_service() -> OTPStore:
    """Factory to get the appropriate OTP store."""
    if settings.ENVIRONMENT == "production":
        return RedisOTPStore()
    else:
        # Singleton-ish for memory store would be nice if we wanted persistence across requests in dev server
        # But creating new MemoryStore each request wipes it? 
        # Wait, if `get_otp_service` is called inside a route, and we return `MemoryOTPStore()`, it's a new instance.
        # Memory storage MUST be a global singleton.
        return _memory_store_instance

# Global instance for development
_memory_store_instance = MemoryOTPStore()
