/**
 * ICS-218 Password Validation Handler
 * 
 * Provides server-side password validation for ICS 218 form access.
 * Password is stored as environment variable ICS218_PASSWORD.
 * 
 * Security:
 * - Password never exposed to frontend
 * - Server-side validation only
 * - CORS restricted to authorized origins
 */

import type { Env } from '../index';

interface PasswordValidationRequest {
  password: string;
}

interface PasswordValidationResponse {
  success: boolean;
  message?: string;
}

/**
 * Handle ICS 218 password validation
 * 
 * @param request - HTTP POST request with password in body
 * @param env - Cloudflare Worker environment with ICS218_PASSWORD
 * @param corsHeaders - CORS headers for response
 * @returns JSON response indicating success or failure
 */
export async function handleICS218PasswordValidation(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Only allow POST method
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, message: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Parse request body
    const body: PasswordValidationRequest = await request.json();

    // Validate request format
    if (!body.password || typeof body.password !== 'string') {
      return jsonResponse(
        { success: false, message: 'Password is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if ICS 218 password is configured
    if (!env.ICS218_PASSWORD) {
      console.error('ICS218_PASSWORD environment variable not configured');
      return jsonResponse(
        { success: false, message: 'Password validation unavailable' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Validate password
    const isValid = body.password === env.ICS218_PASSWORD;

    if (isValid) {
      console.log('ICS 218 password validation: SUCCESS');
      return jsonResponse(
        { success: true, message: 'Password validated successfully' },
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.warn('ICS 218 password validation: FAILED');
      return jsonResponse(
        { success: false, message: 'Invalid password' },
        { status: 401, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('ICS 218 password validation error:', error);
    return jsonResponse(
      { 
        success: false, 
        message: 'Server error during password validation' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to create JSON responses
 */
function jsonResponse(
  data: any,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
