interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 10000,
  shouldRetry: (error: any) => {
    // Retry on network errors or Firebase temporary errors
    if (error?.code === 'network-error') return true;
    if (error?.code === 'unavailable') return true;
    if (error?.code === 'resource-exhausted') return true;
    return false;
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  let backoffMs = opts.backoffMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      backoffMs = Math.min(backoffMs * 2, opts.maxBackoffMs);
    }
  }

  throw lastError;
} 