/**
 * Forms Management Handler
 * Handles dynamic apparatus inventory form management
 */

import type { Env } from '../index';

export interface ChecklistData {
  title: string;
  compartments: Compartment[];
  dailySchedule?: DailyTask[];
  officerChecklist?: OfficerCheckItem[];
}

export interface Compartment {
  id: string;
  title: string;
  items: CompartmentItem[];
}

export interface CompartmentItem {
  name: string;
  inputType?: string;
  expectedQuantity?: number;
}

export interface DailyTask {
  day: string;
  tasks: string[];
}

export interface OfficerCheckItem {
  id: string;
  name: string;
  inputType?: string;
  required?: boolean;
}

/**
 * List all apparatus (public endpoint for login dropdown)
 */
export async function handleListApparatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await db
      .prepare('SELECT name FROM apparatus WHERE active = 1 ORDER BY name')
      .all();

    return new Response(JSON.stringify({ apparatus: result.results.map((r: any) => r.name) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing apparatus:', error);
    return new Response(JSON.stringify({ error: 'Failed to list apparatus' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get form for a specific apparatus (public endpoint for inspections)
 */
export async function handleGetFormByApparatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  apparatusName: string
): Promise<Response> {
  try {
    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await db
      .prepare(`
        SELECT t.json
        FROM apparatus a
        JOIN form_templates t ON a.template_id = t.id
        WHERE a.name = ? AND a.active = 1
      `)
      .bind(apparatusName)
      .first();

    if (!result) {
      return new Response(JSON.stringify({ error: 'Apparatus not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and return the JSON form
    const formData = JSON.parse(result.json as string);
    return new Response(JSON.stringify(formData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting form:', error);
    return new Response(JSON.stringify({ error: 'Failed to get form' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * List all forms/templates (admin only)
 */
export async function handleListForms(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Check admin auth
    if (request.headers.get('X-Admin-Password') !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all templates
    const templates = await db
      .prepare('SELECT id, name, modified_at FROM form_templates ORDER BY name')
      .all();

    // Get all apparatus
    const apparatus = await db
      .prepare('SELECT name, template_id FROM apparatus WHERE active = 1 ORDER BY name')
      .all();

    // Group apparatus by template
    const templateMap = new Map<string, any>();
    for (const template of templates.results) {
      templateMap.set((template as any).id, {
        id: (template as any).id,
        name: (template as any).name,
        modified_at: (template as any).modified_at,
        apparatus: []
      });
    }

    for (const app of apparatus.results) {
      const templateId = (app as any).template_id;
      if (templateMap.has(templateId)) {
        templateMap.get(templateId)!.apparatus.push((app as any).name);
      }
    }

    return new Response(JSON.stringify({ templates: Array.from(templateMap.values()) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing forms:', error);
    return new Response(JSON.stringify({ error: 'Failed to list forms' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get a specific template by ID (admin only)
 */
export async function handleGetTemplate(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  templateId: string
): Promise<Response> {
  try {
    // Check admin auth
    if (request.headers.get('X-Admin-Password') !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const template = await db
      .prepare('SELECT json, name FROM form_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      form: JSON.parse(template.json as string),
      name: template.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting template:', error);
    return new Response(JSON.stringify({ error: 'Failed to get template' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Create new apparatus/form (admin only)
 */
export async function handleCreateForm(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Check admin auth
    if (request.headers.get('X-Admin-Password') !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as any;
    const { apparatus: apparatusName, baseTemplateId, templateName, formJson } = body;

    if (!apparatusName) {
      return new Response(JSON.stringify({ error: 'Apparatus name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if apparatus already exists
    const existing = await db
      .prepare('SELECT id FROM apparatus WHERE name = ?')
      .bind(apparatusName)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Apparatus already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();
    let templateId: string;
    let jsonContent: string;

    // Determine what to do based on input
    if (baseTemplateId) {
      // Clone existing template
      const baseTemplate = await db
        .prepare('SELECT json FROM form_templates WHERE id = ?')
        .bind(baseTemplateId)
        .first();

      if (!baseTemplate) {
        return new Response(JSON.stringify({ error: 'Base template not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      templateId = baseTemplateId;
      jsonContent = baseTemplate.json as string;
    } else {
      // Create new template
      templateId = crypto.randomUUID();
      const templateNameToUse = templateName || apparatusName;

      if (formJson) {
        jsonContent = JSON.stringify(formJson);
      } else {
        // Create empty template
        jsonContent = JSON.stringify({
          title: `${templateNameToUse} Inventory`,
          compartments: [],
          dailySchedule: [],
          officerChecklist: []
        });
      }

      // Insert new template
      await db
        .prepare(`
          INSERT INTO form_templates (id, name, json, created_at, modified_at, published_version)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(templateId, templateNameToUse, jsonContent, now, now, 1)
        .run();

      // Create initial version
      await db
        .prepare(`
          INSERT INTO form_versions (template_id, json, created_at, created_by, change_summary, is_published)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(templateId, jsonContent, now, 'Admin', 'Initial version', 1)
        .run();
    }

    // Create apparatus entry
    const apparatusId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO apparatus (id, name, template_id, active)
        VALUES (?, ?, ?, ?)
      `)
      .bind(apparatusId, apparatusName, templateId, 1)
      .run();

    return new Response(JSON.stringify({ 
      success: true, 
      apparatusId,
      templateId 
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating form:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      type: typeof error,
      error: JSON.stringify(error, null, 2)
    });
    return new Response(JSON.stringify({ 
      error: 'Failed to create form',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update form template (admin only)
 */
export async function handleUpdateForm(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  templateId: string
): Promise<Response> {
  try {
    // Check admin auth
    if (request.headers.get('X-Admin-Password') !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const db = env.SUPPLY_DB || env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as any;
    const { formJson, publish, changeSummary } = body;

    if (!formJson) {
      return new Response(JSON.stringify({ error: 'Form data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();
    const jsonContent = JSON.stringify(formJson);

    // Create new version
    const versionResult = await db
      .prepare(`
        INSERT INTO form_versions (template_id, json, created_at, created_by, change_summary, is_published)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        templateId,
        jsonContent,
        now,
        'Admin',
        changeSummary || 'Form updated',
        publish ? 1 : 0
      )
      .run();

    if (publish) {
      // Update template with new content
      await db
        .prepare(`
          UPDATE form_templates
          SET json = ?, modified_at = ?, published_version = ?
          WHERE id = ?
        `)
        .bind(jsonContent, now, versionResult.meta.last_row_id, templateId)
        .run();

      // Mark old versions as not published
      await db
        .prepare(`
          UPDATE form_versions
          SET is_published = 0
          WHERE template_id = ? AND version_id != ?
        `)
        .bind(templateId, versionResult.meta.last_row_id)
        .run();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      templateId,
      version: versionResult.meta.last_row_id,
      published: !!publish
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return new Response(JSON.stringify({ error: 'Failed to update form' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * AI Import: Convert PDF text to form JSON (admin only)
 */
export async function handleImportForm(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Check admin auth
    if (request.headers.get('X-Admin-Password') !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!env.AI) {
      return new Response(JSON.stringify({ 
        error: 'AI not configured',
        message: 'Workers AI binding is not available'
      }), {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as any;
    const { text, fileName } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Limit text size to prevent abuse (100KB)
    if (text.length > 100000) {
      return new Response(JSON.stringify({ error: 'Text content too large (max 100KB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build AI prompt
    const systemPrompt = `You are an inventory assistant. Convert document text into a JSON object representing an apparatus inventory form. Use this exact JSON structure:
{
  "title": "string",
  "compartments": [
    {
      "title": "string",
      "items": [
        {
          "name": "string",
          "inputType": "checkbox",
          "expectedQuantity": number
        }
      ]
    }
  ],
  "dailySchedule": [
    {
      "day": "string",
      "tasks": ["string"]
    }
  ],
  "officerChecklist": [
    {
      "id": "string",
      "name": "string",
      "inputType": "string",
      "required": boolean
    }
  ]
}

RULES:
1. Only include items found in the text - do not invent items
2. Extract compartments as sections/headings
3. Extract items as list entries under compartments
4. If quantities are mentioned (e.g., "2 SCBA bottles"), use expectedQuantity
5. If daily tasks are mentioned, include in dailySchedule
6. If officer checks are mentioned, include in officerChecklist
7. Output ONLY valid JSON, no markdown or explanation
8. If compartments have no clear structure use "items" as id for generic items`;

    const userPrompt = `Convert this inventory document to JSON:\n\n${text}`;

    try {
      const aiResponse = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      let responseText = aiResponse.response || '';
      
      // Clean response (remove markdown if present)
      responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      responseText = responseText.trim();

      // Try to parse JSON
      let formData: any;
      try {
        formData = JSON.parse(responseText);
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          formData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }

      // Validate basic structure
      if (!formData.compartments || !Array.isArray(formData.compartments)) {
        formData.compartments = [];
      }

      // Generate IDs for compartments if missing
      formData.compartments = formData.compartments.map((comp: any, idx: number) => ({
        id: comp.id || `compartment_${idx + 1}`,
        title: comp.title || `Compartment ${idx + 1}`,
        items: comp.items || []
      }));

      // Ensure all items have inputType
      formData.compartments.forEach((comp: any) => {
        comp.items = comp.items.map((item: any) => ({
          name: item.name,
          inputType: item.inputType || 'checkbox',
          expectedQuantity: item.expectedQuantity
        }));
      });

      console.log(`AI import successful: ${fileName || 'unknown'}`);

      return new Response(JSON.stringify({ form: formData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Check if quota exceeded
      const errorMessage = aiError instanceof Error ? aiError.message : '';
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return new Response(JSON.stringify({ 
          error: 'AI quota exceeded',
          message: 'Daily AI quota has been reached. Please try again tomorrow.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: 'AI processing failed',
        message: errorMessage || 'Unknown AI error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error importing form:', error);
    return new Response(JSON.stringify({ error: 'Failed to import form' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
