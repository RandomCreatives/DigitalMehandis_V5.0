import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import get_settings

settings = get_settings()

# Connection arguments for SSL (Neon support)
connect_args = {}
if "neon.tech" in settings.DATABASE_URL:
    connect_args["ssl"] = True

# Strip sslmode from URL as asyncpg prefers connect_args
db_url = settings.DATABASE_URL
if "sslmode=" in db_url:
    db_url = db_url.split("?")[0]

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
