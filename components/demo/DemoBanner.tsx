'use client';

import { LogIn, User, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { transitionToRealLogin } from '@/lib/demo/exit';
import { useI18n } from '@/lib/i18n';
import { getPersonaDisplayName } from '@/lib/demo/personas';

/**
 * DEMO MODE: Banner displayed at top of app when in demo mode
 * Informs user they're viewing demo data and provides login CTA
 */
export default function DemoBanner() {
  const { isDemoMode, demoPersona, demoBannerDismissed, setDemoBannerDismissed } = useAppStore();
  const { t } = useI18n();

  // Get persona display name from persona ID
  const personaName = demoPersona ? getPersonaDisplayName(demoPersona) : 'Demo User';

  // Only show if in demo mode and not dismissed
  if (!isDemoMode || demoBannerDismissed) {
    return null;
  }

  const handleLogin = async () => {
    await transitionToRealLogin();
  };

  return (
    <div
      className="sticky top-0 z-50 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-lg border-b-2 border-amber-600"
      role="banner"
      aria-label="Demo mode notification"
      style={{ minHeight: '56px' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Persona Avatar */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-amber-900">
                <span className="hidden sm:inline">
                  {t('demo.banner.modeLabel')} {personaName}
                </span>
                <span className="sm:hidden">
                  {t('demo.banner.modeLabelShort')} {personaName}
                </span>
              </p>
              <p className="text-xs sm:text-[10px] text-amber-800 mt-0.5 block">
                {t('demo.banner.description')}
              </p>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-amber-800 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 focus:ring-offset-amber-400"
              aria-label="Log in with your Citibike account"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('demo.banner.loginButton')}</span>
              <span className="sm:hidden">{t('demo.banner.loginButton')}</span>
            </button>
            <button
              onClick={() => setDemoBannerDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-amber-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-700"
              aria-label="Dismiss demo banner"
            >
              <X className="w-4 h-4 text-amber-900" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
