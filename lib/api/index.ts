import { getLyftClient } from './lyft-client';

// ============================================
// API Utility Functions
// ============================================

/**
 * Check if authentication is available
 * @future This could be expanded to check token validity, expiration, etc.
 */
export function isAuthAvailable(): boolean {
  try {
    const client = getLyftClient();
    return client.hasCredentials();
  } catch {
    return false;
  }
}

/**
 * Create standard API response
 * @future This could be expanded to include pagination info, request IDs, etc.
 */
export function createApiResponse<T>(data: T, success: boolean = true, error?: string) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error API response
 * @future This could be expanded to include error codes, stack traces, etc.
 */
export function createApiError(
  error: string,
  code?: string,
  statusCode: number = 500,
  details?: unknown
) {
  return {
    success: false,
    error,
    code,
    statusCode,
    details,
    timestamp: new Date().toISOString(),
  };
}
