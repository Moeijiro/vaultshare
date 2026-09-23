import os
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import io

from app.core.config import settings
from app.core.security import (
    generate_share_token, hash_token, encrypt_payload, decrypt_payload,
    hash_password, verify_password
)
from app.db.session import get_db
from app.db.models import Share, AccessLog, User
from app.schemas.share import (
    ShareCreateText, ShareCreateResponse, ShareMetadataResponse,
    ShareUnlockRequest, ShareRevealTextResponse, ShareItemOut, ShareStatsResponse
)
from app.core.deps import get_current_user_optional, get_current_user

router = APIRouter()

def compute_share_status(share: Share) -> str:
    now = datetime.datetime.utcnow()
    if share.is_revoked:
        return "revoked"
    if share.is_consumed or share.view_count >= share.max_views:
        return "consumed"
    if share.expires_at < now:
        return "expired"
    return "active"

@router.post("/text", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_text_share(
    payload: ShareCreateText,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    token = generate_share_token()
    token_hashed = hash_token(token)
    
    # Encrypt text secret with master key + unique salt + optional password
    ciphertext, nonce, salt = encrypt_payload(
        payload.text.encode("utf-8"),
        password=payload.password
    )
    
    # Password verification hash if enabled
    pwd_hash, pwd_salt = (None, None)
    if payload.password:
        pwd_hash, pwd_salt = hash_password(payload.password)

    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=payload.expiration_minutes)

    share = Share(
        token_hash=token_hashed,
        share_type="text",
        encrypted_payload=ciphertext,
        salt=salt,
        nonce=nonce,
        password_hash=pwd_hash,
        password_salt=pwd_salt,
        max_views=payload.max_views,
        view_count=0,
        is_consumed=False,
        is_revoked=False,
        expires_at=expires_at,
        created_at=now,
        owner_id=current_user.id if current_user else None
    )
    db.add(share)
    await db.commit()

    return ShareCreateResponse(
        token=token,
        share_url=f"/s/{token}",
        share_type="text",
        expires_at=expires_at,
        max_views=payload.max_views,
        has_password=bool(payload.password)
    )

@router.post("/file", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_file_share(
    file: UploadFile = File(...),
    expiration_minutes: int = Form(1440),
    max_views: int = Form(1),
    password: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Validate expiration & views
    if expiration_minutes not in {10, 60, 1440, 10080}:
        raise HTTPException(status_code=400, detail="Invalid expiration duration.")
    if max_views not in {1, 2, 5}:
        raise HTTPException(status_code=400, detail="Invalid maximum views count.")

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    # Safe sanitized filename
    sanitized_filename = os.path.basename(file.filename or "file.bin")
    if not sanitized_filename:
        sanitized_filename = "attachment.bin"

    token = generate_share_token()
    token_hashed = hash_token(token)

    ciphertext, nonce, salt = encrypt_payload(file_bytes, password=password)

    # Store encrypted file safely outside web root
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    storage_filename = f"{uuid.uuid4().hex}.enc"
    storage_path = os.path.join(settings.STORAGE_DIR, storage_filename)
    
    with open(storage_path, "wb") as f:
        f.write(ciphertext)

    pwd_hash, pwd_salt = (None, None)
    if password:
        pwd_hash, pwd_salt = hash_password(password)

    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=expiration_minutes)

    share = Share(
        token_hash=token_hashed,
        share_type="file",
        file_storage_path=storage_path,
        salt=salt,
        nonce=nonce,
        filename=sanitized_filename,
        file_size=len(file_bytes),
        mime_type=file.content_type or "application/octet-stream",
        password_hash=pwd_hash,
        password_salt=pwd_salt,
        max_views=max_views,
        view_count=0,
        is_consumed=False,
        is_revoked=False,
        expires_at=expires_at,
        created_at=now,
        owner_id=current_user.id if current_user else None
    )
    db.add(share)
    await db.commit()

    return ShareCreateResponse(
        token=token,
        share_url=f"/s/{token}",
        share_type="file",
        expires_at=expires_at,
        max_views=max_views,
        has_password=bool(password)
    )

@router.get("/{token}/meta", response_model=ShareMetadataResponse)
async def get_share_metadata(token: str, db: AsyncSession = Depends(get_db)):
    token_hashed = hash_token(token)
    stmt = select(Share).where(Share.token_hash == token_hashed)
    result = await db.execute(stmt)
    share = result.scalar_one_or_none()

    if not share or share.is_revoked or share.is_consumed:
        raise HTTPException(status_code=404, detail="Secret link not found or already consumed.")

    now = datetime.datetime.utcnow()
    if share.expires_at < now or share.view_count >= share.max_views:
        # Mark consumed
        share.is_consumed = True
        await db.commit()
        raise HTTPException(status_code=404, detail="Secret link has expired or reached maximum views.")

    return ShareMetadataResponse(
        share_type=share.share_type,
        has_password=bool(share.password_hash),
        expires_at=share.expires_at,
        views_remaining=share.max_views - share.view_count,
        filename=share.filename,
        file_size=share.file_size,
        mime_type=share.mime_type
    )

@router.post("/{token}/unlock", response_model=ShareRevealTextResponse)
async def unlock_text_share(
    token: str,
    req: ShareUnlockRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hashed = hash_token(token)
    stmt = select(Share).where(Share.token_hash == token_hashed)
    result = await db.execute(stmt)
    share = result.scalar_one_or_none()

    if not share or share.is_revoked or share.is_consumed:
        raise HTTPException(status_code=404, detail="Secret not found or already consumed.")

    now = datetime.datetime.utcnow()
    if share.expires_at < now or share.view_count >= share.max_views:
        share.is_consumed = True
        await db.commit()
        raise HTTPException(status_code=404, detail="Secret has expired.")

    # Check password attempts lock
    if share.failed_attempts >= settings.MAX_PASSWORD_ATTEMPTS:
        share.is_consumed = True
        await db.commit()
        db.add(AccessLog(share_token_hash=token_hashed, result="locked"))
        await db.commit()
        raise HTTPException(status_code=403, detail="Maximum password attempts exceeded. Secret shredded.")

    # Verify password if set
    if share.password_hash:
        if not req.password or not verify_password(req.password, share.password_hash, share.password_salt):
            share.failed_attempts += 1
            await db.commit()
            db.add(AccessLog(share_token_hash=token_hashed, result="invalid_password"))
            await db.commit()
            attempts_left = settings.MAX_PASSWORD_ATTEMPTS - share.failed_attempts
            raise HTTPException(
                status_code=401,
                detail=f"Incorrect passphrase. {attempts_left} attempt(s) remaining."
            )

    # Decrypt payload
    try:
        decrypted_bytes = decrypt_payload(
            share.encrypted_payload,
            share.nonce,
            share.salt,
            password=req.password
        )
        secret_text = decrypted_bytes.decode("utf-8")
    except Exception:
        raise HTTPException(status_code=400, detail="Decryption failure.")

    # Atomically increment views
    share.view_count += 1
    views_remaining = share.max_views - share.view_count
    is_destroyed = False

    if views_remaining <= 0:
        share.is_consumed = True
        share.encrypted_payload = None  # Immediate shredding from memory and DB
        is_destroyed = True

    db.add(AccessLog(share_token_hash=token_hashed, result="accessed"))
    await db.commit()

    return ShareRevealTextResponse(
        secret_text=secret_text,
        burn_after_reading=(share.max_views == 1),
        views_remaining=max(0, views_remaining),
        is_destroyed=is_destroyed
    )

@router.post("/{token}/download")
async def download_file_share(
    token: str,
    req: ShareUnlockRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hashed = hash_token(token)
    stmt = select(Share).where(Share.token_hash == token_hashed)
    result = await db.execute(stmt)
    share = result.scalar_one_or_none()

    if not share or share.is_revoked or share.is_consumed or share.share_type != "file":
        raise HTTPException(status_code=404, detail="File share not found or already consumed.")

    now = datetime.datetime.utcnow()
    if share.expires_at < now or share.view_count >= share.max_views:
        share.is_consumed = True
        await db.commit()
        raise HTTPException(status_code=404, detail="File share has expired.")

    if share.failed_attempts >= settings.MAX_PASSWORD_ATTEMPTS:
        share.is_consumed = True
        await db.commit()
        raise HTTPException(status_code=403, detail="Maximum password attempts exceeded.")

    if share.password_hash:
        if not req.password or not verify_password(req.password, share.password_hash, share.password_salt):
            share.failed_attempts += 1
            await db.commit()
            attempts_left = settings.MAX_PASSWORD_ATTEMPTS - share.failed_attempts
            raise HTTPException(
                status_code=401,
                detail=f"Incorrect passphrase. {attempts_left} attempt(s) remaining."
            )

    if not share.file_storage_path or not os.path.exists(share.file_storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file asset unavailable.")

    with open(share.file_storage_path, "rb") as f:
        ciphertext = f.read()

    try:
        file_bytes = decrypt_payload(
            ciphertext,
            share.nonce,
            share.salt,
            password=req.password
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Decryption failure.")

    share.view_count += 1
    if share.view_count >= share.max_views:
        share.is_consumed = True
        # Immediately shred file on disk
        try:
            if os.path.exists(share.file_storage_path):
                # Overwrite with zeroes before unlink
                with open(share.file_storage_path, "wb") as f:
                    f.write(b"\x00" * len(ciphertext))
                os.remove(share.file_storage_path)
        except Exception:
            pass
        share.file_storage_path = None

    db.add(AccessLog(share_token_hash=token_hashed, result="accessed"))
    await db.commit()

    headers = {
        "Content-Disposition": f'attachment; filename="{share.filename or "file.bin"}"',
        "Content-Type": share.mime_type or "application/octet-stream",
        "X-Content-Type-Options": "nosniff"
    }
    return Response(content=file_bytes, media_type=headers["Content-Type"], headers=headers)

@router.delete("/{token}", status_code=status.HTTP_200_OK)
async def revoke_share(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    token_hashed = hash_token(token)
    stmt = select(Share).where(Share.token_hash == token_hashed)
    result = await db.execute(stmt)
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found.")

    if share.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this share.")

    share.is_revoked = True
    share.is_consumed = True
    share.encrypted_payload = None

    # Shred file if exists
    if share.file_storage_path and os.path.exists(share.file_storage_path):
        try:
            os.remove(share.file_storage_path)
        except Exception:
            pass
        share.file_storage_path = None

    await db.commit()
    return {"message": "Share revoked and payload shredded successfully."}

@router.get("/mine/all", response_model=List[ShareItemOut])
async def list_user_shares(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Share).where(Share.owner_id == current_user.id).order_by(Share.created_at.desc())
    result = await db.execute(stmt)
    shares = result.scalars().all()

    items = []
    for s in shares:
        items.append(ShareItemOut(
            id=s.id,
            token_hash_prefix=s.token_hash[:8],
            share_type=s.share_type,
            filename=s.filename,
            max_views=s.max_views,
            view_count=s.view_count,
            is_consumed=s.is_consumed,
            is_revoked=s.is_revoked,
            expires_at=s.expires_at,
            created_at=s.created_at,
            status=compute_share_status(s)
        ))
    return items

@router.get("/mine/stats", response_model=ShareStatsResponse)
async def get_user_share_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Share).where(Share.owner_id == current_user.id)
    result = await db.execute(stmt)
    shares = result.scalars().all()

    total = len(shares)
    active = 0
    consumed = 0
    expired = 0

    now = datetime.datetime.utcnow()
    for s in shares:
        st = compute_share_status(s)
        if st == "active":
            active += 1
        elif st == "consumed" or st == "revoked":
            consumed += 1
        elif st == "expired":
            expired += 1

    return ShareStatsResponse(
        total_created=total,
        active_count=active,
        consumed_count=consumed,
        expired_count=expired
    )
