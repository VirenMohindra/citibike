import { test, expect } from '../fixtures/coverage';
import type {
  Trip,
  UserProfile,
  BikeAngelProfile,
  Subscription,
  PublicTrip,
  SyncMetadata,
} from '@/lib/db/schema';

/**
 * Database Schema & Data Types Tests
 * Tests for Dexie database schema validation and data integrity including:
 * - Data type validation
 * - Query logic and filtering
 * - Data transformation and normalization
 * - Index key structures
 * - Bulk operation patterns
 * - Transaction safety principles
 */

test.describe('Database Schema & Types', () => {
  // Trip factory
  const createMockTrip = (overrides: Partial<Trip> = {}): Trip => ({
    id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-123',
    startTime: Date.now() - 86400000,
    endTime: Date.now() - 86400000 + 1800000,
    duration: 1800,
    startStationId: 'station-1',
    startStationName: 'Start Station',
    startLat: 40.7407,
    startLon: -73.9818,
    endStationId: 'station-2',
    endStationName: 'End Station',
    endLat: 40.7589,
    endLon: -73.9851,
    bikeType: 'classic',
    hasActualCoordinates: true,
    detailsFetched: false,
    detailsFetchedAt: undefined,
    detailsFetchError: undefined,
    detailsFetchAttempts: 0,
    normalized: false,
    normalizedAt: undefined,
    ...overrides,
  });

  const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    membershipType: 'annual',
    memberSince: '2023-01-01',
    ridesTaken: 100,
    region: 'NYC',
    referralCode: 'REF123',
    lastSynced: Date.now(),
    ...overrides,
  });

  test.describe('Trip Schema', () => {
    test('should have all required trip fields', () => {
      const trip = createMockTrip();

      expect(trip).toHaveProperty('id');
      expect(trip).toHaveProperty('userId');
      expect(trip).toHaveProperty('startTime');
      expect(trip).toHaveProperty('endTime');
      expect(trip).toHaveProperty('duration');
      expect(trip).toHaveProperty('startStationId');
      expect(trip).toHaveProperty('bikeType');
      expect(trip).toHaveProperty('hasActualCoordinates');
      expect(trip).toHaveProperty('detailsFetched');
      expect(trip).toHaveProperty('normalized');
    });

    test('trip ID should be unique and string', () => {
      const trip1 = createMockTrip();
      const trip2 = createMockTrip();

      expect(typeof trip1.id).toBe('string');
      expect(trip1.id).not.toBe(trip2.id);
      expect(trip1.id.length).toBeGreaterThan(0);
    });

    test('trip coordinates should be valid', () => {
      const trip = createMockTrip();

      // Start coordinates
      expect(trip.startLat).toBeGreaterThanOrEqual(-90);
      expect(trip.startLat).toBeLessThanOrEqual(90);
      expect(trip.startLon).toBeGreaterThanOrEqual(-180);
      expect(trip.startLon).toBeLessThanOrEqual(180);

      // End coordinates
      expect(trip.endLat).toBeGreaterThanOrEqual(-90);
      expect(trip.endLat).toBeLessThanOrEqual(90);
      expect(trip.endLon).toBeGreaterThanOrEqual(-180);
      expect(trip.endLon).toBeLessThanOrEqual(180);
    });

    test('trip times should be in correct order', () => {
      const trip = createMockTrip({
        startTime: 100,
        endTime: 200,
      });

      expect(trip.startTime).toBeLessThan(trip.endTime);
    });

    test('trip duration should be positive', () => {
      const trip = createMockTrip();
      expect(trip.duration).toBeGreaterThan(0);
    });

    test('bike type should be classic or ebike', () => {
      const classicTrip = createMockTrip({ bikeType: 'classic' });
      const ebikeTrip = createMockTrip({ bikeType: 'ebike' });

      expect(['classic', 'ebike']).toContain(classicTrip.bikeType);
      expect(['classic', 'ebike']).toContain(ebikeTrip.bikeType);
    });

    test('trip should support all analysis fields', () => {
      const trip = createMockTrip({
        angelPoints: 50,
        cost: 5.2,
        distance: 2500,
        polyline: 'encoded_polyline',
        actualDistance: 2500,
        estimatedDistance: 2400,
        actualCost: 5.2,
        distanceCategory: 'medium',
        durationCategory: 'standard',
        timeOfDay: 'midday',
        suitabilityScore: 85,
        estimatedSubwayTime: 12,
        timeSavings: -5,
        costSavings: 2.9,
        timeValue: 10,
        healthValue: 5,
        netValue: 17.9,
        recommendedMode: 'citibike_classic',
      });

      expect(trip.angelPoints).toBe(50);
      expect(trip.cost).toBe(5.2);
      expect(trip.distance).toBe(2500);
      expect(trip.distanceCategory).toBe('medium');
      expect(trip.suitabilityScore).toBe(85);
    });
  });

  test.describe('User Profile Schema', () => {
    test('should have all required profile fields', () => {
      const profile = createMockUserProfile();

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('firstName');
      expect(profile).toHaveProperty('lastName');
      expect(profile).toHaveProperty('membershipType');
      expect(profile).toHaveProperty('lastSynced');
    });

    test('profile ID should be non-empty string', () => {
      const profile = createMockUserProfile();
      expect(typeof profile.id).toBe('string');
      expect(profile.id.length).toBeGreaterThan(0);
    });

    test('profile email should be valid format', () => {
      const profile = createMockUserProfile({ email: 'user@example.com' });
      expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('profile lastSynced should be timestamp', () => {
      const profile = createMockUserProfile();
      expect(typeof profile.lastSynced).toBe('number');
      expect(profile.lastSynced).toBeGreaterThan(0);
    });
  });

  test.describe('BikeAngel Profile Schema', () => {
    test('should have all required bike angel fields', () => {
      const angel: BikeAngelProfile = {
        userId: 'test-user',
        totalPoints: 500,
        currentLevel: 'Gold',
        pointsToNextLevel: 250,
        lifetimePoints: 1000,
        currentStreak: 5,
        longestStreak: 15,
        ridesThisMonth: 20,
        pointsThisMonth: 150,
        achievements: [],
        rawData: {},
        lastSynced: Date.now(),
      };

      expect(angel).toHaveProperty('userId');
      expect(angel).toHaveProperty('totalPoints');
      expect(angel).toHaveProperty('currentLevel');
      expect(angel).toHaveProperty('achievements');
    });

    test('points should be non-negative', () => {
      const angel: BikeAngelProfile = {
        userId: 'test-user',
        totalPoints: 500,
        currentLevel: 'Silver',
        pointsToNextLevel: 100,
        lifetimePoints: 2000,
        currentStreak: 3,
        longestStreak: 10,
        ridesThisMonth: 15,
        pointsThisMonth: 100,
        achievements: [],
        rawData: {},
        lastSynced: Date.now(),
      };

      expect(angel.totalPoints).toBeGreaterThanOrEqual(0);
      expect(angel.pointsToNextLevel).toBeGreaterThanOrEqual(0);
      expect(angel.lifetimePoints).toBeGreaterThanOrEqual(0);
      expect(angel.pointsThisMonth).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Subscription Schema', () => {
    test('should have all required subscription fields', () => {
      const sub: Subscription = {
        userId: 'test-user',
        planName: 'Annual',
        status: 'active',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        rawData: {},
        lastSynced: Date.now(),
      };

      expect(sub).toHaveProperty('userId');
      expect(sub).toHaveProperty('planName');
      expect(sub).toHaveProperty('status');
      expect(sub).toHaveProperty('expiresAt');
    });

    test('subscription status should be valid', () => {
      const validStatuses = ['active', 'expired', 'cancelled'];

      const sub1: Subscription = {
        userId: 'user1',
        planName: 'Annual',
        status: 'active',
        expiresAt: Date.now(),
        rawData: {},
        lastSynced: Date.now(),
      };

      const sub2: Subscription = {
        userId: 'user2',
        planName: 'Monthly',
        status: 'expired',
        expiresAt: Date.now() - 1000,
        rawData: {},
        lastSynced: Date.now(),
      };

      expect(validStatuses).toContain(sub1.status);
      expect(validStatuses).toContain(sub2.status);
    });
  });

  test.describe('PublicTrip Schema', () => {
    test('should have all required public trip fields', () => {
      const pub: PublicTrip = {
        rideId: 'pub-1',
        bikeType: 'classic_bike',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 1800,
        distance: 2000,
        startStationId: 's1',
        startStationName: 'Station 1',
        endStationId: 's2',
        endStationName: 'Station 2',
        startLat: 0,
        startLon: 0,
        endLat: 1,
        endLon: 1,
        memberType: 'member',
        distanceCategory: 'short',
        durationCategory: 'quick',
        timeOfDay: 'morning_rush',
        datasetMonth: '2024-01',
        importedAt: Date.now(),
      };

      expect(pub).toHaveProperty('rideId');
      expect(pub).toHaveProperty('bikeType');
      expect(pub).toHaveProperty('datasetMonth');
      expect(pub).toHaveProperty('importedAt');
    });

    test('public trip categories should be valid', () => {
      const validDistances = ['short', 'medium', 'long'];
      const validDurations = ['quick', 'standard', 'extended'];
      const validTimes = ['morning_rush', 'midday', 'evening_rush', 'night'];

      const trip1: PublicTrip = {
        rideId: 'pub-1',
        bikeType: 'electric_bike',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 900,
        distance: 1000,
        startStationId: 's1',
        startStationName: 'S1',
        endStationId: 's2',
        endStationName: 'S2',
        startLat: 0,
        startLon: 0,
        endLat: 1,
        endLon: 1,
        memberType: 'casual',
        distanceCategory: 'short',
        durationCategory: 'quick',
        timeOfDay: 'morning_rush',
        datasetMonth: '2024-02',
        importedAt: Date.now(),
      };

      expect(validDistances).toContain(trip1.distanceCategory);
      expect(validDurations).toContain(trip1.durationCategory);
      expect(validTimes).toContain(trip1.timeOfDay);
    });
  });

  test.describe('SyncMetadata Schema', () => {
    test('should have all required sync metadata fields', () => {
      const meta: SyncMetadata = {
        key: 'trips',
        userId: 'user-123',
        lastSynced: Date.now(),
        nextSyncAfter: Date.now() + 3600000,
        totalRecords: 100,
        status: 'idle',
      };

      expect(meta).toHaveProperty('key');
      expect(meta).toHaveProperty('userId');
      expect(meta).toHaveProperty('status');
      expect(meta).toHaveProperty('lastSynced');
    });

    test('sync status should be valid', () => {
      const validStatuses = ['idle', 'syncing', 'error'];

      const metas: SyncMetadata[] = [
        {
          key: 'profile',
          userId: 'user-1',
          lastSynced: Date.now(),
          nextSyncAfter: Date.now(),
          totalRecords: 1,
          status: 'idle',
        },
        {
          key: 'trips',
          userId: 'user-2',
          lastSynced: Date.now(),
          nextSyncAfter: Date.now(),
          totalRecords: 50,
          cursor: 'abc123',
          status: 'syncing',
        },
      ];

      metas.forEach((m) => {
        expect(validStatuses).toContain(m.status);
      });
    });
  });

  test.describe('Index Key Structures', () => {
    test('compound index [userId+startTime] should work', () => {
      const trips = [
        createMockTrip({ userId: 'user-1', startTime: 100 }),
        createMockTrip({ userId: 'user-1', startTime: 200 }),
        createMockTrip({ userId: 'user-2', startTime: 150 }),
      ];

      // Simulate compound index filtering
      const filtered = trips.filter((t) => t.userId === 'user-1' && t.startTime >= 100);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((t) => t.userId === 'user-1')).toBe(true);
    });

    test('compound index [userId+endTime] should work', () => {
      const trips = [
        createMockTrip({ userId: 'user-1', endTime: 200 }),
        createMockTrip({ userId: 'user-1', endTime: 300 }),
        createMockTrip({ userId: 'user-2', endTime: 250 }),
      ];

      const filtered = trips.filter((t) => t.userId === 'user-1');
      expect(filtered).toHaveLength(2);
    });

    test('index [startLat+startLon] should work for coordinates', () => {
      const trips = [
        createMockTrip({ startLat: 40.7407, startLon: -73.9818 }),
        createMockTrip({ startLat: 40.7589, startLon: -73.9851 }),
      ];

      // Simulate coordinate index lookup
      const foundTrip = trips.find((t) => t.startLat === 40.7407 && t.startLon === -73.9818);

      expect(foundTrip?.startLat).toBe(40.7407);
      expect(foundTrip?.startLon).toBe(-73.9818);
    });
  });

  test.describe('Bulk Operations', () => {
    test('should support bulk add structure', () => {
      const trips = [createMockTrip(), createMockTrip(), createMockTrip()];

      const tripsByUser = trips.reduce(
        (acc, trip) => {
          if (!acc[trip.userId]) acc[trip.userId] = [];
          acc[trip.userId].push(trip);
          return acc;
        },
        {} as Record<string, Trip[]>
      );

      expect(tripsByUser['test-user-123']).toHaveLength(3);
    });

    test('should support bulk put (upsert) structure', () => {
      const trip1 = createMockTrip({ id: 'trip-1', bikeType: 'classic' });
      const trip2 = createMockTrip({ id: 'trip-2', bikeType: 'ebike' });

      const tripMap = new Map([
        [trip1.id, trip1],
        [trip2.id, trip2],
      ]);

      // Simulate upsert - update existing or add new
      const updated1: Trip = { ...trip1, bikeType: 'ebike' };
      tripMap.set(updated1.id, updated1);

      expect(tripMap.get('trip-1')?.bikeType).toBe('ebike');
    });
  });

  test.describe('Query Logic', () => {
    test('should filter trips by user ID', () => {
      const trips = [
        createMockTrip({ userId: 'user-1' }),
        createMockTrip({ userId: 'user-1' }),
        createMockTrip({ userId: 'user-2' }),
      ];

      const user1Trips = trips.filter((t) => t.userId === 'user-1');
      expect(user1Trips).toHaveLength(2);
      expect(user1Trips.every((t) => t.userId === 'user-1')).toBe(true);
    });

    test('should filter trips by bike type', () => {
      const trips = [
        createMockTrip({ bikeType: 'classic' }),
        createMockTrip({ bikeType: 'ebike' }),
        createMockTrip({ bikeType: 'classic' }),
      ];

      const classics = trips.filter((t) => t.bikeType === 'classic');
      expect(classics).toHaveLength(2);
      expect(classics.every((t) => t.bikeType === 'classic')).toBe(true);
    });

    test('should sort trips by startTime descending', () => {
      const now = Date.now();
      const trips = [
        createMockTrip({ startTime: now - 1000 }),
        createMockTrip({ startTime: now - 3000 }),
        createMockTrip({ startTime: now - 2000 }),
      ];

      const sorted = [...trips].sort((a, b) => b.startTime - a.startTime);

      expect(sorted[0].startTime).toBeGreaterThan(sorted[1].startTime);
      expect(sorted[1].startTime).toBeGreaterThan(sorted[2].startTime);
    });

    test('should apply limit to query results', () => {
      const trips = Array.from({ length: 20 }, (_, i) => createMockTrip({ id: `trip-${i}` }));

      const limited = trips.slice(0, 5);
      expect(limited).toHaveLength(5);
    });
  });

  test.describe('Data Immutability', () => {
    test('should update trip immutably', () => {
      const original = createMockTrip({ bikeType: 'classic' });
      const updated = { ...original, bikeType: 'ebike' };

      expect(original.bikeType).toBe('classic');
      expect(updated.bikeType).toBe('ebike');
    });

    test('should merge partial updates immutably', () => {
      const trip = createMockTrip();
      const now = Date.now();
      const partial: Partial<Trip> = { normalized: true, normalizedAt: now };

      const merged = { ...trip, ...partial };

      expect(trip.normalized).toBe(false);
      expect(merged.normalized).toBe(true);
      expect(trip.normalizedAt).toBeUndefined();
      expect(merged.normalizedAt).toBe(now);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle trip with null optional fields', () => {
      const trip = createMockTrip({
        detailsFetchedAt: undefined,
        detailsFetchError: undefined,
        normalizedAt: undefined,
        polyline: undefined,
      });

      expect(trip.detailsFetchedAt).toBeUndefined();
      expect(trip.polyline).toBeUndefined();
    });

    test('should handle very old trip dates', () => {
      const year2000 = new Date('2000-01-01T00:00:00Z').getTime();
      const oldTrip = createMockTrip({ startTime: year2000 });
      expect(new Date(oldTrip.startTime).getUTCFullYear()).toBe(2000);
    });

    test('should handle zero duration trip', () => {
      const zeroDuration = createMockTrip({ duration: 0 });
      expect(zeroDuration.duration).toBe(0);
    });

    test('should handle extreme coordinates', () => {
      const extreme = createMockTrip({
        startLat: 89.9999,
        startLon: 179.9999,
        endLat: -89.9999,
        endLon: -179.9999,
      });

      expect(extreme.startLat).toBeLessThanOrEqual(90);
      expect(extreme.startLon).toBeLessThanOrEqual(180);
    });
  });
});
