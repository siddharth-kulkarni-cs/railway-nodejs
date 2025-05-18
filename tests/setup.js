// Increase timeout for all tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';

// Silence console logs during tests
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Create global teardown to ensure all servers and browsers are closed
afterAll(async () => {
  // Add any global cleanup here if needed
}); 