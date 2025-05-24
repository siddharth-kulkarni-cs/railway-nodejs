/**
 * Advanced File Analysis with Statistical Algorithms
 * Professional mathematical analysis and pattern detection
 * 
 * REAL FEATURES:
 * - Mathematical entropy calculation
 * - Statistical analysis (mean, median, variance, skewness, kurtosis)
 * - Markov chain analysis
 * - Autocorrelation analysis
 * - Compression algorithm detection (pattern matching)
 * - Executable binary parsing (PE/ELF headers)
 * - Database file analysis (SQLite/CSV parsing)
 * - Security vulnerability scanning (pattern matching)
 * - Code quality metrics
 * - 3D visualization data generation
 * - Web Worker parallel processing
 * 
 * NOTE: "Machine learning" and "AI" features use algorithmic heuristics
 * and statistical thresholds, not trained neural networks.
 */

class AdvancedStatisticalAnalyzer {
    constructor() {
        this.worker = null;
        this.initializeWorker();
    }

    initializeWorker() {
        try {
            // Create dedicated Web Worker for heavy computations
            const workerCode = `
                // Web Worker for intensive file analysis
                class FileAnalysisWorker {
                    constructor() {
                        this.algorithms = new Map();
                        this.initializeAlgorithms();
                    }

                    initializeAlgorithms() {
                        // Advanced compression detection algorithms
                        this.algorithms.set('lz77', this.detectLZ77.bind(this));
                        this.algorithms.set('huffman', this.detectHuffman.bind(this));
                        this.algorithms.set('deflate', this.detectDeflate.bind(this));
                    }

                    detectLZ77(data) {
                        // LZ77 sliding window compression detection - look for actual compression patterns
                        let compressionIndicators = 0;
                        const windowSize = 4096;
                        const minMatchLength = 3;
                        const sampleSize = Math.min(data.length, 5000);
                        
                        // Look for sequences that would benefit from LZ77 compression
                        for (let i = 0; i < sampleSize - minMatchLength; i++) {
                            for (let j = Math.max(0, i - windowSize); j < i - minMatchLength; j++) {
                                let matchLength = 0;
                                
                                // Count consecutive matching bytes
                                while (matchLength < minMatchLength && 
                                       i + matchLength < data.length && 
                                       data[i + matchLength] === data[j + matchLength]) {
                                    matchLength++;
                                }
                                
                                // If we found a significant match, it's a compression indicator
                                if (matchLength >= minMatchLength) {
                                    compressionIndicators++;
                                    i += matchLength - 1; // Skip ahead
                                    break;
                                }
                            }
                        }
                        
                        // Calculate realistic confidence based on compression potential
                        const compressionRatio = compressionIndicators / (sampleSize / 100);
                        const confidence = Math.min(compressionRatio, 1);
                        
                        return {
                            algorithm: 'LZ77',
                            confidence: confidence,
                            characteristics: compressionIndicators + ' repeating sequences found (' + (confidence * 100).toFixed(1) + '% compression potential)'
                        };
                    }

                    detectHuffman(data) {
                        // Huffman coding frequency analysis
                        const freq = new Map();
                        data.forEach(byte => freq.set(byte, (freq.get(byte) || 0) + 1));
                        
                        // Calculate entropy and frequency distribution
                        const entropy = this.calculateEntropy(Array.from(freq.values()));
                        const uniqueBytes = freq.size;
                        
                        return {
                            algorithm: 'Huffman',
                            confidence: entropy > 6 && uniqueBytes < 200 ? 0.8 : 0.3,
                            characteristics: \`Entropy: \${entropy.toFixed(2)}, Unique bytes: \${uniqueBytes}\`
                        };
                    }

                    detectDeflate(data) {
                        // DEFLATE header detection
                        if (data.length < 2) return { algorithm: 'DEFLATE', confidence: 0 };
                        
                        const header = (data[0] << 8) | data[1];
                        const cmf = data[0];
                        const flg = data[1];
                        
                        // Check DEFLATE magic numbers
                        const isDeflate = (cmf & 0x0F) === 8 && (header % 31) === 0;
                        
                        return {
                            algorithm: 'DEFLATE',
                            confidence: isDeflate ? 0.95 : 0.1,
                            characteristics: \`CMF: 0x\${cmf.toString(16)}, FLG: 0x\${flg.toString(16)}\`
                        };
                    }

                    calculateEntropy(frequencies) {
                        const total = frequencies.reduce((sum, f) => sum + f, 0);
                        return frequencies.reduce((entropy, freq) => {
                            if (freq === 0) return entropy;
                            const p = freq / total;
                            return entropy - p * Math.log2(p);
                        }, 0);
                    }

                    analyzeExecutable(data) {
                        const results = { type: 'unknown', architecture: 'unknown', sections: [] };
                        
                        // PE Header Analysis (Windows executables)
                        if (data.length > 64 && data[0] === 0x4D && data[1] === 0x5A) {
                            const peOffset = data[60] | (data[61] << 8) | (data[62] << 16) | (data[63] << 24);
                            
                            if (peOffset < data.length - 4 && 
                                data[peOffset] === 0x50 && data[peOffset + 1] === 0x45) {
                                
                                results.type = 'PE';
                                results.architecture = this.getPEArchitecture(data, peOffset);
                                results.sections = this.getPESections(data, peOffset);
                                results.imports = this.getPEImports(data, peOffset);
                            }
                        }
                        
                        // ELF Header Analysis (Linux executables)
                        else if (data.length > 16 && 
                                 data[0] === 0x7F && data[1] === 0x45 && 
                                 data[2] === 0x4C && data[3] === 0x46) {
                            
                            results.type = 'ELF';
                            results.architecture = this.getELFArchitecture(data);
                            results.sections = this.getELFSections(data);
                        }
                        
                        return results;
                    }

                    getPEArchitecture(data, peOffset) {
                        const machine = data[peOffset + 4] | (data[peOffset + 5] << 8);
                        const architectures = {
                            0x014c: 'i386',
                            0x8664: 'x86-64',
                            0x01c0: 'ARM',
                            0xaa64: 'ARM64'
                        };
                        return architectures[machine] || \`Unknown (0x\${machine.toString(16)})\`;
                    }

                    getPESections(data, peOffset) {
                        // Parse PE sections (simplified)
                        const sections = [];
                        const numSections = data[peOffset + 6] | (data[peOffset + 7] << 8);
                        let sectionOffset = peOffset + 24 + (data[peOffset + 20] | (data[peOffset + 21] << 8));
                        
                        for (let i = 0; i < Math.min(numSections, 10); i++) {
                            if (sectionOffset + 40 > data.length) break;
                            
                            const name = String.fromCharCode(...data.slice(sectionOffset, sectionOffset + 8))
                                .replace(/\\0/g, '');
                            const virtualSize = data[sectionOffset + 8] | 
                                             (data[sectionOffset + 9] << 8) | 
                                             (data[sectionOffset + 10] << 16) | 
                                             (data[sectionOffset + 11] << 24);
                            
                            sections.push({ name, virtualSize });
                            sectionOffset += 40;
                        }
                        
                        return sections;
                    }

                    analyzeDatabaseFile(data) {
                        const results = { type: 'unknown', tables: [], records: 0 };
                        
                        // SQLite detection
                        if (data.length > 16) {
                            const header = String.fromCharCode(...data.slice(0, 16));
                            if (header === 'SQLite format 3\\0') {
                                results.type = 'SQLite';
                                results.version = data[18] | (data[19] << 8);
                                results.pageSize = data[16] === 1 ? 65536 : (data[16] << 8) | data[17];
                                // Could parse schema tables for more detail
                            }
                        }
                        
                        // CSV detection and analysis
                        if (this.isTextFile(data)) {
                            const text = new TextDecoder().decode(data.slice(0, Math.min(10000, data.length)));
                            if (this.looksLikeCSV(text)) {
                                results.type = 'CSV';
                                results.delimiter = this.detectCSVDelimiter(text);
                                results.headers = this.getCSVHeaders(text, results.delimiter);
                                results.estimatedRows = text.split('\\n').length;
                            }
                        }
                        
                        return results;
                    }

                    isTextFile(data) {
                        // Check if file appears to be text
                        const sample = data.slice(0, Math.min(1000, data.length));
                        const textBytes = sample.filter(b => 
                            (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13
                        ).length;
                        return textBytes / sample.length > 0.8;
                    }

                    looksLikeCSV(text) {
                        const lines = text.split('\\n').slice(0, 5);
                        if (lines.length < 2) return false;
                        
                        const delimiters = [',', ';', '\\t', '|'];
                        return delimiters.some(delimiter => {
                            const counts = lines.map(line => (line.match(new RegExp(\`\\\\\${delimiter}\`, 'g')) || []).length);
                            return counts.length > 1 && counts.every(count => count === counts[0] && count > 0);
                        });
                    }

                    detectCSVDelimiter(text) {
                        const delimiters = [',', ';', '\\t', '|'];
                        const scores = delimiters.map(delimiter => ({
                            delimiter,
                            score: (text.match(new RegExp(\`\\\\\${delimiter}\`, 'g')) || []).length
                        }));
                        return scores.reduce((best, current) => 
                            current.score > best.score ? current : best
                        ).delimiter;
                    }

                    generateAdvancedStats(data) {
                        const stats = {
                            basicStats: this.calculateBasicStats(data),
                            distribution: this.analyzeDistribution(data),
                            correlation: this.calculateAutoCorrelation(data),
                            fourier: this.basicFFT(data.slice(0, 1024)), // Limited for performance
                            markov: this.analyzeMarkovChains(data)
                        };
                        
                        return stats;
                    }

                    calculateBasicStats(data) {
                        const sorted = [...data].sort((a, b) => a - b);
                        const sum = data.reduce((s, x) => s + x, 0);
                        const mean = sum / data.length;
                        const variance = data.reduce((v, x) => v + Math.pow(x - mean, 2), 0) / data.length;
                        
                        return {
                            mean: mean.toFixed(2),
                            median: sorted[Math.floor(sorted.length / 2)],
                            mode: this.calculateMode(data),
                            standardDeviation: Math.sqrt(variance).toFixed(2),
                            skewness: this.calculateSkewness(data, mean, Math.sqrt(variance)),
                            kurtosis: this.calculateKurtosis(data, mean, Math.sqrt(variance))
                        };
                    }

                    analyzeDistribution(data) {
                        const buckets = new Array(256).fill(0);
                        data.forEach(byte => buckets[byte]++);
                        
                        // Find peaks and patterns
                        const peaks = [];
                        for (let i = 1; i < 255; i++) {
                            if (buckets[i] > buckets[i-1] && buckets[i] > buckets[i+1] && buckets[i] > 10) {
                                peaks.push({ value: i, frequency: buckets[i] });
                            }
                        }
                        
                        return {
                            histogram: buckets,
                            peaks: peaks.slice(0, 10), // Top 10 peaks
                            uniformity: this.calculateUniformity(buckets),
                            sparsity: buckets.filter(b => b === 0).length / 256
                        };
                    }

                    calculateAutoCorrelation(data) {
                        // Calculate autocorrelation for detecting patterns
                        const maxLag = Math.min(100, Math.floor(data.length / 4));
                        const correlations = [];
                        
                        for (let lag = 1; lag <= maxLag; lag++) {
                            let correlation = 0;
                            const count = data.length - lag;
                            
                            for (let i = 0; i < count; i++) {
                                correlation += data[i] === data[i + lag] ? 1 : 0;
                            }
                            
                            correlations.push({
                                lag,
                                correlation: correlation / count,
                                strength: correlation / count > 0.1 ? 'Strong' : 
                                         correlation / count > 0.05 ? 'Medium' : 'Weak'
                            });
                        }
                        
                        return correlations.filter(c => c.correlation > 0.05).slice(0, 10);
                    }

                    analyzeMarkovChains(data) {
                        // Analyze byte transition patterns
                        const transitions = new Map();
                        
                        for (let i = 0; i < data.length - 1; i++) {
                            const current = data[i];
                            const next = data[i + 1];
                            const key = \`\${current}->\${next}\`;
                            
                            transitions.set(key, (transitions.get(key) || 0) + 1);
                        }
                        
                        // Find most common transitions
                        const sortedTransitions = Array.from(transitions.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 20)
                            .map(([transition, count]) => ({
                                transition,
                                count,
                                probability: (count / (data.length - 1)).toFixed(4)
                            }));
                        
                        return {
                            totalTransitions: transitions.size,
                            topTransitions: sortedTransitions,
                            entropy: this.calculateTransitionEntropy(transitions, data.length - 1)
                        };
                    }

                    calculateMode(data) {
                        const frequency = new Map();
                        data.forEach(x => frequency.set(x, (frequency.get(x) || 0) + 1));
                        return Array.from(frequency.entries())
                            .reduce((a, b) => frequency.get(a[0]) > frequency.get(b[0]) ? a : b)[0];
                    }

                    calculateSkewness(data, mean, stdDev) {
                        const n = data.length;
                        const skew = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0);
                        return ((n / ((n - 1) * (n - 2))) * skew).toFixed(3);
                    }

                    calculateKurtosis(data, mean, stdDev) {
                        const n = data.length;
                        const kurt = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0);
                        return (((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurt - 
                                (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))).toFixed(3);
                    }

                    calculateUniformity(buckets) {
                        const expected = buckets.reduce((sum, count) => sum + count, 0) / buckets.length;
                        const chiSquare = buckets.reduce((sum, observed) => 
                            sum + Math.pow(observed - expected, 2) / expected, 0
                        );
                        return { chiSquare: chiSquare.toFixed(2), isUniform: chiSquare < 293.25 }; // 95% confidence
                    }

                    calculateTransitionEntropy(transitions, total) {
                        let entropy = 0;
                        for (const count of transitions.values()) {
                            const p = count / total;
                            entropy -= p * Math.log2(p);
                        }
                        return entropy.toFixed(3);
                    }
                }

                const worker = new FileAnalysisWorker();

                self.onmessage = function(e) {
                    const { type, data, options } = e.data;
                    
                    try {
                        let result;
                        
                        switch (type) {
                            case 'compression':
                                result = {
                                    lz77: worker.algorithms.get('lz77')(data),
                                    huffman: worker.algorithms.get('huffman')(data),
                                    deflate: worker.algorithms.get('deflate')(data)
                                };
                                break;
                                
                            case 'executable':
                                result = worker.analyzeExecutable(data);
                                break;
                                
                            case 'database':
                                result = worker.analyzeDatabaseFile(data);
                                break;
                                
                            case 'statistics':
                                result = worker.generateAdvancedStats(data);
                                break;
                                
                            default:
                                result = { error: 'Unknown analysis type' };
                        }
                        
                        self.postMessage({ type, result, success: true });
                    } catch (error) {
                        self.postMessage({ type, error: error.message, success: false });
                    }
                };
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
        } catch (error) {
            console.error('Error initializing Web Worker:', error);
        }
    }

    /**
     * Perform comprehensive statistical and algorithmic analysis
     * @param {File} file - File to analyze
     * @returns {Promise<Object>} - Analysis results
     */
    async performAdvancedAnalysis(file) {
        const startTime = performance.now();
        const results = {};

        try {
            // Get raw file data for analysis
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);

            // Run multiple analysis types in parallel using Web Worker
            const analyses = [
                this.analyzeCompression(data),
                this.analyzeExecutable(data),
                this.analyzeDatabase(data),
                this.generateAdvancedStatistics(data),
                this.performStatisticalAnalysis(data, file.type),
                this.generate3DVisualizationData(data),
                this.analyzeCodeQuality(file, data)
            ];

            const [compression, executable, database, statistics, mlAnalysis, visualization, codeQuality] = 
                await Promise.all(analyses);

            return {
                compression,
                executable,
                database,
                statistics,
                mlAnalysis,
                visualization,
                codeQuality,
                processingTime: performance.now() - startTime
            };

        } catch (error) {
            return { error: error.message };
        }
    }

    analyzeCompression(data) {
        return new Promise((resolve) => {
            if (!this.worker) {
                console.warn('Web Worker not initialized, using fallback analysis');
                resolve({
                    lz77: { algorithm: 'LZ77', confidence: 0.1, characteristics: 'Worker not available' },
                    huffman: { algorithm: 'Huffman', confidence: 0.1, characteristics: 'Worker not available' },
                    deflate: { algorithm: 'DEFLATE', confidence: 0.1, characteristics: 'Worker not available' }
                });
                return;
            }
            
            this.worker.postMessage({ type: 'compression', data: Array.from(data.slice(0, 10000)) });
            
            const handler = (e) => {
                if (e.data.type === 'compression') {
                    this.worker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            this.worker.addEventListener('message', handler);
        });
    }

    analyzeExecutable(data) {
        return new Promise((resolve) => {
            if (!this.worker) {
                console.warn('Web Worker not initialized, using basic analysis');
                resolve({ type: 'unknown', architecture: 'unknown', sections: [] });
                return;
            }
            
            this.worker.postMessage({ type: 'executable', data: Array.from(data.slice(0, 50000)) });
            
            const handler = (e) => {
                if (e.data.type === 'executable') {
                    this.worker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            this.worker.addEventListener('message', handler);
        });
    }

    analyzeDatabase(data) {
        return new Promise((resolve) => {
            if (!this.worker) {
                console.warn('Web Worker not initialized, using basic analysis');
                resolve({ type: 'unknown', tables: [], records: 0 });
                return;
            }
            
            this.worker.postMessage({ type: 'database', data: Array.from(data.slice(0, 20000)) });
            
            const handler = (e) => {
                if (e.data.type === 'database') {
                    this.worker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            this.worker.addEventListener('message', handler);
        });
    }

    generateAdvancedStatistics(data) {
        return new Promise((resolve) => {
            if (!this.worker) {
                console.warn('Web Worker not initialized, using basic statistics');
                resolve({
                    basicStats: { mean: '0', median: 0, standardDeviation: '0', skewness: '0', kurtosis: '0' },
                    distribution: { peaks: [], uniformity: { isUniform: false, chiSquare: '0' }, sparsity: 0 },
                    correlation: [],
                    markov: { totalTransitions: 0, topTransitions: [], entropy: '0' }
                });
                return;
            }
            
            this.worker.postMessage({ type: 'statistics', data: Array.from(data.slice(0, 5000)) });
            
            const handler = (e) => {
                if (e.data.type === 'statistics') {
                    this.worker.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            this.worker.addEventListener('message', handler);
        });
    }

    async performStatisticalAnalysis(data, fileType) {
        // Statistical analysis using mathematical algorithms (not trained ML models)
        const features = this.extractStatisticalFeatures(data);
        
        return {
            fileClassification: await this.classifyFileUsingHeuristics(features, fileType),
            anomalyDetection: this.detectAnomalies(features),
            patternRecognition: this.recognizePatterns(data),
            similarity: this.calculateSimilarityFingerprint(data)
        };
    }

    extractStatisticalFeatures(data) {
        // Extract mathematical features for statistical analysis
        const sampleSize = Math.min(1000, data.length);
        const sample = data.slice(0, sampleSize);
        
        return {
            byteFrequency: this.calculateByteFrequency(sample),
            nGrams: this.calculateNGrams(sample, 2),
            entropy: this.calculateShannonEntropy(sample),
            variance: this.calculateVariance(sample),
            autocorrelation: this.calculateSimpleAutocorrelation(sample)
        };
    }

    async classifyFileUsingHeuristics(features, declaredType) {
        // Algorithmic classification using statistical thresholds (not ML)
        const classifications = {
            'text': ['source-code', 'document', 'configuration', 'log'],
            'image': ['photograph', 'diagram', 'screenshot', 'artwork'],
            'audio': ['music', 'speech', 'effects', 'ambient'],
            'video': ['movie', 'animation', 'recording', 'tutorial'],
            'application': ['executable', 'library', 'archive', 'installer']
        };
        
        // Determine category from MIME type or statistical features
        let category = Object.keys(classifications).find(cat => 
            declaredType.startsWith(cat)) || 'unknown';
        
        // If we couldn't determine from MIME type, use statistical analysis
        if (category === 'unknown') {
            // Calculate printable ratio to detect text files
            const printableRatio = this.calculatePrintableRatio(features.byteFrequency);
            
            if (printableRatio > 0.8) {
                category = 'text';
            } else if (features.entropy > 7.5) {
                category = 'application'; // Likely compressed/encrypted
            } else if (features.entropy < 2) {
                category = 'application'; // Likely structured binary
            } else {
                category = 'application'; // Default for unknown
            }
        }
        
        // Use statistical features to determine subtype
        let predictedSubType = 'unknown';
        let confidence = 0.5;
        
        if (category === 'text') {
            if (features.entropy > 5) {
                predictedSubType = 'source-code';
                confidence = 0.8;
            } else {
                predictedSubType = 'document';
                confidence = 0.7;
            }
        } else if (category === 'application') {
            if (features.entropy > 7) {
                predictedSubType = 'archive';
                confidence = 0.9;
            } else if (features.entropy < 3) {
                predictedSubType = 'library';
                confidence = 0.6;
            } else {
                predictedSubType = 'executable';
                confidence = 0.6;
            }
        } else {
            const subTypes = classifications[category] || ['unknown'];
            predictedSubType = subTypes[0];  // Use first as default
        }
        
        return {
            category,
            subType: predictedSubType,
            confidence,
            reasoning: 'Statistical analysis: entropy=' + features.entropy.toFixed(2) + ', variance=' + features.variance.toFixed(0) + ', category=' + category
        };
    }

    calculatePrintableRatio(byteFrequency) {
        // Calculate ratio of printable ASCII characters
        let printableCount = 0;
        let totalCount = 0;
        
        Object.entries(byteFrequency).forEach(([byte, frequency]) => {
            const byteValue = parseInt(byte);
            totalCount += frequency;
            
            // Printable ASCII: 32-126, plus common whitespace: 9,10,13
            if ((byteValue >= 32 && byteValue <= 126) || 
                byteValue === 9 || byteValue === 10 || byteValue === 13) {
                printableCount += frequency;
            }
        });
        
        return totalCount > 0 ? printableCount / totalCount : 0;
    }

    async generate3DVisualizationData(data) {
        // Generate meaningful structural analysis for the file
        const blockSize = 1024; // 1KB blocks
        const blocks = [];
        
        for (let i = 0; i < data.length; i += blockSize) {
            const block = data.slice(i, Math.min(i + blockSize, data.length));
            const entropy = this.calculateEntropy(block);
            const nullRatio = block.filter(b => b === 0).length / block.length;
            
            // Determine block type based on characteristics
            let type = 'data';
            if (nullRatio > 0.8) {
                type = 'sparse';  // Mostly zeros/padding
            } else if (entropy > 7.5) {
                type = 'encrypted';  // Very high entropy
            }
            
            blocks.push({
                offset: i,
                size: block.length,
                entropy: entropy / 8, // Normalize to 0-1
                type: type
            });
        }
        
        // Generate entropy map with meaningful regions
        const entropyMap = {
            width: Math.min(Math.ceil(Math.sqrt(blocks.length)), 32),
            height: Math.min(Math.ceil(blocks.length / 32), 32),
            data: blocks.map((block, index) => ({
                x: index % 32,
                y: Math.floor(index / 32),
                entropy: block.entropy,
                color: this.getEntropyColor(block.entropy)
            }))
        };
        
        // Generate byte distribution focused on forensic significance
        const byteDistribution3D = this.generateForensicByteDistribution(data);
        
        return {
            structuralLayout: { blocks },
            entropyMap,
            byteDistribution3D
        };
    }

    generateForensicByteDistribution(data) {
        const distribution = new Array(256).fill(0);
        const sampleSize = Math.min(data.length, 10000);
        
        // Count byte frequencies
        for (let i = 0; i < sampleSize; i++) {
            distribution[data[i]]++;
        }
        
        // Create 3D representation focusing on significant bytes
        const result = [];
        for (let i = 0; i < 256; i++) {
            const frequency = distribution[i] / sampleSize;
            if (frequency > 0.001) { // Only include significant frequencies
                result.push({
                    x: i % 16,
                    z: Math.floor(i / 16),
                    y: frequency,
                    byte: i,
                    frequency: frequency,
                    color: this.getByteColor(i, frequency)
                });
            }
        }
        
        return result;
    }
    
    getEntropyColor(entropy) {
        // Return meaningful colors for entropy levels
        if (entropy < 0.3) return '#3498db';     // Blue - structured
        if (entropy < 0.7) return '#f39c12';    // Orange - mixed
        return '#e74c3c';                       // Red - high entropy
    }
    
    getByteColor(byteValue, frequency) {
        // Color based on byte significance
        if (byteValue === 0) return [0.2, 0.6, 1.0];      // Blue for null bytes
        if (byteValue >= 32 && byteValue <= 126) return [0.2, 0.8, 0.2]; // Green for printable
        if (frequency > 0.1) return [1.0, 0.2, 0.2];      // Red for frequent non-printable
        return [0.8, 0.8, 0.8];                           // Gray for others
    }

    async analyzeCodeQuality(file, data) {
        if (!this.isSourceCodeFile(file.name)) {
            return { applicable: false, reason: 'Not a source code file' };
        }
        
        try {
            const text = new TextDecoder().decode(data);
            const language = this.detectProgrammingLanguage(file.name);
            
            return {
                language,
                metrics: this.calculateCodeMetrics(text, language),
                complexity: this.calculateCyclomaticComplexity(text, language),
                security: this.scanSecurityIssues(text, language),
                style: this.analyzeCodeStyle(text, language)
            };
        } catch (error) {
            return { error: 'Could not analyze as text file' };
        }
    }

    calculateCodeMetrics(text, language) {
        const lines = text.split('\n');
        
        return {
            totalLines: lines.length,
            codeLines: lines.filter(line => line.trim() && !this.isComment(line, language)).length,
            commentLines: lines.filter(line => this.isComment(line, language)).length,
            blankLines: lines.filter(line => !line.trim()).length,
            averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
            longestLine: Math.max(...lines.map(line => line.length)),
            functions: this.countFunctions(text, language),
            classes: this.countClasses(text, language)
        };
    }

    scanSecurityIssues(text, language) {
        const issues = [];
        const patterns = this.getSecurityPatterns(language);
        
        patterns.forEach(pattern => {
            const matches = text.match(pattern.regex);
            if (matches) {
                issues.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    description: pattern.description,
                    occurrences: matches.length
                });
            }
        });
        
        return {
            totalIssues: issues.length,
            highSeverity: issues.filter(i => i.severity === 'high').length,
            mediumSeverity: issues.filter(i => i.severity === 'medium').length,
            lowSeverity: issues.filter(i => i.severity === 'low').length,
            issues: issues.slice(0, 10) // Top 10 issues
        };
    }

    getSecurityPatterns(language) {
        const commonPatterns = [
            { type: 'sql-injection', regex: /(?:SELECT|INSERT|UPDATE|DELETE).*?(?:WHERE|SET).*?['"][^'"]*['"].*?\+/gi, severity: 'high', description: 'Potential SQL injection vulnerability' },
            { type: 'hardcoded-password', regex: /(?:password|pwd|pass)\s*=\s*['"][^'"]+['"]/gi, severity: 'high', description: 'Hardcoded password detected' },
            { type: 'debug-code', regex: /(?:console\.log|print|echo|var_dump)\s*\(/gi, severity: 'low', description: 'Debug code in production' },
            { type: 'todo-fixme', regex: /(?:TODO|FIXME|HACK|XXX):/gi, severity: 'low', description: 'Unfinished code markers' }
        ];
        
        const languagePatterns = {
            'javascript': [
                { type: 'eval-usage', regex: /\beval\s*\(/gi, severity: 'high', description: 'Use of eval() function' },
                { type: 'innerHTML', regex: /\.innerHTML\s*=/gi, severity: 'medium', description: 'XSS risk with innerHTML' }
            ],
            'python': [
                { type: 'exec-usage', regex: /\bexec\s*\(/gi, severity: 'high', description: 'Use of exec() function' },
                { type: 'pickle-usage', regex: /pickle\.loads?\s*\(/gi, severity: 'medium', description: 'Unsafe pickle usage' }
            ]
        };
        
        return [...commonPatterns, ...(languagePatterns[language] || [])];
    }

    // Helper methods for various calculations
    calculateByteFrequency(data) {
        const freq = {};
        data.forEach(byte => freq[byte] = (freq[byte] || 0) + 1);
        
        // Normalize frequencies
        Object.keys(freq).forEach(byte => freq[byte] /= data.length);
        return freq;
    }

    calculateNGrams(data, n) {
        const ngrams = {};
        for (let i = 0; i <= data.length - n; i++) {
            const gram = Array.from(data.slice(i, i + n)).join(',');
            ngrams[gram] = (ngrams[gram] || 0) + 1;
        }
        return ngrams;
    }

    calculateShannonEntropy(data) {
        const freq = {};
        data.forEach(byte => freq[byte] = (freq[byte] || 0) + 1);
        
        let entropy = 0;
        Object.values(freq).forEach(count => {
            const p = count / data.length;
            entropy -= p * Math.log2(p);
        });
        
        return entropy;
    }

    entropyToColor(entropy) {
        // Convert entropy (0-1) to RGB color
        const hue = (1 - entropy) * 240; // Blue to Red
        return 'hsl(' + hue + ', 100%, 50%)';
    }

    isSourceCodeFile(filename) {
        const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'];
        return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    detectProgrammingLanguage(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        const langMap = {
            'js': 'javascript', 'ts': 'typescript', 'py': 'python',
            'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
            'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust'
        };
        return langMap[ext] || 'unknown';
    }

    isComment(line, language) {
        const trimmed = line.trim();
        const commentPrefixes = {
            'javascript': ['//', '/*', '*'],
            'python': ['#'],
            'java': ['//', '/*', '*'],
            'cpp': ['//', '/*', '*'],
            'c': ['//', '/*', '*']
        };
        
        const prefixes = commentPrefixes[language] || ['//'];
        return prefixes.some(prefix => trimmed.startsWith(prefix));
    }

    countFunctions(text, language) {
        const patterns = {
            'javascript': /function\s+\w+|=>\s*{|\w+\s*:\s*function/g,
            'python': /def\s+\w+/g,
            'java': /(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/g,
            'cpp': /\w+\s+\w+\s*\([^)]*\)\s*{/g
        };
        
        const pattern = patterns[language] || patterns['javascript'];
        return (text.match(pattern) || []).length;
    }

    countClasses(text, language) {
        const patterns = {
            'javascript': /class\s+\w+/g,
            'python': /class\s+\w+/g,
            'java': /(public|private)?\s*class\s+\w+/g,
            'cpp': /class\s+\w+/g
        };
        
        const pattern = patterns[language] || patterns['javascript'];
        return (text.match(pattern) || []).length;
    }

    // Additional helper methods
    calculateVariance(data) {
        const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
        return variance;
    }
    
    calculateSimpleAutocorrelation(data) {
        const correlations = [];
        const maxLag = Math.min(20, Math.floor(data.length / 4));
        
        for (let lag = 1; lag <= maxLag; lag++) {
            let correlation = 0;
            const count = data.length - lag;
            
            for (let i = 0; i < count; i++) {
                correlation += data[i] === data[i + lag] ? 1 : 0;
            }
            
            correlations.push(correlation / count);
        }
        
        return correlations;
    }
    
    calculateSimilarityFingerprint(data) {
        // Create a similarity fingerprint for file comparison
        const sampleSize = Math.min(256, data.length);
        const sample = data.slice(0, sampleSize);
        
        const fingerprint = {
            size: data.length,
            entropy: this.calculateShannonEntropy(sample),
            byteFreqHash: this.hashByteFrequencies(sample),
            structuralHash: this.hashStructuralFeatures(sample)
        };
        
        return fingerprint;
    }
    
    hashByteFrequencies(data) {
        const freq = this.calculateByteFrequency(data);
        // Simple hash of frequency distribution
        let hash = 0;
        Object.values(freq).forEach((f, i) => {
            hash += f * (i + 1);
        });
        return hash.toFixed(6);
    }
    
    hashStructuralFeatures(data) {
        // Hash based on structural patterns
        let hash = 0;
        for (let i = 0; i < Math.min(data.length - 1, 100); i++) {
            hash += data[i] * data[i + 1] * (i + 1);
        }
        return (hash % 1000000).toString();
    }
    
    findStructuralMarkers(data) {
        // Find structural markers in file data
        const markers = [];
        const commonMarkers = [
            { pattern: [0x00, 0x00, 0x00, 0x00], name: 'Null Block' },
            { pattern: [0xFF, 0xFF, 0xFF, 0xFF], name: 'Fill Block' },
            { pattern: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Header' },
            { pattern: [0x4D, 0x5A], name: 'PE Header' }
        ];
        
        commonMarkers.forEach(marker => {
            const matches = this.findSignatureMatches(data, marker.pattern);
            if (matches.length > 0) {
                markers.push({
                    name: marker.name,
                    pattern: marker.pattern,
                    occurrences: matches.length,
                    positions: matches.slice(0, 5) // First 5 positions
                });
            }
        });
        
        return markers;
    }
    
    findSignatureMatches(data, signature) {
        const matches = [];
        
        for (let i = 0; i <= data.length - signature.length; i++) {
            let found = true;
            for (let j = 0; j < signature.length; j++) {
                if (data[i + j] !== signature[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                matches.push(i);
            }
        }
        
        return matches;
    }
    
    generateStructuralLayout(data) {
        // Generate structural layout for visualization
        const blockSize = 1024;
        const blocks = [];
        
        for (let i = 0; i < data.length; i += blockSize) {
            const block = data.slice(i, i + blockSize);
            const entropy = this.calculateShannonEntropy(block);
            const nullRatio = block.filter(b => b === 0).length / block.length;
            
            blocks.push({
                offset: i,
                size: block.length,
                entropy,
                type: entropy < 2 ? 'sparse' : entropy > 7 ? 'encrypted' : 'data',
                nullRatio
            });
        }
        
        return {
            totalBlocks: blocks.length,
            blocks: blocks.slice(0, 100), // Limit for performance
            summary: {
                sparse: blocks.filter(b => b.type === 'sparse').length,
                data: blocks.filter(b => b.type === 'data').length,
                encrypted: blocks.filter(b => b.type === 'encrypted').length
            }
        };
    }
    
    calculateCyclomaticComplexity(text, language) {
        // Calculate cyclomatic complexity for code
        const complexityKeywords = {
            'javascript': /\b(if|else|for|while|do|switch|case|catch|&&|\|\||\?)\b/g,
            'python': /\b(if|elif|else|for|while|try|except|and|or)\b/g,
            'java': /\b(if|else|for|while|do|switch|case|catch|&&|\|\||\?)\b/g,
            'cpp': /\b(if|else|for|while|do|switch|case|catch|&&|\|\||\?)\b/g
        };
        
        const pattern = complexityKeywords[language] || complexityKeywords['javascript'];
        const matches = text.match(pattern) || [];
        
        return {
            complexity: matches.length + 1, // Base complexity of 1
            level: matches.length < 10 ? 'Low' : 
                   matches.length < 20 ? 'Medium' : 
                   matches.length < 50 ? 'High' : 'Very High',
            details: {
                decisionPoints: matches.length,
                estimatedPaths: Math.pow(2, Math.min(matches.length, 10))
            }
        };
    }
    
    analyzeCodeStyle(text, language) {
        const lines = text.split('\n');
        
        return {
            indentation: this.analyzeIndentation(lines),
            naming: this.analyzeNamingConventions(text, language),
            structure: this.analyzeCodeStructure(text, language),
            readability: this.calculateReadabilityScore(text)
        };
    }
    
    analyzeIndentation(lines) {
        const indentations = lines
            .filter(line => line.trim().length > 0)
            .map(line => line.match(/^\s*/)[0].length);
        
        const spaces = indentations.filter(i => i > 0);
        const avgIndent = spaces.length > 0 ? spaces.reduce((sum, i) => sum + i, 0) / spaces.length : 0;
        
        return {
            style: avgIndent % 4 === 0 ? '4-space' : avgIndent % 2 === 0 ? '2-space' : 'mixed',
            consistency: this.calculateConsistency(indentations),
            averageDepth: avgIndent / (avgIndent % 4 === 0 ? 4 : 2)
        };
    }
    
    analyzeNamingConventions(text, language) {
        const patterns = {
            camelCase: /\b[a-z][a-zA-Z0-9]*\b/g,
            PascalCase: /\b[A-Z][a-zA-Z0-9]*\b/g,
            snake_case: /\b[a-z]+(?:_[a-z]+)*\b/g,
            SCREAMING_SNAKE: /\b[A-Z]+(?:_[A-Z]+)*\b/g
        };
        
        const results = {};
        Object.entries(patterns).forEach(([style, pattern]) => {
            results[style] = (text.match(pattern) || []).length;
        });
        
        const total = Object.values(results).reduce((sum, count) => sum + count, 0);
        const dominant = Object.entries(results).reduce((max, [style, count]) => 
            count > max.count ? { style, count } : max, { style: 'unknown', count: 0 });
        
        return {
            conventions: results,
            dominantStyle: dominant.style,
            consistency: total > 0 ? (dominant.count / total * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    analyzeCodeStructure(text, language) {
        const functions = this.countFunctions(text, language);
        const classes = this.countClasses(text, language);
        const lines = text.split('\n').length;
        
        return {
            functionsPerClass: classes > 0 ? (functions / classes).toFixed(1) : 'N/A',
            linesPerFunction: functions > 0 ? (lines / functions).toFixed(1) : 'N/A',
            structureScore: this.calculateStructureScore(functions, classes, lines)
        };
    }
    
    calculateReadabilityScore(text) {
        const lines = text.split('\n');
        const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
        const complexity = (text.match(/[{}()\[\]]/g) || []).length;
        
        let score = 100;
        if (avgLineLength > 120) score -= 20;
        if (complexity / text.length > 0.05) score -= 15;
        
        return {
            score: Math.max(0, score),
            level: score > 80 ? 'Excellent' : score > 60 ? 'Good' : score > 40 ? 'Fair' : 'Poor',
            factors: {
                averageLineLength: avgLineLength.toFixed(1),
                complexityRatio: (complexity / text.length * 100).toFixed(2) + '%'
            }
        };
    }
    
    calculateConsistency(values) {
        if (values.length === 0) return 100;
        
        const uniqueValues = [...new Set(values)];
        return ((values.length - uniqueValues.length + 1) / values.length * 100).toFixed(1) + '%';
    }
    
    calculateStructureScore(functions, classes, lines) {
        let score = 50; // Base score
        
        // Prefer moderate function/class counts
        if (functions > 0 && functions < lines / 20) score += 20;
        if (classes > 0 && classes < functions / 5) score += 15;
        if (lines / functions < 50 && lines / functions > 5) score += 15;
        
        return Math.min(100, score);
    }

    detectAnomalies(features) {
        // Statistical anomaly detection using mathematical thresholds
        const anomalies = [];
        
        if (features.entropy < 1) {
            anomalies.push({ 
                type: 'low-entropy', 
                severity: 'medium', 
                description: 'Unusually low entropy suggests highly repetitive data' 
            });
        }
        
        if (features.entropy > 7.8) {
            anomalies.push({ 
                type: 'high-entropy', 
                severity: 'high', 
                description: 'Very high entropy suggests encryption or compression' 
            });
        }
        
        // Check for unusual byte frequency patterns
        const maxFreq = Math.max(...Object.values(features.byteFrequency));
        if (maxFreq > 0.5) {
            anomalies.push({ 
                type: 'byte-dominance', 
                severity: 'medium', 
                description: 'Single byte value dominates file (' + (maxFreq * 100).toFixed(1) + '%)'
            });
        }
        
        return {
            count: anomalies.length,
            anomalies,
            riskLevel: anomalies.some(a => a.severity === 'high') ? 'HIGH' : 
                      anomalies.some(a => a.severity === 'medium') ? 'MEDIUM' : 'LOW'
        };
    }
    
    recognizePatterns(data) {
        // Mathematical pattern recognition
        const patterns = {
            repeatingSequences: this.findRepeatingSequences(data),
            periodicPatterns: this.findPeriodicPatterns(data),
            structuralMarkers: this.findStructuralMarkers(data)
        };
        
        return patterns;
    }
    
    findRepeatingSequences(data) {
        const sequences = new Map();
        const minLength = 4;
        const maxLength = 16;
        
        for (let len = minLength; len <= maxLength; len++) {
            for (let i = 0; i <= data.length - len; i += len) {
                const sequence = Array.from(data.slice(i, i + len)).join(',');
                sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
            }
        }
        
        return Array.from(sequences.entries())
            .filter(([seq, count]) => count > 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sequence, count]) => ({
                pattern: sequence.split(',').map(x => parseInt(x)),
                occurrences: count,
                length: sequence.split(',').length
            }));
    }
    
    findPeriodicPatterns(data) {
        // Look for periodic patterns using autocorrelation
        const patterns = [];
        const maxPeriod = Math.min(256, Math.floor(data.length / 4));
        
        for (let period = 2; period <= maxPeriod; period++) {
            let matches = 0;
            const maxChecks = Math.min(1000, Math.floor(data.length / period));
            
            for (let i = 0; i < maxChecks; i++) {
                if (data[i] === data[i + period]) matches++;
            }
            
            const correlation = matches / maxChecks;
            if (correlation > 0.7) {
                patterns.push({
                    period,
                    correlation: correlation.toFixed(3),
                    strength: correlation > 0.9 ? 'Very Strong' : 
                             correlation > 0.8 ? 'Strong' : 'Moderate'
                });
            }
        }
        
        return patterns.slice(0, 5);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedStatisticalAnalyzer };
} 