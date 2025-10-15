'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import MapComponent from '@/components/map/Map';
import StationSelector from '@/components/routes/StationSelector';
import RoutePanel from '@/components/routes/RoutePanel';
import { type RouteProfile, RouteProfileSelector } from '@/components/routes/RouteProfileSelector';
import { WaypointManager } from '@/components/routes/WaypointManager';
import RouteHistory from '@/components/routes/RouteHistory';
import NavBar from '@/components/nav/NavBar';
import { useAppStore } from '@/lib/store';
import { mergeStationData } from '@/lib/gbfs';
import { useUrlState } from '@/lib/useUrlState';
import { API_ROUTES, buildApiRoute } from '@/config/routes';
import type { Station, StationStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { Share2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function HomeContent() {
  const { t } = useI18n();
  const { startStation, endStation, currentCity } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [mobileRouteOpen, setMobileRouteOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('fastest');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Build API URLs with city parameter
  const stationInfoUrl = buildApiRoute(API_ROUTES.STATIONS.INFO, { city: currentCity });
  const stationStatusUrl = buildApiRoute(API_ROUTES.STATIONS.STATUS, { city: currentCity });

  // Fetch static station information (cached for 24 hours)
  const { data: stationInfoData, error: infoError } = useSWR<{
    data: {
      stations: Station[];
    };
    last_updated: number;
    ttl: number;
    version: string;
  }>(stationInfoUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0, // No auto-refresh - static data
    dedupingInterval: 86400000, // 24 hours
  });

  // Fetch real-time station status (refresh every 30 seconds)
  const { data: statusData, error: statusError } = useSWR<{
    data: {
      stations: StationStatus[];
    };
    last_updated: number;
    ttl: number;
    version: string;
  }>(stationStatusUrl, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });

  // Merge static info with real-time status
  const stations = useMemo(() => {
    if (!stationInfoData?.data?.stations || !statusData?.data?.stations) return [];
    return mergeStationData(stationInfoData.data.stations, statusData.data.stations);
  }, [stationInfoData?.data?.stations, statusData?.data?.stations]);

  const isLoading = !stationInfoData || !statusData;
  const error = infoError || statusError;

  // URL state management
  const { copyLinkToClipboard } = useUrlState(stations);

  const handleShare = async () => {
    const success = await copyLinkToClipboard();
    if (success) {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch - don't render until client-side
  if (!mounted) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-4">
            {t('page.errorLoadingTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('page.errorLoadingMessage')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('page.refreshPage')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <NavBar />

      {/* Mobile Selected Station Badges */}
      {(startStation || endStation) && !mobilePanelOpen && (
        <div className="sm:hidden fixed top-24 left-4 z-20 max-w-[calc(100%-6rem)] space-y-2">
          {startStation && (
            <div
              onClick={() => setMobilePanelOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg cursor-pointer"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                <span className="font-semibold">{t('page.from')}</span> {startStation.name}
              </div>
            </div>
          )}
          {endStation && (
            <div
              onClick={() => setMobilePanelOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg cursor-pointer"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
              <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                <span className="font-semibold">{t('page.to')}</span> {endStation.name}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Floating Button to Open Panel */}
      <button
        onClick={() => setMobilePanelOpen(true)}
        className="sm:hidden fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {t('page.selectStations')}
      </button>

      {/* Station Selector Panel - Desktop */}
      <div className="hidden sm:block absolute top-20 left-4 z-10 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
        <div className="flex-shrink-0">
          <StationSelector stations={stations} isLoading={isLoading} />
          <WaypointManager stations={stations} />
          <RouteProfileSelector onProfileChange={setRouteProfile} />
          <RouteHistory
            stations={stations}
            currentRouteProfile={routeProfile}
            onRouteLoad={setRouteProfile}
          />
        </div>
      </div>

      {/* Mobile Station Selector Panel - Bottom Sheet */}
      {mobilePanelOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobilePanelOpen(false)}
          ></div>
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2 z-10">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
              <button
                onClick={() => setMobilePanelOpen(false)}
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
            <div className="flex-shrink-0">
              <StationSelector stations={stations} isLoading={isLoading} />
              <WaypointManager stations={stations} />
              <RouteProfileSelector onProfileChange={setRouteProfile} />
              <RouteHistory
                stations={stations}
                currentRouteProfile={routeProfile}
                onRouteLoad={setRouteProfile}
              />
            </div>
          </div>
        </div>
      )}

      {/* Route Panel - Desktop */}
      {startStation && endStation && (
        <div className="hidden sm:block absolute top-20 right-4 z-10 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <RoutePanel />
          {/* Share Button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleShare}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {t('page.shareRoute')}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Route Button */}
      {startStation && endStation && (
        <button
          onClick={() => setMobileRouteOpen(true)}
          className="sm:hidden fixed top-24 right-4 z-20 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          {t('page.route')}
        </button>
      )}

      {/* Mobile Route Panel - Bottom Sheet */}
      {startStation && endStation && mobileRouteOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileRouteOpen(false)}
          ></div>
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
              <button
                onClick={() => setMobileRouteOpen(false)}
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
            <RoutePanel />
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 w-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('page.loadingStations')}</p>
            </div>
          </div>
        ) : (
          <MapComponent stations={stations} routeProfile={routeProfile} />
        )}
      </div>

      {/* Legend */}
      {/*{!isLoading && <Legend/>}*/}

      {/* Instructions */}
      {!startStation && !isLoading && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-10 bg-white dark:bg-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-full shadow-lg max-w-[90%] sm:max-w-none">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center">
            {t('page.clickToStart')}
          </p>
        </div>
      )}

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {t('page.linkCopied')}
        </div>
      )}
    </main>
  );
}

// Main component wrapped with Suspense for URL params
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
