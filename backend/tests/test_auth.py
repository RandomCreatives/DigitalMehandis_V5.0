"""Integration tests for auth endpoints."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session):
    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_and_login(client):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Test@1234",
        "full_name": "Test User",
        "role": "STUDENT",
    })
    assert reg.status_code == 201
    assert reg.json()["email"] == "test@example.com"

    login = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Test@1234",
    })
    assert login.status_code == 200
    assert "access_token" in login.json()


@pytest.mark.asyncio
async def test_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "Test@1234"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_invalid_login(client):
    r = await client.post("/api/v1/auth/login", json={"email": "no@one.com", "password": "wrong"})
    assert r.status_code == 401
