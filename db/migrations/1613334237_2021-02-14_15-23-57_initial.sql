CREATE TABLE IF NOT EXISTS sessions (
  username TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  data BLOB
);


CREATE TABLE IF NOT EXISTS api_data (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  target TEXT,
  target_id TEXT,

  data BLOB
);


CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  tracked INTEGER,

  image_url TEXT,
  location TEXT,
  cycling_workout_count INTEGER,
  noncycling_workout_count INTEGER,
  streaks TEXT
);


CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  data BLOB
);


CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  data BLOB
);


CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  fitness_discipline TEXT,
  data BLOB,
  performance BLOB,


  user_id TEXT,
  ride_id TEXT
);
