const fs = require('fs');
const { calculateMultipleSHA } = require('./public/javascript/file-sha-enhanced.js');
const { File } = require('buffer'); // Use buffer's File for Node.js environment

// Mock crypto.subtle if not available in Node.js test environment (it should be in modern Node)
if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
    const { webcrypto } = require('crypto');
    global.crypto = webcrypto;
}


async function getFileAsBlob(filePath, type) {
    const buffer = fs.readFileSync(filePath);
    // For Node.js, we create a structure that mimics a browser File object
    // The 'File' from 'buffer' is not identical to a browser File,
    // but calculateMultipleSHA expects an object with an arrayBuffer() method.
    const fileLikeObject = {
        name: filePath.split('/').pop(),
        type: type || '',
        size: buffer.length,
        lastModified: fs.statSync(filePath).mtime.getTime(),
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    };
    return fileLikeObject;
}

async function main() {
    try {
        const testFile = await getFileAsBlob('test_file.txt', 'text/plain');
        const hashes = await calculateMultipleSHA(testFile);
        const js_hash = hashes['SHA-256'];
        console.log(`JavaScript SHA-256 hash: ${js_hash}`);

        // Read ground truth hash from environment variable or a temporary file if easier
        const groundTruth = fs.readFileSync('ground_truth_hash.txt', 'utf8').trim();
        if (js_hash === groundTruth) {
            console.log("MATCH: JavaScript SHA-256 hash matches ground truth.");
            process.exit(0); // Success
        } else {
            console.log("NO_MATCH: JavaScript SHA-256 hash does NOT match ground truth.");
            console.log(`Expected: ${groundTruth}`);
            console.log(`Got: ${js_hash}`);
            process.exit(1); // Failure
        }
    } catch (error) {
        console.error("Error during JavaScript hash calculation:", error);
        process.exit(2); // Error
    }
}

main();
