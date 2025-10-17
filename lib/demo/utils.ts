/**
 * Demo Mode Utilities
 * Helper functions for factory system
 */

import { haversineDistance } from '../utils/distance';
import type { Station, TimeWindow } from './types';
import type { Trip } from '../db/schema';

/**
 * Fetch NYC Citibike station data from GBFS feed
 */
export async function fetchStationData(): Promise<Station[]> {
  try {
    const response = await fetch('https://gbfs.citibikenyc.com/gbfs/en/station_information.json');
    const data = await response.json();

    return data.data.stations.map(
      (station: {
        station_id: string;
        name: string;
        lat: number;
        lon: number;
        capacity?: number;
      }) => ({
        station_id: station.station_id,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        capacity: station.capacity || 30,
      })
    );
  } catch (error) {
    console.error('Failed to fetch station data:', error);
    throw new Error('Could not load station data from GBFS feed');
  }
}

/**
 * Calculate haversine distance between two coordinates (in meters)
 * Re-export from existing utility for consistency
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineDistance(lat1, lon1, lat2, lon2);
}

/**
 * Select random station with weighted probability
 * @param stations All available stations
 * @param favoriteStations Station names that should be selected more often
 * @param currentLat Current latitude (for proximity weighting)
 * @param currentLon Current longitude (for proximity weighting)
 * @param explorationRate How often to explore new stations (0-1)
 */
export function selectWeightedStation(
  stations: Station[],
  favoriteStations: string[],
  currentLat?: number,
  currentLon?: number,
  explorationRate = 0.1
): Station {
  // Build weighted list
  const weights: number[] = stations.map((station) => {
    let weight = 1; // Base weight

    // Favorites get 10x weight
    if (favoriteStations.includes(station.name)) {
      weight *= 10;
    }

    // Nearby stations get 3x weight (within 1km)
    if (currentLat !== undefined && currentLon !== undefined) {
      const distance = calculateHaversineDistance(currentLat, currentLon, station.lat, station.lon);
      if (distance < 1000) {
        weight *= 3;
      }
    }

    // Apply exploration rate (reduce weight for favorites)
    if (favoriteStations.includes(station.name)) {
      weight *= 1 - explorationRate + explorationRate / 10;
    }

    return weight;
  });

  // Select weighted random station
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < stations.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return stations[i];
    }
  }

  // Fallback (should never happen)
  return stations[Math.floor(Math.random() * stations.length)];
}

/**
 * Generate random time within a time window
 * @param date Base date
 * @param window Time window definition
 * @returns Date object with time set
 */
export function generateTimeInWindow(date: Date, window: TimeWindow): Date {
  const [startHour, startMinute] = window.start.split(':').map(Number);
  const [endHour, endMinute] = window.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  const randomMinutes = startMinutes + Math.random() * (endMinutes - startMinutes);
  const hours = Math.floor(randomMinutes / 60);
  const minutes = Math.floor(randomMinutes % 60);

  const result = new Date(date);
  result.setHours(hours, minutes, Math.floor(Math.random() * 60), 0);
  return result;
}

/**
 * Select time window based on weights
 */
export function selectWeightedTimeWindow(windows: TimeWindow[]): TimeWindow {
  const totalWeight = windows.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const window of windows) {
    random -= window.weight;
    if (random <= 0) {
      return window;
    }
  }

  return windows[0]; // Fallback
}

/**
 * Estimate trip duration based on distance and bike type
 * Classic bikes: ~15 km/h avg
 * E-bikes: ~20 km/h avg
 */
export function estimateTripDuration(
  distanceMeters: number,
  bikeType: 'classic' | 'ebike'
): number {
  const avgSpeedKmh = bikeType === 'ebike' ? 20 : 15;
  const avgSpeedMs = (avgSpeedKmh * 1000) / 3600; // meters per second
  const baseDuration = distanceMeters / avgSpeedMs;

  // Add randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4;
  return Math.round(baseDuration * randomFactor);
}

/**
 * Calculate e-bike cost (charges after 45 minutes)
 * $0.24/minute after first 45 minutes
 */
export function calculateEbikeCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  if (durationMinutes <= 45) {
    return 0;
  }
  const overageMinutes = durationMinutes - 45;
  return overageMinutes * 0.24; // $0.24 per minute
}

/**
 * Calculate classic bike overage cost (charges after 45 minutes for annual members)
 * $0.17/minute after first 45 minutes
 */
export function calculateClassicOverageCost(
  durationSeconds: number,
  isAnnualMember: boolean
): number {
  if (!isAnnualMember) return 0; // Only annual members have 45min free rides

  const durationMinutes = durationSeconds / 60;
  if (durationMinutes <= 45) {
    return 0;
  }
  const overageMinutes = durationMinutes - 45;
  return overageMinutes * 0.17; // $0.17 per minute
}

/**
 * Assign Bike Angel points (10% chance per trip, 2-10 points)
 */
export function assignBikeAngelPoints(): number | undefined {
  if (Math.random() < 0.1) {
    return Math.floor(Math.random() * 9) + 2; // 2-10 points
  }
  return undefined;
}

/**
 * Categorize trip distance
 */
export function categorizeDistance(meters: number): 'short' | 'medium' | 'long' {
  const miles = meters / 1609.34;
  if (miles < 1) return 'short';
  if (miles < 3) return 'medium';
  return 'long';
}

/**
 * Categorize trip duration
 */
export function categorizeDuration(seconds: number): 'quick' | 'standard' | 'extended' {
  const minutes = seconds / 60;
  if (minutes < 20) return 'quick';
  if (minutes < 45) return 'standard';
  return 'extended';
}

/**
 * Categorize time of day
 */
export function categorizeTimeOfDay(
  date: Date
): 'morning_rush' | 'midday' | 'evening_rush' | 'night' {
  const hour = date.getHours();
  if (hour >= 7 && hour < 10) return 'morning_rush';
  if (hour >= 17 && hour < 20) return 'evening_rush';
  if (hour >= 10 && hour < 17) return 'midday';
  return 'night';
}

/**
 * Normalize trip with economics analysis fields
 */
export function normalizeTrip(trip: Trip): Trip {
  const distance = trip.distance || 0;
  const actualCost =
    trip.bikeType === 'ebike'
      ? calculateEbikeCost(trip.duration)
      : calculateClassicOverageCost(trip.duration, true);

  return {
    ...trip,
    actualDistance: distance,
    estimatedDistance:
      distance ||
      Math.round(
        calculateHaversineDistance(trip.startLat, trip.startLon, trip.endLat, trip.endLon) * 1.3
      ), // Add 30% for routing
    actualCost,
    distanceCategory: categorizeDistance(distance),
    durationCategory: categorizeDuration(trip.duration),
    timeOfDay: categorizeTimeOfDay(new Date(trip.startTime)),
    normalized: true,
    normalizedAt: Date.now(),
  };
}

/**
 * Normalize all trips in batch
 */
export function normalizeTrips(trips: Trip[]): Trip[] {
  return trips.map(normalizeTrip);
}

/**
 * Generate random date within range
 */
export function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * Check if date is a weekday (Monday-Friday)
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
