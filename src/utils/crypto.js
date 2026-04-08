import 'react-native-get-random-values';
import CryptoJS from "crypto-js";

export const encryptData = (notes, password) => {
  try {
    const data = JSON.stringify(notes);

    const salt = CryptoJS.lib.WordArray.random(16);
    const iv = CryptoJS.lib.WordArray.random(16);

    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 1000,
    });

    const encrypted = CryptoJS.AES.encrypt(data, key, { iv });

    return {
      iv: CryptoJS.enc.Base64.stringify(iv),
      salt: CryptoJS.enc.Base64.stringify(salt),
      encryptedData: encrypted.toString(),
    };
  } catch (error) {
    console.log("Encryption Error:", error);
    return null;
  }
};

export const decryptData = (payload, password) => {
  try {
    const { iv, salt, encryptedData } = payload;

    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Base64.parse(salt), {
      keySize: 256 / 32,
      iterations: 1000,
    });

    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      {
        iv: CryptoJS.enc.Base64.parse(iv),
      }
    );

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    console.log("DECRYPTED RAW:", decryptedText);

    return JSON.parse(decryptedText);
  } catch (error) {
    console.log("Decryption Error:", error);
    return null;
  }
};
