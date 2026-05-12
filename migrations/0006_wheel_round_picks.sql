-- Migration number: 0006    2026-05-12T00:00:00.000Z
CREATE TABLE IF NOT EXISTS wheel_round_picks (
  wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address),
  picked_at TEXT NOT NULL
);
