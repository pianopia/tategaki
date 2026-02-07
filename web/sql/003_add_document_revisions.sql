CREATE TABLE IF NOT EXISTS document_revisions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pages_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_document_revisions_document
  ON document_revisions (document_id);

CREATE INDEX IF NOT EXISTS idx_document_revisions_user
  ON document_revisions (user_id);
