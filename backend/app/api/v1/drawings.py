"""
Drawings API — unified upload endpoint for PDF (and admin DXF).

PDF upload (main flow):
  POST /projects/{id}/drawings/upload
  → saves file, extracts text/scale/dimensions via PDFProcessor
  → generates quantity suggestions via FederationEngine
  → stores suggestions as PENDING in DB (user reviews in UI)

DXF upload (admin/testing only):
  POST /admin/drawings/dxf-upload
  → full DXF entity extraction + federation suggestions
"""
import uuid
from pathlib import Path
from uuid import UUID

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
from app.utils.pdf_processor import PDFProcessor
from app.services.federation_engine import FederationEngine, Discipline
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(tags=["drawings"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_project(project_id: UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_drawing(drawing_id: UUID, project_id: UUID, db: AsyncSession) -> Drawing:
    result = await db.execute(
        select(Drawing).where(Drawing.id == drawing_id, Drawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return drawing


async def _save_suggestions(
    db: AsyncSession,
    project_id: UUID,
    drawing_id: UUID,
    engine: FederationEngine,
) -> int:
    count = 0
    for s in engine.get_suggestions():
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
            notes=s.notes,
            status="PENDING",
        )
        db.add(sq)
        count += 1
    await db.commit()
    return count


# ── PDF Upload (main flow) ────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/drawings/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF drawing",
)
async def upload_drawing(
    project_id: UUID,
    file: UploadFile = File(...),
    category: str = Query(default="ARCHITECTURAL"),
    discipline: str = Query(default="ARCHITECTURAL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF drawing.
    - Saves the file
    - Extracts scale, dimensions, and layout (pdfplumber; OCR if available)
    - Generates quantity suggestions (pending user approval)
    - Returns drawing metadata + suggestions summary
    """
    project = await _get_project(project_id, user, db)

    # Validate discipline
    try:
        disc_enum = Discipline(discipline.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid discipline: {discipline}")

    # Save file (validates PDF, checks size)
    meta = await save_upload(file, str(project_id))

    # Persist drawing record
    drawing = Drawing(
        project_id=project_id,
        filename=meta["original_filename"],
        file_path=meta["file_path"],
        file_size_mb=meta["file_size_mb"],
        category=category.upper(),
        page_count=meta["page_count"],
    )
    db.add(drawing)
    await db.flush()  # get drawing.id before commit

    # Process file based on extension
    if meta["file_path"].endswith(".pdf"):
        processor = PDFProcessor()
        scale_info = processor.detect_scale(meta["file_path"])
        layout_data = processor.extract_text_and_layout(meta["file_path"])
        canvas_json = processor.pdf_to_canvas_json(meta["file_path"], page_number=1)
        dims = processor.detect_dimensions(meta["file_path"])
        extracted_data = _layout_to_extracted_data(layout_data)
        total_pages = layout_data["total_pages"]
    elif meta["file_path"].endswith(".dxf"):
        from app.utils.dxf_parser import DXFEntityExtractor
        extractor = DXFEntityExtractor(meta["file_path"])
        extracted_data = extractor.extract_all_entities()
        canvas_json = extractor.to_canvas_json()
        dims_list = extractor.extract_dimensions_as_list()
        dims = [
            type('obj', (object,), {'text': d['text'], 'value': d['measurement'], 'unit': '', 'page_number': 1})
            for d in dims_list
        ]
        scale_info = type('obj', (object,), {
            'scale_text': extracted_data["header_info"]["units"],
            'confidence': 1.0,
            'method': 'DXF_HEADER'
        })
        total_pages = 1
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    # Update drawing with detected scale
    if scale_info.scale_text:
        drawing.scale = scale_info.scale_text

    # Generate quantity suggestions
    engine = FederationEngine(str(project_id))
    engine.add_from_drawing(str(drawing.id), disc_enum, extracted_data)
    suggestion_count = await _save_suggestions(db, project_id, drawing.id, engine)

    await db.commit()
    await db.refresh(drawing)

    return {
        "drawing": DrawingOut.model_validate(drawing),
        "scale": scale_info.scale_text,
        "scale_confidence": scale_info.confidence,
        "scale_method": scale_info.method,
        "total_pages": total_pages,
        "dimensions_detected": len(dims),
        "dimensions": [
            {"text": d.text, "value": d.value, "unit": d.unit, "page": d.page_number}
            for d in dims[:50]
        ],
        "canvas_json": canvas_json,
        "layer_list": extracted_data.get("layer_list") if meta["file_path"].endswith(".dxf") else [],
        "summary": extracted_data.get("summary") if meta["file_path"].endswith(".dxf") else {},
        "suggestions_generated": suggestion_count,
        "message": (
            f"Drawing processed. {suggestion_count} quantity suggestions generated — "
            "review them in the Suggested Quantities tab."
        ),
    }


def _layout_to_extracted_data(layout: dict) -> dict:
    """
    Convert pdfplumber layout to the same dict shape that DXFEntityExtractor produces.
    This lets FederationEngine work on both PDF and DXF data uniformly.
    PDF lines don't have layer names, so we use a synthetic layer.
    """
    layers: dict = {}
    for page in layout.get("pages", []):
        layer_name = f"PDF_PAGE_{page['page_number']}"
        layers[layer_name] = {
            "lines": [
                {
                    "start": (ln["x0"], ln["top"]),
                    "end": (ln["x1"], ln["bottom"]),
                    "length": (
                        ((ln["x1"] - ln["x0"]) ** 2 + (ln["bottom"] - ln["top"]) ** 2) ** 0.5
                    ),
                    "layer": layer_name,
                }
                for ln in page.get("lines", [])
            ],
            "polylines": [],
            "circles": [],
            "arcs": [],
            "texts": [
                {"text": w["text"], "position": (w["x0"], w["top"]), "layer": layer_name}
                for w in page.get("words", [])
            ],
            "blocks": [],
            "dimensions": [],
            "hatches": [],
        }
    return {"layers": layers}


# ── Standard drawing CRUD ─────────────────────────────────────────────────────

@router.get("/projects/{project_id}/drawings", response_model=list[DrawingOut])
async def list_drawings(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    result = await db.execute(select(Drawing).where(Drawing.project_id == project_id))
    return result.scalars().all()


@router.get("/projects/{project_id}/drawings/{drawing_id}", response_model=DrawingOut)
async def get_drawing(
    project_id: UUID,
    drawing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    return await _get_drawing(drawing_id, project_id, db)


@router.get("/projects/{project_id}/drawings/{drawing_id}/file")
async def serve_drawing_file(
    project_id: UUID,
    drawing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    drawing = await _get_drawing(drawing_id, project_id, db)
    return FileResponse(drawing.file_path, media_type="application/pdf", filename=drawing.filename)


@router.patch("/projects/{project_id}/drawings/{drawing_id}", response_model=DrawingOut)
async def update_drawing(
    project_id: UUID,
    drawing_id: UUID,
    payload: DrawingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    drawing = await _get_drawing(drawing_id, project_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(drawing, field, value)
    await db.commit()
    await db.refresh(drawing)
    return drawing


@router.delete(
    "/projects/{project_id}/drawings/{drawing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_drawing(
    project_id: UUID,
    drawing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    drawing = await _get_drawing(drawing_id, project_id, db)
    delete_file(drawing.file_path)
    await db.delete(drawing)
    await db.commit()


# ── Suggested Quantities review ───────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/suggestions",
    response_model=list[SuggestedQuantityOut],
    summary="List quantity suggestions (pending review)",
)
async def list_suggestions(
    project_id: UUID,
    status_filter: str = Query(default="PENDING", alias="status"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    stmt = select(SuggestedQuantity).where(
        SuggestedQuantity.project_id == project_id,
        SuggestedQuantity.status == status_filter.upper(),
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/suggestions/{suggestion_id}/review",
    response_model=SuggestedQuantityOut,
    summary="Approve, reject, or edit a quantity suggestion",
)
async def review_suggestion(
    project_id: UUID,
    suggestion_id: UUID,
    payload: SuggestedQuantityReview,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Review a suggested quantity:
    - APPROVED → promotes to FederatedQuantity (used in BOQ)
    - REJECTED → marks as rejected (excluded from BOQ)
    - EDITED   → user overrides value/description, then promotes to FederatedQuantity
    """
    await _get_project(project_id, user, db)

    result = await db.execute(
        select(SuggestedQuantity).where(
            SuggestedQuantity.id == suggestion_id,
            SuggestedQuantity.project_id == project_id,
        )
    )
    sq = result.scalar_one_or_none()
    if not sq:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    valid_statuses = {"APPROVED", "REJECTED", "EDITED"}
    if payload.status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    from datetime import datetime, timezone
    sq.status = payload.status.upper()
    sq.reviewed_at = datetime.now(timezone.utc)

    if payload.quantity_value is not None:
        sq.quantity_value = payload.quantity_value
    if payload.description is not None:
        sq.description = payload.description
    if payload.notes is not None:
        sq.notes = payload.notes

    # Promote to FederatedQuantity if approved or edited
    if sq.status in ("APPROVED", "EDITED"):
        fq = FederatedQuantity(
            project_id=project_id,
            drawing_id=sq.drawing_id,
            suggested_quantity_id=sq.id,
            discipline=sq.discipline,
            element_category=sq.element_category,
            element_description=sq.description,
            quantity_value=sq.quantity_value,
            quantity_unit=sq.quantity_unit,
            section=sq.section,
            source_layer=sq.source_layer,
            is_verified=True,
            notes=sq.notes,
        )
        db.add(fq)

    await db.commit()
    await db.refresh(sq)
    return sq


@router.get(
    "/projects/{project_id}/federated-quantities",
    response_model=list[FederatedQuantityOut],
    summary="List approved (federated) quantities",
)
async def list_federated_quantities(
    project_id: UUID,
    discipline: str | None = Query(default=None),
    section: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_project(project_id, user, db)
    stmt = select(FederatedQuantity).where(FederatedQuantity.project_id == project_id)
    if discipline:
        stmt = stmt.where(FederatedQuantity.discipline == discipline.upper())
    if section:
        stmt = stmt.where(FederatedQuantity.section == section.upper())
    result = await db.execute(stmt)
    return result.scalars().all()


# ── Admin: DXF upload (backend-only, not exposed in main UI) ──────────────────

@router.post(
    "/admin/drawings/dxf-upload",
    summary="[Admin] Upload a DXF drawing for testing/early adopters",
    include_in_schema=True,
)
async def upload_dxf_admin(
    project_id: UUID,
    file: UploadFile = File(...),
    discipline: str = Query(default="ARCHITECTURAL"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-only DXF upload. Full entity extraction + federation suggestions.
    DXF support is Phase 2 in the main UI; this route is for testing.
    """
    try:
        from app.utils.dxf_parser import DXFEntityExtractor, EZDXF_AVAILABLE
    except ImportError:
        raise HTTPException(status_code=501, detail="ezdxf not installed")

    if not EZDXF_AVAILABLE:
        raise HTTPException(status_code=501, detail="ezdxf not installed. Run: pip install ezdxf")

    project = await _get_project(project_id, user, db)

    try:
        disc_enum = Discipline(discipline.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid discipline: {discipline}")

    filename = (file.filename or "").lower()
    if not filename.endswith(".dxf"):
        raise HTTPException(status_code=400, detail="File must be .dxf")

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR) / str(project_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = upload_dir / f"{file_id}.dxf"
    content = await file.read()
    file_path.write_bytes(content)

    # Parse DXF
    try:
        extractor = DXFEntityExtractor(str(file_path))
        entities = extractor.extract_all_entities()
        dimensions = extractor.extract_dimensions_as_list()
        block_counts = extractor.count_block_insertions()
        canvas_json = extractor.to_canvas_json()
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"DXF parsing failed: {exc}")

    # Persist drawing
    drawing = Drawing(
        project_id=project_id,
        filename=file.filename,
        file_path=str(file_path),
        file_size_mb=round(len(content) / (1024 * 1024), 2),
        category=discipline.upper(),
        page_count=1,
    )
    db.add(drawing)
    await db.flush()

    # Generate suggestions
    engine = FederationEngine(str(project_id))
    engine.add_from_drawing(str(drawing.id), disc_enum, entities)
    suggestion_count = await _save_suggestions(db, project_id, drawing.id, engine)

    await db.commit()
    await db.refresh(drawing)

    return {
        "drawing_id": str(drawing.id),
        "format": "DXF",
        "discipline": discipline,
        "filename": file.filename,
        "summary": entities["summary"],
        "layer_list": entities["layer_list"],
        "dimensions_count": len(dimensions),
        "dimensions": dimensions[:100],
        "block_counts": block_counts,
        "canvas_json": canvas_json,
        "federation_summary": engine.get_summary(),
        "suggestions_generated": suggestion_count,
    }
