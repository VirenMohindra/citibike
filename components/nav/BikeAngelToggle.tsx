'use client';

import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/hooks/useCity';

export default function BikeAngelToggle() {
  const { t } = useI18n();
  const { showBikeAngelRewards, setShowBikeAngelRewards, citibikeUser } = useAppStore();
  const { cityConfig } = useCity();

  // Only show toggle if user is authenticated AND city supports Bike Angel
  if (!citibikeUser || !cityConfig.features.bikeAngel) {
    return null;
  }

  const toggleRewards = () => {
    setShowBikeAngelRewards(!showBikeAngelRewards);
  };

  return (
    <button
      onClick={toggleRewards}
      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
        showBikeAngelRewards
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      title={t('bikeAngel.toggleRewards')}
      aria-label={t('bikeAngel.toggleRewards')}
    >
      <span className="text-base">⭐</span>
    </button>
  );
}
