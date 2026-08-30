"""Async SQLAlchemy engine/session + Redis client shared by the app."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create the PostGIS extension and all tables (idempotent)."""
    from . import models  # noqa: F401  (register tables on Base)

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency: yields a session and always rolls back on exit."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def redis_client():
    import redis.asyncio as aioredis

    return aioredis.from_url(settings.redis_url, decode_responses=True)