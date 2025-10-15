'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface TripReplayControlsProps {
  isReplaying: boolean;
  isPaused: boolean;
  progress: number; // 0-100
  speed: number; // 1, 2, 4, 8
  canReplay: boolean;
  elapsedTime: string; // "00:15"
  totalTime: string; // "00:45"
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (progress: number) => void; // 0-100
}

export default function TripReplayControls({
  isReplaying,
  isPaused,
  progress,
  speed,
  canReplay,
  elapsedTime,
  totalTime,
  onPlayPause,
  onReset,
  onSpeedChange,
  onSeek,
}: TripReplayControlsProps) {
  const { t } = useI18n();
  const speeds = [1, 2, 4, 8];

  if (!canReplay) {
    return null;
  }

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="absolute bottom-24 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3 lg:p-4 w-[calc(100%-2rem)] max-w-[400px]">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>{elapsedTime}</span>
          <span>{totalTime}</span>
        </div>
        <div
          className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
        {/* Play/Pause and Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            aria-label={isReplaying && !isPaused ? t('tripReplay.pause') : t('tripReplay.play')}
          >
            {isReplaying && !isPaused ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            onClick={onReset}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            aria-label={t('tripReplay.reset')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">
            {t('tripReplayControls.speed')}
          </span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s}
              {t('tripReplayControls.times')}
            </button>
          ))}
        </div>
      </div>

      {/* Status Text */}
      {isReplaying && !isPaused && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('tripReplayControls.replayingAt')} {speed}
            {t('tripReplayControls.xSpeed')}
          </span>
        </div>
      )}
    </div>
  );
}
