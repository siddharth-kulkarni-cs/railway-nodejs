/**
 * Advanced File Carving and Embedded Object Extractor
 * Professional-grade forensic tool for detecting and extracting embedded files
 * All processing done client-side for maximum privacy
 */

class AdvancedFileCarvingEngine {
    constructor() {
        this.fileSignatures = this.initializeFileSignatures();
        this.maxDepth = 5; // Maximum recursive analysis depth
        this.minFileSize = 10; // Minimum size for carved files
        this.maxFileSize = 50 * 1024 * 1024; // 50MB max for carved files
    }

    /**
     * Comprehensive database of file signatures with multiple variants
     */
    initializeFileSignatures() {
        return {
            // Images
            'JPEG': [
                { signature: [0xFF, 0xD8, 0xFF], extension: 'jpg', footer: [0xFF, 0xD9], description: 'JPEG Image' },
                { signature: [0xFF, 0xD8, 0xFF, 0xE0], extension: 'jpg', footer: [0xFF, 0xD9], description: 'JPEG Image (JFIF)' },
                { signature: [0xFF, 0xD8, 0xFF, 0xE1], extension: 'jpg', footer: [0xFF, 0xD9], description: 'JPEG Image (EXIF)' },
                { signature: [0xFF, 0xD8, 0xFF, 0xE8], extension: 'jpg', footer: [0xFF, 0xD9], description: 'JPEG Image (SPIFF)' }
            ],
            'PNG': [
                { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], extension: 'png', footer: [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82], description: 'PNG Image' }
            ],
            'GIF': [
                { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], extension: 'gif', footer: [0x00, 0x3B], description: 'GIF Image (87a)' },
                { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], extension: 'gif', footer: [0x00, 0x3B], description: 'GIF Image (89a)' }
            ],
            'BMP': [
                { signature: [0x42, 0x4D], extension: 'bmp', description: 'Bitmap Image' }
            ],
            'TIFF': [
                { signature: [0x49, 0x49, 0x2A, 0x00], extension: 'tiff', description: 'TIFF Image (Little Endian)' },
                { signature: [0x4D, 0x4D, 0x00, 0x2A], extension: 'tiff', description: 'TIFF Image (Big Endian)' }
            ],
            'WEBP': [
                { signature: [0x52, 0x49, 0x46, 0x46], extension: 'webp', footer: [0x57, 0x45, 0x42, 0x50], description: 'WebP Image', offset: 8 }
            ],
            'ICO': [
                { signature: [0x00, 0x00, 0x01, 0x00], extension: 'ico', description: 'Windows Icon' }
            ],

            // Archives
            'ZIP': [
                { signature: [0x50, 0x4B, 0x03, 0x04], extension: 'zip', description: 'ZIP Archive' },
                { signature: [0x50, 0x4B, 0x05, 0x06], extension: 'zip', description: 'ZIP Archive (Empty)' },
                { signature: [0x50, 0x4B, 0x07, 0x08], extension: 'zip', description: 'ZIP Archive (Spanned)' }
            ],
            'RAR': [
                { signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], extension: 'rar', description: 'RAR Archive (v1.5+)' },
                { signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00], extension: 'rar', description: 'RAR Archive (v5.0+)' }
            ],
            '7Z': [
                { signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], extension: '7z', description: '7-Zip Archive' }
            ],
            'GZIP': [
                { signature: [0x1F, 0x8B], extension: 'gz', description: 'GZIP Archive' }
            ],
            'TAR': [
                { signature: [0x75, 0x73, 0x74, 0x61, 0x72], extension: 'tar', description: 'TAR Archive', offset: 257 }
            ],

            // Documents
            'PDF': [
                { signature: [0x25, 0x50, 0x44, 0x46], extension: 'pdf', footer: [0x25, 0x25, 0x45, 0x4F, 0x46], description: 'PDF Document' }
            ],
            'OFFICE_DOC': [
                { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], extension: 'doc', description: 'Microsoft Office Document (Legacy)' }
            ],
            'OFFICE_XML': [
                { signature: [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00], extension: 'docx', description: 'Microsoft Office XML Document' }
            ],
            'RTF': [
                { signature: [0x7B, 0x5C, 0x72, 0x74, 0x66], extension: 'rtf', description: 'Rich Text Format' }
            ],

            // Media
            'MP3': [
                { signature: [0x49, 0x44, 0x33], extension: 'mp3', description: 'MP3 Audio (ID3)' },
                { signature: [0xFF, 0xFB], extension: 'mp3', description: 'MP3 Audio (MPEG-1)' },
                { signature: [0xFF, 0xF3], extension: 'mp3', description: 'MP3 Audio (MPEG-2)' },
                { signature: [0xFF, 0xF2], extension: 'mp3', description: 'MP3 Audio (MPEG-2.5)' }
            ],
            'MP4': [
                { signature: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], extension: 'mp4', description: 'MP4 Video', offset: 4 },
                { signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], extension: 'mp4', description: 'MP4 Video', offset: 4 }
            ],
            'AVI': [
                { signature: [0x52, 0x49, 0x46, 0x46], extension: 'avi', description: 'AVI Video', secondaryCheck: [0x41, 0x56, 0x49, 0x20], secondaryOffset: 8 }
            ],
            'WAV': [
                { signature: [0x52, 0x49, 0x46, 0x46], extension: 'wav', description: 'WAV Audio', secondaryCheck: [0x57, 0x41, 0x56, 0x45], secondaryOffset: 8 }
            ],
            'FLAC': [
                { signature: [0x66, 0x4C, 0x61, 0x43], extension: 'flac', description: 'FLAC Audio' }
            ],
            'OGG': [
                { signature: [0x4F, 0x67, 0x67, 0x53], extension: 'ogg', description: 'OGG Audio/Video' }
            ],

            // Executables
            'PE': [
                { signature: [0x4D, 0x5A], extension: 'exe', description: 'Windows PE Executable', secondaryCheck: [0x50, 0x45, 0x00, 0x00], secondaryOffset: 'dynamic' }
            ],
            'ELF': [
                { signature: [0x7F, 0x45, 0x4C, 0x46], extension: 'elf', description: 'Linux ELF Executable' }
            ],
            'MACH_O': [
                { signature: [0xFE, 0xED, 0xFA, 0xCE], extension: 'bin', description: 'Mach-O Executable (32-bit BE)' },
                { signature: [0xCE, 0xFA, 0xED, 0xFE], extension: 'bin', description: 'Mach-O Executable (32-bit LE)' },
                { signature: [0xFE, 0xED, 0xFA, 0xCF], extension: 'bin', description: 'Mach-O Executable (64-bit BE)' },
                { signature: [0xCF, 0xFA, 0xED, 0xFE], extension: 'bin', description: 'Mach-O Executable (64-bit LE)' }
            ],

            // Other formats
            'SQLITE': [
                { signature: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33], extension: 'sqlite', description: 'SQLite Database' }
            ],
            'CLASS': [
                { signature: [0xCA, 0xFE, 0xBA, 0xBE], extension: 'class', description: 'Java Class File' }
            ],
            'JAR': [
                { signature: [0x50, 0x4B, 0x03, 0x04], extension: 'jar', description: 'Java Archive', contextCheck: 'META-INF/' }
            ],
            'WASM': [
                { signature: [0x00, 0x61, 0x73, 0x6D], extension: 'wasm', description: 'WebAssembly Binary' }
            ],
            'XML': [
                { signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], extension: 'xml', description: 'XML Document' }
            ],
            'BITCOIN_WALLET': [
                { signature: [0x01, 0x00, 0x00, 0x00], extension: 'wallet', description: 'Bitcoin Wallet', contextCheck: 'wallet' }
            ],
            'QR_CODE': [
                { signature: [0x51, 0x52, 0x43, 0x4F, 0x44, 0x45], extension: 'qr', description: 'QR Code Data' }
            ]
        };
    }

    /**
     * Main file carving analysis
     */
    async analyzeFile(file) {
        try {
            const startTime = performance.now();
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            const results = {
                originalFile: {
                    name: file.name,
                    size: file.size,
                    type: file.type
                },
                carvedFiles: [],
                overlayData: null,
                polyglotAnalysis: {},
                forensicTimeline: [],
                suspiciousRegions: [],
                hiddenData: {},
                statistics: {
                    totalScanned: bytes.length,
                    signaturesChecked: 0,
                    filesCarved: 0,
                    dataRecovered: 0,
                    processingTime: 0
                }
            };

            // Add initial timeline entry
            this.addTimelineEntry(results, 'Analysis Started', `Scanning ${bytes.length.toLocaleString()} bytes`);

            // Perform comprehensive file carving
            await this.performFileCarving(bytes, results);
            
            // Analyze polyglot structures
            this.analyzePolyglotStructure(bytes, results);
            
            // Detect overlay data (common in malware)
            this.detectOverlayData(bytes, results);
            
            // Search for hidden data patterns
            this.detectHiddenDataPatterns(bytes, results);
            
            // Analyze file gaps and slack space
            this.analyzeFileGaps(bytes, results);
            
            // Final statistics
            results.statistics.processingTime = performance.now() - startTime;
            this.addTimelineEntry(results, 'Analysis Complete', 
                `Processed ${results.statistics.signaturesChecked} signatures, carved ${results.statistics.filesCarved} files`);

            return results;
            
        } catch (error) {
            throw new Error(`File carving failed: ${error.message}`);
        }
    }

    /**
     * Core file carving algorithm
     */
    async performFileCarving(bytes, results) {
        const carvedFiles = [];
        let offset = 0;
        
        while (offset < bytes.length - 16) { // Leave buffer for signature checking
            let found = false;
            
            // Check all file signatures
            for (const [fileType, signatures] of Object.entries(this.fileSignatures)) {
                for (const sig of signatures) {
                    results.statistics.signaturesChecked++;
                    
                    const checkOffset = offset + (sig.offset || 0);
                    if (this.matchesSignature(bytes, checkOffset, sig.signature)) {
                        
                        // Perform secondary checks if required
                        if (sig.secondaryCheck && !this.performSecondaryCheck(bytes, checkOffset, sig)) {
                            continue;
                        }
                        
                        // Context check for ambiguous signatures
                        if (sig.contextCheck && !this.performContextCheck(bytes, checkOffset, sig.contextCheck)) {
                            continue;
                        }
                        
                        // Try to determine file end
                        const fileEnd = this.findFileEnd(bytes, checkOffset, sig);
                        
                        if (fileEnd > checkOffset + this.minFileSize && fileEnd - checkOffset <= this.maxFileSize) {
                            const carvedData = bytes.slice(checkOffset, fileEnd);
                            
                            const carvedFile = {
                                id: `carved_${carvedFiles.length}`,
                                type: fileType,
                                description: sig.description,
                                extension: sig.extension,
                                offset: checkOffset,
                                size: carvedData.length,
                                data: carvedData,
                                confidence: this.calculateConfidence(carvedData, sig),
                                hexPreview: this.generateHexPreview(carvedData.slice(0, 64)),
                                metadata: await this.extractCarvedFileMetadata(carvedData, sig)
                            };
                            
                            carvedFiles.push(carvedFile);
                            results.statistics.filesCarved++;
                            results.statistics.dataRecovered += carvedData.length;
                            
                            this.addTimelineEntry(results, 'File Carved', 
                                `${sig.description} at offset 0x${checkOffset.toString(16).toUpperCase()}, size: ${this.formatSize(carvedData.length)}`);
                            
                            found = true;
                            offset = fileEnd; // Skip past this file
                            break;
                        }
                    }
                }
                if (found) break;
            }
            
            if (!found) {
                offset++;
            }
        }
        
        results.carvedFiles = carvedFiles;
    }

    /**
     * Check if bytes match a signature
     */
    matchesSignature(bytes, offset, signature) {
        if (offset + signature.length > bytes.length) return false;
        
        for (let i = 0; i < signature.length; i++) {
            if (bytes[offset + i] !== signature[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Perform secondary signature check
     */
    performSecondaryCheck(bytes, offset, sig) {
        if (!sig.secondaryCheck) return true;
        
        let secondaryOffset;
        if (sig.secondaryOffset === 'dynamic') {
            // For PE files, read PE header offset from bytes 60-63
            if (offset + 63 < bytes.length) {
                secondaryOffset = offset + bytes[offset + 60] + (bytes[offset + 61] << 8) + 
                                (bytes[offset + 62] << 16) + (bytes[offset + 63] << 24);
            } else {
                return false;
            }
        } else {
            secondaryOffset = offset + sig.secondaryOffset;
        }
        
        if (secondaryOffset + sig.secondaryCheck.length > bytes.length) return false;
        
        for (let i = 0; i < sig.secondaryCheck.length; i++) {
            if (bytes[secondaryOffset + i] !== sig.secondaryCheck[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Context-based verification
     */
    performContextCheck(bytes, offset, contextString) {
        const searchRange = Math.min(bytes.length, offset + 1024);
        const searchBytes = bytes.slice(offset, searchRange);
        const text = new TextDecoder('utf-8', { fatal: false }).decode(searchBytes);
        return text.toLowerCase().includes(contextString.toLowerCase());
    }

    /**
     * Find end of file using footer or heuristics
     */
    findFileEnd(bytes, startOffset, sig) {
        // If footer is defined, search for it
        if (sig.footer) {
            for (let i = startOffset + sig.signature.length; i < bytes.length - sig.footer.length; i++) {
                if (this.matchesSignature(bytes, i, sig.footer)) {
                    return i + sig.footer.length;
                }
            }
        }
        
        // Use format-specific heuristics
        if (sig.extension === 'zip' || sig.extension === 'jar') {
            return this.findZipEnd(bytes, startOffset);
        } else if (sig.extension === 'pdf') {
            return this.findPdfEnd(bytes, startOffset);
        } else if (sig.extension === 'exe') {
            return this.findPeEnd(bytes, startOffset);
        }
        
        // Default: scan until next file signature or end
        return this.findNextSignatureOrEnd(bytes, startOffset + 100);
    }

    /**
     * ZIP file end detection
     */
    findZipEnd(bytes, startOffset) {
        // Look for End of Central Directory signature
        const eocdsig = [0x50, 0x4B, 0x05, 0x06];
        for (let i = startOffset; i < bytes.length - 22; i++) {
            if (this.matchesSignature(bytes, i, eocdsig)) {
                // Read comment length from EOCD
                const commentLength = bytes[i + 20] + (bytes[i + 21] << 8);
                return i + 22 + commentLength;
            }
        }
        return this.findNextSignatureOrEnd(bytes, startOffset + 100);
    }

    /**
     * PDF file end detection
     */
    findPdfEnd(bytes, startOffset) {
        // Look for %%EOF
        const eofPattern = [0x25, 0x25, 0x45, 0x4F, 0x46];
        for (let i = bytes.length - 10; i > startOffset; i--) {
            if (this.matchesSignature(bytes, i, eofPattern)) {
                return i + eofPattern.length;
            }
        }
        return this.findNextSignatureOrEnd(bytes, startOffset + 100);
    }

    /**
     * PE file end detection
     */
    findPeEnd(bytes, startOffset) {
        try {
            // Parse PE header to get file size
            if (startOffset + 64 < bytes.length) {
                const peOffset = bytes[startOffset + 60] + (bytes[startOffset + 61] << 8) + 
                               (bytes[startOffset + 62] << 16) + (bytes[startOffset + 63] << 24);
                
                if (startOffset + peOffset + 24 < bytes.length) {
                    const sizeOfImage = bytes[startOffset + peOffset + 80] + 
                                      (bytes[startOffset + peOffset + 81] << 8) +
                                      (bytes[startOffset + peOffset + 82] << 16) + 
                                      (bytes[startOffset + peOffset + 83] << 24);
                    
                    if (sizeOfImage > 0 && sizeOfImage < 100 * 1024 * 1024) { // Reasonable size
                        return startOffset + sizeOfImage;
                    }
                }
            }
        } catch (e) {
            // Fall back to heuristic
        }
        
        return this.findNextSignatureOrEnd(bytes, startOffset + 1024);
    }

    /**
     * Find next file signature or reasonable end point
     */
    findNextSignatureOrEnd(bytes, startOffset) {
        const maxScanSize = 10 * 1024 * 1024; // 10MB max per file
        const endOffset = Math.min(bytes.length, startOffset + maxScanSize);
        
        // Look for any other file signature
        for (let i = startOffset; i < endOffset - 8; i++) {
            for (const signatures of Object.values(this.fileSignatures)) {
                for (const sig of signatures) {
                    if (this.matchesSignature(bytes, i, sig.signature)) {
                        return i; // Found next file
                    }
                }
            }
        }
        
        return endOffset;
    }

    /**
     * Calculate confidence score for carved file
     */
    calculateConfidence(data, sig) {
        let confidence = 50; // Base confidence
        
        // Size reasonableness
        if (data.length > 100 && data.length < 1024 * 1024) confidence += 20;
        if (data.length > 1024 * 1024) confidence += 10;
        
        // Footer match
        if (sig.footer && data.length >= sig.footer.length) {
            const footerOffset = data.length - sig.footer.length;
            if (this.matchesSignature(data, footerOffset, sig.footer)) {
                confidence += 30;
            }
        }
        
        // Format-specific validation
        if (sig.extension === 'zip') {
            confidence += this.validateZipStructure(data);
        } else if (sig.extension === 'pdf') {
            confidence += this.validatePdfStructure(data);
        } else if (sig.extension === 'jpg') {
            confidence += this.validateJpegStructure(data);
        }
        
        return Math.min(100, confidence);
    }

    /**
     * ZIP structure validation
     */
    validateZipStructure(data) {
        let score = 0;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        
        try {
            // Check for central directory
            for (let i = data.length - 22; i >= 0; i--) {
                if (data[i] === 0x50 && data[i+1] === 0x4B && data[i+2] === 0x05 && data[i+3] === 0x06) {
                    score += 15;
                    break;
                }
            }
            
            // Check for reasonable file entries
            let offset = 0;
            let fileCount = 0;
            while (offset < data.length - 30 && fileCount < 100) {
                if (data[offset] === 0x50 && data[offset+1] === 0x4B) {
                    if (data[offset+2] === 0x03 && data[offset+3] === 0x04) { // Local file header
                        const filenameLength = view.getUint16(offset + 26, true);
                        const extraLength = view.getUint16(offset + 28, true);
                        const compressedSize = view.getUint32(offset + 18, true);
                        
                        if (filenameLength < 256 && extraLength < 1024) {
                            score += 2;
                            fileCount++;
                            offset += 30 + filenameLength + extraLength + compressedSize;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        } catch (e) {
            // Structure validation failed
        }
        
        return Math.min(15, score);
    }

    /**
     * PDF structure validation
     */
    validatePdfStructure(data) {
        let score = 0;
        const text = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, Math.min(1024, data.length)));
        
        if (text.includes('%PDF-')) score += 10;
        if (text.includes('obj')) score += 5;
        if (text.includes('endobj')) score += 5;
        if (text.includes('xref')) score += 5;
        if (text.includes('trailer')) score += 5;
        
        const endText = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(-100));
        if (endText.includes('%%EOF')) score += 10;
        
        return Math.min(15, score);
    }

    /**
     * JPEG structure validation
     */
    validateJpegStructure(data) {
        let score = 0;
        
        // Check for JPEG markers
        for (let i = 0; i < Math.min(data.length - 1, 1024); i++) {
            if (data[i] === 0xFF && data[i + 1] !== 0xFF && data[i + 1] !== 0x00) {
                score += 1;
                if (score >= 10) break; // Enough markers found
            }
        }
        
        // Check for end marker
        if (data.length >= 2 && data[data.length - 2] === 0xFF && data[data.length - 1] === 0xD9) {
            score += 5;
        }
        
        return Math.min(15, score);
    }

    /**
     * Extract metadata from carved file
     */
    async extractCarvedFileMetadata(data, sig) {
        const metadata = {
            entropy: this.calculateEntropy(data.slice(0, Math.min(1024, data.length))),
            hasStrings: this.containsReadableStrings(data),
            isCompressed: this.appearsCompressed(data),
            magicBytes: Array.from(data.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
        };
        
        // Format-specific metadata
        if (sig.extension === 'jpg' && data.length > 10) {
            metadata.jpeg = this.extractJpegMetadata(data);
        } else if (sig.extension === 'png' && data.length > 20) {
            metadata.png = this.extractPngMetadata(data);
        } else if (sig.extension === 'zip' && data.length > 30) {
            metadata.zip = this.extractZipMetadata(data);
        }
        
        return metadata;
    }

    /**
     * Extract JPEG metadata from carved data
     */
    extractJpegMetadata(data) {
        const metadata = { segments: [] };
        let offset = 2; // Skip FF D8
        
        while (offset < data.length - 1) {
            if (data[offset] === 0xFF && data[offset + 1] !== 0xFF) {
                const marker = data[offset + 1];
                const segmentLength = (data[offset + 2] << 8) | data[offset + 3];
                
                metadata.segments.push({
                    marker: '0xFF' + marker.toString(16).toUpperCase(),
                    length: segmentLength,
                    offset: offset
                });
                
                if (marker === 0xDA) break; // Start of scan data
                offset += 2 + segmentLength;
            } else {
                offset++;
            }
            
            if (metadata.segments.length > 50) break; // Prevent infinite loop
        }
        
        return metadata;
    }

    /**
     * Extract PNG metadata from carved data
     */
    extractPngMetadata(data) {
        const metadata = { chunks: [] };
        let offset = 8; // Skip PNG signature
        
        while (offset < data.length - 8) {
            const chunkLength = (data[offset] << 24) | (data[offset + 1] << 16) | 
                              (data[offset + 2] << 8) | data[offset + 3];
            const chunkType = String.fromCharCode(...data.slice(offset + 4, offset + 8));
            
            metadata.chunks.push({
                type: chunkType,
                length: chunkLength,
                offset: offset
            });
            
            offset += 12 + chunkLength; // 4 length + 4 type + data + 4 CRC
            
            if (chunkType === 'IEND' || metadata.chunks.length > 50) break;
        }
        
        return metadata;
    }

    /**
     * Extract ZIP metadata from carved data
     */
    extractZipMetadata(data) {
        const metadata = { files: [] };
        let offset = 0;
        
        while (offset < data.length - 30) {
            if (data[offset] === 0x50 && data[offset + 1] === 0x4B && 
                data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {
                
                const view = new DataView(data.buffer, data.byteOffset + offset, Math.min(30, data.length - offset));
                const filenameLength = view.getUint16(26, true);
                const extraLength = view.getUint16(28, true);
                const compressedSize = view.getUint32(18, true);
                
                if (offset + 30 + filenameLength <= data.length) {
                    const filename = new TextDecoder('utf-8', { fatal: false })
                        .decode(data.slice(offset + 30, offset + 30 + filenameLength));
                    
                    metadata.files.push({
                        filename: filename,
                        compressedSize: compressedSize,
                        offset: offset
                    });
                }
                
                offset += 30 + filenameLength + extraLength + compressedSize;
            } else {
                break;
            }
            
            if (metadata.files.length > 100) break; // Limit entries
        }
        
        return metadata;
    }

    /**
     * Analyze polyglot file structures
     */
    analyzePolyglotStructure(bytes, results) {
        const polyglots = [];
        const detectedTypes = new Set();
        
        // Check for multiple valid file signatures in the same file
        for (let offset = 0; offset < Math.min(bytes.length, 4096); offset++) {
            for (const [fileType, signatures] of Object.entries(this.fileSignatures)) {
                for (const sig of signatures) {
                    if (this.matchesSignature(bytes, offset, sig.signature)) {
                        if (offset === 0 || offset > 512) { // Either at start or embedded
                            detectedTypes.add(`${fileType} at 0x${offset.toString(16)}`);
                        }
                    }
                }
            }
        }
        
        if (detectedTypes.size > 1) {
            results.polyglotAnalysis = {
                isPolyglot: true,
                detectedTypes: Array.from(detectedTypes),
                riskLevel: detectedTypes.size > 3 ? 'HIGH' : 'MEDIUM',
                analysis: 'Multiple file signatures detected - possible polyglot file'
            };
            
            this.addTimelineEntry(results, 'Polyglot Detected', 
                `Found ${detectedTypes.size} different file signatures - potential security risk`);
        }
    }

    /**
     * Detect overlay data (common in malware)
     */
    detectOverlayData(bytes, results) {
        // Look for PE files with overlay data
        for (let i = 0; i < bytes.length - 64; i++) {
            if (bytes[i] === 0x4D && bytes[i + 1] === 0x5A) { // MZ header
                try {
                    const peOffset = bytes[i + 60] + (bytes[i + 61] << 8) + 
                                   (bytes[i + 62] << 16) + (bytes[i + 63] << 24);
                    
                    if (i + peOffset + 150 < bytes.length && 
                        bytes[i + peOffset] === 0x50 && bytes[i + peOffset + 1] === 0x45) {
                        
                        // Calculate actual PE size vs file size
                        const sections = this.parsePeSections(bytes, i + peOffset);
                        if (sections.length > 0) {
                            const lastSection = sections[sections.length - 1];
                            const peEndOffset = lastSection.rawOffset + lastSection.rawSize;
                            const remainingBytes = bytes.length - (i + peEndOffset);
                            
                            if (remainingBytes > 1024) { // Significant overlay
                                results.overlayData = {
                                    peStartOffset: i,
                                    peEndOffset: i + peEndOffset,
                                    overlayOffset: i + peEndOffset,
                                    overlaySize: remainingBytes,
                                    entropy: this.calculateEntropy(bytes.slice(i + peEndOffset, Math.min(bytes.length, i + peEndOffset + 1024))),
                                    analysis: remainingBytes > 100000 ? 'Large overlay - possible packed malware' : 'Small overlay - possibly legitimate'
                                };
                                
                                this.addTimelineEntry(results, 'Overlay Data Found', 
                                    `PE file has ${this.formatSize(remainingBytes)} overlay data - entropy: ${results.overlayData.entropy.toFixed(2)}`);
                            }
                        }
                    }
                } catch (e) {
                    // Skip invalid PE
                }
            }
        }
    }

    /**
     * Parse PE sections (simplified)
     */
    parsePeSections(bytes, peOffset) {
        const sections = [];
        try {
            const numberOfSections = bytes[peOffset + 6] + (bytes[peOffset + 7] << 8);
            const sectionTableOffset = peOffset + 248; // Standard PE32 offset
            
            for (let i = 0; i < numberOfSections && i < 20; i++) {
                const sectionOffset = sectionTableOffset + (i * 40);
                if (sectionOffset + 40 > bytes.length) break;
                
                const rawSize = bytes[sectionOffset + 16] + (bytes[sectionOffset + 17] << 8) +
                               (bytes[sectionOffset + 18] << 16) + (bytes[sectionOffset + 19] << 24);
                const rawOffset = bytes[sectionOffset + 20] + (bytes[sectionOffset + 21] << 8) +
                                 (bytes[sectionOffset + 22] << 16) + (bytes[sectionOffset + 23] << 24);
                
                sections.push({ rawOffset, rawSize });
            }
        } catch (e) {
            // Parsing failed
        }
        
        return sections;
    }

    /**
     * Detect hidden data patterns
     */
    detectHiddenDataPatterns(bytes, results) {
        const patterns = {
            base64Strings: this.findBase64Patterns(bytes),
            encryptedRegions: this.findHighEntropyRegions(bytes),
            suspiciousStrings: this.findSuspiciousStrings(bytes),
            hiddenUrls: this.findHiddenUrls(bytes)
        };
        
        let suspiciousCount = 0;
        if (patterns.base64Strings.length > 5) suspiciousCount++;
        if (patterns.encryptedRegions.length > 3) suspiciousCount++;
        if (patterns.suspiciousStrings.length > 0) suspiciousCount++;
        if (patterns.hiddenUrls.length > 0) suspiciousCount++;
        
        if (suspiciousCount > 0) {
            results.hiddenData = patterns;
            results.hiddenData.riskScore = suspiciousCount * 25;
            
            this.addTimelineEntry(results, 'Hidden Data Detected', 
                `Found ${patterns.base64Strings.length} base64 strings, ${patterns.encryptedRegions.length} encrypted regions`);
        }
    }

    /**
     * Find Base64 encoded patterns
     */
    findBase64Patterns(bytes) {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const base64Regex = /[A-Za-z0-9+/]{20,}={0,2}/g;
        const matches = [];
        let match;
        
        while ((match = base64Regex.exec(text)) !== null && matches.length < 50) {
            if (match[0].length >= 20) {
                matches.push({
                    offset: match.index,
                    length: match[0].length,
                    content: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
                    isValid: this.isValidBase64(match[0])
                });
            }
        }
        
        return matches;
    }

    /**
     * Find high entropy regions (possibly encrypted)
     */
    findHighEntropyRegions(bytes) {
        const regions = [];
        const blockSize = 1024;
        
        for (let i = 0; i < bytes.length - blockSize; i += blockSize) {
            const block = bytes.slice(i, i + blockSize);
            const entropy = this.calculateEntropy(block);
            
            if (entropy > 7.5) { // Very high entropy
                regions.push({
                    offset: i,
                    size: blockSize,
                    entropy: entropy,
                    classification: entropy > 7.8 ? 'Likely Encrypted' : 'High Randomness'
                });
            }
            
            if (regions.length > 20) break; // Limit results
        }
        
        return regions;
    }

    /**
     * Find suspicious strings
     */
    findSuspiciousStrings(bytes) {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const suspiciousPatterns = [
            /eval\s*\(/gi,
            /exec\s*\(/gi,
            /system\s*\(/gi,
            /shell_exec/gi,
            /cmd\.exe/gi,
            /powershell/gi,
            /base64_decode/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /CreateObject/gi,
            /WScript\.Shell/gi,
            /document\.write/gi
        ];
        
        const findings = [];
        
        for (const pattern of suspiciousPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null && findings.length < 20) {
                findings.push({
                    pattern: pattern.source,
                    offset: match.index,
                    context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
                });
            }
        }
        
        return findings;
    }

    /**
     * Find hidden URLs
     */
    findHiddenUrls(bytes) {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const urlRegex = /https?:\/\/[^\s<>"']+/gi;
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        
        const urls = [];
        let match;
        
        while ((match = urlRegex.exec(text)) !== null && urls.length < 50) {
            urls.push({
                type: 'URL',
                value: match[0],
                offset: match.index
            });
        }
        
        while ((match = ipRegex.exec(text)) !== null && urls.length < 100) {
            urls.push({
                type: 'IP Address',
                value: match[0],
                offset: match.index
            });
        }
        
        return urls;
    }

    /**
     * Analyze file gaps and slack space
     */
    analyzeFileGaps(bytes, results) {
        const gaps = [];
        let currentGapStart = null;
        const nullThreshold = 64; // Minimum null bytes to consider a gap
        let nullCount = 0;
        
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] === 0x00) {
                if (nullCount === 0) {
                    currentGapStart = i;
                }
                nullCount++;
            } else {
                if (nullCount >= nullThreshold) {
                    gaps.push({
                        offset: currentGapStart,
                        size: nullCount,
                        type: 'Null Bytes Gap',
                        entropy: 0
                    });
                }
                nullCount = 0;
            }
            
            if (gaps.length > 10) break; // Limit gap detection
        }
        
        if (gaps.length > 0) {
            results.suspiciousRegions = gaps;
            this.addTimelineEntry(results, 'File Gaps Detected', 
                `Found ${gaps.length} gap regions with null bytes`);
        }
    }

    // Utility methods
    
    addTimelineEntry(results, event, description) {
        results.forensicTimeline.push({
            timestamp: new Date().toISOString(),
            event: event,
            description: description
        });
    }

    calculateEntropy(data) {
        const freq = new Array(256).fill(0);
        for (const byte of data) {
            freq[byte]++;
        }
        
        let entropy = 0;
        const len = data.length;
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                const p = freq[i] / len;
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    }

    containsReadableStrings(data) {
        let printableCount = 0;
        const sampleSize = Math.min(1024, data.length);
        
        for (let i = 0; i < sampleSize; i++) {
            if ((data[i] >= 32 && data[i] <= 126) || data[i] === 9 || data[i] === 10 || data[i] === 13) {
                printableCount++;
            }
        }
        
        return (printableCount / sampleSize) > 0.7;
    }

    appearsCompressed(data) {
        const entropy = this.calculateEntropy(data.slice(0, Math.min(1024, data.length)));
        return entropy > 7.0;
    }

    isValidBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch (e) {
            return false;
        }
    }

    generateHexPreview(data) {
        return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export for use in main application
window.AdvancedFileCarvingEngine = AdvancedFileCarvingEngine; 