import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLyftClient } from '@/lib/api/lyft-client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('citibike_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get location from query params if provided
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    const location = lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : undefined;

    // Use the Lyft client to fetch Bike Angel profile
    const lyftClient = getLyftClient();
    const bikeAngelData = await lyftClient.getBikeAngelProfile(accessToken, location);

    // Log response type for debugging
    const responseAnalysis = {
      timestamp: new Date().toISOString(),
      hasNumericKeys: Object.keys(bikeAngelData).some((k) => !isNaN(Number(k))),
      hasLabeledKeys: Object.keys(bikeAngelData).some((k) => isNaN(Number(k))),
      totalKeys: Object.keys(bikeAngelData).length,
      keys: Object.keys(bikeAngelData).slice(0, 20),
      sampleData: JSON.stringify(bikeAngelData, null, 2),
    };

    console.log('Bike Angel API response type:', responseAnalysis);

    // Write detailed logs to file for analysis
    try {
      const logPath = join('/tmp', 'citibike-logs', 'bike-angel-api.log');
      const logContent = `
========================================
Bike Angel API Response
Time: ${responseAnalysis.timestamp}
========================================

Response Analysis:
- Has Numeric Keys (Protobuf): ${responseAnalysis.hasNumericKeys}
- Has Labeled Keys (JSON): ${responseAnalysis.hasLabeledKeys}
- Total Keys: ${responseAnalysis.totalKeys}

First 20 Keys:
${responseAnalysis.keys.join(', ')}

Full Response Data:
${responseAnalysis.sampleData}

========================================
`;
      await writeFile(logPath, logContent, { flag: 'a' });
      console.log('✅ Bike Angel response logged to:', logPath);
    } catch (logError) {
      console.error('Failed to write log file:', logError);
    }

    return NextResponse.json({
      success: true,
      data: bikeAngelData,
    });
  } catch (error: unknown) {
    console.error('Error fetching Bike Angel profile:', error);

    // Check if it's an authentication error
    const apiError = error as {
      status?: number;
      code?: string;
      message?: string;
    };
    if (apiError.status === 401 || apiError.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication expired', needsReauth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: apiError.message || 'Failed to fetch Bike Angel profile' },
      { status: apiError.status || 500 }
    );
  }
}
