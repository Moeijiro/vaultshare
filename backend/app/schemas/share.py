import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class ShareCreateText(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000, description="Plaintext secret content")
    expiration_minutes: int = Field(1440, description="Expiration in minutes: 10, 60, 1440 (24h), 10080 (7d)")
    max_views: int = Field(1, description="Maximum views: 1, 2, 5")
    password: Optional[str] = Field(None, max_length=128, description="Optional access passphrase")

    @field_validator("expiration_minutes")
    @classmethod
    def validate_expiration(cls, v: int) -> int:
        allowed = {10, 60, 1440, 10080}
        if v not in allowed:
            raise ValueError(f"Expiration must be one of {sorted(allowed)} minutes")
        return v

    @field_validator("max_views")
    @classmethod
    def validate_max_views(cls, v: int) -> int:
        allowed = {1, 2, 5}
        if v not in allowed:
            raise ValueError(f"Max views must be one of {sorted(allowed)}")
        return v

class ShareCreateResponse(BaseModel):
    token: str
    share_url: str
    share_type: str
    expires_at: datetime.datetime
    max_views: int
    has_password: bool
    notice: str = "Secret content cannot be viewed again by the sender. Store your share link safely."

class ShareMetadataResponse(BaseModel):
    share_type: str
    has_password: bool
    expires_at: datetime.datetime
    views_remaining: int
    filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class ShareUnlockRequest(BaseModel):
    password: Optional[str] = None

class ShareRevealTextResponse(BaseModel):
    secret_text: str
    burn_after_reading: bool
    views_remaining: int
    is_destroyed: bool

class ShareItemOut(BaseModel):
    id: int
    token_hash_prefix: str
    share_type: str
    filename: Optional[str]
    max_views: int
    view_count: int
    is_consumed: bool
    is_revoked: bool
    expires_at: datetime.datetime
    created_at: datetime.datetime
    status: str  # "active" | "consumed" | "expired" | "revoked"

class ShareStatsResponse(BaseModel):
    total_created: int
    active_count: int
    consumed_count: int
    expired_count: int
