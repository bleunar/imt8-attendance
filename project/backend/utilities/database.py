"""
Database connection utilities for Core Attendance application.

Provides async database connection pool management with retry logic.
"""

import asyncio
import aiomysql
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

from config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class DatabasePool:
    """Manages the database connection pool."""
    
    _pool: Optional[aiomysql.Pool] = None
    
    @classmethod
    async def get_pool(cls) -> aiomysql.Pool:
        """Get or create the connection pool."""
        if cls._pool is None:
            cls._pool = await aiomysql.create_pool(
                host=settings.DATABASE_HOST,
                port=settings.DATABASE_PORT,
                user=settings.DATABASE_USER,
                password=settings.DATABASE_PASSWORD,
                db=settings.DATABASE_NAME,
                autocommit=True,
                minsize=1,
                maxsize=10,
            )
        return cls._pool
    
    @classmethod
    async def close_pool(cls):
        """Close the connection pool."""
        if cls._pool is not None:
            cls._pool.close()
            await cls._pool.wait_closed()
            cls._pool = None


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[aiomysql.Connection, None]:
    """
    Context manager for database connections.
    
    Usage:
        async with get_db_connection() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT * FROM accounts")
                result = await cursor.fetchall()
    """
    pool = await DatabasePool.get_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        pool.release(conn)


@asynccontextmanager
async def get_db_cursor() -> AsyncGenerator[aiomysql.DictCursor, None]:
    """
    Context manager for database cursor with dict results.
    
    Usage:
        async with get_db_cursor() as cursor:
            await cursor.execute("SELECT * FROM accounts")
            result = await cursor.fetchall()
    """
    async with get_db_connection() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            yield cursor


async def check_database_connection(
    max_attempts: int = 5,
    timeout_seconds: int = 10
) -> bool:
    """
    Check database connection with retry logic.
    
    Args:
        max_attempts: Maximum number of connection attempts
        timeout_seconds: Timeout for each attempt in seconds
    
    Returns:
        True if connection successful, False otherwise
    """
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"[Database] Connection attempt {attempt}/{max_attempts}...")
            
            conn = await asyncio.wait_for(
                aiomysql.connect(
                    host=settings.DATABASE_HOST,
                    port=settings.DATABASE_PORT,
                    user=settings.DATABASE_USER,
                    password=settings.DATABASE_PASSWORD,
                    db=settings.DATABASE_NAME,
                ),
                timeout=timeout_seconds
            )
            
            # Test the connection
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT 1")
                await cursor.fetchone()
            
            conn.close()
            logger.info(f"[Database] Connection successful!")
            return True
            
        except asyncio.TimeoutError:
            logger.warning(f"[Database] Attempt {attempt} timed out after {timeout_seconds}s")
        except Exception as e:
            logger.error(f"[Database] Attempt {attempt} failed: {str(e)}")
        
        if attempt < max_attempts:
            logger.info(f"[Database] Retrying in 2 seconds...")
            await asyncio.sleep(2)
    
    logger.error(f"[Database] Failed to connect after {max_attempts} attempts")
    return False


async def execute_query(query: str, params: tuple = None) -> list:
    """Execute a SELECT query and return results."""
    async with get_db_cursor() as cursor:
        await cursor.execute(query, params or ())
        return await cursor.fetchall()


async def execute_one(query: str, params: tuple = None) -> Optional[dict]:
    """Execute a SELECT query and return single result."""
    async with get_db_cursor() as cursor:
        await cursor.execute(query, params or ())
        return await cursor.fetchone()


async def execute_insert(query: str, params: tuple = None) -> int:
    """Execute an INSERT query and return the last inserted ID."""
    async with get_db_cursor() as cursor:
        await cursor.execute(query, params or ())
        return cursor.lastrowid


async def execute_update(query: str, params: tuple = None) -> int:
    """Execute an UPDATE/DELETE query and return affected rows."""
    async with get_db_cursor() as cursor:
        await cursor.execute(query, params or ())
        return cursor.rowcount
