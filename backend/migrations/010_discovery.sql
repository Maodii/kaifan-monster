CREATE TABLE IF NOT EXISTS discovery_favorite (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipe_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,recipe_id)
);
CREATE INDEX IF NOT EXISTS discovery_favorite_recipe_idx ON discovery_favorite(recipe_id);
CREATE TABLE IF NOT EXISTS discovery_search (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 term varchar(80) NOT NULL,
 searched_on date NOT NULL DEFAULT CURRENT_DATE,
 PRIMARY KEY(user_id,term,searched_on)
);
CREATE INDEX IF NOT EXISTS discovery_search_date_idx ON discovery_search(searched_on);
