ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_session_version_non_negative CHECK (session_version >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
