/**
 * MBFD GitHub API Proxy Worker
 * 
 * This worker acts as a secure proxy for GitHub API requests.
 * Admin password: MBFDsupport!
 */

interface Env {
  GITHUB_TOKEN: string;
}

const ADMIN_PASSWORD = 'MBFDsupport!';
const REPO_OWNER = 'pdarleyjr';
const REPO_NAME = 'mbfd-checkout-system';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        tokenConfigured: !!env.GITHUB_TOKEN 
      });
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

    // Check if this is an admin-only endpoint (NOT issue creation)
    const isAdminEndpoint = path.includes('/admin/') || 
                            path.includes('/resolve') || 
                            (path.startsWith('/api/issues/') && request.method === 'PATCH');
    
    if (isAdminEndpoint) {
      // Verify admin password
      const password = request.headers.get('X-Admin-Password');
      if (password !== ADMIN_PASSWORD) {
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
    // List issues
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

    //Create issue
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
        console.error('GitHub API Error:', response.status, errorData);
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
      return jsonResponse(data, { status: response.status });
    }

    // Update issue (close, etc.)
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

      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    }

    // Create comment
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

      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    }

    return jsonResponse({ error: 'Invalid issues endpoint' }, { status: 404 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    },
  });
}
