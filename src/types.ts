// User Interface
export interface User {
  name: string;
  rank: Rank;
  apparatus: string;
  shift: Shift;
  unitNumber: string;
}

export interface CompartmentItem {
  name: string;
  inputType?: 'checkbox' | 'text' | 'number' | 'percentage' | 'radio';
  expectedQuantity?: number;
  note?: string;
}

export interface Compartment {
  id: string;
  title: string;
  items: (string | CompartmentItem)[];
}

// Checklist Item
export interface ChecklistItem {
  name: string;
  status: ItemStatus;
  notes?: string;
  photoUrl?: string;
  inputType?: 'checkbox' | 'text' | 'number' | 'percentage' | 'radio';
  expectedQuantity?: number;
  value?: string | number;
  radioNumber?: string;
}

// Daily Schedule Task
export interface DailyScheduleTask {
  day: string;
  tasks: string[];
}

// Officer Checklist Item
export interface OfficerChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  inputType?: 'checkbox' | 'text' | 'number' | 'percentage' | 'radio';
  value?: string | number;
  required?: boolean;
}

// Complete Checklist Data
export interface ChecklistData {
  title: string;
  compartments: Compartment[];
  dailySchedule?: DailyScheduleTask[];
  officerChecklist?: Array<{
    id: string;
    name: string;
    inputType?: 'checkbox' | 'text' | 'number' | 'percentage' | 'radio';
    required?: boolean;
  }>;
}

// Fixed apparatus casing to match UI usage
export type Apparatus = 
  | 'Engine 1' | 'Engine 2' | 'Engine 3' | 'Engine 4'
  | 'Ladder 1' | 'Ladder 3'
  | 'Rescue 1' | 'Rescue 2' | 'Rescue 3' | 'Rescue 4'
  | 'Rescue 11' | 'Rescue 22' | 'Rescue 44'
  | 'Rope Inventory';
export type ItemStatus = 'present' | 'missing' | 'damaged';
export type Rank = 'Firefighter' | 'DE' | 'Lieutenant' | 'Captain' | 'Chief';
export type Shift = 'A' | 'B' | 'C';

// Front Cab Checks
export interface FrontCabChecks {
  lights: boolean;
  siren: boolean;
  mobileRadio: boolean;
  airHorn: boolean;
  noSmokingSign: boolean;
  fuelLevel?: number;
  defLevel?: number;
}

// Defect Interface (for admin dashboard) - matches github.ts usage
export interface Defect {
  id?: string;
  apparatus: string;
  compartment: string;
  item: string;
  status: 'missing' | 'damaged';
  notes: string;
  reportedBy: string;
  reportedAt: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  resolved: boolean;
  issueNumber?: number;
  updatedAt?: string;
}

// Inspection Submission
export interface InspectionSubmission {
  user: User;
  apparatus: string;
  date: string;
  items: ChecklistItem[];
  defects: Array<{
    compartment: string;
    item: string;
    status: 'missing' | 'damaged';
    notes: string;
    photoUrl?: string;
  }>;
  shift: Shift;
  unitNumber: string;
  officerChecklist?: OfficerChecklistItem[];
}

// GitHub Issue
export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
}

export interface EmailConfig {
  email_mode: 'daily_digest' | 'per_submission' | 'hybrid';
  daily_email_hard_cap: number;
  digest_send_time: string;
  digest_timezone: string;
  recipients: string[];
  enable_immediate_for_critical: boolean;
  email_subject_template: string;
  enabled: boolean;
}

// Photo Upload Response
export interface UploadResponse {
  success: boolean;
  photoUrl?: string;
  thumbnailUrl?: string;
  key?: string;
  size?: number;
  mimeType?: string;
  error?: string;
  message?: string;
}

// Pending Upload for offline support
export interface PendingUpload {
  id: string;
  file: Blob;
  metadata: {
    inspector: string;
    apparatus: string;
    item: string;
    reportedAt: string;
  };
  defect: {
    compartment: string;
    item: string;
    status: 'missing' | 'damaged';
    notes: string;
  };
  timestamp: number;
  retryCount: number;
}
