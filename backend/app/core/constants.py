BAR_DIAMETERS = [6, 8, 10, 12, 14, 16, 20, 24, 25, 32]

BAR_SHAPES = ["STRAIGHT", "L_SHAPE", "HOOK", "U_SHAPE", "SPIRAL"]

DRAWING_CATEGORIES = ["ARCHITECTURAL", "STRUCTURAL", "ELECTRICAL", "SANITARY"]

SECTIONS = ["SUBSTRUCTURE", "SUPERSTRUCTURE"]

CODES_OF_PRACTICE = ["EBCS", "IS_CODE", "BS", "EUROCODE"]

USER_ROLES = ["QS_PROFESSIONAL", "STUDENT", "CONTRACTOR", "ADMIN"]

# Unit weights per Ethiopian / IS standard: W (kg/m) = D² / 162
# Verified against real-world BBS CSV data (Digital Mehandis V5.0)
UNIT_WEIGHTS_KG_PER_M = {
    6: 0.222,
    8: 0.395,
    10: 0.617,
    12: 0.888,
    14: 1.21,
    16: 1.58,
    20: 2.47,
    24: 3.55,
    25: 3.85,
    32: 6.31,
}

# WBS categories for take-off sheet
WBS_CATEGORIES = {
    "SUBSTRUCTURE": [
        "1.1 Excavation & Site Work",
        "1.2 Foundations (Footings, Trenches, Walls)",
        "1.3 Plinth Beams & Basement",
        "1.4 Backfilling",
    ],
    "SUPERSTRUCTURE": [
        "2.1 Columns & Walls",
        "2.2 Beams",
        "2.3 Slabs & Floors",
        "2.4 Stairs",
        "2.5 Roofing",
        "2.6 Doors & Windows",
        "2.7 Finishes (Plastering, Painting, Tiles)",
        "2.8 MEP (Electrical, Sanitary, HVAC)",
    ],
}
