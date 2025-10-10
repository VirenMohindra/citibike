/**
 * Citibike OTP Request Endpoint (REFACTORED)
 * Uses centralized configuration and API client
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';
import { ApiError } from '@/lib/api/client';
import { getSessionCookieOptions, SESSION_COOKIES } from '@/lib/api/session';
import { VALIDATION_PATTERNS, AUTH_CONSTANTS, ErrorCode } from '@/config/constants';
import type { OTPRequestBody, OTPRequestResponse } from '@/lib/types';

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digits
  const digits = phoneNumber.replace(/\D/g, '');

  // Add country code if missing
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (!digits.startsWith('+')) {
    return `+${digits}`;
  }

  return digits;
}

/**
 * POST /api/citibike/otp/request
 * Request OTP code via SMS
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: OTPRequestBody = await request.json();
    let { phoneNumber } = body;

    // Validate input
    if (!phoneNumber) {
      return NextResponse.json(
        {
          error: 'Phone number is required',
          code: ErrorCode.INVALID_PHONE,
        },
        { status: 400 }
      );
    }

    // Format phone number
    phoneNumber = formatPhoneNumber(phoneNumber);

    // Validate format
    if (!VALIDATION_PATTERNS.PHONE.test(phoneNumber)) {
      return NextResponse.json(
        {
          error: 'Invalid phone number format. Must be a valid US number.',
          code: ErrorCode.INVALID_PHONE,
        },
        { status: 400 }
      );
    }

    // Get API client
    const lyftClient = getLyftClient();

    // Check if credentials are configured
    if (!lyftClient.hasCredentials()) {
      return NextResponse.json(
        {
          error: 'Authentication is not configured. Please check server configuration.',
          code: ErrorCode.INVALID_CREDENTIALS,
        },
        { status: 503 }
      );
    }

    // Request OTP
    const otpResponse = await lyftClient.requestOtp(phoneNumber);

    // Store session data in temporary cookies for verification step
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions(AUTH_CONSTANTS.SESSION_EXPIRY_SECONDS);

    cookieStore.set(SESSION_COOKIES.TEMP_PHONE, phoneNumber, cookieOptions);
    cookieStore.set(SESSION_COOKIES.TEMP_SESSION, otpResponse.sessionInfo.xSession, cookieOptions);
    cookieStore.set(
      SESSION_COOKIES.TEMP_CLIENT_SESSION,
      otpResponse.sessionInfo.clientSessionId,
      cookieOptions
    );

    // Return success response
    const response: OTPRequestResponse = {
      success: true,
      message: otpResponse.message,
      expiresIn: otpResponse.expiresIn || AUTH_CONSTANTS.OTP_EXPIRY_SECONDS,
    };

    return NextResponse.json(response);
  } catch (error) {
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

    // Log unexpected errors
    console.error('OTP request error:', error);

    // Return generic error
    return NextResponse.json(
      {
        error: 'An error occurred sending verification code',
        code: ErrorCode.SERVER_ERROR,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/citibike/otp/request
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
