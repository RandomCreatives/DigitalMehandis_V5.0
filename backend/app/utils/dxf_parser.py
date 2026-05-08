"""
DXF Entity Extractor — inspired by FreeCAD's importDXF.py.
Uses ezdxf (the same library FreeCAD uses internally).
Runs server-side without any FreeCAD GUI or OpenCASCADE dependency.
"""
import math
import logging
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

try:
    import ezdxf
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False

from app.utils.geometry_calculator import GeometryCalculator

logger = logging.getLogger(__name__)


@dataclass
class DXFLine:
    start: Tuple[float, float]
    end: Tuple[float, float]
    length: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFPolyline:
    points: List[Tuple[float, float]]
    length: float
    is_closed: bool
    area: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFCircle:
    center: Tuple[float, float]
    radius: float
    area: float
    circumference: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFArc:
    center: Tuple[float, float]
    radius: float
    start_angle_deg: float
    end_angle_deg: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFText:
    text: str
    position: Tuple[float, float]
    height: float
    rotation: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFInsert:
    block_name: str
    insertion_point: Tuple[float, float]
    scale_x: float
    scale_y: float
    rotation: float
    layer: str
    color: Optional[int] = None


@dataclass
class DXFDimension:
    text: str
    measurement: Optional[float]
    defpoints: List[Tuple[float, float]]
    layer: str
    color: Optional[int] = None


@dataclass
class DXFHatch:
    pattern_name: str
    area: float
    layer: str
    color: Optional[int] = None


def _empty_layer() -> dict:
    return {
        "lines": [],
        "polylines": [],
        "circles": [],
        "arcs": [],
        "texts": [],
        "blocks": [],
        "dimensions": [],
        "hatches": [],
    }


class DXFEntityExtractor:
    """
    Standalone DXF parser inspired by FreeCAD's importDXF.py.

    Key design:
    - Uses ezdxf (same library FreeCAD uses internally)
    - Extracts ALL entities with full geometry + metadata
    - Returns JSON-serializable dicts (for FastAPI)
    - Safe for server-side processing (no GUI, no OpenCASCADE)
    """

    def __init__(self, file_path: str):
        if not EZDXF_AVAILABLE:
            raise RuntimeError(
                "ezdxf is not installed. Run: pip install ezdxf"
            )
        try:
            self.doc = ezdxf.readfile(file_path)
            self.msp = self.doc.modelspace()
            logger.info(f"Loaded DXF: {file_path} | version: {self.doc.dxfversion}")
        except Exception as exc:
            raise ValueError(f"Invalid or corrupted DXF file: {exc}") from exc

    # ── Main extraction ───────────────────────────────────────────────────────

    def extract_all_entities(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "layers": {},
            "blocks": {},
            "layer_list": self.get_layer_list(),
            "layer_entity_counts": self.get_layer_entity_count(),
            "header_info": {
                "dxfversion": self.doc.dxfversion,
                "units": self._get_units(),
            },
            "summary": {
                "total_lines": 0,
                "total_polylines": 0,
                "total_circles": 0,
                "total_arcs": 0,
                "total_texts": 0,
                "total_blocks": 0,
                "total_dimensions": 0,
                "total_hatches": 0,
            },
        }

        for entity in self.msp:
            layer_name: str = entity.dxf.layer
            etype: str = entity.dxftype()

            if layer_name not in result["layers"]:
                result["layers"][layer_name] = _empty_layer()

            ld = result["layers"][layer_name]
            s = result["summary"]

            if etype == "LINE":
                start = (entity.dxf.start.x, entity.dxf.start.y)
                end = (entity.dxf.end.x, entity.dxf.end.y)
                ld["lines"].append(asdict(DXFLine(
                    start=start, end=end,
                    length=GeometryCalculator.point_distance(start, end),
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_lines"] += 1

            elif etype in ("LWPOLYLINE", "POLYLINE"):
                points = [(p[0], p[1]) for p in entity.get_points(format="xy")]
                is_closed = bool(entity.closed)
                area = 0.0
                if is_closed and len(points) >= 3:
                    try:
                        from shapely.geometry import Polygon
                        area = Polygon(points).area
                    except Exception:
                        area = GeometryCalculator.polygon_area(points)
                ld["polylines"].append(asdict(DXFPolyline(
                    points=points,
                    length=GeometryCalculator.polyline_length(points),
                    is_closed=is_closed,
                    area=area,
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_polylines"] += 1

            elif etype == "CIRCLE":
                r = entity.dxf.radius
                ld["circles"].append(asdict(DXFCircle(
                    center=(entity.dxf.center.x, entity.dxf.center.y),
                    radius=r,
                    area=math.pi * r ** 2,
                    circumference=2 * math.pi * r,
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_circles"] += 1

            elif etype == "ARC":
                ld["arcs"].append(asdict(DXFArc(
                    center=(entity.dxf.center.x, entity.dxf.center.y),
                    radius=entity.dxf.radius,
                    start_angle_deg=entity.dxf.start_angle,
                    end_angle_deg=entity.dxf.end_angle,
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_arcs"] += 1

            elif etype in ("TEXT", "MTEXT"):
                text_content = entity.dxf.text if etype == "TEXT" else entity.text
                ld["texts"].append(asdict(DXFText(
                    text=text_content or "",
                    position=(entity.dxf.insert.x, entity.dxf.insert.y),
                    height=getattr(entity.dxf, "height", 0.0),
                    rotation=getattr(entity.dxf, "rotation", 0.0),
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_texts"] += 1

            elif etype == "INSERT":
                bname = entity.dxf.name
                ld["blocks"].append(asdict(DXFInsert(
                    block_name=bname,
                    insertion_point=(entity.dxf.insert.x, entity.dxf.insert.y),
                    scale_x=getattr(entity.dxf, "xscale", 1.0),
                    scale_y=getattr(entity.dxf, "yscale", 1.0),
                    rotation=getattr(entity.dxf, "rotation", 0.0),
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_blocks"] += 1
                if bname not in result["blocks"]:
                    result["blocks"][bname] = self._block_def(bname)

            elif etype == "DIMENSION":
                defpoints: List[Tuple[float, float]] = []
                try:
                    if hasattr(entity.dxf, "defpoint"):
                        defpoints.append((entity.dxf.defpoint.x, entity.dxf.defpoint.y))
                    if hasattr(entity.dxf, "defpoint2"):
                        defpoints.append((entity.dxf.defpoint2.x, entity.dxf.defpoint2.y))
                except Exception:
                    pass
                ld["dimensions"].append(asdict(DXFDimension(
                    text=getattr(entity.dxf, "text", "") or "",
                    measurement=getattr(entity.dxf, "actual_measurement", None),
                    defpoints=defpoints,
                    layer=layer_name,
                    color=getattr(entity.dxf, "color", None),
                )))
                s["total_dimensions"] += 1

            elif etype == "HATCH":
                try:
                    area = entity.area()
                    ld["hatches"].append(asdict(DXFHatch(
                        pattern_name=entity.dxf.pattern_name,
                        area=area,
                        layer=layer_name,
                        color=getattr(entity.dxf, "color", None),
                    )))
                    s["total_hatches"] += 1
                except Exception:
                    pass

        return result

    # ── QS helpers ────────────────────────────────────────────────────────────

    def extract_dimensions_as_list(self) -> List[Dict[str, Any]]:
        """Flat list of all DIMENSION entities — critical for QS verification."""
        dims = []
        for entity in self.msp:
            if entity.dxftype() != "DIMENSION":
                continue
            defpoints: List[Tuple[float, float]] = []
            try:
                if hasattr(entity.dxf, "defpoint"):
                    defpoints.append((entity.dxf.defpoint.x, entity.dxf.defpoint.y))
                if hasattr(entity.dxf, "defpoint2"):
                    defpoints.append((entity.dxf.defpoint2.x, entity.dxf.defpoint2.y))
            except Exception:
                pass
            dims.append({
                "text": getattr(entity.dxf, "text", "") or "",
                "measurement": getattr(entity.dxf, "actual_measurement", None),
                "layer": entity.dxf.layer,
                "defpoints": defpoints,
            })
        return dims

    def count_block_insertions(self, block_name: Optional[str] = None) -> Dict[str, int]:
        """Count INSERT occurrences per block name (for counting doors, windows, etc.)."""
        counts: Dict[str, int] = {}
        for entity in self.msp:
            if entity.dxftype() != "INSERT":
                continue
            name = entity.dxf.name
            if block_name and name != block_name:
                continue
            counts[name] = counts.get(name, 0) + 1
        return counts

    def get_layer_list(self) -> List[str]:
        return [layer.dxf.name for layer in self.doc.layers]

    def get_layer_entity_count(self) -> Dict[str, Dict[str, int]]:
        counts: Dict[str, Dict[str, int]] = {}
        for entity in self.msp:
            layer = entity.dxf.layer
            etype = entity.dxftype()
            counts.setdefault(layer, {})
            counts[layer][etype] = counts[layer].get(etype, 0) + 1
        return counts

    def to_canvas_json(self) -> Dict[str, Any]:
        """
        Convert DXF to a lightweight JSON format for browser Canvas rendering.
        Suitable for Fabric.js / plain Canvas2D.
        """
        data: Dict[str, Any] = {"layers": {}, "viewbox": {}}
        all_x: List[float] = []
        all_y: List[float] = []

        for entity in self.msp:
            layer = entity.dxf.layer
            etype = entity.dxftype()
            data["layers"].setdefault(layer, {"lines": [], "circles": [], "texts": []})
            ld = data["layers"][layer]

            if etype == "LINE":
                ld["lines"].append({
                    "x1": entity.dxf.start.x, "y1": entity.dxf.start.y,
                    "x2": entity.dxf.end.x,   "y2": entity.dxf.end.y,
                })
                all_x += [entity.dxf.start.x, entity.dxf.end.x]
                all_y += [entity.dxf.start.y, entity.dxf.end.y]

            elif etype == "CIRCLE":
                ld["circles"].append({
                    "cx": entity.dxf.center.x, "cy": entity.dxf.center.y,
                    "r": entity.dxf.radius,
                })

            elif etype in ("TEXT", "MTEXT"):
                text = entity.dxf.text if etype == "TEXT" else entity.text
                ld["texts"].append({
                    "x": entity.dxf.insert.x, "y": entity.dxf.insert.y,
                    "text": text or "",
                    "height": getattr(entity.dxf, "height", 2.5),
                })

        if all_x and all_y:
            data["viewbox"] = {
                "min_x": min(all_x), "min_y": min(all_y),
                "max_x": max(all_x), "max_y": max(all_y),
            }
        return data

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_units(self) -> str:
        unit_map = {
            4: "MILLIMETERS", 5: "CENTIMETERS", 6: "METERS",
            1: "INCHES", 2: "FEET",
        }
        try:
            code = self.doc.header.get("$INSUNITS", 0)
            return unit_map.get(code, f"UNKNOWN({code})")
        except Exception:
            return "UNKNOWN"

    def _block_def(self, block_name: str) -> Dict[str, Any]:
        try:
            block = self.doc.blocks.get(block_name)
            if not block:
                return {}
            return {"name": block_name, "entities_count": len(list(block))}
        except Exception:
            return {}
