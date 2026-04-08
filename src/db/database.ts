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
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      created_at INTEGER
    )
  `);

  console.log('DB: Table created successfully');
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
  console.log('  SQL: INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)');
  console.log('  Params: [', title, ', ', content.substring(0, 50) + '...', ', ', created_at, ']');

  let result: SQLite.ResultSet;
  try {
    result = await db.executeSql(
      'INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)',
      [title, content, created_at]
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
  const [result] = await db.executeSql(
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

  // Store plain text (no encryption for local DB)
  await db.executeSql(
    'UPDATE notes SET title = ?, content = ? WHERE id = ?',
    [title, content, id]
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
  await db.executeSql('DELETE FROM notes WHERE id = ?', [id]);

  console.log('DB: Note deleted, id:', id);
};
