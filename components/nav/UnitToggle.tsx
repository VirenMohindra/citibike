'use client';

import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export default function UnitToggle() {
  const { t } = useI18n();
  const { distanceUnit, setDistanceUnit } = useAppStore();

  const toggleUnit = () => {
    setDistanceUnit(distanceUnit === 'miles' ? 'km' : 'miles');
  };

  return (
    <button
      onClick={toggleUnit}
      className="flex items-center justify-center w-9 h-9 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      title={t('common.toggleDistanceUnit')}
      aria-label={t('common.toggleDistanceUnit')}
    >
      <span className="text-sm font-medium">{distanceUnit === 'miles' ? 'mi' : 'km'}</span>
    </button>
  );
}
