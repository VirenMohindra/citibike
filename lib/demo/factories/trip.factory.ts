/**
 * Trip Factory
 * Generates realistic Citibike trips based on persona patterns
 */

import { randomUUID } from 'crypto';
import type { Trip } from '@/lib/db';
import type { RouteType, Station, TripPattern } from '@/lib/demo/types';
import {
  assignBikeAngelPoints,
  calculateClassicOverageCost,
  calculateEbikeCost,
  calculateHaversineDistance,
  estimateTripDuration,
  generateTimeInWindow,
  isWeekday,
  randomElement,
  selectWeightedStation,
  selectWeightedTimeWindow,
} from '@/lib/demo/utils';

/**
 * Generate realistic trips for a user based on their persona pattern
 *
 * @param userId User ID (e.g., "demo-commuter-001")
 * @param pattern Trip pattern configuration from persona
 * @param startDate Start of date range
 * @param endDate End of date range (defaults to now)
 * @param stations List of all available Citibike stations
 * @returns Array of generated trips
 */
export function generateTrips(
  userId: string,
  pattern: TripPattern,
  startDate: Date,
  endDate: Date,
  stations: Station[]
): Trip[] {
  const trips: Trip[] = [];

  // Calculate total days in range
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate expected trip frequency
  const tripsPerWeek = pattern.daysPerWeek * 2; // Assume round trips
  const totalWeeks = totalDays / 7;
  const expectedTrips = Math.floor(tripsPerWeek * totalWeeks);

  console.log(`Generating ~${expectedTrips} trips over ${totalDays} days for user ${userId}`);

  // Generate trips day by day
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Determine if trip should occur on this day
    const shouldHaveTrip = isWeekday(currentDate)
      ? Math.random() < pattern.daysPerWeek / 5 // Weekday probability
      : Math.random() < 0.3; // Weekend: 30% chance

    if (shouldHaveTrip) {
      // How many trips on this day? (1-3, weighted toward 2)
      const tripCount = Math.random() < 0.7 ? 2 : Math.random() < 0.8 ? 1 : 3;

      for (let i = 0; i < tripCount; i++) {
        const trip = generateSingleTrip(userId, currentDate, pattern, stations);
        if (trip) {
          trips.push(trip);
        }
      }
    }

    // Move to next day
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort trips by start time (oldest first)
  trips.sort((a, b) => a.startTime - b.startTime);

  console.log(`Generated ${trips.length} trips`);
  return trips;
}

/**
 * Generate a single trip
 */
function generateSingleTrip(
  userId: string,
  date: Date,
  pattern: TripPattern,
  stations: Station[]
): Trip | null {
  // Select time window
  const timeWindow = selectWeightedTimeWindow(pattern.timeWindows);

  // Generate start time
  const startTime = generateTimeInWindow(date, timeWindow);

  // Select route type
  const routeType = selectWeightedRouteType(pattern.routeTypes);

  // Select start station
  const startStation = selectWeightedStation(
    stations,
    pattern.favoriteStations,
    undefined,
    undefined,
    pattern.explorationRate
  );

  // Select end station based on distance range and route type
  const endStation = selectEndStation(stations, startStation, pattern, routeType);

  if (!endStation) {
    return null; // Could not find suitable end station
  }

  // Calculate distance
  const distance = calculateHaversineDistance(
    startStation.lat,
    startStation.lon,
    endStation.lat,
    endStation.lon
  );

  // Decide bike type (e-bike more likely for longer distances)
  const isEbike = Math.random() < getBikeTypeWeight(distance, pattern.ebikeRate);
  const bikeType: 'classic' | 'ebike' = isEbike ? 'ebike' : 'classic';

  // Calculate duration
  const duration = estimateTripDuration(distance, bikeType);

  // Calculate end time
  const endTime = new Date(startTime.getTime() + duration * 1000);

  // Calculate cost
  const cost =
    bikeType === 'ebike'
      ? calculateEbikeCost(duration)
      : calculateClassicOverageCost(duration, true);

  // Assign Bike Angel points (10% chance)
  const angelPoints = assignBikeAngelPoints();

  // Generate trip object
  const trip: Trip = {
    id: randomUUID(),
    userId,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    duration,
    startStationId: startStation.station_id,
    startStationName: startStation.name,
    startLat: startStation.lat,
    startLon: startStation.lon,
    endStationId: endStation.station_id,
    endStationName: endStation.name,
    endLat: endStation.lat,
    endLon: endStation.lon,
    bikeType,
    distance,
    cost: cost > 0 ? Math.round(cost * 100) : undefined, // Convert to cents
    angelPoints,
    hasActualCoordinates: false, // Demo trips don't have actual GPS coordinates
    detailsFetched: false,
  };

  return trip;
}

/**
 * Select route type based on weights
 */
function selectWeightedRouteType(routeTypes: RouteType[]): RouteType['type'] {
  const totalWeight = routeTypes.reduce((sum, rt) => sum + rt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const rt of routeTypes) {
    random -= rt.weight;
    if (random <= 0) {
      return rt.type;
    }
  }

  return routeTypes[0].type;
}

/**
 * Select end station based on start station and pattern
 */
function selectEndStation(
  stations: Station[],
  startStation: Station,
  pattern: TripPattern,
  routeType: RouteType['type']
): Station | null {
  const [minDistance, maxDistance] = pattern.distanceRange;

  // For commute routes, prefer favorite stations
  const candidateStations =
    routeType === 'commute'
      ? stations.filter(
          (s) =>
            pattern.favoriteStations.includes(s.name) && s.station_id !== startStation.station_id
        )
      : stations;

  // Filter by distance range
  const suitableStations = candidateStations.filter((station) => {
    if (station.station_id === startStation.station_id) return false;

    const distance = calculateHaversineDistance(
      startStation.lat,
      startStation.lon,
      station.lat,
      station.lon
    );

    return distance >= minDistance && distance <= maxDistance;
  });

  if (suitableStations.length === 0) {
    // Fallback: any station within max distance
    const fallbackStations = stations.filter((station) => {
      if (station.station_id === startStation.station_id) return false;
      const distance = calculateHaversineDistance(
        startStation.lat,
        startStation.lon,
        station.lat,
        station.lon
      );
      return distance <= maxDistance;
    });

    if (fallbackStations.length === 0) {
      return null;
    }

    return randomElement(fallbackStations);
  }

  // For commute routes, return favorite station
  if (routeType === 'commute' && suitableStations.length > 0) {
    return randomElement(suitableStations);
  }

  // For other routes, weighted selection
  return selectWeightedStation(
    suitableStations,
    pattern.favoriteStations,
    startStation.lat,
    startStation.lon,
    pattern.explorationRate
  );
}

/**
 * Calculate bike type weight (higher for longer distances)
 */
function getBikeTypeWeight(distance: number, baseEbikeRate: number): number {
  const miles = distance / 1609.34;

  // Boost e-bike probability for longer distances
  if (miles > 2.5) {
    return Math.min(baseEbikeRate * 1.5, 0.9);
  } else if (miles > 1.5) {
    return baseEbikeRate * 1.2;
  }

  return baseEbikeRate;
}
