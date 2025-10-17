import { test, expect, describe } from '../fixtures/coverage';

/**
 * Utility Function Tests
 * Tests for pure utility functions: formatters, validators, calculators
 * Including:
 * - Distance calculations (Haversine formula)
 * - Polyline encoding/decoding
 * - Station utilities (slug generation, finding)
 * - Fuzzy search
 * - Statistics calculations
 * - Formatters (duration, money, CO2)
 */

// Import utility functions
import { haversineDistance, isWithinRadius, getRadiusForZoom } from '@/lib/utils/distance';
import { decodePolyline } from '@/lib/utils/polyline';
import {
  stationNameToSlug,
  getStationSlug,
  findStationBySlug,
  isDuplicateStationName,
} from '@/lib/station-utils';
import { fuzzySearch, highlightMatches } from '@/lib/fuzzy';
import {
  calculateTripStats,
  formatDuration,
  formatCO2,
  getAverageTripDuration,
  getAverageTripDistance,
  getTripsPerMonthAverage,
  getLongestTrip,
  getMostFrequentRoute,
} from '@/lib/stats';
import type { Trip } from '@/lib/types';
import type { StationWithStatus } from '@/lib/types';

describe('Distance Calculations', () => {
  test('haversineDistance - calculates distance between two points', () => {
    // Times Square to Central Park (approx 3.2 km)
    const distance = haversineDistance(40.758, -73.9855, 40.7829, -73.9654);
    expect(distance).toBeGreaterThan(3000);
    expect(distance).toBeLessThan(3500);
  });

  test('haversineDistance - same point returns 0', () => {
    const distance = haversineDistance(40.7589, -73.9851, 40.7589, -73.9851);
    expect(distance).toBe(0);
  });

  test('haversineDistance - works with negative coordinates', () => {
    // Sydney to Melbourne (approx 714 km)
    const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(distance).toBeGreaterThan(700000);
    expect(distance).toBeLessThan(750000);
  });

  test('isWithinRadius - point within radius', () => {
    const isWithin = isWithinRadius(40.7589, -73.9851, 40.759, -73.985, 100);
    expect(isWithin).toBe(true);
  });

  test('isWithinRadius - point outside radius', () => {
    const isWithin = isWithinRadius(40.7589, -73.9851, 40.7829, -73.9654, 100);
    expect(isWithin).toBe(false);
  });

  test('getRadiusForZoom - returns appropriate radius for zoom levels', () => {
    expect(getRadiusForZoom(10)).toBe(5000); // Far out
    expect(getRadiusForZoom(12)).toBe(3000); // Medium-far
    expect(getRadiusForZoom(13)).toBe(2000); // Medium
    expect(getRadiusForZoom(14)).toBe(1000); // Medium-close
    expect(getRadiusForZoom(15)).toBe(500); // Close
    expect(getRadiusForZoom(16)).toBe(300); // Very close
    expect(getRadiusForZoom(18)).toBe(100); // Extremely close
  });
});

describe('Polyline Decoding', () => {
  test('decodePolyline - decodes valid polyline', () => {
    // Simple polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    const coords = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(coords.length).toBeGreaterThan(0);
    expect(coords[0]).toHaveLength(2); // [lng, lat]
  });

  test('decodePolyline - empty string returns empty array', () => {
    const coords = decodePolyline('');
    expect(coords).toEqual([]);
  });

  test('decodePolyline - handles precision parameter', () => {
    const coords5 = decodePolyline('_p~iF~ps|U_ulLnnqC', 5);
    const coords6 = decodePolyline('_p~iF~ps|U_ulLnnqC', 6);
    expect(coords5).toBeDefined();
    expect(coords6).toBeDefined();
  });

  test('decodePolyline - handles invalid polyline gracefully', () => {
    const coords = decodePolyline('invalid!!!@@@');
    // Polyline decoder doesn't validate, just decodes whatever bytes it gets
    // So we just check it doesn't crash and returns an array
    expect(Array.isArray(coords)).toBe(true);
  });
});

describe('Station Utilities', () => {
  test('stationNameToSlug - converts name to slug', () => {
    expect(stationNameToSlug('W 42 St & 6 Ave')).toBe('w-42-st-6-ave');
    expect(stationNameToSlug('Clinton St & Grand St')).toBe('clinton-st-grand-st');
  });

  test('stationNameToSlug - removes ampersands', () => {
    expect(stationNameToSlug('A & B & C')).toBe('a-b-c');
  });

  test('stationNameToSlug - handles special characters', () => {
    expect(stationNameToSlug("O'Brien St @ Main")).toBe('o-brien-st-main');
  });

  test('stationNameToSlug - trims hyphens', () => {
    expect(stationNameToSlug('  Station Name  ')).toBe('station-name');
  });

  test('getStationSlug - regular station', () => {
    const station: StationWithStatus = {
      station_id: '66dbc420-1234-5678',
      name: 'Main St & 1st Ave',
      short_name: 'Main',
      lat: 40.7589,
      lon: -73.9851,
      region_id: '71',
      rental_methods: ['CREDITCARD'],
      capacity: 20,
      electric_bike_surcharge_waiver: false,
      eightd_has_key_dispenser: false,
      has_kiosk: true,
      external_id: 'ext-123',
      eightd_station_services: [],
      station_type: 'classic',
      rental_uris: {
        android: 'https://example.com/android',
        ios: 'https://example.com/ios',
      },
      num_bikes_available: 5,
      num_docks_available: 15,
      is_installed: true,
      is_renting: true,
    };
    expect(getStationSlug(station)).toBe('main-st-1st-ave');
  });

  test('getStationSlug - duplicate station name gets ID suffix', () => {
    const station: StationWithStatus = {
      station_id: '66dbc420-1234-5678',
      name: 'Clinton St & Grand St',
      short_name: 'Clinton',
      lat: 40.7589,
      lon: -73.9851,
      region_id: '71',
      rental_methods: ['CREDITCARD'],
      capacity: 20,
      electric_bike_surcharge_waiver: false,
      eightd_has_key_dispenser: false,
      has_kiosk: true,
      external_id: 'ext-123',
      eightd_station_services: [],
      station_type: 'classic',
      rental_uris: {
        android: 'https://example.com/android',
        ios: 'https://example.com/ios',
      },
      num_bikes_available: 5,
      num_docks_available: 15,
      is_installed: true,
      is_renting: true,
    };
    expect(getStationSlug(station)).toBe('clinton-st-grand-st-66dbc420');
  });

  test('isDuplicateStationName - identifies duplicates', () => {
    expect(isDuplicateStationName('Clinton St & Grand St')).toBe(true);
    expect(isDuplicateStationName('W 42 St & 6 Ave')).toBe(true);
    expect(isDuplicateStationName('Main St & 1st Ave')).toBe(false);
  });

  test('findStationBySlug - finds by UUID', () => {
    const stations: StationWithStatus[] = [
      {
        station_id: '66dbc420-1234',
        name: 'Station A',
        short_name: 'A',
        lat: 40.7589,
        lon: -73.9851,
        region_id: '71',
        rental_methods: ['CREDITCARD'],
        capacity: 20,
        electric_bike_surcharge_waiver: false,
        eightd_has_key_dispenser: false,
        has_kiosk: true,
        external_id: 'ext-123',
        eightd_station_services: [],
        station_type: 'classic',
        rental_uris: {
          android: 'https://example.com/android',
          ios: 'https://example.com/ios',
        },
        num_bikes_available: 5,
        num_docks_available: 15,
        is_installed: true,
        is_renting: true,
      },
    ];
    const found = findStationBySlug(stations, '66dbc420-1234');
    expect(found?.name).toBe('Station A');
  });

  test('findStationBySlug - finds by slug', () => {
    const stations: StationWithStatus[] = [
      {
        station_id: '66dbc420-1234',
        name: 'Main St & 1st Ave',
        short_name: 'Main',
        lat: 40.7589,
        lon: -73.9851,
        region_id: '71',
        rental_methods: ['CREDITCARD'],
        capacity: 20,
        electric_bike_surcharge_waiver: false,
        eightd_has_key_dispenser: false,
        has_kiosk: true,
        external_id: 'ext-123',
        eightd_station_services: [],
        station_type: 'classic',
        rental_uris: {
          android: 'https://example.com/android',
          ios: 'https://example.com/ios',
        },
        num_bikes_available: 5,
        num_docks_available: 15,
        is_installed: true,
        is_renting: true,
      },
    ];
    const found = findStationBySlug(stations, 'main-st-1st-ave');
    expect(found?.name).toBe('Main St & 1st Ave');
  });

  test('findStationBySlug - returns undefined if not found', () => {
    const stations: StationWithStatus[] = [];
    const found = findStationBySlug(stations, 'nonexistent');
    expect(found).toBeUndefined();
  });
});

describe('Fuzzy Search', () => {
  interface TestItem {
    id: number;
    name: string;
    city: string;
  }

  const testItems: TestItem[] = [
    { id: 1, name: 'Times Square', city: 'New York' },
    { id: 2, name: 'Central Park', city: 'New York' },
    { id: 3, name: 'Brooklyn Bridge', city: 'New York' },
    { id: 4, name: 'Golden Gate Bridge', city: 'San Francisco' },
  ];

  test('fuzzySearch - finds exact match', () => {
    const results = fuzzySearch(testItems, 'Times Square', { keys: ['name'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe('Times Square');
    expect(results[0].score).toBeGreaterThan(0.9);
  });

  test('fuzzySearch - finds partial match', () => {
    const results = fuzzySearch(testItems, 'bridge', { keys: ['name'] });
    expect(results.length).toBe(2);
    expect(results.some((r) => r.item.name.includes('Bridge'))).toBe(true);
  });

  test('fuzzySearch - handles typos', () => {
    const results = fuzzySearch(testItems, 'tims sqare', { keys: ['name'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe('Times Square');
  });

  test('fuzzySearch - empty query returns first N items', () => {
    const results = fuzzySearch(testItems, '', { keys: ['name'], limit: 2 });
    expect(results.length).toBe(2);
    expect(results[0].score).toBe(1);
  });

  test('fuzzySearch - respects limit', () => {
    const results = fuzzySearch(testItems, 'new', { keys: ['city'], limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('fuzzySearch - searches multiple keys', () => {
    const results = fuzzySearch(testItems, 'york', { keys: ['name', 'city'] });
    expect(results.length).toBe(3); // All New York items
  });

  test('fuzzySearch - respects threshold', () => {
    const results = fuzzySearch(testItems, 'zzz', { keys: ['name'], threshold: 0.8 });
    expect(results.length).toBe(0);
  });
});

describe('Highlight Matches', () => {
  test('highlightMatches - highlights single match', () => {
    const result = highlightMatches('Hello World', [[0, 4]]);
    expect(result).toContain('<span');
    expect(result).toContain('Hello');
  });

  test('highlightMatches - highlights multiple matches', () => {
    const result = highlightMatches('Hello World', [
      [0, 4],
      [6, 10],
    ]);
    expect(result.match(/<span/g)?.length).toBe(2);
  });

  test('highlightMatches - empty indices returns original text', () => {
    const result = highlightMatches('Hello World', []);
    expect(result).toBe('Hello World');
  });

  test('highlightMatches - custom highlight class', () => {
    const result = highlightMatches('Hello', [[0, 4]], 'custom-class');
    expect(result).toContain('custom-class');
  });
});

describe('Trip Statistics', () => {
  const mockTrips: Trip[] = [
    {
      id: '1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T10:20:00Z'),
      duration: 1200, // 20 minutes
      distance: 3000, // 3 km
      startLat: 40.7589,
      startLon: -73.9851,
      endLat: 40.7829,
      endLon: -73.9654,
      startStationId: 'station-1',
      startStationName: 'Times Square',
      endStationId: 'station-2',
      endStationName: 'Central Park',
      bikeType: 'classic',
      polyline: '_p~iF~ps|U_ulLnnqC',
    },
    {
      id: '2',
      startTime: new Date('2024-01-16T14:00:00Z'),
      endTime: new Date('2024-01-16T14:30:00Z'),
      duration: 1800, // 30 minutes
      distance: 5000, // 5 km
      startLat: 40.7589,
      startLon: -73.9851,
      endLat: 40.7489,
      endLon: -73.9751,
      startStationId: 'station-1',
      startStationName: 'Times Square',
      endStationId: 'station-3',
      endStationName: 'Brooklyn Bridge',
      bikeType: 'ebike',
      polyline: '_p~iF~ps|U_ulLnnqC',
    },
  ];

  test('calculateTripStats - calculates total trips', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.totalTrips).toBe(2);
  });

  test('calculateTripStats - calculates total distance', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.totalDistance).toBe(8000); // 3km + 5km
  });

  test('calculateTripStats - calculates total duration', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.totalDuration).toBe(3000); // 1200 + 1800
  });

  test('calculateTripStats - calculates CO2 saved', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.co2Saved).toBeGreaterThan(0);
    expect(stats.co2Saved).toBe(Math.round(8000 * 0.251));
  });

  test('calculateTripStats - calculates money saved', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.moneySaved).toBeGreaterThan(0);
  });

  test('calculateTripStats - identifies favorite stations', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.favoriteStartStations.length).toBeGreaterThan(0);
    expect(stats.favoriteStartStations[0].stationName).toBe('Times Square');
    expect(stats.favoriteStartStations[0].count).toBe(2);
  });

  test('calculateTripStats - tracks bike type usage', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.bikeTypeUsage.classic).toBe(1);
    expect(stats.bikeTypeUsage.ebike).toBe(1);
  });

  test('calculateTripStats - tracks riding patterns', () => {
    const stats = calculateTripStats(mockTrips);
    expect(stats.ridingPatterns.byMonth).toBeDefined();
    expect(stats.ridingPatterns.byDayOfWeek).toBeDefined();
    expect(stats.ridingPatterns.byHour).toBeDefined();
  });

  test('calculateTripStats - handles empty trips', () => {
    const stats = calculateTripStats([]);
    expect(stats.totalTrips).toBe(0);
    expect(stats.totalDistance).toBe(0);
    expect(stats.co2Saved).toBe(0);
    expect(stats.moneySaved).toBe(0);
  });

  test('calculateTripStats - filters out Unknown stations', () => {
    const tripsWithUnknown: Trip[] = [
      {
        ...mockTrips[0],
        startStationName: 'Unknown',
        endStationName: 'Unknown',
      },
    ];
    const stats = calculateTripStats(tripsWithUnknown);
    expect(stats.favoriteStartStations.length).toBe(0);
    expect(stats.favoriteEndStations.length).toBe(0);
  });
});

describe('Formatters', () => {
  test('formatDuration - formats minutes only', () => {
    expect(formatDuration(1800)).toBe('30m'); // 30 minutes
  });

  test('formatDuration - formats hours and minutes', () => {
    expect(formatDuration(3660)).toBe('1h 1m'); // 61 minutes
  });

  test('formatDuration - handles zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  test('formatDuration - rounds down minutes', () => {
    expect(formatDuration(150)).toBe('2m'); // 2.5 minutes
  });

  test('formatCO2 - formats grams', () => {
    expect(formatCO2(500)).toBe('500 g');
  });

  test('formatCO2 - formats kilograms', () => {
    expect(formatCO2(1500)).toBe('1.5 kg');
  });

  test('formatCO2 - formats tons', () => {
    expect(formatCO2(2000000)).toBe('2.00 tons');
  });

  test('formatCO2 - handles zero', () => {
    expect(formatCO2(0)).toBe('0 g');
  });

  test('formatCO2 - handles NaN', () => {
    expect(formatCO2(NaN)).toBe('0 g');
  });
});

describe('Trip Aggregation Functions', () => {
  const mockTrips: Trip[] = [
    {
      id: '1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T10:20:00Z'),
      duration: 1200,
      distance: 3000,
      startLat: 40.7589,
      startLon: -73.9851,
      endLat: 40.7829,
      endLon: -73.9654,
      startStationId: 'station-1',
      startStationName: 'Times Square',
      endStationId: 'station-2',
      endStationName: 'Central Park',
      bikeType: 'classic',
      polyline: '',
    },
    {
      id: '2',
      startTime: new Date('2024-02-16T14:00:00Z'),
      endTime: new Date('2024-02-16T14:40:00Z'),
      duration: 2400,
      distance: 5000,
      startLat: 40.7589,
      startLon: -73.9851,
      endLat: 40.7489,
      endLon: -73.9751,
      startStationId: 'station-1',
      startStationName: 'Times Square',
      endStationId: 'station-2',
      endStationName: 'Central Park',
      bikeType: 'ebike',
      polyline: '',
    },
  ];

  test('getAverageTripDuration - calculates average', () => {
    const avg = getAverageTripDuration(mockTrips);
    expect(avg).toBe(1800); // (1200 + 2400) / 2
  });

  test('getAverageTripDuration - handles empty array', () => {
    expect(getAverageTripDuration([])).toBe(0);
  });

  test('getAverageTripDistance - calculates average', () => {
    const avg = getAverageTripDistance(mockTrips);
    expect(avg).toBe(4000); // (3000 + 5000) / 2
  });

  test('getAverageTripDistance - handles empty array', () => {
    expect(getAverageTripDistance([])).toBe(0);
  });

  test('getTripsPerMonthAverage - calculates monthly average', () => {
    const avg = getTripsPerMonthAverage(mockTrips);
    expect(avg).toBe(1); // 2 trips across 2 months
  });

  test('getTripsPerMonthAverage - handles empty array', () => {
    expect(getTripsPerMonthAverage([])).toBe(0);
  });

  test('getLongestTrip - finds longest trip by distance', () => {
    const longest = getLongestTrip(mockTrips);
    expect(longest?.id).toBe('2');
    expect(longest?.distance).toBe(5000);
  });

  test('getLongestTrip - handles empty array', () => {
    expect(getLongestTrip([])).toBeNull();
  });

  test('getMostFrequentRoute - finds most common route', () => {
    const route = getMostFrequentRoute(mockTrips);
    expect(route?.startStationName).toBe('Times Square');
    expect(route?.endStationName).toBe('Central Park');
    expect(route?.count).toBe(2);
  });

  test('getMostFrequentRoute - handles empty array', () => {
    expect(getMostFrequentRoute([])).toBeNull();
  });

  test('getMostFrequentRoute - ignores Unknown stations', () => {
    const tripsWithUnknown: Trip[] = [{ ...mockTrips[0], startStationName: 'Unknown' }];
    const route = getMostFrequentRoute(tripsWithUnknown);
    expect(route).toBeNull();
  });
});
