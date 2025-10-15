/**
 * Application Routes Configuration
 * Centralized route definitions for pages and API endpoints
 */

// ============================================
// Page Routes
// ============================================
export const PAGES = {
  HOME: '/',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  // Future pages
  STATS: '/stats',
  TRIPS: '/trips',
  SETTINGS: '/settings',
  ABOUT: '/about',
} as const;

// ============================================
// API Base Paths
// ============================================
const API_BASE = '/api';
const CITIBIKE_BASE = `${API_BASE}/citibike`;
const STATIONS_BASE = `${API_BASE}/stations`;

// ============================================
// API Routes
// ============================================
export const API_ROUTES = {
  // Station endpoints
  STATIONS: {
    INFO: `${STATIONS_BASE}/info`,
    STATUS: `${STATIONS_BASE}/status`,
  },

  // Authentication endpoints
  AUTH: {
    OTP: {
      REQUEST: `${CITIBIKE_BASE}/otp/request`,
      VERIFY: `${CITIBIKE_BASE}/otp/verify`,
      CHALLENGE: `${CITIBIKE_BASE}/otp/challenge`,
    },
    LOGOUT: `${CITIBIKE_BASE}/logout`,
  },

  // User endpoints
  USER: {
    PROFILE: `${CITIBIKE_BASE}/profile`,
    SUBSCRIPTIONS: `${CITIBIKE_BASE}/subscriptions`,
    BIKE_ANGEL: `${CITIBIKE_BASE}/bike-angel`,
  },

  // Trip endpoints
  TRIPS: {
    HISTORY: `${CITIBIKE_BASE}/trips/history`,
    DETAILS: (id: string) => `${CITIBIKE_BASE}/trips/${id}`,
    ACTIVE: `${CITIBIKE_BASE}/trips/active`,
    STATS: `${CITIBIKE_BASE}/trips/stats`,
  },
} as const;

// ============================================
// External Links
// ============================================
export const EXTERNAL_LINKS = {
  CITIBIKE: {
    MAIN: 'https://citibikenyc.com',
    PRICING: 'https://citibikenyc.com/pricing',
    HOW_IT_WORKS: 'https://citibikenyc.com/how-it-works',
  },
  MAPBOX: {
    ACCESS_TOKENS: 'https://console.mapbox.com/account/access-tokens/',
  },
  GITHUB: {
    REPO: 'https://github.com/virenmohindra/citibike',
    ISSUES: 'https://github.com/virenmohindra/citibike/issues',
  },
} as const;

// ============================================
// Route Helpers
// ============================================
// NOTE: These helper functions are utilities prepared for future use
// They will be utilized as the application grows and adds features like:
// - Dynamic API route construction with query parameters
// - Route-based authentication checks
// - Metadata-driven page titles and SEO

/**
 * Build API route with query parameters
 * @future Will be used when implementing filtered API requests
 */
export function buildApiRoute(
  route: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params || Object.keys(params).length === 0) {
    return route;
  }

  const queryString = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString();

  return `${route}?${queryString}`;
}

/**
 * Check if a path is an API route
 * @future Will be used for middleware route filtering
 */
export function isApiRoute(path: string): boolean {
  return path.startsWith(API_BASE);
}

/**
 * Check if a path is an authentication route
 * @future Will be used for auth flow redirects
 */
export function isAuthRoute(path: string): boolean {
  return path.startsWith(CITIBIKE_BASE) && path.includes('/otp');
}

/**
 * Get route name from path
 * @future Will be used for breadcrumbs and navigation highlights
 */
export function getRouteName(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Map paths to friendly names
  const routeMap: Record<string, string> = {
    [PAGES.HOME]: 'Home',
    [PAGES.STATS]: 'Statistics',
    [PAGES.TRIPS]: 'Trip History',
    [PAGES.SETTINGS]: 'Settings',
    [PAGES.ABOUT]: 'About',
  };

  return routeMap[cleanPath] || 'Unknown';
}

// ============================================
// Navigation Configuration
// ============================================
export const NAVIGATION = {
  MAIN: [
    { label: 'Home', path: PAGES.HOME },
    // { label: 'Stats', path: PAGES.STATS },
    // { label: 'Settings', path: PAGES.SETTINGS },
  ],
  FOOTER: [
    { label: 'About', path: PAGES.ABOUT },
    { label: 'GitHub', path: EXTERNAL_LINKS.GITHUB.REPO, external: true },
    {
      label: 'Report Issue',
      path: EXTERNAL_LINKS.GITHUB.ISSUES,
      external: true,
    },
  ],
} as const;

// ============================================
// Route Permissions
// ============================================
export const ROUTE_PERMISSIONS = {
  PUBLIC: [PAGES.HOME, PAGES.ABOUT, API_ROUTES.STATIONS.INFO, API_ROUTES.STATIONS.STATUS],
  AUTHENTICATED: [
    PAGES.STATS,
    PAGES.TRIPS,
    PAGES.SETTINGS,
    API_ROUTES.USER.PROFILE,
    API_ROUTES.USER.SUBSCRIPTIONS,
    API_ROUTES.TRIPS.HISTORY,
    API_ROUTES.TRIPS.STATS,
  ],
} as const;

/**
 * Check if route requires authentication
 * @future Will be used for protected route middleware
 */
export function requiresAuth(path: string): boolean {
  return ROUTE_PERMISSIONS.AUTHENTICATED.some((route) => route === path);
}

// ============================================
// Route Metadata
// ============================================
// NOTE: Prepared for future SEO optimization and dynamic page titles
export const ROUTE_METADATA = {
  [PAGES.HOME]: {
    title: 'Citibike Route Planner',
    description: 'Plan your Citibike route with real-time station availability',
    keywords: ['citibike', 'nyc', 'bike', 'route', 'planner'],
  },
  [PAGES.STATS]: {
    title: 'Your Ride Statistics',
    description: 'View your Citibike ride history and statistics',
    keywords: ['citibike', 'statistics', 'rides', 'history'],
  },
  [PAGES.TRIPS]: {
    title: 'Trip History',
    description: 'Visualize your Citibike trips on an interactive map',
    keywords: ['citibike', 'trips', 'visualization', 'map', 'history'],
  },
  [PAGES.SETTINGS]: {
    title: 'Settings',
    description: 'Configure your Citibike app preferences',
    keywords: ['settings', 'preferences', 'configuration'],
  },
  [PAGES.ABOUT]: {
    title: 'About Citibike Route Planner',
    description: 'Learn more about the Citibike Route Planner app',
    keywords: ['about', 'information', 'citibike'],
  },
} as const;

/**
 * Get metadata for a route
 * @future Will be used for dynamic page metadata and SEO
 */
export function getRouteMetadata(path: string) {
  const cleanPath = path.split('?')[0];
  return ROUTE_METADATA[cleanPath as keyof typeof ROUTE_METADATA] || ROUTE_METADATA[PAGES.HOME];
}
