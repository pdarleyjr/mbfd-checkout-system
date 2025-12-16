/**
 * Gmail OAuth and Email Sending Module
 * 
 * This module handles OAuth token exchange and email sending via Gmail API
 * Uses refresh token to obtain short-lived access tokens
 */

import { fetchWithRetry } from './retry-helper';

interface GmailTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface Env {
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  GMAIL_SENDER_EMAIL: string;
}

export async function getGmailAccessToken(env: Env): Promise<string> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const body = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  try {
    const response = await fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    }, {
      maxRetries: 3,
      initialDelayMs: 200,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gmail token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json() as GmailTokenResponse;
    return data.access_token;
  } catch (error) {
    console.error('Error getting Gmail access token:', error);
    throw error;
  }
}

interface SendGmailParams {
  to: string | string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  from?: string;
}

export async function sendGmailMessage(
  env: Env,
  params: SendGmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accessToken = await getGmailAccessToken(env);
    const fromEmail = params.from || env.GMAIL_SENDER_EMAIL;
    const toEmails = Array.isArray(params.to) ? params.to.join(', ') : params.to;

    // Construct MIME message
    const mimeMessage = [
      `From: MBFD Checkout System <${fromEmail}>`,
      `To: ${toEmails}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      params.htmlBody 
        ? 'Content-Type: multipart/alternative; boundary="boundary123"'
        : 'Content-Type: text/plain; charset="UTF-8"',
      '',
      params.htmlBody ? [
        '--boundary123',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        params.textBody,
        '',
        '--boundary123',
        'Content-Type: text/html; charset="UTF-8"',
        '',
        params.htmlBody,
        '',
        '--boundary123--'
      ].join('\n') : params.textBody
    ].join('\n');

    // Base64URL encode
    const encodedMessage = btoa(mimeMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const response = await fetchWithRetry(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    }, {
      maxRetries: 3,
      initialDelayMs: 200,
      retryableStatuses: [429, 500, 502, 503, 504],
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gmail send failed:', errorText);
      return { 
        success: false, 
        error: `Gmail API error: ${response.status}` 
      };
    }

    const result = await response.json() as { id: string };
    return { 
      success: true, 
      messageId: result.id 
    };
  } catch (error) {
    console.error('Error sending Gmail message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}