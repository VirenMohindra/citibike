'use client';

/**
 * Public Data Import Page
 * Allows importing aggregate Citibike trip data for benchmarking
 */

import PublicDataImport from '@/components/analysis/PublicDataImport';

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PublicDataImport />
      </div>
    </div>
  );
}
