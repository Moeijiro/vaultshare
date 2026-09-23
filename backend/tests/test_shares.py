import pytest
import datetime
from app.core.config import settings

@pytest.mark.asyncio
async def test_create_and_unlock_text_secret(client):
    # 1. Create one-time secret
    payload = {
        "text": "my-database-password-42",
        "expiration_minutes": 60,
        "max_views": 1
    }
    res = await client.post("/api/v1/shares/text", json=payload)
    assert res.status_code == 201
    data = res.json()
    token = data["token"]
    assert "share_url" in data
    assert data["max_views"] == 1
    assert data["has_password"] is False

    # 2. Query metadata
    meta_res = await client.get(f"/api/v1/shares/{token}/meta")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["share_type"] == "text"
    assert meta["views_remaining"] == 1
    assert meta["has_password"] is False

    # 3. Unlock secret
    unlock_res = await client.post(f"/api/v1/shares/{token}/unlock", json={})
    assert unlock_res.status_code == 200
    revealed = unlock_res.json()
    assert revealed["secret_text"] == "my-database-password-42"
    assert revealed["is_destroyed"] is True
    assert revealed["views_remaining"] == 0

    # 4. Burn-after-reading verification: Subsequent access fails with 404
    second_unlock = await client.post(f"/api/v1/shares/{token}/unlock", json={})
    assert second_unlock.status_code == 404

    second_meta = await client.get(f"/api/v1/shares/{token}/meta")
    assert second_meta.status_code == 404

@pytest.mark.asyncio
async def test_password_protected_share_with_lockout(client):
    payload = {
        "text": "confidential-financial-memo",
        "expiration_minutes": 1440,
        "max_views": 2,
        "password": "SecretPassphrase123!"
    }
    res = await client.post("/api/v1/shares/text", json=payload)
    assert res.status_code == 201
    token = res.json()["token"]

    # Metadata shows password is required
    meta_res = await client.get(f"/api/v1/shares/{token}/meta")
    assert meta_res.json()["has_password"] is True

    # Attempt with wrong password
    wrong_res = await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "Wrong"})
    assert wrong_res.status_code == 401
    assert "4 attempt(s) remaining" in wrong_res.json()["detail"]

    # Exhaust remaining attempts to trigger lockout shredding
    for _ in range(4):
        await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "Wrong"})

    # Share is now locked and shredded
    locked_res = await client.post(f"/api/v1/shares/{token}/unlock", json={"password": "SecretPassphrase123!"})
    assert locked_res.status_code in [403, 404]

@pytest.mark.asyncio
async def test_file_upload_and_download(client):
    file_content = b"Content of confidential config file\nKEY=SECRET_12345\n"
    files = {
        "file": ("production.env", file_content, "text/plain")
    }
    data = {
        "expiration_minutes": "60",
        "max_views": "1"
    }
    res = await client.post("/api/v1/shares/file", data=data, files=files)
    assert res.status_code == 201
    token = res.json()["token"]

    # Check meta
    meta_res = await client.get(f"/api/v1/shares/{token}/meta")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["share_type"] == "file"
    assert meta["filename"] == "production.env"
    assert meta["file_size"] == len(file_content)

    # Download file
    dl_res = await client.post(f"/api/v1/shares/{token}/download", json={})
    assert dl_res.status_code == 200
    assert dl_res.content == file_content
    assert dl_res.headers["x-content-type-options"] == "nosniff"

    # Burn verification: file is burned
    dl_res_2 = await client.post(f"/api/v1/shares/{token}/download", json={})
    assert dl_res_2.status_code == 404

@pytest.mark.asyncio
async def test_user_registration_login_and_share_revocation(client):
    # Register
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "alice@example.com",
        "password": "SecurePassword123!"
    })
    assert reg_res.status_code == 201

    # Login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "alice@example.com",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    jwt_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    # Create share while authenticated
    share_res = await client.post("/api/v1/shares/text", json={
        "text": "alice-secret-cloud-key",
        "expiration_minutes": 60,
        "max_views": 5
    }, headers=headers)
    assert share_res.status_code == 201
    share_token = share_res.json()["token"]

    # View list in dashboard
    list_res = await client.get("/api/v1/shares/mine/all", headers=headers)
    assert list_res.status_code == 200
    shares = list_res.json()
    assert len(shares) >= 1
    # Notice: the raw secret text is never returned to the owner!
    assert "alice-secret-cloud-key" not in str(shares)

    # Revoke share
    revoke_res = await client.delete(f"/api/v1/shares/{share_token}", headers=headers)
    assert revoke_res.status_code == 200

    # Share is now inaccessible
    unlock_res = await client.post(f"/api/v1/shares/{share_token}/unlock", json={})
    assert unlock_res.status_code == 404
