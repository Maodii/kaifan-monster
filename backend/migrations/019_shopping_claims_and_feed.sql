-- Claims are collaboration metadata, deliberately separate from offline editable shopping payloads.
CREATE TABLE shopping_claim (
 shopping_id uuid PRIMARY KEY REFERENCES shopping_list(id) ON DELETE CASCADE,
 family_id uuid NOT NULL REFERENCES family_group(id) ON DELETE CASCADE,
 claimant_id uuid NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(family_id,claimant_id) REFERENCES family_member(family_id,user_id) ON DELETE CASCADE
);
CREATE INDEX shopping_claim_family ON shopping_claim(family_id,claimed_at DESC);
CREATE FUNCTION clear_completed_shopping_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted OR NEW.payload->'purchased'='true'::jsonb THEN
  DELETE FROM shopping_claim WHERE shopping_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER shopping_claim_completed AFTER UPDATE OF payload,deleted ON shopping_list FOR EACH ROW EXECUTE FUNCTION clear_completed_shopping_claim();
CREATE INDEX social_post_cursor_feed ON social_post(visibility,status,created_at DESC,id DESC);
CREATE INDEX social_post_author_cursor ON social_post(user_id,created_at DESC,id DESC);
