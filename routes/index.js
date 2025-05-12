const express = require('express');
const path = require('path');
const router = express.Router();
const { contentstackRedirectFragment, dynamicWordFragement, inputTextFragment } = require('../services/html-fragments');
const { generateContent } = require('../services/gen-ai');
const api_key = process.env.GEMINI_API_KEY;
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

router.get('/word-usage', async (req, res) => {
  const word = req.query.word;
  console.log('Word:', word);
  if (!word || word.trim().length === 0) {
    console.log('No word provided');
    // res.sendFile(path.join(__dirname, '../views/index.html'));
    res.redirect("/")
    return; // Add return to prevent further execution
  }

   // Fix the contentstack check and add redirection
  // In your word-usage route handler
if(word.toLowerCase() === 'contentstack') {
  console.log('Showing loader before redirecting to Contentstack website');
  
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

    if (!data || data.length === 0 || !data[0] || !data[0].meanings || !data[0].meanings[0] || !data[0].meanings[0].definitions || !data[0].meanings[0].definitions[0]) {
      console.log('No data found');
      res.sendFile(path.join(__dirname, '../views/404.html'));
      return;
    }

    console.log('Data:', data[0].meanings[0].definitions[0].definition);

    // Create HTML response
    let html = dynamicWordFragement(word);

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

module.exports = router;