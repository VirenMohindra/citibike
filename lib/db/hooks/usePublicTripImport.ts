/**
 * React hook for importing public trip data into IndexedDB
 */

import { useState, useCallback } from 'react';
import {
  importPublicTripsFromFile,
  getPublicTripStats,
  clearPublicTripData,
  hasPublicDataForMonth,
  type ImportProgress,
  type ImportResult,
} from '../import-public-data';

interface PublicTripStats {
  totalTrips: number;
  hasData: boolean;
  datasetMonths?: string[];
  bikeTypes?: {
    ebike: number;
    classic: number;
    ebikePercent: number;
    classicPercent: number;
  };
  memberTypes?: {
    member: number;
    casual: number;
    memberPercent: number;
    casualPercent: number;
  };
  averages?: {
    duration: number;
    distance: number;
    durationMinutes: number;
    distanceMiles: number;
  };
  error?: string;
}

interface UsePublicTripImportReturn {
  // Import state
  progress: ImportProgress | null;
  result: ImportResult | null;
  isImporting: boolean;

  // Stats
  stats: PublicTripStats | null;
  isLoadingStats: boolean;

  // Actions
  importFromFile: (file: File, datasetMonth: string) => Promise<void>;
  clearData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  checkDataExists: (datasetMonth: string) => Promise<boolean>;
}

/**
 * Hook for managing public trip data import and statistics
 */
export function usePublicTripImport(): UsePublicTripImportReturn {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState<PublicTripStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Refresh statistics
  const refreshStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const newStats = await getPublicTripStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalTrips: 0,
        hasData: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Import from file
  const importFromFile = useCallback(
    async (file: File, datasetMonth: string) => {
      setIsImporting(true);
      setProgress(null);
      setResult(null);

      try {
        const importResult = await importPublicTripsFromFile(file, datasetMonth, (p) =>
          setProgress(p)
        );

        setResult(importResult);

        // Refresh stats after successful import
        if (importResult.success) {
          await refreshStats();
        }
      } catch (error) {
        console.error('Import error:', error);
        setResult({
          success: false,
          imported: 0,
          skipped: 0,
          errors: 0,
          message: error instanceof Error ? error.message : 'Unknown import error',
        });
      } finally {
        setIsImporting(false);
      }
    },
    [refreshStats]
  );

  // Clear all public data
  const clearData = useCallback(async () => {
    try {
      await clearPublicTripData();
      setStats(null);
      setResult(null);
      setProgress(null);
    } catch (error) {
      console.error('Error clearing public trip data:', error);
    }
  }, []);

  // Check if data exists for a specific month
  const checkDataExists = useCallback(async (datasetMonth: string): Promise<boolean> => {
    try {
      return await hasPublicDataForMonth(datasetMonth);
    } catch (error) {
      console.error('Error checking data existence:', error);
      return false;
    }
  }, []);

  return {
    progress,
    result,
    isImporting,
    stats,
    isLoadingStats,
    importFromFile,
    clearData,
    refreshStats,
    checkDataExists,
  };
}
