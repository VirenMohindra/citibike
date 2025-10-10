'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import NavBar from '@/components/nav/NavBar';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('privacy.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t('privacy.lastUpdated')}
          </p>

          <p className="text-gray-700 dark:text-gray-300 mb-8">{t('privacy.intro')}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('privacy.dataCollection.title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {t('privacy.dataCollection.description')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>{t('privacy.thirdParty.mapbox')}</li>
              <li>{t('privacy.thirdParty.gbfs')}</li>
              <li>{t('privacy.thirdParty.citibikeApi')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('privacy.cookies.title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">{t('privacy.cookies.description')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('privacy.dataStorage.title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {t('privacy.dataStorage.description')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('privacy.contact.title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {t('privacy.contact.description')}
              <a
                href="https://github.com/virenmohindra/citibike/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('common.github')}
              </a>
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('common.back')}
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              {t('common.terms')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
