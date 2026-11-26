CREATE TABLE admin_recipe_history (
 recipe_id uuid NOT NULL REFERENCES recipe_catalog(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK(version>0),
 actor_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK(action IN ('edit','revert')),
 reason varchar(300) NOT NULL,
 before_payload jsonb NOT NULL,
 after_payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(recipe_id,version)
);
CREATE INDEX admin_recipe_history_time ON admin_recipe_history(created_at DESC);
