import pytest
import uuid
from app.services.federation_engine import FederationEngine, Discipline, Section

def test_federation_architectural_suggestions():
    engine = FederationEngine(project_id=str(uuid.uuid4()))
    drawing_id = str(uuid.uuid4())

    # Mock extracted data
    data = {
        "layers": {
            "A-WALLS": {
                "polylines": [
                    {"length": 10.5, "is_closed": False}
                ]
            },
            "A-FLOOR-AREA": {
                "polylines": [
                    {"area": 50.0, "is_closed": True, "length": 30.0}
                ]
            },
            "0": {
                "blocks": [
                    {"block_name": "door_single", "position": (0,0)},
                    {"block_name": "door_single", "position": (10,0)}
                ]
            }
        }
    }

    engine.add_from_drawing(drawing_id, Discipline.ARCHITECTURAL, data)
    suggestions = engine.get_suggestions()

    # 1 Wall + 1 Floor Area + 1 Door Suggestion (count=2)
    assert len(suggestions) == 3

    wall = next(s for s in suggestions if s.element_category == "WALL")
    assert wall.value == 10.5
    assert wall.unit == "m"

    floor = next(s for s in suggestions if s.element_category == "FLOOR_AREA")
    assert floor.value == 50.0
    assert floor.unit == "m²"

    door = next(s for s in suggestions if s.element_category == "DOOR")
    assert door.value == 2.0
    assert door.unit == "Nr"

def test_federation_structural_suggestions():
    engine = FederationEngine(project_id=str(uuid.uuid4()))
    drawing_id = str(uuid.uuid4())

    data = {
        "layers": {
            "S-FOOTING": {
                "polylines": [
                    {"area": 4.0, "is_closed": True, "length": 8.0}
                ]
            },
            "S-BEAMS": {
                "polylines": [
                    {"length": 5.0, "is_closed": False}
                ]
            }
        }
    }

    engine.add_from_drawing(drawing_id, Discipline.STRUCTURAL, data)
    suggestions = engine.get_suggestions()

    assert any(s.element_category == "FOOTING" and s.value == 4.0 for s in suggestions)
    assert any(s.element_category == "BEAM" and s.value == 5.0 for s in suggestions)
