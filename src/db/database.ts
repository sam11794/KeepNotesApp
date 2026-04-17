import SQLite from 'react-native-sqlite-storage';

// NOTE: Local DB stores PLAIN TEXT (no encryption)
// Encryption is only for Google Drive backup/restore

// Enable promises for easier async/await usage
SQLite.enablePromise(true);

// Database connection reference
let db: SQLite.SQLiteDatabase | null = null;

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

// ==================== FD INTERFACES ====================
export interface FD {
  id: number;
  person_name: string;
  bank_name: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: number;
  maturity_date: number;
  maturity_amount: number;
  created_at: number;
}

export interface FDInput {
  person_name: string;
  bank_name: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: number;
  maturity_date: number;
  maturity_amount: number;
}

/**
 * Initialize the SQLite database
 * Creates the 'notes.db' database and 'notes' table if they don't exist
 */
export const initDB = async (): Promise<void> => {
  // If database is already open, don't re-open
  if (db) {
    console.log('DB: Already initialized');
    return;
  }

  console.log('DB: Opening database...');

  // Open/create database named 'notes.db'
  db = await SQLite.openDatabase({
    name: 'notes.db',
    location: 'default',
  });

  console.log('DB: Database opened, creating table...');

  // Create the notes table with:
  // - id: auto-incrementing primary key
  // - title: text for note title (can be empty)
  // - content: text for note content (ENCRYPTED before storing)
  // - created_at: timestamp when note was created
  // - updated_at: timestamp when note was last edited
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  // Add updated_at column if it doesn't exist (for existing databases)
  try {
    await db.executeSql('ALTER TABLE notes ADD COLUMN updated_at INTEGER');
  } catch (e) {
    // Column may already exist, ignore error
  }

  // Create fds table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS fds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_name TEXT,
      bank_name TEXT,
      fd_number TEXT,
      principal_amount REAL,
      interest_rate REAL,
      start_date INTEGER,
      maturity_date INTEGER,
      maturity_amount REAL,
      created_at INTEGER
    )
  `);

  console.log('DB: Tables created successfully');
};

/**
 * Add a new note to the database
 *
 * FLOW:
 * 1. User enters plain text (title and content)
 * 2. Content is stored as PLAIN TEXT in SQLite
 * 3. No local encryption (only Google Drive backup is encrypted)
 *
 * Returns the id of the newly inserted note
 */
export const addNote = async (title: string, content: string): Promise<number> => {
  // ============================================================
  // STEP 0: Ensure database is initialized
  // ============================================================
  console.log('=== ADD NOTE DEBUG START ===');
  console.log('STEP 0: Checking database initialization...');

  if (!db) {
    console.log('STEP 0: DB is null, calling initDB()...');
    try {
      await initDB();
      console.log('STEP 0: initDB() completed');
    } catch (initError) {
      console.error('STEP 0: initDB() FAILED:', initError);
      throw initError;
    }
  } else {
    console.log('STEP 0: DB is already initialized');
  }

  // ============================================================
  // STEP 1: Validate inputs
  // ============================================================
  console.log('STEP 1: Validating inputs...');
  console.log('  title:', title);
  console.log('  content:', content);

  if (content === undefined || content === null) {
    console.error('STEP 1: FAIL - content is null or undefined');
    throw new Error('Content cannot be null or undefined');
  }

  // ============================================================
  // STEP 2: Prepare timestamp
  // ============================================================
  console.log('STEP 2: Preparing timestamp...');
  const created_at = Math.floor(Date.now() / 1000);
  const updated_at = created_at;
  console.log('  created_at:', created_at);

  // ============================================================
  // STEP 3: Store PLAIN TEXT (no encryption for local DB)
  // ============================================================
  console.log('STEP 3: Storing plain text...');
  console.log('  content:', JSON.stringify(content));

  // ============================================================
  // STEP 4: Insert into database
  // ============================================================
  console.log('STEP 4: Inserting into database...');
  console.log('  SQL: INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)');
  console.log('  Params: [', title, ', ', content.substring(0, 50) + '...', ', ', created_at, ', ', updated_at, ']');

  let result: SQLite.ResultSet;
  try {
    [result] = await db!.executeSql(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [title, content, created_at, updated_at]
    );
    console.log('STEP 4: DB INSERT SUCCESS');
    console.log('  result.insertId:', result.insertId);
    console.log('  result.rowsAffected:', result.rowsAffected);
  } catch (dbError) {
    console.error('STEP 4: DB INSERT FAILED');
    console.error('  DB Error full:', dbError);
    console.error('  DB Error message:', (dbError as Error).message);
    console.error('  DB Error stack:', (dbError as Error).stack);
    throw dbError;
  }

  // ============================================================
  // STEP 5: Return result
  // ============================================================
  console.log('STEP 5: Returning result...');
  console.log('=== ADD NOTE DEBUG END ===');
  return result.insertId;
};

/**
 * Get all notes from the database
 *
 * FLOW:
 * 1. Fetch notes from SQLite (stored as plain text)
 * 2. Return notes as-is to display in UI
 *
 * Returns notes ordered by created_at descending (newest first)
 */
export const fetchNotes = async (): Promise<Note[]> => {
  // Ensure database is initialized
  if (!db) {
    console.log('DB: initDB called from fetchNotes');
    await initDB();
  }

  // Select all notes from database
  const [result] = await db!.executeSql(
    'SELECT * FROM notes ORDER BY created_at DESC'
  );

  // Convert SQL result to array of Note objects
  const notes: Note[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    // Create a NEW note object (don't mutate the original row)
    // Content is stored as plain text, return as-is
    const note: Note = {
      id: row.id,
      title: row.title || '',
      content: row.content || '',
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    };
    notes.push(note);
  }

  console.log('DB: Fetched', notes.length, 'notes');
  return notes;
};

/**
 * Update an existing note
 *
 * FLOW:
 * 1. User edits note with new content
 * 2. New content is stored as PLAIN TEXT
 *
 * Updates title and content for the note with the given id
 */
export const updateNote = async (
  id: number,
  title: string,
  content: string
): Promise<void> => {
  // Ensure database is initialized
  if (!db) {
    console.log('DB: initDB called from updateNote');
    await initDB();
  }

  const updated_at = Math.floor(Date.now() / 1000);

  // Store plain text (no encryption for local DB)
  await db!.executeSql(
    'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    [title, content, updated_at, id]
  );

  console.log('DB: Note updated, id:', id);
};

/**
 * Delete a note from the database
 * Removes the note with the given id
 */
export const deleteNote = async (id: number): Promise<void> => {
  // Ensure database is initialized
  if (!db) {
    console.log('DB: initDB called from deleteNote');
    await initDB();
  }

  // Delete the note with the matching id
  await db!.executeSql('DELETE FROM notes WHERE id = ?', [id]);

  console.log('DB: Note deleted, id:', id);
};

// ==================== FD FUNCTIONS ====================

export const getAllFDs = async (): Promise<FD[]> => {
  if (!db) {
    await initDB();
  }

  const [result] = await db!.executeSql('SELECT * FROM fds ORDER BY maturity_date ASC');

  const fds: FD[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    fds.push({
      id: row.id,
      person_name: row.person_name || '',
      bank_name: row.bank_name || '',
      fd_number: row.fd_number || '',
      principal_amount: row.principal_amount || 0,
      interest_rate: row.interest_rate || 0,
      start_date: row.start_date || 0,
      maturity_date: row.maturity_date || 0,
      maturity_amount: row.maturity_amount || 0,
      created_at: row.created_at || 0,
    });
  }

  console.log('DB: Fetched', fds.length, 'FDs');
  return fds;
};

export const addFD = async (fd: FDInput): Promise<number> => {
  if (!db) {
    await initDB();
  }

  const created_at = Math.floor(Date.now() / 1000);

  const [result] = await db!.executeSql(
    `INSERT INTO fds (person_name, bank_name, fd_number, principal_amount, interest_rate, start_date, maturity_date, maturity_amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fd.person_name, fd.bank_name, fd.fd_number, fd.principal_amount, fd.interest_rate, fd.start_date, fd.maturity_date, fd.maturity_amount, created_at]
  );

  console.log('DB: FD added, id:', result.insertId);
  return result.insertId;
};

export const updateFD = async (id: number, fd: FDInput): Promise<void> => {
  if (!db) {
    await initDB();
  }

  await db!.executeSql(
    `UPDATE fds SET person_name = ?, bank_name = ?, fd_number = ?, principal_amount = ?, interest_rate = ?, start_date = ?, maturity_date = ?, maturity_amount = ? WHERE id = ?`,
    [fd.person_name, fd.bank_name, fd.fd_number, fd.principal_amount, fd.interest_rate, fd.start_date, fd.maturity_date, fd.maturity_amount, id]
  );

  console.log('DB: FD updated, id:', id);
};

export const deleteFD = async (id: number): Promise<void> => {
  if (!db) {
    await initDB();
  }

  await db!.executeSql('DELETE FROM fds WHERE id = ?', [id]);
  console.log('DB: FD deleted, id:', id);
};
