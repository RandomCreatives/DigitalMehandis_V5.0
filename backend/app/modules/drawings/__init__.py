"""
Drawings API — updated to use ExtractionService for unified PDF/DXF processing.
Includes Review and Federated Quantity endpoints.
"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Drawing, Project, User, SuggestedQuantity, FederatedQuantity
from app.schemas.drawing import DrawingOut, DrawingUpdate
from app.schemas.federation import SuggestedQuantityOut, SuggestedQuantityReview, FederatedQuantityOut
from app.dependencies import get_current_user
from app.utils.file_handler import save_upload, delete_file
from app.services.extraction_service import ExtractionService
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(tags=["drawings"])

async def _get_project(project_id: UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

async def _get_drawing(drawing_id: UUID, project_id: UUID, db: AsyncSession) -> Drawing:
    result = await db.execute(select(Drawing).where(Drawing.id == drawing_id, Drawing.project_id == project_id))
    drawing = result.scalar_one_or_none()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return drawing

async def _save_suggestions(db: AsyncSession, project_id: UUID, drawing_id: UUID, suggestions: list) -> int:
    count = 0
    for s in suggestions:
        sq = SuggestedQuantity(
            project_id=project_id,
            drawing_id=drawing_id,
            discipline=s.discipline,
            element_category=s.element_category,
            description=s.description,
            quantity_value=s.value,
            quantity_unit=s.unit,
            section=s.section,
            source_layer=s.source_layer,
            confidence=s.confidence,
            notes=f"{s.notes} (MoUDC: {s.moudc_code})",
            status="PENDING",
        )
        db.add(sq)
        count += 1
    await db.commit()
    return count

@router.post("/projects/{project_id}/drawings/upload", status_code=status.HTTP_201_CREATED)
async def upload_drawing(
    project_id: UUID,
    file: UploadFile = File(...),
    category: str = Query(default="ARCHITECTURAL"),
    discipline: str = Query(default="ARCHITECTURAL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project(project_id, user, db)
    filename = (file.filename or "").lower()
    is_dxf = filename.endswith(".dxf")

    meta = await save_upload(file, str(project_id))
    drawing = Drawing(
        project_id=project_id,
        filename=meta["original_filename"],
        file_path=meta["file_path"],
        file_size_mb=meta["file_size_mb"],
        category=category.upper(),
        page_count=meta["page_count"],
    )
    db.add(drawing)
    await db.flush()

    result = await ExtractionService.extract_from_drawing(
        project_id=project_id,
        drawing_id=drawing.id,
        file_path=meta["file_path"],
        discipline=discipline,
        is_dxf=is_dxf
    )

    suggestion_count = await _save_suggestions(db, project_id, drawing.id, result["suggestions"])
    await db.commit()
    await db.refresh(drawing)

    return {
        "drawing": DrawingOut.model_validate(drawing),
        "canvas_json": result["canvas_json"],
        "suggestions_generated": suggestion_count,
        "message": f"Drawing processed successfully. {suggestion_count} suggestions generated.",
    }

@router.get("/projects/{project_id}/drawings", response_model=list[DrawingOut])
async def list_drawings(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    result = await db.execute(select(Drawing).where(Drawing.project_id == project_id))
    return result.scalars().all()

@router.get("/projects/{project_id}/drawings/{drawing_id}", response_model=DrawingOut)
async def get_drawing(project_id: UUID, drawing_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    return await _get_drawing(drawing_id, project_id, db)

@router.get("/projects/{project_id}/suggestions", response_model=list[SuggestedQuantityOut])
async def list_suggestions(project_id: UUID, status_filter: str = Query(default="PENDING", alias="status"), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    stmt = select(SuggestedQuantity).where(SuggestedQuantity.project_id == project_id, SuggestedQuantity.status == status_filter.upper())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/projects/{project_id}/suggestions/{suggestion_id}/review", response_model=SuggestedQuantityOut)
async def review_suggestion(project_id: UUID, suggestion_id: UUID, payload: SuggestedQuantityReview, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    result = await db.execute(select(SuggestedQuantity).where(SuggestedQuantity.id == suggestion_id, SuggestedQuantity.project_id == project_id))
    sq = result.scalar_one_or_none()
    if not sq: raise HTTPException(404, "Suggestion not found")

    sq.status = payload.status.upper()
    sq.reviewed_at = datetime.now(timezone.utc)
    if payload.quantity_value is not None: sq.quantity_value = payload.quantity_value
    if payload.description is not None: sq.description = payload.description

    if sq.status in ("APPROVED", "EDITED"):
        fq = FederatedQuantity(
            project_id=project_id, drawing_id=sq.drawing_id, suggested_quantity_id=sq.id,
            discipline=sq.discipline, element_category=sq.element_category, element_description=sq.description,
            quantity_value=sq.quantity_value, quantity_unit=sq.quantity_unit, section=sq.section,
            source_layer=sq.source_layer, is_verified=True, notes=sq.notes,
        )
        db.add(fq)
    await db.commit()
    await db.refresh(sq)
    return sq

@router.get("/projects/{project_id}/federated-quantities", response_model=list[FederatedQuantityOut])
async def list_federated_quantities(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    result = await db.execute(select(FederatedQuantity).where(FederatedQuantity.project_id == project_id))
    return result.scalars().all()

@router.delete("/projects/{project_id}/drawings/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drawing(project_id: UUID, drawing_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    drawing = await _get_drawing(drawing_id, project_id, db)
    delete_file(drawing.file_path)
    await db.delete(drawing)
    await db.commit()
