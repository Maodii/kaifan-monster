CREATE TABLE IF NOT EXISTS account_workspace (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 device_id uuid NOT NULL
);
