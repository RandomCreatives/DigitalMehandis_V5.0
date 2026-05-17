from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Rate, Project, User
from app.schemas.boq import RateOut
from app.dependencies import get_current_user
from pydantic import BaseModel
from uuid import UUID
from typing import Any

router = APIRouter(tags=["rates"])


class RateCreate(BaseModel):
    item_code: str | None = None
    description: str
    unit: str
    rate_per_unit: float
    rate_source: str | None = None
    region: str | None = "Addis Ababa"


class RateUpdate(BaseModel):
    description: str | None = None
    unit: str | None = None
    rate_per_unit: float | None = None
    rate_source: str | None = None
    region: str | None = None


class RateOutFull(BaseModel):
    id: UUID
    project_id: UUID | None
    item_code: str | None
    description: str
    unit: str
    rate_per_unit: float
    rate_source: str | None
    region: str | None
    created_at: Any
    model_config = {"from_attributes": True}


async def _check_project(project_id: UUID, user: User, db: AsyncSession) -> None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Project not found")


# ── Global rate database (read-only) ─────────────────────────────────────────

@router.get("/rates/database", response_model=list[RateOutFull])
async def get_global_rates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return the pre-loaded global rate database (project_id IS NULL)."""
    result = await db.execute(select(Rate).where(Rate.project_id.is_(None)).order_by(Rate.item_code))
    return result.scalars().all()


# ── Project-specific rate library ─────────────────────────────────────────────

@router.get("/projects/{project_id}/rates", response_model=list[RateOutFull])
async def list_project_rates(
    project_id: UUID,
    region: str | None = None,
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all rates for a project (project-specific + global)."""
    await _check_project(project_id, user, db)
    stmt = select(Rate).where(
        (Rate.project_id == project_id) | (Rate.project_id.is_(None))
    )
    if region:
        stmt = stmt.where(Rate.region == region)
    if search:
        stmt = stmt.where(Rate.description.ilike(f"%{search}%"))
    result = await db.execute(stmt.order_by(Rate.item_code))
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/rates",
    response_model=RateOutFull,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_rate(
    project_id: UUID,
    payload: RateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a project-specific rate."""
    await _check_project(project_id, user, db)
    rate = Rate(
        project_id=project_id,
        item_code=payload.item_code,
        description=payload.description,
        unit=payload.unit,
        rate_per_unit=payload.rate_per_unit,
        rate_source=payload.rate_source,
        region=payload.region,
    )
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    return rate


@router.put("/projects/{project_id}/rates/{rate_id}", response_model=RateOutFull)
async def update_project_rate(
    project_id: UUID,
    rate_id: UUID,
    payload: RateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_project(project_id, user, db)
    result = await db.execute(
        select(Rate).where(Rate.id == rate_id, Rate.project_id == project_id)
    )
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(404, "Rate not found or is a global rate (cannot edit)")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(rate, field, value)
    await db.commit()
    await db.refresh(rate)
    return rate


@router.delete("/projects/{project_id}/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_rate(
    project_id: UUID,
    rate_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_project(project_id, user, db)
    result = await db.execute(
        select(Rate).where(Rate.id == rate_id, Rate.project_id == project_id)
    )
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(404, "Rate not found or is a global rate (cannot delete)")
    await db.delete(rate)
    await db.commit()


