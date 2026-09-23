import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException, Request
from jose import jwt, JWTError

from app.core.config import settings

# passlib 1.7 can't load bcrypt >= 4.1 (it reads bcrypt.__about__), which broke
# registration and login; the bcrypt package is used directly instead.
BCRYPT_MAX_BYTES = 72


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_user_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("ascii"))
    except ValueError:  # malformed hash, or a password longer than bcrypt accepts
        return False


# Checked when the email is unknown, so "no such account" takes as long as "wrong password".
DUMMY_PASSWORD_HASH = get_password_hash(secrets.token_urlsafe(16))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit(scope: str, times: int = 10, seconds: int = 60):
    """A small per-IP fixed-window limiter for the auth endpoints (in process)."""

    async def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        key = f"{scope}:{ip}"
        now = time.monotonic()
        recent = [t for t in _hits[key] if t > now - seconds]
        if len(recent) >= times:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in a minute.")
        recent.append(now)
        _hits[key] = recent

    return dependency


def reset_rate_limits() -> None:
    _hits.clear()
