import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';

// ============================================
// Server-Side Cache
// ============================================

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const tripDetailsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track in-flight requests to prevent duplicate fetches
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Get cached trip details if available and fresh
 */
function getCachedTripDetails(rideId: string): unknown | null {
  const cached = tripDetailsCache.get(rideId);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    tripDetailsCache.delete(rideId);
    return null;
  }

  return cached.data;
}

/**
 * Cache trip details
 */
function cacheTripDetails(rideId: string, data: unknown): void {
  tripDetailsCache.set(rideId, {
    data,
    timestamp: Date.now(),
  });

  // Simple cache size limit (keep last 1000 entries)
  if (tripDetailsCache.size > 1000) {
    const firstKey = tripDetailsCache.keys().next().value;
    if (firstKey) {
      tripDetailsCache.delete(firstKey);
    }
  }
}

// ============================================
// API Route Handler
// ============================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('citibike_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract ride ID from URL params
    const { id: rideId } = await params;

    if (!rideId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Check cache first
    const cachedData = getCachedTripDetails(rideId);
    if (cachedData) {
      console.log(`✅ Cache hit for trip ${rideId}`);
      return NextResponse.json(cachedData);
    }

    // Check if there's already an in-flight request for this trip
    const existingRequest = inFlightRequests.get(rideId);
    if (existingRequest) {
      console.log(`⏳ Request already in-flight for trip ${rideId}, waiting...`);
      const data = await existingRequest;
      return NextResponse.json(data);
    }

    // Create new request and track it
    console.log(`🔄 Cache miss for trip ${rideId}, fetching from API...`);
    const requestPromise = (async () => {
      try {
        const lyftClient = getLyftClient();
        const tripDetails = await lyftClient.getTripDetails(accessToken, rideId);

        // Cache the response
        const response = {
          success: true,
          trip: tripDetails,
        };
        cacheTripDetails(rideId, response);

        return response;
      } finally {
        // Remove from in-flight requests when done
        inFlightRequests.delete(rideId);
      }
    })();

    // Track the in-flight request
    inFlightRequests.set(rideId, requestPromise);

    const data = await requestPromise;
    return NextResponse.json(data);
  } catch (error: unknown) {
    // Extract ride ID for logging (may not be available if params parsing failed)
    const rideIdForLog = await params.then((p) => p.id).catch(() => 'unknown');

    // Enhanced error logging
    const apiError = error as {
      statusCode?: number;
      code?: string;
      message?: string;
      details?: unknown;
      response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
      };
    };

    // Log detailed error information
    console.error(`❌ Failed to fetch trip ${rideIdForLog}:`, {
      tripId: rideIdForLog,
      errorCode: apiError.code,
      statusCode: apiError.statusCode || apiError.response?.status,
      statusText: apiError.response?.statusText,
      message: apiError.message,
      details: apiError.details || apiError.response?.data,
    });

    // Authentication errors
    if (apiError.statusCode === 401 || apiError.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          error: 'Authentication expired',
          code: apiError.code,
          tripId: rideIdForLog,
          needsReauth: true,
        },
        { status: 401 }
      );
    }

    // Trip not found
    if (apiError.statusCode === 404) {
      console.warn(`⚠️  Trip ${rideIdForLog} not found (404) - may be deleted or invalid ID`);
      return NextResponse.json(
        { error: 'Trip not found', code: apiError.code || 'NOT_FOUND', tripId: rideIdForLog },
        { status: 404 }
      );
    }

    // Rate limiting
    if (apiError.code === 'RATE_LIMITED' || apiError.statusCode === 429) {
      console.warn(`⚠️  Rate limited while fetching trip ${rideIdForLog}`);
      return NextResponse.json(
        {
          error: apiError.message || 'Rate limited',
          code: 'RATE_LIMITED',
          tripId: rideIdForLog,
        },
        { status: 429 }
      );
    }

    // Server errors (500+)
    if (apiError.statusCode && apiError.statusCode >= 500) {
      console.error(`❌ Lyft server error for trip ${rideIdForLog}:`, apiError.message);
      return NextResponse.json(
        {
          error: 'Citibike API server error',
          code: apiError.code || 'SERVER_ERROR',
          tripId: rideIdForLog,
          message: apiError.message,
        },
        { status: apiError.statusCode }
      );
    }

    // Generic errors
    console.error(`❌ Unknown error for trip ${rideIdForLog}:`, error);
    return NextResponse.json(
      {
        error: apiError.message || 'Failed to fetch trip details',
        code: apiError.code || 'UNKNOWN_ERROR',
        tripId: rideIdForLog,
      },
      { status: apiError.statusCode || 500 }
    );
  }
}
