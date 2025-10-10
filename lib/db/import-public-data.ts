/**
 * Client-side utility to import public trip data into IndexedDB
 * Used to load aggregate data for benchmarking analysis
 */

import { db } from './schema';
import type { PublicTrip } from './schema';

export interface ImportProgress {
  status: 'idle' | 'loading' | 'importing' | 'complete' | 'error';
  message: string;
  current: number;
  total: number;
  percentComplete: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  datasetMonth?: string;
  message: string;
}

/**
 * Import public trip data from JSON file
 * Handles large datasets by batching imports
 */
export async function importPublicTripsFromJSON(
  jsonData: PublicTrip[],
  datasetMonth: string, // e.g., '2025-09'
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const BATCH_SIZE = 1000; // Import 1000 trips at a time
  let imported = 0;
  const skipped = 0; // Currently not tracking skipped records
  let errors = 0;

  try {
    onProgress?.({
      status: 'importing',
      message: 'Starting import...',
      current: 0,
      total: jsonData.length,
      percentComplete: 0,
    });

    // Process in batches to avoid memory issues
    for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
      const batch = jsonData.slice(i, Math.min(i + BATCH_SIZE, jsonData.length));

      try {
        // Add metadata to each trip
        const tripsWithMetadata = batch.map((trip) => ({
          ...trip,
          datasetMonth,
          importedAt: Date.now(),
        }));

        // Bulk insert batch
        await db.publicTrips.bulkPut(tripsWithMetadata);
        imported += batch.length;

        // Report progress
        const percentComplete = Math.round((imported / jsonData.length) * 100);
        onProgress?.({
          status: 'importing',
          message: `Importing trips... ${imported.toLocaleString()} / ${jsonData.length.toLocaleString()}`,
          current: imported,
          total: jsonData.length,
          percentComplete,
        });
      } catch (error) {
        console.error(`Error importing batch starting at ${i}:`, error);
        errors += batch.length;
      }
    }

    const result: ImportResult = {
      success: true,
      imported,
      skipped,
      errors,
      datasetMonth,
      message: `Successfully imported ${imported.toLocaleString()} public trips from ${datasetMonth}`,
    };

    onProgress?.({
      status: 'complete',
      message: result.message,
      current: imported,
      total: jsonData.length,
      percentComplete: 100,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: ImportResult = {
      success: false,
      imported,
      skipped,
      errors: jsonData.length - imported,
      message: `Import failed: ${errorMessage}`,
    };

    onProgress?.({
      status: 'error',
      message: result.message,
      current: imported,
      total: jsonData.length,
      percentComplete: Math.round((imported / jsonData.length) * 100),
    });

    return result;
  }
}

/**
 * Load and import public trip data from a JSON file URL
 */
export async function loadAndImportPublicTrips(
  fileUrl: string,
  datasetMonth: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  try {
    onProgress?.({
      status: 'loading',
      message: 'Loading JSON file...',
      current: 0,
      total: 0,
      percentComplete: 0,
    });

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.statusText}`);
    }

    const jsonData: PublicTrip[] = await response.json();

    return await importPublicTripsFromJSON(jsonData, datasetMonth, onProgress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: 0,
      message: `Failed to load file: ${errorMessage}`,
    };

    onProgress?.({
      status: 'error',
      message: result.message,
      current: 0,
      total: 0,
      percentComplete: 0,
    });

    return result;
  }
}

/**
 * Import public trip data from a File object (user upload)
 */
export async function importPublicTripsFromFile(
  file: File,
  datasetMonth: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  try {
    onProgress?.({
      status: 'loading',
      message: 'Reading file...',
      current: 0,
      total: 0,
      percentComplete: 0,
    });

    const text = await file.text();
    const jsonData: PublicTrip[] = JSON.parse(text);

    return await importPublicTripsFromJSON(jsonData, datasetMonth, onProgress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: 0,
      message: `Failed to read file: ${errorMessage}`,
    };

    onProgress?.({
      status: 'error',
      message: result.message,
      current: 0,
      total: 0,
      percentComplete: 0,
    });

    return result;
  }
}

/**
 * Get statistics about imported public trip data
 */
export async function getPublicTripStats() {
  try {
    const totalTrips = await db.publicTrips.count();

    if (totalTrips === 0) {
      return {
        totalTrips: 0,
        hasData: false,
      };
    }

    // Get dataset months
    const trips = await db.publicTrips.toArray();
    const datasetMonths = [
      ...new Set(trips.map((t) => t.datasetMonth).filter((m): m is string => Boolean(m))),
    ];

    // Get bike type breakdown
    const ebikeCount = trips.filter((t) => t.bikeType === 'electric_bike').length;
    const classicCount = trips.filter((t) => t.bikeType === 'classic_bike').length;

    // Get member type breakdown
    const memberCount = trips.filter((t) => t.memberType === 'member').length;
    const casualCount = trips.filter((t) => t.memberType === 'casual').length;

    // Calculate averages
    const avgDuration = trips.reduce((sum, t) => sum + t.duration, 0) / trips.length;
    const avgDistance = trips.reduce((sum, t) => sum + t.distance, 0) / trips.length;

    return {
      totalTrips,
      hasData: true,
      datasetMonths,
      bikeTypes: {
        ebike: ebikeCount,
        classic: classicCount,
        ebikePercent: (ebikeCount / totalTrips) * 100,
        classicPercent: (classicCount / totalTrips) * 100,
      },
      memberTypes: {
        member: memberCount,
        casual: casualCount,
        memberPercent: (memberCount / totalTrips) * 100,
        casualPercent: (casualCount / totalTrips) * 100,
      },
      averages: {
        duration: avgDuration,
        distance: avgDistance,
        durationMinutes: avgDuration / 60,
        distanceMiles: avgDistance / 1609.34,
      },
    };
  } catch (error) {
    console.error('Error getting public trip stats:', error);
    return {
      totalTrips: 0,
      hasData: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all public trip data
 */
export async function clearPublicTripData(): Promise<void> {
  await db.publicTrips.clear();
}

/**
 * Check if public data has been imported for a specific month
 */
export async function hasPublicDataForMonth(datasetMonth: string): Promise<boolean> {
  const count = await db.publicTrips.where({ datasetMonth }).count();
  return count > 0;
}
