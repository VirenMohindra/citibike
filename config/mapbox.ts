/**
 * Mapbox Configuration
 * Centralized configuration for Mapbox maps optimized for NYC/Manhattan CitiBike service area
 */

import mapboxgl from 'mapbox-gl';

// ============================================
// Mapbox Token
// ============================================
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Initialize Mapbox token
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

// ============================================
// Geographic Bounds
// ============================================

/**
 * NYC bounds (includes all 5 boroughs)
 * Optimized for CitiBike service area which spans Manhattan, Brooklyn, Queens, Bronx, and Jersey City
 */
export const NYC_BOUNDS: [number, number, number, number] = [
  -74.05, // West (includes Jersey City)
  40.68, // South (includes South Brooklyn)
  -73.9, // East (includes Western Queens)
  40.88, // North (includes Upper Manhattan/Bronx)
];

/**
 * NYC bounds as LngLatBoundsLike for Mapbox GL
 */
export const NYC_BOUNDS_LNGLAT: mapboxgl.LngLatBoundsLike = [
  [NYC_BOUNDS[0], NYC_BOUNDS[1]], // Southwest
  [NYC_BOUNDS[2], NYC_BOUNDS[3]], // Northeast
];

/**
 * NYC center coordinates [lng, lat]
 */
export const NYC_CENTER: [number, number] = [-73.98, 40.75];

// ============================================
// Zoom Levels
// ============================================

/**
 * Minimum zoom level (street level view)
 * Below this, individual stations are hard to see
 */
export const MIN_ZOOM = 11;

/**
 * Maximum zoom level (building level view)
 * Above this, too much detail for bike navigation
 */
export const MAX_ZOOM = 18;

/**
 * Default initial zoom for main map
 */
export const DEFAULT_ZOOM = 12;

/**
 * Default zoom when viewing trip details
 */
export const TRIP_DETAIL_ZOOM = 14;

/**
 * Zoom level for fitting bounds with padding
 */
export const FIT_BOUNDS_MAX_ZOOM = 15;

// ============================================
// Map Styles
// ============================================

/**
 * Get optimized Mapbox style URL for given theme
 * Uses ?optimize=true parameter to reduce tile sizes by 20-40%
 */
export function getMapboxStyle(theme: 'light' | 'dark'): string {
  const baseStyle =
    theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

  // Add optimize=true to enable style-optimized vector tiles
  // This removes unused layers and reduces tile size significantly
  return `${baseStyle}?optimize=true`;
}

// ============================================
// Map Options
// ============================================

/**
 * Common map initialization options for multi-city bikeshare
 * Note: center and zoom are set dynamically per city by the Map component
 */
export const COMMON_MAP_OPTIONS: Partial<mapboxgl.MapboxOptions> = {
  // Geographic constraints (set dynamically per city)
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  // maxBounds removed - different cities have different bounds

  // Performance optimizations
  renderWorldCopies: false, // Don't render duplicate worlds
  attributionControl: false, // We add compact attribution separately

  // Interaction settings
  dragRotate: false, // Disable rotation for simpler bike navigation
  touchPitch: false, // Disable pitch on touch devices
};

/**
 * Options for fitting bounds to show route/stations
 */
export const FIT_BOUNDS_OPTIONS: mapboxgl.FitBoundsOptions = {
  padding: 100,
  maxZoom: FIT_BOUNDS_MAX_ZOOM,
  duration: 1000,
};

/**
 * Options for flying to a specific location
 */
export const FLY_TO_OPTIONS = {
  zoom: TRIP_DETAIL_ZOOM,
  duration: 1500,
};

// ============================================
// Clustering Configuration
// ============================================

/**
 * Supercluster configuration for station markers
 */
export const CLUSTER_OPTIONS = {
  radius: 60, // Cluster radius in pixels
  maxZoom: 16, // Max zoom to cluster points on
  minZoom: 0,
  minPoints: 3, // Minimum points to form a cluster
};

// ============================================
// Routing Configuration
// ============================================

/**
 * Mapbox Directions API base URL
 */
export const DIRECTIONS_API_BASE = 'https://api.mapbox.com/directions/v5/mapbox';

/**
 * Get Mapbox Directions API URL
 */
export function getDirectionsUrl(
  profile: 'cycling' | 'walking',
  coordinates: string,
  options?: {
    exclude?: string;
    steps?: boolean;
    bannerInstructions?: boolean;
    language?: string;
  }
): string {
  const { exclude = '', steps = true, bannerInstructions = true, language = 'en' } = options || {};

  const params = new URLSearchParams({
    geometries: 'geojson',
    steps: steps.toString(),
    banner_instructions: bannerInstructions.toString(),
    language,
    access_token: MAPBOX_TOKEN,
  });

  if (exclude) {
    params.append('exclude', exclude);
  }

  return `${DIRECTIONS_API_BASE}/${profile}/${coordinates}?${params.toString()}`;
}

// ============================================
// Cache Configuration
// ============================================

/**
 * Cache keys for service worker
 */
export const MAPBOX_CACHE_KEYS = {
  TILES: 'mapbox-tiles-v1',
  STYLES: 'mapbox-styles-v1',
  SPRITES: 'mapbox-sprites-v1',
  GLYPHS: 'mapbox-glyphs-v1',
};

/**
 * Tile cache expiration (30 days in seconds)
 * Vector tiles rarely change for base maps
 */
export const TILE_CACHE_EXPIRATION = 30 * 24 * 60 * 60;

/**
 * Tile URL patterns for caching
 */
export const MAPBOX_TILE_PATTERNS = [
  /^https:\/\/api\.mapbox\.com\/v4\/.*/,
  /^https:\/\/api\.mapbox\.com\/styles\/v1\/.*/,
  /^https:\/\/api\.mapbox\.com\/fonts\/v1\/.*/,
];
