/**
 * Portable Password-Based Encryption Module
 *
 * Uses PBKDF2 to derive key from password, then AES-256 to encrypt.
 * Output format: { iv, salt, encryptedData } - all base64 encoded.
 */

import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

const ITERATIONS = 10000;
const KEY_SIZE = 256 / 32; // 8 (words = 256 bits)
const SALT_SIZE = 128 / 8; // 16 bytes
const IV_SIZE = 128 / 8; // 16 bytes

/**
 * Encrypts plain text using password-based AES-256 encryption.
 */
export const encryptWithPassword = (plainText: string, password: string): string => {
  // Generate random salt
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);

  // Derive key from password using PBKDF2
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });

  // Generate random IV
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);

  // Encrypt using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Return JSON with base64 encoded values
  return JSON.stringify({
    iv: iv.toString(CryptoJS.enc.Base64),
    salt: salt.toString(CryptoJS.enc.Base64),
    encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
  });
};

/**
 * Decrypts a password-encrypted JSON string.
 */
export const decryptWithPassword = (encryptedJson: string, password: string): string => {
  try {
    // Parse the JSON
    const data = JSON.parse(encryptedJson);
    const { iv, salt, encryptedData } = data;

    // Parse base64 strings back to WordArrays
    const ivWordArray = CryptoJS.enc.Base64.parse(iv);
    const saltWordArray = CryptoJS.enc.Base64.parse(salt);
    const ciphertextWordArray = CryptoJS.enc.Base64.parse(encryptedData);

    // Derive the same key from password and salt
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: KEY_SIZE,
      iterations: ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    });

    // Create cipher params object
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertextWordArray,
    });

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to UTF-8 string
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    console.log('DECRYPTED RAW:', decryptedText);
    console.log('DECRYPTED LENGTH:', decryptedText.length);

    return decryptedText;
  } catch (error) {
    console.log('Decryption failed:', error);
    return '';
  }
};

// Keep old functions for backward compatibility with existing DB encryption
export const encrypt = (text: string): string => {
  return encryptWithPassword(text, 'my-super-secret-key-12345');
};

export const decrypt = (cipherText: string): string => {
  return decryptWithPassword(cipherText, 'my-super-secret-key-12345');
};
