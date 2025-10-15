import { test, expect } from '@playwright/test';
import { useAppStore } from '@/lib/store';
import type { StationWithStatus, RouteInfo, CitibikeUser } from '@/lib/types';

/**
 * Zustand Store Tests
 * Tests for the application state management including:
 * - State initialization and defaults
 * - Action mutations (immutability)
 * - Complex operations (route management, favorites)
 * - Partial state merges (sync state, cache)
 * - Selector functions
 * - Edge cases and error scenarios
 */

test.describe('Zustand App Store', () => {
  // Reset store before each test to isolate state
  test.beforeEach(() => {
    useAppStore.setState({
      startStation: null,
      endStation: null,
      waypoints: [],
      route: null,
      hoveredStation: null,
      selectedStation: null,
      mapBounds: null,
      mapCenter: null,
      mapZoom: null,
      showVisibleOnly: false,
      favoriteStations: [],
      savedRoutes: [],
      citibikeUser: null,
      syncState: {
        lastSyncTimestamp: null,
        syncStatus: 'idle',
        totalTrips: 0,
      },
      bikeAngelCache: {
        data: null,
        lastFetched: null,
        error: null,
      },
      distanceUnit: 'miles',
      showBikeAngelRewards: true,
    });
  });

  // Helper to create mock stations
  const createMockStation = (overrides: Partial<StationWithStatus> = {}): StationWithStatus => ({
    station_id: 'station-1',
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
    rental_uris: { android: 'https://app.android', ios: 'https://app.ios' },
    num_bikes_available: 10,
    num_ebikes_available: 5,
    num_docks_available: 25,
    is_renting: true,
    is_installed: true,
    ...overrides,
  });

  const createMockRoute = (overrides: Partial<RouteInfo> = {}): RouteInfo => ({
    distance: 1000,
    duration: 300,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-73.9818, 40.7407],
        [-73.9751, 40.7489],
      ],
    },
    ...overrides,
  });

  test.describe('State Initialization', () => {
    test('should have correct default values', () => {
      const state = useAppStore.getState();

      expect(state.startStation).toBeNull();
      expect(state.endStation).toBeNull();
      expect(state.waypoints).toEqual([]);
      expect(state.route).toBeNull();
      expect(state.hoveredStation).toBeNull();
      expect(state.selectedStation).toBeNull();
      expect(state.mapBounds).toBeNull();
      expect(state.mapCenter).toBeNull();
      expect(state.mapZoom).toBeNull();
      expect(state.showVisibleOnly).toBe(false);
      expect(state.favoriteStations).toEqual([]);
      expect(state.savedRoutes).toEqual([]);
      expect(state.citibikeUser).toBeNull();
      expect(state.distanceUnit).toBe('miles');
      expect(state.showBikeAngelRewards).toBe(true);
    });

    test('should have valid default sync state', () => {
      const state = useAppStore.getState();

      expect(state.syncState.lastSyncTimestamp).toBeNull();
      expect(state.syncState.syncStatus).toBe('idle');
      expect(state.syncState.totalTrips).toBe(0);
    });

    test('should have valid default bike angel cache', () => {
      const state = useAppStore.getState();

      expect(state.bikeAngelCache.data).toBeNull();
      expect(state.bikeAngelCache.lastFetched).toBeNull();
      expect(state.bikeAngelCache.error).toBeNull();
    });

    test('should have default currentCity set', () => {
      const state = useAppStore.getState();
      expect(state.currentCity).toBeDefined();
      expect(typeof state.currentCity).toBe('string');
      expect(state.currentCity.length).toBeGreaterThan(0);
    });
  });

  test.describe('Station Selection', () => {
    test('should set start station', () => {
      const store = useAppStore.getState();
      const station = createMockStation();

      store.setStartStation(station);
      expect(useAppStore.getState().startStation).toEqual(station);
    });

    test('should set end station', () => {
      const store = useAppStore.getState();
      const station = createMockStation({ station_id: 'station-2' });

      store.setEndStation(station);
      expect(useAppStore.getState().endStation).toEqual(station);
    });

    test('should handle null station assignment', () => {
      const store = useAppStore.getState();
      const station = createMockStation();

      store.setStartStation(station);
      store.setStartStation(null);
      expect(useAppStore.getState().startStation).toBeNull();
    });

    test('should set selected station', () => {
      const store = useAppStore.getState();
      store.setSelectedStation('station-123');
      expect(useAppStore.getState().selectedStation).toBe('station-123');
    });

    test('should set hovered station', () => {
      const store = useAppStore.getState();
      store.setHoveredStation('station-456');
      expect(useAppStore.getState().hoveredStation).toBe('station-456');
    });
  });

  test.describe('Route Management', () => {
    test('should set route', () => {
      const store = useAppStore.getState();
      const route = createMockRoute();

      store.setRoute(route);
      expect(useAppStore.getState().route).toEqual(route);
    });

    test('clearRoute should reset all route-related fields', () => {
      const store = useAppStore.getState();
      const station = createMockStation();
      const route = createMockRoute();

      store.setStartStation(station);
      store.setEndStation(station);
      store.setRoute(route);
      store.addWaypoint(station);

      store.clearRoute();

      const state = useAppStore.getState();
      expect(state.startStation).toBeNull();
      expect(state.endStation).toBeNull();
      expect(state.route).toBeNull();
      expect(state.waypoints).toEqual([]);
    });

    test('should add waypoint', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const waypoint1 = createMockStation({ station_id: 'way-1' });
      const waypoint2 = createMockStation({ station_id: 'way-2' });

      store.addWaypoint(waypoint1);
      expect(useAppStore.getState().waypoints).toHaveLength(1);

      store.addWaypoint(waypoint2);
      expect(useAppStore.getState().waypoints).toHaveLength(2);
      expect(useAppStore.getState().waypoints[1]).toEqual(waypoint2);
    });

    test('should remove waypoint by index', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const way1 = createMockStation({ station_id: 'way-1' });
      const way2 = createMockStation({ station_id: 'way-2' });
      const way3 = createMockStation({ station_id: 'way-3' });

      store.addWaypoint(way1);
      store.addWaypoint(way2);
      store.addWaypoint(way3);

      store.removeWaypoint(1);

      const waypoints = useAppStore.getState().waypoints;
      expect(waypoints).toHaveLength(2);
      expect(waypoints[0].station_id).toBe('way-1');
      expect(waypoints[1].station_id).toBe('way-3');
    });

    test('should reorder waypoints', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const way1 = createMockStation({ station_id: 'way-1' });
      const way2 = createMockStation({ station_id: 'way-2' });
      const way3 = createMockStation({ station_id: 'way-3' });

      store.addWaypoint(way1);
      store.addWaypoint(way2);
      store.addWaypoint(way3);

      store.reorderWaypoints(0, 2);

      const waypoints = useAppStore.getState().waypoints;
      expect(waypoints[0].station_id).toBe('way-2');
      expect(waypoints[1].station_id).toBe('way-3');
      expect(waypoints[2].station_id).toBe('way-1');
    });

    test('should clear waypoints', () => {
      const store = useAppStore.getState();
      store.addWaypoint(createMockStation());
      store.clearWaypoints();
      expect(useAppStore.getState().waypoints).toEqual([]);
    });
  });

  test.describe('Favorites Management', () => {
    test('should toggle favorite on', () => {
      const store = useAppStore.getState();
      store.toggleFavorite('station-1');
      expect(useAppStore.getState().favoriteStations).toContain('station-1');
    });

    test('should toggle favorite off', () => {
      const store = useAppStore.getState();
      store.toggleFavorite('station-1');
      store.toggleFavorite('station-1');
      expect(useAppStore.getState().favoriteStations).not.toContain('station-1');
    });

    test('should not add duplicate favorites', () => {
      const store = useAppStore.getState();
      store.toggleFavorite('station-1');
      store.toggleFavorite('station-1');
      store.toggleFavorite('station-1');

      const favorites = useAppStore.getState().favoriteStations;
      expect(favorites).toHaveLength(1);
      expect(favorites).toContain('station-1');
    });

    test('isFavorite should return correct boolean', () => {
      const store = useAppStore.getState();
      store.toggleFavorite('station-fav');

      expect(store.isFavorite('station-fav')).toBe(true);
      expect(store.isFavorite('station-not-fav')).toBe(false);
    });

    test('should handle multiple favorites', () => {
      const store = useAppStore.getState();
      store.toggleFavorite('station-1');
      store.toggleFavorite('station-2');
      store.toggleFavorite('station-3');

      const favorites = useAppStore.getState().favoriteStations;
      expect(favorites).toHaveLength(3);
      expect(store.isFavorite('station-2')).toBe(true);
    });
  });

  test.describe('Saved Routes', () => {
    test('should save route with required fields', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });
      const route = createMockRoute();

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(route);

      store.saveRoute('My Route', 'fastest');

      const savedRoutes = useAppStore.getState().savedRoutes;
      expect(savedRoutes).toHaveLength(1);
      expect(savedRoutes[0]).toHaveProperty('id');
      expect(savedRoutes[0].name).toBe('My Route');
      expect(savedRoutes[0].routeProfile).toBe('fastest');
      expect(savedRoutes[0].startStationId).toBe('start');
      expect(savedRoutes[0].endStationId).toBe('end');
      expect(savedRoutes[0].createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('should not save route without required stations', () => {
      const store = useAppStore.getState();
      store.clearRoute();
      store.setRoute(createMockRoute());

      store.saveRoute('Invalid Route', 'fastest');

      expect(useAppStore.getState().savedRoutes).toHaveLength(0);
    });

    test('should enforce max 20 saved routes', () => {
      const store = useAppStore.getState();
      const station1 = createMockStation({ station_id: 'start' });
      const station2 = createMockStation({ station_id: 'end' });

      store.setStartStation(station1);
      store.setEndStation(station2);
      store.setRoute(createMockRoute());

      for (let i = 0; i < 25; i++) {
        store.saveRoute(`Route ${i}`, 'fastest');
      }

      const savedRoutes = useAppStore.getState().savedRoutes;
      expect(savedRoutes).toHaveLength(20);
    });

    test('should include waypoints in saved route', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });
      const waypoint = createMockStation({ station_id: 'way' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());
      store.addWaypoint(waypoint);

      store.saveRoute('Route with Waypoint', 'scenic');

      const savedRoutes = useAppStore.getState().savedRoutes;
      expect(savedRoutes[0].waypointIds).toEqual(['way']);
    });

    test('should generate unique route IDs', () => {
      const store = useAppStore.getState();
      const station1 = createMockStation({ station_id: 'start' });
      const station2 = createMockStation({ station_id: 'end' });

      store.setStartStation(station1);
      store.setEndStation(station2);
      store.setRoute(createMockRoute());

      store.saveRoute('Route 1', 'fastest');
      store.saveRoute('Route 2', 'safest');

      const routes = useAppStore.getState().savedRoutes;
      expect(routes[0].id).not.toBe(routes[1].id);
    });

    test('should load route and update stations', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });
      const waypoint = createMockStation({ station_id: 'way' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());
      store.addWaypoint(waypoint);

      store.saveRoute('Test Route', 'fastest');

      // Clear and reload
      store.clearRoute();
      const routeId = useAppStore.getState().savedRoutes[0].id;
      store.loadRoute(routeId, [startStation, endStation, waypoint]);

      const state = useAppStore.getState();
      expect(state.startStation?.station_id).toBe('start');
      expect(state.endStation?.station_id).toBe('end');
      expect(state.waypoints).toHaveLength(1);
      expect(state.waypoints[0].station_id).toBe('way');
    });

    test('should update lastUsed on route load', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());

      store.saveRoute('Test Route', 'fastest');
      const routeId = useAppStore.getState().savedRoutes[0].id;

      store.loadRoute(routeId, [startStation, endStation]);

      const savedRoute = useAppStore.getState().savedRoutes[0];
      expect(savedRoute.lastUsed).toBeLessThanOrEqual(Date.now());
      expect(savedRoute.lastUsed).toBeGreaterThan(Date.now() - 1000);
    });

    test('should delete route', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start-delete' });
      const endStation = createMockStation({ station_id: 'end-delete' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());

      // Get current count before saving
      const routesBefore = useAppStore.getState().savedRoutes.length;
      store.saveRoute('Route to Delete', 'fastest');
      const savedRoutes = useAppStore.getState().savedRoutes;
      expect(savedRoutes.length).toBe(routesBefore + 1);

      // Delete the route we just added
      const routeId = savedRoutes[0].id;
      store.deleteRoute(routeId);

      expect(useAppStore.getState().savedRoutes).toHaveLength(routesBefore);
    });

    test('should not load non-existent route', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const station = createMockStation();
      store.loadRoute('non-existent-id', [station]);

      const state = useAppStore.getState();
      expect(state.startStation).toBeNull();
      expect(state.endStation).toBeNull();
    });

    test('should filter out missing waypoints on load', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });
      const waypoint = createMockStation({ station_id: 'way' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());
      store.addWaypoint(waypoint);

      store.saveRoute('Test Route', 'fastest');
      store.clearRoute();

      const routeId = useAppStore.getState().savedRoutes[0].id;
      // Load with only start and end, not waypoint
      store.loadRoute(routeId, [startStation, endStation]);

      expect(useAppStore.getState().waypoints).toHaveLength(0);
    });
  });

  test.describe('Map State', () => {
    test('should set map bounds', () => {
      const store = useAppStore.getState();
      const bounds = { north: 40.8, south: 40.7, east: -73.9, west: -74.0 };

      store.setMapBounds(bounds);
      expect(useAppStore.getState().mapBounds).toEqual(bounds);
    });

    test('should set map center', () => {
      const store = useAppStore.getState();
      const center = { lat: 40.7407, lon: -73.9818 };

      store.setMapCenter(center);
      expect(useAppStore.getState().mapCenter).toEqual(center);
    });

    test('should set map zoom', () => {
      const store = useAppStore.getState();
      store.setMapZoom(14);
      expect(useAppStore.getState().mapZoom).toBe(14);
    });

    test('should set show visible only', () => {
      const store = useAppStore.getState();
      store.setShowVisibleOnly(true);
      expect(useAppStore.getState().showVisibleOnly).toBe(true);

      store.setShowVisibleOnly(false);
      expect(useAppStore.getState().showVisibleOnly).toBe(false);
    });
  });

  test.describe('User Data', () => {
    test('should set citibike user', () => {
      const store = useAppStore.getState();
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'annual',
      };

      store.setCitibikeUser(user);
      expect(useAppStore.getState().citibikeUser).toEqual(user);
    });

    test('should set sync state with merge', () => {
      const store = useAppStore.getState();

      store.setSyncState({ syncStatus: 'syncing' });
      expect(useAppStore.getState().syncState.syncStatus).toBe('syncing');
      expect(useAppStore.getState().syncState.lastSyncTimestamp).toBeNull();

      const now = Date.now();
      store.setSyncState({
        lastSyncTimestamp: new Date(now),
        syncStatus: 'idle',
        totalTrips: 42,
      });

      const state = useAppStore.getState().syncState;
      expect(state.syncStatus).toBe('idle');
      expect(state.totalTrips).toBe(42);
      expect(state.lastSyncTimestamp).toBeDefined();
    });

    test('should set bike angel cache with merge', () => {
      const store = useAppStore.getState();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.setBikeAngelCache({ data: { totalPoints: 100 } as any });
      expect(useAppStore.getState().bikeAngelCache.data).toBeDefined();
      expect(useAppStore.getState().bikeAngelCache.lastFetched).toBeNull();

      store.setBikeAngelCache({ lastFetched: Date.now() });
      const cache = useAppStore.getState().bikeAngelCache;
      expect(cache.data).toBeDefined();
      expect(cache.lastFetched).toBeDefined();
    });

    test('should set distance unit', () => {
      const store = useAppStore.getState();

      store.setDistanceUnit('km');
      expect(useAppStore.getState().distanceUnit).toBe('km');

      store.setDistanceUnit('miles');
      expect(useAppStore.getState().distanceUnit).toBe('miles');
    });

    test('should set show bike angel rewards', () => {
      const store = useAppStore.getState();

      store.setShowBikeAngelRewards(false);
      expect(useAppStore.getState().showBikeAngelRewards).toBe(false);

      store.setShowBikeAngelRewards(true);
      expect(useAppStore.getState().showBikeAngelRewards).toBe(true);
    });
  });

  test.describe('City Management', () => {
    test('should set current city', () => {
      const store = useAppStore.getState();
      store.setCurrentCity('dc');
      expect(useAppStore.getState().currentCity).toBe('dc');
    });

    test('should clear route when switching cities', () => {
      const store = useAppStore.getState();
      const station = createMockStation();
      const route = createMockRoute();

      store.setStartStation(station);
      store.setEndStation(station);
      store.setRoute(route);
      store.addWaypoint(station);

      store.setCurrentCity('boston');

      const state = useAppStore.getState();
      expect(state.currentCity).toBe('boston');
      expect(state.startStation).toBeNull();
      expect(state.endStation).toBeNull();
      expect(state.route).toBeNull();
      expect(state.waypoints).toEqual([]);
    });

    test('should not clear route if city unchanged', () => {
      const store = useAppStore.getState();
      const currentCity = store.currentCity;
      const station = createMockStation();
      const route = createMockRoute();

      store.setStartStation(station);
      store.setRoute(route);

      store.setCurrentCity(currentCity);

      const state = useAppStore.getState();
      expect(state.startStation).toEqual(station);
      expect(state.route).toEqual(route);
    });
  });

  test.describe('Immutability', () => {
    test('adding waypoint should not mutate original array', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      const originalWaypoints = useAppStore.getState().waypoints;
      const newWaypoint = createMockStation();

      store.addWaypoint(newWaypoint);

      expect(originalWaypoints).toHaveLength(0);
      expect(useAppStore.getState().waypoints).toHaveLength(1);
    });

    test('toggling favorite should not mutate original array', () => {
      const store = useAppStore.getState();
      const originalFavorites = [...useAppStore.getState().favoriteStations];

      store.toggleFavorite('station-new');

      expect(originalFavorites).toEqual(
        useAppStore.getState().favoriteStations.filter((s) => s !== 'station-new')
      );
    });

    test('removing waypoint should not mutate original array', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      store.addWaypoint(createMockStation({ station_id: 'way-1' }));
      store.addWaypoint(createMockStation({ station_id: 'way-2' }));

      const originalWaypoints = [...useAppStore.getState().waypoints];
      store.removeWaypoint(0);

      expect(originalWaypoints).toHaveLength(2);
      expect(useAppStore.getState().waypoints).toHaveLength(1);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle removing non-existent waypoint', () => {
      const store = useAppStore.getState();
      store.clearRoute();

      expect(() => store.removeWaypoint(0)).not.toThrow();
      expect(useAppStore.getState().waypoints).toEqual([]);
    });

    test('should handle reordering with invalid indices', () => {
      const store = useAppStore.getState();
      store.clearRoute();
      store.addWaypoint(createMockStation({ station_id: 'way-1' }));
      store.addWaypoint(createMockStation({ station_id: 'way-2' }));

      // Reorder with valid indices
      store.reorderWaypoints(0, 1);
      const waypoints = useAppStore.getState().waypoints;
      expect(waypoints).toHaveLength(2);
      expect(waypoints[0].station_id).toBe('way-2');
      expect(waypoints[1].station_id).toBe('way-1');
    });

    test('should handle setting null user', () => {
      const store = useAppStore.getState();
      const user: CitibikeUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'annual',
      };

      store.setCitibikeUser(user);
      store.setCitibikeUser(null);
      expect(useAppStore.getState().citibikeUser).toBeNull();
    });

    test('should handle empty favorites check', () => {
      const store = useAppStore.getState();
      expect(store.isFavorite('non-existent')).toBe(false);
    });

    test('should handle favorite check on empty state', () => {
      const store = useAppStore.getState();
      const state = store.isFavorite('any-station');
      expect(state).toBe(false);
    });

    test('should handle multiple route clears', () => {
      const store = useAppStore.getState();
      const station = createMockStation();

      store.setStartStation(station);
      store.clearRoute();
      store.clearRoute();

      const state = useAppStore.getState();
      expect(state.route).toBeNull();
      expect(state.startStation).toBeNull();
    });
  });

  test.describe('Type Safety', () => {
    test('should have strongly typed distance unit', () => {
      const store = useAppStore.getState();

      store.setDistanceUnit('km');
      const unit1: 'miles' | 'km' = useAppStore.getState().distanceUnit;
      expect(['miles', 'km']).toContain(unit1);

      store.setDistanceUnit('miles');
      const unit2: 'miles' | 'km' = useAppStore.getState().distanceUnit;
      expect(['miles', 'km']).toContain(unit2);
    });

    test('should have strongly typed route profile', () => {
      const store = useAppStore.getState();
      const startStation = createMockStation({ station_id: 'start' });
      const endStation = createMockStation({ station_id: 'end' });

      store.setStartStation(startStation);
      store.setEndStation(endStation);
      store.setRoute(createMockRoute());

      const profiles: Array<'fastest' | 'safest' | 'scenic' | 'insane'> = [
        'fastest',
        'safest',
        'scenic',
        'insane',
      ];

      for (const profile of profiles) {
        store.saveRoute(`Route ${profile}`, profile);
        const savedRoute = useAppStore.getState().savedRoutes[0];
        expect(profiles).toContain(savedRoute.routeProfile);
      }
    });

    test('should have coordinates in correct format', () => {
      const store = useAppStore.getState();
      const center = { lat: 40.7407, lon: -73.9818 };

      store.setMapCenter(center);
      const mapCenter = useAppStore.getState().mapCenter;

      expect(mapCenter?.lat).toBeGreaterThanOrEqual(-90);
      expect(mapCenter?.lat).toBeLessThanOrEqual(90);
      expect(mapCenter?.lon).toBeGreaterThanOrEqual(-180);
      expect(mapCenter?.lon).toBeLessThanOrEqual(180);
    });
  });
});
