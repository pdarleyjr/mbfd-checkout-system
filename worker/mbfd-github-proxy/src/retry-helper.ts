/**
 * Retry Helper - Exponential Backoff for External API Calls
 * 
 * Implements retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function fetchWithRetry(
  url: string | Request,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // If response is retryable status, treat as transient error
      if (opts.retryableStatuses.includes(response.status) && attempt < opts.maxRetries) {
        console.warn(`Retryable status ${response.status}, attempt ${attempt + 1}/${opts.maxRetries}`);
        
        // Calculate exponential backoff delay
        const delayMs = Math.min(
          opts.initialDelayMs * Math.pow(2, attempt),
          opts.maxDelayMs
        );
        
        await sleep(delayMs);
        continue; // Retry
      }

      // Success or non-retryable failure
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < opts.maxRetries) {
        console.warn(`Fetch error on attempt ${attempt + 1}/${opts.maxRetries}:`, lastError.message);
        
        // Calculate exponential backoff delay
        const delayMs = Math.min(
          opts.initialDelayMs * Math.pow(2, attempt),
          opts.maxDelayMs
        );
        
        await sleep(delayMs);
        continue; // Retry
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Retry any async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < opts.maxRetries) {
        console.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries}:`, lastError.message);
        
        const delayMs = Math.min(
          opts.initialDelayMs * Math.pow(2, attempt),
          opts.maxDelayMs
        );
        
        await sleep(delayMs);
        continue;
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}
