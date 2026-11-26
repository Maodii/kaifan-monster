ALTER TABLE telemetry_event ADD COLUMN platform varchar(12);
ALTER TABLE telemetry_event ADD COLUMN app_version varchar(40);
ALTER TABLE telemetry_event ADD COLUMN occurred_at timestamptz;
