-- Migration number: 0007    2026-05-13T00:00:00.000Z
CREATE TABLE IF NOT EXISTS shop_items (
  id          TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  description TEXT    NOT NULL,
  cost        TEXT    NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS redemption_events (
  id             TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  item_id        TEXT NOT NULL REFERENCES shop_items(id),
  item_label     TEXT NOT NULL,
  cost           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  admin_note     TEXT,
  created_at     TEXT NOT NULL,
  fulfilled_at   TEXT,
  cancelled_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_redemption_events_wallet ON redemption_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_redemption_events_status ON redemption_events(status, created_at);
