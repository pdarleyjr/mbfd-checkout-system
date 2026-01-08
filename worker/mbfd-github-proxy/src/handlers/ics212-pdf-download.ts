/**
 * ICS-212 PDF Download Handler
 * 
 * Provides endpoints for downloading generated ICS-212 PDFs from R2 or KV storage:
 * - Download by form ID (looks up storage URL in database)
 * - Download by filename directly
 * - Supports both R2 and KV storage backends
 * - Proper Content-Disposition headers for browser download
 * - Caching headers for performance
 */

import type { Env } from '../index';
import { getPDFFromR2 } from '../storage/r2-client';

/**
 * Handle PDF download requests
 * 
 * Query parameters:
 * - formId: ICS-212 form ID (e.g., ICS212-2026-1234)
 * - filename: Direct filename in storage
 * 
 * @example GET /api/ics212/pdf?formId=ICS212-2026-1234
 * @example GET /api/ics212/pdf?filename=ICS212-USAR-101-1704556800000.pdf
 */
export async function handlePDFDownload(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const formId = url.searchParams.get('formId');
    const filename = url.searchParams.get('filename');

    // Validate that at least one parameter is provided
    if (!formId && !filename) {
      return new Response(
        JSON.stringify({ error: 'formId or filename is required' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    let pdfStorageUrl: string | undefined;
    let pdfFilename: string | undefined;

    // If formId is provided, look up storage URL in database
    if (formId && !filename) {
      const db = env.DB || env.SUPPLY_DB;
      if (!db) {
        return new Response(
          JSON.stringify({ error: 'Database not available' }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Query database for PDF storage URL
      const result = await db
        .prepare('SELECT pdf_url, pdf_filename FROM ics212_forms WHERE form_id = ?')
        .bind(formId)
        .first();

      if (!result || !result.pdf_url) {
        return new Response(
          JSON.stringify({ error: 'Form not found or PDF not generated' }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      pdfStorageUrl = result.pdf_url as string;
      pdfFilename = result.pdf_filename as string;
    } else {
      // Use provided filename
      pdfStorageUrl = filename!;
      pdfFilename = filename!;
    }

    // Retrieve PDF from R2/KV storage (automatic fallback)
    const pdfResult = await getPDFFromR2(env, pdfStorageUrl);

    if (pdfResult.error || !pdfResult.buffer) {
      return new Response(
        JSON.stringify({ error: pdfResult.error || 'PDF not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Return PDF with appropriate headers
    return new Response(pdfResult.buffer, {
      status: 200,
      headers: {
        'Content-Type': pdfResult.contentType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`,
        'Content-Length': pdfResult.size?.toString() || '',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

/**
 * Handle PDF preview (inline display) requests
 * Similar to download but uses `inline` Content-Disposition
 * 
 * @example GET /api/ics212/pdf/preview?formId=ICS212-2026-1234
 */
export async function handlePDFPreview(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const formId = url.searchParams.get('formId');
    const filename = url.searchParams.get('filename');

    if (!formId && !filename) {
      return new Response(
        JSON.stringify({ error: 'formId or filename is required' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    let pdfStorageUrl: string | undefined;
    let pdfFilename: string | undefined;

    // Look up storage URL if formId provided
    if (formId && !filename) {
      const db = env.DB || env.SUPPLY_DB;
      if (!db) {
        return new Response(
          JSON.stringify({ error: 'Database not available' }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      const result = await db
        .prepare('SELECT pdf_url, pdf_filename FROM ics212_forms WHERE form_id = ?')
        .bind(formId)
        .first();

      if (!result || !result.pdf_url) {
        return new Response(
          JSON.stringify({ error: 'Form not found or PDF not generated' }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      pdfStorageUrl = result.pdf_url as string;
      pdfFilename = result.pdf_filename as string;
    } else {
      pdfStorageUrl = filename!;
      pdfFilename = filename!;
    }

    // Retrieve PDF from R2/KV storage
    const pdfResult = await getPDFFromR2(env, pdfStorageUrl);

    if (pdfResult.error || !pdfResult.buffer) {
      return new Response(
        JSON.stringify({ error: pdfResult.error || 'PDF not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Return PDF for inline viewing
    return new Response(pdfResult.buffer, {
      status: 200,
      headers: {
        'Content-Type': pdfResult.contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${pdfFilename}"`, // Inline instead of attachment
        'Content-Length': pdfResult.size?.toString() || '',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('PDF preview error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}
