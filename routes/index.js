const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const dnsPromises = require('dns').promises;
const router = express.Router();
const { contentstackRedirectFragment, dynamicWordFragement, inputTextFragment } = require('../services/html-fragments');
const { generateContent, generateJoke } = require('../services/gen-ai');
const { getCompletionForWrongWord, getJokeFromGroq } = require('../services/groq-ai-client');
const mixpanel = require('../services/mixpanel');
const { getSampleData } = require('../services/firebase.service');
const crypto = require('crypto');

const api_key = process.env.GEMINI_API_KEY;

// Aggressive user profiling and fingerprinting
function generateDeviceFingerprint(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';
  const ip = req.ip || '';
  
  const fingerprint = crypto.createHash('sha256')
    .update(userAgent + acceptLanguage + acceptEncoding + ip)
    .digest('hex');
  
  return fingerprint.substring(0, 16); // Shortened for readability
}

function parseUserAgent(userAgent) {
  if (!userAgent) return {};
  
  // Basic browser detection
  const browsers = {
    chrome: /chrome\/(\d+)/i,
    firefox: /firefox\/(\d+)/i,
    safari: /safari\/(\d+)/i,
    edge: /edg\/(\d+)/i,
    opera: /opera\/(\d+)/i
  };
  
  // OS detection
  const os = {
    windows: /windows nt (\d+\.\d+)/i,
    mac: /mac os x (\d+[._]\d+)/i,
    linux: /linux/i,
    android: /android (\d+\.\d+)/i,
    ios: /os (\d+_\d+)/i
  };
  
  // Device detection
  const devices = {
    mobile: /mobile/i,
    tablet: /tablet|ipad/i,
    desktop: !(/mobile|tablet|ipad/i.test(userAgent))
  };
  
  let browserInfo = { name: 'unknown', version: 'unknown' };
  let osInfo = { name: 'unknown', version: 'unknown' };
  let deviceType = 'unknown';
  
  // Parse browser
  for (const [name, regex] of Object.entries(browsers)) {
    const match = userAgent.match(regex);
    if (match) {
      browserInfo = { name, version: match[1] };
      break;
    }
  }
  
  // Parse OS
  for (const [name, regex] of Object.entries(os)) {
    const match = userAgent.match(regex);
    if (match) {
      osInfo = { name, version: match[1] || 'unknown' };
      break;
    }
  }
  
  // Parse device type
  if (devices.mobile.test(userAgent)) deviceType = 'mobile';
  else if (devices.tablet.test(userAgent)) deviceType = 'tablet';
  else if (devices.desktop) deviceType = 'desktop';
  
  return {
    browser: browserInfo,
    os: osInfo,
    deviceType,
    isBot: /bot|crawl|spider|scrape/i.test(userAgent),
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop'
  };
}

function getNetworkFingerprint(req) {
  return {
    ip: req.ip,
    ipHash: crypto.createHash('md5').update(req.ip).digest('hex').substring(0, 8),
    forwardedIps: req.get('x-forwarded-for') || '',
    cfCountry: req.get('visitor-ip-country') || '',
    cfRegion: req.get('visitor-ip-region') || '',
    cfCity: req.get('visitor-ip-city') || '',
    connection: req.get('connection') || '',
    protocol: req.protocol,
    hostname: req.hostname,
    port: req.get('x-forwarded-port') || req.socket?.remotePort || 'unknown'
  };
}

function getBrowserFingerprint(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';
  
  return {
    acceptLanguage,
    acceptEncoding,
    acceptCharset: req.get('accept-charset') || '',
    accept: req.get('accept') || '',
    cacheControl: req.get('cache-control') || '',
    pragma: req.get('pragma') || '',
    upgradeInsecureRequests: req.get('upgrade-insecure-requests') || '',
    dnt: req.get('dnt') || '', // Do Not Track
    secFetchDest: req.get('sec-fetch-dest') || '',
    secFetchMode: req.get('sec-fetch-mode') || '',
    secFetchSite: req.get('sec-fetch-site') || '',
    secFetchUser: req.get('sec-fetch-user') || '',
    xRequestedWith: req.get('x-requested-with') || ''
  };
}

function getTimingFingerprint(req) {
  const now = new Date();
  return {
    timestamp: now.toISOString(),
    timestampUnix: now.getTime(),
    localTime: now.toLocaleString(),
    utcTime: now.toUTCString(),
    timezone: now.getTimezoneOffset(),
    dayOfWeek: now.getDay(),
    hourOfDay: now.getHours(),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    isBusinessHours: now.getHours() >= 9 && now.getHours() <= 17,
    requestTime: Date.now()
  };
}

function getSessionFingerprint(req) {
  return {
    sessionId: req.sessionID || 'no-session',
    sessionExists: !!req.session,
    isNewSession: !req.session || Object.keys(req.session).length <= 1,
    cookieEnabled: !!req.get('cookie'),
    cookies: req.get('cookie') ? req.get('cookie').split(';').length : 0
  };
}

function getTrafficFingerprint(req) {
  const referer = req.get('referer') || '';
  let refererDomain = 'direct';
  let isSearchEngine = false;
  let searchEngine = '';
  
  if (referer) {
    try {
      const url = new URL(referer);
      refererDomain = url.hostname;
      
      // Detect search engines
      const searchEngines = {
        google: /google\./,
        bing: /bing\./,
        yahoo: /yahoo\./,
        duckduckgo: /duckduckgo\./,
        yandex: /yandex\./,
        baidu: /baidu\./
      };
      
      for (const [engine, regex] of Object.entries(searchEngines)) {
        if (regex.test(refererDomain)) {
          isSearchEngine = true;
          searchEngine = engine;
          break;
        }
      }
    } catch (e) {
      refererDomain = 'invalid-url';
    }
  }
  
  return {
    referer,
    refererDomain,
    isSearchEngine,
    searchEngine,
    isDirect: !referer,
    utmSource: req.query.utm_source || '',
    utmMedium: req.query.utm_medium || '',
    utmCampaign: req.query.utm_campaign || '',
    utmTerm: req.query.utm_term || '',
    utmContent: req.query.utm_content || '',
    fbclid: req.query.fbclid || '', // Facebook click ID
    gclid: req.query.gclid || '', // Google click ID
  };
}

function getBehaviorFingerprint(req, word = '') {
  return {
    searchTerm: word.toLowerCase(),
    searchLength: word.length,
    hasNumbers: /\d/.test(word),
    hasSpecialChars: /[^a-zA-Z0-9\s]/.test(word),
    isAllCaps: word === word.toUpperCase(),
    isAllLower: word === word.toLowerCase(),
    hasSpaces: /\s/.test(word),
    wordCount: word.split(/\s+/).length,
    startsWithVowel: /^[aeiou]/i.test(word),
    isCommonWord: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'].includes(word.toLowerCase()),
    containsProfanity: /damn|hell|shit|fuck|ass|bitch/i.test(word)
  };
}

function getSystemFingerprint() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    serverTime: new Date().toISOString(),
    pid: process.pid
  };
}

function getComprehensiveUserProfile(req, additionalData = {}) {
  const userAgent = parseUserAgent(req.get('user-agent'));
  const network = getNetworkFingerprint(req);
  const browser = getBrowserFingerprint(req);
  const timing = getTimingFingerprint(req);
  const session = getSessionFingerprint(req);
  const traffic = getTrafficFingerprint(req);
  const system = getSystemFingerprint();
  
  return {
    // Unique identifiers
    deviceFingerprint: generateDeviceFingerprint(req),
    sessionFingerprint: req.sessionID || 'anonymous',
    
    // User agent analysis
    ...userAgent,
    userAgentRaw: req.get('user-agent') || '',
    
    // Network fingerprinting
    ...network,
    
    // Browser fingerprinting
    ...browser,
    
    // Timing analysis
    ...timing,
    
    // Session analysis
    ...session,
    
    // Traffic analysis
    ...traffic,
    
    // System information
    ...system,
    
    // Additional custom data
    ...additionalData
  };
}

// Add a simple in-memory cache
const wordCache = new Map();
const CACHE_MAX_SIZE = 1000; // Maximum number of entries to prevent memory issues

// Cache cleanup function
function cleanupCache() {
  if (wordCache.size > CACHE_MAX_SIZE) {
    // Remove oldest 20% of entries when cache gets too large
    const keysToDelete = [...wordCache.keys()]
      .sort((a, b) => wordCache.get(a).timestamp - wordCache.get(b).timestamp)
      .slice(0, Math.floor(CACHE_MAX_SIZE * 0.2));

    keysToDelete.forEach(key => wordCache.delete(key));
    console.log(`Cache cleanup: removed ${keysToDelete.length} oldest entries`);
  }
}

// Periodically clean cache (every hour)
setInterval(cleanupCache, 60 * 60 * 1000);

// Serve the index.html file for the root route
router.get('/', (req, res) => {
  // Track page view with comprehensive user profiling
  mixpanel.track(mixpanel.EVENTS.PAGE_VIEW, getComprehensiveUserProfile(req, {
    page: 'home',
    path: req.path,
    cacheSize: wordCache.size,
    eventType: 'landing_page',
    serverLoad: process.cpuUsage().user
  }));

  // Calculate expiration one year from now
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  // Set aggressive caching headers
  res.set({
    'Cache-Control': 'public, max-age=31536000', // Cache for 1 year (in seconds)
    'Expires': oneYearFromNow.toUTCString(),
    'ETag': '"homepage-v1"', // Simple version-based ETag
    'X-Content-Type-Options': 'nosniff'
  });
  
  res.sendFile(path.join(__dirname, '../views/index.html'));
  return;
});

// New route for animations
router.get('/animations', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/animations.html'));
});

router.get('/word-usage', async (req, res) => {
  const startTime = Date.now(); // Track timing
  let word = req.query.word;
  console.log('Word:', word);
  if (!word || word.trim().length === 0) {
    console.log('No word provided');
    // res.sendFile(path.join(__dirname, '../views/index.html'));
    res.redirect("/")
    return; // Add return to prevent further execution
  }

  // Track word search event with comprehensive user profiling
  const behaviorProfile = getBehaviorFingerprint(req, word);
  mixpanel.track(mixpanel.EVENTS.WORD_SEARCHED, getComprehensiveUserProfile(req, {
    word: word.trim().toLowerCase(),
    originalWord: word,
    cacheHit: wordCache.has(word),
    cacheSize: wordCache.size,
    eventType: 'word_search',
    ...behaviorProfile
  }));

   // Fix the contentstack check and add redirection
  // In your word-usage route handler
  word = word.trim();
 console.log(`word == ${word}`)
if(word.toLowerCase() === 'contentstack') {
  console.log('Showing loader before redirecting to Contentstack website');
  
  // Track Contentstack redirect with comprehensive user profiling
  const redirectBehavior = getBehaviorFingerprint(req, word);
  mixpanel.track(mixpanel.EVENTS.CONTENTSTACK_REDIRECT, getComprehensiveUserProfile(req, {
    word: word,
    triggerWord: 'contentstack',
    eventType: 'special_redirect',
    redirectType: 'contentstack_easter_egg',
    ...redirectBehavior
  }));
  
  // Send an HTML page with loader and auto-redirect
  return res.send(contentstackRedirectFragment());
}

  try {
    let data;
    // Check if word is in cache
    if (wordCache.has(word)) {
      console.log(`Cache hit for word: ${word}`);
      const cacheEntry = wordCache.get(word);
      // Update timestamp to mark as recently used
      cacheEntry.timestamp = Date.now();
      data = cacheEntry.data;
    } else {
      console.log(`Cache miss for word: ${word}, fetching from API`);
      
      // Run API calls in parallel
      const dictionaryPromise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const genAIPromise = api_key ? generateContent(api_key, word) : Promise.resolve(null);
      
      const [response, genAIResponse] = await Promise.all([
        dictionaryPromise,
        genAIPromise
      ]);
      
      data = await response.json();
      data.genAIResponse = genAIResponse;
      
      console.log('genAIResponse', genAIResponse);
      
      // Track API response quality with comprehensive profiling
      const apiResponseProfile = getBehaviorFingerprint(req, word);
      mixpanel.track('API_RESPONSE', getComprehensiveUserProfile(req, {
        word: word.trim().toLowerCase(),
        responseTime: Date.now() - startTime,
        apiSuccess: !!data[0]?.meanings,
        hasAiResponse: !!genAIResponse,
        definitionCount: data[0]?.meanings?.length || 0,
        hasExamples: data[0]?.meanings?.some(m => m.definitions.some(d => d.example)) || false,
        partOfSpeechCount: data[0]?.meanings?.length || 0,
        eventType: 'api_response',
        cacheHit: false, // This is always a cache miss
        ...apiResponseProfile
      }));
      
      // Store in cache with timestamp
      wordCache.set(word, {
        data: data,
        timestamp: Date.now()
      });

      // Cleanup cache if needed
      if (wordCache.size > CACHE_MAX_SIZE) {
        cleanupCache();
      }
    }
    let html = dynamicWordFragement(word);
    if (!data || data.length === 0 || !data[0] || !data[0].meanings || !data[0].meanings[0] || !data[0].meanings[0].definitions || !data[0].meanings[0].definitions[0]) {
      console.log('No data found');
      
      // Track word not found with comprehensive profiling
      const notFoundProfile = getBehaviorFingerprint(req, word);
      mixpanel.track('WORD_NOT_FOUND', getComprehensiveUserProfile(req, {
        word: word.trim().toLowerCase(),
        eventType: 'word_not_found',
        apiFailure: true,
        fallbackUsed: true,
        ...notFoundProfile
      }));
      
      const completion = await getCompletionForWrongWord(word);
      html += `
        <div class="gen-ai-section" style="margin-top: 2rem; background-color: var(--light-bg); border-radius: 8px; box-shadow: var(--shadow); padding: 1.5rem; border-left: 4px solid var(--accent-color);">
          <h3 class="gen-ai-response-title" style="color: var(--primary-color); margin-bottom: 1rem; font-size: 1.4rem;">${word} may not be spelled correctly, or is not an English word</h3>
          <div class="gen-ai-response-content" style="line-height: 1.7; color: var(--text-color);">${completion.choices[0]?.message?.content || ""}</div>
        </div>
      `;
      html += `
        </div>
        <a href="/" class="back-link">Back to Home</a>
      </body>
      </html>
      `;
      res.send(html);
      return
    }

    // Create HTML response
    

    // Add this before the closing </div> tag and the back link
    html += inputTextFragment();

    if (data.genAIResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const aiText = data.genAIResponse.candidates[0].content.parts[0].text;
      html += `
        <div class="gen-ai-section" style="margin-top: 2rem; background-color: var(--light-bg); border-radius: 8px; box-shadow: var(--shadow); padding: 1.5rem; border-left: 4px solid var(--accent-color);">
          <h3 class="gen-ai-response-title" style="color: var(--primary-color); margin-bottom: 1rem; font-size: 1.4rem;">${word} etymology and historical fact</h3>
          <div class="gen-ai-response-content" style="line-height: 1.7; color: var(--text-color);">${aiText}</div>
        </div>
      `;
    }

    // Add all meanings and definitions
    data[0].meanings.forEach(meaning => {
      html += `<h3 class="part-of-speech">${meaning.partOfSpeech}</h3>`;

      meaning.definitions.forEach((def, index) => {
        html += `
          <div class="definition">
            <strong>${index + 1}.</strong> ${def.definition}
            ${def.example ? `<div class="example"><strong>Example:</strong> "${def.example}"</div>` : ''}
          </div>`;
      });
    });

    html += `
        </div>
        <a href="/" class="back-link">Back to Home</a>
      </body>
      </html>
      `;

    // Set aggressive caching headers
    // Calculate expiration one year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year (in seconds)
      'Expires': oneYearFromNow.toUTCString(),
      'ETag': `"${Buffer.from(word).toString('base64')}"`, // Simple ETag based on the word
    });

    // Send HTML response
    res.send(html);

  } catch (error) {
    console.error('Error fetching word data:', error);
    
    // Track API error with comprehensive profiling
    const errorProfile = word ? getBehaviorFingerprint(req, word) : {};
    mixpanel.track('API_ERROR', getComprehensiveUserProfile(req, {
      word: word ? word.trim().toLowerCase() : 'unknown',
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack ? error.stack.substring(0, 500) : '', // First 500 chars
      eventType: 'api_error',
      criticalError: true,
      ...errorProfile
    }));
    
    // Don't cache error responses
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate'
    });
    res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error</h1>
            <p>Failed to fetch word data: ${error.message}</p>
            <p><a href="/">Back to Home</a></p>
          </body>
        </html>
      `);
  }
});


router.get('/joke', async (req, res) => {
  const startTime = Date.now(); // Track timing for jokes
  // get the topic from the query params
  const topic = req.query.topic;
  if (!topic || topic.trim().length === 0) {
    res.status(400).send('Topic is required');
    return;
  }

  
  // randomly call gemini or groq api
  const random = Math.random();
  console.log(`Headers::::`)
  console.log(req.headers)
  console.log(req.headers['accept-encoding'])
  // Track joke request with comprehensive user profiling
  const selectedModel = random < 0.5 ? 'groq' : 'gemini';
  const jokeProfile = getBehaviorFingerprint(req, topic);
  mixpanel.track(mixpanel.EVENTS.JOKE_REQUESTED, getComprehensiveUserProfile(req, {
    topic: topic.trim(),
    model: selectedModel,
    modelSelectionRandom: random,
    eventType: 'joke_request',
    hasApiKey: !!api_key,
    ...jokeProfile
  }));
  if (random < 0.5) {
    console.log('Using Groq API for joke');
    const joke = await getJokeFromGroq(topic);
    if(!joke){
      res.status(500).send('Failed to get joke from Groq');
      return;
    }
    let jokeText = joke.choices[0]?.message?.content;

    // if joke contains the tag <think> then remove all contents between <think> and </think>
    jokeText = jokeText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Track successful joke response with comprehensive profiling
    const jokeSuccessProfile = getBehaviorFingerprint(req, topic);
    mixpanel.track('JOKE_SUCCESS', getComprehensiveUserProfile(req, {
      topic: topic.trim(),
      model: 'groq',
      jokeText: jokeText,
      jokeLength: jokeText.length,
      jokeQuality: jokeText.length > 50 ? 'good' : 'short',
      eventType: 'joke_success',
      responseTime: Date.now() - startTime,
      ...jokeSuccessProfile
    }));
    
    console.log(jokeText);
    res.send(jokeText);
  } else {
    console.log('Using Gemini API for joke');
    const joke = await generateJoke(api_key, topic);
    // console.log('joke', joke);
    if(!joke){
      res.status(500).send('Failed to get joke from Gemini');
      return;
    }
    const jokeText = joke.candidates[0].content.parts[0].text;
    
    // Track successful joke response with comprehensive profiling
    const jokeSuccessProfile = getBehaviorFingerprint(req, topic);
    mixpanel.track('JOKE_SUCCESS', getComprehensiveUserProfile(req, {
      topic: topic.trim(),
      model: 'gemini',
      jokeText: jokeText,
      jokeLength: jokeText.length,
      jokeQuality: jokeText.length > 50 ? 'good' : 'short',
      eventType: 'joke_success',
      responseTime: Date.now() - startTime,
      ...jokeSuccessProfile
    }));
    
    res.send(jokeText);
  }
  
});

router.get('/dev-tools', (req, res) => {
  // Track dev tools access with comprehensive profiling
  mixpanel.track('DEV_TOOLS_ACCESS', getComprehensiveUserProfile(req, {
    page: 'dev-tools',
    eventType: 'dev_tools_access',
    isDeveloper: true,
    toolsAccessed: ['dev-tools'],
    technicalUser: true
  }));
  
  res.sendFile(path.join(__dirname, '../views/dev-tools.html'));
});

router.get('/data-analysis', async (req, res) => {
  try {
    // Track data analysis access with comprehensive profiling
    mixpanel.track('DATA_ANALYSIS_ACCESS', getComprehensiveUserProfile(req, {
      page: 'data-analysis',
      eventType: 'data_analysis_access',
      hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      isAnalyst: true,
      technicalAccess: true
    }));
    
    if(!process.env.FIREBASE_SERVICE_ACCOUNT_KEY){
      res.status(404).send()
      return
    }
    const data = await getSampleData();
    res.status(200).json(data);
  } catch (error) {
    // Track data analysis error
    mixpanel.track('DATA_ANALYSIS_ERROR', getComprehensiveUserProfile(req, {
      errorType: error.name,
      errorMessage: error.message,
      eventType: 'data_analysis_error'
    }));
    
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------
// Network Tools UI
// ------------------------------
router.get('/network-tools', (req, res) => {
  mixpanel.track('NETWORK_TOOLS_ACCESS', getComprehensiveUserProfile(req, {
    page: 'network-tools',
    eventType: 'network_tools_access'
  }));
  res.sendFile(path.join(__dirname, '../views/network-tools.html'));
});

// ------------------------------
// Helpers for network operations
// ------------------------------
const HOSTNAME_REGEX = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/;
const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;
const IPV6_REGEX = /^[0-9a-fA-F:]{2,39}$/;

function isValidHostnameOrIp(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  return HOSTNAME_REGEX.test(trimmed) || IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed);
}

function withTimeout(promise, ms, onTimeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { onTimeout && onTimeout(); } catch (_) { /* noop */ }
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function httpPingHost(host, timeoutMs = 5000) {
  if (!isValidHostnameOrIp(host)) throw new Error('Invalid host');
  const controller = new AbortController();
  const urlCandidates = [
    `https://${host}/`,
    `http://${host}/`
  ];
  const start = Date.now();
  for (const url of urlCandidates) {
    try {
      const response = await withTimeout(
        fetch(url, { method: 'HEAD', signal: controller.signal }),
        timeoutMs,
        () => controller.abort()
      );
      const ms = Date.now() - start;
      return { urlTried: url, status: response.status, ok: response.ok, ms };
    } catch (err) {
      // try next
    }
  }
  throw new Error('HTTP ping failed for both HTTPS and HTTP');
}

function runTraceroute(host, maxHops = 15, perHopProbes = 1, timeoutMs = 8000) {
  if (!isValidHostnameOrIp(host)) return Promise.reject(new Error('Invalid host'));
  // Prefer traceroute on Unix-like systems; fall back to tracepath; Windows 'tracert'
  const tryCommands = [
    { cmd: 'traceroute', args: ['-m', String(maxHops), '-q', String(perHopProbes), host] },
    { cmd: 'tracepath', args: ['-m', String(maxHops), host] },
    { cmd: 'tracert', args: ['-h', String(maxHops), host] }
  ];
  let proc;
  const attempt = (idx) => {
    if (idx >= tryCommands.length) return Promise.reject(new Error('Traceroute utility not available'));
    const { cmd, args } = tryCommands[idx];
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      try {
        proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        return resolve(null); // try next command
      }
      const killer = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch (_) {}
      }, timeoutMs);
      proc.stdout.on('data', (d) => { if (stdout.length < 100000) stdout += d.toString(); });
      proc.stderr.on('data', (d) => { if (stderr.length < 20000) stderr += d.toString(); });
      proc.on('error', () => resolve(null));
      proc.on('close', (code) => {
        clearTimeout(killer);
        if (code === 0 || stdout) return resolve({ cmd, args, stdout });
        resolve(null);
      });
    }).then((res) => res || attempt(idx + 1));
  };
  return attempt(0);
}

// ------------------------------
// Network Tools APIs (secured)
// ------------------------------
router.get('/api/network/dns-lookup', async (req, res) => {
  try {
    const host = String(req.query.host || '').trim();
    const type = String(req.query.type || 'A').toUpperCase();
    const allowed = new Set(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT']);
    if (!isValidHostnameOrIp(host)) return res.status(400).json({ error: 'Invalid host' });
    if (!allowed.has(type)) return res.status(400).json({ error: 'Unsupported DNS type' });

    mixpanel.track('NETWORK_DNS_LOOKUP', getComprehensiveUserProfile(req, { host, type, eventType: 'dns_lookup' }));

    const resolverMap = {
      A: () => dnsPromises.resolve4(host),
      AAAA: () => dnsPromises.resolve6(host),
      CNAME: () => dnsPromises.resolveCname(host),
      MX: () => dnsPromises.resolveMx(host),
      NS: () => dnsPromises.resolveNs(host),
      TXT: () => dnsPromises.resolveTxt(host),
    };

    const result = await withTimeout(resolverMap[type](), 5000);
    return res.json({ host, type, result });
  } catch (err) {
    mixpanel.track('NETWORK_DNS_LOOKUP_ERROR', getComprehensiveUserProfile(req, { error: String(err.message), eventType: 'dns_lookup_error' }));
    return res.status(500).json({ error: 'DNS lookup failed', message: String(err.message) });
  }
});

router.get('/api/network/reverse-dns', async (req, res) => {
  try {
    const ip = String(req.query.ip || '').trim();
    if (!(IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip))) return res.status(400).json({ error: 'Invalid IP' });

    mixpanel.track('NETWORK_REVERSE_DNS', getComprehensiveUserProfile(req, { ip, eventType: 'reverse_dns' }));
    const result = await withTimeout(dnsPromises.reverse(ip), 5000);
    return res.json({ ip, result });
  } catch (err) {
    mixpanel.track('NETWORK_REVERSE_DNS_ERROR', getComprehensiveUserProfile(req, { error: String(err.message), eventType: 'reverse_dns_error' }));
    return res.status(500).json({ error: 'Reverse DNS failed', message: String(err.message) });
  }
});

router.get('/api/network/http-ping', async (req, res) => {
  try {
    const host = String(req.query.host || '').trim();
    if (!isValidHostnameOrIp(host)) return res.status(400).json({ error: 'Invalid host' });
    const timeoutMs = Math.min(Math.max(parseInt(String(req.query.timeoutMs || '5000'), 10) || 5000, 1000), 15000);

    mixpanel.track('NETWORK_HTTP_PING', getComprehensiveUserProfile(req, { host, timeoutMs, eventType: 'http_ping' }));
    const result = await httpPingHost(host, timeoutMs);
    return res.json({ host, ...result });
  } catch (err) {
    mixpanel.track('NETWORK_HTTP_PING_ERROR', getComprehensiveUserProfile(req, { error: String(err.message), eventType: 'http_ping_error' }));
    return res.status(500).json({ error: 'HTTP ping failed', message: String(err.message) });
  }
});

router.get('/api/network/traceroute', async (req, res) => {
  try {
    const host = String(req.query.host || '').trim();
    const maxHops = Math.min(Math.max(parseInt(String(req.query.maxHops || '12'), 10) || 12, 3), 20);
    if (!isValidHostnameOrIp(host)) return res.status(400).json({ error: 'Invalid host' });

    mixpanel.track('NETWORK_TRACEROUTE', getComprehensiveUserProfile(req, { host, maxHops, eventType: 'traceroute' }));
    const resTrace = await runTraceroute(host, maxHops, 1, 8000);
    if (!resTrace) return res.status(503).json({ error: 'Traceroute not available in this environment' });
    return res.json({ host, cmd: resTrace.cmd, args: resTrace.args, output: resTrace.stdout });
  } catch (err) {
    mixpanel.track('NETWORK_TRACEROUTE_ERROR', getComprehensiveUserProfile(req, { error: String(err.message), eventType: 'traceroute_error' }));
    return res.status(500).json({ error: 'Traceroute failed', message: String(err.message) });
  }
});

// Route to serve the reverse geocoding demo page
router.get('/reverse-geocode-demo', (req, res) => {
  // res.sendFile(path.join(__dirname, '../views/index.html'));
  res.sendFile(path.join(__dirname, '../public/reverse-geocode-demo.html'));
});

// Reverse Geocoding API Route
// Converts latitude and longitude coordinates to city and country information
router.get('/api/reverse-geocode', async (req, res) => {
  try {
    // Extract and validate query parameters
    const { lat, lon, lng } = req.query;
    
    // Support both 'lon' and 'lng' for longitude
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon || lng);
    console.log(`latitude: ${latitude}, longitude: ${longitude}`);
    
    // Input validation
    if (!lat || (!lon && !lng)) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide lat and lon (or lng) query parameters',
        example: '/api/reverse-geocode?lat=40.7128&lon=-74.0060'
      });
    }
    
    // Validate numeric values
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers',
        provided: { lat, lon: lon || lng }
      });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: 'Invalid latitude',
        message: 'Latitude must be between -90 and 90 degrees',
        provided: latitude
      });
    }
    
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid longitude',
        message: 'Longitude must be between -180 and 180 degrees',
        provided: longitude
      });
    }
    
    // Track API usage with Mixpanel
    mixpanel.track('REVERSE_GEOCODE_REQUEST', getComprehensiveUserProfile(req, {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      eventType: 'reverse_geocode'
    }));
    
    // Call OpenStreetMap Nominatim API for reverse geocoding
    // Free service, no API key required, but includes User-Agent header per their requirements
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'ContentstackDictionary/1.0 (https://github.com/yourusername/contentstack-dictionary)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding service returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle case where no location is found (e.g., middle of ocean)
    if (data.error) {
      return res.status(404).json({
        error: 'Location not found',
        message: data.error,
        coordinates: { latitude, longitude }
      });
    }
    
    // Extract relevant location information
    const address = data.address || {};
    
    // Build response with city and country information
    // Try multiple fields for city as Nominatim uses different fields based on location type
    const city = address.city || 
                 address.town || 
                 address.village || 
                 address.municipality ||
                 address.suburb ||
                 address.county ||
                 address.state_district ||
                 null;
    
    const country = address.country || null;
    const countryCode = address.country_code?.toUpperCase() || null;
    
    // Additional useful information
    const state = address.state || address.province || null;
    const postalCode = address.postcode || null;
    const displayName = data.display_name || null;
    
    // Build response object
    const locationInfo = {
      coordinates: {
        latitude,
        longitude
      },
      location: {
        city,
        state,
        country,
        countryCode,
        postalCode,
        displayName
      },
      // Include raw address for debugging/additional info if needed
      rawAddress: address,
      // OpenStreetMap attribution as required by their terms
      attribution: data.licence || 'Data © OpenStreetMap contributors'
    };
    
    // Track successful geocoding
    mixpanel.track('REVERSE_GEOCODE_SUCCESS', getComprehensiveUserProfile(req, {
      latitude,
      longitude,
      city,
      country,
      countryCode,
      hasCity: !!city,
      hasCountry: !!country,
      eventType: 'reverse_geocode_success'
    }));
    
    // Send successful response
    res.json(locationInfo);
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    // Track error with Mixpanel
    mixpanel.track('REVERSE_GEOCODE_ERROR', getComprehensiveUserProfile(req, {
      errorType: error.name,
      errorMessage: error.message,
      latitude: req.query.lat,
      longitude: req.query.lon || req.query.lng,
      eventType: 'reverse_geocode_error'
    }));
    
    // Send error response
    res.status(500).json({
      error: 'Reverse geocoding failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;