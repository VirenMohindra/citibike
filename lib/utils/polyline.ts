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
