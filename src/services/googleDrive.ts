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

// Your Web Client ID from Google Cloud Console
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
  console.log('[GoogleDrive] Configuring Google Sign-In...');
  console.log('[GoogleDrive] Web Client ID:', WEB_CLIENT_ID);

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  console.log('[GoogleDrive] Google Sign-In configured successfully');
};

/**
 * Sign in with Google
 * @returns object containing access token and user email
 */
export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  console.log('[GoogleDrive] ===== SIGN IN FLOW START =====');
  console.log('[GoogleDrive] Step 1: Checking play services...');

  try {
    const hasPlayServices = await GoogleSignin.hasPlayServices();
    console.log('[GoogleDrive] Step 1: hasPlayServices result:', hasPlayServices);
  } catch (error: any) {
    console.log('[GoogleDrive] Step 1 ERROR: hasPlayServices failed:', error);
    console.log('[GoogleDrive] Error code:', error.code);
    console.log('[GoogleDrive] Error message:', error.message);
    throw error;
  }

  console.log('[GoogleDrive] Step 2: Attempting to sign in...');

  try {
    const userInfo = await GoogleSignin.signIn();
    console.log('[GoogleDrive] Step 2: Sign in successful!');
    console.log('[GoogleDrive] User email:', userInfo.user?.email);
  } catch (error: any) {
    console.log('[GoogleDrive] Step 2 ERROR: signIn failed!');
    console.log('[GoogleDrive] Error code:', error.code);
    console.log('[GoogleDrive] Error message:', error.message);
    console.log('[GoogleDrive] Full error:', error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in was cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available');
    } else {
      throw new Error('Sign in failed: ' + error.message);
    }
  }

  console.log('[GoogleDrive] Step 3: Getting tokens...');

  try {
    const tokens = await GoogleSignin.getTokens();
    console.log('[GoogleDrive] Step 3: Tokens received');
    console.log('[GoogleDrive] Access token:', tokens.accessToken ? 'present' : 'missing');
    console.log('[GoogleDrive] ===== SIGN IN FLOW SUCCESS =====');
    return {
      accessToken: tokens.accessToken,
      email: (await GoogleSignin.getCurrentUser())?.user?.email || ''
    };
  } catch (error: any) {
    console.log('[GoogleDrive] Step 3 ERROR: getTokens failed!');
    console.log('[GoogleDrive] Error:', error);
    console.log('[GoogleDrive] ===== SIGN IN FLOW FAILED =====');
    throw error;
  }
};

/**
 * Check if user is signed in
 */
export const isSignedIn = async (): Promise<boolean> => {
  try {
    const currentUser = await GoogleSignin.getCurrentUser();
    console.log('[GoogleDrive] isSignedIn - currentUser:', currentUser ? 'logged in' : 'not logged in');
    return currentUser !== null;
  } catch (error) {
    console.log('[GoogleDrive] isSignedIn error:', error);
    return false;
  }
};

/**
 * Get the app's backup folder ID, create if doesn't exist
 */
const getOrCreateBackupFolder = async (accessToken: string): Promise<string> => {
  console.log('[GoogleDrive] getOrCreateBackupFolder: Searching for existing folder...');

  // First try to find existing folder
  const searchResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=name%20%3D%20%22KeepNotesBackup%22%20and%20mimeType%20%3D%20%22application%2Fvnd.google-apps.folder%22',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const searchData = await searchResponse.json();
  console.log('[GoogleDrive] Folder search response:', JSON.stringify(searchData, null, 2));

  if (searchData.files && searchData.files.length > 0) {
    console.log('[GoogleDrive] Found existing folder, ID:', searchData.files[0].id);
    return searchData.files[0].id;
  }

  console.log('[GoogleDrive] No folder found, creating new one...');

  // Create folder if not found
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
  console.log('[GoogleDrive] Folder created, response:', JSON.stringify(createdFolder, null, 2));

  if (createdFolder.error) {
    console.log('[GoogleDrive] ERROR creating folder:', createdFolder.error);
    throw new Error('Failed to create backup folder: ' + createdFolder.error.message);
  }

  return createdFolder.id;
};

/**
 * Check if backup file exists
 */
const getExistingBackupFile = async (
  accessToken: string,
  folderId: string
): Promise<BackupFile | null> => {
  console.log('[GoogleDrive] getExistingBackupFile: Looking for notes_backup.enc in folder:', folderId);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=%22${folderId}%22%20in%20parents%20and%20name%20%3D%20%22notes_backup.enc%22`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  console.log('[GoogleDrive] Backup file search response:', JSON.stringify(data, null, 2));

  if (data.files && data.files.length > 0) {
    console.log('[GoogleDrive] Found existing backup file, ID:', data.files[0].id);
    return data.files[0];
  }

  console.log('[GoogleDrive] No existing backup file found');
  return null;
};

/**
 * Upload file to Google Drive
 */
const uploadFile = async (
  accessToken: string,
  folderId: string,
  content: string,
  existingFileId?: string
): Promise<string> => {
  console.log('[GoogleDrive] uploadFile: Starting upload...');
  console.log('[GoogleDrive] Upload to folder:', folderId);
  console.log('[GoogleDrive] Existing file ID:', existingFileId || 'none (creating new)');
  console.log('[GoogleDrive] Content length:', content.length, 'chars');

  const method = existingFileId ? 'PATCH' : 'POST';
  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media';

  console.log('[GoogleDrive] Upload method:', method);
  console.log('[GoogleDrive] Upload URL:', url);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });

  const data = await response.json();
  console.log('[GoogleDrive] Upload response status:', response.status);
  console.log('[GoogleDrive] Upload response:', JSON.stringify(data, null, 2));

  if (data.error) {
    console.log('[GoogleDrive] Upload ERROR:', data.error);
    throw new Error('Upload failed: ' + data.error.message);
  }

  console.log('[GoogleDrive] Upload SUCCESS, file ID:', data.id);
  return data.id;
};

/**
 * Download file from Google Drive
 */
const downloadFile = async (
  accessToken: string,
  fileId: string
): Promise<string> => {
  console.log('[GoogleDrive] downloadFile: Downloading file:', fileId);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status !== 200) {
    const errorText = await response.text();
    console.log('[GoogleDrive] Download ERROR: Non-200 status:', response.status);
    console.log('[GoogleDrive] Error response:', errorText.substring(0, 200));
    throw new Error('Download failed with status: ' + response.status);
  }

  const content = await response.text();
  console.log('[GoogleDrive] Downloaded content length:', content.length, 'chars');
  console.log('[GoogleDrive] Content preview:', content.substring(0, 100));

  return content;
};

/**
 * Get raw (encrypted) notes from database for backup
 */
const getRawNotes = async (): Promise<Note[]> => {
  console.log('[GoogleDrive] getRawNotes: Fetching all notes from database...');

  const SQLite = require('react-native-sqlite-storage');
  SQLite.enablePromise(true);

  const db = await SQLite.openDatabase({
    name: 'notes.db',
    location: 'default',
  });

  const [result] = await db.executeSql(
    'SELECT * FROM notes ORDER BY created_at DESC'
  );

  console.log('[GoogleDrive] Raw SQL result rows:', result.rows.length);

  const notes: Note[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    notes.push({
      id: row.id,
      title: row.title || '',
      content: row.content || '', // Keep encrypted content
      created_at: row.created_at,
    });
  }

  console.log('[GoogleDrive] Parsed notes count:', notes.length);
  if (notes.length > 0) {
    console.log('[GoogleDrive] First note title:', notes[0].title);
    console.log('[GoogleDrive] First note content length:', notes[0].content.length);
  }

  return notes;
};

/**
 * Add note directly to database (bypasses encryption for restore)
 */
const addNoteDirect = async (
  title: string,
  content: string,
  created_at: number
): Promise<void> => {
  console.log('[GoogleDrive] addNoteDirect: Adding note:', title);

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

  console.log('[GoogleDrive] addNoteDirect: Note added successfully');
};

/**
 * BACKUP: Save all notes to Google Drive
 * Uses user's Google email as encryption key (NO password needed)
 */
export const backupToGoogleDrive = async (): Promise<boolean> => {
  console.log('[GoogleDrive] ===== BACKUP FLOW START =====');

  try {
    // 1. Sign in and get access token + email
    console.log('[GoogleDrive] Step 1: Signing in to Google...');
    const {accessToken, email} = await signInWithGoogle();
    console.log('[GoogleDrive] Step 1: Got access token');
    console.log('[GoogleDrive] Step 1: User email:', email);

    // 2. Get raw (plain text) notes from database
    console.log('[GoogleDrive] Step 2: Fetching notes from database...');
    const notes = await getRawNotes();

    if (notes.length === 0) {
      console.log('[GoogleDrive] No notes to backup!');
      throw new Error('No notes to backup');
    }

    console.log('[GoogleDrive] Step 2: Got', notes.length, 'notes');

    // 3. Prepare notes data
    const notesData = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content, // Plain text from SQLite
      created_at: note.created_at,
    }));

    console.log('[GoogleDrive] Step 3: Notes data prepared');
    console.log('[GoogleDrive] JSON string length:', JSON.stringify(notesData).length);

    // 4. Encrypt the JSON with user's email as password
    console.log('[GoogleDrive] Step 4: Encrypting notes data with email:', email);
    const {encryptData} = require('../utils/crypto');
    const encryptedPayload = encryptData(notesData, email);
    if (!encryptedPayload) {
      throw new Error('Encryption failed');
    }
    const encryptedJson = JSON.stringify(encryptedPayload);
    console.log('[GoogleDrive] Step 4: Encryption complete');
    console.log('[GoogleDrive] Encrypted length:', encryptedJson.length);

    // 5. Get or create backup folder
    console.log('[GoogleDrive] Step 5: Getting backup folder...');
    const folderId = await getOrCreateBackupFolder(accessToken);

    // 6. Check if backup file already exists
    console.log('[GoogleDrive] Step 6: Checking for existing backup...');
    const existingFile = await getExistingBackupFile(accessToken, folderId);

    // 7. Upload the encrypted file
    console.log('[GoogleDrive] Step 7: Uploading encrypted file...');
    await uploadFile(accessToken, folderId, encryptedJson, existingFile?.id);

    console.log('[GoogleDrive] ===== BACKUP FLOW SUCCESS =====');
    return true;
  } catch (error) {
    console.log('[GoogleDrive] ===== BACKUP FLOW FAILED =====');
    console.log('[GoogleDrive] ERROR:', error);
    throw error;
  }
};

/**
 * RESTORE: Get notes from Google Drive
 * Uses user's Google email as encryption key (NO password needed)
 * @returns Array of restored notes
 */
export const restoreFromGoogleDrive = async (): Promise<{notes: Note[]; addNoteDirect: typeof addNoteDirect}> => {
  console.log('[GoogleDrive] ===== RESTORE FLOW START =====');

  try {
    // 1. Sign in and get access token + email
    console.log('[GoogleDrive] Step 1: Signing in to Google...');
    const {accessToken, email} = await signInWithGoogle();
    console.log('[GoogleDrive] Step 1: User email:', email);

    // 2. Get backup folder
    console.log('[GoogleDrive] Step 2: Getting backup folder...');
    const folderId = await getOrCreateBackupFolder(accessToken);

    // 3. Find backup file
    console.log('[GoogleDrive] Step 3: Looking for backup file...');
    const existingFile = await getExistingBackupFile(accessToken, folderId);

    if (!existingFile) {
      throw new Error('No backup found on Google Drive');
    }

    // 4. Download the encrypted file
    console.log('[GoogleDrive] Step 4: Downloading encrypted file...');
    const encryptedJson = await downloadFile(accessToken, existingFile.id!);
    console.log('[GoogleDrive] Step 4: Downloaded, length:', encryptedJson.length);

    // 5. Decrypt the JSON using same email as backup
    console.log('[GoogleDrive] Step 5: Decrypting with email:', email);
    const {decryptData} = require('../utils/crypto');
    const payload = JSON.parse(encryptedJson);
    const notesData = decryptData(payload, email);
    console.log('[GoogleDrive] Step 5: Decrypt complete');

    if (!notesData) {
      throw new Error('Decryption failed. Wrong account?');
    }

    // 6. Notes already parsed by decryptData
    console.log('[GoogleDrive] Step 6: Parsed', notesData.length, 'notes');

    console.log('[GoogleDrive] ===== RESTORE FLOW SUCCESS =====');
    return {notes: notesData, addNoteDirect};
  } catch (error) {
    console.log('[GoogleDrive] ===== RESTORE FLOW FAILED =====');
    console.log('[GoogleDrive] ERROR:', error);
    throw error;
  }
};
