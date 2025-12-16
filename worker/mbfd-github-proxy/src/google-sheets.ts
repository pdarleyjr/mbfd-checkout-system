/**
 * Google Sheets API Integration
 * 
 * This module handles Google Sheets API authentication and operations using a service account.
 * The service account allows server-to-server API calls without exposing credentials to the client.
 */

import { Env } from './index';
import { fetchWithRetry } from './retry-helper';

// Google OAuth2 token endpoint
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Cache key for access token
const TOKEN_CACHE_KEY = 'google_oauth_token';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Get a valid OAuth2 access token for Google Sheets API
 * Uses cached token if available and not expired
 */
export async function getAccessToken(env: Env): Promise<string> {
  // Try to get cached token
  if (env.MBFD_CONFIG) {
    try {
      const cachedData = await env.MBFD_CONFIG.get(TOKEN_CACHE_KEY);
      if (cachedData) {
        const cached: CachedToken = JSON.parse(cachedData);
        // Check if token is still valid (with 5 minute buffer)
        if (cached.expiresAt > Date.now() + 300000) {
          console.log('Using cached Google access token');
          return cached.token;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached token:', error);
    }
  }

  // Need to generate a new token
  console.log('Generating new Google access token');
  
  if (!env.GOOGLE_SA_KEY) {
    throw new Error('GOOGLE_SA_KEY not configured');
  }

  // Parse service account key
  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(env.GOOGLE_SA_KEY);
  } catch (error) {
    throw new Error('Invalid GOOGLE_SA_KEY format');
  }

  // Create JWT for service account authentication
  const jwt = await createJWT(serviceAccount);
  
  // Exchange JWT for access token
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData: AccessTokenResponse = await tokenResponse.json();
  
  // Cache the token
  if (env.MBFD_CONFIG) {
    const cached: CachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };
    await env.MBFD_CONFIG.put(
      TOKEN_CACHE_KEY,
      JSON.stringify(cached),
      { expirationTtl: tokenData.expires_in - 60 } // Expire slightly before actual expiration
    );
  }

  return tokenData.access_token;
}

/**
 * Create a signed JWT for Google service account authentication
 */
async function createJWT(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // JWT payload (claims)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: serviceAccount.token_uri || TOKEN_URL,
    exp: expiry,
    iat: now,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Sign the message
  const signature = await signMessage(message, serviceAccount.private_key);
  const encodedSignature = base64UrlEncode(signature);

  return `${message}.${encodedSignature}`;
}

/**
 * Sign a message using RSA-SHA256
 */
async function signMessage(message: string, privateKeyPem: string): Promise<ArrayBuffer> {
  // Import the private key
  const privateKey = await importPrivateKey(privateKeyPem);

  // Sign the message
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const signature = await crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    privateKey,
    data
  );

  return signature;
}

/**
 * Import a PEM-formatted private key
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and newlines
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Decode base64
  const binaryDer = atob(pemContents);
  const bytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    bytes[i] = binaryDer.charCodeAt(i);
  }

  // Import the key
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Base64 URL encoding (without padding)
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    base64 = btoa(binary);
  }

  // Convert to base64url format
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Read data from a Google Sheet
 */
export async function readSheet(
  env: Env,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const token = await getAccessToken(env);
  
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  }, {
    maxRetries: 3,
    initialDelayMs: 200,
    retryableStatuses: [429, 500, 502, 503, 504], // Include 429 for rate limits
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to read sheet: ${error}`);
  }

  const data: { values?: any[][] } = await response.json();
  return data.values || [];
}

/**
 * Write data to a Google Sheet
 */
export async function writeSheet(
  env: Env,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const token = await getAccessToken(env);
  
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values,
    }),
  }, {
    maxRetries: 3,
    initialDelayMs: 200,
    retryableStatuses: [429, 500, 502, 503, 504],
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to write to sheet: ${error}`);
  }
}

/**
 * Update a specific cell or range in a Google Sheet
 */
export async function updateSheetRange(
  env: Env,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  await writeSheet(env, spreadsheetId, range, values);
}

/**
 * Get all sheet tabs in a spreadsheet
 */
export async function getSheetTabs(
  env: Env,
  spreadsheetId: string
): Promise<string[]> {
  const token = await getAccessToken(env);
  
  const url = `${SHEETS_API_BASE}/${spreadsheetId}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  }, {
    maxRetries: 3,
    initialDelayMs: 200,
    retryableStatuses: [429, 500, 502, 503, 504],
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get sheet tabs: ${error}`);
  }

  const data: { sheets?: Array<{ properties?: { title?: string } }> } = await response.json();
  
  if (!data.sheets) {
    return [];
  }
  
  return data.sheets
    .map(sheet => sheet.properties?.title)
    .filter((title): title is string => !!title);
}
