"""Integration tests for BBS CSV import endpoint."""
import pytest
from httpx import AsyncClient


SAMPLE_BBS_CSV = b'''"LOCATION","Bar Type","Bar dia","Bar shape","Bar Length","No. of","No. of","Total","LENGTH",,,,,,,,
,,(mm),,,Members,Bars,No.of Bars,6,8,10,12,14,16,20,24
"SUB STRUCTURE",,,,,,,,,,,,,,,,
"Footing Pad",,,,,,,,,,,,,,,,
"F-1","Bottom bar",12,,2.21,4,18,72,,,,159.12,,,,,
"F-2","Bottom bar",14,,2.5,11,38,418,,,,,1045,,,,
"C-1","st",8,,1.5,2,14,28,,42,,,,,,,
'''


async def _login(client: AsyncClient, email: str):
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Test@1234",
        "full_name": "BBS Import User",
        "role": "QS_PROFESSIONAL",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Test@1234",
    })
    return login.json()["access_token"]


async def _create_project(client: AsyncClient, token: str, name: str = "BBS Import Test"):
    client.headers["Authorization"] = f"Bearer {token}"
    r = await client.post("/api/v1/projects", json={
        "name": name,
        "location": "Addis Ababa",
        "code_of_practice": "EBCS",
        "unit_system": "METRIC",
        "currency": "ETB",
    })
    return r.json()["id"]


@pytest.mark.asyncio
async def test_import_bbs_csv_success(client: AsyncClient):
    token = await _login(client, "bbs_import@example.com")
    pid = await _create_project(client, token, "BBS CSV Import")

    from io import BytesIO
    files = {
        "file": ("test_bbs.csv", BytesIO(SAMPLE_BBS_CSV), "text/csv"),
    }
    r = await client.post(
        f"/api/v1/projects/{pid}/bbs/import-csv",
        files=files,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["count"] >= 3  # F-1, F-2, C-1 st
    assert "SUBSTRUCTURE" in data["sections"]
    assert 12 in data["diameters"]
    assert 14 in data["diameters"]
    assert 8 in data["diameters"]


@pytest.mark.asyncio
async def test_import_bbs_csv_wrong_format(client: AsyncClient):
    token = await _login(client, "bbs_import2@example.com")
    pid = await _create_project(client, token, "Bad Format")

    from io import BytesIO
    files = {
        "file": ("bad.txt", BytesIO(b"this is not a bbs csv"), "text/plain"),
    }
    r = await client.post(
        f"/api/v1/projects/{pid}/bbs/import-csv",
        files=files,
    )
    assert r.status_code == 400
    assert "No valid data rows" in r.json()["detail"] or "parse" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_import_bbs_csv_unauthorized(client: AsyncClient):
    # No auth
    r = await client.post("/api/v1/projects/00000000-0000-0000-0000-000000000000/bbs/import-csv", files={})
    assert r.status_code == 401
