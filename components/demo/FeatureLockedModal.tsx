'use client';

import { createPortal } from 'react-dom';
import { Lock, X } from 'lucide-react';
import { transitionToRealLogin } from '@/lib/demo/exit';
import { useI18n } from '@/lib/i18n';

interface FeatureLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  description?: string;
}

/**
 * DEMO MODE: Modal shown when user tries to access a restricted feature
 * Explains that feature requires real account and provides login CTA
 */
export default function FeatureLockedModal({
  isOpen,
  onClose,
  featureName,
  description,
}: FeatureLockedModalProps) {
  const { t } = useI18n();

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const handleLogin = async () => {
    onClose();
    await transitionToRealLogin();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      role="dialog"
      aria-labelledby="feature-locked-title"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="feature-locked-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2"
        >
          {featureName} {t('demo.featureLockedModal.requiresAccount')}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {description ||
            'Log in with your Citibike account to access this feature and sync your trips, connect Strava, and more.'}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full bg-[#0066CC] text-white rounded-lg py-3 px-4 font-medium hover:bg-[#0052A3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:ring-offset-2"
          >
            {t('demo.featureLockedModal.loginNow')}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg py-3 px-4 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            {t('demo.featureLockedModal.continueExploring')}
          </button>
        </div>

        {/* Info footer */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            <span className="font-semibold">{t('demo.featureLockedModal.demoModeLabel')}</span>{' '}
            {t('demo.featureLockedModal.demoModeDescription')}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
