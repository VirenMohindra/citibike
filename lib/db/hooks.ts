/**
 * React Hooks for Citibike Database Access
 * Uses Dexie's useLiveQuery for reactive data updates
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Trip } from './schema';

// ============================================
// User Profile Hook
// ============================================

/**
 * Get user profile with staleness checking
 * Returns cached profile and indicates if data needs refresh
 */
export function useUserProfile(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return { profile: null, isStale: false };

    const profile = await db.users.get(userId);
    const syncMeta = await db.syncMetadata.get('profile');

    // Check if stale (1 hour TTL)
    const isStale = !syncMeta || Date.now() > syncMeta.nextSyncAfter;

    return { profile, isStale };
  }, [userId]);
}

// ============================================
// Bike Angel Hook
// ============================================

/**
 * Get Bike Angel profile with staleness checking
 * Returns cached angel data and indicates if refresh needed
 */
export function useBikeAngel(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return { angel: null, isStale: false };

    const angel = await db.bikeAngel.get(userId);
    const syncMeta = await db.syncMetadata.get('bikeAngel');

    // Check if stale (5 minutes TTL for frequently changing data)
    const isStale = !syncMeta || Date.now() > syncMeta.nextSyncAfter;

    return { angel, isStale };
  }, [userId]);
}

// ============================================
// Subscriptions Hook
// ============================================

/**
 * Get user subscriptions with staleness checking
 */
export function useSubscriptions(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return { subscription: null, isStale: false };

    const subscription = await db.subscriptions.get(userId);
    const syncMeta = await db.syncMetadata.get('subscriptions');

    // Check if stale (1 hour TTL)
    const isStale = !syncMeta || Date.now() > syncMeta.nextSyncAfter;

    return { subscription, isStale };
  }, [userId]);
}

// ============================================
// Trips Hook with Filtering
// ============================================

export interface TripFilters {
  startDate?: Date;
  endDate?: Date;
  bikeType?: 'classic' | 'ebike';
  stationId?: string;
  limit?: number;
  // Advanced filters
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
  minDistance?: number; // meters
  maxDistance?: number; // meters
  hasAngelPoints?: boolean; // only trips with angel points
  minAngelPoints?: number; // minimum angel points
  hasDetails?: boolean; // true = synced trips, false = unsynced trips, undefined = all
}

/**
 * Apply advanced filters to a trip array
 * Helper function to reuse filtering logic across hooks
 */
function applyAdvancedFilters(trips: Trip[], filters?: TripFilters): Trip[] {
  if (!filters) return trips;

  let filtered = trips;

  // Duration filters
  if (filters.minDuration !== undefined) {
    filtered = filtered.filter((t) => t.duration >= filters.minDuration!);
  }

  if (filters.maxDuration !== undefined) {
    filtered = filtered.filter((t) => t.duration <= filters.maxDuration!);
  }

  // Distance filters
  if (filters.minDistance !== undefined) {
    filtered = filtered.filter(
      (t) =>
        (t.actualDistance !== undefined && t.actualDistance >= filters.minDistance!) ||
        (t.distance !== undefined && t.distance >= filters.minDistance!)
    );
  }

  if (filters.maxDistance !== undefined) {
    filtered = filtered.filter(
      (t) =>
        (t.actualDistance !== undefined && t.actualDistance <= filters.maxDistance!) ||
        (t.distance !== undefined && t.distance <= filters.maxDistance!)
    );
  }

  // Angel points filters
  if (filters.hasAngelPoints) {
    filtered = filtered.filter((t) => t.angelPoints !== undefined && t.angelPoints > 0);
  }

  if (filters.minAngelPoints !== undefined) {
    filtered = filtered.filter(
      (t) => t.angelPoints !== undefined && t.angelPoints >= filters.minAngelPoints!
    );
  }

  // Details sync filter
  if (filters.hasDetails !== undefined) {
    if (filters.hasDetails) {
      // Only show synced trips
      filtered = filtered.filter((t) => t.detailsFetched === true);
    } else {
      // Only show unsynced trips
      filtered = filtered.filter((t) => !t.detailsFetched);
    }
  }

  return filtered;
}

/**
 * Get trips with optional filtering
 * Supports filtering by date range, bike type, and station
 */
export function useTrips(userId: string | null, filters?: TripFilters) {
  return useLiveQuery(async () => {
    if (!userId) return [];

    let collection;

    // Apply primary filters using indexes
    if (filters?.startDate && filters?.endDate) {
      // Use compound index for efficient date range queries
      collection = db.trips
        .where('[userId+startTime]')
        .between([userId, filters.startDate.getTime()], [userId, filters.endDate.getTime()]);
    } else if (filters?.bikeType) {
      // Use compound index for bike type queries
      collection = db.trips.where('[userId+bikeType]').equals([userId, filters.bikeType]);
    } else {
      // Default: all trips for user
      collection = db.trips.where({ userId });
    }

    // Get trips
    let trips = await collection.toArray();

    // Apply post-query filters
    if (filters?.stationId) {
      trips = trips.filter(
        (t) => t.startStationId === filters.stationId || t.endStationId === filters.stationId
      );
    }

    // Apply advanced filters
    trips = applyAdvancedFilters(trips, filters);

    // Sort by start time (most recent first)
    trips.sort((a, b) => b.startTime - a.startTime);

    // Apply limit
    if (filters?.limit) {
      trips = trips.slice(0, filters.limit);
    }

    return trips;
  }, [userId, filters]);
}

// ============================================
// Trip Statistics Hook
// ============================================

/**
 * Get aggregated trip statistics
 */
export function useTripStats(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return null;

    const trips = await db.trips.where({ userId }).toArray();

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalDuration: 0,
        bikeTypeUsage: { classic: 0, ebike: 0 },
      };
    }

    // Calculate aggregations
    const totalDistance = trips.reduce((sum, t) => sum + (t.distance || 0), 0);
    const totalDuration = trips.reduce((sum, t) => sum + t.duration, 0);
    const bikeTypeUsage = trips.reduce(
      (acc, t) => {
        acc[t.bikeType]++;
        return acc;
      },
      { classic: 0, ebike: 0 }
    );

    return {
      totalTrips: trips.length,
      totalDistance,
      totalDuration,
      bikeTypeUsage,
    };
  }, [userId]);
}

// ============================================
// Map Visualization Hook
// ============================================

export interface TripMapData {
  routes: Array<{
    id: string;
    start: [number, number]; // [lon, lat]
    end: [number, number]; // [lon, lat]
    bikeType: 'classic' | 'ebike';
    angelPoints?: number;
    startTime: number;
  }>;
  heatmapPoints: Array<{
    lon: number;
    lat: number;
    weight: number;
  }>;
  bounds?: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
}

/**
 * Get trip data optimized for MapBox visualization
 * Returns routes, heatmap points, and bounding box
 */
export function useTripMapData(
  userId: string | null,
  filters?: TripFilters
): TripMapData | undefined {
  return useLiveQuery(async () => {
    if (!userId) {
      return {
        routes: [],
        heatmapPoints: [],
      };
    }

    // Get filtered trips
    let collection;

    if (filters?.startDate && filters?.endDate) {
      collection = db.trips
        .where('[userId+startTime]')
        .between([userId, filters.startDate.getTime()], [userId, filters.endDate.getTime()]);
    } else if (filters?.bikeType) {
      collection = db.trips.where('[userId+bikeType]').equals([userId, filters.bikeType]);
    } else {
      collection = db.trips.where({ userId });
    }

    let trips = await collection.toArray();

    // Apply advanced filters
    trips = applyAdvancedFilters(trips, filters);

    // Transform for MapBox
    const routes = trips.map((t) => ({
      id: t.id,
      start: [t.startLon, t.startLat] as [number, number],
      end: [t.endLon, t.endLat] as [number, number],
      bikeType: t.bikeType,
      angelPoints: t.angelPoints,
      startTime: t.startTime,
    }));

    // Create heatmap points (weighted by frequency)
    const stationCounts = new Map<string, { lon: number; lat: number; count: number }>();

    trips.forEach((t) => {
      // Count start stations
      const startKey = `${t.startLon},${t.startLat}`;
      const start = stationCounts.get(startKey) || {
        lon: t.startLon,
        lat: t.startLat,
        count: 0,
      };
      start.count++;
      stationCounts.set(startKey, start);

      // Count end stations
      const endKey = `${t.endLon},${t.endLat}`;
      const end = stationCounts.get(endKey) || {
        lon: t.endLon,
        lat: t.endLat,
        count: 0,
      };
      end.count++;
      stationCounts.set(endKey, end);
    });

    const heatmapPoints = Array.from(stationCounts.values()).map((s) => ({
      lon: s.lon,
      lat: s.lat,
      weight: s.count,
    }));

    // Calculate bounding box
    let bounds;
    if (trips.length > 0) {
      bounds = {
        minLon: Math.min(...trips.flatMap((t) => [t.startLon, t.endLon])),
        maxLon: Math.max(...trips.flatMap((t) => [t.startLon, t.endLon])),
        minLat: Math.min(...trips.flatMap((t) => [t.startLat, t.endLat])),
        maxLat: Math.max(...trips.flatMap((t) => [t.startLat, t.endLat])),
      };
    }

    return {
      routes,
      heatmapPoints,
      bounds,
    };
  }, [userId, filters]);
}

// ============================================
// Station Usage Hook
// ============================================

export interface StationUsage {
  stationId: string;
  stationName: string;
  startCount: number;
  endCount: number;
  totalCount: number;
}

/**
 * Get station usage statistics
 * Returns top stations by frequency
 */
export function useStationUsage(
  userId: string | null,
  limit: number = 10
): StationUsage[] | undefined {
  return useLiveQuery(async () => {
    if (!userId) return [];

    const trips = await db.trips.where({ userId }).toArray();

    // Aggregate station usage
    const stationMap = new Map<string, StationUsage>();

    trips.forEach((t) => {
      // Start station
      if (!stationMap.has(t.startStationId)) {
        stationMap.set(t.startStationId, {
          stationId: t.startStationId,
          stationName: t.startStationName,
          startCount: 0,
          endCount: 0,
          totalCount: 0,
        });
      }
      const startStation = stationMap.get(t.startStationId)!;
      startStation.startCount++;
      startStation.totalCount++;

      // End station
      if (!stationMap.has(t.endStationId)) {
        stationMap.set(t.endStationId, {
          stationId: t.endStationId,
          stationName: t.endStationName,
          startCount: 0,
          endCount: 0,
          totalCount: 0,
        });
      }
      const endStation = stationMap.get(t.endStationId)!;
      endStation.endCount++;
      endStation.totalCount++;
    });

    // Sort by total count and return top N
    return Array.from(stationMap.values())
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, limit);
  }, [userId, limit]);
}

// ============================================
// Trip Patterns Hooks
// ============================================

export interface TripPatterns {
  byHourOfDay: Array<{ hour: number; count: number }>;
  byDayOfWeek: Array<{ day: number; dayName: string; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
  favoriteRoutes: Array<{
    startStation: string;
    endStation: string;
    count: number;
  }>;
}

/**
 * Get trip patterns and analytics
 * Analyzes usage patterns by time of day, day of week, month, and routes
 */
export function useTripPatterns(userId: string | null): TripPatterns | undefined {
  return useLiveQuery(async () => {
    if (!userId) return undefined;

    const trips = await db.trips.where({ userId }).toArray();

    if (trips.length === 0) {
      return {
        byHourOfDay: [],
        byDayOfWeek: [],
        byMonth: [],
        favoriteRoutes: [],
      };
    }

    // Initialize hour counts (0-23)
    const hourCounts = new Array(24).fill(0);
    trips.forEach((t) => {
      const hour = new Date(t.startTime).getHours();
      hourCounts[hour]++;
    });
    const byHourOfDay = hourCounts.map((count, hour) => ({ hour, count }));

    // Initialize day counts (0=Sunday, 6=Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    trips.forEach((t) => {
      const day = new Date(t.startTime).getDay();
      dayCounts[day]++;
    });
    const byDayOfWeek = dayCounts.map((count, day) => ({
      day,
      dayName: dayNames[day],
      count,
    }));

    // Count by month
    const monthMap = new Map<string, number>();
    trips.forEach((t) => {
      const date = new Date(t.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });
    const byMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Count favorite routes
    const routeMap = new Map<string, { startStation: string; endStation: string; count: number }>();
    trips.forEach((t) => {
      const routeKey = `${t.startStationId}→${t.endStationId}`;
      if (routeMap.has(routeKey)) {
        routeMap.get(routeKey)!.count++;
      } else {
        routeMap.set(routeKey, {
          startStation: t.startStationName,
          endStation: t.endStationName,
          count: 1,
        });
      }
    });
    const favoriteRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 routes

    return {
      byHourOfDay,
      byDayOfWeek,
      byMonth,
      favoriteRoutes,
    };
  }, [userId]);
}

// ============================================
// Heatmap Data Hook
// ============================================

/**
 * Get trip data formatted as GeoJSON for Mapbox heatmap layer
 * Returns start and end points with weight (frequency)
 */
export function useTripHeatmapData(userId: string | null, filters?: TripFilters) {
  return useLiveQuery(async () => {
    if (!userId) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    // Get filtered trips
    let collection;

    if (filters?.startDate && filters?.endDate) {
      collection = db.trips
        .where('[userId+startTime]')
        .between([userId, filters.startDate.getTime()], [userId, filters.endDate.getTime()]);
    } else if (filters?.bikeType) {
      collection = db.trips.where('[userId+bikeType]').equals([userId, filters.bikeType]);
    } else {
      collection = db.trips.where({ userId });
    }

    let trips = await collection.toArray();

    // Apply advanced filters
    trips = applyAdvancedFilters(trips, filters);

    // Filter out trips without valid coordinates
    const validTrips = trips.filter(
      (t) => t.startLat !== 0 && t.startLon !== 0 && t.endLat !== 0 && t.endLon !== 0
    );

    // Aggregate station usage with counts
    const stationCounts = new Map<string, { lon: number; lat: number; count: number }>();

    validTrips.forEach((t) => {
      // Count start stations
      const startKey = `${t.startLon.toFixed(6)},${t.startLat.toFixed(6)}`;
      const start = stationCounts.get(startKey) || {
        lon: t.startLon,
        lat: t.startLat,
        count: 0,
      };
      start.count++;
      stationCounts.set(startKey, start);

      // Count end stations
      const endKey = `${t.endLon.toFixed(6)},${t.endLat.toFixed(6)}`;
      const end = stationCounts.get(endKey) || {
        lon: t.endLon,
        lat: t.endLat,
        count: 0,
      };
      end.count++;
      stationCounts.set(endKey, end);
    });

    // Convert to GeoJSON features
    const features = Array.from(stationCounts.values()).map((station) => ({
      type: 'Feature' as const,
      properties: {
        weight: station.count,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [station.lon, station.lat],
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [userId, filters]);
}

// ============================================
// Sync Status Hook
// ============================================

/**
 * Get sync status for all data types
 */
export function useSyncStatus(userId: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return null;

    const [profile, bikeAngel, subscriptions, trips] = await Promise.all([
      db.syncMetadata.get('profile'),
      db.syncMetadata.get('bikeAngel'),
      db.syncMetadata.get('subscriptions'),
      db.syncMetadata.get('trips'),
    ]);

    return {
      profile: profile || null,
      bikeAngel: bikeAngel || null,
      subscriptions: subscriptions || null,
      trips: trips || null,
    };
  }, [userId]);
}

// ============================================
// Trip Comparison Hook
// ============================================

export interface TripComparison {
  averageDuration: number;
  averageDistance: number;
  longestDuration: number;
  longestDistance: number;
  shortestDuration: number;
  shortestDistance: number;
  totalTrips: number;
}

/**
 * Get trip comparison statistics
 * Returns averages, longest, and shortest trips for comparison
 */
export function useTripComparison(userId: string | null): TripComparison | undefined {
  return useLiveQuery(async () => {
    if (!userId) return undefined;

    const trips = await db.trips.where({ userId }).toArray();

    if (trips.length === 0) {
      return {
        averageDuration: 0,
        averageDistance: 0,
        longestDuration: 0,
        longestDistance: 0,
        shortestDuration: 0,
        shortestDistance: 0,
        totalTrips: 0,
      };
    }

    // Calculate averages
    const totalDuration = trips.reduce((sum, t) => sum + t.duration, 0);
    const averageDuration = totalDuration / trips.length;

    const tripsWithDistance = trips.filter((t) => t.distance && t.distance > 0);
    const totalDistance = tripsWithDistance.reduce((sum, t) => sum + (t.distance || 0), 0);
    const averageDistance =
      tripsWithDistance.length > 0 ? totalDistance / tripsWithDistance.length : 0;

    // Find extremes
    const longestDuration = Math.max(...trips.map((t) => t.duration));
    const shortestDuration = Math.min(...trips.map((t) => t.duration));

    const longestDistance =
      tripsWithDistance.length > 0 ? Math.max(...tripsWithDistance.map((t) => t.distance || 0)) : 0;
    const shortestDistance =
      tripsWithDistance.length > 0 ? Math.min(...tripsWithDistance.map((t) => t.distance || 0)) : 0;

    return {
      averageDuration,
      averageDistance,
      longestDuration,
      longestDistance,
      shortestDuration,
      shortestDistance,
      totalTrips: trips.length,
    };
  }, [userId]);
}

// ============================================
// Transportation Economics Hooks
// ============================================

export interface MonthlyEconomics {
  period: string; // 'YYYY-MM'

  // Citibike actual
  citibikeTrips: number;
  classicTrips: number;
  ebikeTrips: number;
  membershipCost: number; // prorated monthly cost
  ebikeFees: number;
  overageFees: number;
  totalCitibikeCost: number;
  avgCostPerTrip: number;

  // Subway alternative
  subwayPayPerRideCost: number; // trips × $2.90
  subwayUnlimitedCost: number; // $132
  optimalSubwayCost: number; // cheaper of the two

  // Comparison
  savings: number; // positive = Citibike saved money
  savingsPercent: number;

  // Additional value
  avgTimeSavings: number; // minutes per trip
  totalTimeSaved: number; // minutes
  avgNetValue: number; // dollars per trip
  totalNetValue: number; // dollars

  // Bike type breakdown
  classicPercent: number;
  ebikePercent: number;
  avgClassicDuration: number;
  avgEbikeDuration: number;
}

/**
 * Calculate monthly transportation economics
 * Analyzes costs, savings, and value for a given month
 */
export function useMonthlyEconomics(
  userId: string | null,
  year: number,
  month: number // 0-indexed (0 = January)
): MonthlyEconomics | undefined {
  return useLiveQuery(async () => {
    if (!userId) return undefined;

    // Get trips for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const trips = await db.trips
      .where('[userId+startTime]')
      .between([userId, startDate.getTime()], [userId, endDate.getTime()])
      .toArray();

    if (trips.length === 0) {
      return {
        period: `${year}-${String(month + 1).padStart(2, '0')}`,
        citibikeTrips: 0,
        classicTrips: 0,
        ebikeTrips: 0,
        membershipCost: 0,
        ebikeFees: 0,
        overageFees: 0,
        totalCitibikeCost: 0,
        avgCostPerTrip: 0,
        subwayPayPerRideCost: 0,
        subwayUnlimitedCost: 0,
        optimalSubwayCost: 0,
        savings: 0,
        savingsPercent: 0,
        avgTimeSavings: 0,
        totalTimeSaved: 0,
        avgNetValue: 0,
        totalNetValue: 0,
        classicPercent: 0,
        ebikePercent: 0,
        avgClassicDuration: 0,
        avgEbikeDuration: 0,
      };
    }

    // Count bike types
    const classicTrips = trips.filter((t) => t.bikeType === 'classic').length;
    const ebikeTrips = trips.filter((t) => t.bikeType === 'ebike').length;

    // Calculate costs
    const membershipCost = 17.08; // $205/year ÷ 12 months
    const ebikeFees = trips
      .filter((t) => t.bikeType === 'ebike')
      .reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const overageFees = trips
      .filter((t) => t.bikeType === 'classic')
      .reduce((sum, t) => sum + (t.actualCost || 0), 0);
    const totalCitibikeCost = membershipCost + ebikeFees + overageFees;
    const avgCostPerTrip = totalCitibikeCost / trips.length;

    // Subway alternative costs
    const subwayPayPerRideCost = trips.length * 2.9;
    const subwayUnlimitedCost = 132;
    const optimalSubwayCost = Math.min(subwayPayPerRideCost, subwayUnlimitedCost);

    // Savings
    const savings = optimalSubwayCost - totalCitibikeCost;
    const savingsPercent = (savings / optimalSubwayCost) * 100;

    // Time and value calculations (only for normalized trips)
    const normalizedTrips = trips.filter((t) => t.normalized);
    const avgTimeSavings =
      normalizedTrips.length > 0
        ? normalizedTrips.reduce((sum, t) => sum + (t.timeSavings || 0), 0) / normalizedTrips.length
        : 0;
    const totalTimeSaved = normalizedTrips.reduce((sum, t) => sum + (t.timeSavings || 0), 0);
    const avgNetValue =
      normalizedTrips.length > 0
        ? normalizedTrips.reduce((sum, t) => sum + (t.netValue || 0), 0) / normalizedTrips.length
        : 0;
    const totalNetValue = normalizedTrips.reduce((sum, t) => sum + (t.netValue || 0), 0);

    // Bike type breakdown
    const classicPercent = (classicTrips / trips.length) * 100;
    const ebikePercent = (ebikeTrips / trips.length) * 100;
    const avgClassicDuration =
      classicTrips > 0
        ? trips.filter((t) => t.bikeType === 'classic').reduce((sum, t) => sum + t.duration, 0) /
          classicTrips
        : 0;
    const avgEbikeDuration =
      ebikeTrips > 0
        ? trips.filter((t) => t.bikeType === 'ebike').reduce((sum, t) => sum + t.duration, 0) /
          ebikeTrips
        : 0;

    return {
      period: `${year}-${String(month + 1).padStart(2, '0')}`,
      citibikeTrips: trips.length,
      classicTrips,
      ebikeTrips,
      membershipCost,
      ebikeFees,
      overageFees,
      totalCitibikeCost,
      avgCostPerTrip,
      subwayPayPerRideCost,
      subwayUnlimitedCost,
      optimalSubwayCost,
      savings,
      savingsPercent,
      avgTimeSavings,
      totalTimeSaved,
      avgNetValue,
      totalNetValue,
      classicPercent,
      ebikePercent,
      avgClassicDuration,
      avgEbikeDuration,
    };
  }, [userId, year, month]);
}

export interface BreakevenAnalysis {
  // Current state
  avgTripsPerMonth: number;
  avgEbikePercent: number;
  avgEbikeDuration: number;
  avgClassicDuration: number;
  currentMonthlyCost: number;

  // Breakeven points
  breakevenVsPayPerRide: number; // trips/month needed
  breakevenVsUnlimited: number; // trips/month needed

  // Scenarios
  scenarios: {
    allClassicUnder45: number; // Cost if all trips were classic <45min
    allEbike: number; // Cost if all trips were e-bike
    optimal: number; // Cost with perfect bike type selection
    currentSubway: number; // Cost if all were subway
  };

  // Month-by-month breakdown
  monthlyData: Array<{
    month: string;
    trips: number;
    cost: number;
    breaksEven: boolean;
  }>;
}

/**
 * Calculate breakeven analysis
 * Shows when Citibike membership pays for itself vs subway alternatives
 */
export function useBreakevenAnalysis(userId: string | null): BreakevenAnalysis | undefined {
  return useLiveQuery(async () => {
    if (!userId) return undefined;

    const trips = await db.trips.where({ userId }).toArray();

    if (trips.length === 0) {
      return {
        avgTripsPerMonth: 0,
        avgEbikePercent: 0,
        avgEbikeDuration: 0,
        avgClassicDuration: 0,
        currentMonthlyCost: 0,
        breakevenVsPayPerRide: 0,
        breakevenVsUnlimited: 0,
        scenarios: {
          allClassicUnder45: 0,
          allEbike: 0,
          optimal: 0,
          currentSubway: 0,
        },
        monthlyData: [],
      };
    }

    // Calculate averages across all months
    const monthsMap = new Map<string, { trips: number; ebikeFees: number; overageFees: number }>();

    trips.forEach((trip) => {
      const date = new Date(trip.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { trips: 0, ebikeFees: 0, overageFees: 0 });
      }

      const month = monthsMap.get(monthKey)!;
      month.trips++;

      if (trip.actualCost) {
        if (trip.bikeType === 'ebike') {
          month.ebikeFees += trip.actualCost;
        } else {
          month.overageFees += trip.actualCost;
        }
      }
    });

    const months = Array.from(monthsMap.entries());
    const avgTripsPerMonth = months.reduce((sum, [, data]) => sum + data.trips, 0) / months.length;

    // Calculate e-bike usage
    const ebikeTrips = trips.filter((t) => t.bikeType === 'ebike').length;
    const avgEbikePercent = (ebikeTrips / trips.length) * 100;

    // Calculate average durations
    const avgEbikeDuration =
      ebikeTrips > 0
        ? trips.filter((t) => t.bikeType === 'ebike').reduce((sum, t) => sum + t.duration, 0) /
          ebikeTrips /
          60
        : 0;
    const classicTrips = trips.filter((t) => t.bikeType === 'classic').length;
    const avgClassicDuration =
      classicTrips > 0
        ? trips.filter((t) => t.bikeType === 'classic').reduce((sum, t) => sum + t.duration, 0) /
          classicTrips /
          60
        : 0;

    // Current monthly cost
    const avgEbikeFees = months.reduce((sum, [, data]) => sum + data.ebikeFees, 0) / months.length;
    const avgOverageFees =
      months.reduce((sum, [, data]) => sum + data.overageFees, 0) / months.length;
    const currentMonthlyCost = 17.08 + avgEbikeFees + avgOverageFees;

    // Breakeven calculations
    // For pay-per-ride: membership / (subway_cost - avg_trip_cost)
    const avgTripCost = (avgEbikeFees + avgOverageFees) / avgTripsPerMonth;
    const breakevenVsPayPerRide = 17.08 / (2.9 - avgTripCost);

    // For unlimited: (membership + fees) needs to be less than $132
    const breakevenVsUnlimited = (132 - avgEbikeFees - avgOverageFees) / 2.9;

    // Scenario calculations
    const allClassicUnder45 = 17.08; // Just membership, no fees
    const allEbike = 17.08 + avgTripsPerMonth * avgEbikeDuration * 0.26;
    const optimal = 17.08; // Assuming optimal = all classic under 45min
    const currentSubway = Math.min(avgTripsPerMonth * 2.9, 132);

    // Month-by-month data
    const monthlyData = months.map(([month, data]) => {
      const monthlyCost = 17.08 + data.ebikeFees + data.overageFees;
      const subwayCost = Math.min(data.trips * 2.9, 132);
      return {
        month,
        trips: data.trips,
        cost: monthlyCost,
        breaksEven: monthlyCost < subwayCost,
      };
    });

    return {
      avgTripsPerMonth,
      avgEbikePercent,
      avgEbikeDuration,
      avgClassicDuration,
      currentMonthlyCost,
      breakevenVsPayPerRide,
      breakevenVsUnlimited,
      scenarios: {
        allClassicUnder45,
        allEbike,
        optimal,
        currentSubway,
      },
      monthlyData,
    };
  }, [userId]);
}
