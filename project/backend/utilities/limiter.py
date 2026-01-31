"""
Rate limiting utility using slowapi.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize limiter
# We use the client's IP address for rate limiting
limiter = Limiter(key_func=get_remote_address)

def setup_limiter(app):
    """
    Configure rate limiting for the FastAPI application.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
