'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import type { StationWithStatus } from '@/lib/types';

interface WaypointManagerProps {
  stations: StationWithStatus[];
}

export function WaypointManager({ stations }: WaypointManagerProps) {
  const { t } = useI18n();
  const {
    startStation,
    endStation,
    waypoints,
    addWaypoint,
    removeWaypoint,
    reorderWaypoints,
    clearWaypoints,
  } = useAppStore();

  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Filter stations that aren't already selected
  const availableStations = stations
    .filter((station) => {
      if (!station.is_installed) return false;
      if (startStation?.station_id === station.station_id) return false;
      if (endStation?.station_id === station.station_id) return false;
      if (waypoints.some((w) => w.station_id === station.station_id)) return false;
      if (searchQuery && !station.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    })
    .slice(0, 10);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderWaypoints(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleAddWaypoint = (station: StationWithStatus) => {
    addWaypoint(station);
    setIsAddingWaypoint(false);
    setSearchQuery('');
  };

  if (!startStation || !endStation) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('waypoints.title')}
        </h3>
        {waypoints.length > 0 && (
          <button
            onClick={clearWaypoints}
            className="text-xs text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400"
          >
            {t('waypoints.clearAll')}
          </button>
        )}
      </div>

      {/* Route overview */}
      <div className="space-y-2">
        {/* Start Station */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
            {startStation.name}
          </span>
        </div>

        {/* Waypoints */}
        {waypoints.map((waypoint, index) => (
          <div
            key={waypoint.station_id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className="flex items-center space-x-2 ml-3 cursor-move group"
          >
            <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600 ml-2.5"></div>
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {index + 1}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{waypoint.name}</span>
            <button
              onClick={() => removeWaypoint(index)}
              className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Waypoint Button/Input */}
        {!isAddingWaypoint && waypoints.length < 3 && (
          <button
            onClick={() => setIsAddingWaypoint(true)}
            className="flex items-center space-x-2 ml-3 text-sm text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
          >
            <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600 ml-2.5"></div>
            <div className="w-6 h-6 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v12m6-6H6"
                />
              </svg>
            </div>
            <span>{t('waypoints.addStop')}</span>
          </button>
        )}

        {/* Waypoint Search */}
        {isAddingWaypoint && (
          <div className="ml-3">
            <div className="flex items-center space-x-2">
              <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600 ml-2.5"></div>
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('waypoints.searchPlaceholder')}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchQuery && availableStations.length > 0 && (
                  <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {availableStations.map((station) => (
                      <button
                        key={station.station_id}
                        onClick={() => handleAddWaypoint(station)}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-gray-900 dark:text-gray-100">{station.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {t('waypoints.bikesAvailable', {
                            count: station.num_bikes_available ?? 0,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsAddingWaypoint(false);
                    setSearchQuery('');
                  }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-1"
                >
                  {t('waypoints.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Station */}
        <div className="flex items-center space-x-2">
          {waypoints.length > 0 && (
            <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600 ml-2.5"></div>
          )}
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            E
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{endStation.name}</span>
        </div>
      </div>

      {waypoints.length === 3 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('waypoints.maxReached')}</p>
      )}
    </div>
  );
}
