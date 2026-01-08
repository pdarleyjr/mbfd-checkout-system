/**
 * Cloudflare R2 Storage Client with KV Fallback
 * 
 * Handles PDF upload, retrieval, and management for ICS-212 forms.
 * Automatically falls back to KV storage when R2 is unavailable.
 * 
 * Storage URL Formats:
 * - R2: r2://filename.pdf
 * - KV: kv://filename.pdf
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
  storageUrl?: string; // Internal URL (r2:// or kv://)
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
 * Upload PDF with automatic KV fallback
 * Tries R2 first, falls back to KV if unavailable
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
    
    // Prepare metadata
    const uploadMetadata = {
      uploadedAt: new Date().toISOString(),
      formType: 'ICS-212',
      size: buffer.byteLength.toString(),
      ...metadata,
    };
    
    // Try R2 first if binding exists
    if (env.USAR_FORMS) {
      try {
        await env.USAR_FORMS.put(filename, buffer, {
          httpMetadata: {
            contentType,
            cacheControl: 'public, max-age=31536000',
          },
          customMetadata: uploadMetadata,
        });
        
        const publicUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${filename}` : `r2://${filename}`;
        console.log('[STORAGE] ✓ PDF uploaded to R2:', filename, `(${(buffer.byteLength / 1024).toFixed(2)} KB)`);
        
        return {
          success: true,
          url: publicUrl,
          storageUrl: `r2://${filename}`,
          key: filename,
          size: buffer.byteLength,
        };
      } catch (r2Error) {
        console.warn('[STORAGE] R2 upload failed, falling back to KV:', r2Error);
      }
    } else {
      console.log('[STORAGE] R2 not configured, using KV storage');
    }
    
    // Fallback to KV - prefer USAR_UPLOADS, fallback to MBFD_UPLOADS
    const kvNamespace = env.USAR_UPLOADS || env.MBFD_UPLOADS;
    if (!kvNamespace) {
      throw new Error('Neither R2 nor KV storage is configured');
    }
    
    // Store in KV with metadata
    const kvKey = `pdf:${filename}`;
    await kvNamespace.put(kvKey, buffer, {
      metadata: {
        ...uploadMetadata,
        contentType,
        storageType: 'kv',
      },
      expirationTtl: 60 * 60 * 24 * 90, // 90 days
    });
    
    console.log('[STORAGE] ✓ PDF uploaded to KV:', filename, `(${(buffer.byteLength / 1024).toFixed(2)} KB)`);
    
    return {
      success: true,
      url: `kv://${filename}`,
      storageUrl: `kv://${filename}`,
      key: filename,
      size: buffer.byteLength,
    };
  } catch (error) {
    console.error('[STORAGE] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retrieve PDF from R2 or KV based on storage URL
 * Handles both r2:// and kv:// URLs
 */
export async function getPDFFromR2(
  env: any,
  filenameOrUrl: string
): Promise<R2GetResult> {
  try {
    let storageType: 'r2' | 'kv';
    let filename: string;
    
    // Parse storage URL
    if (filenameOrUrl.startsWith('r2://')) {
      storageType = 'r2';
      filename = filenameOrUrl.substring(5);
    } else if (filenameOrUrl.startsWith('kv://')) {
      storageType = 'kv';
      filename = filenameOrUrl.substring(5);
    } else {
      // Legacy format: try R2 first, then KV
      filename = filenameOrUrl;
      storageType = 'r2';
    }
    
    // Try R2
    if (storageType === 'r2' && env.USAR_FORMS) {
      try {
        const object = await env.USAR_FORMS.get(filename);
        
        if (object) {
          const buffer = await object.arrayBuffer();
          console.log('[STORAGE] ✓ PDF retrieved from R2:', filename, `(${(buffer.byteLength / 1024).toFixed(2)} KB)`);
          
          return {
            buffer,
            contentType: object.httpMetadata?.contentType || 'application/pdf',
            size: object.size,
            metadata: object.customMetadata,
          };
        }
      } catch (r2Error) {
        console.warn('[STORAGE] R2 retrieval failed, trying KV:', r2Error);
      }
    }
    
    // Try KV (either explicitly requested or as fallback)
    const kvNamespace = env.USAR_UPLOADS || env.MBFD_UPLOADS;
    if (kvNamespace) {
      const kvKey = `pdf:${filename}`;
      const kvResult = await kvNamespace.getWithMetadata(kvKey, 'arrayBuffer');
      
      if (kvResult && kvResult.value) {
        console.log('[STORAGE] ✓ PDF retrieved from KV:', filename, `(${(kvResult.value.byteLength / 1024).toFixed(2)} KB)`);
        
        return {
          buffer: kvResult.value,
          contentType: kvResult.metadata?.contentType || 'application/pdf',
          size: kvResult.value.byteLength,
          metadata: kvResult.metadata as Record<string, string>,
        };
      }
    }
    
    return {
      error: 'File not found in R2 or KV storage',
    };
  } catch (error) {
    console.error('[STORAGE] Retrieval failed:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete PDF from R2 or KV
 */
export async function deletePDFFromR2(
  env: any,
  filenameOrUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let storageType: 'r2' | 'kv';
    let filename: string;
    
    // Parse storage URL
    if (filenameOrUrl.startsWith('r2://')) {
      storageType = 'r2';
      filename = filenameOrUrl.substring(5);
    } else if (filenameOrUrl.startsWith('kv://')) {
      storageType = 'kv';
      filename = filenameOrUrl.substring(5);
    } else {
      filename = filenameOrUrl;
      storageType = 'r2';
    }
    
    let deleted = false;
    
    // Try R2
    if (storageType === 'r2' && env.USAR_FORMS) {
      try {
        await env.USAR_FORMS.delete(filename);
        deleted = true;
        console.log('[STORAGE] ✓ PDF deleted from R2:', filename);
      } catch (r2Error) {
        console.warn('[STORAGE] R2 deletion failed:', r2Error);
      }
    }
    
    // Try KV
    const kvNamespace = env.USAR_UPLOADS || env.MBFD_UPLOADS;
    if ((storageType === 'kv' || !deleted) && kvNamespace) {
      const kvKey = `pdf:${filename}`;
      await kvNamespace.delete(kvKey);
      deleted = true;
      console.log('[STORAGE] ✓ PDF deleted from KV:', filename);
    }
    
    return { success: deleted };
  } catch (error) {
    console.error('[STORAGE] Deletion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List all PDFs in R2 bucket (with optional prefix filter)
 * Note: KV listing is not supported in this implementation
 */
export async function listPDFsInR2(
  env: any,
  prefix?: string,
  limit: number = 100
): Promise<{ files: string[]; error?: string }> {
  try {
    if (!env.USAR_FORMS) {
      return {
        files: [],
        error: 'R2 bucket not available. KV listing not supported.',
      };
    }
    
    const options: any = { limit };
    if (prefix) {
      options.prefix = prefix;
    }
    
    const listed = await env.USAR_FORMS.list(options);
    const files = listed.objects.map((obj: any) => obj.key);
    
    return { files };
  } catch (error) {
    console.error('[STORAGE] List failed:', error);
    return {
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a PDF exists in R2 or KV
 */
export async function pdfExistsInR2(
  env: any,
  filenameOrUrl: string
): Promise<boolean> {
  try {
    let storageType: 'r2' | 'kv';
    let filename: string;
    
    // Parse storage URL
    if (filenameOrUrl.startsWith('r2://')) {
      storageType = 'r2';
      filename = filenameOrUrl.substring(5);
    } else if (filenameOrUrl.startsWith('kv://')) {
      storageType = 'kv';
      filename = filenameOrUrl.substring(5);
    } else {
      filename = filenameOrUrl;
      storageType = 'r2';
    }
    
    // Try R2
    if (storageType === 'r2' && env.USAR_FORMS) {
      const object = await env.USAR_FORMS.head(filename);
      if (object !== null) return true;
    }
    
    // Try KV
    const kvNamespace = env.USAR_UPLOADS || env.MBFD_UPLOADS;
    if (kvNamespace) {
      const kvKey = `pdf:${filename}`;
      const metadata = await kvNamespace.getWithMetadata(kvKey, 'stream');
      if (metadata && metadata.value) return true;
    }
    
    return false;
  } catch (error) {
    console.error('[STORAGE] Exists check failed:', error);
    return false;
  }
}

/**
 * Get metadata for a PDF without downloading the full file
 */
export async function getPDFMetadata(
  env: any,
  filenameOrUrl: string
): Promise<{ size: number; uploadedAt?: string; metadata?: Record<string, string>; storageType?: string } | null> {
  try {
    let storageType: 'r2' | 'kv';
    let filename: string;
    
    // Parse storage URL
    if (filenameOrUrl.startsWith('r2://')) {
      storageType = 'r2';
      filename = filenameOrUrl.substring(5);
    } else if (filenameOrUrl.startsWith('kv://')) {
      storageType = 'kv';
      filename = filenameOrUrl.substring(5);
    } else {
      filename = filenameOrUrl;
      storageType = 'r2';
    }
    
    // Try R2
    if (storageType === 'r2' && env.USAR_FORMS) {
      const object = await env.USAR_FORMS.head(filename);
      
      if (object) {
        return {
          size: object.size,
          uploadedAt: object.customMetadata?.uploadedAt,
          metadata: object.customMetadata,
          storageType: 'r2',
        };
      }
    }
    
    // Try KV
    const kvNamespace = env.USAR_UPLOADS || env.MBFD_UPLOADS;
    if (kvNamespace) {
      const kvKey = `pdf:${filename}`;
      const result = await kvNamespace.getWithMetadata(kvKey, 'stream');
      
      if (result && result.value && result.metadata) {
        return {
          size: parseInt(result.metadata.size as string) || 0,
          uploadedAt: result.metadata.uploadedAt as string,
          metadata: result.metadata as Record<string, string>,
          storageType: 'kv',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[STORAGE] Metadata retrieval failed:', error);
    return null;
  }
}
