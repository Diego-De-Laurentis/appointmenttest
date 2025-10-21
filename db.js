import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = process.env.DB_PATH || './data.sqlite';

export async function getDb() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_iso TEXT NOT NULL UNIQUE,
      end_iso TEXT NOT NULL,
      is_booked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      terms_accepted INTEGER NOT NULL,
      customer_confirmed INTEGER NOT NULL DEFAULT 0,
      provider_confirmed INTEGER NOT NULL DEFAULT 0,
      token_customer TEXT NOT NULL,
      token_provider TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(slot_id) REFERENCES slots(id)
    );
    CREATE INDEX IF NOT EXISTS idx_slots_avail ON slots(is_booked, start_iso);
  `);
  return db;
}
