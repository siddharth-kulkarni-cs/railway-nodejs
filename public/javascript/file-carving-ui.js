/**
 * File Carving UI Component
 * Creates stunning visualizations for carved files and forensic analysis results
 */

class FileCarvingUI {
    constructor() {
        this.downloadQueue = new Map();
        this.selectedFiles = new Set();
    }

    /**
     * Render the complete file carving results
     */
    renderCarvingResults(results, container) {
        container.innerHTML = '';
        
        // Create main container
        const mainContainer = document.createElement('div');
        mainContainer.className = 'file-carving-results mt-4';
        
        // Header with statistics
        mainContainer.appendChild(this.createStatisticsHeader(results));
        
        // Forensic timeline
        if (results.forensicTimeline.length > 0) {
            mainContainer.appendChild(this.createForensicTimeline(results.forensicTimeline));
        }
        
        // Carved files gallery
        if (results.carvedFiles.length > 0) {
            mainContainer.appendChild(this.createCarvedFilesGallery(results.carvedFiles));
        }
        
        // Polyglot analysis
        if (results.polyglotAnalysis.isPolyglot) {
            mainContainer.appendChild(this.createPolyglotAnalysis(results.polyglotAnalysis));
        }
        
        // Overlay data analysis
        if (results.overlayData) {
            mainContainer.appendChild(this.createOverlayAnalysis(results.overlayData));
        }
        
        // Hidden data analysis
        if (results.hiddenData && Object.keys(results.hiddenData).length > 0) {
            mainContainer.appendChild(this.createHiddenDataAnalysis(results.hiddenData));
        }
        
        // File structure visualization
        mainContainer.appendChild(this.createFileStructureVisualization(results));
        
        container.appendChild(mainContainer);
    }

    /**
     * Create statistics header
     */
    createStatisticsHeader(results) {
        const header = document.createElement('div');
        header.className = 'card mb-4';
        
        const processingTime = results.statistics.processingTime.toFixed(2);
        const dataRecoveredMB = (results.statistics.dataRecovered / (1024 * 1024)).toFixed(2);
        
        header.innerHTML = `
            <div class="card-header bg-dark text-white">
                <h3 class="mb-0">
                    <i class="fas fa-search-plus mr-2"></i>
                    File Carving & Forensic Analysis Complete
                    <span class="badge badge-success ml-2">${results.statistics.filesCarved} files carved</span>
                </h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <div class="stat-box text-center p-3 border rounded">
                            <h4 class="text-primary">${results.statistics.totalScanned.toLocaleString()}</h4>
                            <small class="text-muted">Bytes Scanned</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-box text-center p-3 border rounded">
                            <h4 class="text-success">${results.statistics.filesCarved}</h4>
                            <small class="text-muted">Files Carved</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-box text-center p-3 border rounded">
                            <h4 class="text-info">${dataRecoveredMB} MB</h4>
                            <small class="text-muted">Data Recovered</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-box text-center p-3 border rounded">
                            <h4 class="text-warning">${processingTime}ms</h4>
                            <small class="text-muted">Processing Time</small>
                        </div>
                    </div>
                </div>
                
                ${results.statistics.filesCarved > 0 ? `
                    <div class="mt-3 text-center">
                        <button class="btn btn-primary btn-lg" onclick="fileCarvingUI.downloadAllCarvedFiles()">
                            <i class="fas fa-download mr-2"></i>
                            Download All Carved Files (${results.statistics.filesCarved} files)
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        return header;
    }

    /**
     * Create forensic timeline
     */
    createForensicTimeline(timeline) {
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        container.innerHTML = `
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">
                    <i class="fas fa-clock mr-2"></i>
                    Forensic Analysis Timeline
                    <span class="badge badge-light ml-2">${timeline.length} events</span>
                </h5>
            </div>
            <div class="card-body p-0">
                <div class="timeline-container" style="max-height: 300px; overflow-y: auto;">
                    ${timeline.map((entry, index) => `
                        <div class="timeline-entry p-3 border-bottom ${index % 2 === 0 ? 'bg-light' : ''}">
                            <div class="d-flex align-items-center">
                                <div class="timeline-icon mr-3">
                                    <i class="fas fa-${this.getTimelineIcon(entry.event)} text-primary"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-1 text-primary">${entry.event}</h6>
                                    <p class="mb-1">${entry.description}</p>
                                    <small class="text-muted">${new Date(entry.timestamp).toLocaleTimeString()}</small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        return container;
    }

    /**
     * Get appropriate icon for timeline events
     */
    getTimelineIcon(event) {
        const icons = {
            'Analysis Started': 'play',
            'File Carved': 'file-archive',
            'Polyglot Detected': 'exclamation-triangle',
            'Overlay Data Found': 'search',
            'Hidden Data Detected': 'eye-slash',
            'File Gaps Detected': 'minus-circle',
            'Analysis Complete': 'check-circle'
        };
        return icons[event] || 'info-circle';
    }

    /**
     * Create carved files gallery
     */
    createCarvedFilesGallery(carvedFiles) {
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        container.innerHTML = `
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">
                    <i class="fas fa-archive mr-2"></i>
                    Carved Files Gallery
                    <span class="badge badge-light ml-2">${carvedFiles.length} files</span>
                </h5>
            </div>
            <div class="card-body p-0">
                <div class="row no-gutters">
                    ${carvedFiles.map(file => this.createCarvedFileCard(file)).join('')}
                </div>
            </div>
        `;
        
        return container;
    }

    /**
     * Create individual carved file card
     */
    createCarvedFileCard(file) {
        const confidenceClass = file.confidence >= 80 ? 'success' : file.confidence >= 60 ? 'warning' : 'danger';
        const isImage = ['jpg', 'png', 'gif', 'bmp', 'webp'].includes(file.extension);
        
        return `
            <div class="col-md-6 col-lg-4 p-3 border-right border-bottom">
                <div class="carved-file-card h-100">
                    <div class="d-flex align-items-center mb-2">
                        <div class="file-icon mr-3">
                            <i class="fas fa-${this.getFileIcon(file.extension)} fa-2x text-${this.getFileColor(file.extension)}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${file.description}</h6>
                            <small class="text-muted">${file.type}</small>
                        </div>
                        <div class="confidence-badge">
                            <span class="badge badge-${confidenceClass}">${file.confidence}%</span>
                        </div>
                    </div>
                    
                    <div class="file-details mb-3">
                        <div class="row text-sm">
                            <div class="col-6">
                                <strong>Offset:</strong><br>
                                <code>0x${file.offset.toString(16).toUpperCase()}</code>
                            </div>
                            <div class="col-6">
                                <strong>Size:</strong><br>
                                ${this.formatFileSize(file.size)}
                            </div>
                        </div>
                    </div>
                    
                    ${isImage ? this.createImagePreview(file) : ''}
                    
                    <div class="hex-preview mb-3">
                        <strong>Hex Preview:</strong>
                        <code class="d-block small text-break" style="font-size: 10px;">${file.hexPreview}</code>
                    </div>
                    
                    ${file.metadata ? this.createMetadataPreview(file.metadata) : ''}
                    
                    <div class="file-actions">
                        <button class="btn btn-primary btn-sm" onclick="fileCarvingUI.downloadCarvedFile('${file.id}')">
                            <i class="fas fa-download mr-1"></i>Download
                        </button>
                        <button class="btn btn-info btn-sm" onclick="fileCarvingUI.showFileDetails('${file.id}')">
                            <i class="fas fa-info-circle mr-1"></i>Details
                        </button>
                        ${isImage ? `
                            <button class="btn btn-secondary btn-sm" onclick="fileCarvingUI.previewImage('${file.id}')">
                                <i class="fas fa-eye mr-1"></i>Preview
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create image preview for image files
     */
    createImagePreview(file) {
        try {
            const blob = new Blob([file.data], { type: `image/${file.extension}` });
            const url = URL.createObjectURL(blob);
            
            // Store for cleanup later
            this.downloadQueue.set(file.id, { blob, url, filename: `carved_${file.id}.${file.extension}` });
            
            return `
                <div class="image-preview mb-3">
                    <img src="${url}" alt="Carved image preview" class="img-fluid rounded" style="max-height: 120px; max-width: 100%;">
                </div>
            `;
        } catch (e) {
            return '<div class="text-muted small mb-3">Image preview unavailable</div>';
        }
    }

    /**
     * Create metadata preview
     */
    createMetadataPreview(metadata) {
        let preview = '<div class="metadata-preview"><strong>Metadata:</strong><br>';
        
        if (metadata.entropy !== undefined) {
            preview += `<small>Entropy: ${metadata.entropy.toFixed(2)}</small><br>`;
        }
        if (metadata.hasStrings !== undefined) {
            preview += `<small>Has Strings: ${metadata.hasStrings ? 'Yes' : 'No'}</small><br>`;
        }
        if (metadata.isCompressed !== undefined) {
            preview += `<small>Compressed: ${metadata.isCompressed ? 'Yes' : 'No'}</small><br>`;
        }
        
        // Format-specific metadata
        if (metadata.jpeg && metadata.jpeg.segments) {
            preview += `<small>JPEG Segments: ${metadata.jpeg.segments.length}</small><br>`;
        }
        if (metadata.png && metadata.png.chunks) {
            preview += `<small>PNG Chunks: ${metadata.png.chunks.length}</small><br>`;
        }
        if (metadata.zip && metadata.zip.files) {
            preview += `<small>ZIP Files: ${metadata.zip.files.length}</small><br>`;
        }
        
        preview += '</div>';
        return preview;
    }

    /**
     * Create polyglot analysis display
     */
    createPolyglotAnalysis(analysis) {
        const riskClass = analysis.riskLevel === 'HIGH' ? 'danger' : 'warning';
        
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        container.innerHTML = `
            <div class="card-header bg-${riskClass} text-white">
                <h5 class="mb-0">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Polyglot File Detection
                    <span class="badge badge-light ml-2">${analysis.riskLevel} RISK</span>
                </h5>
            </div>
            <div class="card-body">
                <div class="alert alert-${riskClass}">
                    <strong>⚠️ Security Warning:</strong> ${analysis.analysis}
                </div>
                <h6>Detected File Types:</h6>
                <ul>
                    ${analysis.detectedTypes.map(type => `<li><code>${type}</code></li>`).join('')}
                </ul>
                <div class="alert alert-info">
                    <strong>Recommendation:</strong> Polyglot files can be used to bypass security filters and may indicate malicious intent. Exercise caution when handling this file.
                </div>
            </div>
        `;
        
        return container;
    }

    /**
     * Create overlay data analysis
     */
    createOverlayAnalysis(overlayData) {
        const entropyClass = overlayData.entropy > 7.5 ? 'danger' : overlayData.entropy > 6.0 ? 'warning' : 'info';
        
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        container.innerHTML = `
            <div class="card-header bg-warning text-dark">
                <h5 class="mb-0">
                    <i class="fas fa-layer-group mr-2"></i>
                    Overlay Data Analysis
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>PE End Offset:</strong> 0x${overlayData.peEndOffset.toString(16).toUpperCase()}</p>
                        <p><strong>Overlay Offset:</strong> 0x${overlayData.overlayOffset.toString(16).toUpperCase()}</p>
                        <p><strong>Overlay Size:</strong> ${this.formatFileSize(overlayData.overlaySize)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Entropy:</strong> 
                            <span class="badge badge-${entropyClass}">${overlayData.entropy.toFixed(2)}</span>
                        </p>
                        <p><strong>Analysis:</strong> ${overlayData.analysis}</p>
                    </div>
                </div>
                
                ${overlayData.entropy > 7.5 ? `
                    <div class="alert alert-danger">
                        <strong>High Entropy Detected:</strong> The overlay data shows high entropy (${overlayData.entropy.toFixed(2)}), 
                        which may indicate encryption, compression, or obfuscation. This is common in packed malware.
                    </div>
                ` : ''}
            </div>
        `;
        
        return container;
    }

    /**
     * Create hidden data analysis
     */
    createHiddenDataAnalysis(hiddenData) {
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        const riskClass = hiddenData.riskScore > 75 ? 'danger' : hiddenData.riskScore > 50 ? 'warning' : 'info';
        
        container.innerHTML = `
            <div class="card-header bg-dark text-white">
                <h5 class="mb-0">
                    <i class="fas fa-eye-slash mr-2"></i>
                    Hidden Data Analysis
                    <span class="badge badge-${riskClass} ml-2">Risk: ${hiddenData.riskScore}%</span>
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    ${hiddenData.base64Strings ? `
                        <div class="col-md-6 mb-3">
                            <h6><i class="fas fa-code mr-2"></i>Base64 Strings (${hiddenData.base64Strings.length})</h6>
                            <div style="max-height: 200px; overflow-y: auto;">
                                ${hiddenData.base64Strings.slice(0, 10).map(str => `
                                    <div class="small border-bottom pb-1 mb-1">
                                        <strong>Offset:</strong> 0x${str.offset.toString(16)}<br>
                                        <code class="small">${str.content}</code>
                                        ${str.isValid ? '<span class="badge badge-success">Valid</span>' : '<span class="badge badge-warning">Invalid</span>'}
                                    </div>
                                `).join('')}
                                ${hiddenData.base64Strings.length > 10 ? `<div class="text-muted">... and ${hiddenData.base64Strings.length - 10} more</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${hiddenData.encryptedRegions ? `
                        <div class="col-md-6 mb-3">
                            <h6><i class="fas fa-lock mr-2"></i>High Entropy Regions (${hiddenData.encryptedRegions.length})</h6>
                            <div style="max-height: 200px; overflow-y: auto;">
                                ${hiddenData.encryptedRegions.slice(0, 5).map(region => `
                                    <div class="small border-bottom pb-1 mb-1">
                                        <strong>Offset:</strong> 0x${region.offset.toString(16)}<br>
                                        <strong>Size:</strong> ${this.formatFileSize(region.size)}<br>
                                        <strong>Entropy:</strong> <span class="badge badge-danger">${region.entropy.toFixed(2)}</span><br>
                                        <strong>Type:</strong> ${region.classification}
                                    </div>
                                `).join('')}
                                ${hiddenData.encryptedRegions.length > 5 ? `<div class="text-muted">... and ${hiddenData.encryptedRegions.length - 5} more</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                ${hiddenData.suspiciousStrings && hiddenData.suspiciousStrings.length > 0 ? `
                    <div class="mb-3">
                        <h6><i class="fas fa-exclamation-triangle mr-2 text-danger"></i>Suspicious Strings (${hiddenData.suspiciousStrings.length})</h6>
                        <div class="alert alert-warning">
                            ${hiddenData.suspiciousStrings.slice(0, 5).map(str => `
                                <div class="mb-2">
                                    <strong>Pattern:</strong> <code>${str.pattern}</code><br>
                                    <strong>Context:</strong> <code class="small">${str.context}</code>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${hiddenData.hiddenUrls && hiddenData.hiddenUrls.length > 0 ? `
                    <div class="mb-3">
                        <h6><i class="fas fa-link mr-2"></i>Hidden URLs & IP Addresses (${hiddenData.hiddenUrls.length})</h6>
                        <div style="max-height: 150px; overflow-y: auto;">
                            ${hiddenData.hiddenUrls.slice(0, 10).map(url => `
                                <div class="small border-bottom pb-1 mb-1">
                                    <span class="badge badge-secondary">${url.type}</span>
                                    <code>${url.value}</code>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        return container;
    }

    /**
     * Create file structure visualization
     */
    createFileStructureVisualization(results) {
        const container = document.createElement('div');
        container.className = 'card mb-4';
        
        container.innerHTML = `
            <div class="card-header bg-secondary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-sitemap mr-2"></i>
                    File Structure Visualization
                </h5>
            </div>
            <div class="card-body">
                <canvas id="fileStructureCanvas" width="800" height="200" class="border w-100"></canvas>
                <div class="mt-2 text-center">
                    <small class="text-muted">
                        Visual representation of file structure and carved file locations
                    </small>
                </div>
            </div>
        `;
        
        // Draw the visualization after adding to DOM
        setTimeout(() => this.drawFileStructure(results), 100);
        
        return container;
    }

    /**
     * Draw file structure on canvas
     */
    drawFileStructure(results) {
        const canvas = document.getElementById('fileStructureCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const fileSize = results.originalFile.size;
        
        // Clear canvas
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // Draw main file
        ctx.fillStyle = '#6c757d';
        ctx.fillRect(10, 50, width - 20, 40);
        
        // Draw carved files
        results.carvedFiles.forEach((file, index) => {
            const x = 10 + (file.offset / fileSize) * (width - 20);
            const w = Math.max(2, (file.size / fileSize) * (width - 20));
            
            // Color based on file type
            ctx.fillStyle = this.getFileTypeColor(file.extension);
            ctx.fillRect(x, 50, w, 40);
            
            // Draw label if file is large enough
            if (w > 30) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Arial';
                ctx.fillText(file.extension.toUpperCase(), x + 2, 70);
            }
        });
        
        // Draw overlay data if present
        if (results.overlayData) {
            const overlayX = 10 + (results.overlayData.overlayOffset / fileSize) * (width - 20);
            const overlayW = (results.overlayData.overlaySize / fileSize) * (width - 20);
            
            ctx.fillStyle = '#dc3545';
            ctx.fillRect(overlayX, 100, overlayW, 20);
            
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText('Overlay Data', overlayX, 115);
        }
        
        // Draw legend
        const legendY = 140;
        let legendX = 10;
        
        const fileTypes = [...new Set(results.carvedFiles.map(f => f.extension))];
        fileTypes.forEach(type => {
            ctx.fillStyle = this.getFileTypeColor(type);
            ctx.fillRect(legendX, legendY, 15, 15);
            
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(type.toUpperCase(), legendX + 20, legendY + 12);
            
            legendX += 80;
        });
    }

    /**
     * Get color for file type
     */
    getFileTypeColor(extension) {
        const colors = {
            'jpg': '#ff6b6b',
            'png': '#4ecdc4',
            'gif': '#45b7d1',
            'pdf': '#f39c12',
            'zip': '#9b59b6',
            'exe': '#e74c3c',
            'mp3': '#27ae60',
            'mp4': '#3498db',
            'txt': '#95a5a6'
        };
        return colors[extension] || '#7f8c8d';
    }

    /**
     * Get icon for file type
     */
    getFileIcon(extension) {
        const icons = {
            'jpg': 'file-image',
            'png': 'file-image',
            'gif': 'file-image',
            'bmp': 'file-image',
            'pdf': 'file-pdf',
            'zip': 'file-archive',
            'rar': 'file-archive',
            '7z': 'file-archive',
            'exe': 'file-code',
            'mp3': 'file-audio',
            'mp4': 'file-video',
            'txt': 'file-alt'
        };
        return icons[extension] || 'file';
    }

    /**
     * Get color for file type
     */
    getFileColor(extension) {
        const colors = {
            'jpg': 'danger',
            'png': 'info',
            'gif': 'primary',
            'pdf': 'warning',
            'zip': 'purple',
            'exe': 'dark',
            'mp3': 'success',
            'mp4': 'info'
        };
        return colors[extension] || 'secondary';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Download a specific carved file
     */
    downloadCarvedFile(fileId) {
        const fileData = this.downloadQueue.get(fileId);
        if (fileData) {
            const link = document.createElement('a');
            link.href = fileData.url;
            link.download = fileData.filename;
            link.click();
        }
    }

    /**
     * Download all carved files as a ZIP
     */
    async downloadAllCarvedFiles() {
        try {
            // This would require a ZIP library like JSZip
            alert('Bulk download feature requires JSZip library. Each file can be downloaded individually for now.');
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed: ' + error.message);
        }
    }

    /**
     * Show detailed file information
     */
    showFileDetails(fileId) {
        // Create a modal with detailed file information
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Carved File Details</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>Detailed analysis for file ID: ${fileId}</p>
                        <!-- Add more detailed information here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        $(modal).modal('show');
        
        // Remove modal when hidden
        $(modal).on('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    /**
     * Preview image file
     */
    previewImage(fileId) {
        const fileData = this.downloadQueue.get(fileId);
        if (fileData) {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Image Preview</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="${fileData.url}" alt="Carved image" class="img-fluid">
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            $(modal).modal('show');
            
            $(modal).on('hidden.bs.modal', function() {
                modal.remove();
            });
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        for (const [fileId, fileData] of this.downloadQueue) {
            if (fileData.url) {
                URL.revokeObjectURL(fileData.url);
            }
        }
        this.downloadQueue.clear();
    }
}

// Create global instance
window.fileCarvingUI = new FileCarvingUI(); 