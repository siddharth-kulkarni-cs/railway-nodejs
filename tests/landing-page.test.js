const request = require('supertest');
const express = require('express');
const path = require('path');
const { JSDOM } = require('jsdom');
const fs = require('fs');

// Import the routes
const indexRouter = require('../routes/index');

// Create Express app for testing
const app = express();
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', indexRouter);
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '../views', '404.html'));
});

// Helper function to parse HTML content
function parseHTML(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

describe('Product Showcase Landing Page', () => {
  // API Route tests
  describe('Server Routes', () => {
    test('GET / should return 200 and HTML content', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /word-usage should redirect to home if no word is provided', async () => {
      const response = await request(app).get('/word-usage');
      expect(response.status).toBe(302); // Redirect status
      expect(response.headers.location).toBe('/');
    });

    test('GET /word-usage with valid word should return 200', async () => {
      const response = await request(app).get('/word-usage?word=test');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('Non-existent route should return 404', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
    });
  });

  // HTML Structure tests
  describe('Landing Page Structure', () => {
    let html;
    let document;

    beforeAll(async () => {
      // Read the index.html file
      html = fs.readFileSync(path.join(__dirname, '../views/index.html'), 'utf8');
      document = parseHTML(html);
    });

    test('Page title should be "Product Showcase"', () => {
      expect(document.title).toBe('Product Showcase');
    });

    test('Navigation menu should have 4 links', () => {
      const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
      expect(navLinks.length).toBe(4);
      
      // Verify specific nav items
      const navTexts = Array.from(navLinks).map(link => link.textContent.trim());
      expect(navTexts).toContain('Home');
      expect(navTexts).toContain('Products');
      expect(navTexts).toContain('Featured');
      expect(navTexts).toContain('About');
    });

    test('Featured product section should contain Word Explorer', () => {
      const featuredSection = document.querySelector('#featured');
      expect(featuredSection).not.toBeNull();
      
      const title = featuredSection.querySelector('h2').textContent;
      expect(title).toBe('Featured Product');
      
      const searchForm = featuredSection.querySelector('form[action="/word-usage"]');
      expect(searchForm).not.toBeNull();
    });

    test('Products section should display 3 product cards', () => {
      const productsSection = document.querySelector('#products');
      expect(productsSection).not.toBeNull();
      
      const productCards = productsSection.querySelectorAll('.product-card');
      expect(productCards.length).toBe(3);
      
      // Verify product titles
      const productTitles = Array.from(productCards).map(card => 
        card.querySelector('.product-title').textContent.trim()
      );
      expect(productTitles).toContain('Word Explorer');
      expect(productTitles).toContain('Language Translator');
      expect(productTitles).toContain('Writing Assistant');
    });

    test('About section should be present', () => {
      const aboutSection = document.querySelector('#about');
      expect(aboutSection).not.toBeNull();
      
      const title = aboutSection.querySelector('h2').textContent;
      expect(title).toBe('About Our Platform');
    });
  });
}); 