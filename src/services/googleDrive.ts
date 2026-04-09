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
  console.log('[GoogleDrive] signInWithGoogle: Starting...');

  try {
    console.log('[GoogleDrive] signInWithGoogle: Checking play services...');
    await GoogleSignin.hasPlayServices();
    console.log('[GoogleDrive] signInWithGoogle: Play services available');

    console.log('[GoogleDrive] signInWithGoogle: Signing in...');
    const userInfo = await GoogleSignin.signIn();
    console.log('[GoogleDrive] signInWithGoogle: User signed in, email:', (userInfo as any).user?.email);

    console.log('[GoogleDrive] signInWithGoogle: Getting tokens...');
    const tokens = await GoogleSignin.getTokens();
    console.log('[GoogleDrive] signInWithGoogle: Tokens received, accessToken present:', !!tokens.accessToken);

    if (!tokens.accessToken) {
      throw new Error('No access token received from Google');
    }

    return {
      accessToken: tokens.accessToken,
      email: (userInfo as any).user?.email || '',
    };
  } catch (error: any) {
    console.log('[GoogleDrive] signInWithGoogle: ERROR:', JSON.stringify(error));
    console.log('[GoogleDrive] signInWithGoogle: ERROR message:', error.message);
    console.log('[GoogleDrive] signInWithGoogle: ERROR code:', error.code);
    console.log('[GoogleDrive] signInWithGoogle: ERROR stack:', error.stack);
    console.log('[GoogleDrive] signInWithGoogle: ERROR toString:', error.toString());

    // Provide more helpful error messages
    if (error.code === -1 || error.code === 'NETWORK_ERROR' || error.message?.includes('NETWORK_ERROR')) {
      console.log('[GoogleDrive] signInWithGoogle: Network error detected');
      throw new Error('NETWORK_ERROR: Check your internet connection and Google Play Services');
    }

    throw error;
  }
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
 * Download file with retry
 */
const downloadFile = async (
  accessToken: string,
  fileId: string
): Promise<string> => {
  console.log('[GoogleDrive] downloadFile: Downloading file:', fileId);
  console.log('[GoogleDrive] downloadFile: Access token present:', !!accessToken);

  let lastError: Error | null = null;

  // Retry up to 2 times on network errors
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log('[GoogleDrive] downloadFile: Attempt', attempt);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log('[GoogleDrive] downloadFile: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[GoogleDrive] downloadFile: Error response:', errorText.substring(0, 300));
        throw new Error('Download failed with status: ' + response.status + ' - ' + errorText.substring(0, 100));
      }

      const content = await response.text();
      console.log('[GoogleDrive] downloadFile: Downloaded length:', content.length);
      return content;
    } catch (error: any) {
      console.log('[GoogleDrive] downloadFile: Attempt', attempt, 'failed:', error.message);
      lastError = error;

      // Only retry on network errors, not on HTTP errors
      if (error.message.includes('status:') || !error.message.includes('network')) {
        throw error;
      }

      // Wait before retry
      if (attempt < 2) {
        console.log('[GoogleDrive] downloadFile: Waiting before retry...');
        await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));
      }
    }
  }

  throw lastError || new Error('Download failed after retries');
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
  console.log('[GoogleDrive] ===== BACKUP FLOW START =====');

  try {
    console.log('[GoogleDrive] Step 1: Signing in to Google...');
    const {accessToken, email} = await signInWithGoogle();
    console.log('[GoogleDrive] Step 1: Got access token, email:', email);

    console.log('[GoogleDrive] Step 2: Fetching notes from database...');
    const notes = await getRawNotes();
    console.log('[GoogleDrive] Step 2: Got', notes.length, 'notes');
    if (notes.length === 0) throw new Error('No notes');

    console.log('[GoogleDrive] Step 3: Encrypting notes...');
    const {encryptData} = require('../utils/crypto');
    const encrypted = encryptData(notes, email);
    console.log('[GoogleDrive] Step 3: Encryption complete');

    console.log('[GoogleDrive] Step 4: Getting/creating backup folder...');
    const folderId = await getOrCreateBackupFolder(accessToken);
    console.log('[GoogleDrive] Step 4: Folder ID:', folderId);

    console.log('[GoogleDrive] Step 5: Uploading file...');
    await uploadFile(accessToken, folderId, JSON.stringify(encrypted));
    console.log('[GoogleDrive] Step 5: Upload complete');

    console.log('[GoogleDrive] ===== BACKUP FLOW SUCCESS =====');
    return true;
  } catch (error: any) {
    console.log('[GoogleDrive] ===== BACKUP FLOW FAILED =====');
    console.log('[GoogleDrive] ERROR:', error.message);
    console.log('[GoogleDrive] ERROR stack:', error.stack);
    throw error;
  }
};

/**
 * RESTORE
 */
export const restoreFromGoogleDrive = async (): Promise<{
  notes: Note[];
  addNoteDirect: typeof addNoteDirect;
}> => {
  console.log('[GoogleDrive] ===== RESTORE FLOW START =====');

  const {accessToken, email} = await signInWithGoogle();
  console.log('[GoogleDrive] restore: Got access token and email:', email);

  const folderId = await getOrCreateBackupFolder(accessToken);
  console.log('[GoogleDrive] restore: Got folderId:', folderId);

  const file = await getLatestBackupFile(accessToken, folderId);
  console.log('[GoogleDrive] restore: Got file:', file);

  if (!file) throw new Error('No backup found');

  console.log('[GoogleDrive] restore: Found file:', file.name, 'ID:', file.id);

  if (!file.id) throw new Error('Backup file has no ID');

  const encryptedJson = await downloadFile(accessToken, file.id);
  console.log('[GoogleDrive] restore: Downloaded JSON length:', encryptedJson?.length);

  const {decryptData} = require('../utils/crypto');

  const notes = decryptData(JSON.parse(encryptedJson), email);

  if (!notes) throw new Error('Decryption failed');

  console.log('[GoogleDrive] ===== RESTORE FLOW SUCCESS =====');
  return {notes, addNoteDirect};
};