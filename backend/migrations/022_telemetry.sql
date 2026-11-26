-- Operational measurements contain no request bodies, query strings, IPs or chat text.
CREATE TABLE telemetry_event (
 id uuid PRIMARY KEY,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 is_test boolean NOT NULL DEFAULT false,
 event_name varchar(40) NOT NULL,
 route varchar(160) NOT NULL,
 status integer NOT NULL,
 duration_ms integer NOT NULL,
 first_token_ms integer,
 task varchar(16),
 outcome varchar(32),
 code varchar(40),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX telemetry_event_time ON telemetry_event(created_at DESC);
CREATE INDEX telemetry_event_user ON telemetry_event(user_id,created_at DESC);
CREATE TABLE telemetry_feedback (
 event_id uuid PRIMARY KEY REFERENCES telemetry_event(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 vote varchar(8) NOT NULL CHECK(vote IN ('up','down')),
 reason varchar(24) NOT NULL CHECK(reason IN ('helpful','inaccurate','too_slow','irrelevant','other')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
