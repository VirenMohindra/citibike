'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { findNearestStations } from '@/lib/gbfs';
import { fuzzySearch } from '@/lib/fuzzy';
import type { StationWithStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface StationSelectorProps {
  stations?: StationWithStatus[];
  isLoading: boolean;
}

interface StationWithDistance extends StationWithStatus {
  distance?: number;
}

type FilterType = 'all' | 'bikes' | 'ebikes' | 'docks' | 'favorites';

export default function StationSelector({ stations = [], isLoading }: StationSelectorProps) {
  const { t, formatDistance } = useI18n();
  const {
    startStation,
    endStation,
    setStartStation,
    setEndStation,
    clearRoute,
    favoriteStations,
    toggleFavorite,
    isFavorite,
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNearest, setShowNearest] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredStations = useMemo(() => {
    // First apply base filters
    let filtered = stations.filter((s) => s.is_installed && s.is_renting);

    // Apply availability filter
    switch (filter) {
      case 'bikes':
        filtered = filtered.filter(
          (s) => (s.num_bikes_available ?? 0) - (s.num_ebikes_available ?? 0) > 0
        );
        break;
      case 'ebikes':
        filtered = filtered.filter((s) => (s.num_ebikes_available ?? 0) > 0);
        break;
      case 'docks':
        filtered = filtered.filter((s) => (s.num_docks_available ?? 0) > 0);
        break;
      case 'favorites':
        filtered = filtered.filter((s) => favoriteStations.includes(s.station_id));
        break;
    }

    // Then apply location or search
    if (showNearest && userLocation) {
      return findNearestStations(filtered, userLocation.latitude, userLocation.longitude, 10);
    }

    if (searchQuery.trim()) {
      // Use fuzzy search for better matching
      const fuzzyResults = fuzzySearch(filtered, searchQuery, {
        keys: ['name', 'short_name'],
        threshold: 0.2,
        limit: 20,
      });
      return fuzzyResults.map((r) => r.item);
    }

    // Default: show first 50 stations
    return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
  }, [stations, searchQuery, showNearest, userLocation, filter, favoriteStations]);

  const handleStationClick = (station: StationWithStatus) => {
    if (!startStation) {
      setStartStation(station);
    } else if (!endStation && station.station_id !== startStation.station_id) {
      setEndStation(station);
    } else {
      clearRoute();
      setStartStation(station);
    }
  };

  const handleFindNearest = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(position.coords);
          setShowNearest(true);
          setSearchQuery('');
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(t('stationSelector.locationError'));
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      alert(t('stationSelector.geolocationUnsupported'));
      setLocationLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-120px)] relative z-[10002] bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('stationSelector.title')}
        </h2>

        {/* Search Input and Buttons */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t('stationSelector.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowNearest(false);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-600 dark:placeholder:text-gray-400"
          />

          <div className="flex gap-2">
            <button
              onClick={handleFindNearest}
              disabled={locationLoading}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {locationLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('stationSelector.gettingLocation')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <span>{t('stationSelector.findNearest')}</span>
                </>
              )}
            </button>

            {showNearest && (
              <button
                onClick={() => {
                  setShowNearest(false);
                  setSearchQuery('');
                }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                {t('stationSelector.clear')}
              </button>
            )}
          </div>

          {showNearest && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {t('stationSelector.nearestStations')}
            </div>
          )}

          {/* Filter Buttons - Horizontal scrollable on mobile */}
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 min-w-max">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <span>{t('stationSelector.all')}</span>
                {filter === 'all' && stations.length > 0 && (
                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {filteredStations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('bikes')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  filter === 'bikes'
                    ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
                </svg>
                <span>{t('stationSelector.bikes')}</span>
                {filter === 'bikes' && filteredStations.length > 0 && (
                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {filteredStations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('ebikes')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  filter === 'ebikes'
                    ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>{t('stationSelector.ebikes')}</span>
                {filter === 'ebikes' && filteredStations.length > 0 && (
                  <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    {filteredStations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('docks')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  filter === 'docks'
                    ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                  />
                </svg>
                <span>{t('stationSelector.docks')}</span>
                {filter === 'docks' && filteredStations.length > 0 && (
                  <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                    {filteredStations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap relative group ${
                  filter === 'favorites'
                    ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-sm'
                    : favoriteStations.length > 0
                      ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-yellow-600 dark:hover:text-yellow-400'
                }`}
                title={
                  favoriteStations.length > 0
                    ? `View your ${favoriteStations.length} favorite station${favoriteStations.length > 1 ? 's' : ''}`
                    : 'Save your favorite stations for quick access'
                }
              >
                <svg
                  className={`w-3.5 h-3.5 flex-shrink-0 ${favoriteStations.length > 0 ? 'fill-current' : ''}`}
                  fill={favoriteStations.length > 0 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={favoriteStations.length > 0 ? '0' : '2'}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span>{t('stationSelector.favorites')}</span>
                {favoriteStations.length > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      filter === 'favorites'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    {favoriteStations.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Stations */}
      {(startStation || endStation) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700 space-y-2">
          {startStation && (
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                    {t('stationSelector.start')}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {startStation.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStartStation(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
          )}

          {endStation && (
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <div className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                    {t('stationSelector.end')}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {endStation.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEndStation(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
          )}

          {startStation && endStation && (
            <button
              onClick={clearRoute}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {t('stationSelector.clearRoute')}
            </button>
          )}
        </div>
      )}

      {/* Station List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        {filteredStations.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <p className="font-medium">
              {filter === 'favorites' && favoriteStations.length === 0
                ? t('stationSelector.noFavorites')
                : t('stationSelector.noStations')}
            </p>
            <p className="text-sm mt-1">
              {filter === 'favorites' && favoriteStations.length === 0
                ? t('stationSelector.noFavoritesHint')
                : t('stationSelector.noStationsHint')}
            </p>
            {filter === 'favorites' && favoriteStations.length === 0 && (
              <button
                onClick={() => setFilter('all')}
                className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium underline"
              >
                {t('stationSelector.browseAll')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStations.map((station) => {
              const isSelected =
                station.station_id === startStation?.station_id ||
                station.station_id === endStation?.station_id;
              const bikesAvailable =
                (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);

              return (
                <div
                  key={station.station_id}
                  onClick={() => handleStationClick(station)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 pr-2">
                        {station.name}
                      </h3>
                      {showNearest && 'distance' in station && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          {formatDistance((station as StationWithDistance).distance!)}{' '}
                          {t('stationSelector.away')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(station.station_id);
                        }}
                        className={`text-lg transition-all duration-200 transform hover:scale-125 ${
                          isFavorite(station.station_id)
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-500'
                        }`}
                        title={
                          isFavorite(station.station_id)
                            ? 'Remove from favorites'
                            : 'Click to save as favorite'
                        }
                      >
                        {isFavorite(station.station_id) ? '⭐' : '☆'}
                      </button>
                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                          {t('stationSelector.selected')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
                      </svg>
                      <span>
                        {bikesAvailable} {t('stationSelector.bikesLower')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span>
                        {station.num_ebikes_available ?? 0} {t('stationSelector.ebikesLower')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span>🅿</span>
                      <span>
                        {station.num_docks_available ?? 0} {t('stationSelector.docksLower')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
