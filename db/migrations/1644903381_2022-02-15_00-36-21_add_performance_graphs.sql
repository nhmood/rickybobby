CREATE TABLE IF NOT EXISTS performance_graphs (
  workout_id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  data BLOB,

  user_id TEXT,
  ride_id TEXT
);
