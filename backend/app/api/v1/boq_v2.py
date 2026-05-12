from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import BOQItem, User, Project, FederatedQuantity
from app.schemas.boq_v2 import BOQItemCreate, BOQItemUpdate, BOQItemOut
from app.dependencies import get_current_user
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/projects/{project_id}/boq-v2", tags=["boq_v2"])

async def _check_project(project_id: UUID, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

@router.get("/items", response_model=list[BOQItemOut])
async def list_boq_items(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BOQItem).where(BOQItem.project_id == project_id))
    return result.scalars().all()

@router.post("/items", response_model=BOQItemOut, status_code=status.HTTP_201_CREATED)
async def create_boq_item(project_id: UUID, payload: BOQItemCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    item = BOQItem(**payload.model_dump(), project_id=project_id)
    db.add(item)
    await log_action(db, project_id, user.id, "BOQ", "CREATE_ITEM", f"Created BOQ item: {payload.description}")
    await db.commit()
    await db.refresh(item)
    return item

@router.patch("/items/{item_id}", response_model=BOQItemOut)
async def update_boq_item(project_id: UUID, item_id: UUID, payload: BOQItemUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BOQItem).where(BOQItem.id == item_id, BOQItem.project_id == project_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ Item not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item

@router.post("/generate-from-approved", response_model=list[BOQItemOut])
async def generate_from_approved(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Phase 2 logic: Pull Approved (Federated) quantities into the BOQ Item list.
    """
    await _check_project(project_id, user, db)

    # Get approved quantities
    result = await db.execute(select(FederatedQuantity).where(FederatedQuantity.project_id == project_id))
    approved = result.scalars().all()

    new_items = []
    for fq in approved:
        # Check if already exists (simplified check)
        # In a real app, we'd check BOQItemSource
        item = BOQItem(
            project_id=project_id,
            description=fq.element_description,
            unit=fq.quantity_unit,
            quantity=fq.quantity_value,
            rate=0.0, # Will be filled by user or matching
            amount=0.0,
            section=fq.section,
            is_manual=False
        )
        db.add(item)
        new_items.append(item)

    await log_action(db, project_id, user.id, "BOQ", "GENERATE", f"Generated {len(new_items)} items from approved quantities")
    await db.commit()
    return new_items
