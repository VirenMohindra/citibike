/**
 * API Module
 * Central export point for all API utilities
 */

// Export base client
export { BaseApiClient, ApiError } from './client';
export type { ApiRequestOptions, ApiErrorResponse } from './client';

// Export Lyft client
export { LyftApiClient, getLyftClient } from './lyft-client';

// Export session utilities
export {
  createSession,
  createAuthenticatedSession,
  parseSession,
  isAuthenticatedSession,
  createDeviceIdentifiers,
  encodeIdentifiers,
  createEmptyIdentifiers,
  getSessionCookieOptions,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  SESSION_COOKIES,
  generateSessionId,
  generateZeroUuid,
  isValidSessionData,
  isValidUuid,
} from './session';

export type { SessionData, SessionInfo, DeviceIdentifier, CookieOptions } from './session';

// Import for internal use
import { getLyftClient as getLyftClientInternal } from './lyft-client';

// ============================================
// Convenience Exports
// ============================================

/**
 * Check if authentication is available
 */
export function isAuthAvailable(): boolean {
  try {
    const client = getLyftClientInternal();
    return client.hasCredentials();
  } catch {
    return false;
  }
}

/**
 * Create standard API response
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
