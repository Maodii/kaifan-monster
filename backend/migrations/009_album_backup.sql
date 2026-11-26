CREATE TABLE album_backup_consent (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 notice_version text NOT NULL CHECK(notice_version='album-backup-v1'),
 created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE INDEX album_consent_owner ON album_backup_consent(user_id);
CREATE TABLE album_backup_photo (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 consent_id uuid NOT NULL REFERENCES album_backup_consent(id),
 content_hash text NOT NULL, object_key text NOT NULL UNIQUE,
 content_type text NOT NULL, byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=52428800),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,content_hash)
);
