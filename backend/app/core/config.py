import os
from pydantic_settings import BaseSettings
from typing import List

DEV_MASTER_KEY = "dGVzdF9tYXN0ZXJfa2V5XzMyX2J5dGVzX2xvbmdfc2VjdXJlIQ=="
DEV_JWT_SECRET = "vaultshare_jwt_super_secret_key_change_in_production_32bytes"


class Settings(BaseSettings):
    PROJECT_NAME: str = "VaultShare"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Master Key for envelope encryption (must be 32 bytes URL-safe base64 or 32 raw bytes)
    VAULT_MASTER_KEY: str = DEV_MASTER_KEY
    
    # JWT Auth
    JWT_SECRET: str = DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    # The web app keeps the session in an HttpOnly cookie (not readable by page scripts).
    SESSION_COOKIE_NAME: str = "vaultshare_session"
    COOKIE_SECURE: bool = False  # set true behind HTTPS

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./vaultshare.db"

    # Safe File Storage
    STORAGE_DIR: str = "./vault_storage"
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB strict limit
    
    # Expiration and Cleanup
    DEFAULT_EXPIRATION_MINUTES: int = 1440  # 24 hours
    CLEANUP_INTERVAL_SECONDS: int = 300  # 5 minutes
    MAX_PASSWORD_ATTEMPTS: int = 5

    def assert_production_ready(self) -> None:
        """Refuse to run in production with the development secrets that ship in this file."""
        if self.ENV != "production":
            return
        if self.VAULT_MASTER_KEY == DEV_MASTER_KEY or self.JWT_SECRET == DEV_JWT_SECRET:
            raise RuntimeError("Set VAULT_MASTER_KEY and JWT_SECRET before running with ENV=production.")
        if len(self.JWT_SECRET) < 32:
            raise RuntimeError("JWT_SECRET must be at least 32 characters.")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
settings.assert_production_ready()
