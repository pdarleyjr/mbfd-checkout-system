/**
 * MBFD GitHub API Proxy Worker
 * 
 * This worker acts as a secure proxy for GitHub API requests.
 * Security features:
 * - Admin password is stored as environment variable (not in code)
 * - Origin restriction to prevent unauthorized domains from accessing the API
 * - Token is never exposed to the frontend
 */

interface Env {
  GITHUB_TOKEN: string;
  ADMIN_PASSWORD: string;
}

const REPO_OWNER = 'pdarleyjr';
const REPO_NAME = 'mbfd-checkout-system';
const ALLOWED_ORIGIN = 'https://pdarleyjr.github.io';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check endpoint (always accessible)
    if (path === '/health') {
      return jsonResponse({ 
        status: 'ok', 
        service: 'MBFD GitHub Proxy', 
        tokenConfigured: !!env.GITHUB_TOKEN,
        adminPasswordConfigured: !!env.ADMIN_PASSWORD
      });
    }

    // Origin check for security (allow requests only from our app)
    // Note: If deploying to a custom domain, update ALLOWED_ORIGIN constant
    const origin = request.headers.get('Origin');
    if (origin && !origin.startsWith(ALLOWED_ORIGIN)) {
      console.error('Forbidden: Invalid origin', origin);
      return jsonResponse(
        { error: 'Forbidden', message: 'Access denied from this origin' },
        { status: 403 }
      );
    }

    // Check if GitHub token is configured for all other endpoints
    if (!env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set');
      return jsonResponse(
        { 
          error: 'Server configuration error', 
          message: 'GitHub token not configured. Please set GITHUB_TOKEN in Cloudflare Worker settings.' 
        },
        { status: 500 }
      );
    }

    // Check if admin password is configured
    if (!env.ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return jsonResponse(
        { 
          error: 'Server configuration error', 
          message: 'Admin password not configured. Please set ADMIN_PASSWORD in Cloudflare Worker settings.' 
        },
        { status: 500 }
      );
    }

    // Check if this is an admin-only endpoint (NOT issue creation or listing)
    // Public operations: Creating issues, listing defects for specific apparatus
    // Admin operations: Listing ALL defects (no apparatus filter), updating/closing issues
    const labelsParam = url.searchParams.get('labels') || '';
    const hasApparatusFilter = labelsParam.includes('Rescue') || labelsParam.includes('Engine');
    
    const isAdminEndpoint = path.includes('/admin/') || 
                            path.includes('/resolve') || 
                            (path.startsWith('/api/issues/') && request.method === 'PATCH') ||
                            (path === '/api/issues' && request.method === 'GET' && !hasApparatusFilter);
    
    if (isAdminEndpoint) {
      // Verify admin password from request header
      const password = request.headers.get('X-Admin-Password');
      if (password !== env.ADMIN_PASSWORD) {
        console.warn('Unauthorized admin access attempt');
        return jsonResponse(
          { error: 'Unauthorized. Invalid admin password.' },
          { status: 401 }
        );
      }
    }

    // Route to appropriate handler
    if (path.startsWith('/api/issues')) {
      return handleIssuesRequest(request, env, url);
    }

    return jsonResponse({ error: 'Not found' }, { status: 404 });
  },
};

async function handleIssuesRequest(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const path = url.pathname.replace('/api/issues', '');
  
  try {
    // List issues (admin-only for viewing all defects)
    if (request.method === 'GET' && path === '') {
      const state = url.searchParams.get('state') || 'open';
      const labels = url.searchParams.get('labels') || '';
      const per_page = url.searchParams.get('per_page') || '100';

      const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&labels=${labels}&per_page=${per_page}`;
      
      const response = await fetch(githubUrl, {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MBFD-Checkout-System',
        },
      });

      const data = await response.json();
      return jsonResponse(data);
    }

    // Create issue (public - for defect/log creation)
    if (request.method === 'POST' && path === '') {
      const body = await request.json();
      
      const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
      
      const response = await fetch(githubUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MBFD-Checkout-System',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('GitHub API Error creating issue:', response.status, errorData);
        return jsonResponse(
          { 
            error: 'GitHub API Error',
            status: response.status,
            message: errorData.message || response.statusText,
            details: errorData
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`Created issue #${(data as any).number}`);
      return jsonResponse(data, { status: response.status });
    }

    // Update issue (admin-only - for closing/resolving)
    if (request.method === 'PATCH' && path.match(/^\/\d+$/)) {
      const issueNumber = path.substring(1);
      const body = await request.json();
      
      const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
      
      const response = await fetch(githubUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MBFD-Checkout-System',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('GitHub API Error updating issue:', issueNumber, response.status, errorData);
      } else {
        console.log(`Updated issue #${issueNumber}`);
      }

      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    }

    // Create comment (public for verification, admin for resolution)
    if (request.method === 'POST' && path.match(/^\/\d+\/comments$/)) {
      const issueNumber = path.split('/')[1];
      const body = await request.json();
      
      const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
      
      const response = await fetch(githubUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MBFD-Checkout-System',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('GitHub API Error adding comment:', issueNumber, response.status, errorData);
      } else {
        console.log(`Added comment to issue #${issueNumber}`);
      }

      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    }

    return jsonResponse({ error: 'Invalid issues endpoint' }, { status: 404 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error handling request for', url.pathname, ':', errorMessage);
    return jsonResponse(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}

function jsonResponse(data: any, options: { status?: number } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    },
  });
}

// Future improvements to consider:
// - Rate limiting per IP or user agent
// - Request logging to Cloudflare Analytics
// - Caching GET requests with short TTL
// - Input validation for request bodies
// - Retry logic for transient GitHub API failures
