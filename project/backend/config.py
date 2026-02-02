"""
Configuration module for Attendance application.

Loads environment variables based on the current environment:
- Development: Load from .env file
- Production: Load sensitive values from Docker secrets
"""

import os
from pathlib import Path
from typing import Optional
from functools import lru_cache


def _read_secret(secret_name: str) -> Optional[str]:
    """Read a secret from Docker secrets directory."""
    secret_path = Path(f"/run/secrets/{secret_name}")
    if secret_path.exists():
        return secret_path.read_text().strip()
    return None


def _get_env_or_secret(env_name: str, secret_name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get value from environment variable or Docker secret.
    Priority: Docker secret > Environment variable > Default
    """
    # Check Docker secrets first
    secret_value = _read_secret(secret_name)
    if secret_value:
        return secret_value

    # Fallback to environment variable
    value = os.getenv(env_name)
    if value:
        return value
    
    return default


class Settings:
    """Application settings loaded from environment."""
    
    def __init__(self):
        # Load .env file in development
        if os.getenv("ENVIRONMENT", "development") == "development":
            self._load_dotenv()
        
        # Environment
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.DEBUG: bool = self.ENVIRONMENT == "development"
        
        # Server
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))
        
        # Database
        self.DATABASE_HOST: str = os.getenv("DATABASE_HOST", "localhost")
        self.DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", "3306"))
        self.DATABASE_NAME: str = os.getenv("DATABASE_NAME", "core_attendance")
        self.DATABASE_USER: str = os.getenv("DATABASE_USER", "root")
        self.DATABASE_PASSWORD: str = _get_env_or_secret(
            "DATABASE_PASSWORD", "db_password"
        )
        
        # Redis Configuration
        self.REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
        self.REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
        self.REDIS_PASSWORD: Optional[str] = _get_env_or_secret(
            "REDIS_PASSWORD", "redis_password"
        )
        
        # JWT Configuration
        self.JWT_SECRET_KEY: str = _get_env_or_secret(
            "JWT_SECRET_KEY", "jwt_secret"
        )
        self.JWT_ALGORITHM: str = "HS256"
        self.JWT_ACCESS_EXPIRY: int = int(os.getenv("JWT_ACCESS_EXPIRY", "600"))  # 10 minutes
        self.JWT_REFRESH_EXPIRY: int = int(os.getenv("JWT_REFRESH_EXPIRY", "3600"))  # 1 hour
        
        # SMTP Configuration
        self.SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
        self.SMTP_USER: str = os.getenv("SMTP_USER", "")
        self.SMTP_PASSWORD: str = _get_env_or_secret(
            "SMTP_PASSWORD", "smtp_password"
        )
        self.SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "ITSD Attendance")
        self.SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", self.SMTP_USER)
        
        # Admin Account (for initial setup)
        self.ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
        self.ADMIN_PASSWORD: str = _get_env_or_secret(
            "ADMIN_PASSWORD", "admin_password"
        )
        
        # CORS
        self.CORS_ORIGINS: list = os.getenv(
            "CORS_ORIGINS", 
            "http://localhost:5173,http://localhost:3000"
        ).split(",")
        
        # Cookie settings
        self.COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", str(self.ENVIRONMENT == "production")).lower() == "true"
        self.COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax" if self.ENVIRONMENT == "development" else "strict")
        
        # Timezone settings
        self.TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Manila")
    
    def _load_dotenv(self):
        """Load environment variables from .env file."""
        env_path = Path(__file__).parent / ".env"
        if not env_path.exists():
            return
        
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key not in os.environ:
                        os.environ[key] = value
    
    @property
    def database_url(self) -> str:
        """Get the database connection URL."""
        return (
            f"mysql+aiomysql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Create a default settings instance for easy import
settings = get_settings()
