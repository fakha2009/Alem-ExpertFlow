-- Alem ExpertFlow uses a server-side PostgreSQL connection exclusively. Keep the
-- application schema inaccessible through Supabase's anon/authenticated Data API
-- roles even when a project was created with legacy automatic grants enabled.
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expert_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS request_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS _alem_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  users,
  experts,
  skills,
  expert_skills,
  requests,
  request_skills,
  assignments,
  comments,
  activity_logs,
  auth_rate_limits,
  _alem_migrations
FROM PUBLIC;

DO $hardening$
DECLARE
  data_api_role text;
BEGIN
  FOREACH data_api_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = data_api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE users, experts, skills, expert_skills, requests, request_skills, assignments, comments, activity_logs, auth_rate_limits, _alem_migrations FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        data_api_role
      );
    END IF;
  END LOOP;
END
$hardening$;
