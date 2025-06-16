/**
 * Visual File Structure Map
 * Creates an interactive, animated visualization of file structure
 */

class VisualFileMap {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.particles = [];
        this.nodes = [];
        this.connections = [];
        this.mousePos = { x: 0, y: 0 };
        this.selectedNode = null;
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.fileData = null;
    }

    /**
     * Replace spaces with newlines in a string
     * @param {string} str - Input string
     * @returns {string} String with spaces replaced by newlines
     */
    replaceSpacesWithNewlines(str) {
        return str.replace(/ /g, '\n');
    }

    async analyzeFileStructure(file) {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Analyze file structure
        const structure = {
            header: this.analyzeHeader(uint8Array),
            sections: this.analyzeSections(uint8Array),
            entropy: this.calculateLocalEntropy(uint8Array),
            patterns: this.detectPatterns(uint8Array),
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        };

        return structure;
    }

    analyzeHeader(data) {
        const headerSize = Math.min(512, data.length);
        const header = data.slice(0, headerSize);
        
        // Detect common file signatures
        const signatures = {
            'PNG': [0x89, 0x50, 0x4E, 0x47],
            'JPEG': [0xFF, 0xD8, 0xFF],
            'GIF': [0x47, 0x49, 0x46],
            'PDF': [0x25, 0x50, 0x44, 0x46],
            'ZIP': [0x50, 0x4B, 0x03, 0x04],
            'EXE': [0x4D, 0x5A],
            'MP4': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
            'MP3': [0xFF, 0xFB],
            'DOCX': [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]
        };

        let detectedType = 'Unknown';
        for (const [type, sig] of Object.entries(signatures)) {
            if (this.matchesSignature(header, sig)) {
                detectedType = type;
                break;
            }
        }

        return {
            type: detectedType,
            size: headerSize,
            entropy: this.calculateEntropy(header),
            preview: Array.from(header.slice(0, 32))
        };
    }

    matchesSignature(data, signature) {
        if (data.length < signature.length) return false;
        for (let i = 0; i < signature.length; i++) {
            if (data[i] !== signature[i]) return false;
        }
        return true;
    }

    analyzeSections(data) {
        const sections = [];
        const sectionSize = Math.max(1024, Math.floor(data.length / 20)); // Dynamic section size
        
        for (let i = 0; i < data.length; i += sectionSize) {
            const end = Math.min(i + sectionSize, data.length);
            const section = data.slice(i, end);
            
            sections.push({
                offset: i,
                size: end - i,
                entropy: this.calculateEntropy(section),
                type: this.detectSectionType(section),
                density: this.calculateDensity(section),
                patterns: this.quickPatternScan(section)
            });
        }

        return sections;
    }

    calculateEntropy(data) {
        const freq = new Array(256).fill(0);
        for (let i = 0; i < data.length; i++) {
            freq[data[i]]++;
        }

        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                const p = freq[i] / data.length;
                entropy -= p * Math.log2(p);
            }
        }

        return entropy;
    }

    calculateLocalEntropy(data) {
        const windowSize = Math.max(256, Math.floor(data.length / 100));
        const step = Math.max(128, Math.floor(windowSize / 2));
        const entropyMap = [];

        for (let i = 0; i < data.length - windowSize; i += step) {
            const window = data.slice(i, i + windowSize);
            entropyMap.push({
                offset: i,
                entropy: this.calculateEntropy(window)
            });
        }

        return entropyMap;
    }

    detectSectionType(data) {
        const entropy = this.calculateEntropy(data);
        const nullCount = Array.from(data).filter(b => b === 0).length;
        const textCount = Array.from(data).filter(b => b >= 32 && b <= 126).length;
        
        if (entropy > 7.5) return 'encrypted';
        if (entropy > 6) return 'compressed';
        if (nullCount > data.length * 0.5) return 'padding';
        if (textCount > data.length * 0.8) return 'text';
        if (entropy < 2) return 'structured';
        return 'binary';
    }

    calculateDensity(data) {
        const nonZeroCount = Array.from(data).filter(b => b !== 0).length;
        return nonZeroCount / data.length;
    }

    quickPatternScan(data) {
        const patterns = {
            repeating: 0,
            sequential: 0,
            random: 0
        };

        for (let i = 1; i < Math.min(data.length, 1000); i++) {
            if (data[i] === data[i-1]) patterns.repeating++;
            if (data[i] === data[i-1] + 1) patterns.sequential++;
        }

        patterns.random = 1 - (patterns.repeating + patterns.sequential) / Math.min(data.length - 1, 999);
        return patterns;
    }

    detectPatterns(data) {
        const patterns = [];
        const patternWindow = 16;
        const seen = new Map();

        for (let i = 0; i < data.length - patternWindow; i++) {
            const pattern = Array.from(data.slice(i, i + patternWindow)).join(',');
            if (seen.has(pattern)) {
                seen.set(pattern, seen.get(pattern) + 1);
            } else {
                seen.set(pattern, 1);
            }
        }

        // Find most common patterns
        const sorted = Array.from(seen.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        for (const [pattern, count] of sorted) {
            if (count > 2) {
                patterns.push({
                    data: pattern.split(',').map(Number),
                    count: count,
                    percentage: (count / (data.length - patternWindow)) * 100
                });
            }
        }

        return patterns;
    }

    createVisualization(structure, container) {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.offsetWidth;
        this.canvas.height = 600;
        this.canvas.style.cursor = 'grab';
        this.ctx = this.canvas.getContext('2d');
        
        container.innerHTML = '';
        container.appendChild(this.canvas);

        // Create control panel
        this.createControlPanel(container);

        // Generate nodes from structure
        this.generateNodes(structure);
        
        // Set up event listeners
        this.setupEventListeners();

        // Start animation
        this.animate();

        return this.canvas;
    }

    createControlPanel(container) {
        const panel = document.createElement('div');
        panel.className = 'visual-map-controls';
        panel.innerHTML = `
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-primary" id="vmZoomIn">
                    <i class="fas fa-search-plus"></i> Zoom In
                </button>
                <button class="btn btn-outline-primary" id="vmZoomOut">
                    <i class="fas fa-search-minus"></i> Zoom Out
                </button>
                <button class="btn btn-outline-primary" id="vmReset">
                    <i class="fas fa-undo"></i> Reset View
                </button>
                <button class="btn btn-outline-info" id="vmToggleLabels">
                    <i class="fas fa-tag"></i> Toggle Labels
                </button>
            </div>
            <div class="mt-2">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i> Click and drag to pan, scroll to zoom, click nodes for details
                </small>
            </div>
        `;
        container.appendChild(panel);

        // Add event listeners for controls
        document.getElementById('vmZoomIn').addEventListener('click', () => {
            this.zoom = Math.min(this.zoom * 1.2, 5);
        });

        document.getElementById('vmZoomOut').addEventListener('click', () => {
            this.zoom = Math.max(this.zoom / 1.2, 0.2);
        });

        document.getElementById('vmReset').addEventListener('click', () => {
            this.zoom = 1;
            this.offset = { x: 0, y: 0 };
        });

        let showLabels = true;
        document.getElementById('vmToggleLabels').addEventListener('click', (e) => {
            showLabels = !showLabels;
            this.nodes.forEach(node => node.showLabel = showLabels);
            e.target.classList.toggle('active');
        });
    }

    generateNodes(structure) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Create central node for file
        const fileNode = {
            id: 'file',
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            radius: 40,
            color: '#4a6fa5',
            label: structure.metadata.name,
            type: 'file',
            data: structure.metadata,
            showLabel: true,
            glow: true
        };
        this.nodes.push(fileNode);

        // Create header node
        const headerNode = {
            id: 'header',
            x: centerX - 150,
            y: centerY - 100,
            vx: 0,
            vy: 0,
            radius: 30,
            color: '#6e9887',
            label: `Header (${structure.header.type})`,
            type: 'header',
            data: structure.header,
            showLabel: true
        };
        this.nodes.push(headerNode);
        this.connections.push({ from: fileNode, to: headerNode, strength: 1 });

        // Create section nodes
        const sectionRadius = 360;
        structure.sections.forEach((section, index) => {
            const angle = (index / structure.sections.length) * Math.PI * 2;
            const sectionNode = {
                id: `section-${index}`,
                x: centerX + Math.cos(angle) * sectionRadius,
                y: centerY + Math.sin(angle) * sectionRadius,
                vx: 0,
                vy: 0,
                radius: 15 + (section.size / structure.metadata.size) * 20,
                color: this.getSectionColor(section.type),
                label: `${section.type} @ ${this.formatBytes(section.offset)}`,
                type: 'section',
                data: section,
                showLabel: true,
                entropy: section.entropy
            };
            this.nodes.push(sectionNode);
            this.connections.push({ 
                from: fileNode, 
                to: sectionNode, 
                strength: section.density,
                type: section.type
            });
        });

        // Create pattern nodes
        if (structure.patterns.length > 0) {
            const patternCenter = {
                x: centerX + 200,
                y: centerY + 100
            };
            
            structure.patterns.slice(0, 5).forEach((pattern, index) => {
                const angle = (index / 5) * Math.PI * 2;
                const patternNode = {
                    id: `pattern-${index}`,
                    x: patternCenter.x + Math.cos(angle) * 80,
                    y: patternCenter.y + Math.sin(angle) * 80,
                    vx: 0,
                    vy: 0,
                    radius: 10 + Math.log(pattern.count) * 2,
                    color: '#ffc107',
                    label: `Pattern ${index + 1} (${pattern.count}x)`,
                    type: 'pattern',
                    data: pattern,
                    showLabel: true,
                    pulse: true
                };
                this.nodes.push(patternNode);
            });
        }

        // Add floating particles for visual effect
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
    }

    getSectionColor(type) {
        const colors = {
            'encrypted': '#dc3545',
            'compressed': '#fd7e14',
            'text': '#28a745',
            'binary': '#007bff',
            'structured': '#6610f2',
            'padding': '#6c757d'
        };
        return colors[type] || '#17a2b8';
    }

    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.offset.x) / this.zoom;
            const y = (e.clientY - rect.top - this.offset.y) / this.zoom;

            // Check if clicking on a node
            const clickedNode = this.nodes.find(node => {
                const dx = node.x - x;
                const dy = node.y - y;
                return Math.sqrt(dx * dx + dy * dy) < node.radius;
            });

            if (clickedNode) {
                this.selectedNode = clickedNode;
                this.showNodeDetails(clickedNode);
            } else {
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.offset.x, y: e.clientY - this.offset.y };
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = (e.clientX - rect.left - this.offset.x) / this.zoom;
            this.mousePos.y = (e.clientY - rect.top - this.offset.y) / this.zoom;

            if (this.isDragging) {
                this.offset.x = e.clientX - this.dragStart.x;
                this.offset.y = e.clientY - this.dragStart.y;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(0.2, Math.min(5, this.zoom * delta));
        });
    }

    showNodeDetails(node) {
        // Create or update details panel
        let detailsPanel = document.getElementById('vmNodeDetails');
        if (!detailsPanel) {
            detailsPanel = document.createElement('div');
            detailsPanel.id = 'vmNodeDetails';
            detailsPanel.className = 'alert alert-info mt-3';
            this.canvas.parentElement.appendChild(detailsPanel);
        }

        let details = `<h6><i class="fas fa-cube"></i> ${node.label}</h6>`;
        details += `<p class="mb-1"><strong>Type:</strong> ${node.type}</p>`;

        if (node.type === 'section') {
            details += `<p class="mb-1"><strong>Offset:</strong> ${this.formatBytes(node.data.offset)}</p>`;
            details += `<p class="mb-1"><strong>Size:</strong> ${this.formatBytes(node.data.size)}</p>`;
            details += `<p class="mb-1"><strong>Entropy:</strong> ${node.data.entropy.toFixed(3)}</p>`;
            details += `<p class="mb-1"><strong>Density:</strong> ${(node.data.density * 100).toFixed(1)}%</p>`;
        } else if (node.type === 'pattern') {
            details += `<p class="mb-1"><strong>Occurrences:</strong> ${node.data.count}</p>`;
            details += `<p class="mb-1"><strong>Coverage:</strong> ${node.data.percentage.toFixed(2)}%</p>`;
            details += `<p class="mb-1"><strong>Pattern:</strong> <code>${node.data.data.slice(0, 8).join(' ')}...</code></p>`;
        } else if (node.type === 'file') {
            details += `<p class="mb-1"><strong>Size:</strong> ${this.formatBytes(node.data.size)}</p>`;
            details += `<p class="mb-1"><strong>Type:</strong> ${node.data.type || 'Unknown'}</p>`;
        }

        detailsPanel.innerHTML = details;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(248, 249, 250, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.offset.x, this.offset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Update and draw particles
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(74, 111, 165, ${particle.opacity})`;
            this.ctx.fill();
        });

        // Draw connections
        this.connections.forEach(conn => {
            const gradient = this.ctx.createLinearGradient(
                conn.from.x, conn.from.y, conn.to.x, conn.to.y
            );
            gradient.addColorStop(0, this.hexToRgba(conn.from.color, 0.3));
            gradient.addColorStop(1, this.hexToRgba(conn.to.color, 0.3));

            this.ctx.beginPath();
            this.ctx.moveTo(conn.from.x, conn.from.y);
            this.ctx.lineTo(conn.to.x, conn.to.y);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 1 + conn.strength * 2;
            this.ctx.stroke();

            // Animate data flow
            const t = (Date.now() % 2000) / 2000;
            const flowX = conn.from.x + (conn.to.x - conn.from.x) * t;
            const flowY = conn.from.y + (conn.to.y - conn.from.y) * t;
            
            this.ctx.beginPath();
            this.ctx.arc(flowX, flowY, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = this.hexToRgba(conn.to.color, 0.8);
            this.ctx.fill();
        });

        // Draw nodes
        this.nodes.forEach(node => {
            // Apply physics
            node.vx *= 0.95;
            node.vy *= 0.95;
            node.x += node.vx;
            node.y += node.vy;

            // Draw glow effect for special nodes
            if (node.glow) {
                const glowGradient = this.ctx.createRadialGradient(
                    node.x, node.y, 0, node.x, node.y, node.radius * 2
                );
                glowGradient.addColorStop(0, this.hexToRgba(node.color, 0.3));
                glowGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = glowGradient;
                this.ctx.fillRect(
                    node.x - node.radius * 2, 
                    node.y - node.radius * 2, 
                    node.radius * 4, 
                    node.radius * 4
                );
            }

            // Draw node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            if (node === this.selectedNode) {
                this.ctx.strokeStyle = '#ffc107';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }

            const nodeGradient = this.ctx.createRadialGradient(
                node.x - node.radius / 3, 
                node.y - node.radius / 3, 
                0,
                node.x, 
                node.y, 
                node.radius
            );
            nodeGradient.addColorStop(0, this.lightenColor(node.color, 20));
            nodeGradient.addColorStop(1, node.color);
            this.ctx.fillStyle = nodeGradient;
            this.ctx.fill();

            // Pulse effect for pattern nodes
            if (node.pulse) {
                const pulseRadius = node.radius + Math.sin(Date.now() * 0.003) * 5;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = this.hexToRgba(node.color, 0.3);
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Draw label
            if (node.showLabel) {
                this.ctx.fillStyle = '#333';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(node.label, node.x, node.y + node.radius + 15);
            }

            // Draw entropy indicator for sections
            if (node.type === 'section' && node.entropy !== undefined) {
                const entropyBar = node.entropy / 8; // Normalize to 0-1
                const barWidth = node.radius * 2;
                const barHeight = 4;
                
                this.ctx.fillStyle = '#ddd';
                this.ctx.fillRect(node.x - barWidth/2, node.y - node.radius - 10, barWidth, barHeight);
                
                const entropyColor = entropyBar > 0.9 ? '#dc3545' : 
                                   entropyBar > 0.7 ? '#fd7e14' : 
                                   entropyBar > 0.5 ? '#ffc107' : '#28a745';
                
                this.ctx.fillStyle = entropyColor;
                this.ctx.fillRect(node.x - barWidth/2, node.y - node.radius - 10, barWidth * entropyBar, barHeight);
            }
        });

        this.ctx.restore();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}

// Export for use in other files
window.VisualFileMap = VisualFileMap; 