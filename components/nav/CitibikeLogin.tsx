'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/toast-context';
import { API_ROUTES } from '@/config/routes';
import { db, createSyncManager } from '@/lib/db';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import UserProfile from './UserProfile';

type LoginStep = 'phone' | 'otp' | 'email_challenge' | 'complete';

interface CitibikeLoginProps {
  compact?: boolean; // For navbar display
}

export default function CitibikeLogin({ compact = false }: CitibikeLoginProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { addToast } = useToast();
  const { citibikeUser, setCitibikeUser, setSyncState } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<LoginStep>('phone');

  // Enable automatic token refresh when user is logged in
  useTokenRefresh();

  // Phone step
  const [phoneNumber, setPhoneNumber] = useState('');

  // OTP step
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  // Email challenge step
  const [emailChallenge, setEmailChallenge] = useState<{
    maskedEmail: string;
    challengeData: {
      error: string;
      challenges: Array<{ identifier: string; data: string }>;
    };
  } | null>(null);
  const [emailInput, setEmailInput] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Actual trip count from IndexedDB
  const [actualTripCount, setActualTripCount] = useState<number | null>(null);

  // Profile modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Don't check if user is already loaded
      if (citibikeUser) return;

      try {
        const response = await fetch(API_ROUTES.USER.PROFILE);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Fetch subscription info to get membership details
            const subResponse = await fetch(API_ROUTES.USER.SUBSCRIPTIONS);
            if (subResponse.ok) {
              const subData = await subResponse.json();
              if (subData.success && subData.subscriptions?.subscriptions?.[0]) {
                const subscription = subData.subscriptions.subscriptions[0];
                data.user.membershipType = subscription.package_title || data.user.membershipType;
              }
            }

            setCitibikeUser(data.user);
          }
        }
      } catch {
        // Silently fail - user just stays logged out
      }
    };

    checkAuth();
  }, [citibikeUser, setCitibikeUser]);

  // Load actual trip count from IndexedDB
  useEffect(() => {
    const loadTripCount = async () => {
      if (!citibikeUser) {
        setActualTripCount(null);
        return;
      }

      try {
        const count = await db.trips.where({ userId: citibikeUser.id }).count();
        setActualTripCount(count);
      } catch (error) {
        console.error('Error loading trip count:', error);
      }
    };

    loadTripCount();
  }, [citibikeUser]);

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(API_ROUTES.AUTH.OTP.REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.error.sendCode'));
      }

      // Store session info if returned
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      if (data.expiresIn) {
        setExpiresIn(data.expiresIn);
      }

      setMessage(data.message || t('auth.messages.codeSent'));
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(API_ROUTES.AUTH.OTP.VERIFY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          code: otpCode,
          sessionId,
        }),
      });

      const data = await response.json();

      // Check if it's an email challenge (even if response is 401)
      if (data.error === 'challenge_required' && data.challenges) {
        const emailChallengeData = data.challenges.find(
          (c: { identifier: string; data: string }) => c.identifier === 'email_match'
        );
        if (emailChallengeData) {
          setEmailChallenge({
            maskedEmail: emailChallengeData.data,
            challengeData: data,
          });
          setStep('email_challenge');
          setError('');
          setIsLoading(false);
          return;
        }
      }

      // If not a challenge and response is not ok, throw error
      if (!response.ok) {
        throw new Error(data.error || t('auth.error.verificationFailed'));
      }

      // Store user in state
      setCitibikeUser(data.user);

      // Trigger background auto-sync of trips and trip details
      triggerAutoSync(data.user.id);

      // Reset form
      setPhoneNumber('');
      setOtpCode('');
      setSessionId(null);
      setStep('phone');
      setIsOpen(false);

      // Show success message
      addToast(t('auth.messages.successfulConnection'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Verify Email Challenge
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(API_ROUTES.AUTH.OTP.CHALLENGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          code: otpCode,
          email: emailInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.error.emailVerificationFailed'));
      }

      // Store user in state
      setCitibikeUser(data.user);

      // Trigger background auto-sync of trips and trip details
      triggerAutoSync(data.user.id);

      // Fetch full profile data
      try {
        const profileResponse = await fetch(API_ROUTES.USER.PROFILE);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success) {
            // Also fetch subscription details
            const subResponse = await fetch(API_ROUTES.USER.SUBSCRIPTIONS);
            if (subResponse.ok) {
              const subData = await subResponse.json();
              if (subData.success && subData.subscriptions?.subscriptions?.[0]) {
                const subscription = subData.subscriptions.subscriptions[0];
                profileData.user.membershipType =
                  subscription.package_title || profileData.user.membershipType;
              }
            }

            setCitibikeUser(profileData.user);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        // Continue anyway with basic user data
      }

      // Reset form
      setPhoneNumber('');
      setOtpCode('');
      setEmailInput('');
      setEmailChallenge(null);
      setSessionId(null);
      setStep('phone');
      setIsOpen(false);

      // Show success message
      addToast(t('auth.messages.successfulConnection'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync trips and trip details after successful login (background task)
  const triggerAutoSync = (userId: string) => {
    // Use Promise.resolve().then() to run in background without blocking UI
    Promise.resolve().then(async () => {
      try {
        addToast(t('toast.autoSync.started'), 'info');
        console.log('🔄 Auto-syncing trips and details after login...');
        const syncManager = createSyncManager(userId);

        // Step 1: Sync trip list
        await syncManager.syncTrips((progress) => {
          console.log(`📋 Syncing trips: page ${progress.page}, ${progress.totalSynced} total`);
        });

        addToast(t('toast.autoSync.tripsComplete'), 'success');

        // Step 2: Sync trip details (limited to first 50 trips on auto-sync)
        console.log('🔄 Auto-syncing trip details (limited to first 50 trips)...');
        const detailsResult = await syncManager.syncTripDetails(
          (progress) => {
            console.log(
              `📊 Details: ${progress.completed}/${progress.total} (${Math.round((progress.completed / progress.total) * 100)}%)`
            );
          },
          {
            rateLimit: 500, // 2 req/sec
            batchSize: 1,
            maxTrips: 50, // Limit initial auto-sync
          }
        );

        console.log('✅ Auto-sync complete - trips and details loaded');

        // Show final success message
        if (detailsResult.failed > 0) {
          addToast(
            `${t('toast.autoSync.detailsComplete')} (${detailsResult.failed} ${t('tripsPage.sync.progressFailed')})`,
            'info'
          );
        } else {
          addToast(t('toast.autoSync.allComplete'), 'success');
        }
      } catch (error) {
        console.error('❌ Auto-sync failed (non-blocking):', error);
        addToast(t('toast.autoSync.detailsFailed'), 'error');
      }
    });
  };

  const handleLogout = async () => {
    try {
      await fetch(API_ROUTES.AUTH.LOGOUT, { method: 'POST' });
      setCitibikeUser(null);
      setSyncState({
        lastSyncTimestamp: null,
        syncStatus: 'idle',
        totalTrips: 0,
      });
      // Redirect to root page
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError('');
    setMessage('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('phone');
    setPhoneNumber('');
    setOtpCode('');
    setError('');
    setMessage('');
    setSessionId(null);
  };

  // If user is logged in, show account info
  if (citibikeUser) {
    // Compact version for navbar
    if (compact) {
      return (
        <>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-6 h-6 bg-[#0066CC] rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {citibikeUser.firstName?.charAt(0) || citibikeUser.phoneNumber?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {citibikeUser.firstName || t('account.profile.defaultName')}
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                {actualTripCount !== null && t('account.stats.rides', { count: actualTripCount })}
              </div>
            </div>
          </button>
          <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
      );
    }

    // Full version for sidebar
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#0066CC] rounded-full flex items-center justify-center text-white font-semibold">
              {citibikeUser.firstName?.charAt(0) || citibikeUser.phoneNumber?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {citibikeUser.firstName && citibikeUser.lastName
                  ? `${citibikeUser.firstName} ${citibikeUser.lastName}`
                  : citibikeUser.phoneNumber || t('account.profile.defaultUser')}
              </div>
              <div className="text-xs text-gray-600">
                {citibikeUser.membershipType}
                {actualTripCount !== null &&
                  ` • ${t('account.stats.rides', { count: actualTripCount })}`}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-600 hover:text-gray-900 underline"
          >
            {t('auth.buttons.logout')}
          </button>
        </div>
        <div className="text-xs text-gray-600 border-t border-gray-100 pt-2 mt-2">
          🔒 {t('auth.security.credentialsStored')}
        </div>
      </div>
    );
  }

  // If not logged in, show login button/modal
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={
          compact
            ? 'bg-[#0066CC] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#0052A3] transition-colors flex items-center space-x-1 whitespace-nowrap'
            : 'w-full bg-[#0066CC] text-white rounded-lg py-3 px-4 font-medium hover:bg-[#0052A3] transition-colors flex items-center justify-center space-x-2'
        }
      >
        <span>{compact ? t('auth.buttons.login') : t('auth.buttons.connectAccount')}</span>
        {!compact && <span className="text-lg">→</span>}
      </button>

      {/* Login Modal - Rendered as Portal to document.body */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {step === 'otp' && (
                    <button onClick={handleBack} className="text-gray-600 hover:text-gray-900 mr-2">
                      ←
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">
                    {step === 'phone' ? t('auth.phone.title') : t('auth.otp.title')}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-4">
                {step === 'phone'
                  ? t('auth.phone.description')
                  : t('auth.otp.description', { phone: phoneNumber })}
              </p>

              {/* Messages */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {message && !error && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              {/* Step 1: Phone Number */}
              {step === 'phone' && (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.phone.label')}
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                      placeholder={t('auth.phone.placeholder')}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-600 mt-1">{t('auth.phone.helper')}</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#0066CC] text-white rounded-lg py-3 px-4 font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('common.loading') : t('auth.buttons.sendCode')}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.otp.label')}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent text-center text-2xl tracking-widest text-gray-900 placeholder:text-gray-400"
                      placeholder={t('auth.otp.placeholder')}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {t('auth.otp.codeSentFrom')}
                      {expiresIn &&
                        ` • ${t('auth.otp.expiresIn', { minutes: Math.floor(expiresIn / 60) })}`}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 4}
                    className="w-full bg-[#0066CC] text-white rounded-lg py-3 px-4 font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('common.loading') : t('auth.buttons.verifyCode')}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={isLoading}
                    className="w-full text-sm text-[#0066CC] hover:underline"
                  >
                    {t('auth.otp.didntReceive')}
                  </button>
                </form>
              )}

              {/* Step 3: Email Challenge */}
              {step === 'email_challenge' && emailChallenge && (
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900 font-medium mb-2">
                      {t('auth.challenge.securityTitle')}
                    </p>
                    <p className="text-xs text-blue-700">
                      {t('auth.challenge.securityDescription')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.challenge.label')}
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      {t('auth.challenge.hint')}: {emailChallenge.maskedEmail}
                    </p>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                      placeholder={t('auth.challenge.placeholder')}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !emailInput}
                    className="w-full bg-[#0066CC] text-white rounded-lg py-3 px-4 font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t('common.loading') : t('auth.buttons.verifyEmail')}
                  </button>
                </form>
              )}

              {/* Privacy Notice */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">🔒</span>
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold mb-1">{t('auth.privacy.title')}</p>
                    <ul className="space-y-1">
                      <li>• {t('auth.privacy.phoneVerification')}</li>
                      <li>• {t('auth.privacy.dataLocal')}</li>
                      <li>• {t('auth.privacy.secureCookies')}</li>
                      <li>• {t('auth.privacy.personalUse')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Alternative Option */}
              {step === 'phone' && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      addToast(t('auth.messages.manualUploadComingSoon'), 'info');
                    }}
                    className="text-sm text-[#0066CC] hover:underline"
                  >
                    {t('auth.buttons.manualUpload')}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
