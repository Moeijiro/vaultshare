import os
from pydantic_settings import BaseSettings
from typing import List

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
    VAULT_MASTER_KEY: str = "dGVzdF9tYXN0ZXJfa2V5XzMyX2J5dGVzX2xvbmdfc2VjdXJlIQ=="
    
    # JWT Auth
    JWT_SECRET: str = "vaultshare_jwt_super_secret_key_change_in_production_32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./vaultshare.db"

    # Safe File Storage
    STORAGE_DIR: str = "./vault_storage"
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB strict limit
    
    # Expiration and Cleanup
    DEFAULT_EXPIRATION_MINUTES: int = 1440  # 24 hours
    CLEANUP_INTERVAL_SECONDS: int = 300  # 5 minutes
    MAX_PASSWORD_ATTEMPTS: int = 5

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
