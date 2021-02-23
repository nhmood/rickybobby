CREATE TABLE IF NOT EXISTS sessions (
  username TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  data BLOB
);


CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  data BLOB
);


CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  data BLOB
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  data BLOG,


  user_id STRING,
  ride_id STRING
);
