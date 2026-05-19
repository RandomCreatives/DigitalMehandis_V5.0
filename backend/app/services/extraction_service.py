from typing import Any, Dict, List
from uuid import UUID
from app.schemas.takeoff import CanonicalQuantity
from app.utils.pdf_processor import PDFProcessor
from app.utils.dxf_parser import DXFEntityExtractor
from app.services.federation_engine import FederationEngine, Discipline


class ExtractionService:
    @staticmethod
    async def extract_from_drawing(
        project_id: UUID,
        drawing_id: UUID,
        file_path: str,
        discipline: str,
        is_dxf: bool
    ) -> Dict[str, Any]:
        """
        Orchestrates extraction from PDF or DXF and generates quantity suggestions.
        """
        disc_enum = Discipline(discipline.upper())

        if is_dxf:
            extractor = DXFEntityExtractor(file_path)
            # 1. Get raw entities (for backward compatibility / canvas)
            raw_entities = extractor.extract_all_entities()
            canvas_json = extractor.to_canvas_json()
            # 2. Get canonical quantities
            canonical_quantities = extractor.extract_canonical()
            extracted_data = raw_entities
        else:
            processor = PDFProcessor()
            # 1. Get raw layout
            layout = processor.extract_text_and_layout(file_path)
            canvas_json = processor.pdf_to_canvas_json(file_path, page_number=1)
            # 2. Get canonical quantities
            canonical_quantities = processor.extract_canonical(file_path, str(project_id), str(drawing_id))
            extracted_data = ExtractionService._layout_to_extracted_data(layout)

        # 3. Generate Federation Suggestions
        engine = FederationEngine(str(project_id))
        engine.add_from_drawing(str(drawing_id), disc_enum, extracted_data)

        return {
            "canvas_json": canvas_json,
            "suggestions": engine.get_suggestions(),
            "canonical_quantities": canonical_quantities,
            "raw_data": extracted_data
        }

    @staticmethod
    def _layout_to_extracted_data(layout: dict) -> dict:
        layers: dict = {}
        for page in layout.get("pages", []):
            layer_name = f"PDF_PAGE_{page['page_number']}"
            layers[layer_name] = {
                "lines": [{"start": (ln["x0"], ln["top"]), "end": (ln["x1"], ln["bottom"]), "length": (((ln["x1"]-ln["x0"])**2 + (ln["bottom"]-ln["top"])**2)**0.5), "layer": layer_name} for ln in page.get("lines", [])],
                "polylines": [],
                "circles": [],
                "arcs": [],
                "texts": [{"text": w["text"], "position": (w["x0"], w["top"]), "layer": layer_name} for w in page.get("words", [])],
                "blocks": [],
                "dimensions": [],
                "hatches": [],
            }
        return {"layers": layers}
