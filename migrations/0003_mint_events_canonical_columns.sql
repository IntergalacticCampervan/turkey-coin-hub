-- Migration number: 0003 \t 2026-02-25T00:30:00.000Z
ALTER TABLE mint_events ADD COLUMN to_wallet TEXT;
ALTER TABLE mint_events ADD COLUMN amount_raw TEXT;
ALTER TABLE mint_events ADD COLUMN chain_id INTEGER;
ALTER TABLE mint_events ADD COLUMN tx_hash TEXT;
ALTER TABLE mint_events ADD COLUMN requested_by_sub TEXT;
ALTER TABLE mint_events ADD COLUMN requested_by_email TEXT;

UPDATE mint_events
SET
  to_wallet = COALESCE(to_wallet, wallet_address),
  amount_raw = COALESCE(amount_raw, CAST(amount AS TEXT)),
  chain_id = COALESCE(chain_id, 11155111),
  tx_hash = COALESCE(tx_hash, mint_tx_hash),
  requested_by_sub = COALESCE(requested_by_sub, admin_subject)
WHERE 1 = 1;
