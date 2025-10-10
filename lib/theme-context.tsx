'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Apply theme to document
  const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement;
    const resolved = theme === 'system' ? getSystemTheme() : theme;

    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;

    setResolvedTheme(resolved);
  };

  // Set theme and save to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme || 'system';

    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update when theme changes
  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mounted]);

  // Prevent flash of incorrect theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
