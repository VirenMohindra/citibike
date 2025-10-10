/**
 * Database Module
 * Central export point for all database functionality
 */

// Export database instance and types
export { db, CitibikeDB, CACHE_TTL } from './schema';
export type { UserProfile, BikeAngelProfile, Subscription, Trip, SyncMetadata } from './schema';

// Export hooks
export {
  useUserProfile,
  useBikeAngel,
  useSubscriptions,
  useTrips,
  useTripStats,
  useTripMapData,
  useTripHeatmapData,
  useStationUsage,
  useSyncStatus,
  useMonthlyEconomics,
  useBreakevenAnalysis,
} from './hooks';
export type {
  TripFilters,
  TripMapData,
  StationUsage,
  MonthlyEconomics,
  BreakevenAnalysis,
} from './hooks';

// Export sync manager
export { SyncManager, createSyncManager, needsSync } from './sync-manager';
