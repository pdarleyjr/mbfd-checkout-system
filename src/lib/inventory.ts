/**
 * Inventory API Client
 *
 * This module provides functions to interact with the inventory and task management endpoints.
 */

const API_BASE = 'https://mbfd-github-proxy.pdarleyjr.workers.dev/api';

/**
 * Get headers for API requests including admin authentication
 */
function getHeaders(requiresAdmin: boolean = false): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requiresAdmin) {
    const adminPassword = localStorage.getItem('adminPassword');
    if (adminPassword) {
      headers['X-Admin-Password'] = adminPassword;
    }
  }

  return headers;
}

export interface InventoryItem {
  id: string;
  shelf: string;
  row: number;
  equipmentType: string;
  equipmentName: string;
  quantity: number;
  manufacturer?: string;
  location: string;
  description?: string;
  minQty?: number;
}

export interface SuggestedReplacement {
  itemId: string;
  itemName: string;
  qtyOnHand: number;
  location?: string;
  confidence?: number;
}

export interface SupplyTask {
  id: string;
  apparatus: string;
  compartment?: string;
  itemName: string;
  itemId?: string;
  deficiencyType: 'missing' | 'damaged';
  suggestedReplacements?: SuggestedReplacement[];
  chosenReplacement?: {
    itemId: string;
    itemName: string;
    qty: number;
  } | null;
  qtyToTransfer?: number;
  status: 'pending' | 'completed' | 'canceled';
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

/**
 * Fetch inventory items from the server
 */
export async function fetchInventory(): Promise<{
  items: InventoryItem[];
  fetchedAt: string;
  source: string;
}> {
  const response = await fetch(`${API_BASE}/inventory`, {
    method: 'GET',
    headers: getHeaders(true), // Admin auth required
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch inventory: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch supply tasks
 */
export async function fetchTasks(status: 'pending' | 'completed' | 'canceled' = 'pending'): Promise<{
  tasks: SupplyTask[];
  count: number;
  unseenCount: number;
}> {
  const response = await fetch(`${API_BASE}/tasks?status=${status}`, {
    method: 'GET',
    headers: getHeaders(true), // Admin auth required
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch tasks: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Mark inventory tasks as viewed by admin (clears notification badge)
 */
export async function markTasksViewed(): Promise<{
  success: boolean;
  viewedAt: string;
}> {
  const response = await fetch(`${API_BASE}/tasks/mark-viewed`, {
    method: 'POST',
    headers: getHeaders(true), // Admin auth required
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to mark tasks as viewed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create new supply tasks
 */
export async function createTasks(tasks: Array<{
  apparatus: string;
  compartment?: string;
  item: string;
  deficiencyType: 'missing' | 'damaged';
  createdBy?: string;
  notes?: string;
}>): Promise<{
  success: boolean;
  tasks: SupplyTask[];
}> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(false), // No admin auth needed for automatic task creation
    },
    body: JSON.stringify({ tasks }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to create tasks: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update a task (mark complete, cancel, etc.)
 */
export async function updateTask(
  taskId: string,
  update: {
    status?: 'pending' | 'completed' | 'canceled';
    chosenReplacement?: {
      itemId: string;
      itemName: string;
      qty: number;
    };
    completedBy?: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  task: SupplyTask;
}> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(true), // Admin auth required
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to update task: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Adjust inventory quantity
 */
export async function adjustInventory(
  itemId: string,
  delta: number,
  reason?: string,
  performedBy?: string
): Promise<{
  success: boolean;
  itemId: string;
  previousQty: number;
  newQty: number;
}> {
  const response = await fetch(`${API_BASE}/inventory/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(true), // Admin auth required
    },
    body: JSON.stringify({
      itemId,
      delta,
      reason,
      performedBy,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.details || `Failed to adjust inventory: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * AI Insights types
 */
export interface AIInsight {
  id: string;
  apparatus: string;
  insight_json: string;
  created_at: string;
  model?: string;
  status: 'success' | 'error' | 'pending';
}

export interface AIInsightData {
  summary: string;
  recurringIssues: string[];
  reorderSuggestions: Array<{
    item: string;
    reason: string;
    urgency: string;
  }>;
  anomalies: string[];
}

/**
 * Generate AI insights from current inventory and tasks
 */
export async function generateAIInsights(data: {
  tasks?: SupplyTask[];
  inventory?: InventoryItem[];
}): Promise<{
  ok: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/ai/inventory-insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(true), // Admin auth required
    },
    body: JSON.stringify({
      tasks: data.tasks?.map(t => ({
        id: t.id,
        apparatus: t.apparatus,
        itemName: t.itemName,
        deficiencyType: t.deficiencyType,
      })),
      inventory: data.inventory?.map(i => ({
        id: i.id,
        equipmentName: i.equipmentName,
        quantity: i.quantity,
        minQty: i.minQty,
      })),
    }),
  });

  if (!response.ok) {
    // If AI not configured, return gracefully
    if (response.status === 501) {
      return {
        ok: false,
        message: 'AI integration not configured',
      };
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to generate insights: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch latest AI insights
 */
export async function fetchAIInsights(): Promise<{
  insights: AIInsight[];
  count: number;
}> {
  const response = await fetch(`${API_BASE}/ai/insights`, {
    method: 'GET',
    headers: getHeaders(true), // Admin auth required
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch insights: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Apparatus Status types and functions
 */
export interface ApparatusStatus {
  unit: string;
  vehicleNo: string;
  status: string;
  notes?: string;
}

/**
 * Vehicle interface - represents all vehicles from the apparatus status sheet
 */
export interface Vehicle {
  vehicleNo: string;        // Vehicle number (e.g., "445", "1035")
  designation: string;       // Unit designation (e.g., "R 1", "E 1")
  assignment: string;        // Assignment type (e.g., "Station 1", "Reserve")
  currentLocation: string;   // Where the vehicle is located
  status: string;            // "In Service", "Out of Service", "Available"
  notes: string;             // Any special notes including "In service as" directives
}

/**
 * Fetch apparatus status (apparatus-to-vehicle mappings)
 */
export async function fetchApparatusStatus(): Promise<{
  statuses: ApparatusStatus[];
  allVehicles: Vehicle[];
  fetchedAt: string;
  source: string;
}> {
  const response = await fetch(`${API_BASE}/apparatus-status`, {
    method: 'GET',
    headers: getHeaders(false), // No admin auth required for reading
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch apparatus status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update apparatus vehicle assignment (admin only)
 */
export async function updateApparatusStatus(
  unit: string,
  update: {
    vehicleNo?: string;
    status?: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  unit: string;
  updatedData: {
    vehicleNo: string;
    status: string;
    notes: string;
  };
}> {
  const response = await fetch(`${API_BASE}/apparatus-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(true), // Admin auth required
    },
    body: JSON.stringify({
      unit,
      ...update,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to update apparatus status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get vehicle number for a specific apparatus unit
 */
export function getVehicleNumber(
  statuses: ApparatusStatus[],
  unit: string
): string | undefined {
  const status = statuses.find(s => s.unit === unit);
  return status?.vehicleNo;
}

/**
 * Vehicle Change Request types and functions
 */
export interface VehicleChangeRequest {
  id: string;
  apparatus: string;
  oldVehicleNo: string | null;
  newVehicleNo: string;
  reportedBy: string;
  reportedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Submit a vehicle change request when user detects apparatus is using a different vehicle
 */
export async function submitVehicleChangeRequest(request: {
  apparatus: string;
  oldVehicleNo: string | null;
  newVehicleNo: string;
  reportedBy: string;
  notes?: string;
}): Promise<{
  success: boolean;
  request: VehicleChangeRequest;
}> {
  const response = await fetch(`${API_BASE}/apparatus-status/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(false), // No admin auth required to submit
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to submit vehicle change request: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch vehicle change requests (admin only)
 */
export async function fetchVehicleChangeRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<{
  requests: VehicleChangeRequest[];
  total: number;
  pending: number;
}> {
  const url = status? `${API_BASE}/apparatus-status/requests?status=${status}` : `${API_BASE}/apparatus-status/requests`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(true), // Admin auth required
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch vehicle change requests: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Review (approve/reject) a vehicle change request (admin only)
 */
export async function reviewVehicleChangeRequest(
  requestId: string,
  action: 'approve' | 'reject',
  reviewedBy: string,
  notes?: string
): Promise<{
  success: boolean;
  request: VehicleChangeRequest;
  sheetUpdated?: boolean;
}> {
  const response = await fetch(`${API_BASE}/apparatus-status/requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(true), // Admin auth required
    },
    body: JSON.stringify({
      action,
      reviewedBy,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to review vehicle change request: ${response.statusText}`);
  }

  return await response.json();
}
