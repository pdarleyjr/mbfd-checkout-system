/**
 * Vehicle API Handler
 * Provides REST endpoints for USAR vehicle database operations
 */

import { createAirtableClient, VehicleRecord } from '../integrations/airtable';

interface Env {
  AIRTABLE_API_TOKEN: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
}

/**
 * Handle vehicle-related API requests
 */
export async function handleVehicles(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Airtable client
    const airtable = createAirtableClient(env);

    // Route: GET /api/vehicles - List all vehicles
    if (path === '/api/vehicles' && method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');

      let vehicles: VehicleRecord[];

      if (search) {
        // Search by reg/unit
        vehicles = await airtable.searchByRegUnit(search);
      } else if (status) {
        // Filter by status
        vehicles = await airtable.getVehiclesByStatus(status as any);
      } else {
        // Get all vehicles
        vehicles = await airtable.fetchVehicles();
      }

      return new Response(JSON.stringify({ vehicles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: GET /api/vehicles/:id - Get single vehicle
    if (path.startsWith('/api/vehicles/') && method === 'GET') {
      const id = path.split('/').pop();
      if (!id) {
        return new Response(JSON.stringify({ error: 'Vehicle ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vehicle = await airtable.getVehicleById(id);
      if (!vehicle) {
        return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ vehicle }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: POST /api/vehicles - Create new vehicle
    if (path === '/api/vehicles' && method === 'POST') {
      const body = await request.json() as Omit<VehicleRecord, 'id'>;
      
      // Validate required fields
      if (!body.regUnit || !body.vehicleMake) {
        return new Response(JSON.stringify({ error: 'Missing required fields: regUnit, vehicleMake' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vehicle = await airtable.createVehicle(body);
      return new Response(JSON.stringify({ vehicle }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: PATCH /api/vehicles/:id - Update vehicle
    if (path.startsWith('/api/vehicles/') && method === 'PATCH') {
      const id = path.split('/').pop();
      if (!id) {
        return new Response(JSON.stringify({ error: 'Vehicle ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updates = await request.json() as Partial<VehicleRecord>;
      const vehicle = await airtable.updateVehicle(id, updates);

      return new Response(JSON.stringify({ vehicle }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: DELETE /api/vehicles/:id - Delete vehicle
    if (path.startsWith('/api/vehicles/') && method === 'DELETE') {
      const id = path.split('/').pop();
      if (!id) {
        return new Response(JSON.stringify({ error: 'Vehicle ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await airtable.deleteVehicle(id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: GET /api/vehicles/autocomplete - Autocomplete suggestions
    if (path === '/api/vehicles/autocomplete' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      
      if (query.length < 2) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vehicles = await airtable.searchByRegUnit(query);
      const suggestions = vehicles.map(v => ({
        id: v.id,
        regUnit: v.regUnit,
        vehicleMake: v.vehicleMake,
        vehicleType: v.vehicleType,
        label: `${v.regUnit} - ${v.vehicleMake} ${v.vehicleType}`.trim()
      }));

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route not found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Vehicle API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
