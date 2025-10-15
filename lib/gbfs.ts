// GBFS Data Fetching Utilities
import type {
  GBFSResponse,
  Station,
  StationInformation,
  StationStatus,
  StationStatusData,
  StationWithStatus,
  SystemInformation,
  SystemRegions,
} from './types';
import { buildCityGbfsUrl, DEFAULT_CITY_ID } from '@/config/cities';

// ============================================
// GBFS Endpoints
// ============================================
export const GBFS_ENDPOINTS = {
  DISCOVERY: '/gbfs.json',
  SYSTEM_INFO: '/system_information.json',
  STATION_INFO: '/station_information.json',
  STATION_STATUS: '/station_status.json',
  SYSTEM_REGIONS: '/system_regions.json',
  SYSTEM_ALERTS: '/system_alerts.json',
  VEHICLE_TYPES: '/vehicle_types.json',
  PRICING_PLANS: '/system_pricing_plans.json',
} as const;

/**
 * Fetches station information from the GBFS API
 */
export async function fetchStationInformation(
  cityId: string = DEFAULT_CITY_ID
): Promise<Station[]> {
  const url = buildCityGbfsUrl(cityId, GBFS_ENDPOINTS.STATION_INFO);
  const response = await fetch(url, {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch station information: ${response.statusText}`);
  }

  const data: GBFSResponse<StationInformation> = await response.json();
  return data.data.stations;
}

/**
 * Fetches real-time station status from the GBFS API
 */
export async function fetchStationStatus(
  cityId: string = DEFAULT_CITY_ID
): Promise<StationStatus[]> {
  const url = buildCityGbfsUrl(cityId, GBFS_ENDPOINTS.STATION_STATUS);
  const response = await fetch(url, {
    next: { revalidate: 30 }, // Revalidate every 30 seconds (more frequent for real-time data)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch station status: ${response.statusText}`);
  }

  const data: GBFSResponse<StationStatusData> = await response.json();
  return data.data.stations;
}

/**
 * Fetches system information from the GBFS API
 */
export async function fetchSystemInformation(
  cityId: string = DEFAULT_CITY_ID
): Promise<SystemInformation> {
  const url = buildCityGbfsUrl(cityId, GBFS_ENDPOINTS.SYSTEM_INFO);
  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Revalidate every hour (rarely changes)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch system information: ${response.statusText}`);
  }

  const data: GBFSResponse<SystemInformation> = await response.json();
  return data.data;
}

/**
 * Fetches system regions from the GBFS API
 */
export async function fetchSystemRegions(cityId: string = DEFAULT_CITY_ID): Promise<SystemRegions> {
  const url = buildCityGbfsUrl(cityId, GBFS_ENDPOINTS.SYSTEM_REGIONS);
  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Revalidate every hour
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch system regions: ${response.statusText}`);
  }

  const data: GBFSResponse<SystemRegions> = await response.json();
  return data.data;
}

/**
 * Merges station information with real-time status
 */
export function mergeStationData(
  stations: Station[],
  statuses: StationStatus[]
): StationWithStatus[] {
  const statusMap = new Map(statuses.map((status) => [status.station_id, status]));

  return stations.map((station) => {
    const status = statusMap.get(station.station_id);
    return {
      ...station,
      status,
      num_bikes_available: status?.num_bikes_available ?? 0,
      num_ebikes_available: status?.num_ebikes_available ?? 0,
      num_docks_available: status?.num_docks_available ?? 0,
      is_renting: status?.is_renting === 1,
      is_installed: status?.is_installed === 1,
    };
  });
}

/**
 * Calculates distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds nearest stations to a given coordinate
 */
export function findNearestStations(
  stations: StationWithStatus[],
  lat: number,
  lon: number,
  limit: number = 5
): StationWithStatus[] {
  return stations
    .map((station) => ({
      ...station,
      distance: calculateDistance(lat, lon, station.lat, station.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
