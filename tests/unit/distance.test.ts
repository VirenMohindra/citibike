import { test, expect } from '../fixtures/coverage';
import { calculateDistance, findNearestStations } from '@/lib/gbfs';
import type { StationWithStatus } from '@/lib/types';

test.describe('Distance Utilities', () => {
  test.describe('calculateDistance', () => {
    test('calculates distance between two points correctly', () => {
      // Test with known coordinates
      // Madison Square Garden to Empire State Building (~0.8 km)
      const distance = calculateDistance(
        40.7505,
        -73.9934, // MSG
        40.7484,
        -73.9857 // ESB
      );

      // Should be approximately 800 meters
      expect(distance).toBeGreaterThan(600);
      expect(distance).toBeLessThan(800);
    });

    test('returns 0 for same location', () => {
      const distance = calculateDistance(40.7505, -73.9934, 40.7505, -73.9934);
      expect(distance).toBe(0);
    });

    test('handles negative coordinates', () => {
      const distance = calculateDistance(-40.7505, -73.9934, -40.7484, -73.9857);
      expect(distance).toBeGreaterThan(0);
    });

    test('calculates long distances correctly', () => {
      // NYC to LA (~3900 km)
      const distance = calculateDistance(
        40.7128,
        -74.006, // NYC
        34.0522,
        -118.2437 // LA
      );

      // Should be approximately 3.9 million meters
      expect(distance).toBeGreaterThan(3800000);
      expect(distance).toBeLessThan(4000000);
    });

    test('handles edge cases at equator', () => {
      const distance = calculateDistance(0, 0, 0, 1);
      // 1 degree longitude at equator is ~111km
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    test('handles edge cases at poles', () => {
      const distance = calculateDistance(89.9, 0, 89.9, 1);
      // Distance should be much smaller near poles
      expect(distance).toBeLessThan(1000);
    });
  });

  test.describe('findNearestStations', () => {
    const mockStations: StationWithStatus[] = [
      {
        station_id: '1',
        name: 'Station 1',
        short_name: 'S1',
        lat: 40.7505,
        lon: -73.9934,
        region_id: '71',
        rental_methods: ['CREDITCARD', 'KEY'],
        capacity: 20,
        electric_bike_surcharge_waiver: false,
        eightd_has_key_dispenser: false,
        has_kiosk: true,
        external_id: 'ext1',
        eightd_station_services: [],
        station_type: 'classic',
        rental_uris: {
          android: 'https://example.com',
          ios: 'https://example.com',
        },
        is_installed: true,
        is_renting: true,
        num_bikes_available: 10,
        num_ebikes_available: 5,
        num_docks_available: 5,
      },
      {
        station_id: '2',
        name: 'Station 2',
        short_name: 'S2',
        lat: 40.7484,
        lon: -73.9857,
        region_id: '71',
        rental_methods: ['CREDITCARD', 'KEY'],
        capacity: 15,
        electric_bike_surcharge_waiver: false,
        eightd_has_key_dispenser: false,
        has_kiosk: true,
        external_id: 'ext2',
        eightd_station_services: [],
        station_type: 'classic',
        rental_uris: {
          android: 'https://example.com',
          ios: 'https://example.com',
        },
        is_installed: true,
        is_renting: true,
        num_bikes_available: 7,
        num_ebikes_available: 3,
        num_docks_available: 5,
      },
      {
        station_id: '3',
        name: 'Station 3',
        short_name: 'S3',
        lat: 40.76,
        lon: -74.0,
        region_id: '71',
        rental_methods: ['CREDITCARD', 'KEY'],
        capacity: 25,
        electric_bike_surcharge_waiver: false,
        eightd_has_key_dispenser: false,
        has_kiosk: true,
        external_id: 'ext3',
        eightd_station_services: [],
        station_type: 'classic',
        rental_uris: {
          android: 'https://example.com',
          ios: 'https://example.com',
        },
        is_installed: true,
        is_renting: true,
        num_bikes_available: 15,
        num_ebikes_available: 8,
        num_docks_available: 2,
      },
    ];

    test('returns nearest stations in order', () => {
      const nearest = findNearestStations(
        mockStations,
        40.7505, // Same as Station 1
        -73.9934,
        3
      );

      expect(nearest).toHaveLength(3);
      expect(nearest[0].station_id).toBe('1'); // Closest (same location)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((nearest[0] as any).distance).toBe(0);
    });

    test('limits results to requested count', () => {
      const nearest = findNearestStations(mockStations, 40.7505, -73.9934, 2);
      expect(nearest).toHaveLength(2);
    });

    test('adds distance property to results', () => {
      const nearest = findNearestStations(mockStations, 40.7505, -73.9934, 3);

      nearest.forEach((station) => {
        expect(station).toHaveProperty('distance');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(typeof (station as any).distance).toBe('number');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((station as any).distance).toBeGreaterThanOrEqual(0);
      });
    });

    test('handles empty station list', () => {
      const nearest = findNearestStations([], 40.7505, -73.9934, 5);
      expect(nearest).toHaveLength(0);
    });

    test('handles request for more stations than available', () => {
      const nearest = findNearestStations(mockStations, 40.7505, -73.9934, 10);
      expect(nearest).toHaveLength(3); // Only 3 stations available
    });

    test('includes all stations regardless of installation status', () => {
      const stationsWithUninstalled = [
        ...mockStations,
        {
          ...mockStations[0],
          station_id: '4',
          is_installed: false,
          lat: 40.7505,
          lon: -73.9934,
        },
      ];

      const nearest = findNearestStations(stationsWithUninstalled, 40.7505, -73.9934, 10);
      const uninstalledStation = nearest.find((s) => s.station_id === '4');
      // findNearestStations doesn't filter by installation status
      expect(uninstalledStation).toBeDefined();
      expect(nearest).toHaveLength(4); // Should include all 4 stations
    });

    test('sorts stations by distance correctly', () => {
      const nearest = findNearestStations(mockStations, 40.7505, -73.9934, 3);

      // Verify distances are in ascending order
      for (let i = 1; i < nearest.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((nearest[i] as any).distance).toBeGreaterThanOrEqual(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (nearest[i - 1] as any).distance
        );
      }
    });
  });
});
