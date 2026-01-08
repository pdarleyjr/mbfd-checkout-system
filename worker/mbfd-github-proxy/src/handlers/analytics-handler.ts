/**
 * Enhanced Analytics Handler
 * 
 * Provides comprehensive analytics endpoints that combine:
 * - D1 database statistics (forms, inspections)
 * - Airtable vehicle deployment data
 * - Historical trends and comparisons
 */

import type { Env } from '../index';
import { createAirtableClient, VehicleRecord } from '../integrations/airtable';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AnalyticsResponse {
  // Form statistics
  totalForms: number;
  formsThisMonth: number;
  formsThisWeek: number;
  holdRate: number;
  releaseRate: number;
  
  // Vehicle data from Airtable
  totalVehicles: number;
  vehiclesByStatus: Record<string, number>;
  vehiclesByType: Record<string, number>;
  
  // Deployment statistics
  deploymentHistory: Array<{
    vehicleId: string;
    regUnit: string;
    lastDeployment?: string;
    inspectionCount: number;
    lastInspection?: string;
    status: string;
  }>;
  
  // Trends
  formsPerDay: Array<{ date: string; count: number }>;  
  topVehicles: Array<{ vehicleId: string; count: number; lastInspection: string }>; 
  safetyItemFailures: Array<{ item: string; count: number }>;  
  
  // Recent activity
  recentForms: any[];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleAnalytics(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/analytics/advanced - Enhanced analytics
    if (path === '/api/analytics/advanced' && request.method === 'GET') {
      return await handleAdvancedAnalytics(env, corsHeaders);
    }

    return jsonResponse(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
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
 * GET /api/analytics/advanced
 * Enhanced analytics combining D1 and Airtable data
 */
async function handleAdvancedAnalytics(
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

  try {
    // ===== D1 DATABASE STATISTICS =====
    
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
        const items = JSON.parse(row.inspection_items);
        items
          .filter((item: any) => item.isSafetyItem && item.status === 'fail')
          .forEach((item: any) => {
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

    // ===== AIRTABLE VEHICLE DATA =====
    
    let totalVehicles = 0;
    let vehiclesByStatus: Record<string, number> = {};
    let vehiclesByType: Record<string, number> = {};
    let deploymentHistory: any[] = [];

    // Only fetch Airtable data if credentials are available
    if (env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID) {
      try {
        const airtable = createAirtableClient(env);
        const vehicles = await airtable.fetchVehicles();
        
        totalVehicles = vehicles.length;

        // Group by status
        vehicles.forEach((vehicle: VehicleRecord) => {
          const status = vehicle.vehicleStatus || 'Unknown';
          vehiclesByStatus[status] = (vehiclesByStatus[status] || 0) + 1;
          
          const type = vehicle.vehicleType || 'Unknown';
          vehiclesByType[type] = (vehiclesByType[type] || 0) + 1;
        });

        // Build deployment history by cross-referencing with inspection data
        const inspectionsByVehicle = new Map<string, any>();
        (topVehicles.results as any[]).forEach((v: any) => {
          inspectionsByVehicle.set(v.vehicleId, v);
        });

        deploymentHistory = vehicles.map((vehicle: VehicleRecord) => {
          const inspectionData = inspectionsByVehicle.get(vehicle.regUnit);
          return {
            vehicleId: vehicle.id,
            regUnit: vehicle.regUnit,
            lastDeployment: vehicle.lastInspectionDate,  // Using lastInspectionDate as deployment proxy
            inspectionCount: inspectionData?.count || 0,
            lastInspection: inspectionData?.lastInspection,
            status: vehicle.vehicleStatus || 'Unknown'
          };
        }).sort((a, b) => b.inspectionCount - a.inspectionCount).slice(0, 20);
      } catch (error) {
        console.error('[ANALYTICS] Airtable fetch error:', error);
        // Continue with partial data if Airtable fails
      }
    }

    // ===== BUILD RESPONSE =====

    // Transform vehiclesByStatus into array format for charts
    const vehicleStatusData = Object.entries(vehiclesByStatus).map(([status, count]) => ({
      status,
      count
    }));
    
    // Transform formsPerDay for submission trend
    const submissionTrend = (formsPerDay.results as any[]).map((row: any) => ({
      date: row.date,
      submissions: row.count
    }));
    
    // Transform form type distribution (currently only ICS-212, but structure for future)
    const formTypeDistribution = [
      {
        formType: 'ICS-212',
        count: totalForms,
        percentage: 100
      }
    ];
    
    // Transform recent forms into recentSubmissions
    const recentSubmissions = (recentForms.results as any[]).map((form: any) => ({
      id: form.form_id,
      formType: 'ICS-212',
      vehicle: form.vehicle_id_no,
      date: form.created_at,
      status: form.release_decision === 'hold' ? 'Hold' : 
              form.release_decision === 'released' ? 'Released' : 'Pending'
    }));
    
    // Transform safety failures to match expected format
    const transformedSafetyFailures = Object.entries(failureCounts)
      .map(([item, count]) => ({ item, failureCount: count }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10);

    // Build response matching frontend's expected structure
    const response = {
      statistics: {
        totalSubmissions: totalForms,
        totalSubmissionsTrend: 0, // TODO: Calculate trend vs previous period
        completionRate: totalForms > 0 ? ((totalForms - 0) / totalForms) * 100 : 0,
        completionRateTrend: 0, // TODO: Calculate trend
        pendingForms: 0, // TODO: Count forms without PDF or incomplete
        releasedVehicles: totalForms - holdCount,
        holdVehicles: holdCount,
        averageCompletionTime: 15 // TODO: Calculate actual completion time
      },
      submissionTrend,
      formTypeDistribution,
      vehicleStatusData,
      safetyItemFailures: transformedSafetyFailures,
      recentSubmissions
    };

    return jsonResponse(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[ANALYTICS] Processing error:', error);
    return jsonResponse(
      {
        error: 'Failed to generate analytics',
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
