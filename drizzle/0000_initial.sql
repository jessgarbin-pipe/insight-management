-- Themes
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  origin TEXT NOT NULL DEFAULT 'predefined' CHECK (origin IN ('predefined', 'ai_suggested', 'user_created')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_review', 'archived')),
  color TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_normalized TEXT,
  source TEXT NOT NULL CHECK (source IN ('slack', 'api', 'csv_import')),
  source_metadata TEXT,
  customer_name TEXT,
  customer_company TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  sentiment_score INTEGER,
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'classified', 'reviewed', 'actioned', 'archived')),
  ai_summary TEXT,
  ai_confidence INTEGER,
  duplicate_of_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_insights_source ON insights(source);
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_sentiment ON insights(sentiment);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_customer_company ON insights(customer_company);

-- Insight-Theme junction
CREATE TABLE IF NOT EXISTS insight_themes (
  insight_id TEXT NOT NULL REFERENCES insights(id),
  theme_id TEXT NOT NULL REFERENCES themes(id),
  confidence INTEGER,
  is_primary INTEGER DEFAULT 0,
  assigned_by TEXT NOT NULL DEFAULT 'ai' CHECK (assigned_by IN ('ai', 'user')),
  PRIMARY KEY (insight_id, theme_id)
);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme ON insight_themes(theme_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS insight_tags (
  insight_id TEXT NOT NULL REFERENCES insights(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (insight_id, tag_id)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Classification Log
CREATE TABLE IF NOT EXISTS classification_log (
  id TEXT PRIMARY KEY,
  insight_id TEXT NOT NULL REFERENCES insights(id),
  action TEXT NOT NULL CHECK (action IN ('classified', 'theme_suggested', 'duplicate_detected', 'reclassified')),
  output TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_classification_log_insight ON classification_log(insight_id);
