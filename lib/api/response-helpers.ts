/**
 * API Response Helpers
 * Utilities for creating consistent API responses
 */

import { ApiResponse, ResponseStatus } from '@/config/api';

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    status: ResponseStatus.SUCCESS,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(error: string, details?: unknown): ApiResponse<never> {
  return {
    status: ResponseStatus.ERROR,
    error,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a challenge required API response (for authentication flows)
 */
export function createChallengeResponse<T>(data: T): ApiResponse<T> {
  return {
    status: ResponseStatus.CHALLENGE_REQUIRED,
    data,
    timestamp: new Date().toISOString(),
  };
}
