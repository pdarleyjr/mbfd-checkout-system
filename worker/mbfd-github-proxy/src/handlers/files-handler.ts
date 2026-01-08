/**
 * File Management Handler
 * 
 * Provides comprehensive file management endpoints for the admin dashboard:
 * - List all files with filtering/sorting
 * - Upload new files  
 * - Delete files
 * - Batch download files as ZIP
 * - Download single files
 * 
 * Integrates with file_metadata table and existing R2/KV storage
 */

import type { Env } from '../index';
import { uploadPDFToR2, getPDFFromR2, deletePDFFromR2 } from '../storage/r2-client';
import JSZip from 'jszip';
import { nanoid } from 'nanoid';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  storage_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  form_type?: string;
  form_id?: string;
  uploader_name?: string;
  uploader_email?: string;
  upload_date: string;
  metadata?: string; // JSON string
}

interface FilesListResponse {
  files: any[];
  total: number;
  page: number;
  pages: number;
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

export async function handleFiles(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/files - List all files
    if (path === '/api/files' && request.method === 'GET') {
      return await handleFilesList(request, env, corsHeaders);
    }

    // POST /api/files/upload - Upload new file
    if (path === '/api/files/upload' && request.method === 'POST') {
      return await handleFileUpload(request, env, corsHeaders);
    }

    // DELETE /api/files/:id - Delete file
    if (path.match(/^\/api\/files\/[^/]+$/) && request.method === 'DELETE') {
      const fileId = path.split('/').pop()!;
      return await handleFileDelete(fileId, env, corsHeaders);
    }

    // POST /api/files/batch-download - Batch download as ZIP
    if (path === '/api/files/batch-download' && request.method === 'POST') {
      return await handleBatchDownload(request, env, corsHeaders);
    }

    // GET /api/files/:id/download - Download single file
    if (path.match(/^\/api\/files\/[^/]+\/download$/) && request.method === 'GET') {
      const fileId = path.split('/')[3];
      return await handleFileDownload(fileId, env, corsHeaders);
    }

    return jsonResponse(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[FILES] Error:', error);
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
 * GET /api/files
 * List all files with filtering and sorting
 * Also includes PDFs from ics212_forms table
 */
async function handleFilesList(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const sortBy = url.searchParams.get('sortBy') || 'date';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  
  // Parse filters
  const filters = {
    fileType: url.searchParams.get('type'),
    formId: url.searchParams.get('formId'),
    search: url.searchParams.get('search')
  };

  const db = env.DB || env.SUPPLY_DB;
  if (!db) {
    return jsonResponse(
      { error: 'Database not available' },
      { status: 500, headers: corsHeaders }
    );
  }

  // Build query with filters for file_metadata
  let query = 'SELECT * FROM file_metadata WHERE 1=1';
  const params: any[] = [];

  if (filters.fileType) {
    query += ' AND file_type = ?';
    params.push(filters.fileType);
  }

  if (filters.formId) {
    query += ' AND form_id = ?';
    params.push(filters.formId);
  }

  if (filters.search) {
    query += ' AND (original_filename LIKE ? OR uploader_name LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  // Add sorting
  const sortColumn = sortBy === 'date' ? 'upload_date' :
                     sortBy === 'name' ? 'original_filename' :
                     sortBy === 'size' ? 'file_size' :
                     'upload_date';
  query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

  // Add pagination
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  // Execute query
  const results = await db.prepare(query).bind(...params).all();

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM file_metadata WHERE 1=1';
  const countParams: any[] = [];
  
  if (filters.fileType) {
    countQuery += ' AND file_type = ?';
    countParams.push(filters.fileType);
  }
  if (filters.formId) {
    countQuery += ' AND form_id = ?';
    countParams.push(filters.formId);
  }
  if (filters.search) {
    countQuery += ' AND (original_filename LIKE ? OR uploader_name LIKE ?)';
    countParams.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const countResult = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();
  let total = countResult?.count || 0;

  // Also get PDFs from ics212_forms table
  const formPDFs = await db
    .prepare(`
      SELECT 
        form_id as id,
        pdf_filename as filename,
        pdf_filename as original_filename,
        pdf_url as storage_url,
        'pdf' as file_type,
        0 as file_size,
        'application/pdf' as mime_type,
        'ICS-212' as form_type,
        form_id,
        inspector_name as uploader_name,
        '' as uploader_email,
        created_at as upload_date,
        NULL as metadata
      FROM ics212_forms
      WHERE pdf_url IS NOT NULL
      ORDER BY created_at DESC
    `)
    .all();

  // Combine results
  const allFiles = [...(results.results as unknown as FileMetadata[]), ...(formPDFs.results as unknown as FileMetadata[])];
  total += (formPDFs.results?.length || 0);

  // Transform to camelCase for frontend
  const transformedFiles = allFiles.slice((page - 1) * limit, page * limit).map((file: any) => ({
    id: file.id,
    filename: file.original_filename || file.filename,
    fileType: file.file_type?.toUpperCase() || 'UNKNOWN',
    size: file.file_size || 0,
    uploader: file.uploader_name || file.uploader || 'Unknown',
    uploadDate: file.upload_date,
    associatedForm: file.form_id || file.form_type || '-',
    url: file.storage_url
  }));

  const response: FilesListResponse = {
    files: transformedFiles,
    total,
    page,
    pages: Math.ceil(total / limit)
  };

  return jsonResponse(response, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/files/upload
 * Upload new file to storage and record in database
 */
async function handleFileUpload(
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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const formType = formData.get('formType') as string | null;
    const formId = formData.get('formId') as string | null;
    const uploaderName = formData.get('uploaderName') as string | null;
    const uploaderEmail = formData.get('uploaderEmail') as string | null;
    const additionalMetadata = formData.get('metadata') as string | null;

    if (!file) {
      return jsonResponse(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique filename
    const fileId = nanoid();
    const ext = file.name.split('.').pop();
    const filename = `${fileId}.${ext}`;

    // Upload to R2/KV
    const buffer = await file.arrayBuffer();
    const uploadResult = await uploadPDFToR2(env, {
      filename,
      buffer,
      contentType: file.type,
      metadata: {
        originalFilename: file.name,
        formType: formType || '',
        formId: formId || '',
        uploaderName: uploaderName || '',
        uploaderEmail: uploaderEmail || ''
      }
    });

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    // Record in database
    const now = new Date().toISOString();
    await db
      .prepare(`
        INSERT INTO file_metadata (
          id, filename, original_filename, storage_url, file_type, file_size,
          mime_type, form_type, form_id, uploader_name, uploader_email,
          upload_date, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        fileId,
        filename,
        file.name,
        uploadResult.storageUrl!,
        ext || 'unknown',
        buffer.byteLength,
        file.type,
        formType,
        formId,
        uploaderName,
        uploaderEmail,
        now,
        additionalMetadata
      )
      .run();

    return jsonResponse(
      {
        success: true,
        file: {
          id: fileId,
          filename,
          original_filename: file.name,
          storage_url: uploadResult.storageUrl,
          file_size: buffer.byteLength,
          upload_date: now
        }
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[FILES] Upload error:', error);
    return jsonResponse(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/files/:id
 * Delete file from storage and database
 */
async function handleFileDelete(
  fileId: string,
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
    // Get file metadata
    const file = await db
      .prepare('SELECT * FROM file_metadata WHERE id = ?')
      .bind(fileId)
      .first<FileMetadata>();

    if (!file) {
      return jsonResponse(
        { error: 'File not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete from storage
    await deletePDFFromR2(env, file.storage_url);

    // Delete from database
    await db
      .prepare('DELETE FROM file_metadata WHERE id = ?')
      .bind(fileId)
      .run();

    return jsonResponse(
      { success: true, message: 'File deleted successfully' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[FILES] Delete error:', error);
    return jsonResponse(
      {
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/files/batch-download
 * Download multiple files as a ZIP archive
 */
async function handleBatchDownload(
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
    const body = await request.json() as { fileIds: string[] };
    const { fileIds } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return jsonResponse(
        { error: 'fileIds array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (fileIds.length > 50) {
      return jsonResponse(
        { error: 'Maximum 50 files allowed per batch' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch files from database
    const placeholders = fileIds.map(() => '?').join(',');
    const query = `SELECT * FROM file_metadata WHERE id IN (${placeholders})`;
    const { results } = await db.prepare(query).bind(...fileIds).all();

    if (!results || results.length === 0) {
      return jsonResponse(
        { error: 'No files found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create ZIP
    const zip = new JSZip();
    let successCount = 0;

    // Fetch each file and add to ZIP
    for (const file of results as unknown as FileMetadata[]) {
      try {
        const fileResult = await getPDFFromR2(env, file.storage_url);
        
        if (fileResult.buffer) {
          zip.file(file.original_filename, fileResult.buffer);
          successCount++;
        }
      } catch (error) {
        console.error(`[FILES] Error fetching file ${file.id}:`, error);
      }
    }

    if (successCount === 0) {
      return jsonResponse(
        { error: 'No files available for download' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
    const filename = `files_${timestamp}.zip`;

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    console.error('[FILES] Batch download error:', error);
    return jsonResponse(
      {
        error: 'Failed to create ZIP',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/files/:id/download
 * Download single file
 */
async function handleFileDownload(
  fileId: string,
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
    // Get file metadata
    const file = await db
      .prepare('SELECT * FROM file_metadata WHERE id = ?')
      .bind(fileId)
      .first<FileMetadata>();

    if (!file) {
      return jsonResponse(
        { error: 'File not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch file from storage
    const fileResult = await getPDFFromR2(env, file.storage_url);

    if (!fileResult.buffer) {
      return jsonResponse(
        { error: 'File not found in storage' },
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(fileResult.buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': file.mime_type,
        'Content-Disposition': `attachment; filename="${file.original_filename}"`,
        'Content-Length': file.file_size.toString()
      }
    });
  } catch (error) {
    console.error('[FILES] Download error:', error);
    return jsonResponse(
      {
        error: 'Failed to download file',
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
