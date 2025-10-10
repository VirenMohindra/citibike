/**
 * Station Status API
 * Proxies GBFS station_status.json data with real-time availability
 */

import { NextResponse } from 'next/server';
import { buildGbfsUrl, GBFS_ENDPOINTS } from '@/config/api';

export async function GET() {
  try {
    const url = buildGbfsUrl(GBFS_ENDPOINTS.STATION_STATUS);

    const response = await fetch(url, {
      next: {
        revalidate: 30, // Cache for 30 seconds (real-time data)
      },
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GBFS API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch station status:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch station status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
