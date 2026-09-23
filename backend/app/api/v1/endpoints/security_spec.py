from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

class SecuritySpecResponse(BaseModel):
    application: str
    version: str
    cipher_suite: str
    key_derivation: str
    token_entropy: str
    storage_model: str
    shredding_policy: str
    threat_model_mitigations: List[Dict[str, str]]
    known_limitations: List[Dict[str, str]]

@router.get("/spec", response_model=SecuritySpecResponse)
async def get_security_spec():
    return SecuritySpecResponse(
        application="VaultShare",
        version="1.0.0",
        cipher_suite="AES-256-GCM (Authenticated Encryption with Associated Data, 96-bit unique IV/nonce, 128-bit auth tag)",
        key_derivation="PBKDF2-HMAC-SHA256 (100,000 rounds, per-secret 128-bit salt, composite key from master key + optional user passphrase)",
        token_entropy="256-bit cryptographically secure pseudorandom token via secrets.token_urlsafe(32). Tokens are hashed with SHA-256 in DB.",
        storage_model="Zero-Plaintext at Rest. Text secrets stored as AES-256 ciphertext blobs; files encrypted into safe non-executable isolation directories with UUID names.",
        shredding_policy="On condition fulfillment (max views reached, manual revocation, or expiration), ciphertext is zeroed and unlinked from DB/filesystem immediately.",
        threat_model_mitigations=[
            {
                "threat": "Database compromise",
                "defense": "All secret payloads are AES-256-GCM encrypted. Passwords are salted and hashed with PBKDF2 (100k rounds). Database leak reveals zero plaintext."
            },
            {
                "threat": "Link crawling / Pre-fetchers (Slack, Discord, Teams)",
                "defense": "Metadata route /s/{token}/meta only serves expiration and format info. Secret payload is never returned or decrypted during GET requests."
            },
            {
                "threat": "Brute-force passphrase guessing",
                "defense": "Per-share counter enforces strict maximum of 5 attempts. Exceeding threshold triggers automated irreversible destruction of the secret."
            },
            {
                "threat": "Token enumeration",
                "defense": "256 bits of entropy prevents brute-force enumeration. Public IDs are non-sequential URL-safe tokens, stored hashed."
            },
            {
                "threat": "Malicious file upload & execution",
                "defense": "Files are stored outside web root with randomized UUID filenames, encrypted on disk, and served with Content-Disposition: attachment and X-Content-Type-Options: nosniff."
            }
        ],
        known_limitations=[
            {
                "limitation": "No independent external security audit",
                "detail": "VaultShare is engineered defensively according to cryptographic best practices, but has not received an independent formal third-party audit."
            },
            {
                "limitation": "Server-assisted encryption model",
                "detail": "Because decryption is coordinated by the FastAPI service, full compromise of the running server process memory could compromise active secrets in transit."
            },
            {
                "limitation": "Client-side preservation",
                "detail": "Once a recipient renders text or downloads a file, VaultShare cannot prevent screenshots, local saves, or recipient copying."
            }
        ]
    )
