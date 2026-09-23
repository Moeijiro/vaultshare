"""Demo account: ``python -m app.seed [--reset]``.

Creates demo@vaultshare.dev / VaultDemo-2026! with a few links in different states
(active, opened, revoked) by calling the real API in-process, so every secret goes
through the same encryption path as a user's. ``--reset`` drops every table first.
"""

from __future__ import annotations

import argparse
import asyncio

import httpx

import app.models  # noqa: F401  (registers every table)
from app.db.session import Base, engine
from app.main import app

EMAIL, PASSWORD = "demo@vaultshare.dev", "VaultDemo-2026!"


async def main(reset: bool) -> None:
    async with engine.begin() as conn:
        if reset:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://seed/api/v1") as client:
        await client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
        login = await client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
        login.raise_for_status()
        if (await client.get("/shares/mine/all")).json():
            print(f"Demo account already has links — sign in as {EMAIL} / {PASSWORD}")
            return

        for text in ("Studio Wi-Fi: example-passphrase", "AWS read-only key for the audit: AKIA-EXAMPLE", "Staging SSH passphrase: example"):
            await client.post("/shares/text", json={"text": text, "expiration_minutes": 10080, "max_views": 2})
        await client.post("/shares/file", files={"file": ("Contract-draft.txt", b"Draft contract (demo file)", "text/plain")},
                          data={"expiration_minutes": "1440", "max_views": "1"})
        opened = (await client.post("/shares/text", json={"text": "one-off code 481-222", "expiration_minutes": 60, "max_views": 1})).json()["token"]
        await client.post(f"/shares/{opened}/unlock", json={})
        await client.post("/shares/text", json={"text": "old VPN key", "expiration_minutes": 1440, "max_views": 2})
        newest = (await client.get("/shares/mine/all")).json()[0]["id"]
        await client.delete(f"/shares/mine/{newest}")
    print(f"Demo account ready — sign in as {EMAIL} / {PASSWORD}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="drop all tables before seeding")
    asyncio.run(main(parser.parse_args().reset))
