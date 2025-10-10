/**
 * Google Polyline Encoding Algorithm
 * Decodes an encoded polyline string into an array of [longitude, latitude] coordinates
 *
 * Based on: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Decodes an encoded polyline string into an array of coordinates
 * @param encoded - The encoded polyline string
 * @param precision - Precision factor (default: 5 for standard polylines, 6 for high-precision)
 * @returns Array of [longitude, latitude] pairs
 */
export function decodePolyline(encoded: string, precision: number = 5): Array<[number, number]> {
  if (!encoded || encoded.length === 0) {
    return [];
  }

  const factor = Math.pow(10, precision);
  const coordinates: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  try {
    while (index < encoded.length) {
      // Decode latitude
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      // Decode longitude
      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      // Add coordinate as [longitude, latitude] for GeoJSON compatibility
      coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
}

/**
 * Encodes an array of coordinates into a polyline string
 * @param coordinates - Array of [longitude, latitude] pairs
 * @param precision - Precision factor (default: 5)
 * @returns Encoded polyline string
 */
export function encodePolyline(
  coordinates: Array<[number, number]>,
  precision: number = 5
): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  const factor = Math.pow(10, precision);
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of coordinates) {
    const roundedLat = Math.round(lat * factor);
    const roundedLng = Math.round(lng * factor);

    const deltaLat = roundedLat - prevLat;
    const deltaLng = roundedLng - prevLng;

    output += encodeNumber(deltaLat);
    output += encodeNumber(deltaLng);

    prevLat = roundedLat;
    prevLng = roundedLng;
  }

  return output;
}

/**
 * Encodes a single number using the polyline algorithm
 * @param num - The number to encode
 * @returns Encoded string
 */
function encodeNumber(num: number): string {
  let encoded = '';
  let value = num < 0 ? ~(num << 1) : num << 1;

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Calculates the total distance along a polyline in meters
 * Uses the Haversine formula for distance calculation
 * @param coordinates - Array of [longitude, latitude] pairs
 * @returns Total distance in meters
 */
export function calculatePolylineDistance(coordinates: Array<[number, number]>): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    totalDistance += haversineDistance(lat1, lng1, lat2, lng2);
  }

  return totalDistance;
}

/**
 * Calculates the distance between two points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Simplifies a polyline by removing points that don't significantly change direction
 * Uses the Ramer-Douglas-Peucker algorithm
 * @param coordinates - Array of [longitude, latitude] pairs
 * @param tolerance - Simplification tolerance in degrees (default: 0.0001)
 * @returns Simplified array of coordinates
 */
export function simplifyPolyline(
  coordinates: Array<[number, number]>,
  tolerance: number = 0.0001
): Array<[number, number]> {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  return ramerDouglasPeucker(coordinates, tolerance);
}

/**
 * Ramer-Douglas-Peucker algorithm for polyline simplification
 */
function ramerDouglasPeucker(
  points: Array<[number, number]>,
  tolerance: number
): Array<[number, number]> {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with the maximum distance from the line
  let maxDistance = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = ramerDouglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = ramerDouglasPeucker(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }

  // Otherwise, return just the endpoints
  return [points[0], points[end]];
}

/**
 * Calculates perpendicular distance from a point to a line segment
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Line start and end are the same point
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);

  if (t < 0) {
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  } else if (t > 1) {
    return Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
  }

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
}
