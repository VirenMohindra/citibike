/**
 * Internationalization (i18n) System
 * Provides translation support throughout the application
 */

'use client';

import React, { createContext, useContext, useMemo } from 'react';
import en from './translations/en.json';
import { useAppStore } from '@/lib/store';

// ============================================
// Types
// ============================================

type TranslationKeys = typeof en;
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

interface TranslationParams {
  [key: string]: string | number;
}

interface I18nContextValue {
  locale: string;
  translations: TranslationKeys;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (date: Date | string, format?: 'short' | 'long' | 'time') => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number) => string;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

// ============================================
// Context
// ============================================

const I18nContext = createContext<I18nContextValue | null>(null);

// ============================================
// Provider Component
// ============================================

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: string;
}

export function I18nProvider({ children, locale = 'en' }: I18nProviderProps) {
  const distanceUnit = useAppStore((state) => state.distanceUnit);

  const value = useMemo<I18nContextValue>(() => {
    // Translation function
    const t = (key: TranslationKey, params?: TranslationParams): string => {
      // Split the key to navigate nested objects
      const keys = key.split('.');
      let translation: unknown = en;

      for (const k of keys) {
        if (translation && typeof translation === 'object' && k in translation) {
          translation = (translation as Record<string, unknown>)[k];
        } else {
          console.warn(`Translation key not found: ${key}`);
          return key; // Return the key itself if translation is missing
        }
      }

      if (typeof translation !== 'string') {
        console.warn(`Translation for key ${key} is not a string`);
        return key;
      }

      // Replace parameters like {{param}}
      if (params) {
        return (translation as string).replace(/\{\{(\w+)\}\}/g, (match, param) => {
          return params[param]?.toString() || match;
        });
      }

      return translation as string;
    };

    // Date formatting
    const formatDate = (
      date: Date | string,
      format: 'short' | 'long' | 'time' = 'short'
    ): string => {
      const d = typeof date === 'string' ? new Date(date) : date;

      switch (format) {
        case 'long':
          return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        case 'time':
          return d.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          });
        case 'short':
        default:
          return d.toLocaleDateString(locale);
      }
    };

    // Number formatting
    const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(num);
    };

    // Currency formatting
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    // Distance formatting (meters to km/mi)
    const formatDistance = (meters: number): string => {
      if (typeof meters !== 'number' || isNaN(meters)) {
        return distanceUnit === 'miles' ? '0 ft' : '0 m';
      }

      if (distanceUnit === 'miles') {
        const miles = meters / 1609.34;
        if (miles >= 1) {
          return `${miles.toFixed(1)} mi`;
        }
        const feet = meters * 3.28084;
        return `${Math.round(feet)} ft`;
      } else {
        const km = meters / 1000;
        if (km >= 1) {
          return `${km.toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
      }
    };

    // Duration formatting (seconds to human-readable)
    const formatDuration = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days}d ${hours % 24}h`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m`;
      }
      return `${seconds}s`;
    };

    return {
      locale,
      translations: en,
      t,
      formatDate,
      formatNumber,
      formatCurrency,
      formatDistance,
      formatDuration,
    };
  }, [locale, distanceUnit]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// ============================================
// Re-export types
// ============================================

export type { TranslationParams };
