-- Add user_preferences table for storing user-specific settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,

  -- Color theme settings
  theme TEXT DEFAULT 'dark' CHECK(theme IN ('light', 'dark', 'custom')),
  background_color TEXT DEFAULT '#000000',
  text_color TEXT DEFAULT '#FFFFFF',

  -- Font settings (moved from localStorage)
  font_preset TEXT DEFAULT 'classic' CHECK(font_preset IN ('classic', 'modern', 'neutral', 'mono')),

  -- Editor settings (moved from localStorage)
  max_lines_per_page INTEGER DEFAULT 40,
  editor_mode TEXT DEFAULT 'paged' CHECK(editor_mode IN ('paged', 'continuous')),
  auto_save INTEGER DEFAULT 1,
  revision_interval_minutes INTEGER DEFAULT 10,

  -- Keybinding settings (stored as JSON)
  keybindings TEXT DEFAULT '{}',

  updated_at INTEGER DEFAULT (unixepoch('now') * 1000),
  created_at INTEGER DEFAULT (unixepoch('now') * 1000),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique index on user_id (one preference record per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create index on updated_at for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);
