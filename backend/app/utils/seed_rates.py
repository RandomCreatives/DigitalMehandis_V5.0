"""
Pre-loaded Ethiopian material rate database (seed data).
Run once after migrations: python -m app.utils.seed_rates
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models import Rate

RATES = [
    # Excavation & Site Work
    {"item_code": "EXCAV001", "description": "Excavation in ordinary soil", "unit": "m³", "rate_per_unit": 350, "rate_source": "EBCS 2023", "region": "National Average"},
    {"item_code": "EXCAV002", "description": "Excavation in hard soil/rock", "unit": "m³", "rate_per_unit": 650, "rate_source": "EBCS 2023", "region": "National Average"},
    {"item_code": "EXCAV003", "description": "Backfilling with selected material", "unit": "m³", "rate_per_unit": 280, "rate_source": "EBCS 2023", "region": "National Average"},
    # Concrete
    {"item_code": "CONC001", "description": "C-25 Concrete (ready-mix)", "unit": "m³", "rate_per_unit": 4500, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "CONC002", "description": "C-30 Concrete (ready-mix)", "unit": "m³", "rate_per_unit": 5200, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "CONC003", "description": "C-20 Concrete (site-mixed)", "unit": "m³", "rate_per_unit": 3800, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "CONC004", "description": "Plain cement concrete (PCC) C-15", "unit": "m³", "rate_per_unit": 3200, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Reinforcement
    {"item_code": "REBAR001", "description": "Reinforcement steel (MS, 16mm dia)", "unit": "kg", "rate_per_unit": 45, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "REBAR002", "description": "Reinforcement steel (MS, 12mm dia)", "unit": "kg", "rate_per_unit": 45, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "REBAR003", "description": "Reinforcement steel (MS, 8mm dia stirrups)", "unit": "kg", "rate_per_unit": 48, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "REBAR004", "description": "Reinforcement steel (MS, 20mm dia)", "unit": "kg", "rate_per_unit": 44, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Masonry
    {"item_code": "MASON001", "description": "Hollow block wall 200mm thick", "unit": "m²", "rate_per_unit": 850, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "MASON002", "description": "Hollow block wall 150mm thick", "unit": "m²", "rate_per_unit": 720, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "MASON003", "description": "Brick work in 1:6 cement mortar", "unit": "m³", "rate_per_unit": 2500, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Formwork
    {"item_code": "FORM001", "description": "Formwork for columns", "unit": "m²", "rate_per_unit": 380, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "FORM002", "description": "Formwork for beams", "unit": "m²", "rate_per_unit": 420, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "FORM003", "description": "Formwork for slabs", "unit": "m²", "rate_per_unit": 350, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Finishes
    {"item_code": "PLAST001", "description": "Cement plaster 20mm thick (1:3)", "unit": "m²", "rate_per_unit": 180, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "PAINT001", "description": "Emulsion paint (2 coats)", "unit": "m²", "rate_per_unit": 95, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "TILE001", "description": "Ceramic floor tiles 300x300mm", "unit": "m²", "rate_per_unit": 650, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "TILE002", "description": "Ceramic wall tiles 200x300mm", "unit": "m²", "rate_per_unit": 580, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Roofing
    {"item_code": "ROOF001", "description": "Corrugated iron sheet roofing (EGA 28)", "unit": "m²", "rate_per_unit": 420, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "ROOF002", "description": "Timber roof truss (treated)", "unit": "m²", "rate_per_unit": 1200, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    # Doors & Windows
    {"item_code": "DOOR001", "description": "Solid wood door 900x2100mm (supply & fix)", "unit": "Nr", "rate_per_unit": 8500, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
    {"item_code": "WIND001", "description": "Aluminium window (supply & fix)", "unit": "m²", "rate_per_unit": 3200, "rate_source": "Market Survey 2024", "region": "Addis Ababa"},
]


async def seed():
    async with AsyncSessionLocal() as db:
        for r in RATES:
            rate = Rate(**r, project_id=None)
            db.add(rate)
        await db.commit()
    print(f"Seeded {len(RATES)} rates.")


if __name__ == "__main__":
    asyncio.run(seed())
