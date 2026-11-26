ALTER TABLE users ADD COLUMN ai_daily_limit integer CHECK(ai_daily_limit BETWEEN 0 AND 100000);
