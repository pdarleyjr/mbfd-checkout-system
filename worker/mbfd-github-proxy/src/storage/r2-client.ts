/**
 * Cloudflare R2 Storage Client
 * 
 * Handles PDF upload, retrieval, and management for ICS-212 forms
 * R2 is Cloudflare's S3-compatible object storage
 */

export interface R2UploadOptions {
  filename: string;
  buffer: ArrayBuffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface R2UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  error?: string;
}

export interface R2GetResult {
  buffer?: ArrayBuffer;
  contentType?: string;
  size?: number;
  metadata?: Record<string, string>;
  error?: string;
}

/**
 * Upload PDF to R2 bucket
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param options - Upload options including filename and buffer
 * @returns Upload result with public URL
 */
export async function uploadPDFToR2(
  env: any,
  options: R2UploadOptions
): Promise<R2UploadResult> {
  try {
    const { filename, buffer, contentType = 'application/pdf', metadata = {} } = options;
    
    // Validate inputs
    if (!filename) {
      throw new Error('Filename is required');
    }
    
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Buffer is empty or invalid');
    }
    
    // Check if R2 binding exists
    if (!env.USAR_FORMS) {
      throw new Error('R2 bucket binding USAR_FORMS not found');
    }
    
    // Prepare metadata
    const uploadMetadata = {
      uploadedAt: new Date().toISOString(),
      formType: 'ICS-212',
      size: buffer.byteLength.toString(),
      ...metadata,
    };
    
    // Upload to R2
    await env.USAR_FORMS.put(filename, buffer, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      customMetadata: uploadMetadata,
    });
    
    // Generate public URL (assumes R2 bucket has custom domain or public access)
    // Format: https://forms.yourdomain.com/filename
    const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;
    
    console.log(`PDF uploaded to R2: ${filename} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
    
    return {
      success: true,
      url: publicUrl,
      key: filename,
      size: buffer.byteLength,
    };
  } catch (error) {
    console.error('R2 upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retrieve PDF from R2 bucket
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param filename - Name of the file to retrieve
 * @returns File buffer and metadata or error
 */
export async function getPDFFromR2(
  env: any,
  filename: string
): Promise<R2GetResult> {
  try {
    // Check if R2 binding exists
    if (!env.USAR_FORMS) {
      throw new Error('R2 bucket binding USAR_FORMS not found');
    }
    
    // Get object from R2
    const object = await env.USAR_FORMS.get(filename);
    
    if (!object) {
      return {
        error: 'File not found in R2',
      };
    }
    
    // Convert to ArrayBuffer
    const buffer = await object.arrayBuffer();
    
    return {
      buffer,
      contentType: object.httpMetadata?.contentType || 'application/pdf',
      size: object.size,
      metadata: object.customMetadata,
    };
  } catch (error) {
    console.error('R2 retrieval failed:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete PDF from R2 bucket
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param filename - Name of the file to delete
 * @returns Success status
 */
export async function deletePDFFromR2(
  env: any,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!env.USAR_FORMS) {
      throw new Error('R2 bucket binding USAR_FORMS not found');
    }
    
    await env.USAR_FORMS.delete(filename);
    
    console.log(`PDF deleted from R2: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error('R2 deletion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List all PDFs in R2 bucket (with optional prefix filter)
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param prefix - Optional prefix to filter files (e.g., 'ICS212-')
 * @param limit - Maximum number of files to return (default: 100)
 * @returns List of file keys
 */
export async function listPDFsInR2(
  env: any,
  prefix?: string,
  limit: number = 100
): Promise<{ files: string[]; error?: string }> {
  try {
    if (!env.USAR_FORMS) {
      throw new Error('R2 bucket binding USAR_FORMS not found');
    }
    
    const options: any = { limit };
    if (prefix) {
      options.prefix = prefix;
    }
    
    const listed = await env.USAR_FORMS.list(options);
    
    const files = listed.objects.map((obj: any) => obj.key);
    
    return { files };
  } catch (error) {
    console.error('R2 list failed:', error);
    return {
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a PDF exists in R2 bucket
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param filename - Name of the file to check
 * @returns True if file exists
 */
export async function pdfExistsInR2(
  env: any,
  filename: string
): Promise<boolean> {
  try {
    if (!env.USAR_FORMS) {
      return false;
    }
    
    const object = await env.USAR_FORMS.head(filename);
    return object !== null;
  } catch (error) {
    console.error('R2 head request failed:', error);
    return false;
  }
}

/**
 * Get metadata for a PDF without downloading the full file
 * 
 * @param env - Cloudflare Worker environment with R2 binding
 * @param filename - Name of the file
 * @returns Metadata or null
 */
export async function getPDFMetadata(
  env: any,
  filename: string
): Promise<{ size: number; uploadedAt?: string; metadata?: Record<string, string> } | null> {
  try {
    if (!env.USAR_FORMS) {
      return null;
    }
    
    const object = await env.USAR_FORMS.head(filename);
    
    if (!object) {
      return null;
    }
    
    return {
      size: object.size,
      uploadedAt: object.customMetadata?.uploadedAt,
      metadata: object.customMetadata,
    };
  } catch (error) {
    console.error('R2 metadata retrieval failed:', error);
    return null;
  }
}
