ALTER TABLE recommendation_events ADD COLUMN intent text NOT NULL DEFAULT 'cook' CHECK(intent IN ('cook','record'));
CREATE INDEX recommendation_owner_intent_recent ON recommendation_events(user_id,intent,created_at DESC);
ALTER TABLE user_taste_profile ADD COLUMN intent text NOT NULL DEFAULT 'cook' CHECK(intent IN ('cook','record'));
ALTER TABLE user_taste_profile DROP CONSTRAINT user_taste_profile_pkey;
ALTER TABLE user_taste_profile ADD PRIMARY KEY(user_id,intent);
