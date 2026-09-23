import pytest
import asyncio
import os
import shutil
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_vaultshare.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    settings.STORAGE_DIR = "./test_vault_storage"
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    yield
    if os.path.exists("./test_vaultshare.db"):
        try:
            os.remove("./test_vaultshare.db")
        except Exception:
            pass
    if os.path.exists(settings.STORAGE_DIR):
        try:
            shutil.rmtree(settings.STORAGE_DIR)
        except Exception:
            pass

@pytest.fixture(autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
