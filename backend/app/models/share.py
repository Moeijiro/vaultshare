import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, LargeBinary, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base


class Share(Base):
    __tablename__ = "shares"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    share_type = Column(String(16), nullable=False)  # "text" | "file"
    
    # Cryptographic materials
    encrypted_payload = Column(LargeBinary, nullable=True)  # Used for text secrets
    file_storage_path = Column(String(512), nullable=True)  # Safe path for encrypted files
    salt = Column(LargeBinary, nullable=False)
    nonce = Column(LargeBinary, nullable=False)
    
    # File metadata
    filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(128), nullable=True)
    
    # Password protection
    password_hash = Column(String(64), nullable=True)
    password_salt = Column(String(32), nullable=True)
    failed_attempts = Column(Integer, default=0)
    
    # View & Expiration policies
    max_views = Column(Integer, default=1)
    view_count = Column(Integer, default=0)
    is_consumed = Column(Boolean, default=False)
    is_revoked = Column(Boolean, default=False)
    
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Optional ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    owner = relationship("User", back_populates="shares")

    __table_args__ = (
        Index("ix_shares_lookup", "token_hash", "is_consumed", "is_revoked"),
    )


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    share_token_hash = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    result = Column(String(32), nullable=False)  # "accessed", "invalid_password", "locked", "expired", "revoked"
