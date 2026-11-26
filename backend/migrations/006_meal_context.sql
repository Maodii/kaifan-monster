CREATE TABLE IF NOT EXISTS recipe_source (
 url text PRIMARY KEY,platform text NOT NULL,author text NOT NULL DEFAULT '',facts jsonb NOT NULL CHECK(jsonb_typeof(facts)='object'),accessed_at date NOT NULL);
CREATE INDEX IF NOT EXISTS recipe_source_platform ON recipe_source(platform);
CREATE INDEX IF NOT EXISTS meals_calendar_day ON meal_records(user_id,((payload->>'date'))) WHERE NOT deleted;
