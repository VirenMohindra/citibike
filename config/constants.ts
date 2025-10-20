/**
 * Application-wide constants and enums
 */

// ============================================
// App Metadata
// ============================================
export const APP_NAME = 'Citibike Route Planner';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Real-time route planning for NYC Citibike system';

export const AUTH_CONSTANTS = {
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  SESSION_EXPIRY_SECONDS: 600, // 10 minutes
} as const;

// ============================================
// Multi-City Configuration
// ============================================
export const CITY_CONSTANTS = {
  DEFAULT_CITY_ID: 'nyc',
  COOKIE_NAME: 'citibike_selected_city',
  COOKIE_MAX_AGE: 31536000, // 1 year in seconds
} as const;

export const SESSION_CONSTANTS = {
  ACCESS_TOKEN_COOKIE: 'citibike_access_token',
  OAUTH_COOKIE: 'citibike_oauth_cookie',
  COOKIE_MAX_AGE: 86400, // 24 hours in seconds
} as const;

// ============================================
// Validation Patterns
// ============================================
export const VALIDATION_PATTERNS = {
  PHONE: /^\+1\d{10}$/,
  OTP_CODE: /^\d{4,6}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STATION_ID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
} as const;

// ============================================
// Error Codes
// ============================================
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CHALLENGE_REQUIRED = 'challenge_required',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_PHONE = 'INVALID_PHONE',

  // API errors
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}
