'use client';

/**
 * Public Data Import Component
 * Allows users to import public Citibike trip data from JSON files
 * Generated from CSV using scripts/import-public-data.ts
 */

import { useState, useEffect, useRef } from 'react';
import { usePublicTripImport } from '@/lib/db/hooks/usePublicTripImport';
import { useI18n } from '@/lib/i18n';

export default function PublicDataImport() {
  const { t } = useI18n();
  const {
    progress,
    result,
    isImporting,
    stats,
    isLoadingStats,
    importFromFile,
    clearData,
    refreshStats,
  } = usePublicTripImport();

  const [datasetMonth, setDatasetMonth] = useState('2025-09'); // Default to Sep 2025
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    await importFromFile(file, datasetMonth);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle clear data
  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all public trip data? This cannot be undone.')) {
      return;
    }

    await clearData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('publicDataImport.title')}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('publicDataImport.description')}{' '}
          <a
            href="https://s3.amazonaws.com/tripdata/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('publicDataImport.dataSourceLink')}
          </a>
          {t('publicDataImport.convertInstructions')}{' '}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {t('publicDataImport.scriptCommand')}
          </code>
        </p>
      </div>

      {/* Current Stats */}
      {isLoadingStats ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('publicDataImport.loadingStats')}
          </p>
        </div>
      ) : stats?.hasData ? (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('publicDataImport.currentData')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('publicDataImport.totalTrips')}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalTrips.toLocaleString()}
              </div>
            </div>
            {stats.bikeTypes && (
              <div>
                <div className="text-gray-600 dark:text-gray-400">
                  {t('publicDataImport.ebikes')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.bikeTypes.ebikePercent.toFixed(1)}
                  {t('publicDataImport.percent')}
                </div>
              </div>
            )}
            {stats.memberTypes && (
              <div>
                <div className="text-gray-600 dark:text-gray-400">
                  {t('publicDataImport.members')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.memberTypes.memberPercent.toFixed(1)}
                  {t('publicDataImport.percent')}
                </div>
              </div>
            )}
            {stats.averages && (
              <div>
                <div className="text-gray-600 dark:text-gray-400">
                  {t('publicDataImport.avgDistance')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.averages.distanceMiles.toFixed(2)} mi
                </div>
              </div>
            )}
          </div>
          {stats.datasetMonths && stats.datasetMonths.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('publicDataImport.datasets')}{' '}
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {stats.datasetMonths.join(', ')}
              </span>
            </div>
          )}
          <button
            onClick={handleClearData}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            {t('publicDataImport.clearAllData')}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('publicDataImport.noDataYet')}
          </p>
        </div>
      )}

      {/* Import Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="dataset-month"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('publicDataImport.datasetMonthLabel')}
          </label>
          <input
            type="text"
            id="dataset-month"
            value={datasetMonth}
            onChange={(e) => setDatasetMonth(e.target.value)}
            placeholder={t('publicDataImport.datasetMonthPlaceholder')}
            pattern="\d{4}-\d{2}"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            disabled={isImporting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('publicDataImport.datasetMonthHelp')}
          </p>
        </div>

        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('publicDataImport.jsonFileLabel')}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept=".json"
            onChange={handleFileChange}
            disabled={isImporting}
            className="block w-full text-sm text-gray-900 dark:text-white
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100
                     dark:file:bg-blue-900/30 dark:file:text-blue-300
                     dark:hover:file:bg-blue-900/50
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('publicDataImport.jsonFileHelp')}
          </p>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {progress.message}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.percentComplete}
              {t('publicDataImport.percent')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {progress.current.toLocaleString()} / {progress.total.toLocaleString()}{' '}
            {t('publicDataImport.progressTrips')}
          </p>
        </div>
      )}

      {/* Result */}
      {result && !isImporting && (
        <div
          className={`p-4 rounded-lg ${
            result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}
        >
          <h3
            className={`font-semibold mb-2 ${
              result.success
                ? 'text-green-900 dark:text-green-100'
                : 'text-red-900 dark:text-red-100'
            }`}
          >
            {result.success
              ? t('publicDataImport.importComplete')
              : t('publicDataImport.importFailed')}
          </h3>
          <p
            className={`text-sm mb-3 ${
              result.success
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {result.message}
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div
                className={
                  result.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {t('publicDataImport.imported')}
              </div>
              <div
                className={`text-lg font-bold ${
                  result.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {result.imported.toLocaleString()}
              </div>
            </div>
            <div>
              <div
                className={
                  result.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {t('publicDataImport.skipped')}
              </div>
              <div
                className={`text-lg font-bold ${
                  result.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {result.skipped.toLocaleString()}
              </div>
            </div>
            <div>
              <div
                className={
                  result.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {t('publicDataImport.errors')}
              </div>
              <div
                className={`text-lg font-bold ${
                  result.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {result.errors.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {t('publicDataImport.howToImportTitle')}
        </h3>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>
            {t('publicDataImport.step1')}{' '}
            <a
              href="https://s3.amazonaws.com/tripdata/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('publicDataImport.citibikeOpenData')}
            </a>
          </li>
          <li>
            {t('publicDataImport.step2')}{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              {t('publicDataImport.step2Command')}
            </code>
          </li>
          <li>{t('publicDataImport.step3')}</li>
          <li>{t('publicDataImport.step4')}</li>
        </ol>
      </div>
    </div>
  );
}
