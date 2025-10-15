'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { db, type TripFilters, useTripHeatmapData, useTrips } from '@/lib/db';
import { useI18n } from '@/lib/i18n';
import TripList from '@/components/trips/TripList';
import TripDetailsPanel from '@/components/trips/TripDetailsPanel';
import TripVisualizationMap from '@/components/trips/TripVisualizationMap';
import TripDetailsSyncButton from '@/components/trips/TripDetailsSyncButton';
import TripFiltersComponent from '@/components/trips/TripFilters';
import TripStatsDashboard from '@/components/trips/TripStatsDashboard';
import TripErrorDebug from '@/components/trips/TripErrorDebug';
import TripPreview from '@/components/trips/TripPreview';
import NavBar from '@/components/nav/NavBar';
import type { Trip as DBTrip } from '@/lib/db/schema';

export default function TripsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { citibikeUser } = useAppStore();
  const [filters, setFilters] = useState<TripFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'trip' | 'heatmap' | 'stats' | 'debug'>('trip');
  const trips = useTrips(citibikeUser?.id || null, filters);
  const heatmapData = useTripHeatmapData(citibikeUser?.id || null, filters);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<DBTrip | null>(null);

  // Mobile state
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  // Apply search filtering (not part of DB filters)
  const filteredTrips = useMemo(() => {
    if (!trips || !searchQuery) return trips || [];

    const query = searchQuery.toLowerCase();
    return trips.filter(
      (trip) =>
        trip.startStationName?.toLowerCase().includes(query) ||
        trip.endStationName?.toLowerCase().includes(query)
    );
  }, [trips, searchQuery]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: TripFilters) => {
    setFilters(newFilters);
    // Reset selection when filters change
    setSelectedTripId(null);
  };

  // Load trip from URL or select most recent trip by default
  useEffect(() => {
    if (!filteredTrips || filteredTrips.length === 0) return;

    // First check if there's a tripId in the URL
    const tripIdFromUrl = searchParams.get('tripId');
    if (tripIdFromUrl && !selectedTripId) {
      const trip = filteredTrips.find((t) => t.id === tripIdFromUrl);
      if (trip) {
        setSelectedTripId(trip.id);
        setSelectedTrip(trip);
        return;
      }
    }

    // If no URL trip or trip not found, select most recent trip
    if (!selectedTripId) {
      // Trips are sorted by startTime DESC, so first one is most recent
      setSelectedTripId(filteredTrips[0].id);
      setSelectedTrip(filteredTrips[0]);
    }
  }, [filteredTrips, selectedTripId, searchParams]);

  // Update URL when trip selection changes
  useEffect(() => {
    if (selectedTripId) {
      router.replace(`/trips?tripId=${selectedTripId}`, { scroll: false });
    }
  }, [selectedTripId, router]);

  // Update selected trip when selection changes and fetch detailed data
  useEffect(() => {
    if (selectedTripId && filteredTrips && citibikeUser) {
      const trip = filteredTrips.find((t) => t.id === selectedTripId);
      if (trip) {
        setSelectedTrip(trip);

        // Check if we should retry fetching trip details
        const maxAttempts = 3;
        const rateLimitBackoffMs = 60000; // Wait 60 seconds after rate limit
        const attempts = trip.detailsFetchAttempts || 0;
        const lastError = trip.detailsFetchError;
        const lastFetchTime = trip.detailsFetchedAt || 0;
        const timeSinceLastFetch = Date.now() - lastFetchTime;

        // Don't retry if we've hit max attempts
        if (attempts >= maxAttempts) {
          console.log(`⏭️  Skipping trip ${trip.id} - max attempts (${attempts}) reached`);
          return;
        }

        // Don't retry if we're rate limited and haven't waited long enough
        if (lastError === 'RATE_LIMITED' && timeSinceLastFetch < rateLimitBackoffMs) {
          const waitTimeRemaining = Math.ceil((rateLimitBackoffMs - timeSinceLastFetch) / 1000);
          console.log(
            `⏸️  Skipping trip ${trip.id} - rate limited, wait ${waitTimeRemaining}s more`
          );
          return;
        }

        // Fetch detailed trip data if we don't have coordinates and haven't fetched before
        if (
          !trip.detailsFetched &&
          (trip.startLat === 0 || trip.startLon === 0 || trip.endLat === 0 || trip.endLon === 0)
        ) {
          console.log(
            `Fetching detailed data for trip ${trip.id}... (attempt ${attempts + 1}/${maxAttempts})`
          );
          fetch(`/api/citibike/trips/${trip.id}`, {
            credentials: 'include',
          })
            .then(async (res) => {
              const data = await res.json();

              // Handle successful response
              if (res.ok && data.success && data.trip) {
                console.log('Trip details response:', data.trip);
                // Update the trip with detailed data
                const detailedTrip = { ...trip };

                // Extract station data from start_address and end_address
                if (data.trip.start_address) {
                  detailedTrip.startStationName =
                    data.trip.start_address.address || trip.startStationName;
                  detailedTrip.startLat = data.trip.start_address.lat || 0;
                  detailedTrip.startLon = data.trip.start_address.lng || 0;
                }

                if (data.trip.end_address) {
                  detailedTrip.endStationName =
                    data.trip.end_address.address || trip.endStationName;
                  detailedTrip.endLat = data.trip.end_address.lat || 0;
                  detailedTrip.endLon = data.trip.end_address.lng || 0;
                }

                // Extract polyline from map_image_url query parameter
                if (data.trip.map_image_url) {
                  try {
                    const url = new URL(data.trip.map_image_url);
                    const polyline = url.searchParams.get('polyline');
                    if (polyline) {
                      detailedTrip.polyline = polyline;
                      detailedTrip.hasActualCoordinates = true;
                    }
                  } catch (e) {
                    console.error('Failed to extract polyline from map URL:', e);
                  }
                }

                // Extract actual distance if available
                if (data.trip.distance?.value) {
                  // Distance is in miles, convert to meters (1 mile = 1609.34 meters)
                  const miles = data.trip.distance.value;
                  detailedTrip.distance = Math.round(miles * 1609.34);
                  detailedTrip.hasActualCoordinates = true;
                }

                // Mark details as fetched successfully
                detailedTrip.detailsFetched = true;
                detailedTrip.detailsFetchedAt = Date.now();
                detailedTrip.detailsFetchError = undefined; // Clear any previous errors

                // Save to database
                try {
                  await db.trips.update(trip.id, {
                    startStationName: detailedTrip.startStationName,
                    startLat: detailedTrip.startLat,
                    startLon: detailedTrip.startLon,
                    endStationName: detailedTrip.endStationName,
                    endLat: detailedTrip.endLat,
                    endLon: detailedTrip.endLon,
                    polyline: detailedTrip.polyline,
                    distance: detailedTrip.distance,
                    hasActualCoordinates: detailedTrip.hasActualCoordinates,
                    detailsFetched: detailedTrip.detailsFetched,
                    detailsFetchedAt: detailedTrip.detailsFetchedAt,
                    detailsFetchError: undefined,
                  });
                  console.log('✅ Saved trip details to database');
                } catch (error) {
                  console.error('Failed to save trip details to database:', error);
                }

                // Update UI
                setSelectedTrip(detailedTrip);
              } else {
                // Handle error response
                const errorCode = data.code || 'UNKNOWN_ERROR';
                const errorMessage = data.error || 'Failed to fetch trip details';
                const tripId = data.tripId || trip.id;

                console.error(`❌ Failed to fetch trip ${tripId}:`, {
                  status: res.status,
                  code: errorCode,
                  message: errorMessage,
                });

                // Store error information in database
                try {
                  const currentAttempts = trip.detailsFetchAttempts || 0;
                  await db.trips.update(trip.id, {
                    detailsFetchError: errorCode,
                    detailsFetchAttempts: currentAttempts + 1,
                    detailsFetched: false,
                    detailsFetchedAt: Date.now(), // Track when error occurred for backoff
                  });
                  console.warn(
                    `⚠️  Stored error for trip ${tripId}: ${errorCode} (attempt ${currentAttempts + 1})`
                  );
                } catch (dbError) {
                  console.error('Failed to store error in database:', dbError);
                }
              }
            })
            .catch(async (error) => {
              console.error('Error fetching trip details:', error);

              // Store network error in database
              try {
                const currentAttempts = trip.detailsFetchAttempts || 0;
                await db.trips.update(trip.id, {
                  detailsFetchError: 'NETWORK_ERROR',
                  detailsFetchAttempts: currentAttempts + 1,
                  detailsFetched: false,
                  detailsFetchedAt: Date.now(), // Track when error occurred for backoff
                });
                console.warn(
                  `⚠️  Stored network error for trip ${trip.id} (attempt ${currentAttempts + 1})`
                );
              } catch (dbError) {
                console.error('Failed to store error in database:', dbError);
              }
            });
        }
      }
    }
  }, [selectedTripId, filteredTrips, citibikeUser]);

  // Show preview for non-authenticated users
  if (!citibikeUser) {
    return <TripPreview />;
  }

  // Loading state for authenticated users
  if (!trips) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('tripsPage.loadingTrips')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get total trip count (unfiltered) for display
  const totalTripCount = trips?.length || 0;

  // No trips state
  if (totalTripCount === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('tripsPage.noTripsFound')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('tripsPage.noTripsDescription')}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors"
            >
              {t('tripsPage.goToHomePage')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar>
        <TripDetailsSyncButton />
      </NavBar>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Tablet: Trip List - Left Column */}
        <div className="hidden lg:flex w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-col overflow-hidden">
          <TripFiltersComponent
            onFiltersChange={handleFiltersChange}
            onSearchChange={setSearchQuery}
            totalTrips={totalTripCount}
            filteredTrips={filteredTrips.length}
          />
          <div className="flex-1 overflow-y-auto">
            <TripList
              trips={filteredTrips}
              selectedTripId={selectedTripId}
              onSelectTrip={setSelectedTripId}
            />
          </div>
        </div>

        {/* Map / Stats - Center Column */}
        <div className="flex-1 relative">
          {/* View Mode Toggle - Desktop */}
          <div className="hidden sm:flex absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 gap-1">
            <button
              onClick={() => setViewMode('trip')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'trip'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tripVisualizationMap.tripView')}
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tripVisualizationMap.heatmapView')}
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tripsPage.statistics')}
            </button>
            <button
              onClick={() => setViewMode('debug')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'debug'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('tripsPage.debugButton')}
            </button>
          </div>

          {/* View Mode Toggle - Mobile (Compact) */}
          <div className="sm:hidden absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex gap-1">
            <button
              onClick={() => setViewMode('trip')}
              className={`p-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'trip'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('tripVisualizationMap.tripView')}
            >
              🗺️
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`p-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('tripVisualizationMap.heatmapView')}
            >
              {t('tripsPage.heatmapIcon')}
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`p-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('tripsPage.statistics')}
            >
              {t('tripsPage.statisticsIcon')}
            </button>
            <button
              onClick={() => setViewMode('debug')}
              className={`p-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'debug'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Debug"
            >
              {t('tripsPage.debugIcon')}
            </button>
          </div>

          {viewMode === 'stats' ? (
            <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              <TripStatsDashboard userId={citibikeUser?.id || null} />
            </div>
          ) : viewMode === 'debug' ? (
            <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              <TripErrorDebug userId={citibikeUser?.id || null} />
            </div>
          ) : (
            <TripVisualizationMap
              selectedTrip={selectedTrip}
              viewMode={viewMode}
              heatmapData={heatmapData}
            />
          )}
        </div>

        {/* Desktop: Trip Details - Right Column */}
        <div className="hidden lg:flex w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <TripDetailsPanel trip={selectedTrip} />
        </div>
      </div>

      {/* Mobile: Floating Action Buttons */}
      <div className="lg:hidden fixed bottom-8 left-4 right-4 z-20 flex gap-3 justify-between">
        <button
          onClick={() => setMobileListOpen(true)}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          {t('tripsPage.viewTrips')}
        </button>
        {selectedTrip && (
          <button
            onClick={() => setMobileDetailsOpen(true)}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('tripsPage.viewDetails')}
          </button>
        )}
      </div>

      {/* Mobile: Trip List Bottom Sheet */}
      {mobileListOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileListOpen(false)}
          ></div>
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2 z-10">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
              <button
                onClick={() => setMobileListOpen(false)}
                className="absolute right-4 top-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <TripFiltersComponent
                onFiltersChange={handleFiltersChange}
                onSearchChange={setSearchQuery}
                totalTrips={totalTripCount}
                filteredTrips={filteredTrips.length}
              />
              <div className="flex-1 overflow-y-auto">
                <TripList
                  trips={filteredTrips}
                  selectedTripId={selectedTripId}
                  onSelectTrip={(id) => {
                    setSelectedTripId(id);
                    setMobileListOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Trip Details Bottom Sheet */}
      {mobileDetailsOpen && selectedTrip && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileDetailsOpen(false)}
          ></div>
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
              <button
                onClick={() => setMobileDetailsOpen(false)}
                className="absolute right-4 top-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <TripDetailsPanel trip={selectedTrip} />
          </div>
        </div>
      )}
    </div>
  );
}
