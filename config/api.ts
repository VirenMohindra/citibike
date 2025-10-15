/**
 * API Configuration
 * Centralized configuration for all external API endpoints
 */

// ============================================
// Base URLs
// ============================================
export const API_CONFIG = {
  // Lyft API (for authentication and user data)
  LYFT: {
    BASE_URL: process.env.NEXT_PUBLIC_LYFT_API_URL || 'https://api.lyft.com',
    VERSION: 'v1',
  },

  // GBFS API (for station data)
  GBFS: {
    BASE_URL: process.env.NEXT_PUBLIC_GBFS_API_URL || 'https://gbfs.citibikenyc.com',
    VERSION: 'gbfs/en',
  },
} as const;

// ============================================
// Lyft API Endpoints
// ============================================
export const LYFT_ENDPOINTS = {
  // OAuth
  OAUTH: {
    TOKEN: '/oauth2/access_token',
  },

  // Phone Authentication
  AUTH: {
    PHONE_AUTH: '/v1/phoneauth',
  },

  // User
  USER: {
    PASSENGER: '/v1/passenger',
    SUBSCRIPTIONS: '/v1/clients/subscriptions',
  },

  // Trips
  TRIPS: {
    ACTIVE_TRIPS: '/v1/core_trips/activetrips',
    TRIP_HISTORY: '/v1/triphistory',
    TRIP_DETAILS: (rideId: string) => `/v1/last-mile/ride-history/${rideId}`,
  },
  // Last Mile (Bike Angel, etc.)
  LAST_MILE: {
    BIKE_ANGEL_PROFILE: '/v1/lbsbff/screens/bike-angel-profile',
    MAP_ITEMS: '/v1/last-mile/map-items',
  },
};

// ============================================
// Default Headers
// ============================================

/**
 * Citibike app headers (from mitmproxy capture)
 */
export const CITIBIKE_APP_HEADERS = {
  USER_AGENT: 'com.citibikenyc.citibike:iOS:18.6.2:2025.38.3.26642648',
  USER_DEVICE: 'iPhone16,1',
  DESIGN_ID: 'x',
  DEVICE_DENSITY: '3.0',
  LOCALE_LANGUAGE: 'en',
  LOCALE_REGION: 'US',
  ACCEPT_LANGUAGE: 'en_US',
  TIMESTAMP_SOURCE: 'system',
  INTEROP_VERSION: '6',
  UPLOAD_COMPLETE: '?1',
} as const;

/**
 * Generate standard Lyft API headers
 */
export function createLyftHeaders(
  options: {
    token?: string;
    clientSessionId?: string;
    xSession?: string;
    isJson?: boolean;
    idlSource?: string;
  } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    'user-agent': CITIBIKE_APP_HEADERS.USER_AGENT,
    'user-device': CITIBIKE_APP_HEADERS.USER_DEVICE,
    'x-design-id': CITIBIKE_APP_HEADERS.DESIGN_ID,
    'x-device-density': CITIBIKE_APP_HEADERS.DEVICE_DENSITY,
    'x-locale-language': CITIBIKE_APP_HEADERS.LOCALE_LANGUAGE,
    'x-locale-region': CITIBIKE_APP_HEADERS.LOCALE_REGION,
    'accept-language': CITIBIKE_APP_HEADERS.ACCEPT_LANGUAGE,
    'x-timestamp-ms': Date.now().toString(),
    'x-timestamp-source': CITIBIKE_APP_HEADERS.TIMESTAMP_SOURCE,
  };

  // Add optional headers
  if (options.token) {
    headers['authorization'] = `Bearer ${options.token}`;
  }

  if (options.clientSessionId) {
    headers['x-client-session-id'] = options.clientSessionId;
  }

  if (options.xSession) {
    headers['x-session'] = options.xSession;
  }

  if (options.idlSource) {
    headers['x-idl-source'] = options.idlSource;
  }

  // Content type headers
  if (options.isJson) {
    headers['content-type'] = 'application/json';
    headers['accept'] = 'application/json';
  } else {
    headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
    headers['accept'] = 'application/json';
  }

  // Upload headers for POST requests
  headers['upload-draft-interop-version'] = CITIBIKE_APP_HEADERS.INTEROP_VERSION;
  headers['upload-complete'] = CITIBIKE_APP_HEADERS.UPLOAD_COMPLETE;
  headers['cookie'] = ''; // Empty cookie header required by Lyft

  return headers;
}

/**
 * Generate basic auth header
 */
export function createBasicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

// ============================================
// Request Configuration
// ============================================

export const REQUEST_CONFIG = {
  // Timeout values in milliseconds
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    LONG: 60000, // 1 minute
    SHORT: 10000, // 10 seconds
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Cache configuration (for SWR)
  CACHE: {
    STATION_INFO_TTL: 86400000, // 24 hours
    STATION_STATUS_TTL: 30000, // 30 seconds
    USER_PROFILE_TTL: 300000, // 5 minutes
    SUBSCRIPTIONS_TTL: 3600000, // 1 hour
  },
} as const;

// ============================================
// API Response Types
// ============================================

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  CHALLENGE_REQUIRED = 'challenge_required',
}

export interface ApiResponse<T = unknown> {
  status: ResponseStatus;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}
