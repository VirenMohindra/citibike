# Lyft Bikeshare API Documentation

_Reverse engineered from mitmproxy captures and web authentication analysis_

## Supported Cities

This implementation supports **8 active Lyft bikeshare systems** worldwide:

### 🇺🇸 United States (6 systems)

1. **Citi Bike** (New York City) - `cityId: nyc`, `regionCode: BKN`, `brandId: citi-bike`
2. **Bay Wheels** (San Francisco) - `cityId: sf`, `regionCode: SFO`, `brandId: baywheels`
3. **Divvy** (Chicago) - `cityId: chicago`, `regionCode: CHI`, `brandId: divvy`
4. **Capital Bikeshare** (Washington DC) - `cityId: dc`, `regionCode: DC`, `brandId: capital-bikeshare`
5. **Bluebikes** (Boston) - `cityId: boston`, `regionCode: BOS`, `brandId: blue-bikes`
6. **BIKETOWN** (Portland, OR) - `cityId: portland`, `regionCode: PDX`, `brandId: biketown`

### 🇲🇽 Mexico (1 system)

7. **Ecobici** (Mexico City) - `cityId: mexicocity`, `regionCode: MEX`, `brandId: ecobici`

### 🇨🇦 Canada (1 system)

8. **BIXI** (Montreal) - `cityId: montreal`, `regionCode: MTL`, `brandId: bixi`

### ❌ Discontinued Systems (no longer operational)

- **Nice Ride** (Minneapolis) - Shut down March 2023
- **CoGo Bikeshare** (Columbus, OH) - Shut down February 2025

### 🔒 Not Supported (no public GBFS feed)

- **Santander Cycles** (London) - Uses Lyft auth but no public GBFS feed available

All systems use the same Lyft OAuth authentication infrastructure with city-specific `brandId` and `regionCode` parameters.

## Base URL

```
https://api.lyft.com
```

## Authentication Flow

**⚠️ IMPORTANT**: This implementation uses **web-based OAuth authentication** (not mobile app credentials). The web flow avoids email verification challenges and works across all Lyft bikeshare systems.

### Web Authentication vs Mobile Authentication

| Feature            | Mobile (Deprecated)         | Web (Current Implementation)   |
| ------------------ | --------------------------- | ------------------------------ |
| Credentials        | Mobile app CLIENT_ID/SECRET | Web OAuth credentials          |
| PKCE               | Required                    | Not required                   |
| Device Identifiers | Required (iCloud UUID)      | Not required (empty array)     |
| Email Challenges   | Common                      | Rare/Never                     |
| Session Management | x-session headers           | Cookie-based (lyftAccessToken) |
| Multi-City Support | Single city                 | All Lyft systems               |

### 1. Get OAuth Cookie (Client Credentials) - Web Flow

**Endpoint**: `POST /oauth/token`

**Headers**:

```
Authorization: Basic {base64(WEB_CLIENT_ID:WEB_CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded
```

**Body**:

```
grant_type=client_credentials
```

**Response**:

The response includes a `Set-Cookie` header with the OAuth token:

```
Set-Cookie: lyftAccessToken={token_value}; Path=/; HttpOnly; Secure
```

**Important Notes**:

- Uses **web OAuth credentials** (different from mobile app credentials)
- Returns cookie instead of JSON access token
- Cookie must be included in subsequent requests for session continuity
- Same credentials work for all Lyft bikeshare systems worldwide

**Implementation**: `lib/api/lyft-client.ts:getLyftOAuthCookie()`

### 2. Request Phone OTP - Web Flow

**Endpoint**: `POST /phoneauth`

**Headers**:

```
Content-Type: application/json
Cookie: lyftAccessToken={oauth_cookie_from_step_1}
```

**Body**:

```json
{
  "phoneNumber": "+1XXXXXXXXXX",
  "ui_variant": "{brandId}"
}
```

**Parameters**:

- `phoneNumber`: E.164 format phone number (+1 for US/Canada, +52 for Mexico)
- `ui_variant`: City-specific brand identifier (e.g., "citi-bike", "divvy", "ecobici", "bixi")

**Response**:

```json
{
  "verification_code_length": 6
}
```

**Important Notes**:

- **No Authorization header** - uses OAuth cookie instead
- **No PKCE** - web flow doesn't require code challenge
- Brand identifier (`ui_variant`) determines which system the user is logging into
- Same endpoint works for all 8 Lyft bikeshare systems

**Implementation**: `lib/api/lyft-client.ts:requestOtp()`

### 3. Verify OTP and Get User Token - Web Flow

**Endpoint**: `POST /oauth/token`

**Headers**:

```
Authorization: Basic {base64(WEB_CLIENT_ID:WEB_CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded
Cookie: lyftAccessToken={oauth_cookie_from_step_1}
```

**Body**:

```
grant_type=urn:lyft:oauth2:grant_type:phone
phone_number={E.164 format phone}
phone_code={6 digit code from SMS}
ui_variant={brandId}
```

**Parameters**:

- `grant_type`: Always `urn:lyft:oauth2:grant_type:phone` for phone verification
- `phone_number`: Same phone number used in step 2
- `phone_code`: 6-digit verification code from SMS
- `ui_variant`: City-specific brand identifier (must match step 2)

**Success Response**:

The response includes a `Set-Cookie` header with the access token:

```
Set-Cookie: lyftAccessToken={user_access_token}; Path=/; HttpOnly; Secure
```

**Response Body** (JSON):

```json
{
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "privileged.price.upfront public users.create"
}
```

**Important Notes**:

- **Cookie-based authentication**: Access token is in the `Set-Cookie` header, not response body
- **No device identifiers required**: Web flow doesn't need iCloud UUIDs
- **No PKCE**: Web flow doesn't use code challenge/verifier
- **Rare email challenges**: Web credentials rarely trigger email verification
- Token cookie is used for all subsequent authenticated requests

**Implementation**: `lib/api/lyft-client.ts:verifyOtp()`

### 4. Email Challenge (if required) - Web Flow

**Endpoint**: `POST /oauth/token`

**Note**: Rarely triggered with web credentials, but implemented for completeness.

**Headers**:

```
Authorization: Basic {base64(WEB_CLIENT_ID:WEB_CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded
Cookie: lyftAccessToken={oauth_cookie_from_step_1}
```

**Body**:

```
email={user_email_address}
grant_type=urn:lyft:oauth2:grant_type:phone
phone_code={6 digit code from SMS}
phone_number={E.164 format phone}
ui_variant={brandId}
```

**Response**:

Same as step 3 - returns `lyftAccessToken` cookie in `Set-Cookie` header.

**Implementation Notes**:

- **Rarely needed**: Web OAuth credentials almost never trigger email challenges
- Email verification matches against account's registered email address
- No device identifiers or empty identifiers array needed
- Access token extracted from `Set-Cookie` header, not response body

**Implemented in**: `lib/api/lyft-client.ts:verifyEmailChallenge()`

## Authenticated User Endpoints

All authenticated endpoints require:

- `Authorization: Bearer {user_access_token}`
- Standard headers from auth flow
- `x-idl-source` header (varies by endpoint)

### Get User Profile

**Endpoint**: `GET /v1/passenger`

**Headers**:

```
x-idl-source: pb.api.endpoints.v1.passenger.ReadPassengerUserRequest
accept: application/x-protobuf,application/json
```

**Response**: User profile information

### Get Subscriptions (Membership Info)

**Endpoint**: `GET /v1/clients/subscriptions`

**Headers**:

```
x-idl-source: pb.api.endpoints.v1.subscriptions.ReadSubscriptionsRequest
accept: application/x-protobuf,application/json
x-location: {lat},{lon}
```

**Response**: Subscription/membership details

### Get Active Trips

**Endpoint**: `POST /v1/core_trips/activetrips`

**Headers**:

```
x-idl-source: pb.api.endpoints.v1.core_trips.GetActiveTripsRequest
Content-Type: application/json
accept: application/x-protobuf,application/json
x-location: {lat},{lon}
upload-draft-interop-version: 6
upload-complete: ?1
```

**Body**:

```json
{
  "include_trips_requested_for_others": false,
  "rider_id": "USER_ID_HERE"
}
```

**Response**: Active trip information

### Get Trip History

**Endpoint**: `POST /v1/triphistory`

**Headers**:

```
Authorization: Bearer {user_access_token}
x-idl-source: pb.api.endpoints.v1.ride_history.ReadTripHistoryRequest
Content-Type: application/json
accept: application/json
x-location: {lat},{lon}
x-lyft-region: BKN (for NYC/Brooklyn region)
```

**Body**:

```json
{
  "source": 1,
  "cursor": "optional_pagination_cursor"
}
```

**Parameters**:

- `source`: Always `1` for Citibike rides
- `cursor`: Optional. Pagination cursor from previous response (uses `next_page_start_time` as string)

**Response Format**:
The response is returned as **JSON** when `accept: application/json` header is used.

**Response Structure**:

```javascript
{
  sections: [
    {
      groupings: [
        {
          rows: [
            {
              trip_row: {
                id: "2136678694252803040",                    // Trip ID
                title: "Bike ride • 3 min",                   // Trip title with duration
                start_time: 1234567890000,                    // Start timestamp (ms)
                end_time: 1234567893000,                      // End timestamp (ms)
                timezone: "America/New_York",                 // Timezone
                image_url: "...cosmo..." or "...classic...",  // Bike type indicator
                total_money: {
                  amount: 36,                                 // Cost in cents
                  currency: "USD"
                },
                lastmile_rewards_badge: {
                  text: "2 pt"                                // Bike Angel points
                },
                points_earned: 2                              // Points as number
              }
            }
          ]
        }
      ]
    }
  ],
  has_more: true,                          // Whether more pages exist
  next_page_start_time: 1234567890000      // Timestamp cursor for next page
}
```

**Pagination**:

- API uses cursor-based pagination with `next_page_start_time`
- Include `cursor` (as string) from previous response's `next_page_start_time` to fetch next page
- `has_more` indicates if more pages are available
- Fetches older trips with each subsequent page

**Data Extraction**:

- Trip IDs: Directly available in `trip_row.id`
- Duration: Calculated from `start_time` and `end_time` difference
- Bike Type: Determined from `image_url` (contains "cosmo" for ebike, otherwise classic)
- Cost: Available in `total_money.amount` (cents) and formatted to dollars
- Angel Points: Available in `points_earned` and `lastmile_rewards_badge.text`
- Timestamps: Native timestamp fields in milliseconds

**Implementation**:

- API client: `lib/api/lyft-client.ts:373` (getTripHistory method)
- API route: `app/api/citibike/trips/history/route.ts`
- Frontend component: `components/TripStats.tsx` (with progressive sync)
- Database: `lib/db.ts` (IndexedDB storage with deduplication)

### Get Stations with Bike Angel Rewards (Map Items)

**Endpoint**: `POST /v1/last-mile/map-items`

**Headers**:

```
Authorization: Bearer {user_access_token}
x-idl-source: pb.api.endpoints.v1.last_mile.ReadMapItemsRequest
Content-Type: application/json
accept: application/json
x-location: {lat},{lon}
x-lyft-region: (empty string)
```

**Body**:

```json
{
  "last_mile_context": {
    "origin_lat": 40.7407,
    "origin_long": -73.9818,
    "radius_km": 2.0,
    "result_filters": ["is_bike", "show_rider_rewards", "bff_fidget_enabled"]
  }
}
```

**Parameters**:

- `origin_lat`: Latitude of map center
- `origin_long`: Longitude of map center
- `radius_km`: Search radius in kilometers (typically 0.5 - 5.0)
- `result_filters`: Array of filters:
  - `is_bike`: Only show bike stations
  - `show_rider_rewards`: **KEY FILTER** - enables Bike Angel reward data in response
  - `bff_fidget_enabled`: Enables additional UI features

**Response Structure**:

```javascript
{
  map_items: [
    {
      device: {
        id: "motivate_BKN_abc-123-def",  // Station ID with prefix
        type: 0
      },
      location: {
        lat: 40.7407,
        lng: -73.9818
      },
      collapsible_collection_bubble: {
        selected_detailed_text_specific_pin: {
          // Station availability (bikes and docks)
          text_specific_items: [
            {
              icon: { core_icon_v1: 338 },  // Bike icon
              text: "5"                      // Number of bikes available
            },
            {
              icon: { core_icon_v1: 156 },  // Dock icon
              text: "10"                     // Number of docks available
            }
          ],
          // Bike Angel reward badge (only if station has rewards)
          reward_badge: {
            points: "4",                     // Point value as string!
            icon: {
              core_icon_v1: 114 // or 99    // 114 = pickup (⬆️), 99 = dropoff (⬇️)
            },
            icon_rotation: -45,              // Visual rotation (always -45)
            color: 0xFFFFAA00,              // Badge color
            style: 0
          }
        }
      }
    }
  ],
  notices: [],
  request_errors: []
}
```

**Data Extraction**:

- **Station ID**: Extract from `device.id` by removing `motivate_BKN_` prefix
  - Example: `"motivate_BKN_abc-123"` → `"abc-123"`
- **Point Value**: Parse `reward_badge.points` as integer
- **Direction**: Determined by `reward_badge.icon.core_icon_v1`:
  - **Icon 114**: Pickup reward (⬆️) - points earned for taking a bike FROM this station
  - **Icon 99**: Dropoff reward (⬇️) - points earned for returning a bike TO this station
  - Same station may appear twice in `map_items` with different icons for different directions
- **Bikes Available**: First item in `text_specific_items` array (icon 338)
- **Docks Available**: Second item in `text_specific_items` array (icon 156)
- **Has Rewards**: Check if `reward_badge` exists and has `points` field

**Important Notes**:

1. **Point values are strings** - must parse to integer
2. **Empty region** - Use empty string for `x-lyft-region` (not "BKN")
3. **Only rewarded stations** - Filter for items with `reward_badge` present
4. **Updates frequency** - Bike Angel rewards update every 15 minutes (on :00, :15, :30, :45)
5. **Authentication required** - Returns 401 if user not logged in

**Implementation**:

- API client: `lib/api/lyft-client.ts:223` (getStationsWithRewards method)
- API route: `app/api/citibike/bike-angel/stations/route.ts`
- Hook: `lib/hooks/useBikeAngelRewards.ts` (auto-refresh every 60s)
- Map integration: `components/map/Map.tsx` (displays reward badges on markers)

## Standard Headers

All requests include these standard headers:

```
user-agent: com.citibikenyc.citibike:iOS:18.6.2:2025.38.3.26642648
user-device: iPhone16,1
x-design-id: x
x-device-density: 3.0
x-locale-language: en
x-locale-region: US
accept-language: en_US
x-timestamp-ms: {epoch milliseconds}
x-timestamp-source: ntp; age={age in ms} OR system
x-client-session-id: {UUID - persistent across requests in a session}
x-session: {base64 encoded session data - see below}
```

### x-session Format

Base64 encoded JSON:

```json
{
  "j": "AF425C4C-D49B-44D3-9963-21F904E338FE",
  "i": false,
  "e": "00000000-0000-0000-0000-000000000000",
  "b": "9CCCF1E5-C212-4484-865A-B08B797D073F"
}
```

## Response Format Handling

### JSON Responses (Current Implementation)

Most Lyft API endpoints can return **JSON** responses when the correct `accept` header is used:

```
accept: application/json
```

This is now the preferred approach for the following reasons:

- **Native data types**: Timestamps, numbers, and strings are directly usable
- **No parsing required**: Standard JSON parsing works out of the box
- **Complete data**: All fields including station names, timestamps, and metadata are available
- **Maintainable**: No need for reverse-engineering or pattern matching

**Endpoints confirmed to support JSON**:

- `/v1/triphistory` - Trip history with full pagination support
- `/v1/passenger` - User profile information
- `/v1/clients/subscriptions` - Subscription/membership details

### Protobuf Responses (Legacy/Fallback)

Some endpoints may still return **Protocol Buffers (protobuf)** binary format. The codebase previously included protobuf parsing utilities, but these have been removed in favor of JSON-only responses:

**Removed files** (as of 2025-10-13):

- `lib/api/protobuf-decoder.ts` - Generic protobuf wire format decoder
- `lib/api/protobuf-parser-improved.ts` - Pattern-matching parser for trip data

If protobuf support is needed in the future, the API should be called with:

```
accept: application/x-protobuf,application/json
```

However, this is no longer recommended as JSON provides better data quality and maintainability.

## App Credentials

**⚠️ Note**: To use authentication, you'll need to reverse-engineer the Citibike iOS app credentials yourself using mitmproxy. See MITMPROXY_GUIDE.md for instructions.

These credentials should be stored in your `.env.local` file:

```
CITIBIKE_CLIENT_ID=your_client_id_here
CITIBIKE_CLIENT_SECRET=your_client_secret_here
```

**⚠️ Warning**: These are the official Citibike app credentials. Use responsibly for personal use only.

## Implementation Status

### ✅ Implemented

- [x] Client credentials OAuth (app token)
- [x] Phone OTP request
- [x] Phone OTP verification (user token)
- [x] Email challenge verification
- [x] Token storage in httpOnly cookies
- [x] Session management
- [x] Get user profile endpoint
- [x] Get subscriptions endpoint
- [x] Get trip history endpoint with JSON parsing
- [x] Trip history pagination (cursor-based with `next_page_start_time`)
- [x] Progressive trip sync (store and display incrementally)
- [x] IndexedDB storage with automatic deduplication
- [x] Trip statistics calculation (distance, duration, CO2, cost)
- [x] Bike Angel points tracking in trip data
- [x] Get stations with Bike Angel rewards (map-items endpoint)
- [x] Real-time reward badge display on map markers

### 🗑️ Removed (Code Cleanup 2025-10-13)

**Database utilities** (`lib/db.ts`):

- [x] Removed `storeTrip()` - Single trip storage (unused)
- [x] Removed `getMostRecentTrip()` - Incremental sync helper (unused)
- [x] Removed `deleteTrip()` - Delete specific trip (unused)
- [x] Removed `getTripsByStation()` - Station-based queries (unused)

**Sync utilities**:

- [x] Removed `lib/trip-sync.ts` (301 lines) - Alternative sync implementation (never imported)
- [x] Removed `lib/trip-tracker.ts` (156 lines) - Manual trip tracking (never imported)

**Protobuf parsing** (replaced with JSON):

- [x] Removed `lib/api/protobuf-decoder.ts` - Generic protobuf decoder (no longer needed)
- [x] Removed `lib/api/protobuf-parser-improved.ts` - Pattern-matching parser (no longer needed)

**Component cleanup**:

- [x] Removed sync functionality from `components/TripHistory.tsx` (consolidated in TripStats)

### 📋 To Do

- [ ] Token refresh logic
- [ ] Get active trips endpoint
- [ ] Logout/revoke token endpoint
- [ ] Error handling for expired tokens
- [ ] Bike Angel rewards screen parsing (profile endpoint)
- [ ] Route optimization to maximize Bike Angel points
- [x] Differentiate pickup vs dropoff rewards (implemented via icon.core_icon_v1: 114=pickup, 99=dropoff)
- [ ] Station-based trip filtering (if needed in future)
- [ ] Export trip data (CSV/JSON download)
