const request = require('supertest');
const express = require('express');
const router = require('../routes/index');

const app = express();
app.use('/', router);

describe('Reverse Geocoding API', () => {
  describe('GET /api/reverse-geocode', () => {
    
    test('should return city and country for valid coordinates (New York)', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 40.7128, lon: -74.0060 });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('location');
      expect(response.body.location).toHaveProperty('city');
      expect(response.body.location).toHaveProperty('country');
      expect(response.body.location.country).toBe('United States');
      expect(response.body.location.countryCode).toBe('US');
    });
    
    test('should support lng parameter as alternative to lon', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 51.5074, lng: 0.1278 });
      
      expect(response.status).toBe(200);
      expect(response.body.location.country).toBe('United Kingdom');
    });
    
    test('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required parameters');
    });
    
    test('should return 400 for invalid latitude', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 200, lon: 0 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid latitude');
    });
    
    test('should return 400 for invalid longitude', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 0, lon: 200 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid longitude');
    });
    
    test('should return 400 for non-numeric coordinates', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 'abc', lon: 'xyz' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid coordinates');
    });
    
    test('should handle ocean coordinates (no city found)', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 0, lon: -160 });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Location not found');
    });
    
    test('should include additional location details', async () => {
      const response = await request(app)
        .get('/api/reverse-geocode')
        .query({ lat: 40.7128, lon: -74.0060 });
      
      expect(response.status).toBe(200);
      expect(response.body.location).toHaveProperty('state');
      expect(response.body.location).toHaveProperty('postalCode');
      expect(response.body.location).toHaveProperty('displayName');
      expect(response.body).toHaveProperty('attribution');
    });
  });
});

/**
 * API Documentation: Reverse Geocoding Endpoint
 * 
 * Endpoint: GET /api/reverse-geocode
 * 
 * Description:
 * Converts latitude and longitude coordinates to human-readable location information
 * including city, state, country, and postal code.
 * 
 * Query Parameters:
 * - lat (required): Latitude coordinate (-90 to 90)
 * - lon or lng (required): Longitude coordinate (-180 to 180)
 * 
 * Success Response (200):
 * {
 *   "coordinates": {
 *     "latitude": 40.7128,
 *     "longitude": -74.0060
 *   },
 *   "location": {
 *     "city": "City of New York",
 *     "state": "New York",
 *     "country": "United States",
 *     "countryCode": "US",
 *     "postalCode": "10000",
 *     "displayName": "Full address string..."
 *   },
 *   "rawAddress": { ... },
 *   "attribution": "Data © OpenStreetMap contributors"
 * }
 * 
 * Error Responses:
 * - 400: Invalid or missing parameters
 * - 404: Location not found (e.g., ocean coordinates)
 * - 500: Server error
 * 
 * Example Usage:
 * 
 * // JavaScript fetch example
 * fetch('/api/reverse-geocode?lat=40.7128&lon=-74.0060')
 *   .then(response => response.json())
 *   .then(data => {
 *     console.log(`City: ${data.location.city}`);
 *     console.log(`Country: ${data.location.country}`);
 *   });
 * 
 * // curl example
 * curl "http://localhost:3000/api/reverse-geocode?lat=40.7128&lon=-74.0060"
 * 
 * // Popular city coordinates for testing:
 * - New York: lat=40.7128, lon=-74.0060
 * - London: lat=51.5074, lon=-0.1278
 * - Tokyo: lat=35.6762, lon=139.6503
 * - Sydney: lat=-33.8688, lon=151.2093
 * - Paris: lat=48.8566, lon=2.3522
 */