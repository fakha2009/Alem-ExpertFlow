CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'expert', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expert_type AS ENUM ('expert', 'mentor', 'freelancer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('new', 'assigned', 'in_progress', 'review', 'done', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE skill_importance AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('recommended', 'assigned', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  full_name varchar(160) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name varchar(160) NOT NULL,
  type expert_type NOT NULL,
  bio text NOT NULL DEFAULT '',
  current_load integer NOT NULL DEFAULT 0,
  max_active_requests integer NOT NULL DEFAULT 5,
  rating numeric(3, 2) NOT NULL DEFAULT 4.50,
  is_available boolean NOT NULL DEFAULT true,
  response_time_hours integer NOT NULL DEFAULT 24,
  completed_requests_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experts_load_non_negative CHECK (current_load >= 0),
  CONSTRAINT experts_capacity_positive CHECK (max_active_requests > 0),
  CONSTRAINT experts_rating_range CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT experts_response_time_positive CHECK (response_time_hours > 0)
);

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  slug varchar(140) NOT NULL,
  category varchar(120) NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expert_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level integer NOT NULL,
  years_experience integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expert_skills_level_range CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT expert_skills_years_non_negative CHECK (years_experience >= 0)
);

CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id varchar(32) NOT NULL,
  title varchar(220) NOT NULL,
  description text NOT NULL,
  category varchar(120) NOT NULL,
  priority request_priority NOT NULL DEFAULT 'medium',
  status request_status NOT NULL DEFAULT 'new',
  deadline timestamptz,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_expert_id uuid REFERENCES experts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance skill_importance NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL REFERENCES experts(id) ON DELETE RESTRICT,
  assigned_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score integer NOT NULL,
  explanation text NOT NULL,
  status assignment_status NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignments_score_range CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS experts_user_id_idx ON experts(user_id);
CREATE INDEX IF NOT EXISTS experts_is_available_idx ON experts(is_available);
CREATE INDEX IF NOT EXISTS experts_rating_idx ON experts(rating);
CREATE INDEX IF NOT EXISTS experts_current_load_idx ON experts(current_load);
CREATE UNIQUE INDEX IF NOT EXISTS skills_slug_unique ON skills(slug);
CREATE INDEX IF NOT EXISTS expert_skills_expert_id_idx ON expert_skills(expert_id);
CREATE INDEX IF NOT EXISTS expert_skills_skill_id_idx ON expert_skills(skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS expert_skills_expert_skill_unique ON expert_skills(expert_id, skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS requests_public_id_unique ON requests(public_id);
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests(status);
CREATE INDEX IF NOT EXISTS requests_priority_idx ON requests(priority);
CREATE INDEX IF NOT EXISTS requests_assigned_expert_id_idx ON requests(assigned_expert_id);
CREATE INDEX IF NOT EXISTS requests_created_by_id_idx ON requests(created_by_id);
CREATE INDEX IF NOT EXISTS requests_deadline_idx ON requests(deadline);
CREATE INDEX IF NOT EXISTS requests_created_at_idx ON requests(created_at);
CREATE INDEX IF NOT EXISTS request_skills_request_id_idx ON request_skills(request_id);
CREATE INDEX IF NOT EXISTS request_skills_skill_id_idx ON request_skills(skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS request_skills_request_skill_unique ON request_skills(request_id, skill_id);
CREATE INDEX IF NOT EXISTS assignments_request_id_idx ON assignments(request_id);
CREATE INDEX IF NOT EXISTS assignments_expert_id_idx ON assignments(expert_id);
CREATE INDEX IF NOT EXISTS comments_request_id_idx ON comments(request_id);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
