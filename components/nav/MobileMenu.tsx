'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { PAGES } from '@/config/routes';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme-context';
import { useCity } from '@/lib/hooks/useCity';
import { Sun, Moon } from 'lucide-react';
import CitibikeLogin from './CitibikeLogin';
import { CitySelector } from './CitySelector';

export default function MobileMenu() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const {
    distanceUnit,
    setDistanceUnit,
    showBikeAngelRewards,
    setShowBikeAngelRewards,
    citibikeUser,
  } = useAppStore();
  const { setTheme, resolvedTheme } = useTheme();
  const { cityConfig } = useCity();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const toggleUnit = () => {
    setDistanceUnit(distanceUnit === 'miles' ? 'km' : 'miles');
  };

  const toggleBikeAngel = () => {
    setShowBikeAngelRewards(!showBikeAngelRewards);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="md:hidden flex items-center justify-center w-9 h-9 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label={isOpen ? t('common.closeMenu') : t('common.openMenu')}
      >
        {isOpen ? (
          // X icon when menu is open
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Hamburger icon when menu is closed
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <div className="fixed top-[60px] right-0 w-72 bg-white dark:bg-gray-800 shadow-2xl z-50 md:hidden border-l border-gray-200 dark:border-gray-700 max-h-[calc(100vh-60px)] overflow-y-auto">
            <nav className="py-2">
              {/* City Selector */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <CitySelector />
              </div>

              {/* Navigation Links */}
              <div className="py-2">
                <Link
                  href={PAGES.TRIPS}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="font-medium">{t('page.tripHistory')}</span>
                </Link>

                <a
                  href="https://github.com/virenmohindra/citibike"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-medium">{t('common.github')}</span>
                </a>
              </div>

              {/* Settings Section */}
              <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.settings')}
                  </h3>
                </div>

                {/* Unit Toggle Row */}
                <button
                  onClick={toggleUnit}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {t('common.units')}
                  </span>
                  <div className="flex items-center justify-center w-9 h-9 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium">
                      {distanceUnit === 'miles' ? 'mi' : 'km'}
                    </span>
                  </div>
                </button>

                {/* Bike Angel Toggle Row */}
                {citibikeUser && cityConfig.features.bikeAngel && (
                  <button
                    onClick={toggleBikeAngel}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {t('common.bikeAngel')}
                    </span>
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                        showBikeAngelRewards
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-base">⭐</span>
                    </div>
                  </button>
                )}

                {/* Theme Toggle Row */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {t('common.theme')}
                  </span>
                  <div className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {resolvedTheme === 'dark' ? (
                      <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    )}
                  </div>
                </button>
              </div>

              {/* Login/Profile Section */}
              <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3">
                  <CitibikeLogin compact={false} />
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
