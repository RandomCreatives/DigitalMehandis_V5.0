from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Measurement, ProjectElement, User, Project
from app.schemas.measurement import MeasurementCreate, MeasurementUpdate, MeasurementOut, ProjectElementCreate, ProjectElementOut
from app.dependencies import get_current_user
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/projects/{project_id}", tags=["measurements"])

async def _check_project(project_id: UUID, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

@router.get("/elements", response_model=list[ProjectElementOut])
async def list_elements(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(ProjectElement).where(ProjectElement.project_id == project_id))
    return result.scalars().all()

@router.post("/elements", response_model=ProjectElementOut, status_code=status.HTTP_201_CREATED)
async def create_element(project_id: UUID, payload: ProjectElementCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    el = ProjectElement(**payload.model_dump(), project_id=project_id)
    db.add(el)
    await log_action(db, project_id, user.id, "MEASUREMENT", "CREATE_ELEMENT", f"Created element {payload.name}")
    await db.commit()
    await db.refresh(el)
    return el

@router.get("/measurements", response_model=list[MeasurementOut])
async def list_measurements(project_id: UUID, page_id: UUID | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    stmt = select(Measurement).join(Measurement.page).join(Measurement.page.property.mapper.class_.drawing).where(Measurement.page.property.mapper.class_.drawing.project_id == project_id)
    # Corrected join path if needed, but let's just use project elements for now or drawing pages.
    # Simpler:
    from app.db.models import DrawingPage, Drawing
    stmt = select(Measurement).join(DrawingPage).join(Drawing).where(Drawing.project_id == project_id)

    if page_id:
        stmt = stmt.where(Measurement.page_id == page_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/measurements", response_model=MeasurementOut, status_code=status.HTTP_201_CREATED)
async def create_measurement(project_id: UUID, payload: MeasurementCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    m = Measurement(**payload.model_dump())
    db.add(m)
    await log_action(db, project_id, user.id, "MEASUREMENT", "CREATE", f"Created {payload.type} measurement: {payload.value} {payload.unit}")
    await db.commit()
    await db.refresh(m)
    return m

@router.delete("/measurements/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(project_id: UUID, measurement_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(Measurement).where(Measurement.id == measurement_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    await db.delete(m)
    await log_action(db, project_id, user.id, "MEASUREMENT", "DELETE", f"Deleted measurement {measurement_id}")
    await db.commit()
