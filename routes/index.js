const express = require('express');
const path = require('path');
const router = express.Router();
const { contentstackRedirectFragment, dynamicWordFragement, inputTextFragment } = require('../services/html-fragments');
const { generateContent, generateJoke } = require('../services/gen-ai');
const { getCompletionForWrongWord, getJokeFromGroq } = require('../services/groq-ai-client');
const mixpanel = require('../services/mixpanel');

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
  // Track page view
  mixpanel.track(mixpanel.EVENTS.PAGE_VIEW, {
    page: 'home',
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

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
  let word = req.query.word;
  console.log('Word:', word);
  if (!word || word.trim().length === 0) {
    console.log('No word provided');
    // res.sendFile(path.join(__dirname, '../views/index.html'));
    res.redirect("/")
    return; // Add return to prevent further execution
  }

  // Track word search event
  mixpanel.track(mixpanel.EVENTS.WORD_SEARCHED, {
    word: word.trim().toLowerCase(),
    wordLength: word.trim().length,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

   // Fix the contentstack check and add redirection
  // In your word-usage route handler
  word = word.trim();
 console.log(`word == ${word}`)
if(word.toLowerCase() === 'contentstack') {
  console.log('Showing loader before redirecting to Contentstack website');
  
  // Track Contentstack redirect
  mixpanel.track(mixpanel.EVENTS.CONTENTSTACK_REDIRECT, {
    word: word,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
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
    let html = dynamicWordFragement(word);
    if (!data || data.length === 0 || !data[0] || !data[0].meanings || !data[0].meanings[0] || !data[0].meanings[0].definitions || !data[0].meanings[0].definitions[0]) {
      console.log('No data found');
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
  // get the topic from the query params
  const topic = req.query.topic;
  if (!topic || topic.trim().length === 0) {
    res.status(400).send('Topic is required');
    return;
  }

  
  // randomly call gemini or groq api
  const random = Math.random();
  // Track joke request
  mixpanel.track(mixpanel.EVENTS.JOKE_REQUESTED, {
    topic: topic.trim(),
    topicLength: topic.trim().length,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    model: random < 0.5 ? 'groq' : 'gemini'
  });
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
    res.send(jokeText);
  }
  
});

router.get('/dev-tools', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dev-tools.html'));
});

module.exports = router;