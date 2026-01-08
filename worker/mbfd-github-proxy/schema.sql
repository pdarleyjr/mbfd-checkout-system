CREATE TABLE IF NOT EXISTS ics212_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT UNIQUE NOT NULL,
  incident_name TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  order_number TEXT,
  vehicle_id_no TEXT NOT NULL,
  odometer_reading INTEGER NOT NULL,
  vehicle_details JSON,
  inspection_items JSON NOT NULL,
  comments TEXT,
  inspector_signature TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  inspector_date TEXT NOT NULL,
  operator_signature TEXT,
  operator_name TEXT,
  operator_date TEXT,
  release_decision TEXT NOT NULL,
  pdf_url TEXT,
  pdf_filename TEXT,
  github_issue_number INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicle_id ON ics212_forms(vehicle_id_no);
CREATE INDEX idx_release_decision ON ics212_forms(release_decision);
CREATE INDEX idx_incident_date ON ics212_forms(incident_date);
CREATE INDEX idx_created_at ON ics212_forms(created_at);

-- File metadata table for admin dashboard file management
CREATE TABLE IF NOT EXISTS file_metadata (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  form_type TEXT,
  form_id TEXT,
  uploader_name TEXT,
  uploader_email TEXT,
  upload_date TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (form_id) REFERENCES ics212_forms(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_file_form_id ON file_metadata(form_id);
CREATE INDEX IF NOT EXISTS idx_file_type ON file_metadata(file_type);
CREATE INDEX IF NOT EXISTS idx_file_upload_date ON file_metadata(upload_date);

-- Email templates table for reusable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT,
  category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_template_category ON email_templates(category);

-- Email history table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_history (
  id TEXT PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_emails TEXT NOT NULL,
  cc_emails TEXT,
  bcc_emails TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments TEXT,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  template_id TEXT,
  form_ids TEXT,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_sent_at ON email_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_history(status);