-- Snapshot schema for reference. Canonical source of truth is migrations/.
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
  to_wallet TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  tx_hash TEXT,
  requested_by_sub TEXT,
  requested_by_email TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  confirmed_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,

  -- Legacy compatibility columns retained during migration period.
  wallet_address TEXT,
  amount INTEGER,
  reason TEXT,
  mint_tx_hash TEXT,
  updated_at TEXT,
  queued_at TEXT,
  admin_subject TEXT
);

CREATE TABLE IF NOT EXISTS nominations (
  id TEXT PRIMARY KEY,
  nominee_wallet TEXT NOT NULL,
  nominator_wallet TEXT NOT NULL,
  seconder_wallet TEXT,
  reward_id TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  mint_event_id TEXT,
  created_at TEXT NOT NULL,
  seconded_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  failure_reason TEXT
);
