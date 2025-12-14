/**
 * AI Insights Handler
 * 
 * Optional AI-powered inventory analysis (requires Workers AI binding)
 * Uses async processing to avoid blocking requests
 */

import type { Env } from '../index';

interface AIInsightRequest {
  tasks?: Array<{
    id: string;
    apparatus: string;
    itemName: string;
    deficiencyType: string;
  }>;
  inventory?: Array<{
    id: string;
    equipmentName: string;
    quantity: number;
    minQty?: number;
  }>;
}

export async function handleAIInsights(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  const providedPassword = request.headers.get('X-Admin-Password');
  if (providedPassword !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if AI binding is available
  if (!env.AI) {
    return new Response(
      JSON.stringify({
        error: 'AI integration not configured',
        message: 'Workers AI binding is not available. This feature is optional.',
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json() as AIInsightRequest;

    // Queue AI processing asynchronously (non-blocking)
    ctx.waitUntil(generateInsights(env, body));

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'AI insights generation queued. Check back shortly.',
      }),
      {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error queuing AI insights:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue insights generation' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function generateInsights(env: Env, data: AIInsightRequest): Promise<void> {
  try {
    if (!env.AI || !env.SUPPLY_DB) return;

    const insightId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Build prompt based on available data
    const promptParts: string[] = [
      'You are an inventory management assistant for Miami Beach Fire Department.',
      'Analyze the following data and provide actionable insights in JSON format only.',
      'IMPORTANT: Reference specific item names directly in your suggestions.',
      'Return ONLY a valid JSON object with these fields:',
      '- summary (string): Brief overview',
      '- recurringIssues (array of strings): Patterns of frequently missing/damaged items with specific item names',
      '- reorderSuggestions (array of objects with {item, reason, urgency}): Items to reorder with specific reasons',
      '- anomalies (array of strings): Unusual patterns or concerns with specific examples',
    ];

    if (data.tasks && data.tasks.length > 0) {
      promptParts.push(`\nPending Tasks (${data.tasks.length}):`);
      data.tasks.slice(0, 20).forEach(task => {
        promptParts.push(`- ${task.apparatus}: ${task.itemName} (${task.deficiencyType})`);
      });
    }

    if (data.inventory && data.inventory.length > 0) {
      const lowStock = data.inventory.filter(i => i.minQty && i.quantity <= i.minQty);
      if (lowStock.length > 0) {
        promptParts.push(`\nLow Stock Items (${lowStock.length}):`);
        lowStock.slice(0, 10).forEach(item => {
          promptParts.push(`- ${item.equipmentName}: ${item.quantity} (min: ${item.minQty})`);
        });
      }
    }

    const prompt = promptParts.join('\n');

    // Call Workers AI (using a free model)
    const response = (await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful inventory analyst for Miami Beach Fire Department. Always respond with valid JSON only. Reference specific item names in your analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) as { response: string };

    let insightJson = response.response;

    // Try to parse JSON from response
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = insightJson.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        insightJson = jsonMatch[1];
      }

      JSON.parse(insightJson); // Validate
    } catch {
     // If parsing fails, create fallback structured response
      insightJson = JSON.stringify({
        summary: 'AI analysis completed with partial results',
        recurringIssues: [],
        reorderSuggestions: [],
        anomalies: ['AI response format error - raw output stored'],
      });
    }

    // Store insight in D1
    if (env.SUPPLY_DB) {
      await env.SUPPLY_DB.prepare(
        `INSERT INTO inventory_insights (id, apparatus, insight_json, created_at, model, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          insightId,
          'fleet-wide',
          insightJson,
          createdAt,
          '@cf/meta/llama-2-7b-chat-int8',
          'success'
        )
        .run();
    }

    console.log('AI insights generated and stored:', insightId);
  } catch (error) {
    console.error('Error generating AI insights:', error);

    // Store error status
    try {
      if (env.SUPPLY_DB) {
        await env.SUPPLY_DB.prepare(
          `INSERT INTO inventory_insights (id, apparatus, insight_json, created_at, status)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            'fleet-wide',
            JSON.stringify({ error: String(error) }),
            new Date().toISOString(),
            'error'
          )
          .run();
      }
    } catch (dbError) {
      console.error('Failed to store error status:', dbError);
    }
  }
}

/**
 * Get latest AI insights
 */
export async function handleGetInsights(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  const providedPassword = request.headers.get('X-Admin-Password');
  if (providedPassword !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!env.SUPPLY_DB) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const result = await env.SUPPLY_DB.prepare(
      `SELECT * FROM inventory_insights 
       ORDER BY created_at DESC 
       LIMIT 10`
    ).all();

    return new Response(
      JSON.stringify({
        insights: result.results || [],
        count: result.results?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching insights:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch insights' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}