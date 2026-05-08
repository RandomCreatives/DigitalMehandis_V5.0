import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.base import Base
from app.db.models import Project, TakeoffItem, FederatedQuantity, Rate
from app.utils.boq_generator import BOQGenerator

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_boq_generation_unified(db: AsyncSession):
    # 1. Setup Project
    project_id = uuid.uuid4()
    user_id = uuid.uuid4()
    project = Project(id=project_id, user_id=user_id, name="Test Project", location="Addis")
    db.add(project)

    # 2. Setup Rates
    rate1 = Rate(description="C-25 Concrete", unit="m³", rate_per_unit=5000, project_id=None)
    rate2 = Rate(description="Wall", unit="m²", rate_per_unit=1000, project_id=project_id) # Project specific
    db.add_all([rate1, rate2])

    # 3. Setup Items
    # Manual item
    manual = TakeoffItem(
        project_id=project_id,
        description="C-25 Concrete for Foundation",
        unit="m³",
        quantity=10.5,
        section="SUBSTRUCTURE"
    )
    # Federated item
    fed = FederatedQuantity(
        project_id=project_id,
        element_description="Brick Wall",
        quantity_value=20.0,
        quantity_unit="m²",
        section="SUPERSTRUCTURE",
        discipline="ARCHITECTURAL",
        element_category="WALL"
    )
    db.add_all([manual, fed])
    await db.commit()

    # 4. Generate BOQ (COMBINED)
    generator = BOQGenerator(db, project_id, "COMBINED")
    boq = await generator.generate()

    assert boq["total_amount"] > 0
    assert len(boq["lines"]) == 2
    # C-25 Concrete match: 10.5 * 5000 = 52500
    # Wall match: 20.0 * 1000 = 20000
    # Total = 72500
    assert boq["total_amount"] == 72500.0

@pytest.mark.asyncio
async def test_boq_generation_section_filtering(db: AsyncSession):
    project_id = uuid.uuid4()
    user_id = uuid.uuid4()
    db.add(Project(id=project_id, user_id=user_id, name="Test Filter", location="Addis"))
    db.add(Rate(description="Concrete", unit="m³", rate_per_unit=1000, project_id=None))

    db.add(TakeoffItem(project_id=project_id, description="Concrete Sub", unit="m³", quantity=10, section="SUBSTRUCTURE"))
    db.add(TakeoffItem(project_id=project_id, description="Concrete Super", unit="m³", quantity=5, section="SUPERSTRUCTURE"))
    await db.commit()

    # Test Substructure
    gen_sub = BOQGenerator(db, project_id, "SUBSTRUCTURE")
    boq_sub = await gen_sub.generate()
    assert len(boq_sub["lines"]) == 1
    assert boq_sub["total_amount"] == 10000.0

    # Test Superstructure
    gen_super = BOQGenerator(db, project_id, "SUPERSTRUCTURE")
    boq_super = await gen_super.generate()
    assert len(boq_super["lines"]) == 1
    assert boq_super["total_amount"] == 5000.0
