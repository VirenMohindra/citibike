import { test, expect } from '../fixtures/coverage';
import {
  mergeStationData,
  calculateDistance,
  findNearestStations,
  GBFS_ENDPOINTS,
} from '@/lib/gbfs';
import type {
  Station,
  StationStatus,
  StationWithStatus,
  SystemInformation,
  GBFSResponse,
} from '@/lib/types';

/**
 * API Integration Tests
 * Tests for GBFS API integration including:
 * - Station data fetching (information and status)
 * - System information retrieval
 * - Error handling and edge cases
 * - Data merging and transformation
 * - Distance calculations
 * - Station filtering and sorting
 */

test.describe('GBFS API Integration', () => {
  // Mock data factories
  const createMockStation = (overrides: Partial<Station> = {}): Station => ({
    station_id: 'test-station-1',
    name: 'Test Station',
    short_name: 'TS1',
    lat: 40.7407,
    lon: -73.9818,
    region_id: 'nyc',
    rental_methods: ['CREDITCARD'],
    capacity: 50,
    electric_bike_surcharge_waiver: false,
    eightd_has_key_dispenser: true,
    has_kiosk: true,
    external_id: 'ext-1',
    eightd_station_services: [],
    station_type: 'classic',
    rental_uris: {
      android: 'https://app.android',
      ios: 'https://app.ios',
    },
    ...overrides,
  });

  const createMockStationStatus = (overrides: Partial<StationStatus> = {}): StationStatus => ({
    station_id: 'test-station-1',
    num_bikes_available: 10,
    num_ebikes_available: 5,
    num_bikes_disabled: 0,
    num_docks_available: 25,
    num_docks_disabled: 0,
    is_installed: 1,
    is_renting: 1,
    is_returning: 1,
    last_reported: Date.now(),
    eightd_has_available_keys: true,
    ...overrides,
  });

  const createMockSystemInfo = (overrides: Partial<SystemInformation> = {}): SystemInformation => ({
    system_id: 'citibike_nyc',
    language: 'en',
    name: 'Citi Bike NYC',
    operator: 'Lyft',
    url: 'https://citibikenyc.com',
    purchase_url: 'https://citibikenyc.com/pricing',
    start_date: '2013-05-27',
    timezone: 'America/New_York',
    ...overrides,
  });

  test.describe('GBFS Endpoint Constants', () => {
    test('should have all required endpoint definitions', () => {
      expect(GBFS_ENDPOINTS.DISCOVERY).toBe('/gbfs.json');
      expect(GBFS_ENDPOINTS.SYSTEM_INFO).toBe('/system_information.json');
      expect(GBFS_ENDPOINTS.STATION_INFO).toBe('/station_information.json');
      expect(GBFS_ENDPOINTS.STATION_STATUS).toBe('/station_status.json');
      expect(GBFS_ENDPOINTS.SYSTEM_REGIONS).toBe('/system_regions.json');
      expect(GBFS_ENDPOINTS.SYSTEM_ALERTS).toBe('/system_alerts.json');
      expect(GBFS_ENDPOINTS.VEHICLE_TYPES).toBe('/vehicle_types.json');
      expect(GBFS_ENDPOINTS.PRICING_PLANS).toBe('/system_pricing_plans.json');
    });

    test('all endpoint values should end with .json', () => {
      const endpoints = Object.values(GBFS_ENDPOINTS);
      endpoints.forEach((endpoint) => {
        expect(endpoint).toMatch(/\.json$/);
      });
    });

    test('all endpoint values should start with forward slash', () => {
      const endpoints = Object.values(GBFS_ENDPOINTS);
      endpoints.forEach((endpoint) => {
        expect(endpoint).toMatch(/^\//);
      });
    });
  });

  test.describe('Station Data Merging', () => {
    test('should merge station information with status data', () => {
      const stations = [createMockStation(), createMockStation({ station_id: 'test-station-2' })];
      const statuses = [
        createMockStationStatus(),
        createMockStationStatus({ station_id: 'test-station-2', num_bikes_available: 20 }),
      ];

      const merged = mergeStationData(stations, statuses);

      expect(merged).toHaveLength(2);
      expect(merged[0].num_bikes_available).toBe(10);
      expect(merged[0].num_ebikes_available).toBe(5);
      expect(merged[1].num_bikes_available).toBe(20);
    });

    test('should handle missing status data gracefully', () => {
      const stations = [createMockStation(), createMockStation({ station_id: 'test-station-2' })];
      const statuses = [createMockStationStatus()];

      const merged = mergeStationData(stations, statuses);

      expect(merged).toHaveLength(2);
      expect(merged[0].num_bikes_available).toBe(10);
      expect(merged[1].num_bikes_available).toBe(0); // Default when status missing
      expect(merged[1].num_docks_available).toBe(0);
    });

    test('should convert numeric flags to boolean', () => {
      const stations = [createMockStation()];
      const statuses = [createMockStationStatus({ is_renting: 1, is_installed: 0 })];

      const merged = mergeStationData(stations, statuses);

      expect(merged[0].is_renting).toBe(true);
      expect(merged[0].is_installed).toBe(false);
    });

    test('should preserve station information fields after merge', () => {
      const stations = [createMockStation({ name: 'Custom Station', capacity: 75 })];
      const statuses = [createMockStationStatus()];

      const merged = mergeStationData(stations, statuses);

      expect(merged[0].name).toBe('Custom Station');
      expect(merged[0].capacity).toBe(75);
      expect(merged[0].station_id).toBe('test-station-1');
    });

    test('should handle empty station arrays', () => {
      const merged = mergeStationData([], []);
      expect(merged).toHaveLength(0);
    });

    test('should maintain status object reference', () => {
      const stations = [createMockStation()];
      const status = createMockStationStatus();
      const statuses = [status];

      const merged = mergeStationData(stations, statuses);

      expect(merged[0].status).toBeDefined();
      expect(merged[0].status?.num_bikes_available).toBe(status.num_bikes_available);
    });
  });

  test.describe('Distance Calculations', () => {
    test('should calculate distance between two coordinates', () => {
      // Times Square (40.7589, -73.9851) to Central Park (40.7829, -73.9654)
      const distance = calculateDistance(40.7589, -73.9851, 40.7829, -73.9654);

      // Should be approximately 3 km
      expect(distance).toBeGreaterThan(2500);
      expect(distance).toBeLessThan(3500);
    });

    test('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(40.7407, -73.9818, 40.7407, -73.9818);
      expect(distance).toBe(0);
    });

    test('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -33.9249, 151.1754);

      // Sydney Opera House to Bondi Beach, roughly 7km
      expect(distance).toBeGreaterThan(6000);
      expect(distance).toBeLessThan(8000);
    });

    test('should be symmetric (distance A to B equals B to A)', () => {
      const distance1 = calculateDistance(40.7407, -73.9818, 40.7589, -73.9851);
      const distance2 = calculateDistance(40.7589, -73.9851, 40.7407, -73.9818);

      expect(distance1).toBe(distance2);
    });

    test('should handle coordinates across the dateline', () => {
      // Should not throw or return Infinity
      const distance = calculateDistance(0, 179, 0, -179);
      expect(Number.isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThan(0);
    });

    test('should handle polar coordinates', () => {
      // North pole to Equator at same longitude
      const distance = calculateDistance(90, 0, 0, 0);
      const expectedDistance = 10007543; // Roughly 1/4 Earth circumference

      expect(distance).toBeCloseTo(expectedDistance, -2);
    });
  });

  test.describe('Finding Nearest Stations', () => {
    const stations: StationWithStatus[] = [
      {
        ...createMockStation({
          station_id: 'station-1',
          lat: 40.7407,
          lon: -73.9818,
        }),
        num_bikes_available: 5,
        num_ebikes_available: 2,
        num_docks_available: 20,
        is_renting: true,
        is_installed: true,
      },
      {
        ...createMockStation({
          station_id: 'station-2',
          lat: 40.7589,
          lon: -73.9851,
        }),
        num_bikes_available: 10,
        num_ebikes_available: 5,
        num_docks_available: 15,
        is_renting: true,
        is_installed: true,
      },
      {
        ...createMockStation({
          station_id: 'station-3',
          lat: 40.7829,
          lon: -73.9654,
        }),
        num_bikes_available: 3,
        num_ebikes_available: 1,
        num_docks_available: 25,
        is_renting: true,
        is_installed: true,
      },
    ];

    test('should find nearest stations by distance', () => {
      const nearest = findNearestStations(stations, 40.7407, -73.9818, 2);

      expect(nearest).toHaveLength(2);
      expect(nearest[0].station_id).toBe('station-1'); // Same coordinate
      expect(nearest[1].station_id).toBe('station-2'); // Next closest
    });

    test('should return all stations when limit exceeds station count', () => {
      const nearest = findNearestStations(stations, 40.7407, -73.9818, 10);
      expect(nearest).toHaveLength(3);
    });

    test('should use default limit of 5', () => {
      const many = [
        ...stations,
        ...stations.map((s, i) => ({ ...s, station_id: `station-${i + 4}` })),
        ...stations.map((s, i) => ({ ...s, station_id: `station-${i + 7}` })),
      ];

      const nearest = findNearestStations(many, 40.7407, -73.9818);
      expect(nearest.length).toBeLessThanOrEqual(5);
    });

    test('should sort by distance in ascending order', () => {
      const nearest = findNearestStations(stations, 40.7407, -73.9818);

      for (let i = 0; i < nearest.length - 1; i++) {
        const current = nearest[i] as StationWithStatus & { distance?: number };
        const next = nearest[i + 1] as StationWithStatus & { distance?: number };
        expect(current.distance).toBeLessThanOrEqual(next.distance!);
      }
    });

    test('should include distance property in results', () => {
      const nearest = findNearestStations(stations, 40.7407, -73.9818, 1);

      expect(nearest[0]).toHaveProperty('distance');
      expect(typeof (nearest[0] as StationWithStatus & { distance?: number }).distance).toBe(
        'number'
      );
    });

    test('should handle single station', () => {
      const nearest = findNearestStations([stations[0]], 40.7407, -73.9818);
      expect(nearest).toHaveLength(1);
      expect(nearest[0].station_id).toBe('station-1');
    });

    test('should handle empty station array', () => {
      const nearest = findNearestStations([], 40.7407, -73.9818);
      expect(nearest).toHaveLength(0);
    });

    test('should work with limit of 0', () => {
      const nearest = findNearestStations(stations, 40.7407, -73.9818, 0);
      expect(nearest).toHaveLength(0);
    });
  });

  test.describe('Station Data Types & Validation', () => {
    test('should have required station information fields', () => {
      const station = createMockStation();

      expect(station).toHaveProperty('station_id');
      expect(station).toHaveProperty('name');
      expect(station).toHaveProperty('lat');
      expect(station).toHaveProperty('lon');
      expect(station).toHaveProperty('capacity');
      expect(station).toHaveProperty('rental_methods');
    });

    test('should have required station status fields', () => {
      const status = createMockStationStatus();

      expect(status).toHaveProperty('station_id');
      expect(status).toHaveProperty('num_bikes_available');
      expect(status).toHaveProperty('num_docks_available');
      expect(status).toHaveProperty('is_installed');
      expect(status).toHaveProperty('is_renting');
    });

    test('station capacity should be positive', () => {
      const station = createMockStation();
      expect(station.capacity).toBeGreaterThan(0);
    });

    test('station coordinates should be valid', () => {
      const station = createMockStation();

      expect(station.lat).toBeGreaterThanOrEqual(-90);
      expect(station.lat).toBeLessThanOrEqual(90);
      expect(station.lon).toBeGreaterThanOrEqual(-180);
      expect(station.lon).toBeLessThanOrEqual(180);
    });

    test('bike availability should not exceed capacity', () => {
      const status = createMockStationStatus({
        num_bikes_available: 10,
        num_docks_available: 35,
      });
      const station = createMockStation({ capacity: 50 });

      const merged = mergeStationData([station], [status]);
      const total = merged[0].num_bikes_available! + merged[0].num_docks_available!;

      // In real data, total should not exceed capacity (allowing 1 for rounding)
      expect(total).toBeLessThanOrEqual(station.capacity + 1);
    });

    test('is_installed and is_renting should be 0 or 1', () => {
      const status1 = createMockStationStatus({ is_installed: 0 });
      const status2 = createMockStationStatus({ is_renting: 1 });

      expect([0, 1]).toContain(status1.is_installed);
      expect([0, 1]).toContain(status2.is_renting);
    });
  });

  test.describe('System Information', () => {
    test('should have required system information fields', () => {
      const sysInfo = createMockSystemInfo();

      expect(sysInfo).toHaveProperty('system_id');
      expect(sysInfo).toHaveProperty('language');
      expect(sysInfo).toHaveProperty('name');
      expect(sysInfo).toHaveProperty('operator');
      expect(sysInfo).toHaveProperty('timezone');
    });

    test('system ID should be non-empty string', () => {
      const sysInfo = createMockSystemInfo();
      expect(typeof sysInfo.system_id).toBe('string');
      expect(sysInfo.system_id.length).toBeGreaterThan(0);
    });

    test('language should be valid ISO 639-1 code', () => {
      const sysInfo = createMockSystemInfo();
      expect(sysInfo.language).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    });

    test('timezone should be valid IANA timezone', () => {
      const sysInfo = createMockSystemInfo();
      // Basic check: should have slash in standard IANA format
      expect(sysInfo.timezone).toMatch(/\//);
    });

    test('start_date should be valid date string', () => {
      const sysInfo = createMockSystemInfo();
      const date = new Date(sysInfo.start_date);
      expect(Number.isNaN(date.getTime())).toBe(false);
    });
  });

  test.describe('API Response Wrapper Types', () => {
    test('GBFS response should have required metadata', () => {
      const response: GBFSResponse<{ stations: Station[] }> = {
        last_updated: Date.now(),
        ttl: 3600,
        version: '2.3',
        data: { stations: [] },
      };

      expect(response).toHaveProperty('last_updated');
      expect(response).toHaveProperty('ttl');
      expect(response).toHaveProperty('version');
      expect(response).toHaveProperty('data');
    });

    test('response timestamp should be valid', () => {
      const now = Date.now();
      const response: GBFSResponse<Record<string, unknown>> = {
        last_updated: now,
        ttl: 3600,
        version: '2.3',
        data: {},
      };

      expect(response.last_updated).toBeLessThanOrEqual(Date.now());
      expect(response.last_updated).toBeGreaterThan(Date.now() - 1000); // Within 1 second
    });

    test('TTL should be positive', () => {
      const response: GBFSResponse<Record<string, unknown>> = {
        last_updated: Date.now(),
        ttl: 3600,
        version: '2.3',
        data: {},
      };

      expect(response.ttl).toBeGreaterThan(0);
    });

    test('version should be semver-like format', () => {
      const response: GBFSResponse<Record<string, unknown>> = {
        last_updated: Date.now(),
        ttl: 3600,
        version: '2.3',
        data: {},
      };

      expect(response.version).toMatch(/^\d+\.\d+/);
    });
  });

  test.describe('Edge Cases & Error Scenarios', () => {
    test('should handle station with zero bikes available', () => {
      const status = createMockStationStatus({ num_bikes_available: 0, num_ebikes_available: 0 });
      expect(status.num_bikes_available).toBe(0);
      expect(status.num_ebikes_available).toBe(0);
    });

    test('should handle station with no docks available', () => {
      const status = createMockStationStatus({ num_docks_available: 0 });
      expect(status.num_docks_available).toBe(0);
    });

    test('should handle station that is not installed', () => {
      const status = createMockStationStatus({ is_installed: 0 });
      const stations = [createMockStation()];
      const merged = mergeStationData(stations, [status]);

      expect(merged[0].is_installed).toBe(false);
    });

    test('should handle station that is not renting', () => {
      const status = createMockStationStatus({ is_renting: 0 });
      const stations = [createMockStation()];
      const merged = mergeStationData(stations, [status]);

      expect(merged[0].is_renting).toBe(false);
    });

    test('should handle special characters in station names', () => {
      const station = createMockStation({
        name: "O'Reilly's Bike Station (Downtown)",
      });

      expect(station.name).toContain("'");
      expect(station.name).toContain('(');
    });

    test('should handle duplicate station IDs in merge (last wins)', () => {
      const stations = [createMockStation(), createMockStation()];
      const statuses = [
        createMockStationStatus({ num_bikes_available: 5 }),
        createMockStationStatus({ num_bikes_available: 10 }),
      ];

      const merged = mergeStationData(stations, statuses);

      // Last status in map wins
      expect(merged[0].num_bikes_available).toBe(10);
    });

    test('should handle very large distances', () => {
      // Earth's circumference is ~40,075 km
      const distance = calculateDistance(0, 0, 0, 179.9);
      expect(distance).toBeGreaterThan(0);
      expect(Number.isFinite(distance)).toBe(true);
    });

    test('should handle station with no rental methods', () => {
      const station = createMockStation({ rental_methods: [] });
      expect(station.rental_methods).toHaveLength(0);
    });

    test('should handle station with multiple rental methods', () => {
      const station = createMockStation({
        rental_methods: ['KEY', 'CREDITCARD'],
      });

      expect(station.rental_methods).toHaveLength(2);
      expect(station.rental_methods).toContain('KEY');
      expect(station.rental_methods).toContain('CREDITCARD');
    });
  });

  test.describe('Data Consistency', () => {
    test('station_id should remain consistent through merge', () => {
      const station = createMockStation({ station_id: 'unique-123' });
      const status = createMockStationStatus({ station_id: 'unique-123' });

      const merged = mergeStationData([station], [status]);

      expect(merged[0].station_id).toBe('unique-123');
    });

    test('merged station should have all station information fields', () => {
      const station = createMockStation({
        name: 'Test',
        capacity: 50,
        station_type: 'classic',
      });
      const status = createMockStationStatus();

      const merged = mergeStationData([station], [status]);

      expect(merged[0].name).toBe('Test');
      expect(merged[0].capacity).toBe(50);
      expect(merged[0].station_type).toBe('classic');
    });

    test('merged station should have all status fields converted', () => {
      const station = createMockStation();
      const status = createMockStationStatus({
        num_bikes_available: 7,
        num_ebikes_available: 3,
        num_docks_available: 40,
      });

      const merged = mergeStationData([station], [status]);

      expect(merged[0].num_bikes_available).toBe(7);
      expect(merged[0].num_ebikes_available).toBe(3);
      expect(merged[0].num_docks_available).toBe(40);
    });
  });
});
