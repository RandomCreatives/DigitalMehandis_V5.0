import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import get_settings

settings = get_settings()
BASE_DATABASE_URL = "/".join(settings.DATABASE_URL.split("/")[:-1])
TEST_DB_URL = f"{BASE_DATABASE_URL}/ethioqs_test_shared"

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    # Use postgres for tests too
    admin_engine = create_async_engine(f"{BASE_DATABASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    async with admin_engine.connect() as conn:
        await conn.execute(text("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'ethioqs_test_shared' AND pid <> pg_backend_pid();"))
        await conn.execute(text("DROP DATABASE IF EXISTS ethioqs_test_shared"))
        await conn.execute(text("CREATE DATABASE ethioqs_test_shared"))
    await admin_engine.dispose()

    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield
    # Cleanup not strictly necessary for session scope but good practice
    admin_engine = create_async_engine(f"{BASE_DATABASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    async with admin_engine.connect() as conn:
        await conn.execute(text("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'ethioqs_test_shared' AND pid <> pg_backend_pid();"))
        await conn.execute(text("DROP DATABASE IF EXISTS ethioqs_test_shared"))
    await admin_engine.dispose()

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()

@pytest_asyncio.fixture
async def client(db_session):
    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
