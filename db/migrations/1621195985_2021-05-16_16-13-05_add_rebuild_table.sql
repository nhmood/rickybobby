CREATE TABLE IF NOT EXISTS rebuilds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER,
  updated_at  INTEGER,

  complete INTEGER,
  fetch INTEGER,

  target    TEXT,
  target_id TEXT
)
