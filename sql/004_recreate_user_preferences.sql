-- Drop existing user_preferences table if it exists
DROP TABLE IF EXISTS user_preferences;

-- Recreate user_preferences table (exact copy of documents structure)
-- Default theme is now 'light' instead of 'dark'
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
