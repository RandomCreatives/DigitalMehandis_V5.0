"""
Government Direct Cost Library API

Rate Sources:
  POST   /rates/sources                          — create rate source
  GET    /rates/sources                          — list (filter: region, is_active, cost_type)
  GET    /rates/sources/{source_id}              — get one
  PATCH  /rates/sources/{source_id}              — update

Rate Items:
  GET    /rates/items                            — list (filter: source_id, work_category, unit, search)
  POST   /rates/items                            — create manually
  PATCH  /rates/items/{item_id}                  — update
  DELETE /rates/items/{item_id}                  — delete (only unverified)

Raw Import Rows:
  GET    /rates/sources/{source_id}/raw-rows     — list (filter: status)
  PATCH  /rates/raw-rows/{row_id}                — update parsed fields
  POST   /rates/raw-rows/{row_id}/approve        — approve → creates RateItem
  POST   /rates/sources/{source_id}/bulk-approve — approve all PENDING rows >= threshold

Unit Normalization:
  POST   /rates/normalize-unit                   — normalize a unit string
"""
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User
from app.db.models_cost import RateSource, RateItem, RawRateImportRow
from app.dependencies import get_current_user
from app.services.rate_matching_service import UnitNormalizer

router = APIRouter(tags=["cost-library"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class RateSourceCreate(BaseModel):
    title: str
    issuing_authority: str | None = None
    region: str | None = None
    fiscal_year: str | None = None
    quarter: str | None = None
    calendar_system: str = "EC"
    cost_type: str = "DIRECT_COST"
    currency: str = "ETB"
    source_file_path: str | None = None
    notes: str | None = None
    is_official: bool = True
    is_active: bool = True


class RateSourceUpdate(BaseModel):
    title: str | None = None
    issuing_authority: str | None = None
    region: str | None = None
    fiscal_year: str | None = None
    quarter: str | None = None
    calendar_system: str | None = None
    cost_type: str | None = None
    currency: str | None = None
    source_file_path: str | None = None
    notes: str | None = None
    is_official: bool | None = None
    is_active: bool | None = None


class RateSourceOut(BaseModel):
    id: uuid.UUID
    title: str
    issuing_authority: str | None
    region: str | None
    fiscal_year: str | None
    quarter: str | None
    calendar_system: str
    cost_type: str
    currency: str
    source_file_path: str | None
    notes: str | None
    is_official: bool
    is_active: bool
    created_at: Any
    updated_at: Any
    item_count: int = 0

    model_config = {"from_attributes": True}


class RateItemCreate(BaseModel):
    rate_source_id: uuid.UUID
    item_no: str | None = None
    work_category: str | None = None
    sub_category: str | None = None
    description: str
    unit: str
    direct_cost: float
    currency: str = "ETB"
    region: str | None = None
    fiscal_year: str | None = None
    source_page: int | None = None
    confidence: float = 1.0


class RateItemUpdate(BaseModel):
    item_no: str | None = None
    work_category: str | None = None
    sub_category: str | None = None
    description: str | None = None
    unit: str | None = None
    direct_cost: float | None = None
    currency: str | None = None
    region: str | None = None
    fiscal_year: str | None = None
    source_page: int | None = None
    confidence: float | None = None
    is_verified: bool | None = None
    verified_by: str | None = None


class RateItemOut(BaseModel):
    id: uuid.UUID
    rate_source_id: uuid.UUID
    item_no: str | None
    work_category: str | None
    sub_category: str | None
    description: str
    normalized_description: str | None
    unit: str
    normalized_unit: str | None
    direct_cost: float
    currency: str
    region: str | None
    fiscal_year: str | None
    source_page: int | None
    confidence: float
    is_verified: bool
    verified_by: str | None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class RawRowUpdate(BaseModel):
    parsed_item_no: str | None = None
    parsed_description: str | None = None
    parsed_unit: str | None = None
    parsed_cost: float | None = None
    confidence: float | None = None
    status: str | None = None
    review_notes: str | None = None


class RawRowOut(BaseModel):
    id: uuid.UUID
    rate_source_id: uuid.UUID
    source_page: int | None
    raw_item_no: str | None
    raw_description: str | None
    raw_unit: str | None
    raw_cost: str | None
    parsed_item_no: str | None
    parsed_description: str | None
    parsed_unit: str | None
    parsed_cost: float | None
    confidence: float
    status: str
    review_notes: str | None
    created_at: Any

    model_config = {"from_attributes": True}


class NormalizeUnitRequest(BaseModel):
    unit: str


class NormalizeUnitResponse(BaseModel):
    original: str
    normalized: str
    needs_review: bool


# ── Rate Sources ──────────────────────────────────────────────────────────────

@router.post(
    "/rates/sources",
    response_model=RateSourceOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_rate_source(
    payload: RateSourceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = RateSource(**payload.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    out = RateSourceOut.model_validate(source)
    out.item_count = 0
    return out


@router.get("/rates/sources", response_model=list[RateSourceOut])
async def list_rate_sources(
    region: str | None = None,
    is_active: bool | None = None,
    cost_type: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RateSource)
    if region is not None:
        stmt = stmt.where(RateSource.region == region)
    if is_active is not None:
        stmt = stmt.where(RateSource.is_active == is_active)
    if cost_type is not None:
        stmt = stmt.where(RateSource.cost_type == cost_type)
    stmt = stmt.order_by(RateSource.created_at.desc())
    result = await db.execute(stmt)
    sources = result.scalars().all()

    # Attach item counts
    count_stmt = select(
        RateItem.rate_source_id, func.count(RateItem.id).label("cnt")
    ).group_by(RateItem.rate_source_id)
    count_result = await db.execute(count_stmt)
    counts = {str(row.rate_source_id): row.cnt for row in count_result}

    out = []
    for s in sources:
        o = RateSourceOut.model_validate(s)
        o.item_count = counts.get(str(s.id), 0)
        out.append(o)
    return out


@router.get("/rates/sources/{source_id}", response_model=RateSourceOut)
async def get_rate_source(
    source_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RateSource).where(RateSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Rate source not found")

    count_result = await db.execute(
        select(func.count(RateItem.id)).where(RateItem.rate_source_id == source_id)
    )
    item_count = count_result.scalar() or 0

    out = RateSourceOut.model_validate(source)
    out.item_count = item_count
    return out


@router.patch("/rates/sources/{source_id}", response_model=RateSourceOut)
async def update_rate_source(
    source_id: uuid.UUID,
    payload: RateSourceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RateSource).where(RateSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Rate source not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(source, field, value)

    await db.commit()
    await db.refresh(source)

    count_result = await db.execute(
        select(func.count(RateItem.id)).where(RateItem.rate_source_id == source_id)
    )
    item_count = count_result.scalar() or 0
    out = RateSourceOut.model_validate(source)
    out.item_count = item_count
    return out


# ── Rate Items ────────────────────────────────────────────────────────────────

@router.get("/rates/items", response_model=list[RateItemOut])
async def list_rate_items(
    source_id: uuid.UUID | None = None,
    work_category: str | None = None,
    unit: str | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RateItem)
    if source_id is not None:
        stmt = stmt.where(RateItem.rate_source_id == source_id)
    if work_category is not None:
        stmt = stmt.where(RateItem.work_category == work_category)
    if unit is not None:
        stmt = stmt.where(RateItem.unit == unit)
    if search:
        stmt = stmt.where(RateItem.description.ilike(f"%{search}%"))
    stmt = stmt.order_by(RateItem.work_category, RateItem.item_no).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/rates/items",
    response_model=RateItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_rate_item(
    payload: RateItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify source exists
    src_result = await db.execute(
        select(RateSource).where(RateSource.id == payload.rate_source_id)
    )
    if not src_result.scalar_one_or_none():
        raise HTTPException(404, "Rate source not found")

    # Normalize unit
    normalized_unit, _ = UnitNormalizer.normalize(payload.unit)

    item = RateItem(
        **payload.model_dump(),
        normalized_unit=normalized_unit,
        normalized_description=payload.description.lower().strip(),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/rates/items/{item_id}", response_model=RateItemOut)
async def update_rate_item(
    item_id: uuid.UUID,
    payload: RateItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RateItem).where(RateItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Rate item not found")

    updates = payload.model_dump(exclude_none=True)
    if "unit" in updates:
        normalized_unit, _ = UnitNormalizer.normalize(updates["unit"])
        updates["normalized_unit"] = normalized_unit
    if "description" in updates:
        updates["normalized_description"] = updates["description"].lower().strip()

    for field, value in updates.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/rates/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rate_item(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RateItem).where(RateItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Rate item not found")
    if item.is_verified:
        raise HTTPException(400, "Cannot delete a verified rate item")
    await db.delete(item)
    await db.commit()


# ── Raw Import Rows ───────────────────────────────────────────────────────────

@router.get(
    "/rates/sources/{source_id}/raw-rows",
    response_model=list[RawRowOut],
)
async def list_raw_rows(
    source_id: uuid.UUID,
    row_status: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify source exists
    src_result = await db.execute(select(RateSource).where(RateSource.id == source_id))
    if not src_result.scalar_one_or_none():
        raise HTTPException(404, "Rate source not found")

    stmt = select(RawRateImportRow).where(RawRateImportRow.rate_source_id == source_id)
    if row_status:
        stmt = stmt.where(RawRateImportRow.status == row_status.upper())
    stmt = stmt.order_by(RawRateImportRow.source_page, RawRateImportRow.created_at)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/rates/raw-rows/{row_id}", response_model=RawRowOut)
async def update_raw_row(
    row_id: uuid.UUID,
    payload: RawRowUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RawRateImportRow).where(RawRateImportRow.id == row_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Raw import row not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(row, field, value)

    await db.commit()
    await db.refresh(row)
    return row


@router.post("/rates/raw-rows/{row_id}/approve", response_model=RateItemOut)
async def approve_raw_row(
    row_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a raw import row — creates a RateItem from parsed fields."""
    result = await db.execute(select(RawRateImportRow).where(RawRateImportRow.id == row_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Raw import row not found")
    if row.status == "APPROVED":
        raise HTTPException(400, "Row already approved")

    # Validate parsed fields
    if not row.parsed_description:
        raise HTTPException(400, "parsed_description is required before approving")
    if not row.parsed_unit:
        raise HTTPException(400, "parsed_unit is required before approving")
    if row.parsed_cost is None:
        raise HTTPException(400, "parsed_cost is required before approving")

    normalized_unit, _ = UnitNormalizer.normalize(row.parsed_unit)

    item = RateItem(
        rate_source_id=row.rate_source_id,
        item_no=row.parsed_item_no,
        description=row.parsed_description,
        normalized_description=row.parsed_description.lower().strip(),
        unit=row.parsed_unit,
        normalized_unit=normalized_unit,
        direct_cost=row.parsed_cost,
        source_page=row.source_page,
        confidence=row.confidence,
    )
    db.add(item)

    row.status = "APPROVED"
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/rates/sources/{source_id}/bulk-approve")
async def bulk_approve_raw_rows(
    source_id: uuid.UUID,
    confidence_threshold: float = Query(0.8, ge=0.0, le=1.0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve all PENDING rows with confidence >= threshold."""
    src_result = await db.execute(select(RateSource).where(RateSource.id == source_id))
    if not src_result.scalar_one_or_none():
        raise HTTPException(404, "Rate source not found")

    stmt = select(RawRateImportRow).where(
        RawRateImportRow.rate_source_id == source_id,
        RawRateImportRow.status == "PENDING",
        RawRateImportRow.confidence >= confidence_threshold,
        RawRateImportRow.parsed_description.isnot(None),
        RawRateImportRow.parsed_unit.isnot(None),
        RawRateImportRow.parsed_cost.isnot(None),
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    created_count = 0
    for row in rows:
        normalized_unit, _ = UnitNormalizer.normalize(row.parsed_unit)
        item = RateItem(
            rate_source_id=row.rate_source_id,
            item_no=row.parsed_item_no,
            description=row.parsed_description,
            normalized_description=row.parsed_description.lower().strip(),
            unit=row.parsed_unit,
            normalized_unit=normalized_unit,
            direct_cost=row.parsed_cost,
            source_page=row.source_page,
            confidence=row.confidence,
        )
        db.add(item)
        row.status = "APPROVED"
        created_count += 1

    await db.commit()
    return {
        "approved_count": created_count,
        "source_id": str(source_id),
        "confidence_threshold": confidence_threshold,
    }


# ── Unit Normalization ────────────────────────────────────────────────────────

@router.post("/rates/normalize-unit", response_model=NormalizeUnitResponse)
async def normalize_unit(
    payload: NormalizeUnitRequest,
    user: User = Depends(get_current_user),
):
    normalized, needs_review = UnitNormalizer.normalize(payload.unit)
    return NormalizeUnitResponse(
        original=payload.unit,
        normalized=normalized,
        needs_review=needs_review,
    )
