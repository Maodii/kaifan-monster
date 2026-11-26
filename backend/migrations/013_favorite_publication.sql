-- Public counts are an explicitly published projection, not an implicit import of private sync history.
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_favorite_version bigint NOT NULL DEFAULT 0 CHECK(discovery_favorite_version>=0);
