import logging
import sys
from config import settings

def setup_logging():
    """
    Configure the root logger for the application.
    - JSON formatting could be added here for production.
    - Sets log level based on environment.
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set levels for third-party libraries to reduce noise
    # In debug mode, show access logs; in production, hide them
    if settings.DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    else:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("aiomysql").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)
