/**
 * Citibike Token Refresh Endpoint
 * Handles automatic token refresh using stored refresh token
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';
import { ApiError } from '@/lib/api/client';
import { setAuthCookies } from '@/lib/api/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('citibike_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
    }

    // Attempt to refresh the token
    const lyftClient = getLyftClient();
    const authResponse = await lyftClient.refreshAccessToken(refreshToken);

    // Store new tokens in cookies
    const response = NextResponse.json({ success: true });
    setAuthCookies(response, {
      accessToken: authResponse.accessToken,
      expiresAt: authResponse.expiresAt,
      refreshToken: authResponse.refreshToken || refreshToken, // Use old token if new one not provided
    });

    return response;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);

    // If refresh fails, clear all auth cookies
    if (error instanceof ApiError && error.statusCode === 401) {
      const response = NextResponse.json(
        { error: 'Refresh token expired. Please log in again.' },
        { status: 401 }
      );

      // Clear all auth cookies
      const cookieStore = await cookies();
      cookieStore.delete('citibike_access_token');
      cookieStore.delete('citibike_refresh_token');
      cookieStore.delete('citibike_token_expires_at');

      return response;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token refresh failed' },
      { status: 500 }
    );
  }
}
