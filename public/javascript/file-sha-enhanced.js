/**
 * Enhanced File Analysis Functions
 * Extracts comprehensive metadata from files in the browser
 * 
 * Features:
 * - EXIF data from images
 * - Audio/Video metadata
 * - Text file analysis
 * - File signature detection
 * - Color analysis
 * - Document metadata
 * - Binary analysis
 */

/**
 * Enhanced file metadata extraction with comprehensive analysis
 * @param {File} file - The file to analyze
 * @returns {Promise<Object>} - Complete metadata object
 */
async function extractEnhancedFileMetadata(file) {
    const metadata = {
        // Basic properties
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown',
        lastModified: new Date(file.lastModified),
        extension: getFileExtension(file.name),
        sizeFormatted: formatFileSize(file.size),
        
        // Enhanced analysis
        analysis: {
            processingTime: 0,
            confidence: 'high'
        }
    };
    
    const startTime = performance.now();
    
    try {
        // File signature detection
        metadata.signature = await detectFileSignature(file);
        
        // Content type analysis
        metadata.contentAnalysis = await analyzeFileContent(file);
        
        // Type-specific metadata
        if (file.type.startsWith('image/')) {
            metadata.image = await getEnhancedImageMetadata(file);
        } else if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            metadata.media = await getMediaMetadata(file);
        } else if (isTextFile(file)) {
            metadata.text = await getTextFileMetadata(file);
        } else if (file.type === 'application/pdf') {
            metadata.pdf = await getPDFMetadata(file);
        } else if (isArchiveFile(file)) {
            metadata.archive = await getArchiveMetadata(file);
        }
        
        // Binary analysis for all files
        metadata.binary = await getBinaryAnalysis(file);
        
        // Web file analysis
        if (isWebFile(file)) {
            metadata.web = await getWebFileMetadata(file);
        }
        
    } catch (error) {
        metadata.analysis.error = error.message;
        metadata.analysis.confidence = 'low';
    }
    
    metadata.analysis.processingTime = performance.now() - startTime;
    return metadata;
}

/**
 * Enhanced image metadata with EXIF, color analysis, and technical details
 */
async function getEnhancedImageMetadata(file) {
    const metadata = await getImageMetadata(file); // Basic dimensions
    
    try {
        // EXIF data extraction
        metadata.exif = await extractEXIFData(file);
        
        // Color analysis
        metadata.colors = await analyzeImageColors(file);
        
        // Technical details
        metadata.technical = await getImageTechnicalDetails(file);
        
    } catch (error) {
        metadata.analysisError = error.message;
    }
    
    return metadata;
}

/**
 * Extract EXIF data from images
 */
async function extractEXIFData(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            const exif = parseEXIF(new Uint8Array(arrayBuffer));
            resolve(exif);
        };
        reader.onerror = () => resolve({ error: 'Could not read EXIF data' });
        reader.readAsArrayBuffer(file.slice(0, 65536)); // Read first 64KB for EXIF
    });
}

/**
 * Basic EXIF parser (simplified - in production use a library like exif-js)
 */
function parseEXIF(data) {
    const exif = {};
    
    // Look for EXIF marker (0xFFE1)
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 0xFF && data[i + 1] === 0xE1) {
            // Found EXIF marker
            const exifLength = (data[i + 2] << 8) | data[i + 3];
            
            // Check for "Exif\0\0" identifier
            if (data[i + 4] === 0x45 && data[i + 5] === 0x78 && 
                data[i + 6] === 0x69 && data[i + 7] === 0x66) {
                
                exif.hasEXIF = true;
                exif.exifLength = exifLength;
                
                // Basic EXIF parsing (would need full library for complete parsing)
                exif.found = 'EXIF header detected';
                
                // Look for GPS data marker
                const exifData = data.slice(i + 10, i + exifLength);
                if (containsGPSData(exifData)) {
                    exif.hasGPS = true;
                }
                
                break;
            }
        }
    }
    
    if (!exif.hasEXIF) {
        exif.hasEXIF = false;
        exif.reason = 'No EXIF data found';
    }
    
    return exif;
}

/**
 * Check if EXIF data contains GPS information
 */
function containsGPSData(exifData) {
    // Look for GPS IFD tag (0x8825)
    for (let i = 0; i < exifData.length - 1; i++) {
        if (exifData[i] === 0x88 && exifData[i + 1] === 0x25) {
            return true;
        }
    }
    return false;
}

/**
 * Analyze dominant colors in an image
 */
async function analyzeImageColors(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = function() {
            // Resize to small canvas for color analysis
            const size = 50;
            canvas.width = size;
            canvas.height = size;
            
            ctx.drawImage(img, 0, 0, size, size);
            const imageData = ctx.getImageData(0, 0, size, size);
            const colors = extractDominantColors(imageData);
            
            URL.revokeObjectURL(img.src);
            resolve(colors);
        };
        
        img.onerror = () => resolve({ error: 'Could not analyze colors' });
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Extract dominant colors from image data
 */
function extractDominantColors(imageData) {
    const colorCounts = {};
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = Math.floor(data[i] / 32) * 32;
        const g = Math.floor(data[i + 1] / 32) * 32;
        const b = Math.floor(data[i + 2] / 32) * 32;
        const color = `rgb(${r},${g},${b})`;
        
        colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
    
    const sortedColors = Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([color, count]) => ({ color, count }));
    
    return {
        dominantColors: sortedColors,
        totalPixels: data.length / 4,
        uniqueColors: Object.keys(colorCounts).length
    };
}

/**
 * Get technical image details
 */
async function getImageTechnicalDetails(file) {
    const details = {
        format: file.type,
        compressionRatio: 0,
        hasTransparency: false,
        isAnimated: false
    };
    
    // Estimate compression ratio
    const img = await createImageFromFile(file);
    const uncompressedSize = img.width * img.height * 4; // RGBA
    details.compressionRatio = (file.size / uncompressedSize * 100).toFixed(2) + '%';
    
    // Check for transparency (PNG)
    if (file.type === 'image/png') {
        details.hasTransparency = await checkPNGTransparency(file);
    }
    
    // Check for animation (GIF)
    if (file.type === 'image/gif') {
        details.isAnimated = await checkGIFAnimation(file);
    }
    
    return details;
}

/**
 * Get audio/video metadata
 */
async function getMediaMetadata(file) {
    return new Promise((resolve) => {
        const media = file.type.startsWith('video/') 
            ? document.createElement('video')
            : document.createElement('audio');
        
        const url = URL.createObjectURL(file);
        media.src = url;
        
        media.onloadedmetadata = function() {
            const metadata = {
                duration: this.duration,
                durationFormatted: formatDuration(this.duration)
            };
            
            if (file.type.startsWith('video/')) {
                metadata.width = this.videoWidth;
                metadata.height = this.videoHeight;
                metadata.aspectRatio = (this.videoWidth / this.videoHeight).toFixed(2);
            }
            
            // Try to get additional properties
            if (this.webkitAudioDecodedByteCount !== undefined) {
                metadata.audioDecodedBytes = this.webkitAudioDecodedByteCount;
            }
            
            URL.revokeObjectURL(url);
            resolve(metadata);
        };
        
        media.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ error: 'Could not load media metadata' });
        };
    });
}

/**
 * Analyze text files
 */
async function getTextFileMetadata(file) {
    const text = await readFileAsText(file);
    
    return {
        encoding: detectTextEncoding(file),
        lineCount: text.split('\n').length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        characterCountNoSpaces: text.replace(/\s/g, '').length,
        lineEndings: detectLineEndings(text),
        language: detectProgrammingLanguage(file.name, text),
        isEmpty: text.trim().length === 0,
        hasUnicode: /[^\x00-\x7F]/.test(text),
        averageLineLength: text.split('\n').reduce((sum, line) => sum + line.length, 0) / text.split('\n').length
    };
}

/**
 * Detect file signature/magic numbers
 */
async function detectFileSignature(file) {
    const header = await readFileHeader(file, 32); // Read first 32 bytes
    const signature = Array.from(header)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ');
    
    const detectedType = identifyFileType(header);
    
    return {
        signature: signature.substring(0, 23) + (signature.length > 23 ? '...' : ''),
        detectedType,
        matchesExtension: detectedType.toLowerCase().includes(getFileExtension(file.name)),
        confidence: getSignatureConfidence(header, file.type)
    };
}

/**
 * Identify file type from header bytes
 */
function identifyFileType(header) {
    const signatures = {
        'FFD8FF': 'JPEG',
        '89504E47': 'PNG',
        '474946': 'GIF',
        '25504446': 'PDF',
        '504B': 'ZIP/Office',
        'D0CF11E0': 'Microsoft Office',
        '1F8B': 'GZIP',
        '7573746172': 'TAR',
        'RIFF': 'WAV/AVI',
        'ID3': 'MP3',
        '000001': 'MPEG',
        'OggS': 'OGG',
        'ftyp': 'MP4/MOV'
    };
    
    const headerHex = Array.from(header.slice(0, 8))
        .map(b => b.toString(16).toUpperCase())
        .join('');
    
    for (const [sig, type] of Object.entries(signatures)) {
        if (headerHex.startsWith(sig)) {
            return type;
        }
    }
    
    // Check for text files
    if (header.slice(0, 16).every(byte => 
        (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13)) {
        return 'Text';
    }
    
    return 'Unknown';
}

/**
 * Analyze file content for patterns
 */
async function analyzeFileContent(file) {
    const sample = await readFileSample(file, 1024); // Read first 1KB
    
    return {
        isBinary: isBinaryContent(sample),
        entropy: calculateEntropy(sample),
        nullBytes: countNullBytes(sample),
        printableRatio: calculatePrintableRatio(sample),
        compressionDetected: sample.length < file.size * 0.8 && calculateEntropy(sample) > 7
    };
}

/**
 * Binary analysis
 */
async function getBinaryAnalysis(file) {
    const sample = await readFileSample(file, 2048);
    const entropy = calculateEntropy(sample);
    
    return {
        entropy: entropy.toFixed(3),
        entropyAnalysis: getEntropyAnalysis(entropy),
        isBinary: isBinaryContent(sample),
        hasNullBytes: countNullBytes(sample) > 0,
        compressionRatio: estimateCompression(sample),
        randomnessScore: (entropy / 8 * 100).toFixed(1) + '%'
    };
}

/**
 * Web file analysis
 */
async function getWebFileMetadata(file) {
    if (!isWebFile(file)) return null;
    
    const content = await readFileAsText(file);
    const extension = getFileExtension(file.name);
    
    if (extension === 'html' || extension === 'htm') {
        return analyzeHTML(content);
    } else if (extension === 'css') {
        return analyzeCSS(content);
    } else if (extension === 'js' || extension === 'javascript') {
        return analyzeJavaScript(content);
    }
    
    return null;
}

/**
 * Analyze HTML content
 */
function analyzeHTML(content) {
    const tagCounts = {};
    const tagMatches = content.match(/<(\w+)[^>]*>/g) || [];
    
    tagMatches.forEach(tag => {
        const tagName = tag.match(/<(\w+)/)[1].toLowerCase();
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    });
    
    return {
        title: extractHTMLTitle(content),
        tagCount: tagMatches.length,
        uniqueTags: Object.keys(tagCounts).length,
        mostUsedTags: Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5),
        hasDoctype: /<!DOCTYPE/i.test(content),
        links: (content.match(/<a\s+[^>]*href/gi) || []).length,
        images: (content.match(/<img\s+[^>]*src/gi) || []).length,
        scripts: (content.match(/<script/gi) || []).length,
        stylesheets: (content.match(/<link[^>]*rel=["']stylesheet/gi) || []).length
    };
}

/**
 * Analyze CSS content
 */
function analyzeCSS(content) {
    const rules = (content.match(/[^{}]+\{[^{}]*\}/g) || []).length;
    const selectors = (content.match(/[^{}]+(?=\{)/g) || []).length;
    const properties = (content.match(/[^:]+:[^;]+;/g) || []).length;
    
    return {
        ruleCount: rules,
        selectorCount: selectors,
        propertyCount: properties,
        hasMediaQueries: /@media/.test(content),
        hasKeyframes: /@keyframes/.test(content),
        hasImports: /@import/.test(content),
        isMinified: content.length > 500 && content.split('\n').length < 10
    };
}

/**
 * Analyze JavaScript content
 */
function analyzeJavaScript(content) {
    const functions = (content.match(/function\s+\w+|=>\s*\{|\w+\s*:\s*function/g) || []).length;
    const variables = (content.match(/(?:var|let|const)\s+\w+/g) || []).length;
    
    return {
        functionCount: functions,
        variableDeclarations: variables,
        hasModules: /(?:import|export)/.test(content),
        hasArrowFunctions: /=>/.test(content),
        hasAsyncAwait: /(?:async|await)/.test(content),
        hasClasses: /class\s+\w+/.test(content),
        isMinified: content.length > 500 && content.split('\n').length < 10,
        complexity: estimateCodeComplexity(content)
    };
}

// Helper functions
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function isTextFile(file) {
    const textTypes = ['text/', 'application/json', 'application/xml', 'application/javascript'];
    const textExtensions = ['txt', 'md', 'csv', 'log', 'conf', 'ini', 'yaml', 'yml'];
    
    return textTypes.some(type => file.type.startsWith(type)) ||
           textExtensions.includes(getFileExtension(file.name));
}

function isWebFile(file) {
    const webExtensions = ['html', 'htm', 'css', 'js', 'javascript'];
    return webExtensions.includes(getFileExtension(file.name));
}

function isArchiveFile(file) {
    const archiveTypes = ['application/zip', 'application/x-rar', 'application/x-tar'];
    const archiveExtensions = ['zip', 'rar', 'tar', 'gz', '7z'];
    
    return archiveTypes.includes(file.type) ||
           archiveExtensions.includes(getFileExtension(file.name));
}

async function readFileHeader(file, bytes) {
    const blob = file.slice(0, bytes);
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

async function readFileSample(file, bytes) {
    const blob = file.slice(0, Math.min(bytes, file.size));
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Could not read file as text'));
        reader.readAsText(file);
    });
}

function calculateEntropy(data) {
    const frequency = {};
    for (let i = 0; i < data.length; i++) {
        frequency[data[i]] = (frequency[data[i]] || 0) + 1;
    }
    
    let entropy = 0;
    const length = data.length;
    
    for (const count of Object.values(frequency)) {
        const p = count / length;
        entropy -= p * Math.log2(p);
    }
    
    return entropy;
}

function isBinaryContent(data) {
    const nullBytes = countNullBytes(data);
    const controlBytes = data.filter(byte => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13).length;
    
    return nullBytes > 0 || controlBytes / data.length > 0.1;
}

function countNullBytes(data) {
    return data.filter(byte => byte === 0).length;
}

function calculatePrintableRatio(data) {
    const printable = data.filter(byte => 
        (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13
    ).length;
    
    return printable / data.length;
}

function getEntropyAnalysis(entropy) {
    if (entropy < 1) return 'Very low (likely empty or very repetitive)';
    if (entropy < 3) return 'Low (highly structured/compressed)';
    if (entropy < 5) return 'Medium (normal text/code)';
    if (entropy < 7) return 'High (mixed content)';
    return 'Very high (encrypted/compressed/random)';
}

function detectTextEncoding(file) {
    // Basic encoding detection (simplified)
    if (file.type.includes('charset=utf-8') || file.name.includes('utf8')) {
        return 'UTF-8';
    }
    return 'Unknown (likely UTF-8)';
}

function detectLineEndings(text) {
    const crlf = (text.match(/\r\n/g) || []).length;
    const lf = (text.match(/(?<!\r)\n/g) || []).length;
    const cr = (text.match(/\r(?!\n)/g) || []).length;
    
    if (crlf > lf && crlf > cr) return 'CRLF (Windows)';
    if (lf > crlf && lf > cr) return 'LF (Unix/Mac)';
    if (cr > crlf && cr > lf) return 'CR (Classic Mac)';
    return 'Mixed';
}

function detectProgrammingLanguage(filename, content) {
    const extension = getFileExtension(filename);
    
    const languageMap = {
        'js': 'JavaScript', 'ts': 'TypeScript', 'py': 'Python',
        'java': 'Java', 'cpp': 'C++', 'c': 'C', 'cs': 'C#',
        'php': 'PHP', 'rb': 'Ruby', 'go': 'Go', 'rs': 'Rust',
        'html': 'HTML', 'css': 'CSS', 'sql': 'SQL', 'sh': 'Shell',
        'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML', 'md': 'Markdown'
    };
    
    return languageMap[extension] || 'Unknown';
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function extractHTMLTitle(content) {
    const match = content.match(/<title[^>]*>([^<]+)</i);
    return match ? match[1].trim() : 'No title found';
}

function estimateCodeComplexity(content) {
    const complexityKeywords = /(?:if|else|while|for|switch|case|try|catch|function)/g;
    const matches = content.match(complexityKeywords) || [];
    return matches.length;
}

function getSignatureConfidence(header, declaredType) {
    const detectedType = identifyFileType(header);
    if (detectedType === 'Unknown') return 'low';
    if (declaredType.includes(detectedType.toLowerCase())) return 'high';
    return 'medium';
}

function estimateCompression(data) {
    // Simple compression estimation
    const uniqueBytes = new Set(data).size;
    const ratio = uniqueBytes / 256;
    
    if (ratio < 0.1) return 'Very high';
    if (ratio < 0.3) return 'High';
    if (ratio < 0.6) return 'Medium';
    return 'Low';
}

async function createImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Could not load image'));
        };
        img.src = URL.createObjectURL(file);
    });
}

async function checkPNGTransparency(file) {
    // Simplified PNG transparency check
    const header = await readFileHeader(file, 64);
    const headerStr = Array.from(header).map(b => String.fromCharCode(b)).join('');
    return headerStr.includes('tRNS') || headerStr.includes('PLTE');
}

async function checkGIFAnimation(file) {
    // Simplified GIF animation check
    const content = await readFileSample(file, 1024);
    const contentStr = Array.from(content).map(b => String.fromCharCode(b)).join('');
    return contentStr.includes('NETSCAPE') || contentStr.includes('!');
}

// Existing functions from original file-sha.js
async function calculateMultipleSHA(file) {
    try {
        const buffer = await file.arrayBuffer();
        const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        const hashes = {};
        
        for (const algorithm of algorithms) {
            const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            hashes[algorithm] = hashHex;
        }
        
        return hashes;
    } catch (error) {
        console.error('Error calculating file hashes:', error);
        throw error;
    }
}

async function getImageMetadata(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = function() {
            const metadata = {
                width: this.naturalWidth,
                height: this.naturalHeight,
                aspectRatio: (this.naturalWidth / this.naturalHeight).toFixed(2)
            };
            URL.revokeObjectURL(url);
            resolve(metadata);
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Legacy compatibility
async function calculateFileSHA(file) {
    const hashes = await calculateMultipleSHA(file);
    return hashes['SHA-256'];
}

async function extractFileMetadata(file) {
    return await extractEnhancedFileMetadata(file);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractEnhancedFileMetadata,
        calculateMultipleSHA,
        calculateFileSHA,
        extractFileMetadata,
        getImageMetadata,
        getEnhancedImageMetadata,
        formatFileSize,
        detectFileSignature,
        analyzeFileContent,
        getMediaMetadata,
        getTextFileMetadata
    };
} 