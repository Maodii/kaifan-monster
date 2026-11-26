CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users(
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
 role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), global_version bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS devices(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL, refresh_hash text, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS devices_owner ON devices(user_id);
CREATE TABLE IF NOT EXISTS family_group(id uuid PRIMARY KEY,name text NOT NULL, owner_id uuid NOT NULL REFERENCES users(id),invite_code text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS family_member(family_id uuid NOT NULL REFERENCES family_group(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,role text NOT NULL CHECK(role IN ('admin','member')),PRIMARY KEY(family_id,user_id));
CREATE TABLE IF NOT EXISTS food_change_logs(
 id bigserial PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 entity_type text NOT NULL, entity_id uuid NOT NULL, operation text NOT NULL CHECK(operation IN ('upsert','delete')),
 version bigint NOT NULL, base_version bigint NOT NULL, device_id uuid NOT NULL REFERENCES devices(id),
 modified_at timestamptz NOT NULL, payload jsonb NOT NULL, change_id uuid NOT NULL,
 UNIQUE(user_id,version), UNIQUE(user_id,change_id));
CREATE INDEX IF NOT EXISTS change_pull ON food_change_logs(user_id,version);
-- 每个可同步实体保留所有者、家庭范围、版本、软删除和 UTC 时间。
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['food_items','barcode_lib','shopping_list','recipes','recipe_favorites','meal_records'] LOOP
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),family_id uuid REFERENCES family_group(id) ON DELETE SET NULL,payload jsonb NOT NULL DEFAULT ''{}'',version bigint NOT NULL DEFAULT 0,device_id uuid NOT NULL REFERENCES devices(id),modified_at timestamptz NOT NULL DEFAULT now(),deleted boolean NOT NULL DEFAULT false)',t);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(user_id,modified_at)', t||'_owner_modified',t);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(family_id) WHERE family_id IS NOT NULL',t||'_family',t);
 END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS food_expiry ON food_items((payload->>'expiryDate')) WHERE NOT deleted;
CREATE INDEX IF NOT EXISTS barcode_code ON barcode_lib((payload->>'barcode')) WHERE NOT deleted;
CREATE TABLE IF NOT EXISTS recipe_ingredients(id uuid PRIMARY KEY,recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,name text NOT NULL,quantity numeric NOT NULL CHECK(quantity>0),unit text NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_steps(id uuid PRIMARY KEY,recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,position integer NOT NULL,text text NOT NULL,image_url text,UNIQUE(recipe_id,position));
CREATE TABLE IF NOT EXISTS meal_record_item(id uuid PRIMARY KEY,meal_id uuid NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,recipe_id uuid REFERENCES recipes(id),name text NOT NULL,estimated_cost numeric CHECK(estimated_cost>=0));
CREATE TABLE IF NOT EXISTS meal_photo(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),meal_id uuid REFERENCES meal_records(id) ON DELETE CASCADE,object_key text NOT NULL UNIQUE,url text NOT NULL,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS social_post(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),family_id uuid REFERENCES family_group(id),source_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('meal','recipe')),visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','family','public')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),show_price boolean NOT NULL DEFAULT false,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS post_feed ON social_post(visibility,status,created_at DESC);
CREATE TABLE IF NOT EXISTS social_like(post_id uuid NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(post_id,user_id));
CREATE TABLE IF NOT EXISTS social_comment(id uuid PRIMARY KEY,post_id uuid NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id),parent_id uuid REFERENCES social_comment(id),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reports(id uuid PRIMARY KEY,post_id uuid NOT NULL REFERENCES social_post(id),user_id uuid NOT NULL REFERENCES users(id),reason text NOT NULL,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS user_backup(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),version bigint NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS recommendation_events(id bigserial PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),recipe_id text NOT NULL,action text NOT NULL CHECK(action IN ('open','select','skip')),created_at timestamptz NOT NULL DEFAULT now());
