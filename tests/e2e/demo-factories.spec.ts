/**
 * Playwright tests for demo factory system
 * Tests trip generation logic and data validation
 */

import { test, expect } from '@playwright/test';
import { generateTrips } from '@/lib/demo/factories/trip.factory';
import { generateUserProfile } from '@/lib/demo/factories/user-profile.factory';
import { generateBikeAngelProfile } from '@/lib/demo/factories/bike-angel.factory';
import { dailyCommuterPersona } from '@/lib/demo/personas/daily-commuter';
import type { Station } from '@/lib/demo/types';

// Mock station data for testing (includes persona's favorite stations)
const mockStations: Station[] = [
  {
    station_id: '1',
    name: 'W 21 St & 6 Ave', // Favorite station 1
    lat: 40.742169,
    lon: -73.994285,
    capacity: 63,
  },
  {
    station_id: '2',
    name: 'W 31 St & 7 Ave', // Favorite station 2
    lat: 40.749237,
    lon: -73.991066,
    capacity: 55,
  },
  {
    station_id: '3',
    name: 'Columbus Ave & W 72 St',
    lat: 40.775802,
    lon: -73.97644,
    capacity: 39,
  },
  {
    station_id: '4',
    name: 'Broadway & W 72 St',
    lat: 40.778012,
    lon: -73.982054,
    capacity: 55,
  },
  {
    station_id: '5',
    name: 'Amsterdam Ave & W 82 St',
    lat: 40.785247,
    lon: -73.97668,
    capacity: 43,
  },
];

test.describe('Demo Factory System', () => {
  test.describe('Trip Factory', () => {
    test('generates trips within date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07'); // 1 week
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      expect(trips.length).toBeGreaterThan(0);

      // All trips should be within date range (with timezone/duration tolerance)
      const tolerance = 24 * 60 * 60 * 1000; // 1 day tolerance for timezone differences
      trips.forEach((trip) => {
        expect(trip.startTime).toBeGreaterThanOrEqual(startDate.getTime() - tolerance);
        expect(trip.startTime).toBeLessThanOrEqual(endDate.getTime() + tolerance);
        expect(trip.endTime).toBeGreaterThan(trip.startTime);
      });
    });

    test('generates trips with correct structure', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      trips.forEach((trip) => {
        // Check all required fields exist
        expect(trip.id).toBeDefined();
        expect(trip.userId).toBe(userId);
        expect(trip.startTime).toBeDefined();
        expect(trip.endTime).toBeDefined();
        expect(trip.duration).toBeGreaterThan(0);
        expect(trip.startStationId).toBeDefined();
        expect(trip.startStationName).toBeDefined();
        expect(trip.endStationId).toBeDefined();
        expect(trip.endStationName).toBeDefined();
        expect(['classic', 'ebike']).toContain(trip.bikeType);
        expect(trip.distance).toBeGreaterThan(0);
        expect(trip.hasActualCoordinates).toBe(false);
        expect(trip.detailsFetched).toBe(false);

        // Start and end stations should be different
        expect(trip.startStationId).not.toBe(trip.endStationId);
      });
    });

    test('respects time window distribution', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01'); // 2 months for better distribution
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      // Count trips in each time window
      const morningRush = trips.filter((t) => {
        const hour = new Date(t.startTime).getHours();
        return hour >= 8 && hour < 10;
      });

      const eveningRush = trips.filter((t) => {
        const hour = new Date(t.startTime).getHours();
        return hour >= 17 && hour < 19;
      });

      const midday = trips.filter((t) => {
        const hour = new Date(t.startTime).getHours();
        return hour >= 12 && hour < 14;
      });

      // Morning and evening should have more trips than midday (roughly)
      expect(morningRush.length).toBeGreaterThan(midday.length * 0.5);
      expect(eveningRush.length).toBeGreaterThan(midday.length * 0.5);
    });

    test('uses favorite stations frequently', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      const favoriteStationTrips = trips.filter(
        (t) =>
          dailyCommuterPersona.tripPattern.favoriteStations.includes(t.startStationName) ||
          dailyCommuterPersona.tripPattern.favoriteStations.includes(t.endStationName)
      );

      // At least 40% of trips should involve favorite stations
      expect(favoriteStationTrips.length).toBeGreaterThan(trips.length * 0.4);
    });

    test('generates e-bikes at expected rate', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      const ebikeTrips = trips.filter((t) => t.bikeType === 'ebike');
      const ebikeRate = ebikeTrips.length / trips.length;

      // E-bike rate should be within 40% of target rate (allowing for randomness)
      const targetRate = dailyCommuterPersona.tripPattern.ebikeRate;
      expect(ebikeRate).toBeGreaterThan(targetRate * 0.6);
      expect(ebikeRate).toBeLessThan(targetRate * 1.4);
    });

    test('sorts trips chronologically', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      // Verify trips are sorted by start time (oldest first)
      for (let i = 1; i < trips.length; i++) {
        expect(trips[i].startTime).toBeGreaterThanOrEqual(trips[i - 1].startTime);
      }
    });

    test('assigns Bike Angel points occasionally', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      const tripsWithPoints = trips.filter((t) => t.angelPoints && t.angelPoints > 0);

      // Should have some trips with Bike Angel points
      expect(tripsWithPoints.length).toBeGreaterThan(0);

      // But not all trips should have points
      expect(tripsWithPoints.length).toBeLessThan(trips.length);
    });
  });

  test.describe('User Profile Factory', () => {
    test('generates valid user profile from persona', async () => {
      const profile = generateUserProfile(dailyCommuterPersona);

      expect(profile.id).toBe(dailyCommuterPersona.id);
      expect(profile.email).toBe(dailyCommuterPersona.email);
      expect(profile.firstName).toBe('Alex');
      expect(profile.lastName).toBe('Chen');
      expect(profile.phoneNumber).toBeDefined();
      expect(profile.membershipType).toBe(dailyCommuterPersona.membershipType);
    });
  });

  test.describe('Bike Angel Factory', () => {
    test('generates Bike Angel profile from config and trips', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      const bikeAngelProfile = generateBikeAngelProfile(
        userId,
        dailyCommuterPersona.bikeAngel,
        trips
      );

      expect(bikeAngelProfile.userId).toBe(userId);
      expect(bikeAngelProfile.totalPoints).toBeGreaterThanOrEqual(0);
      expect(bikeAngelProfile.currentLevel).toBeDefined();
      expect(bikeAngelProfile.currentStreak).toBeGreaterThanOrEqual(0);
      expect(bikeAngelProfile.longestStreak).toBeGreaterThanOrEqual(bikeAngelProfile.currentStreak);
      expect(Array.isArray(bikeAngelProfile.achievements)).toBe(true);
    });

    test('uses config values correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');
      const userId = 'test-user-001';

      const trips = generateTrips(
        userId,
        dailyCommuterPersona.tripPattern,
        startDate,
        endDate,
        mockStations
      );

      const bikeAngelProfile = generateBikeAngelProfile(
        userId,
        dailyCommuterPersona.bikeAngel,
        trips
      );

      // Should use config values
      expect(bikeAngelProfile.totalPoints).toBe(dailyCommuterPersona.bikeAngel.totalPoints);
      expect(bikeAngelProfile.currentLevel).toBe(dailyCommuterPersona.bikeAngel.currentLevel);
    });
  });
});
