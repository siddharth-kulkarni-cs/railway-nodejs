const Mixpanel = require('mixpanel');

// Initialize Mixpanel with your project token
const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN;
const MIXPANEL_ENABLED = process.env.MIXPANEL_ENABLED === 'true';

let mixpanel = null;

if (MIXPANEL_TOKEN && MIXPANEL_ENABLED) {
  console.log(`[Mixpanel] Initializing `);
  try {
    mixpanel = Mixpanel.init(MIXPANEL_TOKEN, {
      protocol: 'https'
    });
    console.log('Mixpanel initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error);
  }
} else {
  console.log('Mixpanel is disabled or token not provided');
}

// Helper function to safely track events
function track(eventName, properties = {}) {
  console.log(`[Mixpanel] Event: ${MIXPANEL_ENABLED}`, mixpanel);
  if (!mixpanel || !MIXPANEL_ENABLED) {
    console.log(`[Mixpanel Mock] Event: ${eventName}`, properties);
    return;
  }

  try {
    // Add common properties
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    mixpanel.track(eventName, enrichedProperties);
  } catch (error) {
    console.error(`Failed to track event ${eventName}:`, error);
  }
}

// Helper function to identify users
function identify(userId, traits = {}) {
  if (!mixpanel || !MIXPANEL_ENABLED) {
    console.log(`[Mixpanel Mock] Identify user: ${userId}`, traits);
    return;
  }

  try {
    mixpanel.people.set(userId, traits);
  } catch (error) {
    console.error(`Failed to identify user ${userId}:`, error);
  }
}

// Helper function to track user profile properties
function setPeopleProperties(userId, properties) {
  if (!mixpanel || !MIXPANEL_ENABLED) {
    console.log(`[Mixpanel Mock] Set people properties for: ${userId}`, properties);
    return;
  }

  try {
    mixpanel.people.set(userId, properties);
  } catch (error) {
    console.error(`Failed to set people properties for ${userId}:`, error);
  }
}

// Event constants for consistency
const EVENTS = {
  // Page events
  PAGE_VIEW: 'Page Viewed',
  
  // Word dictionary events
  WORD_SEARCHED: 'Word Searched',
  WORD_SEARCH_FAILED: 'Word Search Failed',
  CONTENTSTACK_REDIRECT: 'Contentstack Redirect',
  
  // Joke events
  JOKE_REQUESTED: 'Joke Requested',
  JOKE_GENERATED: 'Joke Generated',
  JOKE_FAILED: 'Joke Generation Failed',
  
  // File analysis events
  FILE_UPLOADED: 'File Uploaded',
  FILE_ANALYZED: 'File Analyzed',
  
  // API events
  API_REQUEST: 'API Request',
  API_ERROR: 'API Error'
};

module.exports = {
  track,
  identify,
  setPeopleProperties,
  EVENTS,
  isEnabled: MIXPANEL_ENABLED
}; 