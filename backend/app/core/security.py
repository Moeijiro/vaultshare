import base64
import hashlib
import hmac
import os
import secrets
from typing import Tuple, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def get_master_key_bytes() -> bytes:
    """Decodes or digests the configured master key into 32 bytes."""
    raw = settings.VAULT_MASTER_KEY
    try:
        decoded = base64.urlsafe_b64decode(raw)
        if len(decoded) == 32:
            return decoded
    except Exception:
        pass
    # Fallback to sha256 digest to guarantee 32 bytes
    return hashlib.sha256(raw.encode("utf-8")).digest()

def generate_share_token() -> str:
    """Generates a high-entropy 256-bit URL-safe token."""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Returns SHA-256 hash of token to prevent plain token storage in DB."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def derive_payload_key(master_key: bytes, salt: bytes, password: Optional[str] = None) -> bytes:
    """
    Derives a 256-bit encryption key using PBKDF2-HMAC-SHA256 over
    the master key, a unique per-share salt, and optional recipient passphrase.
    """
    secret_material = master_key
    if password:
        secret_material += password.encode("utf-8")
    
    return hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=secret_material,
        salt=salt,
        iterations=100_000,
        dklen=32
    )

def encrypt_payload(data: bytes, password: Optional[str] = None) -> Tuple[bytes, bytes, bytes]:
    """
    Encrypts arbitrary byte payload using AES-256-GCM.
    Returns: (ciphertext_with_auth_tag, nonce, salt)
    """
    master_key = get_master_key_bytes()
    salt = secrets.token_bytes(16)
    derived_key = derive_payload_key(master_key, salt, password)
    
    # 96-bit nonce standard for AES-GCM
    nonce = secrets.token_bytes(12)
    aesgcm = AESGCM(derived_key)
    
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return ciphertext, nonce, salt

def decrypt_payload(ciphertext: bytes, nonce: bytes, salt: bytes, password: Optional[str] = None) -> bytes:
    """
    Decrypts ciphertext using AES-256-GCM with derived key.
    Raises cryptography.exceptions.InvalidTag if authentication tag fails or password incorrect.
    """
    master_key = get_master_key_bytes()
    derived_key = derive_payload_key(master_key, salt, password)
    
    aesgcm = AESGCM(derived_key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext

def hash_password(password: str) -> Tuple[str, str]:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 100k iterations and a unique salt.
    Returns: (hex_hash, hex_salt)
    """
    salt_bytes = secrets.token_bytes(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        iterations=100_000,
        dklen=32
    )
    return pwd_hash.hex(), salt_bytes.hex()

def verify_password(password: str, expected_hash_hex: str, salt_hex: str) -> bool:
    """Constant-time verification of password against expected hash."""
    try:
        salt_bytes = bytes.fromhex(salt_hex)
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_bytes,
            iterations=100_000,
            dklen=32
        )
        return hmac.compare_digest(computed.hex(), expected_hash_hex)
    except Exception:
        return False
