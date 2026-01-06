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

// Apparatus Status - tracks which vehicle number each apparatus unit is assigned to
export interface ApparatusStatus {
  unit: string;           // e.g., "Rescue 1", "Engine 1"
  vehicleNo: string;      // e.g., "445", "231"
  status: string;         // e.g., "In Service", "Out of Service"
  notes?: string;         // Additional notes
}

// Apparatus Status API Response
export interface ApparatusStatusResponse {
  statuses: ApparatusStatus[];
  fetchedAt: string;
  source: 'sheets';
}

// Vehicle Change Request - tracks user-submitted vehicle assignment changes
export interface VehicleChangeRequest {
  id: string;
  apparatus: string;         // e.g., "Rescue 1"
  oldVehicleNo: string | null; // Previous vehicle number
  newVehicleNo: string;      // New vehicle number reported by user
  reportedBy: string;        // User who reported the change
  reportedAt: string;        // ISO timestamp
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;       // Admin who reviewed
  reviewedAt?: string;       // When it was reviewed
  notes?: string;            // Admin notes about the change
  createdAt: string;
}

// Vehicle Change Request API Response
export interface VehicleChangeRequestResponse {
  requests: VehicleChangeRequest[];
  total: number;
  pending: number;
}

// ============================================================
// ICS-212 VEHICLE INSPECTION FORM TYPES
// ============================================================

// Vehicle data from Airtable - matches VehicleRecord from airtable.ts
export interface Vehicle {
  id: string;
  regUnit: string;
  vehicleMake: string;
  vehicleType: string;
  features?: string;
  agency?: string;
  licenseNumber?: string;
  vehicleId?: string;
  incidentId?: string;
  vehicleStatus?: 'Active' | 'Inactive' | 'Maintenance' | 'Deployed';
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  inspectionFrequencyDays?: number;
  notes?: string;
}

// ICS-212 Inspection Item
export interface InspectionItem {
  itemNumber: number;
  description: string;
  status: 'pass' | 'fail' | 'n/a';
  comments?: string;
  isSafetyItem: boolean;
  reference?: string;
}

// Digital Signature
export interface DigitalSignature {
  imageData: string; // Base64 PNG
  signedAt: string; // ISO timestamp
  signedBy: string; // Person name
  ipAddress?: string;
  deviceId?: string;
}

// ICS-212 Form Data
export interface ICS212FormData {
  // Meta
  formId?: string;
  status?: 'draft' | 'inspector_signed' | 'submitted' | 'approved';
  
  // Header Fields (Section 1)
  incidentName: string;
  orderNo?: string;
  vehicleLicenseNo: string;
  agencyRegUnit: string;
  vehicleType: string;
  odometerReading: number;
  vehicleIdNo: string;
  
  // Inspection Items (Section 2)
  inspectionItems: InspectionItem[];
  
  // Additional Comments (Section 3)
  additionalComments?: string;
  
  // Release Decision (Section 4)
  releaseStatus: 'hold' | 'release';
  
  // Inspector Signature (Section 5.1)
  inspectorDate: string; // ISO date
  inspectorTime: string; // HH:MM
  inspectorNamePrint: string;
  inspectorSignature?: DigitalSignature;
  
  // Operator Signature (Section 5.2)
  operatorDate?: string;
  operatorTime?: string;
  operatorNamePrint?: string;
  operatorSignature?: DigitalSignature;
  
  // System Metadata
  submittedAt?: string;
  createdBy?: string;
  organizationId?: string;
  version?: number;
}

// ICS-212 Form Submission Response
export interface ICS212SubmissionResponse {
  success: boolean;
  formId: string;
  issueNumber?: number;
  releaseDecision: 'hold' | 'release';
  pdfUrl?: string;
  message?: string;
  error?: string;
}

// Form validation result
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

// Draft save data
export interface ICS212DraftData { 
  formData: Partial<ICS212FormData>;
  currentStep: number;
  savedAt: string;
  expiresAt: string;
}

// ============================================================
// ICS-218 VEHICLE/EQUIPMENT INVENTORY FORM TYPES
// ============================================================

// ICS-218 Vehicle Entry (single row in the inventory table)
export interface ICS218VehicleEntry {
  orderRequestNumber?: string;
  incidentIdNo?: string;
  classification: string;
  make: string;
  categoryKindType: string;
  features?: string;
  agencyOwner: string;
  operatorNameContact: string;
  vehicleLicenseId: string;
  incidentAssignment: string;
  startDateTime: string; // ISO 8601
  releaseDateTime?: string; // ISO 8601
  airtableId?: string; // Reference to source vehicle in Airtable
}

// ICS-218 Form Data
export interface ICS218FormData {
  // Meta
  id: string;
  status?: 'draft' | 'submitted';
  
  // Header Fields
  incidentName: string;
  incidentNumber: string;
  datePrepared: string; // ISO 8601
  timePrepared: string; // HH:MM
  vehicleCategory: string;
  operationalPeriod?: string;
  
  // Vehicle Inventory Table
  vehicles: ICS218VehicleEntry[];
  
  // Footer - Prepared By
  preparedBy: {
    name: string;
    positionTitle: string;
    signature: string; // Base64 data URL
    signatureTimestamp: string; // ISO 8601
  };
  
  // System Metadata
  submittedAt?: string;
  submittedBy?: string;
  createdBy?: string;
  organizationId?: string;
  version?: number;
}

// ICS-218 Form Submission Response
export interface ICS218SubmissionResponse {
  success: boolean;
  id: string;
  pdfUrl?: string;
  githubIssueUrl?: string;
  message?: string;
  error?: string;
}

// ICS-218 Draft Data
export interface ICS218DraftData {
  formData: Partial<ICS218FormData>;
  currentStep: number;
  savedAt: string;
  expiresAt: string;
}

// ICS-218 Password Validation
export interface ICS218PasswordValidationRequest {
  password: string;
}

export interface ICS218PasswordValidationResponse {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}
