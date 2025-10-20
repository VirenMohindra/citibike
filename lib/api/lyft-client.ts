/**
 * Lyft API Client
 * Specialized client for interacting with Lyft/Citibike API
 */

import { ApiError, BaseApiClient } from './client';
import { API_CONFIG, createBasicAuth, createLyftHeaders, LYFT_ENDPOINTS } from '@/config/api';
import { getCitibikeCredentials } from '@/config/environment';
import { ErrorCode } from '@/config/constants';
import { type CityConfig, DEFAULT_CITY_ID, getCityConfig } from '@/config/cities';
import { createSession, type SessionInfo } from './session';
import type { CitibikeAuthResponse, CitibikeUser, OTPRequestResponse } from '@/lib/types';
import type {
  LyftApiResponse,
  OAuthErrorResponse,
  OAuthTokenResponse,
  PassengerResponse,
} from './types';

// ============================================
// Lyft API Client
// ============================================
export class LyftApiClient extends BaseApiClient {
  private credentials: { clientId: string; clientSecret: string } | null;
  private sessionInfo = createSession();
  private appAccessToken: string | null = null;
  private lyftAccessTokenCookie: string | null = null; // Cache OAuth cookie for session continuity
  private cityId: string;
  private cityConfig: CityConfig;

  constructor(cityId?: string) {
    super(API_CONFIG.LYFT.BASE_URL);
    this.cityId = cityId || DEFAULT_CITY_ID;
    this.cityConfig = getCityConfig(this.cityId);
    this.credentials = getCitibikeCredentials();
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get app-level access token (client credentials flow)
   */
  async getAppAccessToken(): Promise<string> {
    // Return cached token if available
    if (this.appAccessToken) {
      return this.appAccessToken;
    }

    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const response = await this.post<OAuthTokenResponse>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      { grant_type: 'client_credentials' },
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    this.appAccessToken = response.access_token;

    // Clear token before it expires
    if (response.expires_in) {
      setTimeout(
        () => {
          this.appAccessToken = null;
        },
        (response.expires_in - 60) * 1000
      ); // Clear 1 minute before expiry
    }

    return this.appAccessToken;
  }

  // ============================================
  // OAuth Methods
  // ============================================

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await this.post<LyftApiResponse<OAuthTokenResponse>>(
      LYFT_ENDPOINTS.OAUTH.TOKEN,
      params,
      {
        headers: {
          ...headers,
          authorization: basicAuth,
        },
      }
    );

    return this.parseAuthResponse(response);
  }

  /**
   * Exchange phone and OTP for user access token
   * Uses phone grant type for direct Lyft API access
   * IMPORTANT: Requires OAuth cookie from requestOtp to maintain session
   */
  async verifyOtp(
    phoneNumber: string,
    code: string,
    codeVerifier?: string,
    oauthCookie?: string
  ): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const headers = createLyftHeaders({
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    // Use OAuth cookie from requestOtp to maintain session
    if (oauthCookie) {
      headers['cookie'] = `lyftAccessToken=${oauthCookie}`;
    } else if (this.lyftAccessTokenCookie) {
      // Fallback to cached cookie (for same-request flow)
      headers['cookie'] = `lyftAccessToken=${this.lyftAccessTokenCookie}`;
    } else {
      // Fallback: get a new token if cache is empty
      const oauthResponse = await fetch(`${this.baseUrl}${LYFT_ENDPOINTS.OAUTH.TOKEN}`, {
        method: 'POST',
        headers: {
          authorization: basicAuth,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const setCookieHeader = oauthResponse.headers.get('set-cookie');
      const lyftAccessToken = setCookieHeader?.match(/lyftAccessToken=([^;]+)/)?.[1];
      if (lyftAccessToken) {
        headers['cookie'] = `lyftAccessToken=${lyftAccessToken}`;
      }
    }

    // Web flow: Call /oauth2/access_token with Basic Auth + OAuth cookie
    // Unlike mobile which uses ONLY Basic Auth, web uses BOTH
    const params = new URLSearchParams({
      grant_type: 'urn:lyft:oauth2:grant_type:phone',
      phone_code: code,
      ui_variant: this.cityConfig.auth.brandId, // CRITICAL: Must match city
      phone_number: phoneNumber,
      extend_token_lifetime: 'true',
    });

    // Web needs BOTH Basic Auth AND OAuth cookie
    const verifyHeaders: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      authorization: basicAuth,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'lyft-version': '2017-09-18',
      'x-locale-language': 'en-US',
    };

    // Add OAuth cookie for session continuity
    if (oauthCookie) {
      verifyHeaders['cookie'] = `lyftAccessToken=${oauthCookie}`;
    } else if (this.lyftAccessTokenCookie) {
      verifyHeaders['cookie'] = `lyftAccessToken=${this.lyftAccessTokenCookie}`;
    }

    const response = await this.post<Record<string, unknown>>(LYFT_ENDPOINTS.OAUTH.TOKEN, params, {
      headers: verifyHeaders,
    });

    // Parse response - web flow returns tokens in phoneauth response
    if (!response.access_token) {
      throw new ApiError(
        'No access token in response',
        ErrorCode.INVALID_CREDENTIALS,
        401,
        response
      );
    }

    const user: CitibikeUser = {
      id: (response.user_id as string) || 'unknown',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber,
      membershipType: 'member',
      memberSince: undefined,
    };

    return {
      accessToken: response.access_token as string,
      refreshToken: response.refresh_token as string | undefined,
      expiresAt: Date.now() + ((response.expires_in as number) || 86400) * 1000,
      user,
    };
  }

  /**
   * Complete email challenge (web flow)
   */
  async verifyEmailChallenge(
    phoneNumber: string,
    code: string,
    email: string,
    oauthCookie?: string
  ): Promise<CitibikeAuthResponse> {
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    // Web flow: Same as verifyOtp but with email parameter, no identifiers
    const params = new URLSearchParams({
      grant_type: 'urn:lyft:oauth2:grant_type:phone',
      email: email,
      phone_code: code,
      phone_number: phoneNumber,
      ui_variant: this.cityConfig.auth.brandId, // CRITICAL: Must match city
    });

    // Web needs BOTH Basic Auth AND OAuth cookie
    const challengeHeaders: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      authorization: basicAuth,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'lyft-version': '2017-09-18',
      'x-locale-language': 'en-US',
    };

    // Add OAuth cookie for session continuity
    if (oauthCookie) {
      challengeHeaders['cookie'] = `lyftAccessToken=${oauthCookie}`;
    } else if (this.lyftAccessTokenCookie) {
      challengeHeaders['cookie'] = `lyftAccessToken=${this.lyftAccessTokenCookie}`;
    }

    // Use raw fetch to inspect headers
    const url = `${this.baseUrl}${LYFT_ENDPOINTS.OAUTH.TOKEN}`;
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: challengeHeaders,
      body: params.toString(),
    });

    // Check for lyftAccessToken cookie in Set-Cookie headers (there may be multiple)
    // Use getSetCookie() to get all Set-Cookie headers as an array
    const setCookieHeaders = (
      fetchResponse.headers as { getSetCookie?: () => string[] }
    ).getSetCookie?.() || [fetchResponse.headers.get('set-cookie')];

    // Try to extract access token from cookies
    let lyftAccessTokenMatch: RegExpMatchArray | null = null;
    for (const cookie of setCookieHeaders) {
      if (cookie) {
        const match = cookie.match(/lyftAccessToken=([^;]+)/);
        if (match) {
          lyftAccessTokenMatch = match;
          break;
        }
      }
    }

    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.json();
      console.error('❌ Email challenge error:', errorData);
      throw new ApiError(
        errorData.error_description || errorData.error || 'Email challenge failed',
        errorData.error || ErrorCode.INVALID_CREDENTIALS,
        fetchResponse.status,
        errorData
      );
    }

    const response = await fetchResponse.json();

    // Parse response - web flow uses cookie-based auth, not Bearer tokens
    // The access token is in the lyftAccessToken cookie, not the response body
    let accessToken = (response.access_token as string) || (response.token as string);

    // If no access token in body, use the lyftAccessToken cookie value
    if (!accessToken && lyftAccessTokenMatch) {
      accessToken = lyftAccessTokenMatch[1];
    }

    if (!accessToken) {
      throw new ApiError(
        'No access token in response or cookies',
        ErrorCode.INVALID_CREDENTIALS,
        401,
        response
      );
    }

    const user: CitibikeUser = {
      id: (response.user_id as string) || 'unknown',
      email: email,
      firstName: '',
      lastName: '',
      phoneNumber,
      membershipType: 'member',
      memberSince: undefined,
    };

    return {
      accessToken,
      refreshToken: response.refresh_token as string | undefined,
      expiresAt: Date.now() + ((response.expires_in as number) || 86400) * 1000,
      user,
    };
  }

  /**
   * Request OTP code via SMS (web flow - requires OAuth cookie)
   * Flow: Get app access token via OAuth, then use cookie for phoneauth
   */
  async requestOtp(
    phoneNumber: string
  ): Promise<OTPRequestResponse & { sessionInfo: SessionInfo; oauthCookie: string }> {
    // Step 1: Get app access token via OAuth (returns lyftAccessToken cookie)
    const credentials = this.requireCredentials();
    const basicAuth = createBasicAuth(credentials.clientId, credentials.clientSecret);

    const oauthResponse = await fetch(`${this.baseUrl}${LYFT_ENDPOINTS.OAUTH.TOKEN}`, {
      method: 'POST',
      headers: {
        authorization: basicAuth,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    // Extract lyftAccessToken cookie from Set-Cookie header
    const setCookieHeader = oauthResponse.headers.get('set-cookie');
    const lyftAccessToken = setCookieHeader?.match(/lyftAccessToken=([^;]+)/)?.[1];

    if (!lyftAccessToken) {
      throw new ApiError('Failed to get app access token', ErrorCode.INVALID_CREDENTIALS, 401);
    }

    // Cache the OAuth cookie for use in verifyOtp
    this.lyftAccessTokenCookie = lyftAccessToken;

    // Step 2: Call phoneauth with the cookie
    const headers: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'lyft-version': '2017-09-18',
      'x-locale-language': 'en-US',
      cookie: `lyftAccessToken=${lyftAccessToken}`,
    };

    const requestBody: Record<string, unknown> = {
      phone_number: phoneNumber,
      extend_token_lifetime: true,
      ui_variant: this.cityConfig.auth.brandId,
      message_format: 'sms_basic',
    };

    await this.post(LYFT_ENDPOINTS.AUTH.PHONE_AUTH, requestBody, { headers });

    return {
      success: true,
      message: 'Verification code sent! Check your phone for a text.',
      expiresIn: 300,
      sessionInfo: this.sessionInfo,
      oauthCookie: lyftAccessToken, // Return cookie so it can be stored in session
    };
  }

  // ============================================
  // User Methods
  // ============================================

  /**
   * Get stations with Bike Angel rewards (map-items endpoint)
   */
  async getStationsWithRewards(
    accessToken: string,
    location: { lat: number; lon: number },
    radiusKm: number = 1
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      idlSource: 'pb.api.endpoints.v1.last_mile.ReadMapItemsRequest',
    });

    // Add location and region headers
    headers['x-location'] = `${location.lat},${location.lon}`;
    headers['x-lyft-region'] = ''; // Empty region for map-items

    const requestBody = {
      last_mile_context: {
        origin_lat: location.lat,
        origin_long: location.lon,
        radius_km: radiusKm,
        result_filters: ['is_bike', 'show_rider_rewards', 'bff_fidget_enabled'],
      },
    };

    const response = await this.post<Record<string, unknown>>(
      LYFT_ENDPOINTS.LAST_MILE.MAP_ITEMS,
      requestBody,
      { headers }
    );

    return response;
  }

  /**
   * Get Bike Angel profile and points
   */
  async getBikeAngelProfile(
    accessToken: string,
    location?: { lat: number; lon: number }
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      // Removed isProtobuf flag to request JSON instead of protobuf
      idlSource: 'pb.api.endpoints.v1.lbs_bff.ReadBikeAngelProfileScreenRequest',
    });

    // Add location and region headers
    const coords = location || this.cityConfig.mapCenter;
    headers['x-location'] = `${coords.lat},${coords.lon}`;
    headers['x-lyft-region'] = this.cityConfig.auth.regionCode;

    // Canvas capabilities from the cURL request
    const requestBody = {
      canvas_capabilities: {
        accessibility_capabilities: {
          accessibility_traits: true,
          additional_accessibility_actions: true,
          hidden_accessibilty: true,
          toggleable_accessibility: true,
        },
        actions_capabilities: {
          common_actions: true,
          complete_action: true,
          deep_link_open_in_external_browser: true,
        },
        alert_capabilities: {
          alert: true,
        },
        command_capabilities: {
          back_to_screen_by_id: true,
          replace_screen_by_id: true,
          show_info_panel: true,
          show_prompt_screen: true,
          show_toast: true,
        },
        image_capabilities: {
          custom_renderer: true,
          gif: true,
        },
        label_capabilities: {
          disabled: true,
          line_count: true,
          rich_text: true,
        },
        layout_child_capabilities: {
          carousel: true,
          circular_button: true,
          circular_meter: true,
          custom_layout: true,
          icon_button: true,
          list_section: true,
          placeholder_element: true,
          radio_group: true,
          segmented_control: true,
          slider_button: true,
          switch_element: true,
          toggle_button: true,
          toggle_group: true,
        },
        screen_capabilities: {
          dismiss_actions: true,
          header: true,
        },
        toast_capabilities: {
          toast: true,
        },
      },
      server_actions: {},
      show_edu_in_panel: false,
    };

    const response = await this.post<Record<string, unknown>>(
      LYFT_ENDPOINTS.LAST_MILE.BIKE_ANGEL_PROFILE,
      requestBody,
      { headers }
    );

    return response;
  }

  /**
   * Get user profile/passenger info
   */
  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
    });

    headers['x-location'] = `${this.cityConfig.mapCenter.lat},${this.cityConfig.mapCenter.lon}`;
    headers['x-idl-source'] = 'pb.api.endpoints.v1.passenger.ReadPassengerUserRequest';
    headers['accept'] = 'application/x-protobuf,application/json';

    const response = await this.get<Record<string, unknown>>(LYFT_ENDPOINTS.USER.PASSENGER, {
      headers,
    });

    return response;
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(accessToken: string): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
    });

    headers['x-location'] = `${this.cityConfig.mapCenter.lat},${this.cityConfig.mapCenter.lon}`;
    headers['x-idl-source'] = 'pb.api.endpoints.v1.subscriptions.ReadSubscriptionsRequest';

    const response = await this.get<Record<string, unknown>>(LYFT_ENDPOINTS.USER.SUBSCRIPTIONS, {
      headers,
    });

    return response;
  }

  /**
   * Get individual trip details with station coordinates and polyline
   */
  async getTripDetails(
    accessToken: string,
    rideId: string,
    location?: { lat: number; lon: number }
  ): Promise<Record<string, unknown>> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      idlSource: 'pb.api.endpoints.v1.last_mile.ReadLastMileRideHistoryResourceRequest',
    });

    // Add location and region headers
    const coords = location || this.cityConfig.mapCenter;
    headers['x-location'] = `${coords.lat},${coords.lon}`;
    headers['x-lyft-region'] = this.cityConfig.auth.regionCode;
    headers['x-capture-path-template'] = '/v1/last-mile/ride-history/{ride_id}';

    const response = await this.get<Record<string, unknown>>(
      `${LYFT_ENDPOINTS.TRIPS.TRIP_DETAILS(rideId)}?ride_id=${rideId}`,
      { headers }
    );

    return response;
  }

  /**
   * Get trip history
   */
  async getTripHistory(
    accessToken: string,
    options: {
      startTime?: number;
      endTime?: number;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{
    trips: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const headers = createLyftHeaders({
      token: accessToken,
      clientSessionId: this.sessionInfo.clientSessionId,
      xSession: this.sessionInfo.xSession,
      isJson: true,
      // Force JSON response by only setting isJson (not isProtobuf)
      idlSource: 'pb.api.endpoints.v1.ride_history.ReadTripHistoryRequest',
    });

    // Add location and region headers
    headers['x-location'] = `${this.cityConfig.mapCenter.lat},${this.cityConfig.mapCenter.lon}`;
    headers['x-lyft-region'] = this.cityConfig.auth.regionCode;

    // Build request body
    const requestBody: Record<string, unknown> = {
      source: 1, // Source type for Citibike rides
    };

    // Only add start_time if explicitly provided
    if (options.startTime !== undefined) {
      requestBody.start_time = options.startTime;
    }
    if (options.endTime !== undefined) {
      requestBody.end_time = options.endTime;
    }
    if (options.limit !== undefined) {
      requestBody.limit = options.limit;
    }
    if (options.cursor !== undefined) {
      requestBody.cursor = options.cursor;
    }

    // Make raw fetch request to bypass BaseApiClient's protobuf handling
    const url = `${this.baseUrl}${LYFT_ENDPOINTS.TRIPS.TRIP_HISTORY}`;
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseContentType = fetchResponse.headers.get('content-type');

    if (!fetchResponse.ok) {
      throw new Error(`Trip history request failed: ${fetchResponse.status}`);
    }

    // Check if we got JSON or protobuf
    if (responseContentType?.includes('application/json')) {
      const jsonResponse = await fetchResponse.json();

      // Parse JSON response
      const trips: Array<Record<string, unknown>> = [];

      // Iterate through sections and groupings to extract trips
      if (jsonResponse.sections && Array.isArray(jsonResponse.sections)) {
        for (const section of jsonResponse.sections) {
          if (section.groupings && Array.isArray(section.groupings)) {
            for (const grouping of section.groupings) {
              if (grouping.rows && Array.isArray(grouping.rows)) {
                for (const row of grouping.rows) {
                  if (row.trip_row) {
                    const tripRow = row.trip_row;
                    const bikeType = tripRow.image_url?.includes('cosmo') ? 'ebike' : 'classic';

                    // Calculate duration in seconds
                    const duration =
                      tripRow.end_time && tripRow.start_time
                        ? Math.floor((tripRow.end_time - tripRow.start_time) / 1000)
                        : undefined;

                    // Estimate distance from duration
                    // Based on actual Citibike data: 742 miles / 4911 minutes = 0.151 mi/min = 9.06 mph average
                    // Convert to meters: 0.151 mi/min * 1609.34 m/mi / 60 sec/min ≈ 4.05 m/s
                    const METERS_PER_SECOND = 4.05;
                    const estimatedDistance = duration
                      ? Math.round(duration * METERS_PER_SECOND)
                      : undefined;

                    const trip: Record<string, unknown> = {
                      id: tripRow.id,
                      startTime: tripRow.start_time,
                      endTime: tripRow.end_time,
                      duration,
                      title: tripRow.title,
                      timezone: tripRow.timezone,
                      bikeType,
                      bikeImageUrl: tripRow.image_url,
                      angelPoints: tripRow.points_earned || 0,
                      angelBadgeText: tripRow.lastmile_rewards_badge?.text,
                      costCents: tripRow.total_money?.amount || 0,
                      cost: tripRow.total_money?.amount
                        ? (tripRow.total_money.amount / 100).toFixed(2)
                        : '0.00',
                      costFormatted: tripRow.total_money?.amount
                        ? `$${(tripRow.total_money.amount / 100).toFixed(2)}`
                        : '$0.00',
                      currency: tripRow.total_money?.currency || 'USD',
                      // Add estimated distance and placeholder station data
                      distance: estimatedDistance,
                      startStationId: '',
                      startStationName: 'Unknown',
                      startLat: 0,
                      startLon: 0,
                      endStationId: '',
                      endStationName: 'Unknown',
                      endLat: 0,
                      endLon: 0,
                    };

                    trips.push(trip);
                  }
                }
              }
            }
          }
        }
      }

      return {
        trips,
        hasMore: jsonResponse.has_more || false,
        nextCursor: jsonResponse.next_page_start_time
          ? jsonResponse.next_page_start_time.toString()
          : null,
      };
    } else {
      // Fall back to empty response
      return {
        trips: [],
        hasMore: false,
        nextCursor: null,
      };
    }
  }

  /**
   * Reset session (for new auth flow)
   */
  resetSession(): void {
    this.sessionInfo = createSession();
    this.appAccessToken = null;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Ensure credentials are available
   */
  private requireCredentials(): { clientId: string; clientSecret: string } {
    if (!this.credentials) {
      throw new ApiError(
        'Citibike API credentials not configured',
        ErrorCode.INVALID_CREDENTIALS,
        500
      );
    }
    return this.credentials;
  }

  /**
   * Parse authentication response
   */
  private parseAuthResponse(data: OAuthTokenResponse | OAuthErrorResponse): CitibikeAuthResponse {
    // Check if it's an error response
    if ('error' in data) {
      throw new ApiError(data.error_description || data.error, data.error, 401, data);
    }

    const user: CitibikeUser = {
      id: data.user_id || 'unknown',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      membershipType: 'member',
      memberSince: undefined,
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
      user,
    };
  }

  /**
   * Parse user profile response
   */
  private parseUserProfile(data: PassengerResponse): CitibikeUser {
    return {
      id: data.id || data.user_id || 'unknown',
      email: data.email || '',
      firstName: data.first_name || data.firstName || '',
      lastName: data.last_name || data.lastName || '',
      phoneNumber: data.phone_number || data.phoneNumber || '',
      membershipType: data.membership_type || 'member',
      memberSince: data.join_date_ms ? new Date(data.join_date_ms).toISOString() : undefined,
      ridesTaken: data.rides_taken || 0,
      region: data.region || '',
      userPhoto: data.user_photo || '',
      referralCode: data.referral_code || '',
    };
  }
}

// ============================================
// Singleton Instance (Per City)
// ============================================
const lyftClientCache: Record<string, LyftApiClient> = {};

/**
 * Get singleton Lyft API client instance for a specific city
 * Creates a new instance if one doesn't exist for the given city
 */
export function getLyftClient(cityId?: string): LyftApiClient {
  const key = cityId || DEFAULT_CITY_ID;
  if (!lyftClientCache[key]) {
    lyftClientCache[key] = new LyftApiClient(cityId);
  }
  return lyftClientCache[key];
}
