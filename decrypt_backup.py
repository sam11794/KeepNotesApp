#!/usr/bin/env python3
"""
KeepNotes Backup Decryptor
Decrypts backup files encrypted with the KeepNotes app encryption logic.

Usage:
    python decrypt_backup.py <backup_json_file> <email>
    python decrypt_backup.py <backup_json_file> <email> --output <output_file>

Example:
    python decrypt_backup.py backup.json user@example.com
"""

import sys
import json
import base64
import argparse
from pathlib import Path

try:
    from Crypto.Cipher import AES
    from Crypto.Protocol.KDF import PBKDF2
    from Crypto.Util.Padding import unpad
    from Crypto.Hash import HMAC, SHA256
except ImportError:
    print("Error: pycryptodome is required.")
    print("Install it with: pip install pycryptodome")
    sys.exit(1)

# Encryption parameters (must match React Native crypto.js)
ITERATIONS = 1000
KEY_SIZE = 256  # bits
SALT_SIZE = 16  # bytes
IV_SIZE = 16   # bytes


def decrypt_backup(encrypted_json: str, email: str) -> dict:
    """
    Decrypts KeepNotes backup data.

    Args:
        encrypted_json: JSON string containing { iv, salt, encryptedData }
        email: The email used as the encryption password

    Returns:
        Decrypted notes data as dictionary
    """
    try:
        # Parse the encrypted JSON
        data = json.loads(encrypted_json)

        iv = data.get('iv')
        salt = data.get('salt')
        encrypted_data = data.get('encryptedData')

        if not all([iv, salt, encrypted_data]):
            raise ValueError("Invalid backup data: missing iv, salt, or encryptedData")

        print(f"[+] IV: {iv[:30]}...")
        print(f"[+] Salt: {salt[:30]}...")
        print(f"[+] Encrypted data length: {len(encrypted_data)} chars")

        # Decode base64
        iv_bytes = base64.b64decode(iv)
        salt_bytes = base64.b64decode(salt)
        encrypted_bytes = base64.b64decode(encrypted_data)

        print(f"[+] IV bytes length: {len(iv_bytes)}")
        print(f"[+] Salt bytes length: {len(salt_bytes)}")
        print(f"[+] Encrypted bytes length: {len(encrypted_bytes)}")

        # Derive key using PBKDF2 with HMAC-SHA256
        import hmac as hmac_module
        import hashlib

        def prf_func(password: bytes, salt: bytes) -> bytes:
            return hmac_module.new(password, salt, 'sha256').digest()

        key = PBKDF2(
            password=email.encode('utf-8'),
            salt=salt_bytes,
            dkLen=KEY_SIZE // 8,  # 32 bytes = 256 bits
            count=ITERATIONS,
            prf=prf_func
        )

        print(f"[+] Key derived (PBKDF2): {key.hex()[:32]}...")
        print(f"[+] Encrypted bytes start (hex): {encrypted_bytes[:16].hex()}")
        print(f"[+] Is Salted__: {encrypted_bytes[:8] == b'Salted__'}")

        # Check if this is OpenSSL "Salted__" format (CryptoJS AES.encrypt output)
        if encrypted_bytes[:8] == b'Salted__':
            print("[+] Detected OpenSSL salted format (CryptoJS)")
            embedded_salt = encrypted_bytes[8:16]
            actual_ciphertext = encrypted_bytes[16:]
            print(f"[+] Embedded salt: {embedded_salt.hex()}")
            print(f"[+] JSON salt: {salt_bytes.hex()}")
            print(f"[+] SALT MATCH: {embedded_salt == salt_bytes}")
            print(f"[+] Ciphertext length: {len(actual_ciphertext)}")

            # Try TWO approaches:
            # Approach 1: Use embedded salt with EVP_BytesToKey
            def openssl_evp_bytes_to_key(password: bytes, salt: bytes, key_len: int, iv_len: int) -> tuple:
                d = b''
                d_i = b''
                while len(d) < key_len + iv_len:
                    d_i = hashlib.md5(d_i + password + salt).digest()
                    d += d_i
                return d[:key_len], d[key_len:key_len + iv_len]

            openssl_key, openssl_iv = openssl_evp_bytes_to_key(
                email.encode('utf-8'), embedded_salt, 32, 16
            )
            print(f"[+] OpenSSL-derived key: {openssl_key.hex()[:32]}...")
            print(f"[+] OpenSSL-derived IV: {openssl_iv.hex()}")

            # Approach 2: Use JSON salt with PBKDF2
            pbkdf2_key = PBKDF2(
                password=email.encode('utf-8'),
                salt=embedded_salt,
                dkLen=KEY_SIZE // 8,
                count=ITERATIONS,
                prf=prf_func
            )
            print(f"[+] PBKDF2 with embedded salt: {pbkdf2_key.hex()[:32]}...")

            # Try decryption with both approaches
            from Crypto.Cipher import AES as AESModule

            for attempt, (name, k, iv) in enumerate([
                ("OpenSSL EVP (embedded salt)", openssl_key, openssl_iv),
                ("PBKDF2 (embedded salt)", pbkdf2_key, iv_bytes),
                ("PBKDF2 (JSON salt)", key, iv_bytes),
            ], 1):
                print(f"\n[~] Attempt {attempt}: {name}")
                try:
                    cipher = AESModule.new(k, AESModule.MODE_CBC, iv)
                    decrypted_padded = cipher.decrypt(actual_ciphertext)
                    decrypted = unpad(decrypted_padded, AESModule.block_size)
                    print(f"[+] SUCCESS with {name}!")
                    print(f"[+] Decrypted: {decrypted.decode('utf-8')[:100]}...")
                    key = k
                    iv_bytes = iv
                    encrypted_bytes = actual_ciphertext
                    break
                except Exception as e:
                    print(f"[-] Failed: {e}")
                    # Show last bytes for debugging
                    print(f"[-] Last 16 bytes hex: {decrypted_padded[-16:].hex()}")
            else:
                raise Exception("All decryption attempts failed")
        else:
            # NOT OpenSSL format - try direct decryption
            print("[+] NOT OpenSSL format, trying direct decryption...")
            from Crypto.Cipher import AES as AESModule

            for attempt, (name, k, iv) in enumerate([
                ("PBKDF2 (JSON salt) - direct", key, iv_bytes),
            ], 1):
                print(f"\n[~] Attempt {attempt}: {name}")
                try:
                    cipher = AESModule.new(k, AESModule.MODE_CBC, iv)
                    decrypted_padded = cipher.decrypt(encrypted_bytes)
                    decrypted = unpad(decrypted_padded, AESModule.block_size)
                    print(f"[+] SUCCESS with {name}!")
                    print(f"[+] Decrypted: {decrypted.decode('utf-8')[:100]}...")
                    break
                except Exception as e:
                    print(f"[-] Failed: {e}")
                    print(f"[-] Last 16 bytes hex: {decrypted_padded[-16:].hex()}")

        print(f"[+] Decrypted data length: {len(decrypted)} bytes")

        # Parse and return the notes JSON
        notes_json = decrypted.decode('utf-8')
        notes = json.loads(notes_json)

        return notes

    except json.JSONDecodeError as e:
        print(f"[-] JSON parse error: {e}")
        raise
    except Exception as e:
        print(f"[-] Decryption error: {e}")
        raise


def format_notes(notes: list) -> str:
    """
    Formats notes for readable output.
    """
    output = []
    output.append(f"\n{'='*60}")
    output.append(f" DECRYPTED BACKUP - {len(notes)} NOTES FOUND")
    output.append(f"{'='*60}\n")

    for i, note in enumerate(notes, 1):
        note_id = note.get('id', 'N/A')
        title = note.get('title', '(No Title)')
        content = note.get('content', '(No Content)')
        created_at = note.get('created_at', 0)

        # Convert timestamp to readable date
        from datetime import datetime
        date_str = datetime.fromtimestamp(created_at).strftime('%Y-%m-%d %H:%M:%S') if created_at else 'N/A'

        output.append(f"--- Note #{i} ---")
        output.append(f"  ID:        {note_id}")
        output.append(f"  Title:     {title}")
        output.append(f"  Created:   {date_str}")
        output.append(f"  Content:")
        # Indent content for readability
        for line in content.split('\n'):
            output.append(f"    {line}")
        output.append("")

    return '\n'.join(output)


def main():
    parser = argparse.ArgumentParser(
        description='Decrypt KeepNotes backup files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python decrypt_backup.py backup.json user@example.com
  python decrypt_backup.py backup.json user@example.com -o decrypted_notes.json
  python decrypt_backup.py backup.json user@example.com --pretty
        """
    )

    parser.add_argument('backup_file', type=Path, help='Path to encrypted backup JSON file')
    parser.add_argument('email', type=str, help='Email used for encryption')
    parser.add_argument('-o', '--output', type=Path, help='Output file path (default: stdout)')
    parser.add_argument('-p', '--pretty', action='store_true', help='Pretty print notes')

    args = parser.parse_args()

    # Check if backup file exists
    if not args.backup_file.exists():
        print(f"[-] Error: Backup file not found: {args.backup_file}")
        sys.exit(1)

    # Read backup file
    print(f"[+] Reading backup file: {args.backup_file}")
    with open(args.backup_file, 'r', encoding='utf-8') as f:
        backup_content = f.read().strip()

    # Check if input is raw base64 or JSON
    # The app stores as { iv, salt, encryptedData } in JSON format
    try:
        # Try parsing as JSON first
        json_data = json.loads(backup_content)
        if isinstance(json_data, dict) and 'encryptedData' in json_data:
            encrypted_json = backup_content
        else:
            # Might be raw encryptedData only - try as direct base64
            encrypted_json = json.dumps({
                "iv": "",  # These would need to be provided
                "salt": "",
                "encryptedData": backup_content
            })
            print("[!] Warning: Input format unclear, attempting decryption...")
    except json.JSONDecodeError:
        # Try as raw base64 encrypted data
        print("[!] Warning: Could not parse as JSON, treating as raw encrypted data...")
        encrypted_json = backup_content

    try:
        print(f"\n[+] Decrypting with email: {args.email}")
        notes = decrypt_backup(encrypted_json, args.email)

        if args.pretty:
            output = format_notes(notes)
        else:
            output = json.dumps(notes, indent=2, ensure_ascii=False)

        # Write output
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"\n[+] Decrypted data saved to: {args.output}")
        else:
            print(output)

        print(f"\n[+] Success! Decrypted {len(notes)} notes.")

    except Exception as e:
        print(f"\n[-] Decryption failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
