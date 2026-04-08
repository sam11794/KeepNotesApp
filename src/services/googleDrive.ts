/**
 * Google Drive Service
 * Handles backup and restore of encrypted notes to Google Drive
 */

import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';

// Note interface for backup data
interface Note {
  id: number;
  title: string;
  content: string;
  created_at: number;
}

// Your Web Client ID
const WEB_CLIENT_ID = '422303068676-n31hv7edci6tubd3nqju0f9clsq9su5e.apps.googleusercontent.com';

interface BackupFile {
  id?: string;
  name: string;
  mimeType: string;
}

interface GoogleSignInResult {
  accessToken: string;
  email: string;
}

/**
 * Initialize Google Sign-In
 */
export const initGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  await GoogleSignin.hasPlayServices();

  const userInfo = await GoogleSignin.signIn();
  const tokens = await GoogleSignin.getTokens();

  return {
    accessToken: tokens.accessToken,
    email: userInfo.user?.email || '',
  };
};

/**
 * Get or create backup folder
 */
const getOrCreateBackupFolder = async (accessToken: string): Promise<string> => {
  const searchResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=name%20%3D%20%22KeepNotesBackup%22%20and%20mimeType%20%3D%20%22application%2Fvnd.google-apps.folder%22',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'KeepNotesBackup',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  const createdFolder = await createResponse.json();
  return createdFolder.id;
};

/**
 * Get latest backup file (FIXED)
 */
const getLatestBackupFile = async (
  accessToken: string,
  folderId: string
): Promise<BackupFile | null> => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains 'notes_backup_'&orderBy=createdTime desc&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (data.files && data.files.length > 0) {
    return data.files[0];
  }

  return null;
};

/**
 * Upload file (MULTIPART + EPOCH)
 */
const uploadFile = async (
  accessToken: string,
  folderId: string,
  content: string
): Promise<string> => {
  const boundary = 'foo_bar_baz';

  const fileName = `notes_backup_${Date.now()}.enc`;

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const multipartRequestBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    content +
    `\r\n--${boundary}--`;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || 'Upload failed');
  }

  return data.id;
};

/**
 * Download file
 */
const downloadFile = async (
  accessToken: string,
  fileId: string
): Promise<string> => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return await response.text();
};

/**
 * Get notes from SQLite
 */
const getRawNotes = async (): Promise<Note[]> => {
  const SQLite = require('react-native-sqlite-storage');
  SQLite.enablePromise(true);

  const db = await SQLite.openDatabase({
    name: 'notes.db',
    location: 'default',
  });

  const [result] = await db.executeSql(
    'SELECT * FROM notes ORDER BY created_at DESC'
  );

  const notes: Note[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    notes.push(row);
  }

  return notes;
};

/**
 * Insert note directly
 */
const addNoteDirect = async (
  title: string,
  content: string,
  created_at: number
): Promise<void> => {
  const SQLite = require('react-native-sqlite-storage');
  SQLite.enablePromise(true);

  const db = await SQLite.openDatabase({
    name: 'notes.db',
    location: 'default',
  });

  await db.executeSql(
    'INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)',
    [title, content, created_at]
  );
};

/**
 * BACKUP
 */
export const backupToGoogleDrive = async (): Promise<boolean> => {
  const {accessToken, email} = await signInWithGoogle();

  const notes = await getRawNotes();
  if (notes.length === 0) throw new Error('No notes');

  const {encryptData} = require('../utils/crypto');
  const encrypted = encryptData(notes, email);

  const folderId = await getOrCreateBackupFolder(accessToken);

  await uploadFile(accessToken, folderId, JSON.stringify(encrypted));

  return true;
};

/**
 * RESTORE
 */
export const restoreFromGoogleDrive = async (): Promise<{
  notes: Note[];
  addNoteDirect: typeof addNoteDirect;
}> => {
  const {accessToken, email} = await signInWithGoogle();

  const folderId = await getOrCreateBackupFolder(accessToken);

  const file = await getLatestBackupFile(accessToken, folderId);

  if (!file) throw new Error('No backup found');

  const encryptedJson = await downloadFile(accessToken, file.id!);

  const {decryptData} = require('../utils/crypto');

  const notes = decryptData(JSON.parse(encryptedJson), email);

  if (!notes) throw new Error('Decryption failed');

  return {notes, addNoteDirect};
};