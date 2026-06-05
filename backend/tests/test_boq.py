"""Integration tests for BOQ generation and export endpoints."""
import pytest
from httpx import AsyncClient


async def _login(client: AsyncClient, email: str):
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Test@1234",
        "full_name": "BOQ User",
        "role": "QS_PROFESSIONAL",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Test@1234",
    })
    return login.json()["access_token"]


async def _create_project(client: AsyncClient, token: str, name: str = "BOQ Test"):
    client.headers["Authorization"] = f"Bearer {token}"
    r = await client.post("/api/v1/projects", json={
        "name": name,
        "location": "Addis Ababa",
        "code_of_practice": "EBCS",
        "unit_system": "METRIC",
        "currency": "ETB",
    })
    return r.json()["id"]


async def _add_takeoff(client: AsyncClient, project_id: str, description: str, unit: str, quantity: float, section: str = "SUBSTRUCTURE"):
    r = await client.post(f"/api/v1/projects/{project_id}/takeoff", json={
        "description": description,
        "unit": unit,
        "quantity": quantity,
        "section": section,
    })
    assert r.status_code in (200, 201)


async def _add_rate(client: AsyncClient, project_id: str, description: str, unit: str, rate_per_unit: float):
    r = await client.post(f"/api/v1/projects/{project_id}/rates", json={
        "description": description,
        "unit": unit,
        "rate_per_unit": rate_per_unit,
    })
    assert r.status_code in (200, 201)


@pytest.mark.asyncio
async def test_generate_boq_with_rate_matching(client: AsyncClient):
    token = await _login(client, "boq1@example.com")
    pid = await _create_project(client, token, "Rate Match Test")

    await _add_rate(client, pid, "Concrete mix C25", "m³", 8500.0)
    await _add_takeoff(client, pid, "Concrete mix C25 for footing", "m³", 12.5)

    r = await client.post(f"/api/v1/projects/{pid}/boq/generate?section=COMBINED")
    assert r.status_code == 200
    data = r.json()
    assert data["project_id"] == pid
    assert data["section"] == "COMBINED"
    assert len(data["lines"]) >= 1
    assert data["total_amount"] > 0
    assert data["currency"] == "ETB"

    line = data["lines"][0]
    assert "description" in line
    assert "quantity" in line
    assert "rate" in line
    assert "amount" in line


@pytest.mark.asyncio
async def test_generate_boq_no_matching_rate(client: AsyncClient):
    token = await _login(client, "boq2@example.com")
    pid = await _create_project(client, token, "No Match Test")

    await _add_takeoff(client, pid, "Rare imported marble cladding", "m²", 45.0)
    # No rate added — expect empty lines because substring match fails

    r = await client.post(f"/api/v1/projects/{pid}/boq/generate?section=COMBINED")
    assert r.status_code == 200
    data = r.json()
    assert data["lines"] == []
    assert data["total_amount"] == 0.0


@pytest.mark.asyncio
async def test_generate_boq_section_filter(client: AsyncClient):
    token = await _login(client, "boq3@example.com")
    pid = await _create_project(client, token, "Section Filter")

    await _add_rate(client, pid, "Excavation", "m³", 350.0)
    await _add_takeoff(client, pid, "Excavation for footing", "m³", 50.0, "SUBSTRUCTURE")
    await _add_takeoff(client, pid, "Excavation for slab", "m³", 30.0, "SUPERSTRUCTURE")

    r = await client.post(f"/api/v1/projects/{pid}/boq/generate?section=SUBSTRUCTURE")
    assert r.status_code == 200
    data = r.json()
    # Only substructure should appear
    assert len(data["lines"]) == 1
    assert data["lines"][0]["description"] == "Excavation for footing"


@pytest.mark.asyncio
async def test_boq_export_excel(client: AsyncClient):
    token = await _login(client, "boq4@example.com")
    pid = await _create_project(client, token, "Excel Export")

    await _add_rate(client, pid, "Rebar", "kg", 65.0)
    await _add_takeoff(client, pid, "Rebar for columns", "kg", 2000.0)

    r = await client.post(f"/api/v1/projects/{pid}/boq/export-excel?section=COMBINED")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert b"PK" in r.content  # ZIP header for XLSX


@pytest.mark.asyncio
async def test_boq_export_pdf(client: AsyncClient):
    token = await _login(client, "boq5@example.com")
    pid = await _create_project(client, token, "PDF Export")

    await _add_rate(client, pid, "Formwork", "m²", 450.0)
    await _add_takeoff(client, pid, "Formwork for beams", "m²", 120.0)

    r = await client.post(f"/api/v1/projects/{pid}/boq/export-pdf?section=COMBINED")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_bbs_export_excel(client: AsyncClient):
    token = await _login(client, "boq6@example.com")
    pid = await _create_project(client, token, "BBS Export")

    # Add a BBS bar
    r = await client.post(f"/api/v1/projects/{pid}/bbs", json={
        "bar_mark": "B1",
        "member_name": "Footing F1",
        "bar_diameter_mm": 16,
        "bar_shape": "STRAIGHT",
        "quantity": 10,
        "clear_length_m": 2.5,
        "section": "SUBSTRUCTURE",
    })
    assert r.status_code in (200, 201)

    r = await client.post(f"/api/v1/projects/{pid}/bbs/export-excel")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@pytest.mark.asyncio
async def test_list_boq_outputs(client: AsyncClient):
    token = await _login(client, "boq7@example.com")
    pid = await _create_project(client, token, "List Outputs")

    await _add_rate(client, pid, "Brickwork", "m²", 1200.0)
    await _add_takeoff(client, pid, "Brickwork external walls", "m²", 80.0)

    await client.post(f"/api/v1/projects/{pid}/boq/generate?section=COMBINED")

    r = await client.get(f"/api/v1/projects/{pid}/boq")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert data[0]["project_id"] == pid
