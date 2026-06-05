import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('nhai_attendance.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      liveness_passed INTEGER NOT NULL DEFAULT 0,
      liveness_challenge TEXT,
      confidence REAL,
      sync_status INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_sync_attempt INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 5,
      created_at INTEGER NOT NULL,
      last_attempt INTEGER,
      error TEXT,
      FOREIGN KEY (record_id) REFERENCES attendance_records(id)
    );

    CREATE TABLE IF NOT EXISTS gps_log (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (record_id) REFERENCES attendance_records(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_sync_status ON attendance_records(sync_status);
    CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);
}

export async function insertAttendanceRecord(record: {
  id: string;
  user_id: string;
  user_name: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  liveness_passed: boolean;
  liveness_challenge: string;
  confidence: number;
}): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  await database.runAsync(
    `INSERT INTO attendance_records (id, user_id, user_name, timestamp, latitude, longitude, liveness_passed, liveness_challenge, confidence, sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      record.id,
      record.user_id,
      record.user_name,
      record.timestamp,
      record.latitude,
      record.longitude,
      record.liveness_passed ? 1 : 0,
      record.liveness_challenge,
      record.confidence,
      now,
      now,
    ]
  );
}

export async function getUnsyncedRecords(): Promise<any[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync(
    `SELECT * FROM attendance_records WHERE sync_status = 0 ORDER BY timestamp ASC`
  );
  return result;
}

export async function markRecordSynced(recordId: string): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  await database.runAsync(
    `UPDATE attendance_records SET sync_status = 1, last_sync_attempt = ?, updated_at = ? WHERE id = ?`,
    [now, now, recordId]
  );
}

export async function updateSyncAttempt(recordId: string, error?: string): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  if (error) {
    await database.runAsync(
      `UPDATE attendance_records SET retry_count = retry_count + 1, last_sync_attempt = ?, updated_at = ? WHERE id = ?`,
      [now, now, recordId]
    );
  } else {
    await database.runAsync(
      `UPDATE attendance_records SET last_sync_attempt = ?, updated_at = ? WHERE id = ?`,
      [now, now, recordId]
    );
  }
}

export async function purgeSyncedRecords(retentionDays: number = 30): Promise<number> {
  const database = await getDatabase();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const result = await database.runAsync(
    `DELETE FROM attendance_records WHERE sync_status = 1 AND timestamp < ?`,
    [cutoff]
  );
  return result.changes;
}

export async function getAttendanceHistory(
  userId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const database = await getDatabase();
  let query: string;
  let params: any[];
  if (userId) {
    query = `SELECT * FROM attendance_records WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params = [userId, limit, offset];
  } else {
    query = `SELECT * FROM attendance_records ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params = [limit, offset];
  }
  return await database.getAllAsync(query, params);
}

export async function getAttendanceStats(): Promise<{
  total: number;
  synced: number;
  pending: number;
}> {
  const database = await getDatabase();
  const total = (await database.getFirstAsync('SELECT COUNT(*) as count FROM attendance_records')) as any;
  const synced = (await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM attendance_records WHERE sync_status = 1'
  )) as any;
  const pending = (await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM attendance_records WHERE sync_status = 0'
  )) as any;
  return {
    total: total?.count ?? 0,
    synced: synced?.count ?? 0,
    pending: pending?.count ?? 0,
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  await database.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    [key, value, now]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const result = (await database.getFirstAsync(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  )) as any;
  return result?.value ?? null;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
