/**
 * Sync Error Messages
 * Maps error codes to i18n keys that can be translated
 * This allows sync-manager to work without importing i18n directly
 */

export const SYNC_ERRORS = {
  // Profile sync errors
  PROFILE_SYNC_FAILED: 'systemErrors.sync.profileSyncFailed',
  INVALID_PROFILE_RESPONSE: 'systemErrors.sync.invalidProfileResponse',

  // Bike Angel sync errors
  BIKE_ANGEL_SYNC_FAILED: 'systemErrors.sync.bikeAngelSyncFailed',
  INVALID_BIKE_ANGEL_RESPONSE: 'systemErrors.sync.invalidBikeAngelResponse',

  // Subscriptions sync errors
  SUBSCRIPTIONS_SYNC_FAILED: 'systemErrors.sync.subscriptionsSyncFailed',
  INVALID_SUBSCRIPTIONS_RESPONSE: 'systemErrors.sync.invalidSubscriptionsResponse',

  // Trip sync errors
  TRIP_SYNC_FAILED: 'systemErrors.sync.tripSyncFailed',
  INVALID_TRIP_RESPONSE: 'systemErrors.sync.invalidTripResponse',

  // Generic sync errors
  RATE_LIMITED: 'systemErrors.sync.rateLimited',
  INVALID_RESPONSE: 'systemErrors.sync.invalidResponse',
  HTTP_ERROR: 'systemErrors.sync.httpError',
} as const;

/**
 * Get error message with status code substitution
 * For client-side consumption where i18n is available
 */
export function formatSyncError(errorKey: string): string {
  // This is used by sync error handlers that have access to i18n
  // The actual translation lookup happens in the error handler
  return errorKey;
}

/**
 * Create an error with an i18n key attached for later translation
 */
export function createSyncError(
  i18nKey: string,
  details?: Record<string, string | number>
): Error & { i18nKey?: string; details?: Record<string, string | number> } {
  const error = new Error(i18nKey) as Error & {
    i18nKey?: string;
    details?: Record<string, string | number>;
  };
  error.i18nKey = i18nKey;
  error.details = details;
  return error;
}

/**
 * Check if an error has an i18n key
 */
export function hasSyncErrorKey(error: unknown): error is Error & { i18nKey: string } {
  return (
    error instanceof Error && typeof (error as Error & { i18nKey?: string }).i18nKey === 'string'
  );
}

/**
 * Get i18n key from error
 */
export function getSyncErrorKey(error: unknown): string | null {
  if (
    error instanceof Error &&
    typeof (error as Error & { i18nKey?: string }).i18nKey === 'string'
  ) {
    return (error as Error & { i18nKey: string }).i18nKey;
  }
  return null;
}
