/**
 * Station Information API
 * Proxies GBFS station_information.json data
 */

import { NextResponse } from 'next/server';
import { buildGbfsUrl, GBFS_ENDPOINTS } from '@/config/api';

export async function GET() {
  try {
    const url = buildGbfsUrl(GBFS_ENDPOINTS.STATION_INFO);

    const response = await fetch(url, {
      next: {
        revalidate: 86400, // Cache for 24 hours (station info doesn't change often)
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
    console.error('Failed to fetch station information:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch station information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
