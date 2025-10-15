'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import type { TripFilters as TripFiltersType } from '@/lib/db/hooks';

interface TripFiltersProps {
  onFiltersChange: (filters: TripFiltersType) => void;
  onSearchChange: (query: string) => void;
  totalTrips: number;
  filteredTrips: number;
}

export default function TripFilters({
  onFiltersChange,
  onSearchChange,
  totalTrips,
  filteredTrips,
}: TripFiltersProps) {
  const { t } = useI18n();
  const distanceUnit = useAppStore((state) => state.distanceUnit);
  const [expanded, setExpanded] = useState(false);
  const [bikeType, setBikeType] = useState<'classic' | 'ebike' | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Advanced filters
  const [minDuration, setMinDuration] = useState<string>(''); // minutes
  const [maxDuration, setMaxDuration] = useState<string>(''); // minutes
  const [minDistance, setMinDistance] = useState<string>(''); // in current unit (miles or km)
  const [maxDistance, setMaxDistance] = useState<string>(''); // in current unit (miles or km)
  const [hasAngelPoints, setHasAngelPoints] = useState(false);
  const [minAngelPoints, setMinAngelPoints] = useState<string>('');

  // Apply filters
  const applyFilters = () => {
    const filters: TripFiltersType = {};

    if (bikeType) {
      filters.bikeType = bikeType;
    }

    // Sync status filter
    if (syncStatus === 'synced') {
      filters.hasDetails = true;
    } else if (syncStatus === 'unsynced') {
      filters.hasDetails = false;
    }
    // if 'all', don't set hasDetails (undefined means show all)

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      // Set to end of day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filters.endDate = endDateTime;
    }

    // Advanced filters
    if (minDuration) {
      filters.minDuration = parseFloat(minDuration) * 60; // convert minutes to seconds
    }

    if (maxDuration) {
      filters.maxDuration = parseFloat(maxDuration) * 60; // convert minutes to seconds
    }

    if (minDistance) {
      // Convert to meters based on current unit
      filters.minDistance = parseFloat(minDistance) * (distanceUnit === 'miles' ? 1609.34 : 1000);
    }

    if (maxDistance) {
      // Convert to meters based on current unit
      filters.maxDistance = parseFloat(maxDistance) * (distanceUnit === 'miles' ? 1609.34 : 1000);
    }

    if (hasAngelPoints) {
      filters.hasAngelPoints = true;
    }

    if (minAngelPoints) {
      filters.minAngelPoints = parseInt(minAngelPoints, 10);
    }

    // Note: searchQuery is not part of TripFilters type yet
    // It will need to be filtered in the parent component

    onFiltersChange(filters);
  };

  // Clear all filters
  const clearFilters = () => {
    setBikeType(undefined);
    setSyncStatus('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setMinDuration('');
    setMaxDuration('');
    setMinDistance('');
    setMaxDistance('');
    setHasAngelPoints(false);
    setMinAngelPoints('');
    onFiltersChange({});
    onSearchChange('');
  };

  // Check if any filters are active
  const hasActiveFilters =
    bikeType ||
    syncStatus !== 'all' ||
    searchQuery ||
    startDate ||
    endDate ||
    minDuration ||
    maxDuration ||
    minDistance ||
    maxDistance ||
    hasAngelPoints ||
    minAngelPoints;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Filter Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('tripFilters.filters')}
          </button>

          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {t('tripFilters.active')}
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {filteredTrips === totalTrips ? (
            <span>{t('tripFilters.showingAll', { count: totalTrips })}</span>
          ) : (
            <span>
              {t('tripFilters.showingFiltered', { filtered: filteredTrips, total: totalTrips })}
            </span>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {/* Search Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('tripFilters.searchStations')}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchChange(e.target.value);
              }}
              placeholder={t('tripFilters.searchPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bike Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tripFilters.bikeType')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setBikeType(undefined)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  bikeType === undefined
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t('tripFilters.allBikes')}
              </button>
              <button
                onClick={() => setBikeType('classic')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                  bikeType === 'classic'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>🚲</span>
                {t('tripFilters.classic')}
              </button>
              <button
                onClick={() => setBikeType('ebike')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                  bikeType === 'ebike'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>⚡</span>
                {t('tripFilters.ebike')}
              </button>
            </div>
          </div>

          {/* Sync Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tripFilters.syncStatus')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSyncStatus('all')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  syncStatus === 'all'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t('tripFilters.allTrips')}
              </button>
              <button
                onClick={() => setSyncStatus('synced')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                  syncStatus === 'synced'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>✓</span>
                {t('tripFilters.synced')}
              </button>
              <button
                onClick={() => setSyncStatus('unsynced')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                  syncStatus === 'unsynced'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t('tripFilters.unsynced')}
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('tripFilters.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('tripFilters.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Advanced Filters Section */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('tripFilters.advancedFilters')}
            </h4>

            {/* Duration Range */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('tripFilters.minDuration')}
                </label>
                <input
                  type="number"
                  value={minDuration}
                  onChange={(e) => setMinDuration(e.target.value)}
                  min="0"
                  max={maxDuration || undefined}
                  placeholder="e.g., 10"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('tripFilters.maxDuration')}
                </label>
                <input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(e.target.value)}
                  min={minDuration || '0'}
                  placeholder="e.g., 45"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Distance Range */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {distanceUnit === 'miles'
                    ? t('tripFilters.minDistanceMiles')
                    : t('tripFilters.minDistanceKm')}
                </label>
                <input
                  type="number"
                  value={minDistance}
                  onChange={(e) => setMinDistance(e.target.value)}
                  min="0"
                  max={maxDistance || undefined}
                  step="0.1"
                  placeholder={distanceUnit === 'miles' ? 'e.g., 1.0' : 'e.g., 1.5'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {distanceUnit === 'miles'
                    ? t('tripFilters.maxDistanceMiles')
                    : t('tripFilters.maxDistanceKm')}
                </label>
                <input
                  type="number"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  min={minDistance || '0'}
                  step="0.1"
                  placeholder={distanceUnit === 'miles' ? 'e.g., 5.0' : 'e.g., 8.0'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Angel Points Filters */}
            <div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAngelPoints}
                  onChange={(e) => setHasAngelPoints(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('tripFilters.onlyAngelPoints')}
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('tripFilters.minAngelPoints')}
                </label>
                <input
                  type="number"
                  value={minAngelPoints}
                  onChange={(e) => setMinAngelPoints(e.target.value)}
                  min="0"
                  placeholder="e.g., 2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t('tripFilters.apply')}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                {t('tripFilters.clear')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
