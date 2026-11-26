CREATE TABLE IF NOT EXISTS recipe_catalog (
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 region text NOT NULL, category text NOT NULL, taste text NOT NULL,
 minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 2880),
 source_revision text NOT NULL, payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS recipe_catalog_filters ON recipe_catalog(region,category,minutes);
CREATE INDEX IF NOT EXISTS recipe_catalog_name ON recipe_catalog(name);
CREATE INDEX IF NOT EXISTS recipe_catalog_payload ON recipe_catalog USING gin(payload jsonb_path_ops);
ALTER TABLE recommendation_events DROP CONSTRAINT IF EXISTS recommendation_events_action_check;
ALTER TABLE recommendation_events ADD CONSTRAINT recommendation_events_action_check CHECK(action IN ('open','select','skip','like','dislike'));
CREATE INDEX IF NOT EXISTS recommendation_owner_recent ON recommendation_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS meal_owner_time ON meal_records(user_id,modified_at DESC) WHERE NOT deleted;
CREATE TABLE IF NOT EXISTS user_taste_profile (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 algorithm_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 updated_at timestamptz NOT NULL DEFAULT now());
