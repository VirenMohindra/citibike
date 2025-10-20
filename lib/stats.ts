// Trip Statistics Calculator
// Calculates aggregate stats from trip data

import type { Trip, TripStats } from './types';

// CO2 emissions saved vs driving (grams per meter)
// Average car emits ~404g CO2 per mile = 0.251g per meter
const CO2_PER_METER = 0.251;

// Money saved vs taxi (assuming $2.50 base + $2.50/mile)
// Uber/taxi average ~$3/mile in NYC
const MONEY_PER_METER = 3 / 1609.34; // Convert $/mile to $/meter

export function calculateTripStats(trips: Trip[]): TripStats {
  if (trips.length === 0) {
    return {
      totalTrips: 0,
      totalDistance: 0,
      totalDuration: 0,
      co2Saved: 0,
      moneySaved: 0,
      favoriteStartStations: [],
      favoriteEndStations: [],
      ridingPatterns: {
        byMonth: {},
        byDayOfWeek: {},
        byHour: {},
      },
      bikeTypeUsage: {
        classic: 0,
        ebike: 0,
      },
    };
  }

  // Aggregate totals
  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalDuration = trips.reduce((sum, trip) => sum + trip.duration, 0);
  const co2Saved = Math.round(totalDistance * CO2_PER_METER);
  const moneySaved = Math.round(totalDistance * MONEY_PER_METER * 100) / 100;

  // Station frequency maps
  const startStationCounts = new Map<string, { name: string; count: number }>();
  const endStationCounts = new Map<string, { name: string; count: number }>();

  // Time pattern maps
  const monthCounts: Record<string, number> = {};
  const dayOfWeekCounts: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };
  const hourCounts: Record<string, number> = {};

  // Bike type counts
  let classicCount = 0;
  let ebikeCount = 0;

  // Process each trip
  trips.forEach((trip) => {
    // Start stations - use ID if available, otherwise use name as key
    // Skip trips with unknown station names
    if (trip.startStationName && trip.startStationName !== 'Unknown') {
      const startKey = trip.startStationId || trip.startStationName;
      const existing = startStationCounts.get(startKey);
      if (existing) {
        existing.count++;
      } else {
        startStationCounts.set(startKey, {
          name: trip.startStationName,
          count: 1,
        });
      }
    }

    // End stations - use ID if available, otherwise use name as key
    // Skip trips with unknown station names
    if (trip.endStationName && trip.endStationName !== 'Unknown') {
      const endKey = trip.endStationId || trip.endStationName;
      const existing = endStationCounts.get(endKey);
      if (existing) {
        existing.count++;
      } else {
        endStationCounts.set(endKey, {
          name: trip.endStationName,
          count: 1,
        });
      }
    }

    // Convert timestamp to Date if needed (DB stores numbers, API uses Date)
    const startDate = trip.startTime instanceof Date ? trip.startTime : new Date(trip.startTime);

    // Month pattern (YYYY-MM format)
    const month = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[month] = (monthCounts[month] || 0) + 1;

    // Day of week pattern
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[startDate.getDay()];
    dayOfWeekCounts[dayName]++;

    // Hour pattern (0-23)
    const hour = String(startDate.getHours());
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    // Bike type
    if (trip.bikeType === 'ebike') {
      ebikeCount++;
    } else {
      classicCount++;
    }
  });

  // Sort and get top stations
  const favoriteStartStations = Array.from(startStationCounts.entries())
    .map(([stationId, data]) => ({
      stationId,
      stationName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  const favoriteEndStations = Array.from(endStationCounts.entries())
    .map(([stationId, data]) => ({
      stationId,
      stationName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  return {
    totalTrips,
    totalDistance,
    totalDuration,
    co2Saved,
    moneySaved,
    favoriteStartStations,
    favoriteEndStations,
    ridingPatterns: {
      byMonth: monthCounts,
      byDayOfWeek: dayOfWeekCounts,
      byHour: hourCounts,
    },
    bikeTypeUsage: {
      classic: classicCount,
      ebike: ebikeCount,
    },
  };
}

// Format duration in human-readable format
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format CO2
export function formatCO2(grams: number): string {
  if (typeof grams !== 'number' || isNaN(grams)) {
    return '0 g';
  }

  const kg = grams / 1000;

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} tons`;
  }

  if (kg >= 1) {
    return `${kg.toFixed(1)} kg`;
  }

  return `${grams.toFixed(0)} g`;
}

// Calculate average trip duration
export function getAverageTripDuration(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const totalDuration = trips.reduce((sum, trip) => sum + trip.duration, 0);
  return Math.round(totalDuration / trips.length);
}

// Calculate average trip distance
export function getAverageTripDistance(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  return Math.round(totalDistance / trips.length);
}

// Get trips per month average
export function getTripsPerMonthAverage(trips: Trip[]): number {
  if (trips.length === 0) return 0;

  const months = new Set<string>();
  trips.forEach((trip) => {
    // Convert timestamp to Date if needed (DB stores numbers, API uses Date)
    const startDate = trip.startTime instanceof Date ? trip.startTime : new Date(trip.startTime);
    const month = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    months.add(month);
  });

  return Math.round((trips.length / months.size) * 10) / 10;
}

// Get longest trip
export function getLongestTrip(trips: Trip[]): Trip | null {
  if (trips.length === 0) return null;

  return trips.reduce((longest, trip) => {
    const longestDistance = longest.distance || 0;
    const tripDistance = trip.distance || 0;
    return tripDistance > longestDistance ? trip : longest;
  }, trips[0]);
}

// Get most frequent route
export function getMostFrequentRoute(trips: Trip[]): {
  startStationName: string;
  endStationName: string;
  count: number;
} | null {
  if (trips.length === 0) return null;

  const routes = new Map<string, { startName: string; endName: string; count: number }>();

  trips.forEach((trip) => {
    // Skip trips with unknown station names
    if (
      !trip.startStationName ||
      trip.startStationName === 'Unknown' ||
      !trip.endStationName ||
      trip.endStationName === 'Unknown'
    ) {
      return;
    }

    // Use station IDs if available, otherwise fall back to names
    // (Some older trips have empty station IDs)
    const startKey = trip.startStationId || trip.startStationName;
    const endKey = trip.endStationId || trip.endStationName;
    const key = `${startKey}->${endKey}`;
    const existing = routes.get(key);

    if (existing) {
      existing.count++;
    } else {
      routes.set(key, {
        startName: trip.startStationName,
        endName: trip.endStationName,
        count: 1,
      });
    }
  });

  const sortedRoutes = Array.from(routes.values()).sort((a, b) => b.count - a.count);

  if (sortedRoutes.length === 0) return null;

  return {
    startStationName: sortedRoutes[0].startName,
    endStationName: sortedRoutes[0].endName,
    count: sortedRoutes[0].count,
  };
}

// ============================================
// Enhanced Statistics (Strava-like)
// ============================================

/**
 * Calculate minutes per mile for a trip
 * Returns pace in minutes per mile
 */
export function calculateMinutesPerMile(durationSeconds: number, distanceMeters: number): number {
  if (!distanceMeters || distanceMeters === 0) return 0;

  const durationMinutes = durationSeconds / 60;
  const distanceMiles = distanceMeters / 1609.34;

  return durationMinutes / distanceMiles;
}

/**
 * Get average minutes per mile across all trips
 */
export function getAverageMinutesPerMile(trips: Trip[]): number {
  const tripsWithDistance = trips.filter((trip) => trip.distance && trip.distance > 0);

  if (tripsWithDistance.length === 0) return 0;

  const totalPace = tripsWithDistance.reduce((sum, trip) => {
    return sum + calculateMinutesPerMile(trip.duration, trip.distance!);
  }, 0);

  return totalPace / tripsWithDistance.length;
}

/**
 * Get trip with longest distance
 */
export function getLongestDistanceTrip(trips: Trip[]): Trip | null {
  if (trips.length === 0) return null;

  const tripsWithDistance = trips.filter((trip) => trip.distance && trip.distance > 0);

  if (tripsWithDistance.length === 0) return null;

  return tripsWithDistance.reduce((longest, trip) => {
    return trip.distance! > (longest.distance || 0) ? trip : longest;
  }, tripsWithDistance[0]);
}

/**
 * Get trip with longest duration
 */
export function getLongestDurationTrip(trips: Trip[]): Trip | null {
  if (trips.length === 0) return null;

  return trips.reduce((longest, trip) => {
    return trip.duration > longest.duration ? trip : longest;
  }, trips[0]);
}

/**
 * Get most expensive trip (based on cost field)
 */
export function getMostExpensiveTrip(trips: Trip[]): Trip | null {
  if (trips.length === 0) return null;

  const tripsWithCost = trips.filter((trip) => trip.cost && trip.cost > 0);

  if (tripsWithCost.length === 0) return null;

  return tripsWithCost.reduce((mostExpensive, trip) => {
    return trip.cost! > (mostExpensive.cost || 0) ? trip : mostExpensive;
  }, tripsWithCost[0]);
}

/**
 * Format pace (minutes per mile) as "X:XX /mi"
 */
export function formatPace(minutesPerMile: number): string {
  if (!minutesPerMile || isNaN(minutesPerMile) || minutesPerMile === 0) {
    return '--';
  }

  const minutes = Math.floor(minutesPerMile);
  const seconds = Math.round((minutesPerMile - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} /mi`;
}

/**
 * Format cost in cents to dollars
 */
export function formatCost(cents: number): string {
  if (!cents || isNaN(cents)) return '$0.00';

  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Calculate enhanced trip statistics for leaderboards and sharing
 */
export interface EnhancedTripStats extends TripStats {
  // Enhanced stats
  averageMinutesPerMile: number;
  longestDistanceTrip: Trip | null;
  longestDurationTrip: Trip | null;
  mostExpensiveTrip: Trip | null;

  // Formatted values for display
  formatted: {
    averagePace: string;
    longestDistance: string;
    longestDuration: string;
    mostExpensiveCost: string;
  };
}

/**
 * Calculate enhanced statistics with all Strava-like metrics
 */
export function calculateEnhancedStats(trips: Trip[]): EnhancedTripStats {
  const basicStats = calculateTripStats(trips);
  const averageMinutesPerMile = getAverageMinutesPerMile(trips);
  const longestDistanceTrip = getLongestDistanceTrip(trips);
  const longestDurationTrip = getLongestDurationTrip(trips);
  const mostExpensiveTrip = getMostExpensiveTrip(trips);

  return {
    ...basicStats,
    averageMinutesPerMile,
    longestDistanceTrip,
    longestDurationTrip,
    mostExpensiveTrip,
    formatted: {
      averagePace: formatPace(averageMinutesPerMile),
      longestDistance: longestDistanceTrip
        ? `${(longestDistanceTrip.distance! / 1609.34).toFixed(2)} mi`
        : '--',
      longestDuration: longestDurationTrip ? formatDuration(longestDurationTrip.duration) : '--',
      mostExpensiveCost: mostExpensiveTrip ? formatCost(mostExpensiveTrip.cost!) : '--',
    },
  };
}
