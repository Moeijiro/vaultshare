# VaultShare

[![CI](https://github.com/Moeijiro/vaultshare/actions/workflows/ci.yml/badge.svg)](https://github.com/Moeijiro/vaultshare/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?logo=next.js)](https://nextjs.org/)
[![Cryptography](https://img.shields.io/badge/Security-AES--256--GCM-red.svg)](https://cryptography.io/)

> **VaultShare** is a security-conscious, open-source web application for sharing ephemeral text secrets and encrypted small files using expiring, one-time ("burn-after-reading") links, optional Argon2id/PBKDF2-derived password protection, and authenticated AES-256-GCM envelope encryption.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |         VaultShare Web Client         |
                      |   (Next.js 14, React, Tailwind CSS)   |
                      +-------------------+-------------------+
                                          |
                                    HTTPS / TLS 1.3
                                          |
                      +-------------------v-------------------+
                      |          FastAPI Application          |
                      |    (Security Headers, CORS, Limit)    |
                      +-------------------+-------------------+
                                          |
       +----------------------------------+----------------------------------+
       |                                  |                                  |
+------v--------------------+  +----------v------------------+  +------------v-----------+
|    Cryptographic Core     |  |   Database & State Store    |  | File Vault (Encrypted) |
| • AES-256-GCM AEAD Cipher |  | • SQLite (Dev) / PostgreSQL |  | • Safe sanitized paths |
| • High-entropy 256-bit PRNG| | • Token Hashing (SHA-256)   |  | • Chunked AES-GCM enc  |
| • PBKDF2/Argon2 KDF       |  | • View tracking & locks     |  | • Instant shredding    |
+---------------------------+  +-----------------------------+  +------------------------+
```

---

## Secret Lifecycle

```
[ Sender ]
    │
    ├─> Enters Secret (Text or Small File)
    ├─> Selects Expiration (10m, 1h, 24h, 7d)
    ├─> Selects Max Views (1, 2, 5)
    ├─> Optional Passphrase
    │
    ▼
[ VaultShare Core ]
    │
    ├─> Generates High-Entropy Token (256-bit URL-Safe)
    ├─> Generates Unique 96-bit Nonce & 256-bit Payload Salt
    ├─> Derives AES-256 Key & Encrypts with AES-GCM (Authenticated)
    ├─> Hashes Passphrase with Salt via PBKDF2-HMAC-SHA256
    ├─> Stores Only Encrypted Ciphertext + Auth Tag + Metadata
    ├─> Discards Plaintext from Memory Immediately
    │
    ▼
[ Share Link Generated: /s/{token} ]
    │
    ▼
[ Recipient Opens Link ]
    │
    ├─> Checks Expiration & View Count
    ├─> If Passphrase Enabled: Requests Password (Max 5 attempts)
    ├─> Atomically Increments View Counter
    ├─> Decrypts Payload on Demand
    │
    ▼
[ Destroy Condition Met? ] (Views >= Max OR Expired OR Explicit Revoke)
    │
    ├─> Overwrites & Deletes Ciphertext / File Payload
    ├─> Marks Record as Consumed / Inactive
    └─> Future Requests Return Generic 404
```

---

## Threat Model & Security Considerations

### What VaultShare Protects Against
1. **Server-Side Data Breaches at Rest**: If the database or filesystem is compromised, secrets are encrypted using authenticated AES-256-GCM. Passphrases are never stored in plaintext.
2. **Link Scraping & Accidental Pre-fetching**: Opening the share URL (`/s/{token}`) fetches only metadata (expiration time, whether a password is required, file vs text). The secret payload is **never returned automatically on page load**; the recipient must explicitly click "Reveal Secret" or submit the passphrase.
3. **Link Guessing & Enumeration**: Share identifiers are 256-bit cryptographically secure URL-safe strings generated via `secrets.token_urlsafe(32)`. Sequential database IDs are never exposed in public endpoints.
4. **Brute-force Attacks on Password-Protected Shares**: Built-in per-share attempt limits (maximum 5 failed attempts) lock out automated credential guessing.
5. **Memory Residue**: Plaintext secrets are handled as transient memory buffers and never written to temporary logs, analytics, or tracebacks.
6. **Malicious File Execution**: Uploaded files are verified against a strict size ceiling (max 10MB), stored outside the public web root using randomized UUIDs, served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

### Limitations & Transparent Non-Claims
* **No Independent Security Audit**: VaultShare has not undergone an external third-party security audit. It is designed following modern cryptographic and defensive engineering principles for portfolio and team utility.
* **Server-Assisted Model (Trust in Application Server)**: In the current architecture, encryption keys are derived and applied server-side. Users who require zero-knowledge end-to-end client-side encryption should use client-side GPG or WebCrypto before pasting.
* **Recipient Dishonesty**: Once a secret is displayed to the recipient, VaultShare cannot prevent recipients from copying text, taking screenshots, or preserving downloaded files.

---

## Key Features

- 🔐 **Authenticated AES-256-GCM Encryption**: High-standard Galois/Counter Mode encryption ensuring both confidentiality and cryptographic integrity.
- 🔥 **Burn After Reading**: One-time shares immediately delete ciphertext and file assets upon first successful retrieval.
- ⏱️ **Flexible Expirations**: 10 minutes, 1 hour, 24 hours, or 7 days with automated background garbage collection.
- 🛡️ **Optional Passphrase Lock**: Key derivation and password hashing with anti-enumeration response timing.
- 📁 **Encrypted File Sharing**: Small documents, configuration snippets, and credentials with safe quarantine paths.
- 📊 **Owner Dashboard**: Optional authenticated accounts to track active, expired, and consumed shares with one-click revocation. Senders can never re-read secrets once generated.
- 🕵️ **Anonymous Mode**: Create links immediately without requiring account registration.
- 📱 **Security-Focused UI**: Dark theme, clear cryptographic status cues, countdown timers, and responsive layout.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/shares/text` | Create an encrypted text secret |
| `POST` | `/api/v1/shares/file` | Create an encrypted file share |
| `GET` | `/api/v1/shares/{token}/meta` | Get public metadata (type, expiration, password-required) |
| `POST` | `/api/v1/shares/{token}/unlock` | Decrypt text secret (with optional password verification) |
| `POST` | `/api/v1/shares/{token}/download` | Download and decrypt file payload |
| `DELETE` | `/api/v1/shares/{token}` | Revoke and instantly shred a share (Owner only) |
| `GET` | `/api/v1/shares/mine` | List user's active/expired/consumed shares |
| `POST` | `/api/v1/auth/register` | Register an owner account |
| `POST` | `/api/v1/auth/login` | Login and receive JWT access token |
| `GET` | `/api/v1/security/spec` | Public cryptographic specification endpoint |

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, `cryptography`, `passlib`, `pytest`
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Storage**: SQLite (Local Dev) / PostgreSQL (Production ready)
- **Tooling**: Docker, Docker Compose, GitHub Actions CI

---

## Getting Started

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run database migrations / initialization & tests
pytest
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` to access the VaultShare interface.

---

## License

MIT © [Moeijiro](https://github.com/Moeijiro)
