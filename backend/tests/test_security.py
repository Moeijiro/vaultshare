import pytest
from cryptography.exceptions import InvalidTag
from app.core.security import (
    encrypt_payload, decrypt_payload, hash_password, verify_password,
    generate_share_token, hash_token
)

def test_encryption_decryption_without_password():
    plaintext = b"super-secret-api-token-xyz-123"
    ciphertext, nonce, salt = encrypt_payload(plaintext)
    
    assert ciphertext != plaintext
    assert len(nonce) == 12
    assert len(salt) == 16

    decrypted = decrypt_payload(ciphertext, nonce, salt)
    assert decrypted == plaintext

def test_encryption_decryption_with_password():
    plaintext = b"passphrase-protected-vault-content"
    password = "CorrectHorseBatteryStaple99!"
    
    ciphertext, nonce, salt = encrypt_payload(plaintext, password=password)
    
    # Correct password succeeds
    decrypted = decrypt_payload(ciphertext, nonce, salt, password=password)
    assert decrypted == plaintext

    # Wrong password fails with InvalidTag
    with pytest.raises(InvalidTag):
        decrypt_payload(ciphertext, nonce, salt, password="WrongPassword123")

def test_ciphertext_tamper_resistance():
    plaintext = b"tamper-evident-payload"
    ciphertext, nonce, salt = encrypt_payload(plaintext)
    
    # Flip one byte in the ciphertext
    tampered = bytearray(ciphertext)
    tampered[0] ^= 0xFF
    
    with pytest.raises(InvalidTag):
        decrypt_payload(bytes(tampered), nonce, salt)

def test_password_hash_and_verify():
    pwd = "MyUltraSecurePassword_2026"
    pwd_hash, salt = hash_password(pwd)
    
    assert pwd_hash != pwd
    assert verify_password(pwd, pwd_hash, salt) is True
    assert verify_password("WrongPassword", pwd_hash, salt) is False
    assert verify_password(pwd, pwd_hash + "ab", salt) is False

def test_token_generation_and_hash():
    token1 = generate_share_token()
    token2 = generate_share_token()
    assert token1 != token2
    assert len(token1) >= 40
    
    h1 = hash_token(token1)
    h2 = hash_token(token2)
    assert h1 != h2
    assert len(h1) == 64
