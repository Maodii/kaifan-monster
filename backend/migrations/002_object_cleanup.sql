CREATE TABLE IF NOT EXISTS object_deletion_jobs(id uuid PRIMARY KEY,photo_id uuid NOT NULL,object_key text NOT NULL,attempts integer NOT NULL DEFAULT 0,last_error text,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS object_deletion_created ON object_deletion_jobs(created_at);
