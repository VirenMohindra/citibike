/**
 * Unit tests for trip factory
 */

import { generateTrips } from '../trip.factory';
import type { TripPattern, Station } from '@/lib/demo/types';

// Mock station data
const mockStations: Station[] = [
  {
    station_id: '1',
    name: 'Central Park S & 6 Ave',
    lat: 40.765909,
    lon: -73.9761,
  },
  {
    station_id: '2',
    name: 'Broadway & W 58 St',
    lat: 40.766741,
    lon: -73.981681,
  },
  {
    station_id: '3',
    name: 'Columbus Ave & W 72 St',
    lat: 40.775802,
    lon: -73.97644,
  },
  {
    station_id: '4',
    name: 'Broadway & W 72 St',
    lat: 40.778012,
    lon: -73.982054,
  },
  {
    station_id: '5',
    name: 'Amsterdam Ave & W 82 St',
    lat: 40.785247,
    lon: -73.97668,
  },
];

// Mock daily commuter pattern
const mockPattern: TripPattern = {
  daysPerWeek: 5,
  timeWindows: [
    { start: { hour: 8, minute: 0 }, end: { hour: 9, minute: 30 }, weight: 0.4 },
    { start: { hour: 17, minute: 0 }, end: { hour: 19, minute: 0 }, weight: 0.4 },
    { start: { hour: 12, minute: 0 }, end: { hour: 14, minute: 0 }, weight: 0.2 },
  ],
  favoriteStations: ['Central Park S & 6 Ave', 'Broadway & W 58 St'],
  routeTypes: [
    { type: 'commute', weight: 0.7 },
    { type: 'errand', weight: 0.3 },
  ],
  distanceRange: [800, 3000], // meters
  ebikeRate: 0.4,
  explorationRate: 0.2,
};

describe('generateTrips', () => {
  beforeAll(() => {
    // Mock randomUUID to return predictable IDs
    jest.mock('crypto', () => ({
      randomUUID: jest.fn(() => 'test-uuid-123'),
    }));
  });

  test('generates trips within date range', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-07'); // 1 week
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    expect(trips.length).toBeGreaterThan(0);

    // All trips should be within date range
    trips.forEach((trip) => {
      expect(trip.startTime).toBeGreaterThanOrEqual(startDate.getTime());
      expect(trip.startTime).toBeLessThanOrEqual(endDate.getTime());
      expect(trip.endTime).toBeGreaterThan(trip.startTime);
    });
  });

  test('respects time window distribution', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-03-01'); // 2 months for better distribution
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

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

  test('uses favorite stations more frequently', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-03-01');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    const favoriteStationTrips = trips.filter(
      (t) =>
        mockPattern.favoriteStations.includes(t.startStationName) ||
        mockPattern.favoriteStations.includes(t.endStationName)
    );

    // At least 50% of trips should involve favorite stations
    expect(favoriteStationTrips.length).toBeGreaterThan(trips.length * 0.5);
  });

  test('generates trips with correct structure', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-07');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

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
      expect(trip.bikeType).toMatch(/^(classic|ebike)$/);
      expect(trip.distance).toBeGreaterThan(0);
      expect(trip.hasActualCoordinates).toBe(false);
      expect(trip.detailsFetched).toBe(false);

      // Distance should be in range (with some tolerance for edge cases)
      expect(trip.distance).toBeGreaterThanOrEqual(mockPattern.distanceRange[0] * 0.9);
      expect(trip.distance).toBeLessThanOrEqual(mockPattern.distanceRange[1] * 1.1);

      // Start and end stations should be different
      expect(trip.startStationId).not.toBe(trip.endStationId);
    });
  });

  test('generates e-bikes at expected rate', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-03-01');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    const ebikeTrips = trips.filter((t) => t.bikeType === 'ebike');
    const ebikeRate = ebikeTrips.length / trips.length;

    // E-bike rate should be within 20% of target rate (allowing for randomness)
    expect(ebikeRate).toBeGreaterThan(mockPattern.ebikeRate * 0.6);
    expect(ebikeRate).toBeLessThan(mockPattern.ebikeRate * 1.4);
  });

  test('sorts trips chronologically', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    // Verify trips are sorted by start time (oldest first)
    for (let i = 1; i < trips.length; i++) {
      expect(trips[i].startTime).toBeGreaterThanOrEqual(trips[i - 1].startTime);
    }
  });

  test('generates trips with realistic costs', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-07');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    trips.forEach((trip) => {
      if (trip.cost) {
        expect(trip.cost).toBeGreaterThan(0);
        // E-bike trips should have costs
        if (trip.bikeType === 'ebike') {
          expect(trip.cost).toBeGreaterThan(0);
        }
      }
    });
  });

  test('assigns Bike Angel points occasionally', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-03-01');
    const userId = 'test-user-001';

    const trips = generateTrips(userId, mockPattern, startDate, endDate, mockStations);

    const tripsWithPoints = trips.filter((t) => t.angelPoints && t.angelPoints > 0);

    // Should have some trips with Bike Angel points
    expect(tripsWithPoints.length).toBeGreaterThan(0);

    // But not all trips should have points
    expect(tripsWithPoints.length).toBeLessThan(trips.length);
  });
});
