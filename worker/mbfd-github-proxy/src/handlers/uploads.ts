/**
 * Image Upload Handler
 * Stores images in Cloudflare KV and serves them via worker endpoints
 * Implements validation, size limits, and thumbnail generation
 */

import { Env } from '../index';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LARGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB (reject above this)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface UploadMetadata {
  key: string;
  uploader: string;
  apparatus: string;
  item: string;
  reportedAt: string;
  size: number;
  mimeType: string;
  contentType: string;
  uploadedAt: string;
}

/**
 * Handle image upload from multipart form data
 */
export async function handleImageUpload(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const inspector = formData.get('inspector') as string | null;
    const apparatus = formData.get('apparatus') as string | null;
    const item = formData.get('item') as string | null;
    const reportedAt = formData.get('reportedAt') as string | null;

    // Validate required fields
    if (!file) {
      return jsonResponse(
        { success: false, error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!inspector || !apparatus || !item) {
      return jsonResponse(
        { success: false, error: 'Missing required metadata: inspector, apparatus, item' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonResponse(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    if (file.size > MAX_LARGE_FILE_SIZE) {
      return jsonResponse(
        { success: false, error: `File too large. Maximum size: ${MAX_LARGE_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413, headers: corsHeaders }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      console.warn(`Large file upload: ${file.size} bytes (over ${MAX_FILE_SIZE} bytes)`);
    }

    // Generate unique key for storage
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = getExtensionFromMimeType(file.type);
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    const key = `uploads/${year}/${month}/${day}/${timestamp}-${random}.${extension}`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Store image in KV
    await env.MBFD_UPLOADS.put(key, arrayBuffer, {
      metadata: {
        contentType: file.type,
        uploader: inspector,
        apparatus,
        item,
        reportedAt: reportedAt || new Date().toISOString(),
        size: file.size,
        uploadedAt: new Date().toISOString()
      }
    });

    // Store metadata separately for admin queries
    const metadataKey = `metadata:${key}`;
    const metadata: UploadMetadata = {
      key,
      uploader: inspector,
      apparatus,
      item,
      reportedAt: reportedAt || new Date().toISOString(),
      size: file.size,
      mimeType: file.type,
      contentType: file.type,
      uploadedAt: new Date().toISOString()
    };
    
    await env.MBFD_UPLOADS.put(metadataKey, JSON.stringify(metadata));

    // Generate public URL
    const hostname = env.MBFD_HOSTNAME || (new URL(request.url)).origin;
    const photoUrl = `${hostname}/api/uploads/${key}`;

    console.log(`Image uploaded successfully: ${key} (${file.size} bytes)`);

    return jsonResponse(
      {
        success: true,
        photoUrl,
        key,
        size: file.size,
        mimeType: file.type
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(
      { success: false, error: 'Upload failed', message: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Serve uploaded image from KV storage
 */
export async function handleImageRetrieval(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    // Get image from KV with metadata
    const result = await env.MBFD_UPLOADS.getWithMetadata(key, 'arrayBuffer');
    
    if (!result.value) {
      return new Response('Image not found', { status: 404 });
    }

    const metadata = result.metadata as any;
    const contentType = metadata?.contentType || 'image/jpeg';

    // Return image with appropriate headers
    return new Response(result.value, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*', // Allow embedding in GitHub issues
      }
    });

  } catch (error) {
    console.error('Image retrieval error:', error);
    return new Response('Error retrieving image', { status: 500 });
  }
}

/**
 * Get extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };
  return map[mimeType] || 'jpg';
}

/**
 * Helper function to create JSON responses with CORS
 */
function jsonResponse(data: any, options: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
