// Mixpanel Configuration and Utilities
// This file should be included after the Mixpanel library is loaded

// Configuration - Replace with your actual Mixpanel token
const MIXPANEL_TOKEN = window.MIXPANEL_TOKEN || 'YOUR_MIXPANEL_TOKEN_HERE';
const MIXPANEL_ENABLED = window.MIXPANEL_ENABLED !== false; // Default to true unless explicitly disabled

// Initialize Mixpanel if enabled
if (MIXPANEL_ENABLED && typeof mixpanel !== 'undefined') {
    try {
        mixpanel.init(MIXPANEL_TOKEN, {
            debug: window.location.hostname === 'localhost',
            track_pageview: true,
            persistence: 'localStorage',
            api_host: 'https://api.mixpanel.com',
            ignore_dnt: true
        });

        // Generate or retrieve a unique user ID
        function getOrCreateUserId() {
            let userId = localStorage.getItem('mp_user_id_v2');
            if (!userId) {
                userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('mp_user_id_v2', userId);
            }
            return userId;
        }

        // Identify the user
        const userId = getOrCreateUserId();
        mixpanel.identify(userId);

        // Set user properties
        mixpanel.people.set({
            '$first_seen': new Date().toISOString(),
            'browser': navigator.userAgent,
            'screen_resolution': window.screen.width + 'x' + window.screen.height,
            'language': navigator.language
        });

        // Track initial page view
        mixpanel.track('Page Viewed', {
            page: window.location.pathname,
            referrer: document.referrer,
            url: window.location.href,
            title: document.title
        });

        console.log('Mixpanel initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Mixpanel:', error);
    }
} else {
    console.log('Mixpanel is disabled or not loaded');
}

// Safe tracking wrapper
window.trackEvent = function(eventName, properties = {}) {
    if (MIXPANEL_ENABLED && typeof mixpanel !== 'undefined') {
        try {
            // Add common properties
            const enrichedProperties = {
                ...properties,
                timestamp: new Date().toISOString(),
                page: window.location.pathname,
                user_id: localStorage.getItem('mp_user_id_v2') || 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
            };
            
            mixpanel.track(eventName, enrichedProperties);
            console.log('Tracked event:', eventName, enrichedProperties);
        } catch (error) {
            console.error('Failed to track event:', eventName, error);
        }
    } else {
        console.log('[Mixpanel Mock] Event:', eventName, properties);
    }
};

// Time tracking utilities
window.startTimer = function(eventName) {
    if (MIXPANEL_ENABLED && typeof mixpanel !== 'undefined') {
        mixpanel.time_event(eventName);
    }
};

// Track clicks on all links with data-track attribute
document.addEventListener('DOMContentLoaded', function() {
    // Auto-track clicks on elements with data-track attribute
    document.addEventListener('click', function(e) {
        const trackElement = e.target.closest('[data-track]');
        if (trackElement) {
            const eventName = trackElement.getAttribute('data-track');
            const eventProps = {};
            
            // Collect all data-track-* attributes as properties
            for (let attr of trackElement.attributes) {
                if (attr.name.startsWith('data-track-') && attr.name !== 'data-track') {
                    const propName = attr.name.replace('data-track-', '').replace(/-/g, '_');
                    eventProps[propName] = attr.value;
                }
            }
            
            // Add element-specific properties
            if (trackElement.tagName === 'A') {
                eventProps.link_url = trackElement.href;
                eventProps.link_text = trackElement.textContent.trim();
            } else if (trackElement.tagName === 'BUTTON') {
                eventProps.button_text = trackElement.textContent.trim();
            }
            
            window.trackEvent(eventName, eventProps);
        }
    });

    // Track form submissions
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            const formId = form.id || 'unnamed_form';
            const formAction = form.action || 'no_action';
            
            window.trackEvent('Form Submitted', {
                form_id: formId,
                form_action: formAction,
                form_method: form.method
            });
        }
    });
}); 