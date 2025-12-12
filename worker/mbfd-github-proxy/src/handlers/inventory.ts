/**
 * Inventory Handler
 * 
 * Handles API endpoints for supply closet inventory management
 */

import { Env } from '../index';
import { readSheet, writeSheet } from '../google-sheets';

// Inventory item interface
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

/**
 * GET /api/inventory - Retrieve live inventory data from Google Sheets
 */
export async function handleGetInventory(
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

    if (!env.GOOGLE_SHEET_ID) {
      return new Response(
        JSON.stringify({ error: 'Google Sheet ID not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Read inventory from Google Sheet
    // Sheet columns: Shelves (A), Rows (B), Equipment Type (C), Equipment Quantity (D), Manufacturer (E), Location (F), Description (G/H)
    const values = await readSheet(env, env.GOOGLE_SHEET_ID, 'Sheet1!A2:H1000');

    // Transform sheet data into inventory items
    const items: InventoryItem[] = values.map((row, index) => ({
      id: `item_${index + 1}`,
      shelf: row[0] || '',
      row: parseInt(row[1] || '0', 10),
      equipmentType: row[2] || '',
      equipmentName: row[2] || '',
      quantity: parseInt(row[3] || '0', 10),  // Equipment Quantity in column D (index 3)
      manufacturer: row[4] || undefined,       // Manufacturer in column E (index 4)
      location: row[5] || 'Supply Closet',     // Location in column F (index 5)
      description: row[6] || row[7] || undefined, // Description in column G or H
      minQty: undefined, // Not available in current sheet structure
    }));

    return new Response(
      JSON.stringify({
        items,
        fetchedAt: new Date().toISOString(),
        source: 'sheets',
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
    console.error('Error fetching inventory:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch inventory',
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
 * POST /api/inventory/adjust - Adjust inventory quantity (admin only)
 */
export async function handleAdjustInventory(
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
      itemId: string;
      delta: number;
      reason?: string;
      taskId?: string;
      performedBy?: string;
    } = await request.json();

    if (!body.itemId || typeof body.delta !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: itemId, delta' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // INPUT VALIDATION: Limit delta to prevent abuse or accidental large changes
    const MAX_DELTA = 100;
    if (Math.abs(body.delta) > MAX_DELTA) {
      return new Response(
        JSON.stringify({ 
          error: `Delta too large. Maximum allowed adjustment is ±${MAX_DELTA}`,
          requestedDelta: body.delta,
          maxAllowed: MAX_DELTA
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Validate delta is not zero
    if (body.delta === 0) {
      return new Response(
        JSON.stringify({ error: 'Delta cannot be zero' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Extract row number from itemId (format: item_1, item_2, etc.)
    const rowMatch = body.itemId.match(/item_(\d+)/);
    if (!rowMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid itemId format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const rowNumber = parseInt(rowMatch[1], 10) + 1; // +1 for header row, +1 for 0-index

    // Read current quantity from column D
    const values = await readSheet(
      env,
      env.GOOGLE_SHEET_ID,
      `Sheet1!D${rowNumber}`
    );

    if (!values || values.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const currentQty = parseInt(values[0][0] || '0', 10);
    const newQty = currentQty + body.delta;

    if (newQty < 0) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient inventory',
          availableQty: currentQty,
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Update quantity in column D
    await writeSheet(
      env,
      env.GOOGLE_SHEET_ID,
      `Sheet1!D${rowNumber}`,
      [[newQty]]
    );

    // Log the adjustment (could be stored in D1 or KV for audit trail)
    console.log(`Inventory adjusted: ${body.itemId}, delta: ${body.delta}, reason: ${body.reason || 'N/A'}`);

    return new Response(
      JSON.stringify({
        success: true,
        itemId: body.itemId,
        previousQty: currentQty,
        newQty,
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
    console.error('Error adjusting inventory:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to adjust inventory',
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
