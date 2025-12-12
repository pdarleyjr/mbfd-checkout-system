/**
 * Tasks Handler
 * 
 * Handles API endpoints for supply task management
 */

import { Env } from '../index';
import { readSheet } from '../google-sheets';

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

export interface SuggestedReplacement {
  itemId: string;
  itemName: string;
  qtyOnHand: number;
  location?: string;
  confidence?: number;
}

/**
 * Match an item name against inventory items
 */
async function findInventoryMatches(
  env: Env,
  itemName: string
): Promise<SuggestedReplacement[]> {
  try {
    // Read inventory from Google Sheet
    const values = await readSheet(env, env.GOOGLE_SHEET_ID, 'Sheet1!A2:I1000');
    
    // Normalize search term
    const normalized = normalizeString(itemName);
    const suggestions: SuggestedReplacement[] = [];

    values.forEach((row, index) => {
      const equipmentName = row[3] || '';
      const normalizedName = normalizeString(equipmentName);
      
      // Calculate match confidence
      let confidence = 0;
      
      // Exact match
      if (normalizedName === normalized) {
        confidence = 1.0;
      }
      // Contains match
      else if (normalizedName.includes(normalized) || normalized.includes(normalizedName)) {
        confidence = 0.8;
      }
      // Token overlap
      else {
        const searchTokens = normalized.split(/\s+/);
        const nameTokens = normalizedName.split(/\s+/);
        const overlap = searchTokens.filter(t => nameTokens.includes(t)).length;
        if (overlap > 0) {
          confidence = 0.6 * (overlap / Math.max(searchTokens.length, nameTokens.length));
        }
      }

      if (confidence > 0.5) {
        suggestions.push({
          itemId: `item_${index + 1}`,
          itemName: equipmentName,
          qtyOnHand: parseInt(row[4] || '0', 10),
          location: row[6] || 'Supply Closet',
          confidence,
        });
      }
    });

    // Sort by confidence descending
    suggestions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    return suggestions.slice(0, 5); // Return top 5 matches
  } catch (error) {
    console.error('Error finding inventory matches:', error);
    return [];
  }
}

/**
 * Normalize string for matching
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse spaces
}

/**
 * POST /api/tasks - Create new supply tasks
 */
export async function handleCreateTasks(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body: {
      tasks: Array<{
        apparatus: string;
        compartment?: string;
        item: string;
        deficiencyType: 'missing' | 'damaged';
        createdBy?: string;
        notes?: string;
      }>
    } = await request.json();

    if (!body.tasks || !Array.isArray(body.tasks)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: tasks array required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // INPUT VALIDATION: Validate each task structure
    for (let i = 0; i < body.tasks.length; i++) {
      const task = body.tasks[i];
      
      // Validate required fields
      if (!task.apparatus || typeof task.apparatus !== 'string') {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: apparatus is required and must be a string` 
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

      if (!task.item || typeof task.item !== 'string') {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: item is required and must be a string` 
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

      if (task.deficiencyType !== 'missing' && task.deficiencyType !== 'damaged') {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: deficiencyType must be 'missing' or 'damaged'` 
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

      // Validate string lengths to prevent abuse
      if (task.apparatus.length > 100) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: apparatus name too long (max 100 characters)` 
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

      if (task.item.length > 200) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: item name too long (max 200 characters)` 
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

      if (task.notes && task.notes.length > 1000) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task at index ${i}: notes too long (max 1000 characters)` 
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
    }

    // Limit number of tasks per request
    const MAX_TASKS_PER_REQUEST = 50;
    if (body.tasks.length > MAX_TASKS_PER_REQUEST) {
      return new Response(
        JSON.stringify({ 
          error: `Too many tasks in single request. Maximum allowed: ${MAX_TASKS_PER_REQUEST}`,
          requestedCount: body.tasks.length
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

    if (!env.SUPPLY_DB) {
      return new Response(
        JSON.stringify({ error: 'D1 database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const createdTasks: SupplyTask[] = [];

    for (const taskData of body.tasks) {
      // Find matching inventory items
      const suggestions = await findInventoryMatches(env, taskData.item);
      
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const task: SupplyTask = {
        id: taskId,
        apparatus: taskData.apparatus,
        compartment: taskData.compartment,
        itemName: taskData.item,
        deficiencyType: taskData.deficiencyType,
        suggestedReplacements: suggestions,
        status: 'pending',
        createdBy: taskData.createdBy || 'System',
        createdAt: now,
        notes: taskData.notes,
      };

      // Insert into D1
      await env.SUPPLY_DB.prepare(
        `INSERT INTO supply_tasks (
          id, apparatus, compartment, item_name, deficiency_type,
          suggested_replacements, status, created_by, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          task.id,
          task.apparatus,
          task.compartment || null,
          task.itemName,
          task.deficiencyType,
          JSON.stringify(task.suggestedReplacements || []),
          task.status,
          task.createdBy,
          task.createdAt,
          task.notes || null
        )
        .run();

      createdTasks.push(task);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasks: createdTasks,
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
    console.error('Error creating tasks:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create tasks',
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
 * GET /api/tasks - List supply tasks
 */
export async function handleGetTasks(
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

    if (!env.SUPPLY_DB) {
      return new Response(
        JSON.stringify({ error: 'D1 database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    // Query tasks from D1
    const result = await env.SUPPLY_DB.prepare(
      `SELECT * FROM supply_tasks WHERE status = ? ORDER BY created_at DESC`
    )
      .bind(status)
      .all();

    const tasks: SupplyTask[] = result.results.map((row: any) => ({
      id: row.id,
      apparatus: row.apparatus,
      compartment: row.compartment,
      itemName: row.item_name,
      itemId: row.item_id,
      deficiencyType: row.deficiency_type,
      suggestedReplacements: row.suggested_replacements
        ? JSON.parse(row.suggested_replacements)
        : [],
      chosenReplacement: row.chosen_replacement
        ? JSON.parse(row.chosen_replacement)
        : null,
      qtyToTransfer: row.qty_to_transfer,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      completedBy: row.completed_by,
      completedAt: row.completed_at,
      notes: row.notes,
    }));

    return new Response(
      JSON.stringify({
        tasks,
        count: tasks.length,
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
    console.error('Error fetching tasks:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch tasks',
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
 * PATCH /api/tasks/:id - Update a task
 */
export async function handleUpdateTask(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  taskId: string
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

    if (!env.SUPPLY_DB) {
      return new Response(
        JSON.stringify({ error: 'D1 database not configured' }),
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
      status?: 'pending' | 'completed' | 'canceled';
      chosenReplacement?: {
        itemId: string;
        itemName: string;
        qty: number;
      };
      completedBy?: string;
      notes?: string;
    } = await request.json();

    if (body.status === 'completed' && body.chosenReplacement) {
      // Need to adjust inventory
      const { handleAdjustInventory } = await import('./inventory');
      
      // Create an adjustment request
      const adjustRequest = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          itemId: body.chosenReplacement.itemId,
          delta: -body.chosenReplacement.qty,
          reason: `Task ${taskId} completed`,
          taskId: taskId,
          performedBy: body.completedBy || 'Admin',
        }),
      });

      const adjustResponse = await handleAdjustInventory(adjustRequest, env, corsHeaders);
      
      if (!adjustResponse.ok) {
        const error = await adjustResponse.json();
        return new Response(
          JSON.stringify({
            error: 'Failed to adjust inventory',
            details: error,
          }),
          {
            status: adjustResponse.status,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Update task in D1
    const updates: string[] = [];
    const bindings: any[] = [];

    if (body.status) {
      updates.push('status = ?');
      bindings.push(body.status);
      
      if (body.status === 'completed') {
        updates.push('completed_at = ?');
        bindings.push(new Date().toISOString());
        
        if (body.completedBy) {
          updates.push('completed_by = ?');
          bindings.push(body.completedBy);
        }
      }
    }

    if (body.chosenReplacement) {
      updates.push('chosen_replacement = ?');
      bindings.push(JSON.stringify(body.chosenReplacement));
    }

    if (body.notes) {
      updates.push('notes = ?');
      bindings.push(body.notes);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No updates provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    bindings.push(taskId);

    await env.SUPPLY_DB.prepare(
      `UPDATE supply_tasks SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...bindings)
      .run();

    // Fetch updated task
    const result = await env.SUPPLY_DB.prepare(
      `SELECT * FROM supply_tasks WHERE id = ?`
    )
      .bind(taskId)
      .first();

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const task: SupplyTask = {
      id: result.id as string,
      apparatus: result.apparatus as string,
      compartment: result.compartment as string | undefined,
      itemName: result.item_name as string,
      itemId: result.item_id as string | undefined,
      deficiencyType: result.deficiency_type as 'missing' | 'damaged',
      suggestedReplacements: result.suggested_replacements
        ? JSON.parse(result.suggested_replacements as string)
        : [],
      chosenReplacement: result.chosen_replacement
        ? JSON.parse(result.chosen_replacement as string)
        : null,
      qtyToTransfer: result.qty_to_transfer as number | undefined,
      status: result.status as 'pending' | 'completed' | 'canceled',
      createdBy: result.created_by as string,
      createdAt: result.created_at as string,
      completedBy: result.completed_by as string | undefined,
      completedAt: result.completed_at as string | undefined,
      notes: result.notes as string | undefined,
    };

    return new Response(
      JSON.stringify({
        success: true,
        task,
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
    console.error('Error updating task:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update task',
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
