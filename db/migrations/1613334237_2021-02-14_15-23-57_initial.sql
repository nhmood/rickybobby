CREATE TABLE IF NOT EXISTS sessions (
  username    TEXT PRIMARY KEY,
  created_at  INTEGER,
  updated_at  INTEGER,

  data BLOB
);


CREATE TABLE IF NOT EXISTS datalogs (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER,
  updated_at  INTEGER,

  target    TEXT,
  target_id TEXT,

  data BLOB
);


CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER,
  updated_at  INTEGER,

  username    TEXT,
  tracked     INTEGER,

  image_url TEXT,
  location  TEXT,
  streaks   TEXT,

  cycling_workout_count     INTEGER,
  noncycling_workout_count  INTEGER
);


CREATE TABLE IF NOT EXISTS rides (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER,
  updated_at  INTEGER,

  type          TEXT,
  title         TEXT,
  description   TEXT,
  duration      INTEGER,

  difficulty_level        TEXT,
  difficulty_rating_avg   REAL,
  difficulty_rating_count INTEGER,

  overall_rating_avg    REAL,
  overall_rating_count  INTEGER,

  instructor_id TEXT
);


CREATE TABLE IF NOT EXISTS instructors (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER,
  updated_at  INTEGER,

  name      TEXT,
  image_url TEXT
);


CREATE TABLE IF NOT EXISTS workouts (
  id            TEXT PRIMARY KEY,
  created_at    INTEGER,
  updated_at    INTEGER,
  taken_at      INTEGER,


  type      TEXT,
  duration  INTEGER,


  total_output    INTEGER,
  max_output      INTEGER,
  avg_output      INTEGER,
  max_cadence     INTEGER,
  avg_cadence     INTEGER,
  max_resistance  INTEGER,
  avg_resistance  INTEGER,
  max_speed       INTEGER,
  avg_speed       INTEGER,

  user_id TEXT,
  ride_id TEXT
);


CREATE TABLE IF NOT EXISTS following (
  id         TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,

  user_id       TEXT,
  following_id  TEXT
);
