/**
 * Apparatus Status Handler
 * 
 * Handles API endpoints for apparatus-to-vehicle mapping management.
 * Tracks which physical vehicle number each apparatus unit is currently assigned to.
 * 
 * Features:
 * - Auto-detects most recent sheet tab (date-based)
 * - Smart apparatus name normalization
 * - Intelligent Notes parsing ("In service as R1")
 * - Vehicle change request management
 */

import { Env } from '../index';
import { readSheet, writeSheet, getSheetTabs } from '../google-sheets';
import { nanoid } from 'nanoid';

// Apparatus status interface
export interface ApparatusStatus {
  unit: string;           // e.g., "Rescue 1", "Engine 1"
  vehicleNo: string;      // e.g., "445", "231"
  status: string;         // e.g., "In Service", "Out of Service"
  notes?: string;         // Additional notes
}

/**
 * Normalize apparatus names to standard format
 * Handles: "E 3", "E3", "ENGINE 3", "Engine3" → "Engine 3"
 */
function normalizeApparatusName(name: string): string {
  if (!name) return '';
  
  const normalized = name.trim().toUpperCase();
  
  // Match patterns like "E3", "E 3", "ENGINE 3", "ENGINE3"
  const engineMatch = normalized.match(/^E(?:NGINE)?\s*(\d+)$/);
  if (engineMatch) {
    return `Engine ${engineMatch[1]}`;
  }
  
  // Match patterns like "R1", "R 1", "RESCUE 1", "RESCUE1"
  const rescueMatch = normalized.match(/^R(?:ESCUE)?\s*(\d+)$/);
  if (rescueMatch) {
    return `Rescue ${rescueMatch[1]}`;
  }
  
  // Match patterns like "L1", "L 1", "LADDER 1", "LADDER1"
  const ladderMatch = normalized.match(/^L(?:ADDER)?\s*(\d+)$/);
  if (ladderMatch) {
    return `Ladder ${ladderMatch[1]}`;
  }
  
  // Return original if no match (preserve case for multi-word names)
  return name.trim();
}

/**
 * Parse Notes column to extract "In service as [unit]" information
 * Returns the apparatus unit this vehicle is serving as
 */
function parseInServiceUnit(notes: string): string | null {
  if (!notes) return null;
  
  // Match patterns: "In service as R1", "in service as E3", etc.
  const match = notes.match(/in\s+service\s+as\s+([a-z]\s*\d+)/i);
  if (!match) return null;
  
  // Normalize the extracted unit name
  return normalizeApparatusName(match[1]);
}

/**
 * Auto-detect the most recent sheet tab
 * Looks for date patterns like "Apparatus report 11-21-2025", "Apparatus report 10-23-2025"
 * Falls back to "Sheet1" if no date pattern found
 */
async function detectMostRecentSheet(env: Env, spreadsheetId: string): Promise<string> {
  try {
    const tabs = await getSheetTabs(env, spreadsheetId);
    
    // Look for date patterns in format "Apparatus report MM-DD-YYYY" or standalone "MM-DD-YYYY" or "MM/DD/YY"
    const datePattern = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/;
    const datedSheets = tabs
      .map(tab => {
        const match = tab.match(datePattern);
        if (!match) return null;
        
        // Convert to date for sorting
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        
        // Handle 2-digit vs 4-digit year
        if (year < 100) {
          year = 2000 + year; // Assume 20XX for 2-digit years
        }
        
        return {
          name: tab,
          date: new Date(year, month - 1, day),
        };
      })
      .filter(Boolean) as Array<{ name: string; date: Date }>;
    
    if (datedSheets.length > 0) {
      // Sort by date descending and return most recent
      datedSheets.sort((a, b) => b.date.getTime() - a.date.getTime());
      console.log(`Detected most recent sheet: ${datedSheets[0].name}`);
      return datedSheets[0].name;
    }
    
    // Fall back to Sheet1 or first tab
    return tabs[0] || 'Sheet1';
  } catch (error) {
    console.error('Error detecting sheet tab:', error);
    return 'Sheet1';
  }
}

/**
 * GET /api/apparatus-status - Retrieve apparatus-to-vehicle mappings
 */
export async function handleGetApparatusStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    if (!env.APPARATUS_STATUS_SHEET_ID) {
      return new Response(
        JSON.stringify({ error: 'Apparatus Status Sheet ID not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Auto-detect the most recent sheet tab
    const sheetName = await detectMostRecentSheet(env, env.APPARATUS_STATUS_SHEET_ID);
    
    // Read apparatus status from Google Sheet
    // The sheet has an empty Column A, so actual data is in B-G
    // Expected columns: (empty), Vehicle No (B), Designation (C), Assignment (D), Current Location (E), Status (F), Notes (G)
    const values = await readSheet(
      env, 
      env.APPARATUS_STATUS_SHEET_ID, 
      `${sheetName}!A2:G100`
    );

    // First pass: Build vehicle data
    // Skip title & header rows (rows 0 and 1 have title + headers) and filter for rows with vehicle numbers
    const vehicles = values
      .slice(2) // Skip title & header rows
      .filter(row => row[1]) // Must have vehicle number in column B (index 1)
      .map((row) => ({
        vehicleNo: row[1] || '',        // Column B
        designation: row[2] || '',       // Column C
        assignment: row[3] || 'Unknown', // Column D
        currentLocation: row[4] || '',   // Column E
        status: row[5] || '',            // Column F - In Service, Out of Service, Available
        notes: row[6] || '',             // Column G - "In service as R1", etc.
      }));

    // Second pass: Parse Notes to find "In service as" mappings
    const apparatusMap = new Map<string, ApparatusStatus>();
    
    for (const vehicle of vehicles) {
      const inServiceUnit = parseInServiceUnit(vehicle.notes);
      
      if (inServiceUnit) {
        // This vehicle is in service as a specific unit - ALWAYS takes priority
        apparatusMap.set(inServiceUnit, {
          unit: inServiceUnit,
          vehicleNo: vehicle.vehicleNo,
          status: vehicle.status,
          notes: vehicle.notes,
        });
      } else if (vehicle.designation && vehicle.status.toLowerCase().includes('in service')) {
        // Only use designation if vehicle is actually "In Service" and no override exists
        const normalizedUnit = normalizeApparatusName(vehicle.designation);
        if (normalizedUnit && !apparatusMap.has(normalizedUnit)) {
          apparatusMap.set(normalizedUnit, {
            unit: normalizedUnit,
            vehicleNo: vehicle.vehicleNo,
            status: vehicle.status,
            notes: vehicle.notes,
          });
        }
      }
    }

    const statuses = Array.from(apparatusMap.values());

    return new Response(
      JSON.stringify({
        statuses,
        fetchedAt: new Date().toISOString(),
        source: 'sheets',
        sheetUsed: sheetName,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching apparatus status:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch apparatus status',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

/**
 * POST /api/apparatus-status - Update apparatus vehicle assignment (admin only)
 * Updates the Notes column with "In service as [unit]"
 */
export async function handleUpdateApparatusStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Verify admin authentication
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin password.' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const body: {
      unit: string;        // e.g., "Rescue 1"
      vehicleNo: string;   // e.g., "445"
    } = await request.json();

    if (!body.unit || !body.vehicleNo) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: unit, vehicleNo' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!env.APPARATUS_STATUS_SHEET_ID) {
      return new Response(
        JSON.stringify({ error: 'Apparatus Status Sheet ID not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Auto-detect the most recent sheet tab
    const sheetName = await detectMostRecentSheet(env, env.APPARATUS_STATUS_SHEET_ID);

    // Read current data to find the vehicle row
    // Remember: Column A is empty, data is in B,C,D,E
    const values = await readSheet(
      env, 
      env.APPARATUS_STATUS_SHEET_ID, 
      `${sheetName}!A2:E100`
    );
    
    // Find the row for this vehicle number (in column B = index 1)
    const rowIndex = values.findIndex(row => row[1] === body.vehicleNo);
    
    if (rowIndex === -1) {
      return new Response(
        JSON.stringify({ 
          error: 'Vehicle not found in apparatus status sheet',
          vehicleNo: body.vehicleNo 
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Calculate actual row number in sheet (adding 2 for header + 0-index)
    const sheetRowNumber = rowIndex + 2;
    
    // Get current row data
    const currentRow = values[rowIndex];
    
    // Create short unit code for Notes (e.g., "Rescue 1" → "R1")
    const unitCode = body.unit
      .replace(/Engine\s+(\d+)/i, 'E$1')
      .replace(/Rescue\s+(\d+)/i, 'R$1')
      .replace(/Ladder\s+(\d+)/i, 'L$1')
      .replace(/\s+/g, '');
    
    // Build updated row with new Notes
    // Columns: A (empty), B (Vehicle No), C (Designation), D (Assignment), E (Notes)
    const updatedRow = [
      '',                              // Column A - keep empty
      body.vehicleNo,                  // Column B - Vehicle No
      currentRow[2] || '',             // Column C - Preserve designation
      currentRow[3] || 'In Service',   // Column D - Preserve assignment
      `In service as ${unitCode}`,     // Column E - Update notes
    ];

    // Update the row in Google Sheet
    await writeSheet(
      env,
      env.APPARATUS_STATUS_SHEET_ID,
      `${sheetName}!A${sheetRowNumber}:E${sheetRowNumber}`,
      [updatedRow]
    );

    console.log(`Apparatus status updated: ${body.unit} → Vehicle ${body.vehicleNo}`);

    return new Response(
      JSON.stringify({
        success: true,
        unit: body.unit,
        vehicleNo: body.vehicleNo,
        updatedNotes: updatedRow[4],
        sheetUsed: sheetName,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error updating apparatus status:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update apparatus status',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

/**
 * POST /api/apparatus-status/request - Submit vehicle change request (from field users)
 */
export async function handleCreateVehicleChangeRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const body: {
      apparatus: string;
      oldVehicleNo: string | null;
      newVehicleNo: string;
      reportedBy: string;
    } = await request.json();

    if (!body.apparatus || !body.newVehicleNo || !body.reportedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create change request record in D1
    const id = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO vehicle_change_requests 
       (id, apparatus, old_vehicle_no, new_vehicle_no, reported_by, reported_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).bind(
      id,
      body.apparatus,
      body.oldVehicleNo,
      body.newVehicleNo,
      body.reportedBy,
      now,
      now
    ).run();

    console.log(`Vehicle change request created: ${body.apparatus} ${body.oldVehicleNo} → ${body.newVehicleNo}`);

    return new Response(
      JSON.stringify({
        success: true,
        requestId: id,
        message: 'Vehicle change request submitted for admin review',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error creating vehicle change request:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create vehicle change request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

/**
 * GET /api/apparatus-status/requests - Get vehicle change requests (admin only)
 */
export async function handleGetVehicleChangeRequests(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Verify admin authentication
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin password.' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    // Fetch requests from D1
    const query = status === 'all'
      ? `SELECT * FROM vehicle_change_requests ORDER BY reported_at DESC LIMIT 100`
      : `SELECT * FROM vehicle_change_requests WHERE status = ? ORDER BY reported_at DESC LIMIT 100`;

    const result = status === 'all'
      ? await env.DB.prepare(query).all()
      : await env.DB.prepare(query).bind(status).all();

    // Count pending requests
    const pendingCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM vehicle_change_requests WHERE status = 'pending'`
    ).first<{ count: number }>();

    return new Response(
      JSON.stringify({
        requests: result.results || [],
        total: result.results?.length || 0,
        pending: pendingCount?.count || 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching vehicle change requests:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch vehicle change requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

/**
 * PATCH /api/apparatus-status/requests/:id - Approve/reject vehicle change request (admin only)
 */
export async function handleReviewVehicleChangeRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    // Verify admin authentication
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin password.' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const body: {
      action: 'approve' | 'reject';
      reviewedBy: string;
      notes?: string;
    } = await request.json();

    if (!body.action || !body.reviewedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, reviewedBy' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Get the change request
    const changeRequest = await env.DB.prepare(
      `SELECT * FROM vehicle_change_requests WHERE id = ?`
    ).bind(requestId).first<any>();

    if (!changeRequest) {
      return new Response(
        JSON.stringify({ error: 'Change request not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const now = new Date().toISOString();
    const newStatus = body.action === 'approve' ? 'approved' : 'rejected';

    // Update request status
    await env.DB.prepare(
      `UPDATE vehicle_change_requests 
       SET status = ?, reviewed_by = ?, reviewed_at = ?, notes = ?
       WHERE id = ?`
    ).bind(
      newStatus,
      body.reviewedBy,
      now,
      body.notes || null,
      requestId
    ).run();

    // If approved, update the Google Sheet
    if (body.action === 'approve') {
      await handleUpdateApparatusStatus(
        new Request(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            unit: changeRequest.apparatus,
            vehicleNo: changeRequest.new_vehicle_no,
          }),
        }),
        env,
        corsHeaders
      );
    }

    console.log(`Vehicle change request ${body.action}ed: ${requestId}`);

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        action: body.action,
        status: newStatus,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error reviewing vehicle change request:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to review vehicle change request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}
