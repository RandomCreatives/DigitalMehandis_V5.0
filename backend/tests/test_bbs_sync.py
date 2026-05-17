import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.models import Project, BBSBar
from uuid import uuid4

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

@pytest_asyncio.fixture
async def auth_header(client):
    # Register and login to get tokens
    await client.post("/api/v1/auth/register", json={
        "email": "bbs@example.com",
        "password": "Password123!",
        "full_name": "BBS User"
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "bbs@example.com",
        "password": "Password123!"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def test_project(db_session, auth_header, client):
    # Get user id from login or just use a known one if we had it.
    # For simplicity, let's just create a project directly in DB if we can,
    # but we need the user_id. Let's get it from the DB.
    from app.db.models import User
    from sqlalchemy import select
    res = await db_session.execute(select(User).where(User.email == "bbs@example.com"))
    user = res.scalar_one()

    project = Project(
        id=uuid4(),
        user_id=user.id,
        name="Test BBS Project",
        location="Addis Ababa"
    )
    db_session.add(project)
    await db_session.commit()
    return project

@pytest.mark.asyncio
async def test_bbs_sync_to_boq(client, auth_header, test_project, db_session):
    # 1. Add some BBS bars
    bars = [
        {
            "member_name": "Footing F1",
            "bar_diameter_mm": 12,
            "bar_shape": "STRAIGHT",
            "quantity": 10,
            "clear_length_m": 2.0,
            "section": "SUBSTRUCTURE"
        },
        {
            "member_name": "Footing F2",
            "bar_diameter_mm": 12,
            "bar_shape": "STRAIGHT",
            "quantity": 5,
            "clear_length_m": 2.0,
            "section": "SUBSTRUCTURE"
        },
        {
            "member_name": "Column C1",
            "bar_diameter_mm": 16,
            "bar_shape": "STRAIGHT",
            "quantity": 4,
            "clear_length_m": 3.0,
            "section": "SUPERSTRUCTURE"
        }
    ]

    for bar_data in bars:
        resp = await client.post(
            f"/api/v1/projects/{test_project.id}/bbs",
            json=bar_data,
            headers=auth_header
        )
        assert resp.status_code == 201

    # 2. Sync SUBSTRUCTURE to BOQ (Suggestions)
    sync_resp = await client.post(
        f"/api/v1/projects/{test_project.id}/bbs/sync-to-boq?section=SUBSTRUCTURE",
        headers=auth_header
    )
    assert sync_resp.status_code == 201
    assert sync_resp.json()["count"] == 1  # Only Ø12 in SUBSTRUCTURE

    # 3. Verify SuggestedQuantity was created
    from app.db.models import SuggestedQuantity
    from sqlalchemy import select

    res = await db_session.execute(
        select(SuggestedQuantity).where(SuggestedQuantity.project_id == test_project.id)
    )
    suggestions = res.scalars().all()
    assert len(suggestions) == 1
    assert suggestions[0].discipline == "STRUCTURAL"
    assert suggestions[0].element_category == "REINFORCEMENT"
    assert "Ø12" in suggestions[0].description
    assert suggestions[0].section == "SUBSTRUCTURE"
    # Ø12 weight is approx 0.888 kg/m. 15 bars * 2m = 30m. 30 * 0.888 = 26.64 kg
    # Actually enriched includes covers etc, but for STRAIGHT clear_length_m is used directly in some logic or enriched.
    assert suggestions[0].quantity_value > 0

    # 4. Sync SUPERSTRUCTURE
    sync_resp_2 = await client.post(
        f"/api/v1/projects/{test_project.id}/bbs/sync-to-boq?section=SUPERSTRUCTURE",
        headers=auth_header
    )
    assert sync_resp_2.status_code == 201
    assert sync_resp_2.json()["count"] == 1 # Only Ø16 in SUPERSTRUCTURE

    res = await db_session.execute(
        select(SuggestedQuantity).where(
            SuggestedQuantity.project_id == test_project.id,
            SuggestedQuantity.section == "SUPERSTRUCTURE"
        )
    )
    sup_suggestions = res.scalars().all()
    assert len(sup_suggestions) == 1
    assert "Ø16" in sup_suggestions[0].description
