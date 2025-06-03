import request from 'supertest';
// Adjust the path to your app.js or the file that exports your Express app
// This assumes app.js exports the app instance, and it's compiled to root or accessible.
// If app.js is not structured to export app, this will need adjustment,
// or we might need to create a minimal app instance here with mathRouter.

// For the purpose of this subtask, let's create a minimal app instance
// to test the router directly, avoiding complexities with the main app.js structure.
import express from 'express';
import mathRouter from './math'; // Import the router we want to test

const app = express();
app.use(express.json()); // Important for parsing JSON request bodies
app.use('/api/math', mathRouter); // Mount the router like in the main app

describe('Math API - /api/math/calculate', () => {
  it('should perform a valid calculation (addition) and return 200', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 5, operation: 'add' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, result: 15 });
  });

  it('should perform a valid calculation (division) and return 200', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 2, operation: 'divide' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, result: 5 });
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operation: 'add' }); // operand2 is missing
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Missing required fields: operand1, operand2, operation.'
    });
  });

  it('should return 400 for invalid operand types', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: '10', operand2: 5, operation: 'add' }); // operand1 is a string
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid input: operand1 and operand2 must be numbers.'
    });
  });

  it('should return 400 for an unsupported operation', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 5, operation: 'power' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: "Invalid input: operation must be one of 'add', 'subtract', 'multiply', 'divide'."
    });
  });

  it('should return 400 for division by zero', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 0, operation: 'divide' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Division by zero is not allowed.'
    });
  });

  // Test case for subtraction
  it('should perform a valid calculation (subtraction) and return 200', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 5, operation: 'subtract' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, result: 5 });
  });

  // Test case for multiplication
  it('should perform a valid calculation (multiplication) and return 200', async () => {
    const response = await request(app)
      .post('/api/math/calculate')
      .send({ operand1: 10, operand2: 5, operation: 'multiply' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, result: 50 });
  });

});
