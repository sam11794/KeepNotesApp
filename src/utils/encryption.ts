/**
 * Encryption Helper Module
 *
 * This module handles AES encryption/decryption of note content.
 * Uses a fixed secret key for simplicity (can be improved later with key management).
 */

// IMPORTANT: This polyfill MUST be imported first before crypto-js
// It provides crypto.getRandomValues() which crypto-js needs for AES
import 'react-native-get-random-values';

import CryptoJS from 'crypto-js';

// ============================================================
// SECRET KEY - Used for AES encryption/decryption
// ============================================================
// NOTE: This is a fixed key for simplicity. In production,
// you should use secure key management (e.g., device KeyStore).
// ============================================================
const SECRET_KEY = 'my-super-secret-key-12345';

/**
 * Encrypts plain text using AES encryption
 *
 * @param text - The plain text to encrypt
 * @returns The encrypted text (cipher text)
 *
 * HOW IT WORKS:
 * 1. Takes plain text as input
 * 2. Uses AES algorithm with SECRET_KEY to encrypt
 * 3. Returns the encrypted string
 *
 * Example:
 *   encrypt("Hello World") -> "U2FsdGVkX1..."
 */
export const encrypt = (text: string): string => {
  // CryptoJS.AES.encrypt takes:
  // - text: the text to encrypt
  // - key: the secret key used for encryption
  // Returns a cipher text string
  const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  return encrypted;
};

/**
 * Decrypts encrypted text back to plain text
 *
 * @param cipherText - The encrypted text to decrypt
 * @returns The decrypted plain text
 *
 * HOW IT WORKS:
 * 1. Takes encrypted text (cipher text) as input
 * 2. Uses AES algorithm with SECRET_KEY to decrypt
 * 3. Returns the original plain text
 *
 * Example:
 *   decrypt("U2FsdGVkX1...") -> "Hello World"
 */
export const decrypt = (cipherText: string): string => {
  try {
    // CryptoJS.AES.decrypt takes:
    // - cipherText: the encrypted text
    // - key: the secret key used for decryption
    const decrypted = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);

    // IMPORTANT: Must specify UTF-8 encoding to get actual readable text
    // Without this, it returns cipher object representation, not actual text
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.log('DECRYPT ERROR:', error);
    // If decryption fails, return empty string
    return '';
  }
};
