// Pomodoro Timer Application
class PomodoroTimer {
  constructor() {
    this.modes = {
      pomodoro: { duration: 25 * 60, label: 'Focus Time' },
      shortBreak: { duration: 5 * 60, label: 'Short Break' },
      longBreak: { duration: 15 * 60, label: 'Long Break' },
      oneMin: { duration: 1 * 60, label: 'Quick Timer' },
      twoMin: { duration: 2 * 60, label: 'Quick Timer' },
      threeMin: { duration: 3 * 60, label: 'Quick Timer' },
      tenMin: { duration: 10 * 60, label: 'Quick Timer' }
    };
    
    // Stats tracking
    this.stats = this.loadStats();
    
    // Track if sound has been played for current session
    this.soundPlayed = false;
    
    // Load persisted timer state
    this.loadTimerState();
    
    this.initializeElements();
    this.attachEventListeners();
    this.restoreTimerState();
    this.updateDisplay();
    this.updateStats();
    this.loadTheme();
    
    // Save state before page unload
    window.addEventListener('beforeunload', () => this.saveTimerState());
    // Save state when page becomes hidden and restore when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveTimerState();
      } else {
        // Reload and restore state when page becomes visible again
        if (this.isRunning && this.startTime) {
          // Timer was running, reload state to ensure accuracy
          this.loadTimerState();
          this.restoreTimerState();
        }
      }
    });
  }

  initializeElements() {
    this.timerText = document.getElementById('timerText');
    this.timerCircle = document.getElementById('timerCircle');
    this.timerLabel = document.getElementById('timerLabel');
    this.btnStart = document.getElementById('btnStart');
    this.btnPause = document.getElementById('btnPause');
    this.btnReset = document.getElementById('btnReset');
    this.btnSkip = document.getElementById('btnSkip');
    this.modeButtons = {
      pomodoro: document.getElementById('modePomodoro'),
      shortBreak: document.getElementById('modeShortBreak'),
      longBreak: document.getElementById('modeLongBreak'),
      oneMin: document.getElementById('modeOneMin'),
      twoMin: document.getElementById('modeTwoMin'),
      threeMin: document.getElementById('modeThreeMin'),
      tenMin: document.getElementById('modeTenMin')
    };
    this.statPomodoros = document.getElementById('statPomodoros');
    this.statTime = document.getElementById('statTime');
    this.statStreak = document.getElementById('statStreak');
    this.notification = document.getElementById('notification');
    this.notificationText = document.getElementById('notificationText');
    this.themeToggle = document.getElementById('themeToggle');
    this.themeIcon = document.getElementById('themeIcon');
  }

  attachEventListeners() {
    // Mode buttons
    Object.keys(this.modeButtons).forEach(mode => {
      this.modeButtons[mode].addEventListener('click', () => this.switchMode(mode));
    });

    // Control buttons
    this.btnStart.addEventListener('click', () => this.start());
    this.btnPause.addEventListener('click', () => this.pause());
    this.btnReset.addEventListener('click', () => this.reset());
    this.btnSkip.addEventListener('click', () => this.skip());

    // Theme toggle
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Prevent mode switching while running
    Object.values(this.modeButtons).forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isRunning && !btn.classList.contains('active')) {
          e.preventDefault();
          this.showNotification('Please pause or reset the timer first');
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (this.isRunning) {
          this.pause();
        } else {
          this.start();
        }
      }
      if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault();
        this.reset();
      }
    });
  }

  switchMode(mode) {
    if (this.isRunning) return;
    
    this.currentMode = mode;
    this.timeRemaining = this.modes[mode].duration;
    this.soundPlayed = false; // Reset sound flag when switching modes
    
    // Update active button
    Object.keys(this.modeButtons).forEach(m => {
      this.modeButtons[m].classList.remove('active');
    });
    this.modeButtons[mode].classList.add('active');
    
    this.updateDisplay();
    this.updateLabel();
    this.saveTimerState();
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now() - this.pausedTime;
    this.pausedTime = 0; // Reset paused time when starting
    this.soundPlayed = false; // Reset sound flag when starting new session
    
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
    
    this.tick(); // Immediate update
    
    this.btnStart.style.display = 'none';
    this.btnPause.style.display = 'inline-flex';
    this.btnSkip.style.display = 'inline-flex';
    
    // Update label
    this.updateLabel();
    
    // Prevent mode switching
    Object.values(this.modeButtons).forEach(btn => {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.6';
    });
    
    this.saveTimerState();
  }

  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.pausedTime = Date.now() - this.startTime;
    this.startTime = null;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.btnStart.style.display = 'inline-flex';
    this.btnPause.style.display = 'none';
    this.btnSkip.style.display = 'none';
    
    // Allow mode switching
    Object.values(this.modeButtons).forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    });
    
    this.updateLabel();
    this.saveTimerState();
  }

  reset() {
    this.isRunning = false;
    this.pausedTime = 0;
    this.startTime = null;
    this.soundPlayed = false; // Reset sound flag when resetting
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.timeRemaining = this.modes[this.currentMode].duration;
    
    this.btnStart.style.display = 'inline-flex';
    this.btnPause.style.display = 'none';
    this.btnSkip.style.display = 'none';
    
    // Allow mode switching
    Object.values(this.modeButtons).forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    });
    
    this.updateDisplay();
    this.updateLabel();
    this.saveTimerState();
  }

  skip() {
    this.completeSession();
  }

  tick() {
    if (this.timeRemaining <= 0) {
      this.completeSession();
      return;
    }
    
    this.timeRemaining--;
    this.updateDisplay();
    
    // Update document title
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Pomodoro Timer`;
    
    // Save state every 10 seconds to persist progress (less frequent to avoid timing issues)
    if (this.timeRemaining % 10 === 0) {
      this.saveTimerState();
    }
  }

  completeSession() {
    // Prevent multiple calls from triggering multiple sounds
    if (!this.isRunning && this.soundPlayed) {
      return;
    }
    
    this.isRunning = false;
    this.pausedTime = 0;
    this.startTime = null;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Play notification sound only once
    if (!this.soundPlayed) {
      this.playNotificationSound();
      this.soundPlayed = true;
    }
    
    // Update stats if pomodoro completed
    if (this.currentMode === 'pomodoro') {
      this.stats.pomodorosToday++;
      this.stats.totalTime += this.modes.pomodoro.duration;
      this.updateStreak();
      this.saveStats();
      this.updateStats();
      this.showNotification('🎉 Pomodoro completed! Great work!');
    } else if (['oneMin', 'twoMin', 'threeMin', 'tenMin'].includes(this.currentMode)) {
      const minutes = Math.floor(this.modes[this.currentMode].duration / 60);
      this.showNotification(`⏱️ ${minutes}-minute timer completed!`);
    } else {
      this.showNotification(`Break finished! Ready for another Pomodoro?`);
    }
    
    // Reset display
    this.timeRemaining = this.modes[this.currentMode].duration;
    this.updateDisplay();
    
    this.btnStart.style.display = 'inline-flex';
    this.btnPause.style.display = 'none';
    this.btnSkip.style.display = 'none';
    
    // Allow mode switching
    Object.values(this.modeButtons).forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    });
    
    this.updateLabel();
    document.title = 'Pomodoro Timer';
    
    // Save state after completion
    this.saveTimerState();
    
    // Auto-switch to break after pomodoro
    if (this.currentMode === 'pomodoro') {
      setTimeout(() => {
        if (confirm('Pomodoro completed! Start a short break?')) {
          this.switchMode('shortBreak');
        }
      }, 1000);
    }
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    this.timerText.textContent = timeString;
    
    // Update progress circle
    const totalDuration = this.modes[this.currentMode].duration;
    const elapsed = totalDuration - this.timeRemaining;
    const progress = (elapsed / totalDuration) * 360;
    
    // Set CSS variable for progress
    this.timerCircle.style.setProperty('--progress', `${progress}deg`);
    
    // Change color based on mode
    const colors = {
      pomodoro: 'var(--pomodoro-red)',
      shortBreak: 'var(--pomodoro-green)',
      longBreak: 'var(--pomodoro-blue)',
      oneMin: 'var(--pomodoro-blue)',
      twoMin: 'var(--pomodoro-blue)',
      threeMin: 'var(--pomodoro-blue)',
      tenMin: 'var(--pomodoro-blue)'
    };
    
    // Update circle gradient
    const color = colors[this.currentMode] || 'var(--pomodoro-blue)';
    this.timerCircle.style.background = `conic-gradient(
      ${color} 0deg,
      ${color} ${progress}deg,
      var(--border-color) ${progress}deg,
      var(--border-color) 360deg
    )`;
  }

  updateLabel() {
    if (!this.isRunning) {
      this.timerLabel.textContent = 'Ready to focus';
      return;
    }
    
    const labels = {
      pomodoro: 'Focus time in progress...',
      shortBreak: 'Taking a short break',
      longBreak: 'Enjoying a long break',
      oneMin: 'Quick timer running...',
      twoMin: 'Quick timer running...',
      threeMin: 'Quick timer running...',
      tenMin: 'Quick timer running...'
    };
    
    this.timerLabel.textContent = labels[this.currentMode] || 'Timer running...';
  }

  updateStats() {
    this.statPomodoros.textContent = this.stats.pomodorosToday;
    
    const hours = Math.floor(this.stats.totalTime / 3600);
    const minutes = Math.floor((this.stats.totalTime % 3600) / 60);
    if (hours > 0) {
      this.statTime.textContent = `${hours}h ${minutes}m`;
    } else {
      this.statTime.textContent = `${minutes}m`;
    }
    
    this.statStreak.textContent = this.stats.streak;
  }

  updateStreak() {
    const today = new Date().toDateString();
    const lastDate = this.stats.lastPomodoroDate;
    
    if (lastDate === today) {
      // Already counted today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    if (lastDate === yesterdayString) {
      // Consecutive day
      this.stats.streak++;
    } else if (lastDate !== today) {
      // Streak broken
      this.stats.streak = 1;
    }
    
    this.stats.lastPomodoroDate = today;
  }

  loadStats() {
    const saved = localStorage.getItem('pomodoroStats');
    if (saved) {
      const stats = JSON.parse(saved);
      // Reset daily stats if it's a new day
      const today = new Date().toDateString();
      if (stats.lastPomodoroDate !== today) {
        stats.pomodorosToday = 0;
      }
      return stats;
    }
    
    return {
      pomodorosToday: 0,
      totalTime: 0,
      streak: 0,
      lastPomodoroDate: null
    };
  }

  saveStats() {
    localStorage.setItem('pomodoroStats', JSON.stringify(this.stats));
  }

  showNotification(message) {
    this.notificationText.textContent = message;
    this.notification.classList.add('show');
    
    setTimeout(() => {
      this.notification.classList.remove('show');
    }, 3000);
  }

  playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Fallback: browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
          body: this.currentMode === 'pomodoro' ? 'Pomodoro completed!' : 'Break finished!',
          icon: '/favicon.ico'
        });
      }
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    if (this.themeIcon) {
      this.themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (this.themeIcon) {
      this.themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  saveTimerState() {
    const state = {
      currentMode: this.currentMode,
      timeRemaining: this.timeRemaining,
      isRunning: this.isRunning,
      startTime: this.startTime,
      pausedTime: this.pausedTime,
      savedAt: Date.now()
    };
    localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
  }

  loadTimerState() {
    const saved = localStorage.getItem('pomodoroTimerState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.currentMode = state.currentMode || 'pomodoro';
        this.timeRemaining = state.timeRemaining || this.modes[this.currentMode].duration;
        this.wasRunning = state.isRunning || false; // Store original running state
        this.startTime = state.startTime || null;
        this.pausedTime = state.pausedTime || 0;
        this.savedAt = state.savedAt || Date.now();
        this.isRunning = false; // Will be restored in restoreTimerState
      } catch (e) {
        console.error('Error loading timer state:', e);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    this.currentMode = 'pomodoro';
    this.timeRemaining = this.modes[this.currentMode].duration;
    this.isRunning = false;
    this.wasRunning = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.savedAt = Date.now();
    this.soundPlayed = false;
  }

  restoreTimerState() {
    // Restore mode selection UI
    Object.keys(this.modeButtons).forEach(m => {
      this.modeButtons[m].classList.remove('active');
    });
    if (this.modeButtons[this.currentMode]) {
      this.modeButtons[this.currentMode].classList.add('active');
    }

    // If timer was running when page was closed, calculate elapsed time
    if (this.startTime && this.wasRunning) {
      const now = Date.now();
      // Calculate elapsed time since the state was saved, not from startTime
      // This ensures accuracy even if state was saved mid-countdown
      // If savedAt is missing (old state), use startTime as fallback
      const savedTimestamp = this.savedAt || this.startTime;
      let elapsedSinceSave = Math.floor((now - savedTimestamp) / 1000);
      
      // Safety check: if elapsed time is more than the timer duration, something went wrong
      const maxPossibleElapsed = this.modes[this.currentMode].duration;
      elapsedSinceSave = Math.min(elapsedSinceSave, maxPossibleElapsed);
      
      const newTimeRemaining = this.timeRemaining - elapsedSinceSave;
      
      if (newTimeRemaining <= 0) {
        // Timer completed while page was closed
        this.timeRemaining = 0;
        this.isRunning = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.completeSession();
        return;
      } else {
        // Continue from where it left off
        this.timeRemaining = newTimeRemaining;
        // Recalculate startTime based on current remaining time
        const totalDuration = this.modes[this.currentMode].duration;
        const elapsedTotal = totalDuration - this.timeRemaining;
        this.startTime = now - (elapsedTotal * 1000);
        this.isRunning = true;
        
        // Restart the interval
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
          this.tick();
        }, 1000);
        
        // Update UI for running state
        this.btnStart.style.display = 'none';
        this.btnPause.style.display = 'inline-flex';
        this.btnSkip.style.display = 'inline-flex';
        
        // Prevent mode switching
        Object.values(this.modeButtons).forEach(btn => {
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.6';
        });
        
        this.updateLabel();
      }
    } else if (this.pausedTime > 0) {
      // Timer was paused, restore paused state
      this.isRunning = false;
      this.btnStart.style.display = 'inline-flex';
      this.btnPause.style.display = 'none';
      this.btnSkip.style.display = 'none';
      
      // Allow mode switching
      Object.values(this.modeButtons).forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
      
      this.updateLabel();
    } else {
      // Timer was stopped/reset
      this.isRunning = false;
      this.btnStart.style.display = 'inline-flex';
      this.btnPause.style.display = 'none';
      this.btnSkip.style.display = 'none';
      
      // Allow mode switching
      Object.values(this.modeButtons).forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
      
      this.updateLabel();
    }
  }
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Initialize timer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pomodoroTimer = new PomodoroTimer();
});

