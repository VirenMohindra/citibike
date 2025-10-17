'use client';

import { useDemoInitializer } from '@/hooks/useDemoInitializer';

/**
 * Client component wrapper for the demo initializer hook
 * This allows the hook to be used in the server-side layout component
 */
export default function DemoInitializerWrapper() {
  useDemoInitializer();
  return null;
}
