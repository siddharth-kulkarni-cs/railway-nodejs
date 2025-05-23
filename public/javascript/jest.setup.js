/**
 * Jest setup file for file-sha functions testing
 * This file configures the testing environment to work with browser APIs
 */

// Configure jsdom environment
global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock console methods to reduce noise in test output
global.console = {
    ...console,
    // Uncomment below lines to silence console output during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Setup test timeout
jest.setTimeout(10000); // 10 seconds

// Mock TextEncoder/TextDecoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
        encode(input) {
            return new Uint8Array(Buffer.from(input, 'utf8'));
        }
    };
}

if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
        decode(input) {
            return Buffer.from(input).toString('utf8');
        }
    };
}

// Mock FileReader API
global.FileReader = class MockFileReader {
    constructor() {
        this.result = null;
        this.error = null;
        this.readyState = 0;
        this.onload = null;
        this.onerror = null;
        this.onloadend = null;
    }

    readAsArrayBuffer(file) {
        setTimeout(() => {
            this.result = new ArrayBuffer(file.size);
            this.readyState = 2;
            if (this.onload) this.onload();
            if (this.onloadend) this.onloadend();
        }, 0);
    }

    readAsText(file) {
        setTimeout(() => {
            this.result = 'mock file content';
            this.readyState = 2;
            if (this.onload) this.onload();
            if (this.onloadend) this.onloadend();
        }, 0);
    }
};

// Additional browser API mocks can be added here as needed
beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Clean up any resources after each test
    // This is a good place to clean up any global state
});

// Global test helpers
global.testHelpers = {
    // Helper to create consistent mock files
    createMockFile: (content = 'test', name = 'test.txt', type = 'text/plain') => {
        return new File([content], name, { type, lastModified: Date.now() });
    },
    
    // Helper to wait for async operations
    waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Helper to assert array buffer equality
    assertArrayBuffersEqual: (buffer1, buffer2) => {
        const array1 = new Uint8Array(buffer1);
        const array2 = new Uint8Array(buffer2);
        expect(array1.length).toBe(array2.length);
        for (let i = 0; i < array1.length; i++) {
            expect(array1[i]).toBe(array2[i]);
        }
    }
}; 