"""
Federation Engine — extracts quantity SUGGESTIONS from parsed drawing data.

Phase 1 behavior (suggestions-only):
  - Auto-extraction produces "pending" suggestions
  - User reviews, edits, and approves each suggestion
  - Only approved quantities flow into the BOQ

This builds trust: the system helps, the QS professional decides.
"""
import logging
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Dict, List, Optional

from app.utils.symbol_classifier import SymbolClassifier
from app.utils.geometry_calculator import GeometryCalculator

logger = logging.getLogger(__name__)


class Discipline(str, Enum):
    ARCHITECTURAL = "ARCHITECTURAL"
    STRUCTURAL = "STRUCTURAL"
    ELECTRICAL = "ELECTRICAL"
    SANITARY = "SANITARY"


class Section(str, Enum):
    SUBSTRUCTURE = "SUBSTRUCTURE"
    SUPERSTRUCTURE = "SUPERSTRUCTURE"


@dataclass
class QuantitySuggestion:
    """
    A quantity extracted from a drawing — pending user approval.
    """
    discipline: str
    element_category: str
    description: str
    value: float
    unit: str
    section: str
    source_drawing_id: str
    source_layer: str = ""
    confidence: float = 0.8   # 0–1: how confident the system is
    notes: str = ""


class FederationEngine:
    """
    Federates quantity data from all 4 disciplines into a unified suggestion list.

    Inspired by Navisworks' model federation concept, but for QUANTITY DATA.
    All suggestions are "pending" — the QS professional approves/rejects/edits them.
    """

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.suggestions: List[QuantitySuggestion] = []

    def add_from_drawing(
        self,
        drawing_id: str,
        discipline: Discipline,
        extracted_data: Dict[str, Any],
    ) -> None:
        """
        Process extracted DXF/PDF data and generate quantity suggestions.
        """
        logger.info(f"Federation: processing {discipline} drawing {drawing_id}")
        match discipline:
            case Discipline.ARCHITECTURAL:
                self._process_architectural(drawing_id, extracted_data)
            case Discipline.STRUCTURAL:
                self._process_structural(drawing_id, extracted_data)
            case Discipline.ELECTRICAL:
                self._process_electrical(drawing_id, extracted_data)
            case Discipline.SANITARY:
                self._process_sanitary(drawing_id, extracted_data)

    # ── Discipline processors ─────────────────────────────────────────────────

    def _process_architectural(self, drawing_id: str, data: Dict[str, Any]) -> None:
        for layer_name, ld in data.get("layers", {}).items():
            layer_lower = layer_name.lower()

            # Wall lengths from polylines on wall layers
            if "wall" in layer_lower:
                for poly in ld.get("polylines", []):
                    self._add(QuantitySuggestion(
                        discipline=Discipline.ARCHITECTURAL,
                        element_category="WALL",
                        description=f"Wall length (layer: {layer_name})",
                        value=round(poly["length"], 3),
                        unit="m",
                        section=Section.SUPERSTRUCTURE,
                        source_drawing_id=drawing_id,
                        source_layer=layer_name,
                        confidence=0.75,
                    ))

            # Floor/room areas from closed polylines
            if any(k in layer_lower for k in ("room", "area", "floor", "slab")):
                for poly in ld.get("polylines", []):
                    if poly.get("is_closed") and poly.get("area", 0) > 0:
                        self._add(QuantitySuggestion(
                            discipline=Discipline.ARCHITECTURAL,
                            element_category="FLOOR_AREA",
                            description=f"Floor area (layer: {layer_name})",
                            value=round(poly["area"], 3),
                            unit="m²",
                            section=Section.SUPERSTRUCTURE,
                            source_drawing_id=drawing_id,
                            source_layer=layer_name,
                            confidence=0.7,
                        ))

        # Count doors & windows from block insertions
        block_counts = self._collect_block_counts(data)
        classified = SymbolClassifier.get_quantities_by_discipline(block_counts)
        for category, count in classified.get("ARCHITECTURAL", {}).items():
            if category in ("DOOR", "WINDOW", "STAIR"):
                self._add(QuantitySuggestion(
                    discipline=Discipline.ARCHITECTURAL,
                    element_category=category,
                    description=f"{category.title()} count (from block symbols)",
                    value=float(count),
                    unit="Nr",
                    section=Section.SUPERSTRUCTURE,
                    source_drawing_id=drawing_id,
                    confidence=0.85,
                ))

    def _process_structural(self, drawing_id: str, data: Dict[str, Any]) -> None:
        for layer_name, ld in data.get("layers", {}).items():
            layer_lower = layer_name.lower()

            # Footing / foundation outlines
            if any(k in layer_lower for k in ("footing", "foundation", "fnd", "fdn")):
                for poly in ld.get("polylines", []):
                    if poly.get("is_closed") and poly.get("area", 0) > 0:
                        self._add(QuantitySuggestion(
                            discipline=Discipline.STRUCTURAL,
                            element_category="FOOTING",
                            description=f"Footing outline area (layer: {layer_name})",
                            value=round(poly["area"], 3),
                            unit="m²",
                            section=Section.SUBSTRUCTURE,
                            source_drawing_id=drawing_id,
                            source_layer=layer_name,
                            confidence=0.8,
                        ))

            # Column cross-sections
            if any(k in layer_lower for k in ("column", "col", "pillar")):
                for poly in ld.get("polylines", []):
                    if poly.get("is_closed") and poly.get("area", 0) > 0:
                        self._add(QuantitySuggestion(
                            discipline=Discipline.STRUCTURAL,
                            element_category="COLUMN",
                            description=f"Column cross-section (layer: {layer_name})",
                            value=round(poly["area"], 3),
                            unit="m²",
                            section=Section.SUPERSTRUCTURE,
                            source_drawing_id=drawing_id,
                            source_layer=layer_name,
                            confidence=0.75,
                        ))

            # Beam centerlines
            if "beam" in layer_lower:
                for poly in ld.get("polylines", []):
                    self._add(QuantitySuggestion(
                        discipline=Discipline.STRUCTURAL,
                        element_category="BEAM",
                        description=f"Beam centerline length (layer: {layer_name})",
                        value=round(poly["length"], 3),
                        unit="m",
                        section=Section.SUPERSTRUCTURE,
                        source_drawing_id=drawing_id,
                        source_layer=layer_name,
                        confidence=0.75,
                    ))

            # Slab areas
            if "slab" in layer_lower:
                for poly in ld.get("polylines", []):
                    if poly.get("is_closed") and poly.get("area", 0) > 0:
                        self._add(QuantitySuggestion(
                            discipline=Discipline.STRUCTURAL,
                            element_category="SLAB",
                            description=f"Slab area (layer: {layer_name})",
                            value=round(poly["area"], 3),
                            unit="m²",
                            section=Section.SUPERSTRUCTURE,
                            source_drawing_id=drawing_id,
                            source_layer=layer_name,
                            confidence=0.8,
                        ))

        # Column counts from blocks
        block_counts = self._collect_block_counts(data)
        classified = SymbolClassifier.get_quantities_by_discipline(block_counts)
        for category, count in classified.get("STRUCTURAL", {}).items():
            self._add(QuantitySuggestion(
                discipline=Discipline.STRUCTURAL,
                element_category=category,
                description=f"{category.title()} count (from block symbols)",
                value=float(count),
                unit="Nr",
                section=Section.SUPERSTRUCTURE,
                source_drawing_id=drawing_id,
                confidence=0.85,
            ))

    def _process_electrical(self, drawing_id: str, data: Dict[str, Any]) -> None:
        # Count fixtures from blocks
        block_counts = self._collect_block_counts(data)
        classified = SymbolClassifier.get_quantities_by_discipline(block_counts)
        for category, count in classified.get("ELECTRICAL", {}).items():
            self._add(QuantitySuggestion(
                discipline=Discipline.ELECTRICAL,
                element_category=category,
                description=f"{category.replace('_', ' ').title()} count",
                value=float(count),
                unit="Nr",
                section=Section.SUPERSTRUCTURE,
                source_drawing_id=drawing_id,
                confidence=0.85,
            ))

        # Conduit / cable lengths
        for layer_name, ld in data.get("layers", {}).items():
            if any(k in layer_name.lower() for k in ("conduit", "cable", "wire", "trunking")):
                total = sum(line["length"] for line in ld.get("lines", []))
                if total > 0:
                    self._add(QuantitySuggestion(
                        discipline=Discipline.ELECTRICAL,
                        element_category="CONDUIT",
                        description=f"Conduit/cable run (layer: {layer_name})",
                        value=round(total, 3),
                        unit="m",
                        section=Section.SUPERSTRUCTURE,
                        source_drawing_id=drawing_id,
                        source_layer=layer_name,
                        confidence=0.7,
                    ))

    def _process_sanitary(self, drawing_id: str, data: Dict[str, Any]) -> None:
        # Count fixtures from blocks
        block_counts = self._collect_block_counts(data)
        classified = SymbolClassifier.get_quantities_by_discipline(block_counts)
        for category, count in classified.get("SANITARY", {}).items():
            self._add(QuantitySuggestion(
                discipline=Discipline.SANITARY,
                element_category=category,
                description=f"{category.replace('_', ' ').title()} count",
                value=float(count),
                unit="Nr",
                section=Section.SUPERSTRUCTURE,
                source_drawing_id=drawing_id,
                confidence=0.85,
            ))

        # Pipe lengths
        for layer_name, ld in data.get("layers", {}).items():
            if any(k in layer_name.lower() for k in ("pipe", "drain", "supply", "sewer", "waste")):
                total = sum(line["length"] for line in ld.get("lines", []))
                if total > 0:
                    diameter = self._extract_diameter(layer_name)
                    self._add(QuantitySuggestion(
                        discipline=Discipline.SANITARY,
                        element_category="PIPE",
                        description=f"Pipe {diameter} (layer: {layer_name})",
                        value=round(total, 3),
                        unit="m",
                        section=Section.SUPERSTRUCTURE,
                        source_drawing_id=drawing_id,
                        source_layer=layer_name,
                        confidence=0.7,
                        notes=f"Diameter: {diameter}",
                    ))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _add(self, suggestion: QuantitySuggestion) -> None:
        if suggestion.value > 0:
            self.suggestions.append(suggestion)

    @staticmethod
    def _collect_block_counts(data: Dict[str, Any]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for ld in data.get("layers", {}).values():
            for block in ld.get("blocks", []):
                name = block["block_name"]
                counts[name] = counts.get(name, 0) + 1
        return counts

    @staticmethod
    def _extract_diameter(layer_name: str) -> str:
        import re
        m = re.search(r"(\d+)\s*mm", layer_name.lower())
        if m:
            return f"{m.group(1)}mm"
        m = re.search(r"dn\s*(\d+)", layer_name.lower())
        if m:
            return f"DN{m.group(1)}"
        return "unknown"

    # ── Output ────────────────────────────────────────────────────────────────

    def get_suggestions(self) -> List[QuantitySuggestion]:
        return self.suggestions

    def get_summary(self) -> Dict[str, Any]:
        summary: Dict[str, Any] = {
            "total_suggestions": len(self.suggestions),
            "by_discipline": {},
            "by_element": {},
        }
        for s in self.suggestions:
            summary["by_discipline"].setdefault(s.discipline, 0)
            summary["by_discipline"][s.discipline] += 1
            summary["by_element"].setdefault(s.element_category, {"count": 0, "total_value": 0, "unit": s.unit})
            summary["by_element"][s.element_category]["count"] += 1
            summary["by_element"][s.element_category]["total_value"] += s.value
        return summary

    def to_dict_list(self) -> List[Dict[str, Any]]:
        return [asdict(s) for s in self.suggestions]
