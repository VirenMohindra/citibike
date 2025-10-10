/**
 * Application-wide constants and enums
 */

// ============================================
// App Metadata
// ============================================
export const APP_NAME = 'Citibike Route Planner';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Real-time route planning for NYC Citibike system';

// ============================================
// Page Routes
// ============================================
export enum PageRoute {
  HOME = '/',
  // Add more pages as the app grows
}

// ============================================
// API Routes
// ============================================
export enum ApiRoute {
  // Station endpoints
  STATIONS_INFO = '/api/stations/info',
  STATIONS_STATUS = '/api/stations/status',

  // Authentication endpoints
  OTP_REQUEST = '/api/citibike/otp/request',
  OTP_VERIFY = '/api/citibike/otp/verify',
  OTP_CHALLENGE = '/api/citibike/otp/challenge',

  // User endpoints
  PROFILE = '/api/citibike/profile',
  SUBSCRIPTIONS = '/api/citibike/subscriptions',
  LOGOUT = '/api/citibike/logout',
}

// ============================================
// Authentication
// ============================================
export enum AuthStep {
  PHONE = 'phone',
  OTP = 'otp',
  EMAIL_CHALLENGE = 'email_challenge',
  COMPLETE = 'complete',
}

export const AUTH_CONSTANTS = {
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  SESSION_EXPIRY_SECONDS: 600, // 10 minutes
  ACCESS_TOKEN_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  SMS_SENDER: '+1 (833) 504-2560',
  OTP_CODE_LENGTH: 6,
} as const;

// ============================================
// Map Configuration
// ============================================
export const MAP_CONSTANTS = {
  DEFAULT_CENTER: { lat: 40.7128, lng: -73.9352 } as const,
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  CLUSTER_RADIUS: 50,
  CLUSTER_MAX_ZOOM: 14,
  MARKER_SIZE: {
    DEFAULT: 24,
    SELECTED: 32,
    CLUSTERED: 40,
  },
  UPDATE_INTERVAL_MS: 30000, // 30 seconds
} as const;

// ============================================
// Station Status
// ============================================
export enum StationStatus {
  AVAILABLE = 'available',
  LIMITED = 'limited',
  EMPTY = 'empty',
  FULL = 'full',
  OFFLINE = 'offline',
}

export const STATION_THRESHOLDS = {
  MANY_BIKES: 5, // Green marker
  FEW_BIKES: 1, // Amber marker
  NO_BIKES: 0, // Gray marker
  MANY_DOCKS: 5,
  FEW_DOCKS: 1,
  NO_DOCKS: 0,
} as const;

// ============================================
// Route Planning
// ============================================
export enum RouteProfile {
  FASTEST = 'fastest',
  SAFEST = 'safest',
  FLAT = 'flat',
}

export enum TravelMode {
  CYCLING_REGULAR = 'cycling-regular',
  CYCLING_ELECTRIC = 'cycling-electric',
  WALKING = 'walking',
}

// ============================================
// UI States
// ============================================
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================
// Storage Keys
// ============================================
export const STORAGE_KEYS = {
  ROUTE_HISTORY: 'citibike_route_history',
  FAVORITE_STATIONS: 'citibike_favorite_stations',
  USER_PREFERENCES: 'citibike_user_preferences',
  MAP_SETTINGS: 'citibike_map_settings',
} as const;

// ============================================
// Timing Constants
// ============================================
export const TIMING = {
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 100,
  ANIMATION_DURATION_MS: 200,
  TOAST_DURATION_MS: 3000,
  ERROR_DISPLAY_MS: 5000,
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
  INVALID_OTP = 'INVALID_OTP',
  INVALID_EMAIL = 'INVALID_EMAIL',

  // API errors
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',

  // App errors
  GEOLOCATION_DENIED = 'GEOLOCATION_DENIED',
  GEOLOCATION_UNAVAILABLE = 'GEOLOCATION_UNAVAILABLE',
  NO_STATIONS_FOUND = 'NO_STATIONS_FOUND',
}

// ============================================
// Feature Flags
// ============================================
export const FEATURES = {
  AUTHENTICATION: process.env.CITIBIKE_CLIENT_ID && process.env.CITIBIKE_CLIENT_SECRET,
  TRIP_HISTORY: false, // Not yet implemented
  DARK_MODE: false, // Not yet implemented
  PWA: false, // Not yet implemented
} as const;
