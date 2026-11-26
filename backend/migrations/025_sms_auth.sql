ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone ON users(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS sms_auth_challenge (
 id uuid PRIMARY KEY, phone text NOT NULL, purpose text NOT NULL CHECK(purpose IN ('login','bind','reset','close')),
 user_id uuid REFERENCES users(id), device_id uuid REFERENCES devices(id), ip_hash text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','consumed','failed')),
 attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE INDEX IF NOT EXISTS sms_auth_phone_time ON sms_auth_challenge(phone,created_at DESC);
CREATE INDEX IF NOT EXISTS sms_auth_ip_time ON sms_auth_challenge(ip_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS sms_auth_time ON sms_auth_challenge(created_at);
