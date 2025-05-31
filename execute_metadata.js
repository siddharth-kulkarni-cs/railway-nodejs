const fs = require('fs');
const { extractEnhancedFileMetadata } = require('./public/javascript/file-sha-enhanced.js');

// Mock browser APIs not available in Node.js if needed by extractEnhancedFileMetadata or its sub-functions
// (e.g., Image, HTMLVideoElement, HTMLAudioElement, FileReader might need more robust mocks if complex paths are triggered)

// Mock for FileReader used by extractEXIFData (though we are not testing EXIF deeply here)
global.FileReader = class {
    constructor() {
        this.onload = null;
        this.onerror = null;
    }
    readAsArrayBuffer(blob) {
        // Simulate reading the blob's arrayBuffer content
        // For the signature detection, it reads a small slice.
        if (this.onload) {
            blob.arrayBuffer().then(buffer => {
                 this.onload({ target: { result: buffer } });
            }).catch(err => {
                if (this.onerror) this.onerror(err);
            });
        }
    }
    readAsText(blob) {
         if (this.onload) {
            blob.text().then(text => {
                 this.onload({ target: { result: text } });
            }).catch(err => {
                if (this.onerror) this.onerror(err);
            });
        }
    }
};

// Mock for Image object (used by getEnhancedImageMetadata, getImageMetadata)
global.Image = class {
    constructor() {
        this.naturalWidth = 0;
        this.naturalHeight = 0;
        this.onload = null;
        this.onerror = null;
        this._src = null;
    }
    set src(value) {
        this._src = value;
        // Simulate async loading for basic dimension extraction if it's a data URL
        if (value && typeof value === 'string' && value.startsWith('data:image')) {
            // Simulate some dimensions; not critical for this text file test
            this.naturalWidth = 10;
            this.naturalHeight = 10;
            if (this.onload) setTimeout(() => this.onload(), 50);
        } else if (this.onerror) {
             setTimeout(() => this.onerror(new Error('Mock Image load error')), 50);
        }
    }
    get src() { return this._src; }
};

// Mock for URL.createObjectURL and URL.revokeObjectURL
global.URL = {
    createObjectURL: (obj) => 'blob:mockedscheme/' + Math.random().toString(36).substring(2),
    revokeObjectURL: (url) => {}
};

// Mock for document.createElement for media elements
global.document = {
    createElement: (tagName) => {
        if (tagName === 'video' || tagName === 'audio') {
            return {
                // Mock properties and methods used by getMediaMetadata
                src: '',
                onloadedmetadata: null,
                onerror: null,
                videoWidth: 0,
                videoHeight: 0,
                duration: 0,
                // Add any other properties/methods that might be accessed
            };
        }
        if (tagName === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: (contextId) => {
                    if (contextId === '2d') {
                        return {
                            drawImage: () => {},
                            getImageData: () => ({ data: new Uint8ClampedArray(0) })
                        };
                    }
                    return null;
                },
                toDataURL: () => 'data:image/png;base64,mock' // Mock for canvas.toDataURL
            };
        }
        return {};
    }
};


// Helper to create a File-like object for Node.js
async function getFileLikeObject(filePath, type) {
    const buffer = fs.readFileSync(filePath);
    const content = fs.readFileSync(filePath); // For arrayBuffer and text

    return {
        name: filePath.split('/').pop(),
        type: type || '',
        size: buffer.length,
        lastModified: fs.statSync(filePath).mtime.getTime(),
        slice: (start, end, contentType) => { // Required by detectFileSignature -> readFileHeader
            const slicedBuffer = buffer.slice(start, end);
            return { // This is a mock Blob
                arrayBuffer: async () => slicedBuffer.buffer.slice(slicedBuffer.byteOffset, slicedBuffer.byteOffset + slicedBuffer.byteLength),
                text: async () => slicedBuffer.toString() // if text is needed from slice
            };
        },
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        text: async () => content.toString() // For readFileAsText
    };
}

async function main() {
    try {
        const testFile = await getFileLikeObject('test_file.txt', 'text/plain');
        const metadata = await extractEnhancedFileMetadata(testFile);

        let all_ok = true;
        let report = "";

        // Name
        if (metadata.name === 'test_file.txt') {
            report += "Name: OK ('test_file.txt')\n";
        } else {
            report += `Name: FAIL (Expected 'test_file.txt', Got '${metadata.name}')\n`;
            all_ok = false;
        }

        // Size
        const expectedSize = 12;
        if (metadata.size === expectedSize) {
            report += `Size: OK (${expectedSize} bytes)\n`;
        } else {
            report += `Size: FAIL (Expected ${expectedSize}, Got ${metadata.size})\n`;
            all_ok = false;
        }

        // Size Formatted
        // Note: formatFileSize logic might slightly differ based on exact floating point results.
        // For 12 bytes, it should be "12 Bytes". The prompt had 11 Bytes for "hello world" but stat reported 12 (due to newline from echo).
        const expectedSizeFormatted = "12 Bytes";
         if (metadata.sizeFormatted === expectedSizeFormatted) {
            report += `SizeFormatted: OK ('${expectedSizeFormatted}')\n`;
        } else {
            report += `SizeFormatted: FAIL (Expected '${expectedSizeFormatted}', Got '${metadata.sizeFormatted}')\n`;
            all_ok = false;
        }

        // Type
        if (metadata.type === 'text/plain') {
            report += "Type: OK ('text/plain')\n";
        } else {
            report += `Type: FAIL (Expected 'text/plain', Got '${metadata.type}')\n`;
            all_ok = false;
        }

        // Extension
        if (metadata.extension === 'txt') {
            report += "Extension: OK ('txt')\n";
        } else {
            report += `Extension: FAIL (Expected 'txt', Got '${metadata.extension}')\n`;
            all_ok = false;
        }

        // Signature Detected Type
        // For a plain text file "hello world\n", it's often identified as 'Text' or 'Unknown' by simple signature checkers.
        const sigType = metadata.signature ? metadata.signature.detectedType : "N/A";
        if (sigType === 'Text' || sigType === 'Unknown') {
            report += `Signature.detectedType: OK ('${sigType}')\n`;
        } else {
            report += `Signature.detectedType: FAIL (Expected 'Text' or 'Unknown', Got '${sigType}')\n`;
            all_ok = false;
        }

        // Signature Matches Extension
        const sigMatches = metadata.signature ? metadata.signature.matchesExtension : false;
        // This should be true if detectedType is 'Text'
        if ((sigType === 'Text' && sigMatches === true) || (sigType === 'Unknown')) { // If Unknown, matchesExtension might be false, which is fine.
             report += `Signature.matchesExtension: OK (${sigMatches})\n`;
        } else {
             report += `Signature.matchesExtension: FAIL (Got ${sigMatches} with detectedType '${sigType}')\n`;
             all_ok = false;
        }

        console.log("--- Metadata Verification Report ---");
        console.log(report);

        if (all_ok) {
            console.log("SUCCESS: All checked metadata fields are accurate.");
            process.exit(0);
        } else {
            console.log("FAILURE: Some metadata fields are NOT accurate.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Error during JavaScript metadata extraction:", error);
        process.exit(2);
    }
}

main();
