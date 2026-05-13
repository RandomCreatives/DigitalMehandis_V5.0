"""One-time script to create all Phase 2 tables in SQLite."""
import asyncio
from app.db.base import Base
from app.db import models, models_phase2  # noqa: F401 — register all models
from app.db.session import engine


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All tables created successfully.")
    await engine.dispose()


asyncio.run(main())
