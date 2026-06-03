from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import (
    Project, User, Drawing, DrawingCalibration, Measurement,
    SuggestedQuantity, ProjectElement, QuantitySource, AuditLog
)
from app.schemas.measurements import (
    MeasurementCreate, MeasurementUpdate, MeasurementOut,
    PromoteToQuantityPayload
)
from app.dependencies import get_current_user
from app.services.grist_service import grist_service

router = APIRouter(tags=["measurements"])

MEASUREMENT_TYPES = ["LENGTH", "AREA", "COUNT", "VOLUME", "DEDUCTION", "ANNOTATION"]
DISCIPLINES = ["ARCHITECTURAL", "STRUCTURAL", "ELECTRICAL", "SANITARY"]
SECTIONS = ["SUBSTRUCTURE", "SUPERSTRUCTURE"]

async def _check_project(project_id: UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    return p

def _compute_measurement(
    measurement_type: str,
    points: list,
    calibration: DrawingCalibration | None,
    multiplier: float = 1.0,
):
    """
    Computes real-world value based on pixels and calibration.
    """
    if measurement_type == "ANNOTATION":
        return 0.0, 0.0, "N/A", 1.0

    if not calibration:
        # Default 1:1 if no calibration (unlikely in prod)
        raw = 1.0
        return raw, raw * multiplier, "px", 1.0

    scale = float(calibration.scale_factor)
    unit = calibration.real_unit

    # Simplified logic for example
    if measurement_type == "LENGTH":
        # Sum of distances between points
        raw = 100.0 # Placeholder
    elif measurement_type == "AREA":
        raw = 500.0 # Placeholder
    elif measurement_type == "COUNT":
        raw = len(points)
    else:
        raw = 0.0

    return raw, raw * scale * multiplier, unit, scale

@router.post(
    "/projects/{project_id}/drawings/{drawing_id}/measurements",
    response_model=MeasurementOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_measurement(
    project_id: UUID,
    drawing_id: UUID,
    payload: MeasurementCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _check_project(project_id, user, db)

    result = await db.execute(
        select(Drawing).where(Drawing.id == drawing_id, Drawing.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Drawing not found")

    calibration = None
    if payload.calibration_id:
        result = await db.execute(
            select(DrawingCalibration).where(DrawingCalibration.id == payload.calibration_id)
        )
        calibration = result.scalar_one_or_none()

    points = payload.points_json.get("points", [])
    raw_value, final_value, unit, scale_used = _compute_measurement(
        payload.measurement_type.upper(), points, calibration, payload.multiplier
    )

    m = Measurement(
        project_id=project_id,
        drawing_id=drawing_id,
        page_number=payload.page_number,
        calibration_id=calibration.id if calibration else None,
        label=payload.label,
        measurement_type=payload.measurement_type.upper(),
        discipline=payload.discipline.upper(),
        section=payload.section.upper(),
        element_category=payload.element_category.upper(),
        raw_value=raw_value,
        final_value=final_value,
        unit=unit,
        multiplier=payload.multiplier,
        scale_factor_used=scale_used,
        points_json=payload.points_json,
        color=payload.color,
        project_element_id=payload.project_element_id,
        notes=payload.notes,
        created_by=user.id,
    )
    db.add(m)

    # Sync to Grist if doc exists
    if project.grist_doc_id:
        await grist_service.add_records(
            project.grist_doc_id,
            "Measurements",
            [{
                "fields": {
                    "Label": m.label,
                    "Type": m.measurement_type,
                    "Discipline": m.discipline,
                    "Section": m.section,
                    "Category": m.element_category,
                    "Final_Value": float(m.final_value),
                    "Unit": m.unit,
                    "Multiplier": float(m.multiplier),
                    "Created_At": datetime.now(timezone.utc).isoformat()
                }
            }]
        )

    db.add(AuditLog(
        project_id=project_id,
        user_id=user.id,
        action="MEASUREMENT_CREATED",
        entity_type="Measurement",
        description=f"{payload.measurement_type} measurement '{payload.label}': {final_value} {unit}",
    ))

    await db.commit()
    await db.refresh(m)
    return m

@router.get("/projects/{project_id}/drawings/{drawing_id}/measurements", response_model=list[MeasurementOut])
async def list_drawing_measurements(project_id: UUID, drawing_id: UUID, page_number: int | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    stmt = select(Measurement).where(Measurement.project_id == project_id, Measurement.drawing_id == drawing_id)
    if page_number is not None:
        stmt = stmt.where(Measurement.page_number == page_number)
    result = await db.execute(stmt.order_by(Measurement.created_at))
    return result.scalars().all()

@router.get("/projects/{project_id}/measurements", response_model=list[MeasurementOut])
async def list_project_measurements(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(Measurement).where(Measurement.project_id == project_id).order_by(Measurement.created_at))
    return result.scalars().all()

@router.put("/projects/{project_id}/measurements/{measurement_id}", response_model=MeasurementOut)
async def update_measurement(project_id: UUID, measurement_id: UUID, payload: MeasurementUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(Measurement).where(Measurement.id == measurement_id, Measurement.project_id == project_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Measurement not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(m, field, value)
    await db.commit()
    await db.refresh(m)
    return m

@router.delete("/projects/{project_id}/measurements/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(project_id: UUID, measurement_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(Measurement).where(Measurement.id == measurement_id, Measurement.project_id == project_id))
    m = result.scalar_one_or_none()
    if not m: raise HTTPException(404, "Measurement not found")
    await db.delete(m)
    await db.commit()
