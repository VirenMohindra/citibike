'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/toast-context';
import { calculateDistance } from '@/lib/gbfs';
import { downloadFile, exportAsGPX, exportAsKML, generateFilename } from '@/lib/export';
import { Download, Share2 } from 'lucide-react';
import { NavigationPanel } from '@/components/routes/NavigationPanel';

export default function RoutePanel() {
  const { t, formatDistance } = useI18n();
  const { addToast } = useToast();
  const { startStation, endStation, waypoints, route, clearRoute, distanceUnit } = useAppStore();
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    const params = new URLSearchParams();
    if (startStation) {
      params.set('from', startStation.station_id);
      params.set('fromName', startStation.name);
    }
    if (endStation) {
      params.set('to', endStation.station_id);
      params.set('toName', endStation.name);
    }

    const url = `${window.location.origin}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(url);
      addToast(t('toast.routeCopy'), 'success');
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      addToast('Failed to copy link', 'error');
    }
  };

  const handleExportGPX = () => {
    if (!route || !startStation || !endStation) return;

    const gpxContent = exportAsGPX(route, startStation, endStation, waypoints);
    const filename = generateFilename(startStation, endStation, 'gpx');
    downloadFile(gpxContent, filename, 'application/gpx+xml');
  };

  const handleExportKML = () => {
    if (!route || !startStation || !endStation) return;

    const kmlContent = exportAsKML(route, startStation, endStation, waypoints);
    const filename = generateFilename(startStation, endStation, 'kml');
    downloadFile(kmlContent, filename, 'application/vnd.google-earth.kml+xml');
  };

  if (!startStation || !endStation) return null;

  const distance = calculateDistance(
    startStation.lat,
    startStation.lon,
    endStation.lat,
    endStation.lon
  );

  // Estimate time (assuming 15 km/h average speed)
  const estimatedMinutes = Math.round((distance / 1000 / 15) * 60);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{t('map.route.panel.title')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="text-white/80 hover:text-white transition-colors relative"
              title={t('map.route.panel.shareRoute')}
            >
              {showCopied ? (
                <span className="text-xs">{t('common.copied')}</span>
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={clearRoute}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-blue-100">{t('map.route.panel.estimatedRoute')}</p>
      </div>

      {/* Route Details - Scrollable */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Distance & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
              {t('map.route.distance')}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatDistance(distance)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
              {t('map.route.panel.estimatedTime')}
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('map.route.panel.minutes', { count: estimatedMinutes })}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              {distanceUnit === 'miles'
                ? t('map.route.panel.averageSpeedMiles')
                : t('map.route.panel.averageSpeedKm')}
            </div>
          </div>
        </div>

        {/* Stations */}
        <div className="space-y-3">
          {/* Start Station */}
          <div className="flex items-start space-x-3">
            <div className="mt-1 w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                {t('map.route.panel.start')}
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {startStation.name}
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {(startStation.num_bikes_available ?? 0) - (startStation.num_ebikes_available ?? 0)}{' '}
                {t('map.route.panel.bikesAvailable')} • {startStation.num_ebikes_available ?? 0}{' '}
                {t('map.route.panel.ebikesAvailable')}
              </div>
            </div>
          </div>

          {/* Dashed Line */}
          <div className="ml-2 h-8 border-l-2 border-dashed border-gray-300 dark:border-gray-600"></div>

          {/* End Station */}
          <div className="flex items-start space-x-3">
            <div className="mt-1 w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                {t('map.route.panel.end')}
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {endStation.name}
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {endStation.num_docks_available ?? 0} {t('map.route.panel.docksAvailable')}
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {(startStation.num_bikes_available ?? 0) === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  {t('map.route.panel.noBikesTitle')}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                  {t('map.route.panel.noBikesMessage')}
                </div>
              </div>
            </div>
          </div>
        )}

        {(endStation.num_docks_available ?? 0) === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  {t('map.route.panel.noDocksTitle')}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                  {t('map.route.panel.noDocksMessage')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <strong>{t('map.route.panel.note')}</strong> {t('map.route.panel.noteMessage')}
          </div>
        </div>

        {/* Export Buttons */}
        {route && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('map.route.panel.exportRoute')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportGPX}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                GPX
              </button>
              <button
                onClick={handleExportKML}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                KML
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('map.route.panel.exportDescription')}
            </div>
          </div>
        )}
      </div>
      <NavigationPanel />
    </div>
  );
}
