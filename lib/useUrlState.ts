'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import type { StationWithStatus } from '@/lib/types';
import { getStationSlug, findStationBySlug } from '@/lib/station-utils';

/**
 * Custom hook to synchronize app state with URL
 * Enables deep linking and shareable routes
 */
export function useUrlState(stations: StationWithStatus[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasLoadedFromUrl = useRef(false);

  const {
    startStation,
    endStation,
    setStartStation,
    setEndStation,
    selectedStation,
    setSelectedStation,
  } = useAppStore();

  // Update URL when stations change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (startStation) {
      // Use human-readable slug instead of UUID
      params.set('from', getStationSlug(startStation));
    }

    if (endStation) {
      // Use human-readable slug instead of UUID
      params.set('to', getStationSlug(endStation));
    }

    if (selectedStation) {
      params.set('station', selectedStation);
    }

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replace to avoid adding to history on every station selection
    router.replace(url, { scroll: false });
  }, [startStation, endStation, selectedStation, pathname, router]);

  // Load state from URL on mount (only once)
  const loadFromUrl = useCallback(() => {
    if (stations.length === 0 || hasLoadedFromUrl.current) return;

    const fromSlug = searchParams.get('from');
    const toSlug = searchParams.get('to');
    const stationId = searchParams.get('station');

    if (fromSlug) {
      // Support both slug format and legacy UUID format
      const station = findStationBySlug(stations, fromSlug);
      if (station) {
        setStartStation(station);
      }
    }

    if (toSlug) {
      // Support both slug format and legacy UUID format
      const station = findStationBySlug(stations, toSlug);
      if (station) {
        setEndStation(station);
      }
    }

    if (stationId) {
      setSelectedStation(stationId);
    }

    hasLoadedFromUrl.current = true;
  }, [stations, searchParams, setStartStation, setEndStation, setSelectedStation]);

  // Effect to update URL when state changes
  useEffect(() => {
    if (stations.length > 0) {
      updateUrl();
    }
  }, [startStation, endStation, selectedStation, updateUrl, stations.length]);

  // Effect to load from URL on mount
  useEffect(() => {
    loadFromUrl();
  }, [loadFromUrl]);

  // Function to generate shareable link
  const getShareableLink = useCallback(() => {
    const params = new URLSearchParams();

    if (startStation) {
      // Use human-readable slug instead of UUID
      params.set('from', getStationSlug(startStation));
    }

    if (endStation) {
      // Use human-readable slug instead of UUID
      params.set('to', getStationSlug(endStation));
    }

    const baseUrl =
      typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

    return `${baseUrl}${pathname}?${params.toString()}`;
  }, [startStation, endStation, pathname]);

  // Function to copy link to clipboard
  const copyLinkToClipboard = useCallback(async () => {
    const link = getShareableLink();

    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      console.error('Failed to copy link:', error);
      return false;
    }
  }, [getShareableLink]);

  return {
    getShareableLink,
    copyLinkToClipboard,
  };
}
