ALTER TABLE object_deletion_jobs ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS object_jobs_ready ON object_deletion_jobs(available_at);
