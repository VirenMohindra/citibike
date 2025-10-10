'use client';

import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { RouteStep } from '@/lib/types';
import { ChevronRight, Navigation, Clock, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

export function NavigationPanel() {
  const { t, formatDistance } = useI18n();
  const { route, startStation, endStation } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Reset current step when route changes
    setCurrentStepIndex(0);
  }, [route]);

  if (!route || !route.steps || route.steps.length === 0 || !startStation || !endStation) {
    return null;
  }

  const steps = route.steps; // TypeScript now knows steps is defined

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getManeuverIcon = (type?: string, modifier?: string) => {
    const iconClass = 'w-5 h-5 text-blue-600';

    // Simplified icon selection based on maneuver type
    if (type === 'depart') return <MapPin className={iconClass} />;
    if (type === 'arrive') return <MapPin className={iconClass} />;
    if (modifier?.includes('left')) return <ChevronRight className={`${iconClass} rotate-180`} />;
    if (modifier?.includes('right')) return <ChevronRight className={iconClass} />;
    return <Navigation className={iconClass} />;
  };

  const getManeuverInstruction = (step: RouteStep, index: number) => {
    // Enhanced instruction formatting
    let instruction = step.instruction;

    // Add context for first and last steps
    if (index === 0 && startStation) {
      instruction = t('navigation.startFrom', { station: startStation.name, instruction });
    } else if (index === steps.length - 1 && endStation) {
      instruction = t('navigation.arriveAt', { station: endStation.name, instruction });
    }

    return instruction;
  };

  return (
    <div className="border-t border-gray-200">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Navigation className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('navigation.title')}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(route.duration)}
                </span>
                <span>•</span>
                <span>{formatDistance(route.distance)}</span>
                <span>•</span>
                <span>{t('navigation.steps', { count: steps.length })}</span>
              </div>
            </div>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Steps List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
                ${index === currentStepIndex ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''}
              `}
              onClick={() => setCurrentStepIndex(index)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getManeuverIcon(step.maneuver?.type, step.maneuver?.modifier)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${index === currentStepIndex ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {getManeuverInstruction(step, index)}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistance(step.distance)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(step.duration)}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-medium text-gray-400">
                  {index + 1}/{steps.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
