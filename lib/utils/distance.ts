/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a certain radius (in meters) from a center point
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusMeters;
}

/**
 * Calculate appropriate radius based on zoom level (in meters)
 * Higher zoom = closer view = smaller radius
 */
export function getRadiusForZoom(zoom: number): number {
  if (zoom < 12) return 5000; // Far out: 5km
  if (zoom < 13) return 3000; // Medium-far: 3km
  if (zoom < 14) return 2000; // Medium: 2km
  if (zoom < 15) return 1000; // Medium-close: 1km
  if (zoom < 16) return 500; // Close: 0.5km
  if (zoom < 17) return 300; // Very close: 0.3km
  return 100; // Extremely close: 0.1km
}
