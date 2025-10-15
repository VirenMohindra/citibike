/**
 * Sync Manager
 * Handles syncing data between Citibike API and local IndexedDB
 * Uses stale-while-revalidate pattern for optimal UX
 */

import { db, CACHE_TTL } from './schema';
import type { Trip } from '../types';
import { API_ROUTES } from '@/config/routes';

// ============================================
// Sync Manager Class
// ============================================

export class SyncManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ============================================
  // User Profile Sync
  // ============================================

  /**
   * Sync user profile from API
   * Uses stale-while-revalidate: returns cached data immediately, fetches fresh in background
   */
  async syncProfile(force = false): Promise<void> {
    const meta = await db.syncMetadata.get('profile');

    // Skip if fresh and not forced
    if (!force && meta && Date.now() < meta.nextSyncAfter) {
      return;
    }

    try {
      // Update status to syncing
      await db.syncMetadata.put({
        key: 'profile',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: meta?.nextSyncAfter || 0,
        status: 'syncing',
      });

      // Fetch from API
      const response = await fetch(API_ROUTES.USER.PROFILE, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Profile sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.user) {
        throw new Error('Invalid profile response');
      }

      // Update database
      const now = Date.now();
      await db.transaction('rw', [db.users, db.syncMetadata], async () => {
        await db.users.put({
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          phoneNumber: data.user.phoneNumber || '',
          membershipType: data.user.membershipType || 'member',
          memberSince: data.user.memberSince,
          ridesTaken: data.user.ridesTaken,
          region: data.user.region,
          userPhoto: data.user.userPhoto,
          referralCode: data.user.referralCode,
          lastSynced: now,
        });

        await db.syncMetadata.put({
          key: 'profile',
          userId: this.userId,
          lastSynced: now,
          nextSyncAfter: now + CACHE_TTL.PROFILE,
          status: 'idle',
        });
      });

      console.log('✅ Profile synced successfully');
    } catch (error) {
      console.error('❌ Profile sync failed:', error);

      // Update error status
      await db.syncMetadata.put({
        key: 'profile',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: Date.now() + 60000, // Retry in 1 minute
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ============================================
  // Bike Angel Sync
  // ============================================

  /**
   * Sync Bike Angel profile from API
   */
  async syncBikeAngel(force = false): Promise<void> {
    const meta = await db.syncMetadata.get('bikeAngel');

    // Skip if fresh and not forced
    if (!force && meta && Date.now() < meta.nextSyncAfter) {
      return;
    }

    try {
      // Update status to syncing
      await db.syncMetadata.put({
        key: 'bikeAngel',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: meta?.nextSyncAfter || 0,
        status: 'syncing',
      });

      // Fetch from API
      const response = await fetch(API_ROUTES.USER.BIKE_ANGEL, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Bike Angel sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Invalid bike angel response');
      }

      // Update database
      const now = Date.now();
      await db.transaction('rw', [db.bikeAngel, db.syncMetadata], async () => {
        await db.bikeAngel.put({
          userId: this.userId,
          totalPoints: data.profile?.totalPoints || 0,
          currentLevel: data.profile?.currentLevel || '',
          pointsToNextLevel: data.profile?.pointsToNextLevel || 0,
          lifetimePoints: data.profile?.lifetimePoints || 0,
          currentStreak: data.profile?.currentStreak || 0,
          longestStreak: data.profile?.longestStreak || 0,
          ridesThisMonth: data.profile?.ridesThisMonth || 0,
          pointsThisMonth: data.profile?.pointsThisMonth || 0,
          achievements: data.profile?.achievements || [],
          rawData: data.rawData || {},
          lastSynced: now,
        });

        await db.syncMetadata.put({
          key: 'bikeAngel',
          userId: this.userId,
          lastSynced: now,
          nextSyncAfter: now + CACHE_TTL.BIKE_ANGEL,
          status: 'idle',
        });
      });

      console.log('✅ Bike Angel synced successfully');
    } catch (error) {
      console.error('❌ Bike Angel sync failed:', error);

      // Update error status
      await db.syncMetadata.put({
        key: 'bikeAngel',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: Date.now() + 60000, // Retry in 1 minute
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ============================================
  // Subscriptions Sync
  // ============================================

  /**
   * Sync subscriptions from API
   */
  async syncSubscriptions(force = false): Promise<void> {
    const meta = await db.syncMetadata.get('subscriptions');

    // Skip if fresh and not forced
    if (!force && meta && Date.now() < meta.nextSyncAfter) {
      return;
    }

    try {
      // Update status to syncing
      await db.syncMetadata.put({
        key: 'subscriptions',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: meta?.nextSyncAfter || 0,
        status: 'syncing',
      });

      // Fetch from API
      const response = await fetch(API_ROUTES.USER.SUBSCRIPTIONS, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Subscriptions sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Invalid subscriptions response');
      }

      // Update database
      const now = Date.now();
      await db.transaction('rw', [db.subscriptions, db.syncMetadata], async () => {
        await db.subscriptions.put({
          userId: this.userId,
          planName: data.subscriptions?.plan_name || 'Unknown',
          status: data.subscriptions?.status || 'active',
          expiresAt: data.subscriptions?.expires_at,
          rawData: data.rawData || {},
          lastSynced: now,
        });

        await db.syncMetadata.put({
          key: 'subscriptions',
          userId: this.userId,
          lastSynced: now,
          nextSyncAfter: now + CACHE_TTL.SUBSCRIPTIONS,
          status: 'idle',
        });
      });

      console.log('✅ Subscriptions synced successfully');
    } catch (error) {
      console.error('❌ Subscriptions sync failed:', error);

      // Update error status
      await db.syncMetadata.put({
        key: 'subscriptions',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: Date.now() + 60000, // Retry in 1 minute
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ============================================
  // Trip History Sync (Incremental)
  // ============================================

  /**
   * Sync trip history from API (incremental with pagination)
   * Returns progress info for UI updates
   */
  async syncTrips(
    onProgress?: (progress: { page: number; totalSynced: number }) => void
  ): Promise<{ totalSynced: number; hasMore: boolean }> {
    const meta = await db.syncMetadata.get('trips');

    try {
      // Update status to syncing
      await db.syncMetadata.put({
        key: 'trips',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: 0,
        cursor: meta?.cursor,
        totalRecords: meta?.totalRecords || 0,
        status: 'syncing',
      });

      let totalSynced = 0;
      let page = 0;
      let cursor = meta?.cursor;
      let hasMore = true;

      while (hasMore) {
        page++;
        onProgress?.({ page, totalSynced });

        // Fetch page from API
        const response = await fetch(API_ROUTES.TRIPS.HISTORY, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cursor }),
        });

        if (!response.ok) {
          throw new Error(`Trip sync failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error('Invalid trip response');
        }

        // Store trips in batch
        if (data.trips && data.trips.length > 0) {
          const tripsToStore = data.trips.map((trip: Trip) => ({
            id: trip.id,
            userId: this.userId,
            startTime: trip.startTime instanceof Date ? trip.startTime.getTime() : trip.startTime,
            endTime: trip.endTime instanceof Date ? trip.endTime.getTime() : trip.endTime,
            duration: trip.duration,
            startStationId: trip.startStationId,
            startStationName: trip.startStationName,
            startLat: trip.startLat,
            startLon: trip.startLon,
            endStationId: trip.endStationId,
            endStationName: trip.endStationName,
            endLat: trip.endLat,
            endLon: trip.endLon,
            bikeType: trip.bikeType,
            distance: trip.distance,
          }));

          // Bulk insert (Dexie is optimized for this)
          await db.trips.bulkPut(tripsToStore);
          totalSynced += tripsToStore.length;

          console.log(`📦 Synced page ${page}: ${tripsToStore.length} trips`);
        }

        // Check for more pages
        hasMore = data.hasMore || false;
        cursor = data.nextCursor;

        // Safety check
        if (page > 100) {
          console.warn('Reached maximum page limit (100). Stopping pagination.');
          hasMore = false;
        }
      }

      // Update sync metadata
      const now = Date.now();
      const totalRecords = await db.trips.where({ userId: this.userId }).count();

      await db.syncMetadata.put({
        key: 'trips',
        userId: this.userId,
        lastSynced: now,
        nextSyncAfter: now + CACHE_TTL.TRIPS,
        cursor: hasMore ? cursor : undefined,
        totalRecords,
        status: 'idle',
      });

      console.log(`✅ Trip sync complete: ${totalSynced} trips synced`);

      return { totalSynced, hasMore };
    } catch (error) {
      console.error('❌ Trip sync failed:', error);

      // Update error status
      await db.syncMetadata.put({
        key: 'trips',
        userId: this.userId,
        lastSynced: meta?.lastSynced || 0,
        nextSyncAfter: 0,
        cursor: meta?.cursor,
        totalRecords: meta?.totalRecords || 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ============================================
  // Trip Details Sync (Bulk)
  // ============================================

  /**
   * Sync trip details for all trips that don't have polylines yet
   * Fetches detailed route data from trip details API
   * Uses rate limiting to avoid overwhelming the API
   */
  async syncTripDetails(
    onProgress?: (progress: {
      total: number;
      completed: number;
      failed: number;
      current?: string;
    }) => void,
    options: {
      rateLimit?: number; // ms between batches (default 500 = 2 req/sec)
      batchSize?: number; // parallel requests per batch (default 1 = sequential)
      maxTrips?: number; // max trips to fetch (default: all)
    } = {}
  ): Promise<{ fetched: number; failed: number; skipped: number }> {
    const { rateLimit = 500, batchSize = 1, maxTrips } = options;

    try {
      // Get all trips that need details (no polyline or missing coordinates)
      let tripsNeedingDetails = await db.trips
        .where({ userId: this.userId })
        .filter(
          (trip) =>
            !trip.detailsFetched &&
            (!trip.polyline ||
              !trip.hasActualCoordinates ||
              trip.startLat === 0 ||
              trip.startLon === 0 ||
              trip.endLat === 0 ||
              trip.endLon === 0)
        )
        .toArray();

      // Limit if specified
      if (maxTrips && tripsNeedingDetails.length > maxTrips) {
        tripsNeedingDetails = tripsNeedingDetails.slice(0, maxTrips);
      }

      const total = tripsNeedingDetails.length;
      let completed = 0;
      let failed = 0;
      let consecutiveRateLimitErrors = 0;
      let currentBackoff = rateLimit; // Start with configured rate limit

      console.log(`🔄 Starting bulk trip details sync: ${total} trips to fetch`);

      // Process in batches with rate limiting
      for (let i = 0; i < tripsNeedingDetails.length; i += batchSize) {
        // Stop if we hit 3 consecutive rate limit errors
        if (consecutiveRateLimitErrors >= 3) {
          console.warn(
            `⚠️  Rate limit detected (${consecutiveRateLimitErrors} consecutive errors). Stopping sync.`
          );
          console.warn(
            `✅ ${completed} trips fetched, ❌ ${failed} failed, ⏸️  ${total - completed - failed} remaining`
          );
          break;
        }

        const batch = tripsNeedingDetails.slice(i, i + batchSize);

        // Fetch details for batch in parallel
        const results = await Promise.allSettled(
          batch.map(async (trip) => {
            try {
              const response = await fetch(`/api/citibike/trips/${trip.id}`, {
                credentials: 'include',
              });

              if (!response.ok) {
                // Parse error response to check error code
                const errorData = await response.json().catch(() => ({}));
                const errorCode = errorData.code || `HTTP_${response.status}`;

                // Check if it's a rate limit error (429, 403 with RATE_LIMITED, or specific error messages)
                const isRateLimited =
                  response.status === 429 ||
                  errorData.code === 'RATE_LIMITED' ||
                  (errorData.error &&
                    (errorData.error.toLowerCase().includes('rate limit') ||
                      errorData.error.toLowerCase().includes('too many request')));

                // Store error in database
                const currentAttempts = trip.detailsFetchAttempts || 0;
                await db.trips.update(trip.id, {
                  detailsFetchError: errorCode,
                  detailsFetchAttempts: currentAttempts + 1,
                  detailsFetched: false,
                });

                if (isRateLimited) {
                  throw new Error(`RATE_LIMITED: ${errorData.error || 'Too many requests'}`);
                }

                throw new Error(
                  `HTTP ${response.status}: ${errorData.error || response.statusText}`
                );
              }

              const data = await response.json();

              if (!data.success || !data.trip) {
                // Store error in database
                const currentAttempts = trip.detailsFetchAttempts || 0;
                await db.trips.update(trip.id, {
                  detailsFetchError: 'INVALID_RESPONSE',
                  detailsFetchAttempts: currentAttempts + 1,
                  detailsFetched: false,
                });

                throw new Error('Invalid response');
              }

              // Extract data
              const updates: Partial<typeof trip> = {
                detailsFetched: true,
                detailsFetchedAt: Date.now(),
                detailsFetchError: undefined, // Clear any previous errors
              };

              // Extract start station details
              if (data.trip.start_address) {
                updates.startStationName = data.trip.start_address.address || trip.startStationName;
                updates.startLat = data.trip.start_address.lat || trip.startLat;
                updates.startLon = data.trip.start_address.lng || trip.startLon;
              }

              // Extract end station details
              if (data.trip.end_address) {
                updates.endStationName = data.trip.end_address.address || trip.endStationName;
                updates.endLat = data.trip.end_address.lat || trip.endLat;
                updates.endLon = data.trip.end_address.lng || trip.endLon;
              }

              // Extract polyline from map_image_url
              if (data.trip.map_image_url) {
                try {
                  const url = new URL(data.trip.map_image_url);
                  const polyline = url.searchParams.get('polyline');
                  if (polyline) {
                    updates.polyline = polyline;
                    updates.hasActualCoordinates = true;
                  }
                } catch (e) {
                  console.warn(`Failed to parse map URL for trip ${trip.id}:`, e);
                }
              }

              // Extract distance if available
              if (data.trip.distance?.value) {
                // Distance is in miles, convert to meters (1 mile = 1609.34 meters)
                const miles = data.trip.distance.value;
                updates.distance = Math.round(miles * 1609.34);
                updates.hasActualCoordinates = true;
              }

              // Update database
              await db.trips.update(trip.id, updates);

              return { success: true, tripId: trip.id };
            } catch (error) {
              console.error(`❌ Failed to fetch details for trip ${trip.id}:`, error);

              // Store error in database (if not already stored above)
              try {
                const currentTrip = await db.trips.get(trip.id);
                if (currentTrip && !currentTrip.detailsFetchError) {
                  const currentAttempts = currentTrip.detailsFetchAttempts || 0;
                  await db.trips.update(trip.id, {
                    detailsFetchError: 'UNKNOWN_ERROR',
                    detailsFetchAttempts: currentAttempts + 1,
                    detailsFetched: false,
                  });
                }
              } catch (dbError) {
                console.error('Failed to store error in database:', dbError);
              }

              return {
                success: false,
                tripId: trip.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        // Count results and track rate limit errors
        let batchHadRateLimitError = false;
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            completed++;
          } else {
            failed++;
            // Check if it's a rate limit error
            if (
              result.status === 'fulfilled' &&
              result.value.error &&
              result.value.error.includes('RATE_LIMITED')
            ) {
              batchHadRateLimitError = true;
            }
          }
        }

        // Update consecutive rate limit counter
        if (batchHadRateLimitError) {
          consecutiveRateLimitErrors++;
          // Apply exponential backoff (double the delay each time, max 10 seconds)
          currentBackoff = Math.min(currentBackoff * 2, 10000);
          console.warn(
            `⚠️  Rate limit detected in batch. Increasing backoff to ${currentBackoff}ms`
          );
        } else {
          // Reset on success
          consecutiveRateLimitErrors = 0;
          currentBackoff = rateLimit;
        }

        // Report progress
        const current = batch[0]?.id;
        onProgress?.({ total, completed, failed, current });

        // Rate limit between batches (but not after the last batch)
        if (i + batchSize < tripsNeedingDetails.length) {
          await this.sleep(currentBackoff);
        }
      }

      console.log(
        `✅ Bulk trip details sync complete: ${completed} fetched, ${failed} failed, ${total - completed - failed} skipped`
      );

      return {
        fetched: completed,
        failed,
        skipped: total - completed - failed,
      };
    } catch (error) {
      console.error('❌ Bulk trip details sync failed:', error);
      throw error;
    }
  }

  /**
   * Helper to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // Sync All Data
  // ============================================

  /**
   * Sync all user data (profile, bike angel, subscriptions, trips)
   * Optionally fetch detailed trip data after initial sync
   */
  async syncAll(
    onProgress?: (type: string, progress: unknown) => void,
    options: {
      fetchTripDetails?: boolean;
      tripDetailsBatchSize?: number;
      tripDetailsRateLimit?: number;
      tripDetailsMaxTrips?: number;
    } = {}
  ): Promise<void> {
    onProgress?.('profile', { status: 'syncing' });
    await this.syncProfile();

    onProgress?.('bikeAngel', { status: 'syncing' });
    await this.syncBikeAngel();

    onProgress?.('subscriptions', { status: 'syncing' });
    await this.syncSubscriptions();

    onProgress?.('trips', { status: 'syncing' });
    await this.syncTrips((tripProgress) => {
      onProgress?.('trips', tripProgress);
    });

    // Optionally fetch detailed trip data (polylines, coordinates)
    if (options.fetchTripDetails) {
      onProgress?.('tripDetails', { status: 'syncing' });
      await this.syncTripDetails(
        (detailProgress) => {
          onProgress?.('tripDetails', detailProgress);
        },
        {
          batchSize: options.tripDetailsBatchSize,
          rateLimit: options.tripDetailsRateLimit,
          maxTrips: options.tripDetailsMaxTrips,
        }
      );
    }

    console.log('✅ All data synced successfully');
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a sync manager for the current user
 */
export function createSyncManager(userId: string): SyncManager {
  return new SyncManager(userId);
}

/**
 * Check if any data needs syncing
 */
export async function needsSync(): Promise<{
  profile: boolean;
  bikeAngel: boolean;
  subscriptions: boolean;
}> {
  const now = Date.now();

  const [profile, bikeAngel, subscriptions] = await Promise.all([
    db.syncMetadata.get('profile'),
    db.syncMetadata.get('bikeAngel'),
    db.syncMetadata.get('subscriptions'),
  ]);

  return {
    profile: !profile || now > profile.nextSyncAfter,
    bikeAngel: !bikeAngel || now > bikeAngel.nextSyncAfter,
    subscriptions: !subscriptions || now > subscriptions.nextSyncAfter,
  };
}
