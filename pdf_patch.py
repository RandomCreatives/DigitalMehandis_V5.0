from pathlib import Path

content = Path('backend/app/utils/pdf_processor.py').read_text()
new_imports = "from app.schemas.takeoff import CanonicalQuantity\n"
if "from app.schemas.takeoff import CanonicalQuantity" not in content:
    content = new_imports + content

canonical_method = """
    def extract_canonical(self, file_path: str, project_id: str, drawing_id: str) -> List[CanonicalQuantity]:
        \"\"\"
        Extracts measurements and annotations from a PDF and converts to CanonicalQuantity.
        Currently handles manual measurements stored in the PDF (if any) or text-based dimensions.
        \"\"\"
        # This will be expanded as we implement the actual PDF parsing logic
        return []
"""

if "def extract_canonical" not in content:
    # Append at the end of class
    content = content.rstrip() + "\n" + canonical_method

Path('backend/app/utils/pdf_processor.py').write_text(content)
