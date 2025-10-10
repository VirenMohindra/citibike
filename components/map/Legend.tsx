'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Legend() {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    { color: '#10B981', label: 'Many bikes available', subtext: '5+ bikes' },
    { color: '#F59E0B', label: 'Few bikes available', subtext: '1-4 bikes' },
    { color: '#9CA3AF', label: 'No bikes available', subtext: '0 bikes' },
    { color: '#3B82F6', label: 'Start station', subtext: 'Your pickup point' },
    { color: '#EF4444', label: 'End station', subtext: 'Your destination' },
    { color: '#8B5CF6', label: 'Waypoint', subtext: 'Stop along route' },
  ];

  const bikeTypeIndicators = [
    { icon: '🚲', label: 'Regular bikes only' },
    { icon: '⚡', label: 'E-bikes available' },
    { icon: '∅', label: 'No bikes' },
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
        </div>
      )}
    </div>
  );
}
