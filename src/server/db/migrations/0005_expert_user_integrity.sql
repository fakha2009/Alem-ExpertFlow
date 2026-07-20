CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS experts_user_id_unique
  ON experts(user_id);
