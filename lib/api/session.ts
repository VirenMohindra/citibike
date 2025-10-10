/**
 * Session Management Utilities
 * Handles session generation and management for Lyft API
 */

// ============================================
// Session Types
// ============================================
export interface SessionData {
  j: string; // Journey ID
  i: boolean; // Is authenticated
  e: string; // Event ID (usually zeros)
  b: string; // Browser/client ID
}

export interface SessionInfo {
  xSession: string; // Base64 encoded session data
  clientSessionId: string; // Client session UUID
  sessionData: SessionData; // Raw session data
}

// ============================================
// UUID Generation
// ============================================

/**
 * Generate a UUID v4 matching the iOS app format
 * Format: XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX
 */
export function generateSessionId(): string {
  // Use crypto.randomUUID for better randomness when available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().toUpperCase();
  }

  // Fallback to manual generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

/**
 * Generate a zero UUID
 */
export function generateZeroUuid(): string {
  return '00000000-0000-0000-0000-000000000000';
}

// ============================================
// Session Creation
// ============================================

/**
 * Create a new session for Lyft API requests
 */
export function createSession(): SessionInfo {
  const clientSessionId = generateSessionId();
  const sessionData: SessionData = {
    j: generateSessionId(),
    i: false,
    e: generateZeroUuid(),
    b: generateSessionId(),
  };

  const xSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  return {
    xSession,
    clientSessionId,
    sessionData,
  };
}

/**
 * Create an authenticated session (after login)
 */
export function createAuthenticatedSession(existingSession?: SessionInfo): SessionInfo {
  const session = existingSession || createSession();

  // Update the 'i' flag to indicate authentication
  const updatedSessionData: SessionData = {
    ...session.sessionData,
    i: true,
  };

  const xSession = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');

  return {
    ...session,
    xSession,
    sessionData: updatedSessionData,
  };
}

// ============================================
// Session Parsing
// ============================================

/**
 * Parse a base64 encoded session string
 */
export function parseSession(xSession: string): SessionData | null {
  try {
    const decoded = Buffer.from(xSession, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Check if a session is authenticated
 */
export function isAuthenticatedSession(xSession: string): boolean {
  const sessionData = parseSession(xSession);
  return sessionData?.i === true;
}

// ============================================
// Identifier Management
// ============================================

export interface DeviceIdentifier {
  type: string;
  source: string;
  name: string;
}

/**
 * Create device identifiers for authentication
 */
export function createDeviceIdentifiers(): DeviceIdentifier[] {
  return [
    {
      type: 'icloud',
      source: 'icloud',
      name: `web-${Math.random().toString(36).substring(2, 15)}`,
    },
  ];
}

/**
 * Encode device identifiers for API request
 */
export function encodeIdentifiers(identifiers: DeviceIdentifier[] = []): string {
  return Buffer.from(JSON.stringify(identifiers)).toString('base64');
}

/**
 * Create empty identifiers (for email challenge)
 */
export function createEmptyIdentifiers(): string {
  return encodeIdentifiers([]);
}

// ============================================
// Cookie Configuration
// ============================================

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Get standard cookie options for session storage
 */
export function getSessionCookieOptions(maxAgeSeconds: number = 600): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAgeSeconds,
    path: '/',
  };
}

/**
 * Get cookie options for access tokens
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  return getSessionCookieOptions(60 * 60 * 24); // 24 hours
}

/**
 * Get cookie options for refresh tokens
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  return getSessionCookieOptions(60 * 60 * 24 * 30); // 30 days
}

// ============================================
// Session Storage Keys
// ============================================
export const SESSION_COOKIES = {
  // Temporary session data (during auth flow)
  TEMP_SESSION: 'citibike_temp_session',
  TEMP_CLIENT_SESSION: 'citibike_temp_client_session',
  TEMP_PHONE: 'citibike_temp_phone',

  // Authenticated session
  ACCESS_TOKEN: 'citibike_access_token',
  REFRESH_TOKEN: 'citibike_refresh_token',
  USER_ID: 'citibike_user_id',
} as const;

// ============================================
// Session Validation
// ============================================

/**
 * Validate session data structure
 */
export function isValidSessionData(data: unknown): data is SessionData {
  if (!data || typeof data !== 'object') return false;

  const session = data as Record<string, unknown>;
  return (
    typeof session.j === 'string' &&
    typeof session.i === 'boolean' &&
    typeof session.e === 'string' &&
    typeof session.b === 'string'
  );
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
