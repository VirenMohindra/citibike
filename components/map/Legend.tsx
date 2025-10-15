'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Legend() {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    { color: '#EAB308', label: t('legend.bikeAngelPoints'), subtext: t('legend.earnRewardsHere') },
    { color: '#10B981', label: t('legend.ebikesAvailable'), subtext: t('legend.electricBikes') },
    { color: '#F59E0B', label: t('legend.classicBikesOnly'), subtext: t('legend.regularBikes') },
    { color: '#9CA3AF', label: t('legend.noBikesAvailable'), subtext: t('legend.emptyOrOffline') },
    { color: '#3B82F6', label: t('legend.startStation'), subtext: t('legend.yourPickupPoint') },
    { color: '#EF4444', label: t('legend.endStation'), subtext: t('legend.yourDestination') },
    { color: '#8B5CF6', label: t('legend.waypoint'), subtext: t('legend.stopAlongRoute') },
  ];

  const bikeTypeIndicators = [
    {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
        </svg>
      ),
      label: t('legend.regularBikesOnly'),
    },
    {
      icon: (
        <svg
          className="w-4 h-4 text-green-600"
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
      ),
      label: t('legend.ebikesAvailableShort'),
    },
    { icon: '∅', label: t('legend.noBikes') },
  ];

  const bikeAngelBadges = [
    { color: '#f59e0b', label: t('legend.badgeLow'), value: '2' },
    { color: '#f97316', label: t('legend.badgeMedium'), value: '4' },
    { color: '#10b981', label: t('legend.badgeHigh'), value: '6' },
  ];

  return (
    <div className="absolute bottom-8 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('legend.title')}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {/* Legend Items */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {/* Marker Colors */}
          <div className="px-3 pt-3 pb-2 space-y-2">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('legend.markerColors')}
            </div>
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 py-1">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtext}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bike Type Icons */}
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('legend.bikeTypeIcons')}
            </div>
            {bikeTypeIndicators.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 py-1">
                <div className="w-4 h-4 flex items-center justify-center text-xs flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              {t('legend.iconsHelp')}
            </div>
          </div>

          {/* Bike Angel Progressive Disclosure */}
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('legend.bikeAngelRewardsTitle')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                <span>{t('legend.farZoomDescription')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-3 rounded-sm bg-white border border-gray-300 flex-shrink-0"
                  style={{ borderTop: '3px solid #F59E0B' }}
                ></div>
                <span>{t('legend.mediumZoomDescription')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-[6px] font-bold text-white">4</span>
                </div>
                <span>{t('legend.closeZoomDescription')}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              {t('legend.zoomLevelsHelp')}
            </div>
          </div>

          {/* Bike Angel Badges */}
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('legend.bikeAngelBadges')}
            </div>
            {bikeAngelBadges.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 py-1">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  <span className="text-[8px] font-bold text-white">{item.value}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              {t('legend.badgesHelp')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
