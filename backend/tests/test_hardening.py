"""Regression tests for the security fixes."""

import asyncio

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.db.models import Share
from tests.conftest import TestingSessionLocal


async def _text_share(client, max_views=1, password=None):
    body = {"text": "db-password-hunter2", "expiration_minutes": 60, "max_views": max_views}
    if password:
        body["password"] = password
    res = await client.post("/api/v1/shares/text", json=body)
    assert res.status_code == 201
    return res.json()["token"]


@pytest.mark.asyncio
async def test_a_one_time_secret_is_revealed_once_even_under_concurrent_requests(client):
    token = await _text_share(client)
    results = await asyncio.gather(*(client.post(f"/api/v1/shares/{token}/unlock", json={}) for _ in range(5)))
    assert sorted(r.status_code for r in results).count(200) == 1


@pytest.mark.asyncio
async def test_no_crackable_password_hash_is_stored(client):
    token = await _text_share(client, password="correct horse")
    async with TestingSessionLocal() as db:
        share = (await db.execute(select(Share))).scalar_one()
        assert share.password_hash == "aead" and share.password_salt is None
    wrong = await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "wrong"})
    assert wrong.status_code == 401
    right = await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "correct horse"})
    assert right.status_code == 200 and right.json()["secret_text"] == "db-password-hunter2"


@pytest.mark.asyncio
async def test_the_last_wrong_password_destroys_the_secret(client):
    token = await _text_share(client, password="pw-123456")
    for _ in range(settings.MAX_PASSWORD_ATTEMPTS - 1):
        assert (await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "nope"})).status_code == 401
    assert (await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "nope"})).status_code == 403
    assert (await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "pw-123456"})).status_code == 404


@pytest.mark.asyncio
async def test_downloads_never_trust_the_uploaders_name_or_type(client):
    evil = 'report".html\r\nSet-Cookie: x=1'
    res = await client.post("/api/v1/shares/file", files={"file": (evil, b"<script>alert(1)</script>", "text/html")},
                            data={"expiration_minutes": "60", "max_views": "1"})
    assert res.status_code == 201
    dl = await client.post(f"/api/v1/shares/{res.json()['token']}/download", json={})
    assert dl.status_code == 200
    assert dl.headers["content-type"] == "application/octet-stream"
    disposition = dl.headers["content-disposition"]
    assert "\r" not in disposition and "\n" not in disposition and "set-cookie" not in {k.lower() for k in dl.headers if k.lower() == "set-cookie"}
    assert disposition.count('"') == 2


@pytest.mark.asyncio
async def test_oversized_uploads_are_refused(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_BYTES", 1024)
    res = await client.post("/api/v1/shares/file", files={"file": ("big.bin", b"x" * 2048, "application/octet-stream")},
                            data={"expiration_minutes": "60", "max_views": "1"})
    assert res.status_code == 413


async def _login(client, email):
    await client.post("/api/v1/auth/register", json={"email": email, "password": "SecurePassword123!"})
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePassword123!"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.mark.asyncio
async def test_emails_are_case_insensitive(client):
    await client.post("/api/v1/auth/register", json={"email": "Bob@Example.com", "password": "SecurePassword123!"})
    dup = await client.post("/api/v1/auth/register", json={"email": "bob@example.com", "password": "SecurePassword123!"})
    assert dup.status_code == 400
    assert (await client.post("/api/v1/auth/login", json={"email": "BOB@example.com", "password": "SecurePassword123!"})).status_code == 200


@pytest.mark.asyncio
async def test_other_peoples_shares_look_missing(client):
    alice = await _login(client, "alice@example.com")
    mallory = await _login(client, "mallory@example.com")
    token = (await client.post("/api/v1/shares/text", json={"text": "x", "expiration_minutes": 60, "max_views": 1}, headers=alice)).json()["token"]
    assert (await client.delete(f"/api/v1/shares/{token}", headers=mallory)).status_code == 404
    assert (await client.delete(f"/api/v1/shares/{token}", headers=alice)).status_code == 200


@pytest.mark.asyncio
async def test_login_is_rate_limited(client):
    codes = [(await client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "wrong-password"})).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10 and codes[10] == 429


def test_production_refuses_the_development_secrets():
    from app.core.config import DEV_JWT_SECRET, DEV_MASTER_KEY, Settings

    prod = Settings(ENV="production", VAULT_MASTER_KEY=DEV_MASTER_KEY, JWT_SECRET=DEV_JWT_SECRET)
    with pytest.raises(RuntimeError):
        prod.assert_production_ready()


@pytest.mark.asyncio
async def test_the_web_session_is_an_httponly_cookie(client):
    await client.post("/api/v1/auth/register", json={"email": "cookie@example.com", "password": "SecurePassword123!"})
    login = await client.post("/api/v1/auth/login", json={"email": "cookie@example.com", "password": "SecurePassword123!"})
    cookie = login.headers["set-cookie"].lower()
    assert "vaultshare_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    assert (await client.get("/api/v1/auth/me")).status_code == 200  # cookie alone is enough
    await client.post("/api/v1/auth/logout")
    client.cookies.clear()
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.asyncio
async def test_owners_can_revoke_from_the_dashboard_by_id(client):
    alice = await _login(client, "owner@example.com")
    mallory = await _login(client, "other@example.com")
    token = (await client.post("/api/v1/shares/text", json={"text": "x", "expiration_minutes": 60, "max_views": 1}, headers=alice)).json()["token"]
    share_id = (await client.get("/api/v1/shares/mine/all", headers=alice)).json()[0]["id"]
    assert (await client.delete(f"/api/v1/shares/mine/{share_id}", headers=mallory)).status_code == 404
    assert (await client.delete(f"/api/v1/shares/mine/{share_id}", headers=alice)).status_code == 200
    assert (await client.post(f"/api/v1/shares/{token}/unlock", json={})).status_code == 404
