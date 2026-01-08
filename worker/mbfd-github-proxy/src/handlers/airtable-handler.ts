/**
 * Airtable Deployment Handler
 * 
 * Provides deployment-specific endpoints that complement the vehicles handler:
 * - Get deployment history
 * - Get deployment statistics
 * - Cross-reference vehicles with inspection data
 */

import type { Env } from '../index';
import { createAirtableClient, VehicleRecord } from '../integrations/airtable';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DeploymentData {
  vehicleId: string;
  regUnit: string;
  vehicleMake: string;
  vehicleType: string;
  vehicleStatus: string;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  inspectionCount: number;
  lastFormDate?: string;
  recentForms: Array<{
    formId: string;
    inspectionDate: string;
    releaseDecision: string;
    inspectorName: string;
  }>;
}

interface DeploymentStats {
  totalVehicles: number;
  activeVehicles: number;
  deployedVehicles: number;
  vehiclesNeedingInspection: number;
  inspectionCompliance: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

export async function handleAirtable(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/airtable/deployments - Get deployment data
    if (path === '/api/airtable/deployments' && request.method === 'GET') {
      return await handleDeployments(request, env, corsHeaders);
    }

    // GET /api/airtable/deployment-stats - Get deployment statistics
    if (path === '/api/airtable/deployment-stats' && request.method === 'GET') {
      return await handleDeploymentStats(env, corsHeaders);
    }

    return jsonResponse(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[AIRTABLE] Error:', error);
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
 * GET /api/airtable/deployments
 * Get deployment data with inspection history cross-reference
 */
async function handleDeployments(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate Airtable credentials
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    return jsonResponse(
      { error: 'Airtable not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // Active, Deployed, etc.
    const needsInspection = url.searchParams.get('needsInspection') === 'true';

    // Fetch vehicles from Airtable
    const airtable = createAirtableClient(env);
    let vehicles: VehicleRecord[];

    if (status) {
      vehicles = await airtable.getVehiclesByStatus(status as any);
    } else {
      vehicles = await airtable.fetchVehicles();
    }

    // Get inspection data from D1
    const inspectionData = await db
      .prepare(`
        SELECT 
          vehicle_id_no as vehicleId,
          COUNT(*) as count,
          MAX(created_at) as lastFormDate,
          GROUP_CONCAT(
            json_object(
              'formId', form_id,
              'inspectionDate', inspector_date,
              'releaseDecision', release_decision,
              'inspectorName', inspector_name
            )
          ) as forms
        FROM ics212_forms
        GROUP BY vehicle_id_no
      `)
      .all();

    // Build map of inspection data by vehicle
    const inspectionMap = new Map<string, any>();
    (inspectionData.results as any[]).forEach((row: any) => {
      inspectionMap.set(row.vehicleId, {
        count: row.count,
        lastFormDate: row.lastFormDate,
        recentForms: row.forms ? JSON.parse(`[${row.forms}]`).slice(0, 5) : []
      });
    });

    // Combine Airtable and D1 data
    const deploymentData: DeploymentData[] = vehicles.map((vehicle: VehicleRecord) => {
      const inspection = inspectionMap.get(vehicle.regUnit) || {
        count: 0,
        lastFormDate: null,
        recentForms: []
      };

      return {
        vehicleId: vehicle.id || '',
        regUnit: vehicle.regUnit,
        vehicleMake: vehicle.vehicleMake,
        vehicleType: vehicle.vehicleType,
        vehicleStatus: vehicle.vehicleStatus || 'Unknown',
        lastInspectionDate: vehicle.lastInspectionDate,
        nextInspectionDue: vehicle.nextInspectionDue,
        inspectionCount: inspection.count,
        lastFormDate: inspection.lastFormDate,
        recentForms: inspection.recentForms
      };
    });

    // Filter by inspection needs if requested
    let filteredData = deploymentData;
    if (needsInspection) {
      const now = new Date();
      filteredData = deploymentData.filter(v => {
        if (!v.nextInspectionDue) return false;
        const dueDate = new Date(v.nextInspectionDue);
        return dueDate <= now;
      });
    }

    return jsonResponse(
      {
        deployments: filteredData,
        total: filteredData.length
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[AIRTABLE] Deployments fetch error:', error);
    return jsonResponse(
      {
        error: 'Failed to fetch deployments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/airtable/deployment-stats
 * Get deployment statistics
 */
async function handleDeploymentStats(
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate Airtable credentials
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    return jsonResponse(
      { error: 'Airtable not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const airtable = createAirtableClient(env);
    const vehicles = await airtable.fetchVehicles();

    const stats: DeploymentStats = {
      totalVehicles: vehicles.length,
      activeVehicles: 0,
      deployedVehicles: 0,
      vehiclesNeedingInspection: 0,
      inspectionCompliance: 100,
      byStatus: {},
      byType: {}
    };

    const now = new Date();

    vehicles.forEach((vehicle: VehicleRecord) => {
      // Count by status
      const status = vehicle.vehicleStatus || 'Unknown';
      if (status === 'Active') stats.activeVehicles++;
      if (status === 'Deployed') stats.deployedVehicles++;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by type
      const type = vehicle.vehicleType || 'Unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Check inspection needs
      if (vehicle.nextInspectionDue) {
        const dueDate = new Date(vehicle.nextInspectionDue);
        if (dueDate <= now) {
          stats.vehiclesNeedingInspection++;
        }
      }
    });

    // Calculate compliance rate
    if (stats.totalVehicles > 0) {
      stats.inspectionCompliance = 
        ((stats.totalVehicles - stats.vehiclesNeedingInspection) / stats.totalVehicles) * 100;
    }

    return jsonResponse(stats, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[AIRTABLE] Stats fetch error:', error);
    return jsonResponse(
      {
        error: 'Failed to fetch deployment stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
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
