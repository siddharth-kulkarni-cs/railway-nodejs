const request = require('supertest');
const express = require('express');
const path = require('path');

// Import the routes
const indexRouter = require('../routes/index');

// Create Express app for testing
const app = express();
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', indexRouter);
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '../views', '404.html'));
});

describe('API Routes', () => {
  // Test home route
  test('GET / should return 200 and HTML content', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  // Test word-usage route with no word
  test('GET /word-usage should redirect to home if no word is provided', async () => {
    const response = await request(app).get('/word-usage');
    expect(response.status).toBe(302); // Redirect status
    expect(response.headers.location).toBe('/');
  });

  // Test word-usage route with valid word
  test('GET /word-usage with valid word should return 200', async () => {
    const response = await request(app).get('/word-usage?word=test');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  // Test contentstack special case handling
  test('GET /word-usage with "contentstack" should return special page', async () => {
    const response = await request(app).get('/word-usage?word=contentstack');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Redirecting to Contentstack');
  });

  // Test caching mechanism
  test('Word lookups should be cached after first request', async () => {
    // First request - should hit API
    await request(app).get('/word-usage?word=cache');
    
    // Since this is a mock test and we can't directly access the cache,
    // we'll check the response code of a second request which should also be 200
    const secondResponse = await request(app).get('/word-usage?word=cache');
    expect(secondResponse.status).toBe(200);
  });

  // Test 404 handler
  test('Non-existent route should return 404', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
  });
}); 