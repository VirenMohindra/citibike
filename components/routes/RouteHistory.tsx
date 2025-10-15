'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import type { SavedRoute, StationWithStatus } from '@/lib/types';
import { Clock, History, MapPin, Navigation2, Trash2 } from 'lucide-react';
import type { RouteProfile } from './RouteProfileSelector';

interface RouteHistoryProps {
  stations: StationWithStatus[];
  currentRouteProfile: RouteProfile;
  onRouteLoad: (profile: RouteProfile) => void;
}

export default function RouteHistory({
  stations,
  currentRouteProfile,
  onRouteLoad,
}: RouteHistoryProps) {
  const { t, formatDistance } = useI18n();
  const { savedRoutes, loadRoute, deleteRoute, saveRoute, startStation, endStation, route } =
    useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState('');

  const handleSaveRoute = () => {
    if (!routeName.trim()) return;
    saveRoute(routeName.trim(), currentRouteProfile);
    setRouteName('');
    setShowSaveDialog(false);
  };

  const handleLoadRoute = (routeId: string) => {
    const savedRoute = savedRoutes.find((r) => r.id === routeId);
    if (savedRoute) {
      loadRoute(routeId, stations);
      onRouteLoad(savedRoute.routeProfile);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStationName = (stationId: string) => {
    const station = stations.find((s) => s.station_id === stationId);
    return station?.name || 'Unknown Station';
  };

  const canSaveCurrentRoute = startStation && endStation && route && !showSaveDialog;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('routeHistory.title')}
          </span>
          {savedRoutes.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              {savedRoutes.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Save Current Route Button */}
          {canSaveCurrentRoute && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {t('routeHistory.saveCurrentRoute')}
              </button>
            </div>
          )}

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('routeHistory.routeName')}
                </label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder={t('routeHistory.routeNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRoute();
                    if (e.key === 'Escape') setShowSaveDialog(false);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRoute}
                  disabled={!routeName.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {t('routeHistory.save')}
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setRouteName('');
                  }}
                  className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  {t('routeHistory.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Saved Routes List */}
          {savedRoutes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <History className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
              <p className="text-sm font-medium">{t('routeHistory.noRoutes')}</p>
              <p className="text-xs mt-1">{t('routeHistory.noRoutesDescription')}</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {savedRoutes.map((savedRoute: SavedRoute) => (
                <div
                  key={savedRoute.id}
                  className="p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => handleLoadRoute(savedRoute.id)}
                      className="flex-1 text-left"
                    >
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
                        {savedRoute.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(savedRoute.lastUsed || savedRoute.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{savedRoute.routeProfile}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoute(savedRoute.id);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                      title={t('routeHistory.deleteRoute')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleLoadRoute(savedRoute.id)}
                    className="w-full text-left space-y-1"
                  >
                    <div className="flex items-start text-xs text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="line-clamp-1">
                        {getStationName(savedRoute.startStationId)}
                      </span>
                    </div>
                    {savedRoute.waypointIds.length > 0 && (
                      <div className="flex items-start text-xs text-gray-600 dark:text-gray-400 pl-4">
                        <Navigation2 className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-purple-500" />
                        <span>
                          {savedRoute.waypointIds.length} {t('routeHistory.waypoint')}
                          {savedRoute.waypointIds.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start text-xs text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-red-500" />
                      <span className="line-clamp-1">
                        {getStationName(savedRoute.endStationId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span>{formatDistance(savedRoute.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(savedRoute.duration)}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
