"""BBS CSV Parser — imports Ethiopian-style BBS Excel/CSV exports."""
import csv
import io
from typing import Iterator
from dataclasses import dataclass


@dataclass
class ParsedBBSRow:
    member_name: str
    bar_type: str
    bar_diameter_mm: int
    bar_shape: str
    cutting_length_m: float
    clear_length_m: float
    quantity: int
    section: str
    notes: str


def _infer_shape(bar_type: str, shape_char: str) -> str:
    bar_type_lower = bar_type.lower()
    if bar_type_lower in ("st", "stirrups", "st-1", "st-2") or "stirrup" in bar_type_lower:
        return "SPIRAL"
    if shape_char and shape_char.strip() in ("`", "'", "hooks", "hook"):
        return "HOOK"
    return "STRAIGHT"


def _clean_section(section_raw: str) -> str:
    s = section_raw.strip().upper().replace(" ", "")
    if s.startswith("SUB"):
        return "SUBSTRUCTURE"
    if s.startswith(("SUPER", "GROUND", "FLOOR", "STAIR", "ROOF", "MEZZANINE")):
        return "SUPERSTRUCTURE"
    return "SUBSTRUCTURE"


def parse_bbs_csv(file_bytes: bytes) -> Iterator[ParsedBBSRow]:
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if len(rows) < 3:
        return

    header_idx = 0
    for i, row in enumerate(rows):
        if any(h in row for h in ("LOCATION", "Bar Type", "Bar dia")):
            header_idx = i
            break

    header = rows[header_idx]
    def col_idx(name: str) -> int | None:
        for idx, cell in enumerate(header):
            if cell and name.lower() in cell.strip().lower():
                return idx
        return None

    loc_idx = col_idx("LOCATION") or 0
    type_idx = col_idx("Bar Type") or 1
    dia_idx = col_idx("Bar dia") or 2
    shape_idx = col_idx("Bar shape") or 3
    length_idx = col_idx("Bar Length") or 4
    members_idx = col_idx("Members") or 5
    bars_idx = col_idx("Bars") or 6
    total_bars_idx = col_idx("Total") or 7

    sub_header = rows[header_idx + 1] if len(rows) > header_idx + 1 else []
    diameter_cols = {}
    for idx, cell in enumerate(sub_header):
        try:
            d = int(cell.strip())
            if d in (6, 8, 10, 12, 14, 16, 20, 24, 25, 32):
                diameter_cols[d] = idx
        except (ValueError, AttributeError):
            pass

    current_section = "SUBSTRUCTURE"
    current_location = ""
    current_bar_type = ""

    for row in rows[header_idx + 2:]:
        if not row or all(not cell.strip() for cell in row):
            continue

        first_cell = row[0].strip().upper() if row else ""
        if any(k in first_cell for k in ("SUB STRUCTURE", "SUPER STRUCTURE", "GROUND FLOOR", "STAIR CASE")):
            current_section = _clean_section(first_cell)
            current_location = ""
            current_bar_type = ""
            continue

        if any(k in first_cell for k in ("TOTAL", "UNIT WT", "GRAND TOTAL", "SUB TOTAL")):
            continue

        location = row[loc_idx].strip() if loc_idx < len(row) and row[loc_idx] else ""
        if location:
            current_location = location
        location = current_location or "Unknown"

        bar_type = row[type_idx].strip() if type_idx < len(row) and row[type_idx] else ""
        if bar_type:
            current_bar_type = bar_type
        bar_type = current_bar_type or "Bar"

        dia_str = row[dia_idx].strip() if dia_idx < len(row) and row[dia_idx] else ""
        if not dia_str:
            continue
        try:
            diameter = int(dia_str)
        except ValueError:
            continue

        length_str = row[length_idx].strip() if length_idx < len(row) and row[length_idx] else ""
        if not length_str:
            continue
        try:
            cutting_length = float(length_str)
        except ValueError:
            continue
        if cutting_length <= 0:
            continue

        qty_str = row[total_bars_idx].strip() if total_bars_idx < len(row) and row[total_bars_idx] else ""
        if not qty_str:
            members_str = row[members_idx].strip() if members_idx < len(row) and row[members_idx] else ""
            bars_str = row[bars_idx].strip() if bars_idx < len(row) and row[bars_idx] else ""
            try:
                members = int(members_str) if members_str else 1
                bars = int(bars_str) if bars_str else 1
                qty = members * bars
            except ValueError:
                continue
        else:
            try:
                qty = int(qty_str)
            except ValueError:
                continue

        if qty <= 0:
            continue

        shape_char = row[shape_idx].strip() if shape_idx < len(row) and row[shape_idx] else ""
        shape = _infer_shape(bar_type, shape_char)

        member_name = f"{location} — {bar_type}" if location != bar_type else location
        notes = f"Imported from CSV: {location} | {bar_type}"

        yield ParsedBBSRow(
            member_name=member_name,
            bar_type=bar_type,
            bar_diameter_mm=diameter,
            bar_shape=shape,
            cutting_length_m=round(cutting_length, 3),
            clear_length_m=round(cutting_length, 3),
            quantity=qty,
            section=current_section,
            notes=notes,
        )
