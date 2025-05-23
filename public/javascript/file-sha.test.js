/**
 * Unit tests for file-sha.js functions
 * Compatible with Jest testing framework
 * 
 * To run these tests:
 * 1. Install Jest: npm install --save-dev jest
 * 2. Add to package.json: "scripts": { "test": "jest" }
 * 3. Run: npm test
 */

// Mock browser APIs for Node.js environment
if (typeof window === 'undefined') {
    // Mock Web Crypto API
    global.crypto = {
        subtle: {
            digest: jest.fn()
        }
    };
    
    // Mock File API
    global.File = class MockFile {
        constructor(content, name, options = {}) {
            this.content = content;
            this.name = name;
            this.type = options.type || '';
            this.size = content.length;
            this.lastModified = options.lastModified || Date.now();
        }
        
        arrayBuffer() {
            return Promise.resolve(new ArrayBuffer(this.size));
        }
    };
    
    // Mock Blob API
    global.Blob = class MockBlob {
        constructor(content, options = {}) {
            this.content = content;
            this.type = options.type || '';
            this.size = content.reduce((acc, item) => acc + item.length, 0);
        }
    };
    
    // Mock URL API
    global.URL = {
        createObjectURL: jest.fn(() => 'mock-url'),
        revokeObjectURL: jest.fn()
    };
    
    // Mock Image API
    global.Image = class MockImage {
        constructor() {
            this.naturalWidth = 100;
            this.naturalHeight = 100;
            this.onload = null;
            this.onerror = null;
        }
        
        set src(value) {
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 0);
        }
    };
}

// Import the functions (adjust path as needed)
const {
    calculateMultipleSHA,
    calculateFileSHA,
    extractFileMetadata,
    getImageMetadata,
    formatFileSize
} = require('./file-sha.js');

describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(500)).toBe('500 Bytes');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(1048576)).toBe('1 MB');
        expect(formatFileSize(1073741824)).toBe('1 GB');
        expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    test('should handle decimal places correctly', () => {
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(2560)).toBe('2.5 KB');
        expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    test('should handle edge cases', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(1023)).toBe('1023 Bytes');
        expect(formatFileSize(1025)).toBe('1 KB');
    });
});

describe('calculateMultipleSHA', () => {
    beforeEach(() => {
        // Mock hash responses
        const mockHashes = {
            'SHA-1': new ArrayBuffer(20),
            'SHA-256': new ArrayBuffer(32),
            'SHA-384': new ArrayBuffer(48),
            'SHA-512': new ArrayBuffer(64)
        };
        
        global.crypto.subtle.digest = jest.fn((algorithm) => {
            return Promise.resolve(mockHashes[algorithm]);
        });
    });

    test('should calculate hashes for text file', async () => {
        const file = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });
        const hashes = await calculateMultipleSHA(file);
        
        expect(hashes).toHaveProperty('SHA-1');
        expect(hashes).toHaveProperty('SHA-256');
        expect(hashes).toHaveProperty('SHA-384');
        expect(hashes).toHaveProperty('SHA-512');
        
        // Verify hash lengths (hex encoded)
        expect(hashes['SHA-1']).toHaveLength(40);
        expect(hashes['SHA-256']).toHaveLength(64);
        expect(hashes['SHA-384']).toHaveLength(96);
        expect(hashes['SHA-512']).toHaveLength(128);
    });

    test('should call crypto.subtle.digest for each algorithm', async () => {
        const file = new File(['test'], 'test.txt');
        await calculateMultipleSHA(file);
        
        expect(global.crypto.subtle.digest).toHaveBeenCalledTimes(4);
        expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-1', expect.any(ArrayBuffer));
        expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
        expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-384', expect.any(ArrayBuffer));
        expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-512', expect.any(ArrayBuffer));
    });

    test('should handle errors gracefully', async () => {
        global.crypto.subtle.digest = jest.fn().mockRejectedValue(new Error('Hash calculation failed'));
        
        const file = new File(['test'], 'test.txt');
        
        await expect(calculateMultipleSHA(file)).rejects.toThrow('Hash calculation failed');
    });

    test('should handle null file input', async () => {
        await expect(calculateMultipleSHA(null)).rejects.toThrow();
    });
});

describe('calculateFileSHA (legacy)', () => {
    beforeEach(() => {
        const mockHash = new ArrayBuffer(32); // SHA-256 size
        global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash);
    });

    test('should return SHA-256 hash as string', async () => {
        const file = new File(['Hello, World!'], 'test.txt');
        const hash = await calculateFileSHA(file);
        
        expect(typeof hash).toBe('string');
        expect(hash).toHaveLength(64); // SHA-256 hex length
    });

    test('should call SHA-256 digest', async () => {
        const file = new File(['test'], 'test.txt');
        await calculateFileSHA(file);
        
        expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
    });
});

describe('extractFileMetadata', () => {
    test('should extract basic file metadata', async () => {
        const file = new File(['test content'], 'example.txt', { 
            type: 'text/plain',
            lastModified: 1640995200000 // Jan 1, 2022
        });
        
        const metadata = await extractFileMetadata(file);
        
        expect(metadata.name).toBe('example.txt');
        expect(metadata.type).toBe('text/plain');
        expect(metadata.extension).toBe('txt');
        expect(metadata.size).toBe(12); // 'test content'.length
        expect(metadata.sizeFormatted).toBe('12 Bytes');
        expect(metadata.lastModified).toBeInstanceOf(Date);
    });

    test('should handle files without extension', async () => {
        const file = new File(['test'], 'README', { type: 'text/plain' });
        const metadata = await extractFileMetadata(file);
        
        expect(metadata.name).toBe('README');
        expect(metadata.extension).toBe('readme');
    });

    test('should handle unknown file types', async () => {
        const file = new File(['test'], 'test.unknown', { type: '' });
        const metadata = await extractFileMetadata(file);
        
        expect(metadata.type).toBe('Unknown');
        expect(metadata.extension).toBe('unknown');
    });

    test('should include image metadata for image files', async () => {
        const file = new File(['fake-image-data'], 'photo.png', { type: 'image/png' });
        const metadata = await extractFileMetadata(file);
        
        expect(metadata.image).toBeDefined();
        expect(metadata.image.width).toBe(100);
        expect(metadata.image.height).toBe(100);
        expect(metadata.image.aspectRatio).toBe('1.00');
    });

    test('should not include image metadata for non-image files', async () => {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        const metadata = await extractFileMetadata(file);
        
        expect(metadata.image).toBeUndefined();
    });
});

describe('getImageMetadata', () => {
    test('should extract image dimensions', async () => {
        // Mock different image dimensions
        global.Image = class MockImage {
            constructor() {
                this.naturalWidth = 200;
                this.naturalHeight = 150;
                this.onload = null;
                this.onerror = null;
            }
            
            set src(value) {
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
        };
        
        const imageFile = new File(['fake-image'], 'test.png', { type: 'image/png' });
        const imageMetadata = await getImageMetadata(imageFile);
        
        expect(imageMetadata.width).toBe(200);
        expect(imageMetadata.height).toBe(150);
        expect(imageMetadata.aspectRatio).toBe('1.33');
    });

    test('should handle square images', async () => {
        global.Image = class MockImage {
            constructor() {
                this.naturalWidth = 100;
                this.naturalHeight = 100;
                this.onload = null;
                this.onerror = null;
            }
            
            set src(value) {
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
        };
        
        const imageFile = new File(['fake-image'], 'square.png', { type: 'image/png' });
        const imageMetadata = await getImageMetadata(imageFile);
        
        expect(imageMetadata.width).toBe(100);
        expect(imageMetadata.height).toBe(100);
        expect(imageMetadata.aspectRatio).toBe('1.00');
    });

    test('should handle image load errors', async () => {
        global.Image = class MockImage {
            constructor() {
                this.onload = null;
                this.onerror = null;
            }
            
            set src(value) {
                setTimeout(() => {
                    if (this.onerror) this.onerror();
                }, 0);
            }
        };
        
        const imageFile = new File(['corrupt-image'], 'corrupt.png', { type: 'image/png' });
        
        await expect(getImageMetadata(imageFile)).rejects.toThrow('Failed to load image');
    });
});

describe('Error handling', () => {
    test('should handle null file input in calculateMultipleSHA', async () => {
        await expect(calculateMultipleSHA(null)).rejects.toThrow();
    });

    test('should handle invalid file input in extractFileMetadata', async () => {
        await expect(extractFileMetadata({})).rejects.toThrow();
    });

    test('should handle crypto API errors', async () => {
        global.crypto.subtle.digest = jest.fn().mockRejectedValue(new Error('Crypto API unavailable'));
        
        const file = new File(['test'], 'test.txt');
        await expect(calculateMultipleSHA(file)).rejects.toThrow('Crypto API unavailable');
    });
});

describe('Integration tests', () => {
    test('should process a complete file workflow', async () => {
        // Mock successful crypto operations
        const mockHashes = {
            'SHA-1': new ArrayBuffer(20),
            'SHA-256': new ArrayBuffer(32),
            'SHA-384': new ArrayBuffer(48),
            'SHA-512': new ArrayBuffer(64)
        };
        
        global.crypto.subtle.digest = jest.fn((algorithm) => {
            return Promise.resolve(mockHashes[algorithm]);
        });
        
        const file = new File(['test content'], 'example.txt', { 
            type: 'text/plain',
            lastModified: Date.now()
        });
        
        // Test both hash calculation and metadata extraction
        const [hashes, metadata] = await Promise.all([
            calculateMultipleSHA(file),
            extractFileMetadata(file)
        ]);
        
        // Verify hashes
        expect(Object.keys(hashes)).toHaveLength(4);
        expect(hashes['SHA-256']).toHaveLength(64);
        
        // Verify metadata
        expect(metadata.name).toBe('example.txt');
        expect(metadata.sizeFormatted).toBe('12 Bytes');
        expect(metadata.extension).toBe('txt');
    });

    test('should handle large file simulation', async () => {
        // Create a larger mock file
        const largeContent = 'A'.repeat(10000);
        const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
        
        const mockHash = new ArrayBuffer(32);
        global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash);
        
        const hashes = await calculateMultipleSHA(file);
        const metadata = await extractFileMetadata(file);
        
        expect(hashes['SHA-256']).toHaveLength(64);
        expect(metadata.sizeFormatted).toBe('9.77 KB');
    });
});

// Performance tests
describe('Performance tests', () => {
    test('should complete hash calculation within reasonable time', async () => {
        const mockHash = new ArrayBuffer(32);
        global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash);
        
        const file = new File(['test'], 'test.txt');
        
        const startTime = performance.now();
        await calculateMultipleSHA(file);
        const endTime = performance.now();
        
        // Should complete within 1 second (very generous for mock)
        expect(endTime - startTime).toBeLessThan(1000);
    });
    
    test('should handle multiple concurrent hash calculations', async () => {
        const mockHash = new ArrayBuffer(32);
        global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash);
        
        const files = [
            new File(['test1'], 'test1.txt'),
            new File(['test2'], 'test2.txt'),
            new File(['test3'], 'test3.txt')
        ];
        
        const promises = files.map(file => calculateMultipleSHA(file));
        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        results.forEach(hashes => {
            expect(Object.keys(hashes)).toHaveLength(4);
        });
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateMultipleSHA,
        calculateFileSHA,
        extractFileMetadata,
        getImageMetadata,
        formatFileSize
    };
} 