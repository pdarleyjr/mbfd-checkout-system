-- Migration number: 0002 	 2025-12-12T18:16:42.113Z

-- Migration: Create inventory_insights table for AI-generated insights
-- Created: 2025-12-12

CREATE TABLE IF NOT EXISTS inventory_insights (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  apparatus TEXT,
  insight_json TEXT NOT NULL, -- JSON object with AI analysis
  created_at TEXT NOT NULL,
  model TEXT, -- AI model used
  status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'error', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_insights_created_at ON inventory_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_task_id ON inventory_insights(task_id);
CREATE INDEX IF NOT EXISTS idx_insights_apparatus ON inventory_insights(apparatus);
