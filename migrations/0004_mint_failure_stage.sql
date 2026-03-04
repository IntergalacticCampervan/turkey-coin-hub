-- Migration number: 0004    2026-03-04T00:00:00.000Z
ALTER TABLE mint_events ADD COLUMN failure_stage TEXT;
