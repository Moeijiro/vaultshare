import pytest
import datetime
from sqlalchemy import select
from app.db.models import AccessLog
from app.core.security import hash_token

@pytest.mark.asyncio
async def test_access_log_does_not_contain_secret_or_ip(client):
    payload = {"text": "top-secret-token", "expiration_minutes": 10, "max_views": 1}
    res = await client.post("/api/v1/shares/text", json=payload)
    token = res.json()["token"]

    # Unlock
    unlock_res = await client.post(f"/api/v1/shares/{token}/unlock", json={})
    assert unlock_res.status_code == 200

    # Query DB access logs via test DB session
    from tests.conftest import TestingSessionLocal
    async with TestingSessionLocal() as session:
        logs = (await session.execute(select(AccessLog))).scalars().all()
        assert len(logs) >= 1
        for log in logs:
            # Verify no secret text in log
            assert "top-secret-token" not in str(log.__dict__)
            # Verify access log only stores token hash and result
            assert log.share_token_hash == hash_token(token)
            assert log.result == "accessed"
