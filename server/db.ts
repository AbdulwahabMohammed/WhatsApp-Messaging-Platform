import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'whatsapp.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'DISCONNECTED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'number', 'group', 'channel'
    target_id TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, type, target_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'text', 'media', 'document'
    content TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'PENDING',
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS message_logs (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
