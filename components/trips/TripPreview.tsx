'use client';

import { Activity, Eye, MapPin, TrendingUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import CitibikeLogin from '@/components/nav/CitibikeLogin';
import NavBar from '@/components/nav/NavBar';

export default function TripPreview() {
  const { t } = useI18n();

  const features = [
    {
      icon: MapPin,
      text: t('tripsPage.preview.features.visualize'),
    },
    {
      icon: TrendingUp,
      text: t('tripsPage.preview.features.heatmap'),
    },
    {
      icon: Activity,
      text: t('tripsPage.preview.features.stats'),
    },
    {
      icon: Eye,
      text: t('tripsPage.preview.features.insights'),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      {/* Background: Blurred Demo Screenshot */}
      <div className="flex-1 relative overflow-hidden">
        {/* Demo Screenshot with Blur */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/demo/previous-trips.png)',
            filter: 'blur(2px) brightness(0.5)',
            transform: 'scale(1.1)', // Prevent blur edge artifacts
          }}
        />

        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />

        {/* Centered Glassmorphism Card */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('tripsPage.preview.title')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('tripsPage.preview.subtitle')}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                    <feature.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA Button - Uses CitibikeLogin component */}
            <div className="space-y-4">
              <CitibikeLogin compact={false} />

              {/* Disclaimer */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {t('tripsPage.preview.demoNotice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
