/**
 * Cloud Sync Helpers
 * Functions for backing up and restoring trip data to/from Supabase
 */

import { supabase } from './client';
import { db } from '../db';
import type { Trip as LocalTrip } from '../db/schema';
import type { Database } from './types';

/**
 * Backup all trips to cloud
 * Returns number of trips backed up
 */
export async function backupTripsToCloud(userId: string): Promise<number> {
  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get all local trips
  const localTrips = await db.trips.where({ userId }).toArray();

  if (localTrips.length === 0) {
    return 0;
  }

  // Transform to Supabase format
  const tripsToBackup = localTrips.map((trip) => {
    // Normalize distance - handle both number and object formats
    let distance: number | null = null;
    if (trip.distance !== undefined && trip.distance !== null) {
      if (typeof trip.distance === 'number') {
        distance = trip.distance;
      } else if (typeof trip.distance === 'object' && 'value' in trip.distance) {
        // Handle {"unit":"miles","value":0.29} format - convert to meters
        distance = Math.round((trip.distance as { value: number }).value * 1609.34);
      }
    }

    return {
      id: trip.id,
      user_id: user.id,
      start_time: new Date(trip.startTime).toISOString(),
      end_time: new Date(trip.endTime).toISOString(),
      duration: trip.duration,
      start_station_id: trip.startStationId,
      start_station_name: trip.startStationName,
      start_lat: trip.startLat,
      start_lon: trip.startLon,
      end_station_id: trip.endStationId,
      end_station_name: trip.endStationName,
      end_lat: trip.endLat,
      end_lon: trip.endLon,
      bike_type: trip.bikeType,
      distance,
      angel_points: trip.angelPoints ?? null,
      has_actual_coordinates: trip.hasActualCoordinates ?? null,
    };
  });

  // Upsert to Supabase (insert or update)
  // @ts-expect-error - Supabase types are complex, runtime types are correct
  const { error } = await supabase.from('trips').upsert(tripsToBackup, {
    onConflict: 'id', // Use trip ID as unique key
  });

  if (error) {
    console.error('Backup error:', error);
    throw new Error(`Failed to backup trips: ${error.message}`);
  }

  // Update profile with Citibike user ID
  await supabase
    .from('profiles')
    // @ts-expect-error - Supabase types are complex, runtime types are correct
    .upsert({
      id: user.id,
      email: user.email ?? null,
      citibike_user_id: userId,
    })
    .select();

  return tripsToBackup.length;
}

/**
 * Restore trips from cloud
 * Returns number of trips restored
 */
export async function restoreTripsFromCloud(userId: string): Promise<number> {
  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch all trips from Supabase
  const { data: cloudTrips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .returns<Database['public']['Tables']['trips']['Row'][]>();

  if (error) {
    console.error('Restore error:', error);
    throw new Error(`Failed to restore trips: ${error.message}`);
  }

  if (!cloudTrips || cloudTrips.length === 0) {
    return 0;
  }

  // Transform to local format
  const tripsToRestore: LocalTrip[] = cloudTrips.map((trip) => ({
    id: trip.id,
    userId,
    startTime: new Date(trip.start_time).getTime(),
    endTime: new Date(trip.end_time).getTime(),
    duration: trip.duration,
    startStationId: trip.start_station_id,
    startStationName: trip.start_station_name,
    startLat: trip.start_lat,
    startLon: trip.start_lon,
    endStationId: trip.end_station_id,
    endStationName: trip.end_station_name,
    endLat: trip.end_lat,
    endLon: trip.end_lon,
    bikeType: trip.bike_type,
    distance: trip.distance ?? undefined,
    angelPoints: trip.angel_points ?? undefined,
    hasActualCoordinates: trip.has_actual_coordinates ?? undefined,
    // If trip has actual coordinates, mark as details fetched
    detailsFetched: trip.has_actual_coordinates ?? undefined,
    detailsFetchedAt: trip.has_actual_coordinates ? Date.now() : undefined,
  }));

  // Bulk upsert to IndexedDB
  await db.trips.bulkPut(tripsToRestore);

  return tripsToRestore.length;
}

/**
 * Get cloud trip count
 */
export async function getCloudTripCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) {
    console.error('Count error:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get last backup timestamp
 */
export async function getLastBackupTime(): Promise<Date | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('trips')
    .select('synced_at')
    .eq('user_id', user.id)
    .order('synced_at', { ascending: false })
    .limit(1)
    .single<{ synced_at: string }>();

  if (error || !data) {
    return null;
  }

  return new Date(data.synced_at);
}
