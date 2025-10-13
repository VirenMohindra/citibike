/**
 * Database Utility Functions
 * Helper functions for trip data normalization and analysis
 */

import type { Trip } from './schema';
import { decodePolyline } from '../utils/polyline';
import { haversineDistance } from '../utils/distance';

/**
 * Minimal station information needed for normalization
 * (subset of full Station type from types.ts)
 */
export interface MinimalStation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
}

// ============================================
// Constants
// ============================================

/**
 * NYC Citibike Cost Structure (2024/2025)
 */
export const CITIBIKE_COSTS = {
  ANNUAL_MEMBERSHIP: 205, // dollars per year
  MONTHLY_MEMBERSHIP: 205 / 12, // dollars per month
  EBIKE_RATE: 0.26, // dollars per minute
  CLASSIC_FREE_MINUTES: 45, // minutes free for classic bikes
  OVERAGE_RATE: 0.26, // dollars per minute after free period
} as const;

/**
 * NYC Subway Costs (2024/2025)
 */
export const SUBWAY_COSTS = {
  PAY_PER_RIDE: 2.9, // dollars per ride
  UNLIMITED_MONTHLY: 132, // dollars per month
} as const;

/**
 * Circuity factor for NYC bike routes
 * Actual bike routes are typically 1.3× the straight-line distance
 */
export const NYC_CIRCUITY_FACTOR = 1.3;

/**
 * Average subway speeds and wait times for estimation
 */
export const SUBWAY_ESTIMATES = {
  AVG_SPEED_MPH: 17, // average subway train speed
  WALK_TO_STATION_MIN: 5, // average walk time to subway station
  WALK_FROM_STATION_MIN: 5, // average walk time from subway station
  AVG_WAIT_TIME_MIN: 7, // average wait time for train
  RUSH_HOUR_WAIT_TIME_MIN: 10, // wait time during rush hour
  TRANSFER_TIME_MIN: 8, // time per transfer between lines
} as const;

/**
 * Distance and time thresholds for categorization
 */
export const THRESHOLDS = {
  SHORT_DISTANCE_MILES: 1,
  LONG_DISTANCE_MILES: 3,
  QUICK_DURATION_MIN: 20,
  STANDARD_DURATION_MIN: 45,
  MORNING_RUSH_START: 7,
  MORNING_RUSH_END: 10,
  EVENING_RUSH_START: 16,
  EVENING_RUSH_END: 20,
} as const;

// ============================================
// Distance Calculations
// ============================================
// Note: haversineDistance is imported from ../utils/distance

/**
 * Calculate distance from polyline by summing segment distances
 * Returns distance in meters
 */
export function calculatePolylineDistance(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return totalDistance;
}

/**
 * Calculate trip distance
 * - If polyline exists: decode and sum segments
 * - Otherwise: haversine × circuity factor
 */
export function calculateTripDistance(trip: Trip): {
  actualDistance: number;
  estimatedDistance?: number;
} {
  // If we have a polyline, use it for accurate distance
  if (trip.polyline) {
    try {
      const coordinates = decodePolyline(trip.polyline);
      if (coordinates.length >= 2) {
        const actualDistance = calculatePolylineDistance(coordinates);
        return { actualDistance };
      }
    } catch (error) {
      console.error('Failed to decode polyline for trip', trip.id, error);
    }
  }

  // Fall back to haversine with circuity factor
  const straightLine = haversineDistance(trip.startLat, trip.startLon, trip.endLat, trip.endLon);
  const estimatedDistance = straightLine * NYC_CIRCUITY_FACTOR;

  return { actualDistance: estimatedDistance, estimatedDistance };
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

// ============================================
// Station Matching
// ============================================

/**
 * Find the nearest station to a given lat/lon coordinate
 */
export function findNearestStation(
  stations: MinimalStation[],
  lat: number,
  lon: number
): MinimalStation | null {
  if (stations.length === 0) return null;

  let nearest = stations[0];
  let minDistance = haversineDistance(lat, lon, nearest.lat, nearest.lon);

  for (const station of stations) {
    const distance = haversineDistance(lat, lon, station.lat, station.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

// ============================================
// Cost Calculations
// ============================================

/**
 * Calculate the actual cost of a trip based on bike type and duration
 * Returns cost in dollars
 */
export function calculateTripCost(trip: Trip): number {
  const durationMinutes = trip.duration / 60;

  if (trip.bikeType === 'ebike') {
    // E-bike: $0.26/min for entire duration, ROUNDED UP
    const minutes = Math.ceil(durationMinutes);
    return minutes * CITIBIKE_COSTS.EBIKE_RATE;
  } else {
    // Classic bike: free for 45 min, then $0.26/min for overage
    if (durationMinutes <= CITIBIKE_COSTS.CLASSIC_FREE_MINUTES) {
      return 0;
    } else {
      const overageMinutes = Math.ceil(durationMinutes - CITIBIKE_COSTS.CLASSIC_FREE_MINUTES);
      return overageMinutes * CITIBIKE_COSTS.OVERAGE_RATE;
    }
  }
}

// ============================================
// Trip Categorization
// ============================================

/**
 * Categorize trip by distance
 */
export function categorizeDistance(distanceMeters: number): 'short' | 'medium' | 'long' {
  const miles = metersToMiles(distanceMeters);
  if (miles < THRESHOLDS.SHORT_DISTANCE_MILES) return 'short';
  if (miles < THRESHOLDS.LONG_DISTANCE_MILES) return 'medium';
  return 'long';
}

/**
 * Categorize trip by duration
 */
export function categorizeDuration(durationSeconds: number): 'quick' | 'standard' | 'extended' {
  const minutes = durationSeconds / 60;
  if (minutes < THRESHOLDS.QUICK_DURATION_MIN) return 'quick';
  if (minutes < THRESHOLDS.STANDARD_DURATION_MIN) return 'standard';
  return 'extended';
}

/**
 * Categorize trip by time of day
 */
export function categorizeTimeOfDay(
  timestamp: number
): 'morning_rush' | 'midday' | 'evening_rush' | 'night' {
  const date = new Date(timestamp);
  const hour = date.getHours();

  if (hour >= THRESHOLDS.MORNING_RUSH_START && hour < THRESHOLDS.MORNING_RUSH_END) {
    return 'morning_rush';
  } else if (hour >= THRESHOLDS.EVENING_RUSH_START && hour < THRESHOLDS.EVENING_RUSH_END) {
    return 'evening_rush';
  } else if (hour >= THRESHOLDS.MORNING_RUSH_END && hour < THRESHOLDS.EVENING_RUSH_START) {
    return 'midday';
  } else {
    return 'night';
  }
}

// ============================================
// Subway Time Estimation
// ============================================

/**
 * Estimate subway travel time using simple heuristic
 * This is a rough approximation - could be improved with MTA GTFS data or Google Maps API
 */
export function estimateSubwayTime(distanceMeters: number, isRushHour: boolean): number {
  const distanceMiles = metersToMiles(distanceMeters);

  // Walk to station
  let totalTime = SUBWAY_ESTIMATES.WALK_TO_STATION_MIN;

  // Wait for train
  totalTime += isRushHour
    ? SUBWAY_ESTIMATES.RUSH_HOUR_WAIT_TIME_MIN
    : SUBWAY_ESTIMATES.AVG_WAIT_TIME_MIN;

  // Ride time based on distance and average speed
  const rideTimeMin = (distanceMiles / SUBWAY_ESTIMATES.AVG_SPEED_MPH) * 60;
  totalTime += rideTimeMin;

  // Add transfer penalty for longer distances (rough heuristic)
  // Assume one transfer needed for trips > 2 miles
  if (distanceMiles > 2) {
    totalTime += SUBWAY_ESTIMATES.TRANSFER_TIME_MIN;
  }

  // Walk from station
  totalTime += SUBWAY_ESTIMATES.WALK_FROM_STATION_MIN;

  return totalTime;
}

// ============================================
// Value Calculations
// ============================================

/**
 * Calculate time value in dollars
 * @param timeMinutes - Time saved/lost in minutes
 * @param hourlyRate - User's hourly rate or value of time
 */
export function calculateTimeValue(timeMinutes: number, hourlyRate: number = 60): number {
  return (timeMinutes / 60) * hourlyRate;
}

/**
 * Calculate health value based on exercise
 * Rough estimate: $0.01 per calorie burned (based on healthcare savings)
 * Average cycling burns ~50 calories per mile
 */
export function calculateHealthValue(distanceMeters: number): number {
  const miles = metersToMiles(distanceMeters);
  const caloriesBurned = miles * 50; // 50 calories per mile
  return caloriesBurned * 0.01; // $0.01 per calorie
}

// ============================================
// Suitability Scoring
// ============================================

/**
 * Calculate suitability score for a trip (0-100)
 * Higher score = more suitable for Citibike
 */
export function calculateSuitabilityScore(
  trip: Trip,
  actualDistance: number,
  estimatedSubwayTime: number
): number {
  let score = 50; // baseline

  const distanceMiles = metersToMiles(actualDistance);
  const durationMinutes = trip.duration / 60;
  const isRushHour = trip.timeOfDay === 'morning_rush' || trip.timeOfDay === 'evening_rush';

  // Distance factor (optimal: 1-3 miles)
  if (distanceMiles < 0.5) {
    score -= 20; // too short, might as well walk
  } else if (distanceMiles > 4) {
    score -= 15; // too long, subway likely better
  } else if (distanceMiles >= 1 && distanceMiles <= 3) {
    score += 20; // sweet spot!
  }

  // Duration factor (want <45min for free classic bike)
  if (durationMinutes <= CITIBIKE_COSTS.CLASSIC_FREE_MINUTES) {
    score += 15; // free on classic!
  } else {
    // Penalize overage
    const overageMinutes = durationMinutes - CITIBIKE_COSTS.CLASSIC_FREE_MINUTES;
    score -= overageMinutes * 0.5;
  }

  // Time comparison vs subway
  const bikeDurationMinutes = durationMinutes;
  const timeDiff = estimatedSubwayTime - bikeDurationMinutes;
  score += timeDiff * 0.3; // more points if bike is faster

  // Rush hour bonus (subway is worse during rush hour)
  if (isRushHour) {
    score += 10;
  }

  // Constrain to 0-100
  return Math.max(0, Math.min(100, score));
}

// ============================================
// Batch Operations
// ============================================

/**
 * Normalize and analyze a single trip
 * Returns updated trip data with all calculated fields
 */
export function normalizeTrip(
  trip: Trip,
  stations: MinimalStation[],
  hourlyRate: number = 60
): Partial<Trip> {
  const updates: Partial<Trip> = {};

  // 1. Station name normalization (if needed)
  if (
    trip.startLat &&
    trip.startLon &&
    trip.startLat !== 0 &&
    trip.startLon !== 0 &&
    (trip.startStationName === 'Unknown' || !trip.startStationName)
  ) {
    const nearestStart = findNearestStation(stations, trip.startLat, trip.startLon);
    if (nearestStart) {
      updates.startStationName = nearestStart.name;
      updates.startStationId = nearestStart.station_id;
    }
  }

  if (
    trip.endLat &&
    trip.endLon &&
    trip.endLat !== 0 &&
    trip.endLon !== 0 &&
    (trip.endStationName === 'Unknown' || !trip.endStationName)
  ) {
    const nearestEnd = findNearestStation(stations, trip.endLat, trip.endLon);
    if (nearestEnd) {
      updates.endStationName = nearestEnd.name;
      updates.endStationId = nearestEnd.station_id;
    }
  }

  // 2. Distance calculation
  if (trip.startLat !== 0 && trip.startLon !== 0 && trip.endLat !== 0 && trip.endLon !== 0) {
    const { actualDistance, estimatedDistance } = calculateTripDistance(trip);
    updates.actualDistance = actualDistance;
    if (estimatedDistance) {
      updates.estimatedDistance = estimatedDistance;
    }

    // 3. Distance category
    updates.distanceCategory = categorizeDistance(actualDistance);
  }

  // 4. Cost calculation
  updates.actualCost = calculateTripCost(trip);

  // 5. Duration category
  updates.durationCategory = categorizeDuration(trip.duration);

  // 6. Time of day category
  updates.timeOfDay = categorizeTimeOfDay(trip.startTime);

  // 7. Subway time estimation (if we have distance)
  if (updates.actualDistance) {
    const isRushHour = updates.timeOfDay === 'morning_rush' || updates.timeOfDay === 'evening_rush';
    updates.estimatedSubwayTime = estimateSubwayTime(updates.actualDistance, isRushHour);

    // 8. Time savings
    const bikeDurationMinutes = trip.duration / 60;
    updates.timeSavings = updates.estimatedSubwayTime - bikeDurationMinutes;

    // 9. Cost savings (assuming pay-per-ride subway)
    updates.costSavings = SUBWAY_COSTS.PAY_PER_RIDE - (updates.actualCost || 0);

    // 10. Time value
    updates.timeValue = calculateTimeValue(updates.timeSavings || 0, hourlyRate);

    // 11. Health value
    updates.healthValue = calculateHealthValue(updates.actualDistance);

    // 12. Net value
    updates.netValue =
      (updates.costSavings || 0) + (updates.timeValue || 0) + (updates.healthValue || 0);

    // 13. Suitability score
    updates.suitabilityScore = calculateSuitabilityScore(
      { ...trip, ...updates } as Trip,
      updates.actualDistance,
      updates.estimatedSubwayTime
    );

    // 14. Recommended mode (simple heuristic)
    if (updates.suitabilityScore && updates.suitabilityScore >= 70) {
      // High score: recommend classic if duration allows, otherwise e-bike
      const durationMinutes = trip.duration / 60;
      updates.recommendedMode =
        durationMinutes <= CITIBIKE_COSTS.CLASSIC_FREE_MINUTES
          ? 'citibike_classic'
          : 'citibike_ebike';
    } else if (updates.suitabilityScore && updates.suitabilityScore < 50) {
      // Low score: subway better
      updates.recommendedMode = 'subway';
    } else {
      // Medium score: depends on actual bike type used
      updates.recommendedMode = trip.bikeType === 'ebike' ? 'citibike_ebike' : 'citibike_classic';
    }
  }

  // Mark as normalized
  updates.normalized = true;
  updates.normalizedAt = Date.now();

  return updates;
}
