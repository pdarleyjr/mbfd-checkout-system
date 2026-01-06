-- Migration 0005: Create ICS 218 (Support Vehicle/Equipment Inventory) Tables
-- Date: 2026-01-06
-- Purpose: Add database support for ICS 218 forms with multi-vehicle tracking

-- Table: ics218_forms
-- Stores ICS 218 form header information
CREATE TABLE IF NOT EXISTS ics218_forms (
  id TEXT PRIMARY KEY,
  incident_name TEXT NOT NULL,
  incident_number TEXT NOT NULL,
  date_prepared TEXT NOT NULL,
  time_prepared TEXT NOT NULL,
  vehicle_category TEXT NOT NULL,
  prepared_by_name TEXT NOT NULL,
  prepared_by_position TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_timestamp TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  pdf_url TEXT,
  pdf_filename TEXT,
  github_issue_url TEXT,
  github_issue_number INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast incident lookup
CREATE INDEX IF NOT EXISTS idx_ics218_incident ON ics218_forms(incident_name);

-- Index for fast date lookup
CREATE INDEX IF NOT EXISTS idx_ics218_date ON ics218_forms(date_prepared);

-- Index for fast GitHub issue reference
CREATE INDEX IF NOT EXISTS idx_ics218_github ON ics218_forms(github_issue_number);

-- Table: ics218_vehicles
-- Stores individual vehicle entries for each ICS 218 form
CREATE TABLE IF NOT EXISTS ics218_vehicles (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  order_request_number TEXT,
  incident_id_no TEXT,
  classification TEXT NOT NULL,
  make TEXT NOT NULL,
  category_kind_type TEXT NOT NULL,
  features TEXT,
  agency_owner TEXT NOT NULL,
  operator_name_contact TEXT NOT NULL,
  vehicle_license_id TEXT NOT NULL,
  incident_assignment TEXT NOT NULL,
  start_date_time TEXT NOT NULL,
  release_date_time TEXT,
  airtable_id TEXT,
  row_order INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES ics218_forms(id) ON DELETE CASCADE
);

-- Index for fast form lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_ics218_vehicles_form ON ics218_vehicles(form_id);

-- Index for Airtable reference lookup
CREATE INDEX IF NOT EXISTS idx_ics218_vehicles_airtable ON ics218_vehicles(airtable_id);

-- Index for vehicle license lookup (search functionality)
CREATE INDEX IF NOT EXISTS idx_ics218_vehicles_license ON ics218_vehicles(vehicle_license_id);
