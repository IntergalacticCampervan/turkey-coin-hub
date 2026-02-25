-- Migration number: 0002 \t 2026-02-25T00:00:00.000Z
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS balance_cache (
  wallet_address TEXT PRIMARY KEY,
  balance TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mint_events (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  mint_tx_hash TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  queued_at TEXT,
  submitted_at TEXT,
  confirmed_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,
  admin_subject TEXT
);
