"""Integration tests for auth endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Test@1234",
        "full_name": "Test User",
        "role": "STUDENT",
    })
    assert reg.status_code == 201
    assert reg.json()["email"] == "test@example.com"

    login = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Test@1234",
    })
    assert login.status_code == 200
    assert "access_token" in login.json()


@pytest.mark.asyncio
async def test_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@example.com", "password": "Test@1234"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={"email": "no@one.com", "password": "wrong"})
    assert r.status_code == 401
