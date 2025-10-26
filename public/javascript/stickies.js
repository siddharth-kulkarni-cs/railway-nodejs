/**
 * Sticky Notes Application
 * A simple, client-side sticky notes board with local storage persistence
 */

class StickyNotesApp {
    constructor() {
        this.notes = [];
        this.draggedNote = null;
        this.dragOffset = { x: 0, y: 0 };
        this.currentColorPicker = null;
        this.searchTerm = '';
        this.selectMode = false;
        this.selectedNotes = new Set();
        
        this.init();
    }

    init() {
        // Load notes from local storage
        this.loadNotes();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Render existing notes
        this.renderNotes();
        
        // Update empty state
        this.updateEmptyState();
    }

    setupEventListeners() {
        // Add note button
        document.getElementById('addNoteBtn').addEventListener('click', () => {
            this.createNote();
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllNotes();
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        // File input change handler
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            this.handleImport(e);
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportNotes();
        });

        // Select mode button
        document.getElementById('selectModeBtn').addEventListener('click', () => {
            this.toggleSelectMode();
        });

        // Delete selected button
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.deleteSelectedNotes();
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Clear search button
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
        });

        // Canvas click to close color picker
        document.getElementById('canvasArea').addEventListener('click', (e) => {
            if (this.currentColorPicker && !e.target.closest('.color-palette')) {
                this.hideColorPalette();
            }
        });

        // Canvas double-click to create note
        document.getElementById('canvasArea').addEventListener('dblclick', (e) => {
            // Don't create note if double-clicking on an existing note or in select mode
            if (e.target.closest('.sticky-note') || this.selectMode) {
                return;
            }

            // Get click position relative to canvas
            const canvasArea = document.getElementById('canvasArea');
            const rect = canvasArea.getBoundingClientRect();
            const x = e.clientX - rect.left + canvasArea.scrollLeft;
            const y = e.clientY - rect.top + canvasArea.scrollTop;

            // Create note at click position
            this.createNoteAtPosition(x, y);
        });

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
    }

    createNote(noteData = null) {
        const note = noteData || {
            id: this.generateId(),
            content: '',
            color: '#fef68a',
            position: this.getRandomPosition(),
            timestamp: new Date().toISOString()
        };

        this.notes.push(note);
        this.renderNote(note);
        this.saveNotes();
        this.updateEmptyState();
    }

    createNoteAtPosition(x, y) {
        // Adjust position to center the note on the click point
        const noteWidth = 250;
        const noteHeight = 250;
        const adjustedX = Math.max(0, x - noteWidth / 2);
        const adjustedY = Math.max(0, y - noteHeight / 2);

        const note = {
            id: this.generateId(),
            content: '',
            color: '#fef68a',
            position: { x: adjustedX, y: adjustedY },
            timestamp: new Date().toISOString()
        };

        this.notes.push(note);
        this.renderNote(note);
        this.saveNotes();
        this.updateEmptyState();

        // Auto-focus the textarea of the newly created note
        setTimeout(() => {
            const noteElement = document.querySelector(`[data-id="${note.id}"]`);
            if (noteElement) {
                const textarea = noteElement.querySelector('.sticky-note-content');
                if (textarea) {
                    textarea.focus();
                }
            }
        }, 100);

        // Show a subtle notification
        this.showNotification('📝 New note created! Start typing...', 'info');
    }

    renderNote(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'sticky-note';
        noteElement.dataset.id = note.id;
        noteElement.style.backgroundColor = note.color;
        noteElement.style.left = `${note.position.x}px`;
        noteElement.style.top = `${note.position.y}px`;

        noteElement.innerHTML = `
            <div class="sticky-note-header">
                <span class="drag-handle">⋮⋮</span>
                <div class="sticky-note-actions">
                    <button class="action-btn color-btn" title="Change color">🎨</button>
                    <button class="action-btn delete-btn" title="Delete note">✕</button>
                </div>
            </div>
            <textarea class="sticky-note-content" placeholder="Type your note here...">${note.content}</textarea>
            <div class="sticky-note-footer">${this.formatDate(note.timestamp)}</div>
        `;

        // Event listeners for this note
        this.setupNoteEventListeners(noteElement, note);

        document.getElementById('canvasArea').appendChild(noteElement);
    }

    setupNoteEventListeners(noteElement, note) {
        const textarea = noteElement.querySelector('.sticky-note-content');
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const colorBtn = noteElement.querySelector('.color-btn');
        const dragHandle = noteElement.querySelector('.drag-handle');
        const header = noteElement.querySelector('.sticky-note-header');

        // Note click handler - for select mode
        noteElement.addEventListener('click', (e) => {
            if (this.selectMode) {
                e.stopPropagation();
                this.toggleNoteSelection(note.id);
            }
        });

        // Content editing
        textarea.addEventListener('input', (e) => {
            note.content = e.target.value;
            note.timestamp = new Date().toISOString();
            noteElement.querySelector('.sticky-note-footer').textContent = this.formatDate(note.timestamp);
            this.saveNotes();
        });

        // Prevent editing in select mode
        textarea.addEventListener('focus', (e) => {
            if (this.selectMode) {
                e.target.blur();
            }
        });

        // Delete note
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.selectMode) {
                this.deleteNote(note.id);
            }
        });

        // Color picker
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.selectMode) {
                this.showColorPalette(colorBtn, note.id);
            }
        });

        // Dragging - from header or drag handle (disabled in select mode)
        header.addEventListener('mousedown', (e) => {
            if (this.selectMode) return;
            if (e.target === textarea || e.target.closest('.action-btn')) return;
            this.startDragging(noteElement, e);
        });

        dragHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (this.selectMode) return;
            this.startDragging(noteElement, e);
        });

        // Prevent text selection while dragging
        noteElement.addEventListener('dragstart', (e) => e.preventDefault());
    }

    startDragging(noteElement, e) {
        this.draggedNote = noteElement;
        noteElement.classList.add('dragging');
        
        const rect = noteElement.getBoundingClientRect();
        const canvasRect = document.getElementById('canvasArea').getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Bring to front
        noteElement.style.zIndex = 1000;
    }

    handleMouseMove(e) {
        if (!this.draggedNote) return;

        const canvasArea = document.getElementById('canvasArea');
        const canvasRect = canvasArea.getBoundingClientRect();
        
        let x = e.clientX - canvasRect.left - this.dragOffset.x + canvasArea.scrollLeft;
        let y = e.clientY - canvasRect.top - this.dragOffset.y + canvasArea.scrollTop;

        // Keep note within bounds (optional - you can remove this for unlimited canvas)
        x = Math.max(0, x);
        y = Math.max(0, y);

        this.draggedNote.style.left = `${x}px`;
        this.draggedNote.style.top = `${y}px`;
    }

    handleMouseUp() {
        if (!this.draggedNote) return;

        this.draggedNote.classList.remove('dragging');
        
        // Save new position
        const noteId = this.draggedNote.dataset.id;
        const note = this.notes.find(n => n.id === noteId);
        
        if (note) {
            note.position = {
                x: parseInt(this.draggedNote.style.left),
                y: parseInt(this.draggedNote.style.top)
            };
            this.saveNotes();
        }

        // Reset z-index
        this.draggedNote.style.zIndex = '';
        this.draggedNote = null;
    }

    showColorPalette(triggerElement, noteId) {
        const palette = document.getElementById('colorPalette');
        const rect = triggerElement.getBoundingClientRect();
        
        palette.style.display = 'flex';
        palette.style.left = `${rect.left}px`;
        palette.style.top = `${rect.bottom + 10}px`;
        
        // Remove old event listeners
        const newPalette = palette.cloneNode(true);
        palette.parentNode.replaceChild(newPalette, palette);
        
        // Add new event listeners
        newPalette.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = option.dataset.color;
                this.changeNoteColor(noteId, color);
                this.hideColorPalette();
            });
        });
        
        this.currentColorPicker = newPalette;
    }

    hideColorPalette() {
        const palette = document.getElementById('colorPalette');
        if (palette) {
            palette.style.display = 'none';
        }
        this.currentColorPicker = null;
    }

    changeNoteColor(noteId, color) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.color = color;
            const noteElement = document.querySelector(`[data-id="${noteId}"]`);
            if (noteElement) {
                noteElement.style.backgroundColor = color;
            }
            this.saveNotes();
        }
    }

    deleteNote(noteId) {
        if (confirm('Delete this note?')) {
            this.notes = this.notes.filter(n => n.id !== noteId);
            const noteElement = document.querySelector(`[data-id="${noteId}"]`);
            if (noteElement) {
                noteElement.style.animation = 'noteAppear 0.3s ease reverse';
                setTimeout(() => {
                    noteElement.remove();
                    this.updateEmptyState();
                }, 300);
            }
            this.saveNotes();
        }
    }

    clearAllNotes() {
        if (this.notes.length === 0) {
            alert('No notes to clear!');
            return;
        }

        if (confirm(`Delete all ${this.notes.length} notes? This cannot be undone.`)) {
            this.notes = [];
            document.querySelectorAll('.sticky-note').forEach(note => note.remove());
            this.saveNotes();
            this.updateEmptyState();
        }
    }

    exportNotes() {
        if (this.notes.length === 0) {
            alert('No notes to export! Create some notes first.');
            return;
        }

        try {
            // Create export data with metadata
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                exportTimestamp: Date.now(),
                totalNotes: this.notes.length,
                notes: this.notes.map(note => ({
                    id: note.id,
                    content: note.content,
                    color: note.color,
                    position: note.position,
                    timestamp: note.timestamp,
                    created: note.timestamp
                }))
            };

            // Convert to pretty JSON
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // Generate filename with timestamp
            const dateStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            }).replace(':', '-');
            const filename = `sticky-notes-${dateStr}-${timeStr}.json`;
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            // Show success message
            this.showNotification(`✅ Exported ${this.notes.length} note${this.notes.length !== 1 ? 's' : ''} to ${filename}`, 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export notes. Please try again.');
        }
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset file input for potential re-import
        event.target.value = '';

        // Validate file type
        if (!file.type.includes('json') && !file.name.endsWith('.json')) {
            alert('❌ Invalid file type! Please select a JSON file.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // Validate JSON structure
                if (!this.validateImportData(jsonData)) {
                    alert('❌ Invalid JSON format! Please ensure you are importing a file exported from this application.');
                    return;
                }

                // Show import options dialog
                this.showImportDialog(jsonData);

            } catch (error) {
                console.error('Import error:', error);
                alert('❌ Failed to parse JSON file. Please ensure the file is valid JSON.');
            }
        };

        reader.onerror = () => {
            alert('❌ Failed to read file. Please try again.');
        };

        reader.readAsText(file);
    }

    validateImportData(data) {
        // Check if it's our export format
        if (data.version && data.notes && Array.isArray(data.notes)) {
            // Validate each note has required fields
            return data.notes.every(note => 
                note.id && 
                note.hasOwnProperty('content') && 
                note.color && 
                note.position &&
                note.timestamp
            );
        }
        return false;
    }

    showImportDialog(importData) {
        const noteCount = importData.notes.length;
        const exportDate = new Date(importData.exportDate).toLocaleString();
        
        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.className = 'import-dialog';
        dialog.innerHTML = `
            <div class="import-dialog-overlay"></div>
            <div class="import-dialog-content">
                <h3>📤 Import Sticky Notes</h3>
                <div class="import-info">
                    <p><strong>File contains:</strong> ${noteCount} note${noteCount !== 1 ? 's' : ''}</p>
                    <p><strong>Exported on:</strong> ${exportDate}</p>
                    <p><strong>Current notes:</strong> ${this.notes.length}</p>
                </div>
                <div class="import-options">
                    <p><strong>How would you like to import?</strong></p>
                    <button class="btn btn-import-merge" id="importMergeBtn">
                        <span class="btn-icon">➕</span>
                        Merge (Add to existing notes)
                    </button>
                    <button class="btn btn-import-replace" id="importReplaceBtn">
                        <span class="btn-icon">🔄</span>
                        Replace (Delete existing notes)
                    </button>
                    <button class="btn btn-secondary" id="importCancelBtn">
                        <span class="btn-icon">✕</span>
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add styles for the dialog
        this.addImportDialogStyles();

        // Handle button clicks
        document.getElementById('importMergeBtn').addEventListener('click', () => {
            this.performImport(importData, 'merge');
            document.body.removeChild(dialog);
        });

        document.getElementById('importReplaceBtn').addEventListener('click', () => {
            if (confirm(`⚠️ This will delete all ${this.notes.length} existing notes. Continue?`)) {
                this.performImport(importData, 'replace');
                document.body.removeChild(dialog);
            }
        });

        document.getElementById('importCancelBtn').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        // Close on overlay click
        dialog.querySelector('.import-dialog-overlay').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    addImportDialogStyles() {
        if (document.getElementById('import-dialog-styles')) return;

        const style = document.createElement('style');
        style.id = 'import-dialog-styles';
        style.textContent = `
            .import-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .import-dialog-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(5px);
            }

            .import-dialog-content {
                position: relative;
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideInScale 0.3s ease;
            }

            @keyframes slideInScale {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .import-dialog-content h3 {
                margin-top: 0;
                color: #333;
                font-size: 1.5rem;
                margin-bottom: 1.5rem;
            }

            .import-info {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
            }

            .import-info p {
                margin: 0.5rem 0;
                color: #666;
            }

            .import-options p {
                font-weight: 600;
                color: #333;
                margin-bottom: 1rem;
            }

            .import-options {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .btn-import-merge {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }

            .btn-import-replace {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    performImport(importData, mode) {
        try {
            if (mode === 'replace') {
                // Clear existing notes
                this.notes = [];
                document.querySelectorAll('.sticky-note').forEach(note => note.remove());
            }

            // Import notes
            const importedCount = importData.notes.length;
            let successCount = 0;

            importData.notes.forEach(noteData => {
                try {
                    // Create new note with imported data
                    // Generate new ID to avoid conflicts
                    const note = {
                        id: this.generateId(),
                        content: noteData.content || '',
                        color: noteData.color || '#fef68a',
                        position: noteData.position || this.getRandomPosition(),
                        timestamp: new Date().toISOString()
                    };

                    this.notes.push(note);
                    this.renderNote(note);
                    successCount++;
                } catch (error) {
                    console.error('Error importing note:', error);
                }
            });

            // Save and update UI
            this.saveNotes();
            this.updateEmptyState();

            // Show success message
            const modeText = mode === 'merge' ? 'merged' : 'imported';
            this.showNotification(
                `✅ Successfully ${modeText} ${successCount} of ${importedCount} note${importedCount !== 1 ? 's' : ''}!`,
                'success'
            );

        } catch (error) {
            console.error('Import failed:', error);
            alert('❌ Import failed. Please try again.');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : '#667eea'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Multi-select functionality
    toggleSelectMode() {
        this.selectMode = !this.selectMode;
        const selectModeBtn = document.getElementById('selectModeBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const addNoteBtn = document.getElementById('addNoteBtn');
        const exportBtn = document.getElementById('exportBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');

        if (this.selectMode) {
            // Enter select mode
            selectModeBtn.classList.add('active');
            selectModeBtn.innerHTML = '<span class="btn-icon">✕</span> Exit Select';
            deleteSelectedBtn.style.display = 'flex';
            
            // Disable other buttons
            addNoteBtn.style.opacity = '0.5';
            addNoteBtn.style.pointerEvents = 'none';
            exportBtn.style.opacity = '0.5';
            exportBtn.style.pointerEvents = 'none';
            clearAllBtn.style.opacity = '0.5';
            clearAllBtn.style.pointerEvents = 'none';

            // Add select-mode class to all notes
            document.querySelectorAll('.sticky-note').forEach(noteElement => {
                noteElement.classList.add('select-mode');
            });

            this.showNotification('🎯 Select Mode: Click notes to select/deselect them', 'info');
        } else {
            // Exit select mode
            selectModeBtn.classList.remove('active');
            selectModeBtn.innerHTML = '<span class="btn-icon">☑️</span> Select Mode';
            deleteSelectedBtn.style.display = 'none';
            
            // Re-enable other buttons
            addNoteBtn.style.opacity = '1';
            addNoteBtn.style.pointerEvents = 'auto';
            exportBtn.style.opacity = '1';
            exportBtn.style.pointerEvents = 'auto';
            clearAllBtn.style.opacity = '1';
            clearAllBtn.style.pointerEvents = 'auto';

            // Remove select-mode and selected classes from all notes
            document.querySelectorAll('.sticky-note').forEach(noteElement => {
                noteElement.classList.remove('select-mode', 'selected');
            });

            // Clear selection
            this.selectedNotes.clear();
            this.updateSelectedCount();
        }
    }

    toggleNoteSelection(noteId) {
        const noteElement = document.querySelector(`[data-id="${noteId}"]`);
        if (!noteElement) return;

        if (this.selectedNotes.has(noteId)) {
            this.selectedNotes.delete(noteId);
            noteElement.classList.remove('selected');
        } else {
            this.selectedNotes.add(noteId);
            noteElement.classList.add('selected');
        }

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        
        countElement.textContent = this.selectedNotes.size;
        
        if (this.selectedNotes.size === 0) {
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.style.opacity = '0.5';
        } else {
            deleteSelectedBtn.disabled = false;
            deleteSelectedBtn.style.opacity = '1';
        }
    }

    deleteSelectedNotes() {
        if (this.selectedNotes.size === 0) {
            alert('No notes selected!');
            return;
        }

        const count = this.selectedNotes.size;
        if (confirm(`Delete ${count} selected note${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
            // Convert Set to Array to avoid modification during iteration
            const noteIdsToDelete = Array.from(this.selectedNotes);
            
            // Delete each note
            noteIdsToDelete.forEach(noteId => {
                // Remove from notes array
                this.notes = this.notes.filter(n => n.id !== noteId);
                
                // Remove element from DOM
                const noteElement = document.querySelector(`[data-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.style.animation = 'noteAppear 0.3s ease reverse';
                    setTimeout(() => {
                        noteElement.remove();
                    }, 300);
                }
            });

            // Clear selection
            this.selectedNotes.clear();
            this.updateSelectedCount();
            
            // Save and update UI
            this.saveNotes();
            this.updateEmptyState();
            
            // Exit select mode
            this.toggleSelectMode();
            
            // Show success notification
            this.showNotification(`✅ Deleted ${count} note${count !== 1 ? 's' : ''}`, 'success');
        }
    }

    renderNotes() {
        this.notes.forEach(note => this.renderNote(note));
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (this.notes.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
        }
    }

    // Search Functionality
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim().toLowerCase();
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        
        // Show/hide clear search button
        if (this.searchTerm) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }

        // Update all notes
        const noteElements = document.querySelectorAll('.sticky-note');
        
        if (!this.searchTerm) {
            // No search term - show all notes normally
            noteElements.forEach(noteElement => {
                noteElement.classList.remove('search-hidden', 'search-match');
                this.removeHighlights(noteElement);
            });
            return;
        }

        // Search active - filter and highlight
        noteElements.forEach(noteElement => {
            const noteId = noteElement.dataset.id;
            const note = this.notes.find(n => n.id === noteId);
            
            if (!note) return;

            const contentMatches = note.content.toLowerCase().includes(this.searchTerm);
            
            if (contentMatches) {
                noteElement.classList.remove('search-hidden');
                noteElement.classList.add('search-match');
                this.highlightMatches(noteElement, note.content);
            } else {
                noteElement.classList.add('search-hidden');
                noteElement.classList.remove('search-match');
                this.removeHighlights(noteElement);
            }
        });
    }

    highlightMatches(noteElement, content) {
        const textarea = noteElement.querySelector('.sticky-note-content');
        if (!textarea || !this.searchTerm) return;

        // Create a highlighted version for display
        const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
        const highlighted = content.replace(regex, '<mark class="search-highlight">$1</mark>');
        
        // Store original textarea for editing
        if (!textarea.dataset.originalValue) {
            textarea.dataset.originalValue = content;
        }

        // Create a display div if it doesn't exist
        let displayDiv = noteElement.querySelector('.sticky-note-display');
        if (!displayDiv) {
            displayDiv = document.createElement('div');
            displayDiv.className = 'sticky-note-display';
            displayDiv.style.cssText = textarea.style.cssText;
            displayDiv.style.whiteSpace = 'pre-wrap';
            displayDiv.style.wordBreak = 'break-word';
            displayDiv.style.cursor = 'text';
            displayDiv.style.fontFamily = textarea.style.fontFamily || "'Comic Sans MS', cursive, sans-serif";
            displayDiv.style.fontSize = textarea.style.fontSize || '1rem';
            displayDiv.style.lineHeight = textarea.style.lineHeight || '1.6';
            displayDiv.style.color = textarea.style.color || '#333';
            displayDiv.style.flex = '1';
            displayDiv.style.minHeight = '180px';
            displayDiv.style.padding = '0';
            
            // Insert display div and hide textarea
            textarea.parentNode.insertBefore(displayDiv, textarea);
            textarea.style.display = 'none';
            
            // Click to focus textarea for editing
            displayDiv.addEventListener('click', () => {
                textarea.style.display = 'block';
                displayDiv.style.display = 'none';
                textarea.focus();
            });
            
            // When textarea loses focus, show display div again
            textarea.addEventListener('blur', () => {
                if (this.searchTerm) {
                    const note = this.notes.find(n => n.id === noteElement.dataset.id);
                    if (note) {
                        this.highlightMatches(noteElement, note.content);
                    }
                    textarea.style.display = 'none';
                    displayDiv.style.display = 'block';
                }
            });
        }

        displayDiv.innerHTML = highlighted;
        displayDiv.style.display = 'block';
        textarea.style.display = 'none';
    }

    removeHighlights(noteElement) {
        const textarea = noteElement.querySelector('.sticky-note-content');
        const displayDiv = noteElement.querySelector('.sticky-note-display');
        
        if (displayDiv) {
            displayDiv.style.display = 'none';
        }
        
        if (textarea) {
            textarea.style.display = 'block';
            delete textarea.dataset.originalValue;
        }
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Local Storage Methods
    saveNotes() {
        try {
            localStorage.setItem('stickyNotes', JSON.stringify(this.notes));
        } catch (e) {
            console.error('Failed to save notes:', e);
        }
    }

    loadNotes() {
        try {
            const saved = localStorage.getItem('stickyNotes');
            if (saved) {
                this.notes = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load notes:', e);
            this.notes = [];
        }
    }

    // Utility Methods
    generateId() {
        return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getRandomPosition() {
        const canvasArea = document.getElementById('canvasArea');
        const maxX = Math.max(400, canvasArea.offsetWidth - 300);
        const maxY = Math.max(400, canvasArea.offsetHeight - 300);
        
        return {
            x: Math.floor(Math.random() * maxX) + 50,
            y: Math.floor(Math.random() * maxY) + 50
        };
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StickyNotesApp();
});

