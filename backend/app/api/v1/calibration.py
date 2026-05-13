from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import DrawingCalibration, DrawingPage, User, Project
from app.schemas.calibration import DrawingCalibrationCreate, DrawingCalibrationUpdate, DrawingCalibrationOut, DrawingPageOut
from app.dependencies import get_current_user
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/projects/{project_id}/calibration", tags=["calibration"])

async def _check_project(project_id: UUID, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

@router.get("/pages/{page_id}", response_model=DrawingPageOut)
async def get_page_calibration(project_id: UUID, page_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(DrawingPage).where(DrawingPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.post("", response_model=DrawingCalibrationOut, status_code=status.HTTP_201_CREATED)
async def create_calibration(project_id: UUID, payload: DrawingCalibrationCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)

    # Check if already exists
    existing = await db.execute(select(DrawingCalibration).where(DrawingCalibration.page_id == payload.page_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Calibration already exists for this page")

    cal = DrawingCalibration(**payload.model_dump())
    db.add(cal)

    await log_action(db, project_id, user.id, "DRAWING", "CALIBRATE", f"Calibrated page {payload.page_id}", payload.model_dump())

    await db.commit()
    await db.refresh(cal)
    return cal

@router.patch("/{calibration_id}", response_model=DrawingCalibrationOut)
async def update_calibration(project_id: UUID, calibration_id: UUID, payload: DrawingCalibrationUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(DrawingCalibration).where(DrawingCalibration.id == calibration_id))
    cal = result.scalar_one_or_none()
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cal, field, value)

    await log_action(db, project_id, user.id, "DRAWING", "UPDATE_CALIBRATION", f"Updated calibration {calibration_id}", payload.model_dump())

    await db.commit()
    await db.refresh(cal)
    return cal
