# Mixpanel Analytics Setup Guide

## Quick Start

1. **Get your Mixpanel Token**:
   - Sign up at [mixpanel.com](https://mixpanel.com)
   - Create a new project
   - Copy your project token from Settings > Project Settings

2. **Configure your environment**:
   ```bash
   # Add to your .env file
   MIXPANEL_TOKEN=your_actual_token_here
   MIXPANEL_ENABLED=true
   ```

3. **Update frontend configuration**:
   - Edit `views/index.html` and `views/animations.html`
   - Replace `YOUR_MIXPANEL_TOKEN_HERE` with your actual token

4. **Run your application**:
   ```bash
   npm run dev
   ```

5. **Verify tracking**:
   - Open browser console to see tracking logs
   - Visit your Mixpanel dashboard to see real-time events

## Phase 1: Backend Setup ✅ (Completed)

### What we've done:
1. **Installed Mixpanel SDK**: `npm install mixpanel`
2. **Created Mixpanel Service**: `services/mixpanel.js` - A centralized service for all analytics tracking
3. **Integrated Server-side Tracking** in `routes/index.js`:
   - Home page views
   - Word searches
   - Contentstack redirects
   - Joke requests

### Environment Variables Required:
Add these to your `.env` file:
```
MIXPANEL_TOKEN=your_mixpanel_project_token_here
MIXPANEL_ENABLED=true
```

### Current Server-side Events Being Tracked:
- `Page Viewed` - When users visit the home page
- `Word Searched` - When users search for a word definition
- `Contentstack Redirect` - When users search for "contentstack"
- `Joke Requested` - When users request a joke

## Phase 2: Frontend Setup ✅ (Completed)

### What we've implemented:

1. **Added Mixpanel JavaScript SDK** to:
   - `views/index.html` - Main application page
   - `views/animations.html` - Animations showcase page

2. **Created `public/javascript/mixpanel-config.js`** - Centralized frontend configuration with:
   - Automatic user identification
   - Safe tracking wrapper functions
   - Auto-tracking for elements with `data-track` attributes
   - Form submission tracking

3. **Integrated Frontend Event Tracking**:
   - **Page Views** - Automatically tracked on page load
   - **Theme Toggle** - Tracks light/dark mode switches
   - **Joke Generation** - Tracks form submission, success, and failures with timing
   - **File Analysis** - Tracks file selection, analysis start, success, and failures
   - **Animation Switches** - Tracks animation type changes
   - **Button Clicks** - Auto-tracked via `data-track` attributes

### Current Frontend Events:
- `Page Viewed` - Initial page load with referrer and URL
- `Theme Toggled` - When users switch between light/dark mode
- `Joke Form Submitted` - When users submit the joke form
- `Joke Generated` - Successful joke generation (timed event)
- `Joke Generation Failed` - When joke API fails
- `File Selected` - When users choose a file for analysis
- `File Analysis Started` - When analysis begins
- `File Analyzed` - Successful file analysis (timed event)
- `File Analysis Failed` - When file analysis fails
- `Animation Switched` - When users change animations
- `Form Submitted` - Auto-tracked for all forms
- `Feature Button Clicked` - Via data-track attributes

### Configuration in HTML Files:
```html
<!-- Add this to your HTML files before mixpanel-config.js -->
<script>
  window.MIXPANEL_TOKEN = 'YOUR_MIXPANEL_TOKEN_HERE'; // Replace with your actual token
  window.MIXPANEL_ENABLED = true; // Set to false to disable tracking
</script>
```

### Using Data-Track Attributes:
You can add automatic tracking to any clickable element:
```html
<button data-track="Button Clicked" data-track-category="navigation">Click Me</button>
<a href="#" data-track="Link Clicked" data-track-section="footer">Footer Link</a>
```

## Phase 3: Advanced Tracking (Future Enhancements)

### Additional Events to Consider:
1. **Error Tracking**: Track when API calls fail
2. **Performance Metrics**: Page load times, API response times
3. **User Journey**: Track the sequence of actions users take
4. **A/B Testing**: Track different variations of features

### Best Practices:
1. **User Privacy**: Always respect user privacy and comply with GDPR/CCPA
2. **Event Naming**: Use consistent, descriptive event names
3. **Properties**: Include relevant context without sensitive data
4. **Testing**: Test in development before deploying to production

## Getting Your Mixpanel Token

1. Sign up at [mixpanel.com](https://mixpanel.com)
2. Create a new project
3. Find your project token in Settings > Project Settings
4. Add it to your `.env` file

## Testing Your Integration

1. Set `MIXPANEL_ENABLED=true` in your `.env`
2. Run your application: `npm run dev`
3. Perform actions (visit pages, search words, request jokes)
4. Check your Mixpanel dashboard for real-time events
5. In development, check console logs for `[Mixpanel Mock]` messages when `MIXPANEL_ENABLED=false`

## Summary

You now have a complete Mixpanel analytics integration with:

### ✅ Backend Tracking
- Server-side events for all major API endpoints
- Environment variable configuration
- Safe error handling

### ✅ Frontend Tracking
- Client-side event tracking for user interactions
- Automatic page view tracking
- User identification and persistence
- Time tracking for performance metrics
- Auto-tracking via data attributes

### 📊 Events Being Tracked

**Server-side:**
- Page Viewed
- Word Searched
- Contentstack Redirect
- Joke Requested

**Client-side:**
- Theme Toggled
- Joke Form Submitted / Generated / Failed
- File Selected / Analyzed / Failed
- Animation Switched
- Form Submissions (automatic)
- Clicks on elements with data-track

### 🚀 Next Steps

1. **Set up your Mixpanel dashboard**:
   - Create custom reports
   - Build funnels for user journeys
   - Set up retention analysis

2. **Enhance tracking**:
   - Add more custom events
   - Track user properties
   - Implement A/B testing

3. **Monitor and iterate**:
   - Review your analytics regularly
   - Identify drop-off points
   - Optimize based on data

### 🔒 Privacy Considerations

Remember to:
- Add a privacy policy
- Implement user consent if required
- Follow GDPR/CCPA guidelines
- Allow users to opt-out if needed 