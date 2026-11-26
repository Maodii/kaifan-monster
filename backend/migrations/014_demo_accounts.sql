-- Explicit provenance for local showcase accounts; ordinary accounts remain unmarked.
ALTER TABLE users ADD COLUMN demo_seed_batch text;
CREATE INDEX users_demo_seed_batch ON users(demo_seed_batch) WHERE demo_seed_batch IS NOT NULL;
