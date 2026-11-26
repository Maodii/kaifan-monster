CREATE TABLE admin_audit (
 id uuid PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES users(id),
 device_id uuid NOT NULL,
 action text NOT NULL,
 target_type text NOT NULL,
 target_id text NOT NULL,
 reason varchar(300) NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_time ON admin_audit(created_at DESC,id);
CREATE TABLE admin_recipe_override (
 recipe_id uuid PRIMARY KEY REFERENCES recipe_catalog(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK(version>0),
 updated_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
