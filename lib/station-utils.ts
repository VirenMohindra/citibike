import type { StationWithStatus } from './types';

/**
 * Known duplicate station names (0.1% of all stations)
 * These will get a station ID suffix in the URL
 */
const DUPLICATE_STATION_NAMES = new Set(['Clinton St & Grand St', 'W 42 St & 6 Ave']);

/**
 * Convert a station name to a URL-safe slug
 * Example: "W 42 St & 6 Ave" → "w-42-st-6-ave"
 */
export function stationNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '') // Remove ampersands
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Get the URL slug for a station
 * For duplicate station names, appends a short ID suffix
 * Example: "clinton-st-grand-st-66dbc420"
 */
export function getStationSlug(station: StationWithStatus): string {
  const baseSlug = stationNameToSlug(station.name);

  // If this is a known duplicate, append first 8 chars of station ID
  if (DUPLICATE_STATION_NAMES.has(station.name)) {
    const shortId = station.station_id.substring(0, 8);
    return `${baseSlug}-${shortId}`;
  }

  return baseSlug;
}

/**
 * Find a station by its slug
 * Handles both regular slugs and duplicate station slugs with ID suffix
 * Also supports legacy UUID format for backward compatibility
 */
export function findStationBySlug(
  stations: StationWithStatus[],
  slug: string
): StationWithStatus | undefined {
  // First, try to match as UUID (backward compatibility)
  const byId = stations.find((s) => s.station_id === slug);
  if (byId) return byId;

  // Try to match by exact slug (handles duplicates with ID suffix)
  const byExactSlug = stations.find((s) => getStationSlug(s) === slug);
  if (byExactSlug) return byExactSlug;

  // For non-duplicate stations, try base slug match
  const byBaseSlug = stations.find((s) => stationNameToSlug(s.name) === slug);
  if (byBaseSlug) return byBaseSlug;

  return undefined;
}

/**
 * Check if a station name is a known duplicate
 */
export function isDuplicateStationName(name: string): boolean {
  return DUPLICATE_STATION_NAMES.has(name);
}
