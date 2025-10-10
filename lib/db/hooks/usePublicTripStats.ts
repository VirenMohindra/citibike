/**
 * React hooks for public trip data analysis and benchmarking
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../schema';
import type { PublicTrip } from '../schema';

// ============================================
// Overall Statistics
// ============================================

export interface PublicTripStats {
  totalTrips: number;
  hasData: boolean;
  datasetMonths?: string[];
  bikeTypes?: {
    ebike: number;
    classic: number;
    ebikePercent: number;
    classicPercent: number;
  };
  memberTypes?: {
    member: number;
    casual: number;
    memberPercent: number;
    casualPercent: number;
  };
  averages?: {
    duration: number;
    distance: number;
    durationMinutes: number;
    distanceMiles: number;
  };
  error?: string;
}

/**
 * Hook to get overall public trip statistics
 */
export function usePublicTripStats() {
  const [stats, setStats] = useState<PublicTripStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const totalTrips = await db.publicTrips.count();

      if (totalTrips === 0) {
        setStats({
          totalTrips: 0,
          hasData: false,
        });
        return;
      }

      const trips = await db.publicTrips.toArray();
      const datasetMonths = [
        ...new Set(trips.map((t) => t.datasetMonth).filter((m): m is string => Boolean(m))),
      ];

      const ebikeCount = trips.filter((t) => t.bikeType === 'electric_bike').length;
      const classicCount = trips.filter((t) => t.bikeType === 'classic_bike').length;

      const memberCount = trips.filter((t) => t.memberType === 'member').length;
      const casualCount = trips.filter((t) => t.memberType === 'casual').length;

      const avgDuration = trips.reduce((sum, t) => sum + t.duration, 0) / trips.length;
      const avgDistance = trips.reduce((sum, t) => sum + t.distance, 0) / trips.length;

      setStats({
        totalTrips,
        hasData: true,
        datasetMonths,
        bikeTypes: {
          ebike: ebikeCount,
          classic: classicCount,
          ebikePercent: (ebikeCount / totalTrips) * 100,
          classicPercent: (classicCount / totalTrips) * 100,
        },
        memberTypes: {
          member: memberCount,
          casual: casualCount,
          memberPercent: (memberCount / totalTrips) * 100,
          casualPercent: (casualCount / totalTrips) * 100,
        },
        averages: {
          duration: avgDuration,
          distance: avgDistance,
          durationMinutes: avgDuration / 60,
          distanceMiles: avgDistance / 1609.34,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStats({
        totalTrips: 0,
        hasData: false,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, isLoading, error, refresh: loadStats };
}

// ============================================
// Station-Level Analysis
// ============================================

export interface StationStats {
  stationId: string;
  stationName: string;
  totalTripsAsStart: number;
  totalTripsAsEnd: number;
  avgDurationFromStation: number; // minutes
  avgDistanceFromStation: number; // miles
  popularDestinations: Array<{
    stationId: string;
    stationName: string;
    count: number;
  }>;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  bikeTypeBreakdown: {
    ebike: number;
    classic: number;
    ebikePercent: number;
  };
}

/**
 * Hook to get statistics for a specific station
 */
export function useStationStats(stationId: string | null) {
  const [stats, setStats] = useState<StationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setStats(null);
      return;
    }

    let isCancelled = false;

    const loadStationStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get trips starting from this station
        const startTrips = await db.publicTrips.where({ startStationId: stationId }).toArray();

        // Get trips ending at this station
        const endTrips = await db.publicTrips.where({ endStationId: stationId }).toArray();

        if (isCancelled) return;

        if (startTrips.length === 0) {
          setStats(null);
          return;
        }

        // Calculate averages
        const avgDuration = startTrips.reduce((sum, t) => sum + t.duration, 0) / startTrips.length;
        const avgDistance = startTrips.reduce((sum, t) => sum + t.distance, 0) / startTrips.length;

        // Find popular destinations
        const destinationCounts: Record<string, { name: string; count: number }> = {};
        startTrips.forEach((trip) => {
          if (!destinationCounts[trip.endStationId]) {
            destinationCounts[trip.endStationId] = {
              name: trip.endStationName,
              count: 0,
            };
          }
          destinationCounts[trip.endStationId].count++;
        });

        const popularDestinations = Object.entries(destinationCounts)
          .map(([id, { name, count }]) => ({
            stationId: id,
            stationName: name,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Peak hours analysis
        const hourCounts: Record<number, number> = {};
        startTrips.forEach((trip) => {
          const hour = new Date(trip.startTime).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHours = Object.entries(hourCounts)
          .map(([hour, count]) => ({
            hour: parseInt(hour),
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Bike type breakdown
        const ebikeCount = startTrips.filter((t) => t.bikeType === 'electric_bike').length;
        const classicCount = startTrips.filter((t) => t.bikeType === 'classic_bike').length;

        setStats({
          stationId,
          stationName: startTrips[0]?.startStationName || 'Unknown',
          totalTripsAsStart: startTrips.length,
          totalTripsAsEnd: endTrips.length,
          avgDurationFromStation: avgDuration / 60,
          avgDistanceFromStation: avgDistance / 1609.34,
          popularDestinations,
          peakHours,
          bikeTypeBreakdown: {
            ebike: ebikeCount,
            classic: classicCount,
            ebikePercent: (ebikeCount / startTrips.length) * 100,
          },
        });
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadStationStats();

    return () => {
      isCancelled = true;
    };
  }, [stationId]);

  return { stats, isLoading, error };
}

// ============================================
// Route Popularity Analysis
// ============================================

export interface RoutePopularity {
  startStationId: string;
  startStationName: string;
  endStationId: string;
  endStationName: string;
  tripCount: number;
  avgDuration: number; // minutes
  avgDistance: number; // miles
  ebikePercent: number;
  memberPercent: number;
  popularTimes: Array<{
    timeOfDay: string;
    count: number;
    percent: number;
  }>;
}

/**
 * Hook to get popularity data for a specific route
 */
export function useRoutePopularity(startStationId: string | null, endStationId: string | null) {
  const [popularity, setPopularity] = useState<RoutePopularity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startStationId || !endStationId) {
      setPopularity(null);
      return;
    }

    let isCancelled = false;

    const loadRoutePopularity = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Query trips for this specific route
        const routeTrips = await db.publicTrips
          .where('[startStationId+endStationId]')
          .equals([startStationId, endStationId])
          .toArray();

        if (isCancelled) return;

        if (routeTrips.length === 0) {
          setPopularity(null);
          return;
        }

        // Calculate averages
        const avgDuration = routeTrips.reduce((sum, t) => sum + t.duration, 0) / routeTrips.length;
        const avgDistance = routeTrips.reduce((sum, t) => sum + t.distance, 0) / routeTrips.length;

        // Bike type breakdown
        const ebikeCount = routeTrips.filter((t) => t.bikeType === 'electric_bike').length;
        const memberCount = routeTrips.filter((t) => t.memberType === 'member').length;

        // Time of day distribution
        const timeOfDayCounts: Record<string, number> = {
          morning_rush: 0,
          midday: 0,
          evening_rush: 0,
          night: 0,
        };

        routeTrips.forEach((trip) => {
          if (trip.timeOfDay) {
            timeOfDayCounts[trip.timeOfDay]++;
          }
        });

        const popularTimes = Object.entries(timeOfDayCounts)
          .map(([time, count]) => ({
            timeOfDay: time,
            count,
            percent: (count / routeTrips.length) * 100,
          }))
          .sort((a, b) => b.count - a.count);

        setPopularity({
          startStationId,
          startStationName: routeTrips[0].startStationName,
          endStationId,
          endStationName: routeTrips[0].endStationName,
          tripCount: routeTrips.length,
          avgDuration: avgDuration / 60,
          avgDistance: avgDistance / 1609.34,
          ebikePercent: (ebikeCount / routeTrips.length) * 100,
          memberPercent: (memberCount / routeTrips.length) * 100,
          popularTimes,
        });
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRoutePopularity();

    return () => {
      isCancelled = true;
    };
  }, [startStationId, endStationId]);

  return { popularity, isLoading, error };
}

// ============================================
// Bike Type Analysis
// ============================================

export interface BikeTypeAnalysis {
  ebike: {
    totalTrips: number;
    avgDuration: number; // minutes
    avgDistance: number; // miles
    memberPercent: number;
    distanceDistribution: {
      short: number; // < 1 mile
      medium: number; // 1-3 miles
      long: number; // > 3 miles
    };
  };
  classic: {
    totalTrips: number;
    avgDuration: number; // minutes
    avgDistance: number; // miles
    memberPercent: number;
    distanceDistribution: {
      short: number;
      medium: number;
      long: number;
    };
  };
}

/**
 * Hook to analyze bike type usage patterns
 */
export function useBikeTypeAnalysis() {
  const [analysis, setAnalysis] = useState<BikeTypeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all trips grouped by bike type
      const ebikeTrips = await db.publicTrips.where({ bikeType: 'electric_bike' }).toArray();
      const classicTrips = await db.publicTrips.where({ bikeType: 'classic_bike' }).toArray();

      const analyzeTrips = (trips: PublicTrip[]) => {
        if (trips.length === 0) {
          return {
            totalTrips: 0,
            avgDuration: 0,
            avgDistance: 0,
            memberPercent: 0,
            distanceDistribution: { short: 0, medium: 0, long: 0 },
          };
        }

        const avgDuration = trips.reduce((sum, t) => sum + t.duration, 0) / trips.length;
        const avgDistance = trips.reduce((sum, t) => sum + t.distance, 0) / trips.length;
        const memberCount = trips.filter((t) => t.memberType === 'member').length;

        const distCounts = {
          short: trips.filter((t) => t.distanceCategory === 'short').length,
          medium: trips.filter((t) => t.distanceCategory === 'medium').length,
          long: trips.filter((t) => t.distanceCategory === 'long').length,
        };

        return {
          totalTrips: trips.length,
          avgDuration: avgDuration / 60,
          avgDistance: avgDistance / 1609.34,
          memberPercent: (memberCount / trips.length) * 100,
          distanceDistribution: {
            short: (distCounts.short / trips.length) * 100,
            medium: (distCounts.medium / trips.length) * 100,
            long: (distCounts.long / trips.length) * 100,
          },
        };
      };

      setAnalysis({
        ebike: analyzeTrips(ebikeTrips),
        classic: analyzeTrips(classicTrips),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  return { analysis, isLoading, error, refresh: loadAnalysis };
}

// ============================================
// Time-Based Patterns
// ============================================

export interface TimeOfDayPattern {
  timeOfDay: string;
  tripCount: number;
  percent: number;
  avgDuration: number; // minutes
  avgDistance: number; // miles
  ebikePercent: number;
}

/**
 * Hook to analyze time-based usage patterns
 */
export function useTimeOfDayPatterns() {
  const [patterns, setPatterns] = useState<TimeOfDayPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allTrips = await db.publicTrips.toArray();
      const totalTrips = allTrips.length;

      const timeGroups: Record<string, PublicTrip[]> = {
        morning_rush: [],
        midday: [],
        evening_rush: [],
        night: [],
      };

      allTrips.forEach((trip) => {
        if (trip.timeOfDay && timeGroups[trip.timeOfDay]) {
          timeGroups[trip.timeOfDay].push(trip);
        }
      });

      const analyzedPatterns = Object.entries(timeGroups).map(([timeOfDay, trips]) => {
        const avgDuration =
          trips.length > 0 ? trips.reduce((sum, t) => sum + t.duration, 0) / trips.length : 0;
        const avgDistance =
          trips.length > 0 ? trips.reduce((sum, t) => sum + t.distance, 0) / trips.length : 0;
        const ebikeCount = trips.filter((t) => t.bikeType === 'electric_bike').length;

        return {
          timeOfDay,
          tripCount: trips.length,
          percent: (trips.length / totalTrips) * 100,
          avgDuration: avgDuration / 60,
          avgDistance: avgDistance / 1609.34,
          ebikePercent: trips.length > 0 ? (ebikeCount / trips.length) * 100 : 0,
        };
      });

      setPatterns(analyzedPatterns.sort((a, b) => b.tripCount - a.tripCount));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  return { patterns, isLoading, error, refresh: loadPatterns };
}
