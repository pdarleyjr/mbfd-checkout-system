/**
 * Email System Handler
 * 
 * Provides comprehensive email system endpoints:
 * - Send emails with attachments
 * - Save email drafts  
 * - Get email history
 * - Manage email templates (CRUD)
 * 
 * Integrates with Gmail SMTP and email_templates/email_history tables
 */

import type { Env } from '../index';
import { sendEmailWithPDF } from '../email/gmail';
import { getPDFFromR2 } from '../storage/r2-client';
import { nanoid } from 'nanoid';

// ============================================================================ 
// TYPE DEFINITIONS 
// ============================================================================ 

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string; // JSON string
  category?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface EmailHistoryRecord {
  id: string;
  from_email: string;
  to_emails: string; // JSON string
  cc_emails?: string; // JSON string
  bcc_emails?: string; // JSON string
  subject: string;
  body: string;
  attachments?: string; // JSON string
  sent_at: string;
  status: string;
  error_message?: string;
  template_id?: string;
  form_ids?: string; // JSON string
}

interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    storageUrl: string;
  }>;
  formIds?: string[];
  templateId?: string;
}

// ============================================================================ 
// MAIN ROUTER 
// ============================================================================

export async function handleEmail(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // POST /api/email/send - Send email
    if (path === '/api/email/send' && request.method === 'POST') {
      return await handleSendEmail(request, env, corsHeaders);
    }

    // POST /api/email/draft - Save draft
    if (path === '/api/email/draft' && request.method === 'POST') {
      return await handleSaveDraft(request, env, corsHeaders);
    }

    // GET /api/email/history - Get email history
    if (path === '/api/email/history' && request.method === 'GET') {
      return await handleEmailHistory(request, env, corsHeaders);
    }

    // GET /api/email/templates - List templates
    if (path === '/api/email/templates' && request.method === 'GET') {
      return await handleListTemplates(request, env, corsHeaders);
    }

    // POST /api/email/templates - Create template
    if (path === '/api/email/templates' && request.method === 'POST') {
      return await handleCreateTemplate(request, env, corsHeaders);
    }

    // PATCH /api/email/templates/:id - Update template
    if (path.match(/^\/api\/email\/templates\/[^/]+$/) && request.method === 'PATCH') {
      const templateId = path.split('/').pop()!;
      return await handleUpdateTemplate(templateId, request, env, corsHeaders);
    }

    // DELETE /api/email/templates/:id - Delete template
    if (path.match(/^\/api\/email\/templates\/[^/]+$/) && request.method === 'DELETE') {
      const templateId = path.split('/').pop()!;
      return await handleDeleteTemplate(templateId, env, corsHeaders);
    }

    return jsonResponse(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Error:', error);
    return jsonResponse(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================================================ 
// ENDPOINT HANDLERS 
// ============================================================================ 

/**
 * POST /api/email/send
 * Send email with attachments
 */
async function handleSendEmail(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const emailData: SendEmailRequest = await request.json();
    const { to, cc, bcc, subject, body, attachments, formIds, templateId } = emailData;

    // Validation
    if (!to || !Array.isArray(to) || to.length === 0) {
      return jsonResponse(
        { error: 'Recipients (to) array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!subject || !body) {
      return jsonResponse(
        { error: 'Subject and body are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch attachments from storage if provided
    const emailAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const fileResult = await getPDFFromR2(env, attachment.storageUrl);
          if (fileResult.buffer) {
            emailAttachments.push({
              filename: attachment.filename,
              content: fileResult.buffer
            });
          }
        } catch (error) {
          console.error(`[EMAIL] Error fetching attachment ${attachment.filename}:`, error);
        }
      }
    }

    // Send email via Gmail
    try {
      await sendEmailWithPDF(
        {
          to,
          subject,
          htmlBody: body,
          attachments: emailAttachments
        },
        env
      );

      // Record in email history
      const historyId = nanoid();
      const now = new Date().toISOString();
      
      await db
        .prepare(`
          INSERT INTO email_history (
            id, from_email, to_emails, cc_emails, bcc_emails, subject, body,
            attachments, sent_at, status, template_id, form_ids
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          historyId,
          env.GMAIL_USER || 'fltf2usar@gmail.com',
          JSON.stringify(to),
          cc ? JSON.stringify(cc) : null,
          bcc ? JSON.stringify(bcc) : null,
          subject,
          body,
          attachments ? JSON.stringify(attachments) : null,
          now,
          'sent',
          templateId || null,
          formIds ? JSON.stringify(formIds) : null
        )
        .run();

      // Update template usage count if template was used
      if (templateId) {
        await db
          .prepare('UPDATE email_templates SET usage_count = usage_count + 1 WHERE id = ?')
          .bind(templateId)
          .run();
      }

      return jsonResponse(
        {
          success: true,
          message: 'Email sent successfully',
          historyId,
          recipientCount: to.length
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (emailError) {
      // Record failed attempt in history
      const historyId = nanoid();
      const now = new Date().toISOString();
      
      await db
        .prepare(`
          INSERT INTO email_history (
            id, from_email, to_emails, cc_emails, bcc_emails, subject, body,
            attachments, sent_at, status, error_message, template_id, form_ids
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          historyId,
          env.GMAIL_USER || 'fltf2usar@gmail.com',
          JSON.stringify(to),
          cc ? JSON.stringify(cc) : null,
          bcc ? JSON.stringify(bcc) : null,
          subject,
          body,
          attachments ? JSON.stringify(attachments) : null,
          now,
          'failed',
          emailError instanceof Error ? emailError.message : 'Unknown error',
          templateId || null,
          formIds ? JSON.stringify(formIds) : null
        )
        .run();

      throw emailError;
    }
  } catch (error) {
    console.error('[EMAIL] Send error:', error);
    return jsonResponse(
      {
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/email/draft
 * Save email as draft
 */
async function handleSaveDraft(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const emailData: SendEmailRequest = await request.json();
    const { to, cc, bcc, subject, body, attachments, formIds } = emailData;

    const historyId = nanoid();
    const now = new Date().toISOString();
    
    await db
      .prepare(`
        INSERT INTO email_history (
          id, from_email, to_emails, cc_emails, bcc_emails, subject, body,
          attachments, sent_at, status, form_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        historyId,
        env.GMAIL_USER || 'fltf2usar@gmail.com',
        JSON.stringify(to || []),
        cc ? JSON.stringify(cc) : null,
        bcc ? JSON.stringify(bcc) : null,
        subject || '',
        body || '',
        attachments ? JSON.stringify(attachments) : null,
        now,
        'draft',
        formIds ? JSON.stringify(formIds) : null
      )
      .run();

    return jsonResponse(
      {
        success: true,
        message: 'Draft saved successfully',
        draftId: historyId
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Draft save error:', error);
    return jsonResponse(
      {
        error: 'Failed to save draft',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/email/history
 * Get email history with filtering
 */
async function handleEmailHistory(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const status = url.searchParams.get('status'); // sent, failed, draft

    let query = 'SELECT * FROM email_history WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const results = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM email_history WHERE 1=1';
    const countParams: any[] = [];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const total = countResult?.count || 0;

    return jsonResponse(
      {
        emails: results.results, // Changed from "history" to "emails" to match frontend
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] History fetch error:', error);
    return jsonResponse(
      {
        error: 'Failed to fetch email history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/email/templates
 * List email templates
 */
async function handleListTemplates(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let query = 'SELECT * FROM email_templates WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY name ASC';

    const results = await db.prepare(query).bind(...params).all();

    return jsonResponse(
      { templates: results.results },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Templates fetch error:', error);
    return jsonResponse(
      {
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/email/templates
 * Create new email template
 */
async function handleCreateTemplate(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const template = await request.json() as Partial<EmailTemplate>;
    const { name, subject, body, variables, category } = template;

    if (!name || !subject || !body) {
      return jsonResponse(
        { error: 'Name, subject, and body are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const templateId = nanoid();
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO email_templates (
          id, name, subject, body, variables, category, created_at, updated_at, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        templateId,
        name,
        subject,
        body,
        variables ? JSON.stringify(variables) : null,
        category || null,
        now,
        now,
        0
      )
      .run();

    const newTemplate = await db
      .prepare('SELECT * FROM email_templates WHERE id = ?')
      .bind(templateId)
      .first<EmailTemplate>();

    return jsonResponse(
      {
        success: true,
        template: newTemplate
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Template create error:', error);
    return jsonResponse(
      {
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/email/templates/:id
 * Update email template
 */
async function handleUpdateTemplate(
  templateId: string,
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const updates = await request.json() as Partial<EmailTemplate>;
    const { name, subject, body, variables, category } = updates;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (subject !== undefined) {
      updateFields.push('subject = ?');
      updateValues.push(subject);
    }
    if (body !== undefined) {
      updateFields.push('body = ?');
      updateValues.push(body);
    }
    if (variables !== undefined) {
      updateFields.push('variables = ?');
      updateValues.push(JSON.stringify(variables));
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }

    if (updateFields.length === 0) {
      return jsonResponse(
        { error: 'No fields to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(templateId);

    await db
      .prepare(`UPDATE email_templates SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues)
      .run();

    const updatedTemplate = await db
      .prepare('SELECT * FROM email_templates WHERE id = ?')
      .bind(templateId)
      .first<EmailTemplate>();

    return jsonResponse(
      {
        success: true,
        template: updatedTemplate
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Template update error:', error);
    return jsonResponse(
      {
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/email/templates/:id
 * Delete email template
 */
async function handleDeleteTemplate(
  templateId: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    await db
      .prepare('DELETE FROM email_templates WHERE id = ?')
      .bind(templateId)
      .run();

    return jsonResponse(
      {
        success: true,
        message: 'Template deleted successfully'
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EMAIL] Template delete error:', error);
    return jsonResponse(
      {
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================================================ 
// HELPER FUNCTIONS 
// ============================================================================ 

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
