CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key varchar(64) PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  CONSTRAINT auth_rate_limits_count_non_negative CHECK (count >= 0)
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_reset_at_idx
  ON auth_rate_limits(reset_at);
