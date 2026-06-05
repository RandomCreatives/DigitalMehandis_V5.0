from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import BBSBar, Project, User, SuggestedQuantity
from app.schemas.bbs import BBSBarCreate, BBSBarUpdate, BBSBarOut, CuttingListItem
from app.dependencies import get_current_user
from app.utils.bbs_calculator import BBSCalculator
from app.utils.bbs_csv_parser import parse_bbs_csv

router = APIRouter(prefix="/projects/{project_id}/bbs", tags=["bbs"])


async def _check_project(project_id: UUID, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")


def _bar_mark(index: int) -> str:
    return f"B{index}"


def _enrich(bar: BBSBar, standard: str = "EBCS_3") -> dict:
    raw = {
        "bar_shape": bar.bar_shape,
        "clear_length_m": float(bar.clear_length_m),
        "cutting_length_m": float(bar.cutting_length_m) if bar.cutting_length_m is not None else None,
        "bar_diameter_mm": bar.bar_diameter_mm,
        "hook_length_mm": bar.hook_length_mm or 0,
        "cover_top_mm": bar.cover_top_mm or 50,
        "cover_bottom_mm": bar.cover_bottom_mm or 50,
        "quantity": bar.quantity,
    }
    enriched = BBSCalculator.enrich_bar(raw, standard)
    return {
        "id": bar.id,
        "project_id": bar.project_id,
        "bar_mark": bar.bar_mark,
        "member_name": bar.member_name,
        "bar_diameter_mm": bar.bar_diameter_mm,
        "bar_shape": bar.bar_shape,
        "quantity": bar.quantity,
        "clear_length_m": float(bar.clear_length_m),
        "cutting_length_m": enriched["cutting_length_m"],
        "hook_length_mm": bar.hook_length_mm,
        "cover_top_mm": bar.cover_top_mm,
        "cover_bottom_mm": bar.cover_bottom_mm,
        "lap_length_mm": enriched["lap_length_mm"],
        "weight_per_unit_kg": enriched["weight_per_unit_kg"],
        "total_weight_kg": enriched["total_weight_kg"],
        "section": bar.section,
        "notes": bar.notes,
        "created_at": bar.created_at,
    }


@router.get("", response_model=list[BBSBarOut])
async def list_bars(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BBSBar).where(BBSBar.project_id == project_id))
    bars = result.scalars().all()
    return [_enrich(b) for b in bars]


@router.post("", response_model=BBSBarOut, status_code=status.HTTP_201_CREATED)
async def add_bar(project_id: UUID, payload: BBSBarCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)

    # Auto-generate bar mark
    count_result = await db.execute(select(BBSBar).where(BBSBar.project_id == project_id))
    count = len(count_result.scalars().all())

    lap = BBSCalculator.calculate_lap_length(payload.bar_diameter_mm, payload.standard)

    bar = BBSBar(
        project_id=project_id,
        bar_mark=_bar_mark(count + 1),
        member_name=payload.member_name,
        bar_diameter_mm=payload.bar_diameter_mm,
        bar_shape=payload.bar_shape,
        quantity=payload.quantity,
        clear_length_m=payload.clear_length_m,
        cutting_length_m=payload.cutting_length_m,
        hook_length_mm=payload.hook_length_mm,
        bend_deduction_mm=payload.bend_deduction_mm,
        cover_top_mm=payload.cover_top_mm,
        cover_bottom_mm=payload.cover_bottom_mm,
        lap_length_mm=lap,
        section=payload.section,
        notes=payload.notes,
    )
    db.add(bar)
    await db.commit()
    await db.refresh(bar)
    return _enrich(bar)


@router.put("/{bar_id}", response_model=BBSBarOut)
async def update_bar(project_id: UUID, bar_id: UUID, payload: BBSBarUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BBSBar).where(BBSBar.id == bar_id, BBSBar.project_id == project_id))
    bar = result.scalar_one_or_none()
    if not bar:
        raise HTTPException(status_code=404, detail="Bar not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(bar, field, value)
    await db.commit()
    await db.refresh(bar)
    return _enrich(bar)


@router.delete("/{bar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bar(project_id: UUID, bar_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BBSBar).where(BBSBar.id == bar_id, BBSBar.project_id == project_id))
    bar = result.scalar_one_or_none()
    if not bar:
        raise HTTPException(status_code=404, detail="Bar not found")
    await db.delete(bar)
    await db.commit()


@router.get("/cutting-list", response_model=list[CuttingListItem])
async def cutting_list(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_project(project_id, user, db)
    result = await db.execute(select(BBSBar).where(BBSBar.project_id == project_id))
    bars = result.scalars().all()

    groups: dict[tuple, dict] = {}
    for bar in bars:
        enriched = _enrich(bar)
        key = (bar.bar_diameter_mm, enriched["cutting_length_m"])
        if key not in groups:
            groups[key] = {"diameter_mm": bar.bar_diameter_mm, "cutting_length_m": enriched["cutting_length_m"], "total_qty": 0, "total_weight_kg": 0.0}
        groups[key]["total_qty"] += bar.quantity
        groups[key]["total_weight_kg"] = round(groups[key]["total_weight_kg"] + enriched["total_weight_kg"], 3)

    return list(groups.values())


@router.post("/sync-to-boq", status_code=status.HTTP_201_CREATED)
async def sync_to_boq(
    project_id: UUID,
    section: str = Query(default="SUBSTRUCTURE"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync BBS steel totals to the SuggestedQuantity table.
    Groups by diameter and creates one suggested quantity per diameter.
    This follows the Phase 2 federation workflow: Suggestion -> Review -> BOQ.
    """
    await _check_project(project_id, user, db)

    # Fetch all bars for this project and section
    result = await db.execute(
        select(BBSBar).where(
            BBSBar.project_id == project_id,
            BBSBar.section == section.upper()
        )
    )
    bars = result.scalars().all()

    if not bars:
        return {"message": f"No BBS bars found for section {section}", "count": 0}

    # Aggregate by diameter
    totals: dict[int, float] = {}
    for bar in bars:
        raw = {
            "bar_shape": bar.bar_shape,
            "clear_length_m": float(bar.clear_length_m),
            "cutting_length_m": float(bar.cutting_length_m) if bar.cutting_length_m is not None else None,
            "bar_diameter_mm": bar.bar_diameter_mm,
            "hook_length_mm": bar.hook_length_mm or 0,
            "cover_top_mm": bar.cover_top_mm or 50,
            "cover_bottom_mm": bar.cover_bottom_mm or 50,
            "quantity": bar.quantity,
        }
        enriched = BBSCalculator.enrich_bar(raw)
        totals[bar.bar_diameter_mm] = totals.get(bar.bar_diameter_mm, 0.0) + enriched["total_weight_kg"]

    # Create SuggestedQuantity entries
    created_count = 0
    for dia, weight_kg in totals.items():
        # Check if a suggestion for this diameter/section already exists to avoid duplicates
        # In a real app, we might want to update it or create a new version.
        # For now, we'll just create a new one.
        suggestion = SuggestedQuantity(
            project_id=project_id,
            discipline="STRUCTURAL",
            element_category="REINFORCEMENT",
            description=f"High yield deformed bar Ø{dia}mm (from BBS)",
            quantity_value=round(weight_kg, 3),
            quantity_unit="kg",
            section=section.upper(),
            confidence=1.0,
            notes=f"Auto-synced from BBS total for {section}",
            status="PENDING"
        )
        db.add(suggestion)
        created_count += 1

    await db.commit()

    return {
        "message": f"Synced {created_count} reinforcement totals to suggestions",
        "count": created_count,
        "section": section
    }


@router.post("/import-csv", status_code=status.HTTP_201_CREATED)
async def import_bbs_csv(
    project_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a BBS CSV file in the Ethiopian QS format (e.g., exported from Excel).
    Uses the cutting_length_m directly from the CSV (Ethiopian standard practice).
    """
    await _check_project(project_id, user, db)

    if not file.filename or not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV or TXT files are accepted")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        parsed_rows = list(parse_bbs_csv(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {str(e)}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="No valid data rows found in CSV")

    # Get current bar count for auto-mark
    count_result = await db.execute(select(BBSBar).where(BBSBar.project_id == project_id))
    existing_count = len(count_result.scalars().all())

    created = 0
    for idx, row in enumerate(parsed_rows, start=existing_count + 1):
        lap = BBSCalculator.calculate_lap_length(row.bar_diameter_mm, "EBCS_3")
        bar = BBSBar(
            project_id=project_id,
            bar_mark=f"B{idx}",
            member_name=row.member_name,
            bar_diameter_mm=row.bar_diameter_mm,
            bar_shape=row.bar_shape,
            quantity=row.quantity,
            clear_length_m=row.clear_length_m,
            cutting_length_m=row.cutting_length_m,
            hook_length_mm=0,
            bend_deduction_mm=0,
            cover_top_mm=50,
            cover_bottom_mm=50,
            lap_length_mm=lap,
            section=row.section,
            notes=row.notes,
        )
        db.add(bar)
        created += 1

    await db.commit()

    return {
        "message": f"Imported {created} bar records from CSV",
        "count": created,
        "sections": list({r.section for r in parsed_rows}),
        "diameters": list({r.bar_diameter_mm for r in parsed_rows}),
    }
