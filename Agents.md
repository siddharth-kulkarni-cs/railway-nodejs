# Agents & Services Documentation

This document describes the various agents, services, and automated processes within the Contentstack Dictionary application.

## Table of Contents

1. [Status Aggregation Agents](#status-aggregation-agents)
2. [AI Service Agents](#ai-service-agents)
3. [Caching Agents](#caching-agents)
4. [Analytics & Profiling Agents](#analytics--profiling-agents)
5. [Network Tools Agents](#network-tools-agents)
6. [Data Processing Agents](#data-processing-agents)

---

## Status Aggregation Agents

### StatusAggregator
**Location:** `services/status-aggregator.js`

Main orchestrator that aggregates health status from multiple service providers.

**Responsibilities:**
- Coordinates status fetching from multiple services
- Calculates summary statistics (operational, degraded, outages, maintenance, errors)
- Manages 5-minute cache for aggregated results
- Provides unified API for status data

**Capabilities:**
- Parallel status fetching from all services
- Error handling with graceful degradation
- Cache management and invalidation
- Status categorization and normalization

**Related Services:**
- OpenAIStatusService
- AnthropicStatusService
- CloudflareStatusService

---

### OpenAIStatusService
**Location:** `services/status-aggregator.js`

Fetches and normalizes status data from OpenAI's status page.

**API Endpoint:** `https://status.openai.com/api/v2/summary.json`

**Features:**
- 5-minute caching
- Status normalization (none → operational, minor → degraded_performance, etc.)
- Component-level status tracking
- Incident and maintenance tracking
- 10-second timeout protection

---

### AnthropicStatusService
**Location:** `services/status-aggregator.js`

Fetches and normalizes status data from Anthropic's status page.

**API Endpoint:** `https://status.anthropic.com/api/v2/summary.json`

**Features:**
- Same capabilities as OpenAIStatusService
- Normalized status responses
- Component and incident tracking

---

### CloudflareStatusService
**Location:** `services/status-aggregator.js`

Fetches and normalizes status data from Cloudflare's status page.

**API Endpoint:** `https://www.cloudflarestatus.com/api/v2/summary.json`

**Features:**
- Same capabilities as other status services
- Network infrastructure status monitoring

---

## AI Service Agents

### Gemini AI Agent
**Location:** `services/gen-ai.js`

Interfaces with Google's Gemini API for content generation.

**Capabilities:**
- Word etymology and historical facts generation
- Joke generation with topic-based prompts
- Content caching (100-entry limit per cache type)
- Model selection (gemini-2.0-flash, gemini-2.5-flash)

**Endpoints Used:**
- `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**Caching Strategy:**
- Separate caches for word etymology and jokes
- LRU-style eviction when cache exceeds 100 entries
- Automatic cache management

---

### Groq AI Agent
**Location:** `services/groq-ai-client.js`

Interfaces with Groq API for fast language model inference.

**Capabilities:**
- Spelling correction and word definitions
- Joke generation with topic-based prompts
- Multi-language word analysis
- Model selection (llama-3.3-70b-versatile, openai/gpt-oss-120b)

**Models Used:**
- `llama-3.3-70b-versatile` - Primary model for general tasks
- `openai/gpt-oss-120b` - Alternative model (50% random selection for jokes)

**Caching Strategy:**
- Separate caches for word completions and jokes
- Cache hit/miss logging
- In-memory Map-based storage

**Special Features:**
- Handles non-English words
- Filters offensive content
- Provides spelling corrections

---

## Caching Agents

### Word Cache Agent
**Location:** `routes/index.js`

Manages in-memory caching for dictionary word lookups.

**Features:**
- Maximum 1000 entries
- Automatic cleanup (removes oldest 20% when limit exceeded)
- Timestamp-based cache management
- Periodic cleanup every hour

**Cache Key:** Word string (normalized)
**Cache Value:** Dictionary API response + AI-generated etymology

---

### Joke Cache Agent
**Location:** `services/gen-ai.js`, `services/groq-ai-client.js`

Caches joke responses from AI services.

**Features:**
- Separate caches per AI provider
- 100-entry limit per cache
- Prevents redundant API calls

---

### Tech News Cache Agent
**Location:** `routes/index.js`

Caches Hacker News top stories.

**Features:**
- 10-minute cache duration
- Fetches top 10 stories, displays top 6
- Stale cache fallback on errors
- Cache hit/miss tracking

**Source:** Hacker News Firebase API

---

### Status Cache Agent
**Location:** `services/status-aggregator.js`

Caches status page responses.

**Features:**
- 5-minute cache duration
- Per-service caching
- Aggregate cache for combined results
- Manual cache invalidation via `refresh=true` query parameter

---

## Analytics & Profiling Agents

### User Profiling Agent
**Location:** `routes/index.js`

Comprehensive user fingerprinting and behavior tracking.

**Fingerprinting Dimensions:**
1. **Device Fingerprint**
   - User-Agent hash
   - Accept-Language
   - Accept-Encoding
   - IP address

2. **Browser Fingerprint**
   - Accept headers
   - Cache-Control
   - Security headers (Sec-Fetch-*)
   - DNT (Do Not Track)

3. **Network Fingerprint**
   - IP address and hash
   - Cloudflare headers (country, region, city)
   - Forwarded IPs
   - Connection type

4. **Timing Fingerprint**
   - Request timestamp
   - Timezone offset
   - Day of week, hour of day
   - Business hours detection

5. **Session Fingerprint**
   - Session ID
   - Cookie presence
   - Session state

6. **Traffic Fingerprint**
   - Referer domain
   - Search engine detection
   - UTM parameters
   - Click IDs (gclid, fbclid)

7. **Behavior Fingerprint**
   - Search term analysis
   - Word characteristics (length, caps, special chars)
   - Profanity detection
   - Common word detection

8. **System Fingerprint**
   - Node.js version
   - Platform and architecture
   - Memory and CPU usage
   - Process ID

**Events Tracked:**
- Page views
- Word searches
- Joke requests
- API responses
- Errors
- Cache hits/misses
- Status dashboard access
- Network tool usage

---

### Mixpanel Analytics Agent
**Location:** `services/mixpanel.js`

Handles all analytics event tracking via Mixpanel.

**Event Types:**
- `PAGE_VIEW` - Page access tracking
- `WORD_SEARCHED` - Dictionary lookups
- `JOKE_REQUESTED` - Joke generation requests
- `CONTENTSTACK_REDIRECT` - Special redirect tracking
- `STATUS_AGGREGATION_REQUEST` - Status page requests
- `NETWORK_TOOLS_ACCESS` - Network tool usage
- `DEV_TOOLS_ACCESS` - Developer tools access
- Error tracking for all endpoints

**Features:**
- Comprehensive event properties
- User profile enrichment
- Error tracking
- Performance metrics

---

## Network Tools Agents

### DNS Lookup Agent
**Location:** `routes/index.js`

Performs DNS record lookups.

**Supported Record Types:**
- A (IPv4)
- AAAA (IPv6)
- CNAME
- MX (Mail Exchange)
- NS (Name Server)
- TXT

**Features:**
- 5-second timeout
- Input validation
- Error handling
- Analytics tracking

---

### Reverse DNS Agent
**Location:** `routes/index.js`

Performs reverse DNS lookups (PTR records).

**Features:**
- IPv4 and IPv6 support
- 5-second timeout
- IP validation
- Analytics tracking

---

### HTTP Ping Agent
**Location:** `routes/index.js`

Checks HTTP/HTTPS availability of hosts.

**Features:**
- Tries HTTPS first, then HTTP
- Configurable timeout (1-15 seconds, default 5s)
- Returns status code and response time
- Hostname/IP validation

---

### Traceroute Agent
**Location:** `routes/index.js`

Performs network path tracing.

**Features:**
- Multi-platform support (traceroute, tracepath, tracert)
- Configurable max hops (3-20, default 12)
- 8-second timeout
- Output parsing and formatting

**Platform Detection:**
- Unix/Linux: `traceroute`
- Linux fallback: `tracepath`
- Windows: `tracert`

---

## Data Processing Agents

### Reverse Geocoding Agent
**Location:** `routes/index.js`

Converts latitude/longitude coordinates to location information.

**Data Source:** OpenStreetMap Nominatim API

**Features:**
- Coordinate validation (-90 to 90 for lat, -180 to 180 for lon)
- Multiple city field fallbacks (city, town, village, municipality, suburb)
- Country code extraction
- State/province information
- Postal code extraction
- Analytics tracking

**Response Format:**
- Coordinates (lat, lon)
- Location (city, state, country, countryCode, postalCode, displayName)
- Raw address data
- Attribution information

---

### Dictionary API Agent
**Location:** `routes/index.js`

Fetches word definitions from external dictionary API.

**Data Source:** `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

**Features:**
- Parallel API calls (dictionary + AI etymology)
- Cache integration
- Error handling with fallback to spelling correction
- HTML generation for definitions
- Example sentences extraction

**Processing:**
- Extracts meanings, definitions, examples
- Formats part of speech
- Integrates AI-generated etymology
- Handles word not found scenarios

---

### Firebase Data Agent
**Location:** `services/firebase.service.js`

Retrieves sample data from Firebase.

**Features:**
- Service account authentication
- Sample data retrieval
- Error handling
- Analytics tracking

**Access:** Protected endpoint requiring Firebase credentials

---

## Agent Interaction Patterns

### Request Flow Example: Word Lookup

1. **User Request** → Routes handler receives word query
2. **User Profiling Agent** → Generates comprehensive fingerprint
3. **Cache Agent** → Checks word cache
4. **Dictionary API Agent** → Fetches definition (if cache miss)
5. **AI Agent Selection** → Randomly selects Gemini or Groq
6. **AI Agent** → Generates etymology (checks AI cache first)
7. **Analytics Agent** → Tracks successful response
8. **Response Generation** → Combines dictionary + AI data
9. **Cache Update** → Stores result in word cache

### Request Flow Example: Status Aggregation

1. **User Request** → Status dashboard access
2. **Status Aggregator** → Checks aggregate cache
3. **Service Agents** → Parallel fetch from OpenAI, Anthropic, Cloudflare
4. **Status Normalization** → Each service normalizes its data
5. **Summary Calculation** → Aggregator calculates statistics
6. **Cache Update** → Stores aggregated result
7. **Analytics Agent** → Tracks status request
8. **Response** → Returns unified status data

---

## Configuration & Environment

### Required Environment Variables

- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase credentials (optional)
- `PORT` - Server port (default: 3000)
- Mixpanel configuration (via `services/mixpanel.js`)

### Cache Configuration

- **Word Cache:** 1000 entries max, hourly cleanup
- **Joke Cache:** 100 entries per provider
- **Status Cache:** 5 minutes duration
- **Tech News Cache:** 10 minutes duration

---

## Error Handling

All agents implement error handling strategies:

1. **Graceful Degradation** - Returns error states instead of throwing
2. **Cache Fallbacks** - Uses stale cache on errors when available
3. **Timeout Protection** - Network requests have configurable timeouts
4. **Error Tracking** - All errors are logged and tracked via Mixpanel
5. **User-Friendly Messages** - Error responses include helpful information

---

## Performance Optimizations

1. **Parallel Processing** - Multiple API calls executed concurrently
2. **Aggressive Caching** - Multiple cache layers reduce API calls
3. **Cache Cleanup** - Automatic memory management
4. **Request Timeouts** - Prevents hanging requests
5. **Response Compression** - Express handles compression
6. **Static File Caching** - Long-term caching for static assets

---

## Monitoring & Observability

- **Mixpanel Events** - Comprehensive event tracking
- **Console Logging** - Cache hits/misses, API calls
- **Error Logging** - Detailed error information
- **Performance Metrics** - Response times tracked
- **User Analytics** - Comprehensive user profiling

---

## Future Enhancements

Potential agent additions:

1. **Scheduled Task Agent** - Automated background jobs
2. **Rate Limiting Agent** - Request throttling
3. **Health Check Agent** - Service health monitoring
4. **Metrics Collection Agent** - Performance metrics aggregation
5. **Notification Agent** - Alert system for status changes
6. **Data Backup Agent** - Cache persistence
7. **Search Indexing Agent** - Full-text search capabilities

