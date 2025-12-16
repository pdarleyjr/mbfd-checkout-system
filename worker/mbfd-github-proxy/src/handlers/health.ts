/**
 * Integration Health Check Handler
 * 
 * Admin-only endpoint to verify all integrations are functional
 */

import { Env } from '../index';
import { getAccessToken } from '../google-sheets';
import { getGmailAccessToken } from '../gmail';

export interface HealthStatus {
  d1: { status: 'ok' | 'error'; lastCheck: string; error?: string };
  kv: { status: 'ok' | 'error'; lastCheck: string; error?: string };
  sheets: { status: 'ok' | 'error'; lastCheck: string; error?: string };
  gmail: { status: 'ok' | 'error'; lastCheck: string; error?: string };
  workersAI: { status: 'ok' | 'error'; lastCheck: string; error?: string };
  github: { status: 'ok' | 'error'; lastCheck: string; error?: string };
}

export async function handleHealthCheck(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  const password = request.headers.get('X-Admin-Password');
  if (password !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const now = new Date().toISOString();
  const health: HealthStatus = {
    d1: { status: 'ok', lastCheck: now },
    kv: { status: 'ok', lastCheck: now },
    sheets: { status: 'ok', lastCheck: now },
    gmail: { status: 'ok', lastCheck: now },
    workersAI: { status: 'ok', lastCheck: now },
    github: { status: 'ok', lastCheck: now },
  };

  // Check D1
  if (env.SUPPLY_DB) {
    try {
      await env.SUPPLY_DB.prepare('SELECT 1').first();
    } catch (error) {
      health.d1 = {
        status: 'error',
        lastCheck: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    health.d1 = { status: 'error', lastCheck: now, error: 'D1 binding not configured' };
  }

  // Check KV
  if (env.MBFD_CONFIG) {
    try {
      await env.MBFD_CONFIG.put('health_check_test', 'test', { expirationTtl: 60 });
      await env.MBFD_CONFIG.get('health_check_test');
    } catch (error) {
      health.kv = {
        status: 'error',
        lastCheck: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    health.kv = { status: 'error', lastCheck: now, error: 'KV binding not configured' };
  }

  // Check Google Sheets
  if (env.GOOGLE_SHEET_ID) {
    try {
      // Just verify we can authenticate (don't actually read to avoid quota usage)
      await getAccessToken(env);
    } catch (error) {
      health.sheets = {
        status: 'error',
        lastCheck: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    health.sheets = { status: 'error', lastCheck: now, error: 'Sheets not configured' };
  }

  // Check Gmail
  if (env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
    try {
      await getGmailAccessToken(env);
    } catch (error) {
      health.gmail = {
        status: 'error',
        lastCheck: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    health.gmail = { status: 'error', lastCheck: now, error: 'Gmail not configured' };
  }

  // Check Workers AI
  if (env.AI) {
    health.workersAI = { status: 'ok', lastCheck: now };
  } else {
    health.workersAI = { status: 'error', lastCheck: now, error: 'Workers AI not configured' };
  }

  // Check GitHub (via simple API call)
  if (env.GITHUB_TOKEN) {
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'MBFD-Checkout-System',
        },
      });
      if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    } catch (error) {
      health.github = {
        status: 'error',
        lastCheck: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    health.github = { status: 'error', lastCheck: now, error: 'GitHub token not configured' };
  }

  // Overall status
  const allHealthy = Object.values(health).every(h => h.status === 'ok');

  return new Response(
    JSON.stringify({
      overall: allHealthy ? 'healthy' : 'degraded',
      timestamp: now,
      integrations: health,
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
