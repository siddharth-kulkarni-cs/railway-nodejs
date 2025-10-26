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

        // Canvas click to close color picker
        document.getElementById('canvasArea').addEventListener('click', (e) => {
            if (this.currentColorPicker && !e.target.closest('.color-palette')) {
                this.hideColorPalette();
            }
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

        // Content editing
        textarea.addEventListener('input', (e) => {
            note.content = e.target.value;
            note.timestamp = new Date().toISOString();
            noteElement.querySelector('.sticky-note-footer').textContent = this.formatDate(note.timestamp);
            this.saveNotes();
        });

        // Delete note
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(note.id);
        });

        // Color picker
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showColorPalette(colorBtn, note.id);
        });

        // Dragging - from header or drag handle
        header.addEventListener('mousedown', (e) => {
            if (e.target === textarea || e.target.closest('.action-btn')) return;
            this.startDragging(noteElement, e);
        });

        dragHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
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

