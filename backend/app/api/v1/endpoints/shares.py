"""Create, reveal, download and revoke one-time secrets.

Hardening notes (each fixes something the first version got wrong):

* A view is claimed with one conditional UPDATE (`view_count < max_views`) before any
  plaintext is returned, so two simultaneous requests can't both read a
  burn-after-reading secret.
* Share passwords are checked by AES-GCM itself: the password is part of the key, and a
  wrong one fails the authentication tag. No separate password hash is stored any more;
  a stored PBKDF2 hash let anyone with the database brute-force weak passwords offline
  without the master key. (Rows created before this change are still verified the old way.)
* Uploads are read in chunks and stopped at MAX_FILE_SIZE_BYTES instead of being read
  into memory whole first.
* Downloads are always served as application/octet-stream with a sanitised,
  RFC 5987-encoded filename, so neither the uploader's filename nor their claimed
  content type can inject headers or change how the browser treats the file.
* Every path that destroys a file overwrites it first (revoke used to just unlink).
* PBKDF2 runs in a worker thread so key derivation doesn't stall the event loop.
"""

import asyncio
import datetime
import os
import re
import unicodedata
import uuid
from typing import List, Optional
from urllib.parse import quote

from cryptography.exceptions import InvalidTag
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_current_user_optional
from app.core.security import decrypt_payload, encrypt_payload, generate_share_token, hash_token, verify_password
from app.db.models import AccessLog, Share, User
from app.db.session import get_db
from app.schemas.share import (
    ShareCreateResponse, ShareCreateText, ShareItemOut, ShareMetadataResponse,
    ShareRevealTextResponse, ShareStatsResponse, ShareUnlockRequest,
)

router = APIRouter()

# Marks a share whose password is verified by the AEAD tag rather than a stored hash.
AEAD_PASSWORD = "aead"
EXPIRATIONS = {10, 60, 1440, 10080}
VIEW_LIMITS = {1, 2, 5}
CHUNK = 64 * 1024


def compute_share_status(share: Share) -> str:
    now = datetime.datetime.utcnow()
    if share.is_revoked:
        return "revoked"
    if share.is_consumed or share.view_count >= share.max_views:
        return "consumed"
    if share.expires_at < now:
        return "expired"
    return "active"


def shred_file(path: Optional[str]) -> None:
    """Overwrite with zeroes, then unlink. Best effort on filesystems that copy on write."""
    if not path or not os.path.exists(path):
        return
    try:
        size = os.path.getsize(path)
        with open(path, "r+b") as f:
            f.write(b"\x00" * size)
            f.flush()
            os.fsync(f.fileno())
        os.remove(path)
    except OSError:
        pass


def safe_filename(name: Optional[str]) -> str:
    """Basename only, printable, no quotes or separators; keeps the extension readable."""
    base = os.path.basename((name or "").replace("\\", "/"))
    base = unicodedata.normalize("NFKC", base)
    base = re.sub(r'[\x00-\x1f\x7f"<>:|?*/\\;]', "_", base).strip(" .")
    return base[:120] or "attachment.bin"


def _destroy(share: Share) -> None:
    share.is_consumed = True
    share.encrypted_payload = None
    shred_file(share.file_storage_path)
    share.file_storage_path = None


async def _load_live_share(db: AsyncSession, token: str, kind: Optional[str] = None) -> Share:
    share = (await db.execute(select(Share).where(Share.token_hash == hash_token(token)))).scalar_one_or_none()
    if not share or share.is_revoked or share.is_consumed or (kind and share.share_type != kind):
        raise HTTPException(status_code=404, detail="Secret not found or already consumed.")
    if share.expires_at < datetime.datetime.utcnow() or share.view_count >= share.max_views:
        _destroy(share)
        await db.commit()
        raise HTTPException(status_code=404, detail="Secret has expired.")
    if share.failed_attempts >= settings.MAX_PASSWORD_ATTEMPTS:
        _destroy(share)
        db.add(AccessLog(share_token_hash=share.token_hash, result="locked"))
        await db.commit()
        raise HTTPException(status_code=403, detail="Maximum password attempts exceeded. Secret shredded.")
    return share


async def _wrong_password(db: AsyncSession, share: Share) -> None:
    share.failed_attempts += 1
    db.add(AccessLog(share_token_hash=share.token_hash, result="invalid_password"))
    left = settings.MAX_PASSWORD_ATTEMPTS - share.failed_attempts
    if left <= 0:
        _destroy(share)  # the last wrong guess destroys it immediately
        await db.commit()
        raise HTTPException(status_code=403, detail="Maximum password attempts exceeded. Secret shredded.")
    await db.commit()
    raise HTTPException(status_code=401, detail=f"Incorrect passphrase. {left} attempt(s) remaining.")


async def _decrypt(db: AsyncSession, share: Share, ciphertext: bytes, password: Optional[str]) -> bytes:
    """Decrypt, treating an authentication failure on a password-protected share as a wrong password."""
    if share.password_hash and share.password_hash != AEAD_PASSWORD:
        # Legacy row with a stored hash.
        if not password or not verify_password(password, share.password_hash, share.password_salt):
            await _wrong_password(db, share)
    if share.password_hash and not password:
        await _wrong_password(db, share)
    try:
        return await asyncio.to_thread(decrypt_payload, ciphertext, share.nonce, share.salt, password if share.password_hash else None)
    except InvalidTag:
        if share.password_hash:
            await _wrong_password(db, share)
        raise HTTPException(status_code=400, detail="Decryption failure.")


async def _claim_view(db: AsyncSession, share: Share) -> int:
    """Atomically take one view. Returns views remaining after this one, or raises if none were left."""
    result = await db.execute(
        update(Share)
        .where(Share.id == share.id, Share.view_count < Share.max_views, Share.is_consumed == False, Share.is_revoked == False)  # noqa: E712
        .values(view_count=Share.view_count + 1)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Secret not found or already consumed.")
    await db.refresh(share)
    return share.max_views - share.view_count


@router.post("/text", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_text_share(
    payload: ShareCreateText,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    token = generate_share_token()
    ciphertext, nonce, salt = await asyncio.to_thread(encrypt_payload, payload.text.encode("utf-8"), payload.password)
    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=payload.expiration_minutes)
    db.add(Share(
        token_hash=hash_token(token), share_type="text", encrypted_payload=ciphertext, salt=salt, nonce=nonce,
        password_hash=AEAD_PASSWORD if payload.password else None, password_salt=None,
        max_views=payload.max_views, view_count=0, is_consumed=False, is_revoked=False,
        expires_at=expires_at, created_at=now, owner_id=current_user.id if current_user else None,
    ))
    await db.commit()
    return ShareCreateResponse(token=token, share_url=f"/s/{token}", share_type="text", expires_at=expires_at,
                               max_views=payload.max_views, has_password=bool(payload.password))


async def _read_limited(file: UploadFile) -> bytes:
    chunks: List[bytes] = []
    size = 0
    while chunk := await file.read(CHUNK):
        size += len(chunk)
        if size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.")
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/file", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_file_share(
    file: UploadFile = File(...),
    expiration_minutes: int = Form(1440),
    max_views: int = Form(1),
    password: Optional[str] = Form(None, max_length=128),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if expiration_minutes not in EXPIRATIONS:
        raise HTTPException(status_code=400, detail="Invalid expiration duration.")
    if max_views not in VIEW_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid maximum views count.")
    file_bytes = await _read_limited(file)
    if not file_bytes:
        raise HTTPException(status_code=400, detail="The file is empty.")

    token = generate_share_token()
    ciphertext, nonce, salt = await asyncio.to_thread(encrypt_payload, file_bytes, password or None)
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    storage_path = os.path.join(settings.STORAGE_DIR, f"{uuid.uuid4().hex}.enc")
    with open(storage_path, "wb") as f:
        f.write(ciphertext)

    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=expiration_minutes)
    db.add(Share(
        token_hash=hash_token(token), share_type="file", file_storage_path=storage_path, salt=salt, nonce=nonce,
        filename=safe_filename(file.filename), file_size=len(file_bytes),
        # Informational only: downloads are always served as application/octet-stream.
        mime_type=(file.content_type or "application/octet-stream")[:128],
        password_hash=AEAD_PASSWORD if password else None, password_salt=None,
        max_views=max_views, view_count=0, is_consumed=False, is_revoked=False,
        expires_at=expires_at, created_at=now, owner_id=current_user.id if current_user else None,
    ))
    await db.commit()
    return ShareCreateResponse(token=token, share_url=f"/s/{token}", share_type="file", expires_at=expires_at,
                               max_views=max_views, has_password=bool(password))


@router.get("/{token}/meta", response_model=ShareMetadataResponse)
async def get_share_metadata(token: str, db: AsyncSession = Depends(get_db)):
    share = await _load_live_share(db, token)
    return ShareMetadataResponse(
        share_type=share.share_type, has_password=bool(share.password_hash), expires_at=share.expires_at,
        views_remaining=share.max_views - share.view_count, filename=share.filename,
        file_size=share.file_size, mime_type=share.mime_type,
    )


@router.post("/{token}/unlock", response_model=ShareRevealTextResponse)
async def unlock_text_share(token: str, req: ShareUnlockRequest, db: AsyncSession = Depends(get_db)):
    share = await _load_live_share(db, token, kind="text")
    plaintext = await _decrypt(db, share, share.encrypted_payload, req.password)
    remaining = await _claim_view(db, share)
    destroyed = remaining <= 0
    if destroyed:
        _destroy(share)
    db.add(AccessLog(share_token_hash=share.token_hash, result="accessed"))
    await db.commit()
    return ShareRevealTextResponse(secret_text=plaintext.decode("utf-8"), burn_after_reading=share.max_views == 1,
                                   views_remaining=max(0, remaining), is_destroyed=destroyed)


def _content_disposition(filename: str) -> str:
    ascii_name = filename.encode("ascii", "ignore").decode() or "attachment.bin"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"


@router.post("/{token}/download")
async def download_file_share(token: str, req: ShareUnlockRequest, db: AsyncSession = Depends(get_db)):
    share = await _load_live_share(db, token, kind="file")
    if not share.file_storage_path or not os.path.exists(share.file_storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file asset unavailable.")
    with open(share.file_storage_path, "rb") as f:
        ciphertext = f.read()
    file_bytes = await _decrypt(db, share, ciphertext, req.password)
    remaining = await _claim_view(db, share)
    if remaining <= 0:
        _destroy(share)
    db.add(AccessLog(share_token_hash=share.token_hash, result="accessed"))
    await db.commit()
    return Response(content=file_bytes, media_type="application/octet-stream", headers={
        "Content-Disposition": _content_disposition(safe_filename(share.filename)),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
    })


@router.delete("/{token}", status_code=status.HTTP_200_OK)
async def revoke_share(token: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    share = (await db.execute(select(Share).where(Share.token_hash == hash_token(token)))).scalar_one_or_none()
    # Someone else's share is "not found", so the endpoint can't be used to probe tokens.
    if not share or share.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found.")
    share.is_revoked = True
    _destroy(share)
    await db.commit()
    return {"message": "Share revoked and payload shredded successfully."}


@router.delete("/mine/{share_id}", status_code=status.HTTP_200_OK)
async def revoke_own_share(share_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Revoke from the dashboard, which only knows share ids (the raw token is never stored)."""
    share = await db.get(Share, share_id)
    if not share or share.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found.")
    share.is_revoked = True
    _destroy(share)
    await db.commit()
    return {"message": "Share revoked and payload shredded successfully."}


@router.get("/mine/all", response_model=List[ShareItemOut])
async def list_user_shares(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    shares = (await db.execute(select(Share).where(Share.owner_id == current_user.id).order_by(Share.created_at.desc()))).scalars().all()
    return [
        ShareItemOut(
            id=s.id, token_hash_prefix=s.token_hash[:8], share_type=s.share_type, filename=s.filename,
            max_views=s.max_views, view_count=s.view_count, is_consumed=s.is_consumed, is_revoked=s.is_revoked,
            expires_at=s.expires_at, created_at=s.created_at, status=compute_share_status(s),
        )
        for s in shares
    ]


@router.get("/mine/stats", response_model=ShareStatsResponse)
async def get_user_share_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    shares = (await db.execute(select(Share).where(Share.owner_id == current_user.id))).scalars().all()
    states = [compute_share_status(s) for s in shares]
    return ShareStatsResponse(
        total_created=len(shares),
        active_count=states.count("active"),
        consumed_count=states.count("consumed") + states.count("revoked"),
        expired_count=states.count("expired"),
    )
