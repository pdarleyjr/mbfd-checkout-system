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