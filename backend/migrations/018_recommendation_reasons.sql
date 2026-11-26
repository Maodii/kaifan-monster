ALTER TABLE recommendation_events DROP CONSTRAINT IF EXISTS recommendation_events_action_check;
ALTER TABLE recommendation_events ADD CONSTRAINT recommendation_events_action_check CHECK(action IN ('open','select','skip','like','dislike','recently_eaten','too_complex','not_my_taste'));
