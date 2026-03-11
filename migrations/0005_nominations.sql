-- Migration number: 0005    2026-03-11T00:00:00.000Z
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

CREATE INDEX IF NOT EXISTS idx_nominations_status_created_at ON nominations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nominations_nominee_wallet ON nominations(nominee_wallet);
CREATE INDEX IF NOT EXISTS idx_nominations_nominator_wallet ON nominations(nominator_wallet);
