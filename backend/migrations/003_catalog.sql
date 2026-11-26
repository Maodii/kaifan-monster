CREATE TABLE IF NOT EXISTS catalog_submission(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),source_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('barcode','recipe')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz);
CREATE INDEX IF NOT EXISTS catalog_feed ON catalog_submission(kind,status,created_at DESC);
CREATE INDEX IF NOT EXISTS catalog_barcode ON catalog_submission((payload->>'barcode')) WHERE kind='barcode' AND status='approved';
