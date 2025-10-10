# Lyft/Citibike API Documentation

_Reverse engineered from mitmproxy captures_

## Base URL

```
https://api.lyft.com
```

## Authentication Flow

### 1. Get App Token (Client Credentials)

**Endpoint**: `POST /oauth2/access_token`

**Headers**:

```
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded; charset=utf-8
User-Agent: com.citibikenyc.citibike:iOS:18.6.2:2025.38.3.26642648
x-session: {base64 encoded session JSON}
x-client-session-id: {UUID}
x-timestamp-ms: {epoch milliseconds}
x-locale-language: en
x-locale-region: US
x-device-density: 3.0
x-design-id: x
user-device: iPhone16,1
upload-draft-interop-version: 6
upload-complete: ?1
x-timestamp-source: system
accept-language: en_US
accept: application/json
cookie: (empty string)
```

**Body**:

```
grant_type=client_credentials
```

**Response**:

```json
{
  "token_type": "Bearer",
  "access_token": "...",
  "expires_in": 86400
}
```

### 2. Request Phone OTP

**Endpoint**: `POST /v1/phoneauth`

**Headers**: Same as above, but with:

```
Authorization: Bearer {app_access_token from step 1}
Content-Type: application/json
x-idl-source: pb.api.endpoints.v1.phone_auth.CreatePhoneAuthRequest
accept: application/x-protobuf,application/json
x-location: {lat},{lon} (optional)
```

**Body**:

```json
{
  "phone_number": "+1XXXXXXXXXX",
  "voice_verification": false
}
```

**Response**: 200 OK (SMS sent to phone)

### 3. Verify OTP and Get User Token

**Endpoint**: `POST /oauth2/access_token`

**Headers**: Same as step 1

**Body**:

```
grant_type=urn:lyft:oauth2:grant_type:phone
phone_number={E.164 format phone}
phone_code={6 digit code from SMS}
identifiers={base64 encoded device identifiers JSON}
challenges={base64 encoded challenges JSON - OPTIONAL, only if challenge_required}
```

**Device Identifiers Format**:

```json
[
  {
    "type": "icloud",
    "source": "icloud",
    "name": "F5BA9612-74F3-4D43-A941-607C6325E2A0"
  }
]
```

**Success Response**:

```json
{
  "token_type": "Bearer",
  "access_token": "...",
  "expires_in": 86400,
  "refresh_token": "...",
  "user_id": "USER_ID_HERE",
  "scope": "offline privileged.price.upfront profile public rides.active_ride rides.read rides.request scopedurl users.create",
  "extension_code": "..."
}
```

**Challenge Required Response (401)**:

```json
{
  "error": "challenge_required",
  "error_description": "Are you [NAME]?\n\nYou can verify your account by entering the email address associated with your account.",
  "challenges": [
    {
      "identifier": "email_match",
      "data": "u***@e*****.com",
      "status": []
    }
  ],
  "prompt_actions": [
    { "action": "challenge", "message": "This is my account" },
    { "action": "force_new_account", "message": "Create a new account" }
  ]
}
```

### 4. Email Challenge (if required)

**Endpoint**: `POST /oauth2/access_token`

**Note**: Same endpoint as step 3, but includes the `email` parameter to verify account ownership.

**Headers**: Same as step 1

**Body**:

```
email={user_email_address}
grant_type=urn:lyft:oauth2:grant_type:phone
identifiers={base64 encoded empty identifiers: "W10="}
phone_code={6 digit code from SMS}
phone_number={E.164 format phone}
```

**Implementation Notes**:

- When challenge_required error is returned, the user must provide their email address
- The email is sent as a URL-encoded form parameter (not as a challenges object)
- Use empty identifiers array (`[]` encoded as base64: `W10=`) for the challenge request
- The email verification is done server-side by matching against the account's registered email
- Upon successful verification, returns the same response as step 3 (user token)

**Implemented in**: `lib/api/lyft-client.ts:145` (verifyEmailChallenge method)

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
- [ ] Bike Angel rewards screen parsing and display
- [ ] Station-based trip filtering (if needed in future)
- [ ] Export trip data (CSV/JSON download)
