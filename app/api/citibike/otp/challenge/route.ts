/**
 * Citibike Email Challenge Endpoint (REFACTORED)
 * Step 4: Verify email address and complete authentication
 * Uses centralized configuration and API client
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getLyftClient } from '@/lib/api/lyft-client';
import { ApiError } from '@/lib/api/client';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  SESSION_COOKIES,
} from '@/lib/api/session';
import { ErrorCode, VALIDATION_PATTERNS } from '@/config/constants';
import type { CitibikeAuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Get temporary session data
    const storedPhone = cookieStore.get(SESSION_COOKIES.TEMP_PHONE)?.value;

    if (!storedPhone) {
      return NextResponse.json(
        { error: 'Session expired. Please request a new code.' },
        { status: 401 }
      );
    }

    // Get email and code from request
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required', code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // Validate email format
    if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // Validate code format (4-6 digits)
    if (!VALIDATION_PATTERNS.OTP_CODE.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Code should be 4-6 digits.', code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // Use unified Lyft client
    const lyftClient = getLyftClient();
    const authResponse = await lyftClient.verifyEmailChallenge(storedPhone, code, email);

    // Store tokens in httpOnly cookies
    cookieStore.set(
      SESSION_COOKIES.ACCESS_TOKEN,
      authResponse.accessToken,
      getAccessTokenCookieOptions()
    );

    if (authResponse.refreshToken) {
      cookieStore.set(
        SESSION_COOKIES.REFRESH_TOKEN,
        authResponse.refreshToken,
        getRefreshTokenCookieOptions()
      );
    }

    // Store expiry time in a non-httpOnly cookie so client can check it
    // This is not sensitive data, just a timestamp
    if (authResponse.expiresAt) {
      cookieStore.set('citibike_token_expires_at', authResponse.expiresAt.toString(), {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    // Clear temporary cookies
    cookieStore.delete(SESSION_COOKIES.TEMP_SESSION);
    cookieStore.delete(SESSION_COOKIES.TEMP_CLIENT_SESSION);
    cookieStore.delete(SESSION_COOKIES.TEMP_PHONE);

    // Return success response (don't expose actual tokens)
    const response: CitibikeAuthResponse = {
      accessToken: 'stored_in_cookie',
      refreshToken: authResponse.refreshToken ? 'stored_in_cookie' : undefined,
      expiresAt: authResponse.expiresAt,
      user: {
        ...authResponse.user,
        phoneNumber: storedPhone,
        email,
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Email challenge error:', error);

    // Handle API errors
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        error: 'An error occurred verifying email',
        code: ErrorCode.SERVER_ERROR,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
