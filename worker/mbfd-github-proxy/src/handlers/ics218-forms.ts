/**
 * ICS-218 Forms List & Retrieval Handler
 * 
 * Provides endpoints to list, search, and retrieve  ICS 218 forms from D1 database.
 * 
 * Endpoints:
 * - GET /api/ics218/forms - List all forms with optional filtering
 * - GET /api/ics218/forms/:id - Get specific form with vehicles
 */

import type { Env } from '../index';

interface ICS218FormRecord {
  id: string;
  incident_name: string;
  incident_number: string;
  date_prepared: string;
  time_prepared: string;
  vehicle_category: string;
  prepared_by_name: string;
  prepared_by_position: string;
  signature_data: string;
  signature_timestamp: string;
  submitted_at: string;
  submitted_by: string;
  pdf_url?: string;
  pdf_filename?: string;
  github_issue_url?: string;
  github_issue_number?: number;
  created_at: string;
  updated_at?: string;
}

interface ICS218VehicleRecord {
  id: string;
  form_id: string;
  order_request_number?: string;
  incident_id_no?: string;
  classification: string;
  make: string;
  category_kind_type: string;
  features?: string;
  agency_owner: string;
  operator_name_contact: string;
  vehicle_license_id: string;
  incident_assignment: string;
  start_date_time: string;
  release_date_time?: string;
  airtable_id?: string;
  row_order: number;
  created_at: string;
}

/**
 * Handle ICS 218 forms list request
 * 
 * Query parameters:
 * - incident: Filter by incident name (partial match)
 * - category: Filter by vehicle category
 * - limit: Maximum number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function handleICS218FormsList(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const db = env.DB || env.SUPPLY_DB;
    if (!db) {
      return jsonResponse(
        { error: 'Database not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    const url = new URL(request.url);
    const incident = url.searchParams.get('incident');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query with filters
    let query = 'SELECT * FROM ics218_forms WHERE 1=1';
    const params: string[] = [];

    if (incident) {
      query += ' AND incident_name LIKE ?';
      params.push(`%${incident}%`);
    }

    if (category) {
      query += ' AND vehicle_category = ?';
      params.push(category);
    }

    query += ' ORDER BY date_prepared DESC, time_prepared DESC LIMIT ? OFFSET ?';
    params.push(limit.toString(), offset.toString());

    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).all<ICS218FormRecord>();

    // For each form, get vehicle count
    const formsWithCounts = await Promise.all(
      (result.results || []).map(async (form) => {
        const countStmt = db.prepare('SELECT COUNT(*) as count FROM ics218_vehicles WHERE form_id = ?');
        const countResult = await countStmt.bind(form.id).first<{ count: number }>();
        
        return {
          ...form,
          vehicleCount: countResult?.count || 0,
        };
      })
    );

    return jsonResponse(
      {
        success: true,
        forms: formsWithCounts,
        count: formsWithCounts.length,
        limit,
        offset,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('ICS 218 forms list error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to retrieve forms',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle ICS 218 single form retrieval
 * 
 * @param formId - Form ID from URL path
 */
export async function handleICS218FormGet(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  formId: string
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const db = env.DB || env.SUPPLY_DB;
    if (!db) {
      return jsonResponse(
        { error: 'Database not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get form record
    const formStmt = db.prepare('SELECT * FROM ics218_forms WHERE id = ?');
    const form = await formStmt.bind(formId).first<ICS218FormRecord>();

    if (!form) {
      return jsonResponse(
        { error: 'Form not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get vehicles for this form
    const vehiclesStmt = db.prepare(
      'SELECT * FROM ics218_vehicles WHERE form_id = ? ORDER BY row_order ASC'
    );
    const vehiclesResult = await vehiclesStmt.bind(formId).all<ICS218VehicleRecord>();

    return jsonResponse(
      {
        success: true,
        form: {
          ...form,
          vehicles: vehiclesResult.results || [],
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('ICS 218 form get error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to retrieve form',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to create JSON responses
 */
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
