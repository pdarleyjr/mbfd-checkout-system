import { sendGmailMessage } from '../gmail';
import { Env } from '../index';

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

export async function handleSendEmail(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Parse request body
    const emailRequest: SendEmailRequest = await request.json();

    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, body'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRequest.to)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email address format'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Send email via Gmail API
    const result = await sendGmailMessage(env, {
      to: emailRequest.to,
      subject: emailRequest.subject,
      textBody: emailRequest.body,
      htmlBody: emailRequest.htmlBody
    });

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: result.messageId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('Gmail API error:', result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to send email'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Send email handler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
