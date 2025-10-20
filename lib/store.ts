import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, StationWithStatus } from './types';
import { CITY_CONSTANTS } from '@/config/constants';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentCity: (() => {
        // Initialize city from cookie on server/client
        if (typeof document !== 'undefined') {
          const cookieCity = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${CITY_CONSTANTS.COOKIE_NAME}=`))
            ?.split('=')[1];
          return cookieCity || CITY_CONSTANTS.DEFAULT_CITY_ID;
        }
        return CITY_CONSTANTS.DEFAULT_CITY_ID;
      })(), // Default to NYC for backward compatibility
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
      showBikeAngelRewards: true, // Default to showing rewards
      // DEMO MODE: Initial state
      isDemoMode: false,
      demoPersona: null,
      demoBannerDismissed: false,
      loginModalShouldOpen: false,
      // SOCIAL: Initial state
      socialState: {
        followingIds: [],
        followerCount: 0,
        followingCount: 0,
        unreadActivityCount: 0,
        lastActivityCheck: null,
      },

      setCurrentCity: (cityId) => {
        const state = get();
        // Clear route data when switching cities
        if (state.currentCity !== cityId) {
          set({
            currentCity: cityId,
            startStation: null,
            endStation: null,
            waypoints: [],
            route: null,
          });

          // Also set cookie so server-side API routes can access it
          if (typeof document !== 'undefined') {
            document.cookie = `${CITY_CONSTANTS.COOKIE_NAME}=${cityId}; path=/; max-age=${CITY_CONSTANTS.COOKIE_MAX_AGE}; samesite=strict`;
          }
        }
      },

      setStartStation: (station) => set({ startStation: station }),
      setEndStation: (station) => set({ endStation: station }),

      addWaypoint: (station) =>
        set((state) => ({
          waypoints: [...state.waypoints, station],
        })),

      removeWaypoint: (index) =>
        set((state) => ({
          waypoints: state.waypoints.filter((_, i) => i !== index),
        })),

      reorderWaypoints: (fromIndex, toIndex) =>
        set((state) => {
          const newWaypoints = [...state.waypoints];
          const [removed] = newWaypoints.splice(fromIndex, 1);
          newWaypoints.splice(toIndex, 0, removed);
          return { waypoints: newWaypoints };
        }),

      clearWaypoints: () => set({ waypoints: [] }),
      setRoute: (route) => set({ route }),
      setHoveredStation: (stationId) => set({ hoveredStation: stationId }),
      setSelectedStation: (stationId) => set({ selectedStation: stationId }),
      setMapBounds: (bounds) => set({ mapBounds: bounds }),
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),
      setShowVisibleOnly: (show) => set({ showVisibleOnly: show }),

      clearRoute: () =>
        set({
          startStation: null,
          endStation: null,
          waypoints: [],
          route: null,
        }),

      toggleFavorite: (stationId) =>
        set((state) => {
          const favorites = state.favoriteStations || [];
          const index = favorites.indexOf(stationId);
          if (index === -1) {
            return { favoriteStations: [...favorites, stationId] };
          } else {
            return {
              favoriteStations: favorites.filter((id) => id !== stationId),
            };
          }
        }),

      isFavorite: (stationId) => {
        const state = get();
        return (state.favoriteStations || []).includes(stationId);
      },

      saveRoute: (name, routeProfile) => {
        const state = get();
        if (!state.startStation || !state.endStation || !state.route) return;

        const savedRoute = {
          id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          startStationId: state.startStation.station_id,
          endStationId: state.endStation.station_id,
          waypointIds: state.waypoints.map((w) => w.station_id),
          distance: state.route.distance,
          duration: state.route.duration,
          routeProfile,
          createdAt: Date.now(),
        };

        set((state) => ({
          savedRoutes: [savedRoute, ...state.savedRoutes].slice(0, 20), // Keep max 20 routes
        }));
      },

      loadRoute: (routeId, stations) => {
        const state = get();
        const savedRoute = state.savedRoutes.find((r) => r.id === routeId);
        if (!savedRoute) return;

        const startStation = stations.find((s) => s.station_id === savedRoute.startStationId);
        const endStation = stations.find((s) => s.station_id === savedRoute.endStationId);
        const waypoints = savedRoute.waypointIds
          .map((id) => stations.find((s) => s.station_id === id))
          .filter((s): s is StationWithStatus => s !== undefined);

        if (startStation && endStation) {
          set({
            startStation,
            endStation,
            waypoints,
          });

          // Update lastUsed timestamp
          set((state) => ({
            savedRoutes: state.savedRoutes.map((r) =>
              r.id === routeId ? { ...r, lastUsed: Date.now() } : r
            ),
          }));
        }
      },

      deleteRoute: (routeId) =>
        set((state) => ({
          savedRoutes: state.savedRoutes.filter((r) => r.id !== routeId),
        })),

      setCitibikeUser: (user) => set({ citibikeUser: user }),

      setSyncState: (newState) =>
        set((state) => ({
          syncState: {
            ...state.syncState,
            ...newState,
          },
        })),

      setBikeAngelCache: (cache) =>
        set((state) => ({
          bikeAngelCache: {
            ...state.bikeAngelCache,
            ...cache,
          },
        })),

      setDistanceUnit: (unit) => set({ distanceUnit: unit }),
      setShowBikeAngelRewards: (show) => set({ showBikeAngelRewards: show }),

      // DEMO MODE: Actions
      enterDemoMode: (persona, user) => {
        set({
          isDemoMode: true,
          demoPersona: persona,
          citibikeUser: user,
          demoBannerDismissed: false, // Reset banner when entering demo mode
        });
        // Set localStorage flag for analytics filtering
        if (typeof window !== 'undefined') {
          localStorage.setItem('isDemoMode', 'true');
        }
      },

      exitDemoMode: () => {
        set({
          isDemoMode: false,
          demoPersona: null,
          citibikeUser: null,
          demoBannerDismissed: false,
          loginModalShouldOpen: true, // Signal to open login modal
          syncState: {
            lastSyncTimestamp: null,
            syncStatus: 'idle',
            totalTrips: 0,
          },
        });
        // Clear localStorage demo flag and set logout flag to prevent auto-load
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isDemoMode');
          sessionStorage.setItem('citibike-logged-out', 'true');
        }
      },

      setDemoBannerDismissed: (dismissed) => set({ demoBannerDismissed: dismissed }),
      setLoginModalShouldOpen: (shouldOpen) => set({ loginModalShouldOpen: shouldOpen }),

      // SOCIAL: Actions
      setSocialState: (newState) =>
        set((state) => ({
          socialState: {
            ...state.socialState,
            ...newState,
          },
        })),

      updateFollowingIds: (followingIds) =>
        set((state) => ({
          socialState: {
            ...state.socialState,
            followingIds,
            followingCount: followingIds.length,
          },
        })),

      incrementActivityCount: () =>
        set((state) => ({
          socialState: {
            ...state.socialState,
            unreadActivityCount: state.socialState.unreadActivityCount + 1,
          },
        })),

      resetActivityCount: () =>
        set((state) => ({
          socialState: {
            ...state.socialState,
            unreadActivityCount: 0,
            lastActivityCheck: Date.now(),
          },
        })),
    }),
    {
      name: 'citibike-storage',
      partialize: (state) => ({
        currentCity: state.currentCity,
        favoriteStations: state.favoriteStations,
        savedRoutes: state.savedRoutes,
        bikeAngelCache: state.bikeAngelCache,
        citibikeUser: state.citibikeUser, // Safe to persist - sensitive token is in httpOnly cookie
        distanceUnit: state.distanceUnit,
        showBikeAngelRewards: state.showBikeAngelRewards,
        // DEMO MODE: Persist demo state (so demo persists across browser refreshes until login)
        isDemoMode: state.isDemoMode,
        demoPersona: state.demoPersona,
        // SOCIAL: Persist social state
        socialState: state.socialState,
      }),
    }
  )
);
