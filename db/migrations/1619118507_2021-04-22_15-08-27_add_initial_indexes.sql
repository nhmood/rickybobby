CREATE INDEX IF NOT EXISTS idx_users_username
  ON users (username);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id
  ON workouts (user_id);

CREATE INDEX IF NOT EXISTS idx_workouts_ride_id
  ON workouts (ride_id);

CREATE INDEX IF NOT EXISTS idx_following_user_id
  ON workouts (user_id);
