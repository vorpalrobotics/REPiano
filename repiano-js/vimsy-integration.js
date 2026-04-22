"use strict";

// ============================================================================
// VIMSY INTEGRATION - Buffered Upload Strategy
// ============================================================================
// This module handles integration with Vimsy for logging piano practice
// as Mind activities. Uses a buffering strategy to minimize Firestore quota.

let vimsyAuth = null;
let vimsyDb = null;
let vimsyCurrentUser = null;
let vimsyStatusMonitor = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initVimsy() {
  console.log('[Vimsy] Initializing Firebase...');
  
  try {
    const app = firebase.initializeApp(firebaseConfig);
    vimsyAuth = firebase.auth();
    vimsyDb = firebase.firestore();
    
    console.log('[Vimsy] Firebase initialized successfully');
    
    // Listen for auth state changes
    vimsyAuth.onAuthStateChanged((user) => {
      console.log('[Vimsy] Auth state changed:', user ? user.email : 'signed out');
      vimsyCurrentUser = user;
      updateVimsyUI();
    });
    
    // Check for old buffer that needs flushing
    checkAndFlushOldBuffer();
    
  } catch (error) {
    console.error('[Vimsy] Initialization failed:', error);
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function loginToVimsy() {
  console.log('[Vimsy] Starting login flow...');
  logVimsyActivity('Starting login...', 'info');
  
  const provider = new firebase.auth.GoogleAuthProvider();
  
  vimsyAuth.signInWithPopup(provider)
    .then((result) => {
      vimsyCurrentUser = result.user;
      console.log('[Vimsy] Login successful:', {
        uid: vimsyCurrentUser.uid,
        email: vimsyCurrentUser.email,
        displayName: vimsyCurrentUser.displayName
      });
      
      logVimsyActivity('✓ Login successful: ' + vimsyCurrentUser.email, 'success');
      updateVimsyUI();
      
      // Clear the initial "Waiting for login" message
      const logContainer = document.getElementById('vimsyActivityLog');
      if (logContainer && logContainer.children.length > 0) {
        // Remove any "Waiting for login" messages
        Array.from(logContainer.children).forEach(child => {
          if (child.textContent.includes('Waiting for login')) {
            child.remove();
          }
        });
      }
      
      // Enable Vimsy sync by default after first login
      if (!localStorage.getItem('vimsyEnabled')) {
        localStorage.setItem('vimsyEnabled', 'true');
      }
    })
    .catch((error) => {
      console.error('[Vimsy] Login failed:', error);
      logVimsyActivity('✗ Login failed: ' + error.message, 'error');
      alert('Login failed: ' + error.message);
    });
}

function logoutFromVimsy() {
  console.log('[Vimsy] Logging out...');
  
  vimsyAuth.signOut()
    .then(() => {
      vimsyCurrentUser = null;
      logVimsyActivity('Logged out successfully', 'info');
      updateVimsyUI();
    })
    .catch((error) => {
      console.error('[Vimsy] Logout failed:', error);
      alert('Logout failed: ' + error.message);
    });
}

// ============================================================================
// BUFFER MANAGEMENT
// ============================================================================

function getVimsyBuffer() {
  const bufferStr = localStorage.getItem('vimsyBuffer');
  if (!bufferStr) {
    return null;
  }
  
  try {
    return JSON.parse(bufferStr);
  } catch (error) {
    console.error('[Vimsy] Failed to parse buffer:', error);
    return null;
  }
}

function saveVimsyBuffer(buffer) {
  localStorage.setItem('vimsyBuffer', JSON.stringify(buffer));
  updateVimsyUI();
}

function clearVimsyBuffer() {
  console.log('[Vimsy] Clearing buffer');
  localStorage.removeItem('vimsyBuffer');
  updateVimsyUI();
}

function addToVimsyBuffer(durationMs, itemName) {
  console.log('[Vimsy] Adding to buffer:', { durationMs, itemName });
  
  // Check if Vimsy is enabled
  if (!isVimsyEnabled()) {
    console.log('[Vimsy] Sync disabled, skipping buffer add');
    return;
  }
  
  // Convert duration to minutes (with fractions)
  const durationMinutes = durationMs / (1000 * 60);
  const today = todayDate(); // Use existing todayDate() function
  
  // Load or create buffer
  let buffer = getVimsyBuffer();
  
  if (!buffer || buffer.date !== today) {
    // Start new buffer for today
    console.log('[Vimsy] Starting new buffer for', today);
    buffer = {
      startTime: new Date().toISOString(),
      totalMinutes: 0,
      items: [],
      date: today
    };
  }
  
  // Add duration
  buffer.totalMinutes += durationMinutes;
  
  // Add item name (avoid duplicates)
  if (!buffer.items.includes(itemName)) {
    buffer.items.push(itemName);
  }
  
  // Save buffer
  saveVimsyBuffer(buffer);
  
  console.log('[Vimsy] Buffer updated:', {
    totalMinutes: buffer.totalMinutes.toFixed(2),
    itemCount: buffer.items.length,
    items: buffer.items.join(', ')
  });
  
  // Check if should flush
  if (shouldFlushBuffer(buffer)) {
    console.log('[Vimsy] Buffer threshold reached, flushing...');
    flushVimsyBuffer();
  }
}

function shouldFlushBuffer(buffer) {
  if (!buffer) return false;
  
  const bufferHours = parseFloat(localStorage.getItem('vimsyBufferHours') || '1.0');
  const bufferMs = bufferHours * 60 * 60 * 1000;
  
  const startTime = new Date(buffer.startTime);
  const now = new Date();
  const elapsed = now - startTime;
  
  // Flush if buffer is older than threshold
  if (elapsed >= bufferMs) {
    console.log('[Vimsy] Buffer age:', (elapsed / 1000 / 60).toFixed(1), 'minutes, threshold:', (bufferMs / 1000 / 60).toFixed(1), 'minutes');
    return true;
  }
  
  return false;
}

function checkAndFlushOldBuffer() {
  const buffer = getVimsyBuffer();
  if (!buffer) return;
  
  const today = todayDate();
  
  // Flush if from previous day
  if (buffer.date !== today) {
    console.log('[Vimsy] Buffer is from previous day, flushing...');
    flushVimsyBuffer();
    return;
  }
  
  // Flush if older than threshold
  if (shouldFlushBuffer(buffer)) {
    console.log('[Vimsy] Buffer is older than threshold, flushing...');
    flushVimsyBuffer();
  }
}

async function flushVimsyBuffer() {
  const buffer = getVimsyBuffer();
  
  if (!buffer) {
    console.log('[Vimsy] No buffer to flush');
    return;
  }
  
  if (buffer.totalMinutes === 0) {
    console.log('[Vimsy] Buffer is empty, clearing');
    clearVimsyBuffer();
    return;
  }
  
  // Check auth state from Firebase directly
  const currentUser = vimsyAuth ? vimsyAuth.currentUser : null;
  if (!currentUser) {
    console.log('[Vimsy] Not logged in, cannot flush buffer');
    logVimsyActivity('⚠ Cannot sync: Not logged in', 'warning');
    return;
  }
  
  // Update cached user
  vimsyCurrentUser = currentUser;
  
  console.log('[Vimsy] Flushing buffer:', buffer);
  logVimsyActivity('📤 Syncing ' + buffer.totalMinutes.toFixed(1) + ' minutes...', 'info');
  
  try {
    // Create Vimsy import document
    const documentId = `repiano-${Date.now()}`;
    const now = new Date();
    
    const importDoc = {
      metadata: {
        appId: "repiano",
        appName: "REPiano - Piano Practice Tracker",
        version: "1.0",
        timestamp: now.toISOString(),
        userId: currentUser.uid,
        documentId: documentId
      },
      data: {
        type: "Mind",
        items: [{
          date: buffer.date,
          activityId: 6,  // Musical instrument practice
          duration: Math.round(buffer.totalMinutes * 10) / 10,  // Round to 1 decimal
          notes: "Practiced: " + buffer.items.join(', '),
          customFields: {
            sessionCount: buffer.items.length,
            startTime: new Date(buffer.startTime).toTimeString().substring(0, 5),
            instrument: "piano",
            app: "REPiano"
          }
        }]
      },
      status: "pending",
      processedAt: null,
      errors: []
    };
    
    // Upload to Firestore
    const docPath = `users/${currentUser.uid}/externalAppData/repiano/documents/${documentId}`;
    console.log('[Vimsy] Uploading to:', docPath);
    
    await vimsyDb.doc(docPath).set(importDoc);
    
    console.log('[Vimsy] Upload successful');
    logVimsyActivity('✓ Synced ' + buffer.totalMinutes.toFixed(1) + ' min: ' + buffer.items.join(', '), 'success');
    
    // Update last upload time
    localStorage.setItem('vimsyLastUpload', now.toISOString());
    
    // Monitor status
    monitorUploadStatus(docPath);
    
    // Clear buffer
    clearVimsyBuffer();
    
  } catch (error) {
    console.error('[Vimsy] Upload failed:', error);
    logVimsyActivity('✗ Sync failed: ' + error.message, 'error');
    alert('Failed to sync with Vimsy: ' + error.message);
  }
}

function monitorUploadStatus(docPath) {
  console.log('[Vimsy] Monitoring status for:', docPath);
  
  // Unsubscribe from previous monitor if exists
  if (vimsyStatusMonitor) {
    vimsyStatusMonitor();
  }
  
  vimsyStatusMonitor = vimsyDb.doc(docPath).onSnapshot((snapshot) => {
    const doc = snapshot.data();
    if (!doc) return;
    
    console.log('[Vimsy] Status update:', doc.status);
    
    if (doc.status === 'processed') {
      logVimsyActivity('✓ Vimsy processed successfully', 'success');
      // Optionally delete the document after processing
      vimsyDb.doc(docPath).delete().catch(err => console.error('[Vimsy] Delete failed:', err));
      if (vimsyStatusMonitor) {
        vimsyStatusMonitor();
        vimsyStatusMonitor = null;
      }
    } else if (doc.status === 'error') {
      const errors = doc.errors.join(', ');
      logVimsyActivity('✗ Vimsy processing failed: ' + errors, 'error');
      if (vimsyStatusMonitor) {
        vimsyStatusMonitor();
        vimsyStatusMonitor = null;
      }
    }
  });
}

// ============================================================================
// PREFERENCES
// ============================================================================

function isVimsyEnabled() {
  return localStorage.getItem('vimsyEnabled') === 'true';
}

function getVimsyPreferences() {
  return {
    enabled: localStorage.getItem('vimsyEnabled') === 'true',
    autoSync: localStorage.getItem('vimsyAutoSync') !== 'false',  // Default true
    includeFreePlay: localStorage.getItem('vimsyIncludeFreePlay') !== 'false',  // Default true
    includePractice: localStorage.getItem('vimsyIncludePractice') !== 'false',  // Default true
    bufferHours: parseFloat(localStorage.getItem('vimsyBufferHours') || '1.0'),
    activityId: parseInt(localStorage.getItem('vimsyActivityId') || '6')
  };
}

function setVimsyPreference(key, value) {
  localStorage.setItem('vimsy' + key.charAt(0).toUpperCase() + key.slice(1), value.toString());
  updateVimsyUI();
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateVimsyUI() {
  // Update status box
  const statusBox = document.getElementById('vimsyStatusBox');
  const statusText = document.getElementById('vimsyStatusText');
  const loginSection = document.getElementById('vimsyLoginSection');
  const logoutSection = document.getElementById('vimsyLogoutSection');
  const bufferSection = document.getElementById('vimsyBufferSection');
  
  if (!statusBox) return; // Modal not open yet
  
  if (vimsyCurrentUser) {
    statusBox.className = 'vimsy-status-box connected';
    statusText.innerHTML = `<strong>Status:</strong> 🟢 Connected as ${vimsyCurrentUser.email}`;
    loginSection.style.display = 'none';
    logoutSection.style.display = 'block';
    bufferSection.style.display = 'block';
    
    // Update buffer display
    updateBufferDisplay();
  } else {
    statusBox.className = 'vimsy-status-box';
    statusText.innerHTML = '<strong>Status:</strong> ⚫ Not Connected';
    loginSection.style.display = 'block';
    logoutSection.style.display = 'none';
    bufferSection.style.display = 'none';
  }
  
  // Update preferences checkboxes
  const prefs = getVimsyPreferences();
  const autoSyncCheck = document.getElementById('vimsyAutoSyncCheck');
  const freePlayCheck = document.getElementById('vimsyIncludeFreePlayCheck');
  const practiceCheck = document.getElementById('vimsyIncludePracticeCheck');
  const bufferHoursInput = document.getElementById('vimsyBufferHoursInput');
  
  if (autoSyncCheck) autoSyncCheck.checked = prefs.autoSync;
  if (freePlayCheck) freePlayCheck.checked = prefs.includeFreePlay;
  if (practiceCheck) practiceCheck.checked = prefs.includePractice;
  if (bufferHoursInput) bufferHoursInput.value = prefs.bufferHours;
}

function updateBufferDisplay() {
  const buffer = getVimsyBuffer();
  const bufferDisplay = document.getElementById('vimsyBufferDisplay');
  
  if (!bufferDisplay) return;
  
  if (!buffer || buffer.totalMinutes === 0) {
    bufferDisplay.innerHTML = '<em style="color:#999">No practice data buffered yet</em>';
    return;
  }
  
  const startTime = new Date(buffer.startTime);
  const now = new Date();
  const elapsedMinutes = Math.floor((now - startTime) / 1000 / 60);
  const bufferHours = parseFloat(localStorage.getItem('vimsyBufferHours') || '1.0');
  const thresholdMinutes = Math.floor(bufferHours * 60);
  const remainingMinutes = Math.max(0, thresholdMinutes - elapsedMinutes);
  
  const itemsPreview = buffer.items.length > 3 
    ? buffer.items.slice(0, 3).join(', ') + '...'
    : buffer.items.join(', ');
  
  bufferDisplay.innerHTML = `
    <div style="margin-bottom:8px"><strong>Started:</strong> ${startTime.toLocaleTimeString()} (${elapsedMinutes} min ago)</div>
    <div style="margin-bottom:8px"><strong>Duration:</strong> ${buffer.totalMinutes.toFixed(1)} minutes</div>
    <div style="margin-bottom:8px"><strong>Items:</strong> ${buffer.items.length} (${itemsPreview})</div>
    <div style="color:#666;font-size:small">
      ${remainingMinutes > 0 
        ? `Next auto-sync: in ${remainingMinutes} minutes` 
        : '⏰ Ready to sync!'}
    </div>
  `;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

function logVimsyActivity(message, type = 'info') {
  console.log('[Vimsy Activity]', type, message);
  
  const logContainer = document.getElementById('vimsyActivityLog');
  if (!logContainer) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'vimsy-log-entry ' + type;
  entry.innerHTML = `
    <span class="vimsy-log-time">${timestamp}</span>
    <span class="vimsy-log-message">${message}</span>
  `;
  
  // Add to top of log
  logContainer.insertBefore(entry, logContainer.firstChild);
  
  // Keep only last 20 entries
  while (logContainer.children.length > 20) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

function clearVimsyLog() {
  const logContainer = document.getElementById('vimsyActivityLog');
  if (logContainer) {
    logContainer.innerHTML = '<div class="vimsy-log-entry info"><span class="vimsy-log-time">Ready</span><span class="vimsy-log-message">Log cleared</span></div>';
  }
}

// ============================================================================
// MODAL CONTROL
// ============================================================================

function showVimsyModal() {
  animateOpen('vimsyContainer');
  updateVimsyUI();
}

function closeVimsyModal() {
  animateClose('vimsyContainer');
}

// ============================================================================
// MANUAL ACTIONS
// ============================================================================

function manualSyncNow() {
  console.log('[Vimsy] Manual sync triggered');
  logVimsyActivity('Manual sync requested', 'info');
  flushVimsyBuffer();
}

function manualClearBuffer() {
  if (confirm('Clear the current practice buffer? This will discard unsaved practice data.')) {
    clearVimsyBuffer();
    logVimsyActivity('Buffer cleared manually', 'info');
  }
}
