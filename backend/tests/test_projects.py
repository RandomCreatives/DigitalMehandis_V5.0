"""Integration tests for project CRUD endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    # Register & login first
    await client.post("/api/v1/auth/register", json={
        "email": "proj@example.com",
        "password": "Test@1234",
        "full_name": "Project User",
        "role": "STUDENT",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "proj@example.com",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    r = await client.post("/api/v1/projects", json={
        "name": "Bole Road Expansion",
        "location": "Addis Ababa",
        "code_of_practice": "EBCS",
        "unit_system": "METRIC",
        "currency": "ETB",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Bole Road Expansion"
    assert data["location"] == "Addis Ababa"
    assert data["currency"] == "ETB"
    return data["id"]


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "list@example.com",
        "password": "Test@1234",
        "full_name": "List User",
        "role": "STUDENT",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "list@example.com",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    await client.post("/api/v1/projects", json={
        "name": "Project A",
        "location": "Dire Dawa",
        "code_of_practice": "EBCS",
    })
    await client.post("/api/v1/projects", json={
        "name": "Project B",
        "location": "Mekelle",
        "code_of_practice": "BS",
    })

    r = await client.get("/api/v1/projects")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = {p["name"] for p in data}
    assert names == {"Project A", "Project B"}


@pytest.mark.asyncio
async def test_get_project_by_id(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "get@example.com",
        "password": "Test@1234",
        "full_name": "Get User",
        "role": "STUDENT",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "get@example.com",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    created = await client.post("/api/v1/projects", json={
        "name": "Get Me",
        "location": "Gondar",
        "code_of_practice": "EBCS",
    })
    project_id = created.json()["id"]

    r = await client.get(f"/api/v1/projects/{project_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "upd@example.com",
        "password": "Test@1234",
        "full_name": "Update User",
        "role": "STUDENT",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "upd@example.com",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    created = await client.post("/api/v1/projects", json={
        "name": "Old Name",
        "location": "Hawassa",
        "code_of_practice": "EBCS",
    })
    project_id = created.json()["id"]

    r = await client.put(f"/api/v1/projects/{project_id}", json={
        "name": "New Name",
        "description": "Updated description",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated description"
    assert data["location"] == "Hawassa"  # unchanged


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "del@example.com",
        "password": "Test@1234",
        "full_name": "Delete User",
        "role": "STUDENT",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "del@example.com",
        "password": "Test@1234",
    })
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    created = await client.post("/api/v1/projects", json={
        "name": "To Delete",
        "location": "Bahir Dar",
        "code_of_practice": "EBCS",
    })
    project_id = created.json()["id"]

    r = await client.delete(f"/api/v1/projects/{project_id}")
    assert r.status_code == 204

    r = await client.get(f"/api/v1/projects/{project_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized_project_access(client: AsyncClient):
    # User A creates a project
    await client.post("/api/v1/auth/register", json={
        "email": "a@example.com",
        "password": "Test@1234",
        "full_name": "User A",
        "role": "STUDENT",
    })
    login_a = await client.post("/api/v1/auth/login", json={
        "email": "a@example.com",
        "password": "Test@1234",
    })
    token_a = login_a.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token_a}"

    created = await client.post("/api/v1/projects", json={
        "name": "Secret",
        "location": "Adama",
        "code_of_practice": "EBCS",
    })
    project_id = created.json()["id"]

    # User B tries to access it
    await client.post("/api/v1/auth/register", json={
        "email": "b@example.com",
        "password": "Test@1234",
        "full_name": "User B",
        "role": "STUDENT",
    })
    login_b = await client.post("/api/v1/auth/login", json={
        "email": "b@example.com",
        "password": "Test@1234",
    })
    token_b = login_b.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token_b}"

    r = await client.get(f"/api/v1/projects/{project_id}")
    assert r.status_code == 404
