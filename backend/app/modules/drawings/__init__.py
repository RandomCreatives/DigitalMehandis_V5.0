import os
import uuid
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.db.models import Drawing, Project, User, SuggestedQuantity, FederatedQuantity, DrawingCalibration, AuditLog
from app.schemas.project import DrawingOut
from app.schemas.federation import SuggestedQuantityOut, SuggestedQuantityReview, FederatedQuantityOut
from app.dependencies import get_current_user
from app.utils.file_handler import save_upload, delete_file
from app.services.grist_service import grist_service

router = APIRouter(tags=["drawings"])

async def _get_project(project_id: UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    p = result.scalar_one_or_none()
    if not p: raise HTTPException(404, "Project not found")
    return p

async def _get_drawing(drawing_id: UUID, project_id: UUID, db: AsyncSession) -> Drawing:
    result = await db.execute(
        select(Drawing).where(Drawing.id == drawing_id, Drawing.project_id == project_id)
    )
    d = result.scalar_one_or_none()
    if not d: raise HTTPException(404, "Drawing not found")
    return d

@router.post("/projects/{project_id}/drawings", response_model=DrawingOut, status_code=status.HTTP_201_CREATED)
async def upload_drawing(
    project_id: UUID,
    category: str = Form(...),
    notes: str | None = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _get_project(project_id, user, db)
    file_info = await save_upload(file)
    drawing = Drawing(
        project_id=project_id,
        filename=file.filename,
        file_path=file_info["path"],
        file_size_mb=file_info["size_mb"],
        category=category.upper(),
        page_count=file_info["page_count"],
        user_notes=notes,
    )
    db.add(drawing)

    # Auto-extract "Suggestions" from DXF if applicable (Mocked for now)
    if file.filename.lower().endswith(".dxf"):
        sq = SuggestedQuantity(
            project_id=project_id, drawing_id=drawing.id, discipline=category.upper(),
            element_category="WALL", description="Extracted from DXF Layer 0",
            quantity_value=125.5, quantity_unit="m2", section="SUPERSTRUCTURE",
            source_layer="Layer 0", confidence=0.85, status="PENDING"
        )
        db.add(sq)

    await db.commit()
    await db.refresh(drawing)
    return drawing

@router.get("/projects/{project_id}/drawings", response_model=list[DrawingOut])
async def list_drawings(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    result = await db.execute(select(Drawing).where(Drawing.project_id == project_id))
    return result.scalars().all()

@router.get("/projects/{project_id}/suggestions", response_model=list[SuggestedQuantityOut])
async def list_suggestions(project_id: UUID, status_filter: str = "PENDING", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _get_project(project_id, user, db)
    stmt = select(SuggestedQuantity).where(SuggestedQuantity.project_id == project_id, SuggestedQuantity.status == status_filter.upper())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/projects/{project_id}/suggestions/{suggestion_id}/review", response_model=SuggestedQuantityOut)
async def review_suggestion(project_id: UUID, suggestion_id: UUID, payload: SuggestedQuantityReview, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project = await _get_project(project_id, user, db)
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

        # Sync to Grist BOQ if doc exists
        if project.grist_doc_id:
            await grist_service.add_records(
                project.grist_doc_id,
                "BOQ",
                [{
                    "fields": {
                        "Description": fq.element_description,
                        "Unit": fq.quantity_unit,
                        "Quantity": float(fq.quantity_value),
                        "Rate": 0.0, # Rate will be filled by user in Grist
                    }
                }]
            )

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
