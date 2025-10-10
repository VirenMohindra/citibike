'use client';

import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { t } = useI18n();
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    // Toggle between light and dark only
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={t('theme.toggle')}
      title={t('theme.toggle')}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
}
