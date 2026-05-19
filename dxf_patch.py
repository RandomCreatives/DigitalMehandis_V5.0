import sys
from pathlib import Path

content = Path('backend/app/utils/dxf_parser.py').read_text()
new_imports = "from app.schemas.takeoff import CanonicalQuantity\n"
if "from app.schemas.takeoff import CanonicalQuantity" not in content:
    content = new_imports + content

canonical_method = """
    def extract_canonical(self) -> List[CanonicalQuantity]:
        \"\"\"Extracts entities and returns them in a unified format.\"\"\"
        quantities = []
        units = self._get_units()

        for entity in self.msp:
            etype = entity.dxftype()
            layer = entity.dxf.layer
            handle = entity.dxf.handle

            if etype == "LINE":
                start = (entity.dxf.start.x, entity.dxf.start.y)
                end = (entity.dxf.end.x, entity.dxf.end.y)
                val = GeometryCalculator.point_distance(start, end)
                quantities.append(CanonicalQuantity(
                    source_format="DXF",
                    source_id=handle,
                    label=f"Line on {layer}",
                    quantity_type="length",
                    value=val,
                    unit=units,
                    metadata={"layer": layer, "color": getattr(entity.dxf, "color", None)}
                ))
            elif etype in ("LWPOLYLINE", "POLYLINE"):
                points = [(p[0], p[1]) for p in entity.get_points(format="xy")]
                val = GeometryCalculator.polyline_length(points)
                quantities.append(CanonicalQuantity(
                    source_format="DXF",
                    source_id=handle,
                    label=f"Polyline on {layer}",
                    quantity_type="length",
                    value=val,
                    unit=units,
                    metadata={"layer": layer, "closed": bool(entity.closed)}
                ))
        return quantities
"""

if "def extract_canonical" not in content:
    # Insert before internal helpers
    content = content.replace("    # ── Internal helpers ──────────────────────────────────────────────────────", canonical_method + "\n    # ── Internal helpers ──────────────────────────────────────────────────────")

Path('backend/app/utils/dxf_parser.py').write_text(content)
