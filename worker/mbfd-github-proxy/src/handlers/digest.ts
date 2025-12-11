/**
 * Manual Digest Handler
 * 
 * Admin-only endpoint to manually trigger daily digest email
 * Useful for testing and on-demand report generation
 */

import { sendDailyDigest } from '../digest';

interface Env {
  ADMIN_PASSWORD: string;
  MBFD_CONFIG: KVNamespace;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  GMAIL_SENDER_EMAIL: string;
}

function verifyAdminPassword(request: Request, env: Env): boolean {
  const providedPassword = request.headers.get('X-Admin-Password');
  return providedPassword === env.ADMIN_PASSWORD;
}

export async function handleManualDigest(
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
    await sendDailyDigest(env);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Daily digest sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error sending manual digest:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send digest',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}