CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_created
  ON feature_requests (created_at);

CREATE INDEX IF NOT EXISTS idx_feature_requests_user
  ON feature_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status
  ON feature_requests (status);
