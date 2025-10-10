/**
 * Trip Decoder Service
 * Decodes polylines and interpolates timestamps for trip playback and visualization
 * Uses LRU cache for performance
 */

import { decodePolyline } from './polyline';
import type { Trip } from '@/lib/db/schema';

export interface DecodedTrip {
  tripId: string;
  coordinates: Array<[number, number]>; // [lng, lat]
  timestamps: number[]; // Unix timestamp for each point
  distances: number[]; // Cumulative distance in meters from start
  totalDistance: number; // Total trip distance in meters
  avgSpeed: number; // Average speed in meters/second
}

interface CacheEntry {
  data: DecodedTrip;
  decodedAt: number;
  size: number; // Approximate memory size in bytes
}

/**
 * LRU Cache for decoded trips
 * Automatically evicts oldest entries when memory limit is reached
 */
class TripDecoderCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSizeBytes: number;
  private currentSizeBytes = 0;

  constructor(maxSizeMB: number = 10) {
    this.maxSizeBytes = maxSizeMB * 1024 * 1024;
  }

  get(tripId: string): DecodedTrip | null {
    const entry = this.cache.get(tripId);
    if (!entry) return null;

    // Update access order (move to end = most recently used)
    const index = this.accessOrder.indexOf(tripId);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(tripId);

    return entry.data;
  }

  set(tripId: string, data: DecodedTrip): void {
    // Calculate approximate size
    const size = this.calculateSize(data);

    // Remove old entry if exists
    if (this.cache.has(tripId)) {
      const oldEntry = this.cache.get(tripId)!;
      this.currentSizeBytes -= oldEntry.size;
    }

    // Evict until we have space
    while (this.currentSizeBytes + size > this.maxSizeBytes && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      const oldEntry = this.cache.get(oldestKey);
      if (oldEntry) {
        this.currentSizeBytes -= oldEntry.size;
        this.cache.delete(oldestKey);
      }
    }

    // Add new entry
    this.cache.set(tripId, {
      data,
      decodedAt: Date.now(),
      size,
    });
    this.accessOrder.push(tripId);
    this.currentSizeBytes += size;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSizeBytes = 0;
  }

  getStats() {
    return {
      entriesCount: this.cache.size,
      sizeMB: (this.currentSizeBytes / 1024 / 1024).toFixed(2),
      maxSizeMB: (this.maxSizeBytes / 1024 / 1024).toFixed(2),
    };
  }

  private calculateSize(data: DecodedTrip): number {
    // Approximate: each coordinate pair is ~16 bytes (2 numbers)
    // Each timestamp is ~8 bytes, each distance is ~8 bytes
    const coordSize = data.coordinates.length * 16;
    const timestampSize = data.timestamps.length * 8;
    const distanceSize = data.distances.length * 8;
    return coordSize + timestampSize + distanceSize + 100; // +100 for overhead
  }
}

/**
 * Trip Decoder Service
 * Singleton service for decoding and caching trip data
 */
class TripDecoderService {
  private cache: TripDecoderCache;

  constructor() {
    this.cache = new TripDecoderCache(10); // 10MB cache
  }

  /**
   * Decode a trip and interpolate timestamps
   * Uses cache for performance
   */
  decodeTrip(trip: Trip): DecodedTrip | null {
    // Check cache first
    const cached = this.cache.get(trip.id);
    if (cached) {
      return cached;
    }

    // Must have polyline to decode
    if (!trip.polyline) {
      return null;
    }

    // Decode polyline
    const coordinates = decodePolyline(trip.polyline);
    if (coordinates.length === 0) {
      return null;
    }

    // Calculate distances
    const distances = this.calculateCumulativeDistances(coordinates);
    const totalDistance = distances[distances.length - 1] || 0;

    // Interpolate timestamps
    const timestamps = this.interpolateTimestamps(trip.startTime, trip.endTime, coordinates.length);

    // Calculate average speed
    const duration = (trip.endTime - trip.startTime) / 1000; // seconds
    const avgSpeed = duration > 0 ? totalDistance / duration : 0;

    const decoded: DecodedTrip = {
      tripId: trip.id,
      coordinates,
      timestamps,
      distances,
      totalDistance,
      avgSpeed,
    };

    // Cache result
    this.cache.set(trip.id, decoded);

    return decoded;
  }

  /**
   * Decode multiple trips (useful for heat map generation)
   */
  decodeTrips(trips: Trip[]): DecodedTrip[] {
    return trips
      .map((trip) => this.decodeTrip(trip))
      .filter((decoded): decoded is DecodedTrip => decoded !== null);
  }

  /**
   * Get position at a specific time during the trip
   * Returns interpolated position between points
   */
  getPositionAtTime(
    decoded: DecodedTrip,
    timestamp: number
  ): {
    position: [number, number];
    progress: number; // 0-1
    distance: number; // meters from start
    speed: number; // current speed in m/s
  } | null {
    const { timestamps, coordinates, distances, totalDistance } = decoded;

    // Clamp timestamp to trip bounds
    const startTime = timestamps[0];
    const endTime = timestamps[timestamps.length - 1];
    const clampedTime = Math.max(startTime, Math.min(endTime, timestamp));

    // Find the two points we're between
    let idx = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] <= clampedTime) {
        idx = i;
      } else {
        break;
      }
    }

    // If at the end
    if (idx >= coordinates.length - 1) {
      return {
        position: coordinates[coordinates.length - 1],
        progress: 1,
        distance: totalDistance,
        speed: 0,
      };
    }

    // Interpolate between points
    const t1 = timestamps[idx];
    const t2 = timestamps[idx + 1];
    const ratio = t2 - t1 > 0 ? (clampedTime - t1) / (t2 - t1) : 0;

    const [lng1, lat1] = coordinates[idx];
    const [lng2, lat2] = coordinates[idx + 1];

    const position: [number, number] = [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];

    const distance = distances[idx] + (distances[idx + 1] - distances[idx]) * ratio;
    const progress = totalDistance > 0 ? distance / totalDistance : 0;

    // Calculate speed between these two points
    const segmentDistance = distances[idx + 1] - distances[idx];
    const segmentTime = (t2 - t1) / 1000; // seconds
    const speed = segmentTime > 0 ? segmentDistance / segmentTime : 0;

    return {
      position,
      progress,
      distance,
      speed,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Calculate cumulative distances along coordinates
   */
  private calculateCumulativeDistances(coordinates: Array<[number, number]>): number[] {
    const distances: number[] = [0];
    let cumulative = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      const segmentDist = this.haversineDistance(lat1, lng1, lat2, lng2);
      cumulative += segmentDist;
      distances.push(cumulative);
    }

    return distances;
  }

  /**
   * Interpolate timestamps uniformly across points
   * Assumes constant speed (good enough approximation)
   */
  private interpolateTimestamps(startTime: number, endTime: number, numPoints: number): number[] {
    if (numPoints === 0) return [];
    if (numPoints === 1) return [startTime];

    const timestamps: number[] = [];
    const duration = endTime - startTime;
    const interval = duration / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      timestamps.push(Math.round(startTime + interval * i));
    }

    return timestamps;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

// Singleton instance
let tripDecoderInstance: TripDecoderService | null = null;

/**
 * Get the singleton trip decoder instance
 */
export function getTripDecoder(): TripDecoderService {
  if (!tripDecoderInstance) {
    tripDecoderInstance = new TripDecoderService();
  }
  return tripDecoderInstance;
}

/**
 * Convenience function to decode a single trip
 */
export function decodeTrip(trip: Trip): DecodedTrip | null {
  return getTripDecoder().decodeTrip(trip);
}

/**
 * Convenience function to decode multiple trips
 */
export function decodeTrips(trips: Trip[]): DecodedTrip[] {
  return getTripDecoder().decodeTrips(trips);
}
