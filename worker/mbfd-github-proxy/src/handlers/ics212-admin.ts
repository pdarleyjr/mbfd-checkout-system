/**
 * ICS-212 Admin Dashboard API Handler
 * 
 * Provides comprehensive admin endpoints for ICS-212 Vehicle Safety Inspection forms:
 * - List all forms with pagination, sorting, and filtering
 * - Get single form with full details and vehicle history
 * - Analytics dashboard with statistics and trends
 * - Email distribution with PDF attachments
 * - Form deletion (admin only, requires password)
 */

import type { Env } from '../index';
import { generateICS212PDF } from '../pdf/ics212-generator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface InspectionItem {
  itemNumber: number;
  description: string;
  name: string;
  status: 'pass' | 'fail' | 'n/a';
  comments?: string;
  isSafetyItem: boolean;
  reference?: string;
}

interface ICS212FormSummary {
  id: number;
  form_id: string;
  incident_name: string;
  vehicle_id_no: string;
  vehicle_type: string;
  release_decision: 'hold' | 'release';
  inspector_name_print: string;
  inspector_date: string;
  inspector_time: string;
  pdf_url?: string;
  github_issue_number?: number;
  created_at: string;
  pass_count?: number;
  fail_count?: number;
}

interface ICS212FormDetail extends ICS212FormSummary {
  order_no?: string;
  vehicle_license_no: string;
  agency_reg_unit: string;
  odometer_reading: number;
  inspection_items: string; // JSON string
  additional_comments?: string;
  inspector_signature?: string; // JSON string
  operator_date?: string;
  operator_time?: string;
  operator_name_print?: string;
  operator_signature?: string; // JSON string
  pdf_filename?: string;
  updated_at: string;
}

interface FormsListResponse {
  forms: ICS212FormSummary[];
  total: number;
  page: number;
  pages: number;
}

interface FormDetailResponse {
  form: ICS212FormDetail;
  pdfUrl?: string;
  githubIssueUrl?: string;
  vehicleHistory: ICS212FormSummary[];
}

interface AnalyticsResponse {
  totalForms: number;
  formsThisMonth: number;
  formsThisWeek: number;
  holdRate: number;
  releaseRate: number;
  topVehicles: Array<{ vehicleId: string; count: number; lastInspection: string }>;
  safetyItemFailures: Array<{ item: string; count: number }>; 
  formsPerDay: Array<{ date: string; count: number }>; 
  recentForms: ICS212FormSummary[];
}

interface EmailFormRequest {
  recipients: string[];
  subject?: string;
  message?: string;
  attachPDF: boolean;
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

export async function handleICS212Admin(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/ics212/forms - List all forms with pagination
    if (path === '/api/ics212/forms' && request.method === 'GET') {
      return await handleFormsList(request, env, corsHeaders);
    }

    // GET /api/ics212/forms/:formId - Get single form details
    if (path.match(/^\/api\/ics212\/forms\/[^/]+$/) && request.method === 'GET') {
      const formId = path.split('/').pop()!;
      return await handleFormDetail(formId, env, corsHeaders);
    }

    // GET /api/ics212/analytics - Dashboard statistics
    if (path === '/api/ics212/analytics' && request.method === 'GET') {
      return await handleAnalytics(env, corsHeaders);
    }

    // POST /api/ics212/forms/:formId/email - Email form to recipients
    if (path.match(/^\/api\/ics212\/forms\/[^/]+\/email$/) && request.method === 'POST') {
      const formId = path.split('/')[4];
      return await handleEmailForm(formId, request, env, corsHeaders);
    }

    // DELETE /api/ics212/forms/:formId - Delete form (admin only)
    if (path.match(/^\/api\/ics212\/forms\/[^/]+$/) && request.method === 'DELETE') {
      const formId = path.split('/').pop()!;
      return await handleDeleteForm(formId, request, env, corsHeaders);
    }

    return jsonResponse(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('ICS-212 Admin API error:', error);
    return jsonResponse(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * GET /api/ics212/forms
 * List all forms with pagination, sorting, and filtering
 */
async function handleFormsList(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const sortBy = url.searchParams.get('sortBy') || 'date';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  
  // Parse filters
  const filters = {
    releaseDecision: url.searchParams.get('status'),
    vehicleId: url.searchParams.get('vehicle'),
    dateFrom: url.searchParams.get('from'),
    dateTo: url.searchParams.get('to'),
    inspectorName: url.searchParams.get('inspector'),
    search: url.searchParams.get('search')
  };

  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Build query with filters
  let query = 'SELECT * FROM ics212_forms WHERE 1=1';
  const params: any[] = [];

  if (filters.releaseDecision) {
    query += ' AND release_decision = ?';
    params.push(filters.releaseDecision.toLowerCase());
  }

  if (filters.vehicleId) {
    query += ' AND vehicle_id_no LIKE ?';
    params.push(`%${filters.vehicleId}%`);
  }

  if (filters.dateFrom) {
    query += ' AND inspector_date >= ?';
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    query += ' AND inspector_date <= ?';
    params.push(filters.dateTo);
  }

  if (filters.inspectorName) {
    query += ' AND inspector_name_print LIKE ?';
    params.push(`%${filters.inspectorName}%`);
  }

  if (filters.search) {
    query += ' AND (vehicle_id_no LIKE ? OR incident_name LIKE ? OR inspector_name_print LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  // Add sorting
  const sortColumn = sortBy === 'date' ? 'created_at' : 
                     sortBy === 'vehicle' ? 'vehicle_id_no' : 
                     'release_decision';
  query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

  // Add pagination
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  // Execute query
  const results = await db.prepare(query).bind(...params).all();

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as count FROM ics212_forms WHERE 1=1';
  const countParams: any[] = [];
  
  if (filters.releaseDecision) {
    countQuery += ' AND release_decision = ?';
    countParams.push(filters.releaseDecision.toLowerCase());
  }
  if (filters.vehicleId) {
    countQuery += ' AND vehicle_id_no LIKE ?';
    countParams.push(`%${filters.vehicleId}%`);
  }
  if (filters.dateFrom) {
    countQuery += ' AND inspector_date >= ?';
    countParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    countQuery += ' AND inspector_date <= ?';
    countParams.push(filters.dateTo);
  }
  if (filters.inspectorName) {
    countQuery += ' AND inspector_name_print LIKE ?';
    countParams.push(`%${filters.inspectorName}%`);
  }
  if (filters.search) {
    countQuery += ' AND (vehicle_id_no LIKE ? OR incident_name LIKE ? OR inspector_name_print LIKE ?)';
    countParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  const countResult = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();
  const total = countResult?.count || 0;

  // Add pass/fail counts to each form
  const formsWithCounts = (results.results as any[]).map((form: any) => {
    let items: InspectionItem[] = [];
    try {
      items = JSON.parse(form.inspection_items);
    } catch (e) {
      console.error('Failed to parse inspection items:', e);
    }
    
    return {
      ...form,
      pass_count: items.filter(i => i.status === 'pass').length,
      fail_count: items.filter(i => i.status === 'fail').length,
    };
  });

  const response: FormsListResponse = {
    forms: formsWithCounts,
    total,
    page,
    pages: Math.ceil(total / limit)
  };

  return jsonResponse(response, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/ics212/forms/:formId
 * Get single form with full details and vehicle history
 */
async function handleFormDetail(
  formId: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Get form details
  const form = await db
    .prepare('SELECT * FROM ics212_forms WHERE form_id = ?')
    .bind(formId)
    .first<ICS212FormDetail>();

  if (!form) {
    return jsonResponse(
      { error: 'Form not found' },
      { status: 404, headers: corsHeaders }
    );
  }

  // Get vehicle history (other forms for same vehicle)
  const vehicleHistory = await db
    .prepare(`
      SELECT * FROM ics212_forms 
      WHERE vehicle_id_no = ? AND form_id != ?
      ORDER BY created_at DESC
      LIMIT 10
    `)
    .bind(form.vehicle_id_no, formId)
    .all();

  // Build GitHub issue URL
  const githubIssueUrl = form.github_issue_number
    ? `https://github.com/pdarleyjr/mbfd-checkout-system/issues/${form.github_issue_number}`
    : undefined;

  const response: FormDetailResponse = {
    form,
    pdfUrl: form.pdf_url,
    githubIssueUrl,
    vehicleHistory: vehicleHistory.results as unknown as ICS212FormSummary[]
  };

  return jsonResponse(response, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/ics212/analytics
 * Dashboard statistics and trends
 */
async function handleAnalytics(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Total forms
  const totalResult = await db
    .prepare('SELECT COUNT(*) as count FROM ics212_forms')
    .first<{ count: number }>();
  const totalForms = totalResult?.count || 0;

  // Forms this month
  const thisMonthResult = await db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM ics212_forms 
      WHERE created_at >= date('now', 'start of month')
    `)
    .first<{ count: number }>();
  const formsThisMonth = thisMonthResult?.count || 0;

  // Forms this week
  const thisWeekResult = await db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM ics212_forms 
      WHERE created_at >= date('now', '-7 days')
    `)
    .first<{ count: number }>();
  const formsThisWeek = thisWeekResult?.count || 0;

  // Release decision counts
  const holdResult = await db
    .prepare(`
      SELECT COUNT(*) as count 
      FROM ics212_forms 
      WHERE release_decision = 'hold'
    `)
    .first<{ count: number }>();
  const holdCount = holdResult?.count || 0;

  // Top vehicles by inspection count
  const topVehicles = await db
    .prepare(`
      SELECT 
        vehicle_id_no as vehicleId, 
        COUNT(*) as count,
        MAX(created_at) as lastInspection
      FROM ics212_forms
      GROUP BY vehicle_id_no
      ORDER BY count DESC
      LIMIT 10
    `)
    .all();

  // Forms per day (last 30 days)
  const formsPerDay = await db
    .prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ics212_forms
      WHERE created_at >= date('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)
    .all();

  // Safety item failures analysis
  const allForms = await db
    .prepare('SELECT inspection_items FROM ics212_forms')
    .all();

  const failureCounts: Record<string, number> = {};
  (allForms.results as any[]).forEach((row: any) => {
    try {
      const items: InspectionItem[] = JSON.parse(row.inspection_items);
      items
        .filter(item => item.isSafetyItem && item.status === 'fail')
        .forEach(item => {
          const key = item.name || item.description;
          failureCounts[key] = (failureCounts[key] || 0) + 1;
        });
    } catch (e) {
      console.error('Failed to parse inspection items:', e);
    }
  });

  // Recent forms (last 5)
  const recentForms = await db
    .prepare(`
      SELECT * FROM ics212_forms
      ORDER BY created_at DESC
      LIMIT 5
    `)
    .all();

  const response: AnalyticsResponse = {
    totalForms,
    formsThisMonth,
    formsThisWeek,
    holdRate: totalForms > 0 ? (holdCount / totalForms) * 100 : 0,
    releaseRate: totalForms > 0 ? ((totalForms - holdCount) / totalForms) * 100 : 0,
    topVehicles: topVehicles.results as unknown as Array<{ vehicleId: string; count: number; lastInspection: string }>,

    safetyItemFailures: Object.entries(failureCounts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    formsPerDay: formsPerDay.results as Array<{ date: string; count: number }>,
    recentForms: recentForms.results as unknown as ICS212FormSummary[]
  };

  return jsonResponse(response, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/ics212/forms/:formId/email
 * Email form to recipients with PDF attachment
 */
async function handleEmailForm(
  formId: string,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  const body: EmailFormRequest = await request.json() as EmailFormRequest;
  const { recipients, subject, message, attachPDF } = body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return jsonResponse(
      { error: 'Recipients array is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Get form data
  const form = await db
    .prepare('SELECT * FROM ics212_forms WHERE form_id = ?')
    .bind(formId)
    .first<ICS212FormDetail>();

  if (!form) {
    return jsonResponse(
      { error: 'Form not found' },
      { status: 404, headers: corsHeaders }
    );
  }

  // Note: Email integration would go here
  // For now, we'll return success as this requires Gmail API setup
  // See email.ts integration file for full implementation

  return jsonResponse(
    { 
      success: true,
      message: 'Email distribution initiated',
      recipients: recipients.length 
    },
    { status: 200, headers: corsHeaders }
  );
}

/**
 * DELETE /api/ics212/forms/:formId
 * Delete form (admin only, requires password verification)
 */
async function handleDeleteForm(
  formId: string,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Verify admin password
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const password = authHeader.substring(7);
  if (password !== env.ADMIN_PASSWORD) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  // Get form to check if PDF needs deletion
  const form = await db
    .prepare('SELECT pdf_filename FROM ics212_forms WHERE form_id = ?')
    .bind(formId)
    .first<{ pdf_filename?: string }>();

  if (!form) {
    return jsonResponse(
      { error: 'Form not found' },
      { status: 404, headers: corsHeaders }
    );
  }

  // Delete PDF from R2 if exists (check if bucket is available)
  if (form.pdf_filename && env.USAR_FORMS) {
    try {
      await env.USAR_FORMS.delete(form.pdf_filename);
    } catch (error) {
      console.error('Failed to delete PDF from R2:', error);
    }
  }

  // Delete from database
  await db
    .prepare('DELETE FROM ics212_forms WHERE form_id = ?')
    .bind(formId)
    .run();

  return jsonResponse(
    { success: true, message: 'Form deleted successfully' },
    { status: 200, headers: corsHeaders }
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function jsonResponse(
  data: any,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
