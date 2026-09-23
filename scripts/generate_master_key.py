#!/usr/bin/env python3
"""Utility script to generate cryptographically secure 256-bit URL-safe master keys."""
import secrets
import base64

def main():
    raw_bytes = secrets.token_bytes(32)
    key_b64 = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
    print("\n--- VaultShare Master Key Generator ---")
    print(f"Generated 256-bit Master Key (base64): {key_b64}")
    print("Add this to your backend/.env as: VAULT_MASTER_KEY=" + key_b64 + "\n")

if __name__ == "__main__":
    main()
