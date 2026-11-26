CREATE TABLE IF NOT EXISTS recipe_corrections (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipe_id uuid NOT NULL REFERENCES recipe_catalog(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN ('做法','用量','时间','来源','其他')),
 detail text NOT NULL CHECK(length(detail) BETWEEN 2 AND 1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
 resolution text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corrections_queue ON recipe_corrections(status,created_at DESC);
