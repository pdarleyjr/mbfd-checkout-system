/**
 * Email Configuration Handler
 * 
 * Admin-only endpoints for managing email notification settings
 * Includes get and update operations for EmailConfig
 */

import { getEmailConfig, updateEmailConfig, EmailConfig } from '../kv-helpers';

interface Env {
  ADMIN_PASSWORD: string;
  MBFD_CONFIG: KVNamespace;
}

function verifyAdminPassword(request: Request, env: Env): boolean {
  const providedPassword = request.headers.get('X-Admin-Password');
  return providedPassword === env.ADMIN_PASSWORD;
}

export async function handleGetEmailConfig(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  if (!verifyAdminPassword(request, env)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const config = await getEmailConfig(env);
    
    return new Response(
      JSON.stringify(config),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error getting email config:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve configuration' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function handleUpdateEmailConfig(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  if (!verifyAdminPassword(request, env)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const updates = await request.json() as Partial<EmailConfig>;
    
    // Validate email addresses if recipients are being updated
    if (updates.recipients && Array.isArray(updates.recipients)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of updates.recipients) {
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: `Invalid email address: ${email}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    const updatedConfig = await updateEmailConfig(env, updates);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        config: updatedConfig
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating email config:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update configuration' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}