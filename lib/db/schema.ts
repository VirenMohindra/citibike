/**
 * Dexie Database Schema
 * Centralized data storage for all Citibike user data
 */

import Dexie, { type EntityTable } from 'dexie';
import type { BikeAngelAchievement } from '../types';

// ============================================
// Store Interfaces
// ============================================

/**
 * User Profile Store
 * Stores authenticated user information
 */
export interface UserProfile {
  id: string; // primary key (user ID)
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  membershipType: string;
  memberSince?: string;
  ridesTaken?: number;
  region?: string;
  userPhoto?: string;
  referralCode?: string;
  lastSynced: number; // timestamp
}

/**
 * Bike Angel Profile Store
 * Stores user's Bike Angel stats and achievements
 */
export interface BikeAngelProfile {
  userId: string; // primary key (user ID)
  totalPoints: number;
  currentLevel: string;
  pointsToNextLevel: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  ridesThisMonth: number;
  pointsThisMonth: number;
  achievements: BikeAngelAchievement[];
  rawData: Record<string, unknown>; // store full API response for future parsing
  lastSynced: number;
}

/**
 * Subscription Store
 * Stores user's membership/subscription information
 */
export interface Subscription {
  userId: string; // primary key
  planName: string;
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: number;
  rawData: Record<string, unknown>; // store full API response
  lastSynced: number;
}

/**
 * Trip Store
 * Stores individual trip/ride records
 */
export interface Trip {
  id: string; // primary key (trip ID)
  userId: string; // foreign key for multi-user support
  startTime: number; // timestamp
  endTime: number; // timestamp
  duration: number; // seconds
  startStationId: string;
  startStationName: string;
  startLat: number;
  startLon: number;
  endStationId: string;
  endStationName: string;
  endLat: number;
  endLon: number;
  bikeType: 'classic' | 'ebike';
  angelPoints?: number;
  cost?: number; // cents
  distance?: number; // meters (calculated or estimated)
  polyline?: string; // encoded polyline for map visualization
  hasActualCoordinates?: boolean; // true if coordinates from trip details API
  detailsFetched?: boolean; // true if trip details have been fetched from API
  detailsFetchedAt?: number; // timestamp when details were fetched
  detailsFetchError?: string; // error code/message if fetching details failed (e.g., 'NOT_FOUND', 'SERVER_ERROR')
  detailsFetchAttempts?: number; // number of times we've attempted to fetch details

  // Transportation Economics Analysis Fields
  actualDistance?: number; // meters, from polyline or calculated
  estimatedDistance?: number; // meters, if no polyline, haversine × 1.3
  actualCost?: number; // dollars, calculated cost (e-bike fees or overage fees)
  distanceCategory?: 'short' | 'medium' | 'long'; // <1mi, 1-3mi, >3mi
  durationCategory?: 'quick' | 'standard' | 'extended'; // <20min, 20-45min, >45min
  timeOfDay?: 'morning_rush' | 'midday' | 'evening_rush' | 'night'; // time of day category
  suitabilityScore?: number; // 0-100, how suitable this trip is for Citibike
  estimatedSubwayTime?: number; // minutes, estimated subway alternative time
  timeSavings?: number; // minutes, positive if bike faster than subway
  costSavings?: number; // dollars, positive if bike cheaper than subway
  timeValue?: number; // dollars, value of time saved
  healthValue?: number; // dollars, value of exercise gained
  netValue?: number; // dollars, total value gained/lost on this trip
  recommendedMode?: 'citibike_classic' | 'citibike_ebike' | 'subway'; // optimal mode for this trip
  normalized?: boolean; // true if trip data has been normalized and analyzed
  normalizedAt?: number; // timestamp when normalization occurred
}

/**
 * Sync Metadata Store
 * Tracks sync status and cache invalidation for each data type
 */
export interface SyncMetadata {
  key: string; // primary key: 'trips', 'profile', 'bikeAngel', 'subscriptions'
  userId: string;
  lastSynced: number;
  nextSyncAfter: number; // TTL-based cache invalidation
  totalRecords?: number;
  cursor?: string; // for pagination
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

/**
 * Public Trip Store
 * Stores aggregate public trip data from Citibike's open data portal
 * Used for benchmarking and aggregate statistics analysis
 * Source: https://s3.amazonaws.com/tripdata/index.html
 */
export interface PublicTrip {
  rideId: string; // primary key
  bikeType: 'electric_bike' | 'classic_bike';
  startTime: number; // Unix timestamp (ms)
  endTime: number; // Unix timestamp (ms)
  duration: number; // seconds
  distance: number; // meters (calculated haversine)
  startStationId: string;
  startStationName: string;
  endStationId: string;
  endStationName: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  memberType: 'member' | 'casual';
  // Categorization for analysis
  distanceCategory?: 'short' | 'medium' | 'long'; // <1mi, 1-3mi, >3mi
  durationCategory?: 'quick' | 'standard' | 'extended'; // <20min, 20-45min, >45min
  timeOfDay?: 'morning_rush' | 'midday' | 'evening_rush' | 'night'; // time of day
  // Metadata
  datasetMonth?: string; // 'YYYY-MM' from filename
  importedAt?: number; // timestamp when imported
}

// ============================================
// Database Class
// ============================================

export class CitibikeDB extends Dexie {
  // TypeScript declarations for tables
  users!: EntityTable<UserProfile, 'id'>;
  bikeAngel!: EntityTable<BikeAngelProfile, 'userId'>;
  subscriptions!: EntityTable<Subscription, 'userId'>;
  trips!: EntityTable<Trip, 'id'>;
  syncMetadata!: EntityTable<SyncMetadata, 'key'>;
  publicTrips!: EntityTable<PublicTrip, 'rideId'>;

  constructor() {
    super('citibike-local-db');

    // Define schema version 1
    this.version(1).stores({
      // User profiles indexed by ID and sync time
      users: 'id, lastSynced',

      // Bike Angel profiles indexed by user ID, sync time, and level
      bikeAngel: 'userId, lastSynced, currentLevel',

      // Subscriptions indexed by user ID, status, and sync time
      subscriptions: 'userId, status, lastSynced',

      // Trips with compound indexes for efficient queries
      trips: `
        id,
        userId,
        [userId+startTime],
        [userId+endTime],
        [userId+bikeType],
        [userId+startStationId],
        [userId+endStationId],
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        [startLat+startLon],
        [endLat+endLon]
      `,

      // Sync metadata indexed by key, user ID, and sync time
      syncMetadata: 'key, [userId+key], lastSynced',
    });

    // Version 2: Add hasActualCoordinates index for filtering trips
    this.version(2).stores({
      trips: `
        id,
        userId,
        [userId+startTime],
        [userId+endTime],
        [userId+bikeType],
        [userId+startStationId],
        [userId+endStationId],
        [userId+hasActualCoordinates],
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        hasActualCoordinates,
        [startLat+startLon],
        [endLat+endLon]
      `,
    });

    // Version 3: Add detailsFetched tracking for trip details API
    this.version(3).stores({
      trips: `
        id,
        userId,
        [userId+startTime],
        [userId+endTime],
        [userId+bikeType],
        [userId+startStationId],
        [userId+endStationId],
        [userId+hasActualCoordinates],
        [userId+detailsFetched],
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        hasActualCoordinates,
        detailsFetched,
        [startLat+startLon],
        [endLat+endLon]
      `,
    });

    // Version 4: Add indexes for transportation economics analysis
    this.version(4).stores({
      trips: `
        id,
        userId,
        [userId+startTime],
        [userId+endTime],
        [userId+bikeType],
        [userId+startStationId],
        [userId+endStationId],
        [userId+hasActualCoordinates],
        [userId+detailsFetched],
        [userId+normalized],
        [userId+distanceCategory],
        [userId+durationCategory],
        [userId+timeOfDay],
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        hasActualCoordinates,
        detailsFetched,
        normalized,
        distanceCategory,
        durationCategory,
        timeOfDay,
        suitabilityScore,
        [startLat+startLon],
        [endLat+endLon]
      `,
    });

    // Version 5: Add public trips table for aggregate benchmarking
    this.version(5).stores({
      publicTrips: `
        rideId,
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        memberType,
        distanceCategory,
        durationCategory,
        timeOfDay,
        datasetMonth,
        [startStationId+endStationId],
        [bikeType+distanceCategory],
        [memberType+timeOfDay],
        [startLat+startLon],
        [endLat+endLon]
      `,
    });

    // Version 6: Add error tracking for trip details fetching
    this.version(6).stores({
      trips: `
        id,
        userId,
        [userId+startTime],
        [userId+endTime],
        [userId+bikeType],
        [userId+startStationId],
        [userId+endStationId],
        [userId+hasActualCoordinates],
        [userId+detailsFetched],
        [userId+detailsFetchError],
        [userId+normalized],
        [userId+distanceCategory],
        [userId+durationCategory],
        [userId+timeOfDay],
        startTime,
        endTime,
        startStationId,
        endStationId,
        bikeType,
        hasActualCoordinates,
        detailsFetched,
        detailsFetchError,
        normalized,
        distanceCategory,
        durationCategory,
        timeOfDay,
        suitabilityScore,
        [startLat+startLon],
        [endLat+endLon]
      `,
    });
  }

  /**
   * Clear all data for a specific user (for logout)
   */
  async clearUserData(userId: string): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      await this.users.delete(userId);
      await this.bikeAngel.delete(userId);
      await this.subscriptions.delete(userId);
      await this.trips.where({ userId }).delete();
      await this.syncMetadata.where({ userId }).delete();
    });
  }

  /**
   * Get database statistics
   */
  async getStats(userId: string) {
    return {
      totalTrips: await this.trips.where({ userId }).count(),
      profileSynced: !!(await this.users.get(userId)),
      angelSynced: !!(await this.bikeAngel.get(userId)),
      subscriptionSynced: !!(await this.subscriptions.get(userId)),
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Global database instance
 * Use this throughout the application
 */
export const db = new CitibikeDB();

/**
 * TTL Configuration for Cache Invalidation
 */
export const CACHE_TTL = {
  PROFILE: 60 * 60 * 1000, // 1 hour
  SUBSCRIPTIONS: 60 * 60 * 1000, // 1 hour
  BIKE_ANGEL: 5 * 60 * 1000, // 5 minutes (frequently changing)
  TRIPS: Infinity, // Never expire, use incremental sync
} as const;
