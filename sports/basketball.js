// This file exports ONE object: the 'basketball' module.

// Import the firebase services we need
import { db, firebase } from '../modules/firebase.js';
import { buildHtml } from './basketball-view.js';

// Get access to the global utilities from main.js
let $;
let $$;
let showToast;
let copyToClipboard;

// ================== MODULE-SPECIFIC STATE ==================

const state = {
    view: 'landing', // Default view is the landing/welcome page
    isHost: false,
    user: null, // Will be set by init
    gameCode: null,
    game: null,
    gameType: 'friendly',
    timers: {
        masterTimer: null,
        autoSave: null,
        shotClockTimer: null
    },
    selectedPlayer: null,
    actionHistory: [], // For the Undo feature
    clockEditing: false,
    firestoreListener: null,
    // --- NEW: Theme state for viewer ---
    viewerTheme: localStorage.getItem('viewerTheme') || 'system', // 'system', 'light', 'dark', 'professional'
};

// ================== ALL BASKETBALL FUNCTIONS ==================

function formatTime(minutes, seconds) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generateGameCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- NEW: Snapshot state for Undo feature ---
function snapshotState(actionDescription) {
    if (!state.isHost) return;
    
    state.actionHistory.push({ 
        description: actionDescription, 
        gameData: JSON.parse(JSON.stringify(state.game)) // Deep copy
    });
    
    // Limit history size
    if (state.actionHistory.length > 20) {
        state.actionHistory.shift();
    }
    
    // Enable the undo button
    const undoBtn = $('undoBtn');
    if (undoBtn) undoBtn.disabled = false;
}

// --- NEW: Undo last action ---
function handleUndo() {
    if (!state.isHost || state.actionHistory.length === 0) {
        showToast("Nothing to undo", "warning");
        return;
    }
    
    const lastAction = state.actionHistory[state.actionHistory.length - 1];
    showUndoConfirmation(lastAction.description);
}

function showUndoConfirmation(description) {
    const modal = $('undoModal');
    if (!modal) return;
    
    $('undoMessage').textContent = `Undo: "${description}"?`;
    modal.classList.remove('hidden');

    $('confirmUndo').onclick = () => {
        const lastState = state.actionHistory.pop();
        if (lastState) {
            state.game = lastState.gameData; // Revert to the old state
            
            if (state.actionHistory.length === 0) {
                $('undoBtn').disabled = true;
            }
            
            // Need to stop/start timers based on reverted state
            stopMasterTimer();
            if (state.game.gameState.gameRunning || state.game.gameState.shotClockRunning) {
                startMasterTimer();
            }
            
            updateControlDisplay();
            saveGameState(); // Save the reverted state
            showToast("Action undone", "success");
        }
        modal.classList.add('hidden');
    };
    
    $('cancelUndo').onclick = () => {
        modal.classList.add('hidden');
    };
}


function showView(viewName) {
    console.log(`Switching to view: ${viewName}`);
    // Added classic and pro viewer views
    const views = ['landing-view', 'config-view', 'setup-view', 'pre-game-view', 'control-view', 'viewer-view-pro', 'viewer-view-classic'];
    
    views.forEach(view => {
        const element = $(view);
        if (element) {
            if (view === viewName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    });
    
    state.view = viewName;

    // --- BUG FIX: Attach pre-game handlers when switching to pre-game view ---
    if (viewName === 'pre-game-view') {
        setupPreGameHandlers();
    }
    
    // Apply theme on view switch to ensure persistence, particularly for the host
    if (viewName.startsWith('viewer')) {
        setViewerTheme(state.viewerTheme);
    } else {
        // Reset global theme to system/saved for non-viewer pages
        document.documentElement.removeAttribute('data-color-scheme');
        const rootContainer = $('root-container');
        if (rootContainer) rootContainer.classList.remove('viewer-theme-professional');
    }

    if (viewName === 'landing-view' || viewName === 'config-view') {
        if (state.firestoreListener) {
            state.firestoreListener(); 
            state.firestoreListener = null;
            console.log('Detached Firestore listener.');
        }
        stopMasterTimer();
        state.actionHistory = []; // Clear undo history
        if($('undoBtn')) $('undoBtn').disabled = true;
    }
}

function playShotClockViolationBuzzer() {
    const buzzer = $('buzzerSound');
    if (buzzer) {
        buzzer.currentTime = 0;
        buzzer.play().catch(e => console.log('Audio play failed:', e));
    }
    
    const violationAlert = $('shotClockViolation');
    if (violationAlert) {
        violationAlert.classList.remove('hidden');
        setTimeout(() => {
            violationAlert.classList.add('hidden');
        }, 2000);
    }
}

// --- UPDATED: Toast message changed per user request ---
function handleShotClockViolation() {
    console.log('Shot clock violation!');
    playShotClockViolationBuzzer();
    showToast('SHOT CLOCK VIOLATION!', 'error', 3000);
    
    if (state.game) {
        snapshotState("Shot Clock Violation"); // Log for undo
        state.game.gameState.shotClockRunning = false;
        const currentPossession = state.game.gameState.possession;
        const newPossession = currentPossession === 'teamA' ? 'teamB' : 'teamA';
        state.game.gameState.possession = newPossession;
        state.game.gameState.shotClock = 0;
        updateControlDisplay();
        saveGameState();
        // --- NEW MESSAGE ---
        showToast('Shot clock stopped - press ENTER to reset and start the clock.', 'warning', 4000);
    }
}

// --- MODIFIED: Implemented Delta Time Logic to prevent clock drift ---
function startMasterTimer() {
    if (state.timers.masterTimer) {
        clearInterval(state.timers.masterTimer);
    }
    
    let lastTick = Date.now(); // Initialize last tick time

    state.timers.masterTimer = setInterval(() => {
        if (!state.game) {
            stopMasterTimer();
            return;
        }

        const now = Date.now();
        const delta = now - lastTick; 

        if (delta >= 1000) {
            const secondsPassed = Math.floor(delta / 1000);
            lastTick = now - (delta % 1000); 

            let updated = false;

            // --- GAME CLOCK LOGIC ---
            if (state.game.gameState.gameRunning) {
                let totalSeconds = (state.game.gameState.gameTime.minutes * 60) + state.game.gameState.gameTime.seconds;
                
                if (totalSeconds > 0) {
                    totalSeconds = Math.max(0, totalSeconds - secondsPassed); 
                    state.game.gameState.gameTime.minutes = Math.floor(totalSeconds / 60);
                    state.game.gameState.gameTime.seconds = totalSeconds % 60;
                    updated = true;
                } else {
                    // Time is up logic...
                    state.game.gameState.gameRunning = false;
                    state.game.gameState.shotClockRunning = false;
                    if(state.isHost) {
                        showToast('Period ended!', 'warning', 3000);
                        saveGameState();
                    }
                }
            }
            
            // --- SHOT CLOCK LOGIC ---
            if (state.game.gameState.shotClockRunning && state.game.settings.shotClockDuration > 0) {
                if (state.game.gameState.shotClock > 0) {
                    state.game.gameState.shotClock = Math.max(0, state.game.gameState.shotClock - secondsPassed);
                    updated = true;
                    
                    if (state.game.gameState.shotClock <= 5) {
                        $('shotClockDisplay')?.classList.add('warning');
                        $('viewerShotClock')?.classList.add('warning');
                        $('classicViewerShotClock')?.classList.add('warning');
                    }
                } else {
                    if (state.isHost) {
                        handleShotClockViolation();
                    } else {
                        state.game.gameState.shotClockRunning = false;
                    }
                    updated = true;
                }
            }


            if (updated) {
                if (state.view.startsWith('control')) updateControlDisplay();
                if (state.view.startsWith('viewer')) updateSpectatorView();
            }

            if (!state.game.gameState.gameRunning && !state.game.gameState.shotClockRunning) {
                stopMasterTimer();
                if (state.view.startsWith('control') && $('startGameBtn')) updateMasterStartButton();
            }
        }
    }, 100); // Check every 100ms for higher precision
}

function stopMasterTimer() {
    if (state.timers.masterTimer) {
        clearInterval(state.timers.masterTimer);
        state.timers.masterTimer = null;
    }
    if (state.view.startsWith('control') && $('startGameBtn')) updateMasterStartButton();
}

function toggleMasterGame() {
    if (!state.game || !state.isHost) return;
    
    // Snapshot the state BEFORE changing it
    snapshotState(state.game.gameState.gameRunning || state.game.gameState.shotClockRunning ? "Pause Game" : "Start Game");

    if (state.game.gameState.gameRunning || state.game.gameState.shotClockRunning) {
        state.game.gameState.gameRunning = false;
        state.game.gameState.shotClockRunning = false;
        stopMasterTimer();
        showToast('Game paused', 'info', 1500);
    } else {
        state.game.gameState.gameRunning = true;
        if (state.game.settings.shotClockDuration > 0 && state.game.gameState.shotClock > 0) {
            state.game.gameState.shotClockRunning = true;
        }
        startMasterTimer();
        showToast('Game started!', 'success', 1500);
    }
    
    updateMasterStartButton();
    saveGameState();
}

function updateMasterStartButton() {
    const btn = $('startGameBtn');
    if (!btn || !state.game) return;
    
    if (state.game.gameState.gameRunning || state.game.gameState.shotClockRunning) {
        btn.textContent = 'PAUSE (Space)';
        btn.className = 'btn btn--primary master-start-btn pause';
    } else {
        btn.textContent = 'START (Space)';
        btn.className = 'btn btn--primary master-start-btn resume';
    }
}

function showResetAllModal() {
    const modal = $('resetAllModal');
    modal.classList.remove('hidden');
    
    $('confirmResetAll').onclick = () => {
        modal.classList.add('hidden');
        resetAllClocks(); // Call the actual function
    };
    $('cancelResetAll').onclick = () => {
        modal.classList.add('hidden');
    };
}

function resetAllClocks() {
    if (!state.game || !state.isHost) return;
    snapshotState("Reset All Clocks"); // Log for undo
    
    state.game.gameState.gameTime.minutes = state.game.settings.periodDuration;
    state.game.gameState.gameTime.seconds = 0;
    
    if (state.game.settings.shotClockDuration > 0) {
        state.game.gameState.shotClock = state.game.settings.shotClockDuration;
    }
    state.game.gameState.gameRunning = false;
    state.game.gameState.shotClockRunning = false;
    removeShotClockWarning();
    updateControlDisplay();
    saveGameState();
    showToast('All clocks reset', 'info', 1500);
}

function removeShotClockWarning() {
    $('shotClockDisplay')?.classList.remove('warning');
    $('viewerShotClock')?.classList.remove('warning');
    $('classicViewerShotClock')?.classList.remove('warning');
}

function resetShotClockTo14() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    snapshotState("Reset Shot Clock (14s)"); // Log for undo
    
    state.game.gameState.shotClock = 14;
    removeShotClockWarning();
    updateControlDisplay();
    saveGameState();
    showToast('Shot clock reset to 14s', 'info', 1500);
}

// Renamed from resetShotClockTo24
function resetShotClockDefault() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    snapshotState("Reset Shot Clock (Full)"); // Log for undo
    
    state.game.gameState.shotClock = state.game.settings.shotClockDuration;
    removeShotClockWarning();
    updateControlDisplay();
    saveGameState();
    showToast(`Shot clock reset to ${state.game.settings.shotClockDuration}s`, 'info', 1500);
}

// --- NEW: Function for Enter key ---
function resetShotClockDefaultAndStart() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    snapshotState("Reset Shot Clock & Start"); // Log for undo
    
    state.game.gameState.shotClock = state.game.settings.shotClockDuration;
    removeShotClockWarning();
    
    // Auto-start game clock if it's paused
    if (!state.game.gameState.gameRunning) {
        state.game.gameState.gameRunning = true;
    }
    state.game.gameState.shotClockRunning = true;
    startMasterTimer(); // This will start both
    
    updateControlDisplay();
    saveGameState();
    showToast(`Shot clock reset & started`, 'success', 1500);
}


function startShotClockOnly() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    if (state.game.gameState.shotClock <= 0) {
        showToast('Reset shot clock first', 'warning', 2000);
        return;
    }
    snapshotState("Start Shot Clock Only"); // Log for undo
    
    state.game.gameState.shotClockRunning = true;
    startMasterTimer();
    showToast('Shot clock started', 'success', 1500);
    updateControlDisplay();
    saveGameState();
}

function showEditClockModal() {
    if (!state.isHost) return;
    const modal = $('editClockModal');
    const editMinutes = $('editMinutes');
    const editSeconds = $('editSeconds');
    if (!modal || !state.game) return;
    
    editMinutes.value = state.game.gameState.gameTime.minutes;
    editSeconds.value = state.game.gameState.gameTime.seconds;
    modal.classList.remove('hidden');
    state.clockEditing = true;
    
    $('saveClockEdit').onclick = () => {
        snapshotState("Edit Game Clock"); // Log for undo
        state.game.gameState.gameTime.minutes = Math.max(0, parseInt(editMinutes.value) || 0);
        state.game.gameState.gameTime.seconds = Math.max(0, Math.min(59, parseInt(editSeconds.value) || 0));
        updateControlDisplay();
        saveGameState();
        modal.classList.add('hidden');
        state.clockEditing = false;
        showToast('Game clock updated', 'success', 1500);
    };
    $('cancelClockEdit').onclick = () => {
        modal.classList.add('hidden');
        state.clockEditing = false;
    };
}

function showEditShotClockModal() {
    if (!state.isHost) return;
    const modal = $('editShotClockModal');
    const editShotClockSeconds = $('editShotClockSeconds');
    if (!modal || !state.game || state.game.settings.shotClockDuration === 0) return;
    
    editShotClockSeconds.value = state.game.gameState.shotClock;
    modal.classList.remove('hidden');
    state.clockEditing = true;
    
    $('saveShotClockEdit').onclick = () => {
        snapshotState("Edit Shot Clock"); // Log for undo
        state.game.gameState.shotClock = Math.max(0, Math.min(60, parseInt(editShotClockSeconds.value) || 0));
        removeShotClockWarning();
        updateControlDisplay();
        saveGameState();
        modal.classList.add('hidden');
        state.clockEditing = false;
        showToast('Shot clock updated', 'success', 1500);
    };
    $('cancelShotClockEdit').onclick = () => {
        modal.classList.add('hidden');
        state.clockEditing = false;
    };
}

function showFinalizeGameModal() {
    if (!state.isHost) return;
    const modal = $('finalizeGameModal');
    modal.classList.remove('hidden');
    
    $('cancelFinalize').onclick = () => {
        modal.classList.add('hidden');
    };
    $('confirmFinalize').onclick = () => {
        finalizeGame();
        modal.classList.add('hidden');
    };
}

function showGuestHostModal() {
    // Only show this once per session
    if (!sessionStorage.getItem('guestWarningShown')) {
        const modal = $('guestHostModal');
        modal.classList.remove('hidden');
        $('confirmGuestHost').onclick = () => {
            modal.classList.add('hidden');
            sessionStorage.setItem('guestWarningShown', 'true');
        };
    }
}

// --- NEW: Theme Settings Modal for Spectators ---
function showViewerSettingsModal() {
    const modal = $('viewerSettingsModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    $('closeViewerSettingsModal').onclick = () => {
        modal.classList.add('hidden');
    };
    
    // Highlight the currently selected theme button
    $$('.viewer-theme-btn').forEach(btn => {
        btn.classList.remove('btn--primary');
        btn.classList.add('btn--secondary');
        
        // Reset border styles for clarity
        btn.style.border = "1px solid var(--color-border)";
        
        if (btn.dataset.theme === state.viewerTheme) {
            btn.classList.add('btn--primary');
            btn.classList.remove('btn--secondary');
            btn.style.border = "2px solid var(--color-primary)";
        }
    });

    // Attach click listeners to all theme buttons
    $$('.viewer-theme-btn').forEach(btn => {
        btn.onclick = () => {
            setViewerTheme(btn.dataset.theme);
            showViewerSettingsModal(); // Re-render the modal to update button style
        };
    });
}

// --- NEW: Function to set viewer theme ---
function setViewerTheme(theme) {
    if (!theme) return;
    
    state.viewerTheme = theme;
    localStorage.setItem('viewerTheme', theme);
    
    const html = document.documentElement;
    const rootContainer = $('root-container');
    
    // Reset base states
    html.removeAttribute('data-color-scheme');
    if (rootContainer) {
        rootContainer.classList.remove('viewer-theme-professional');
    }
    
    // 1. Handle Light Theme
    if (theme === 'light') {
        html.setAttribute('data-color-scheme', 'light');
    } 
    // 2. Handle Professional LED Theme
    else if (theme === 'professional') {
        // Force dark mode base so the rest of the UI (modals etc) looks correct
        html.setAttribute('data-color-scheme', 'dark');
        
        // Add the special class to the container
        if (rootContainer) {
            rootContainer.classList.add('viewer-theme-professional');
        }
    }
    // 3. System/Normal (Default)
    else {
        // Do nothing, let system preference or theme-loader.js handle it
    }
    
    // Force update the scoreboard values so colors/fonts redraw immediately
    updateSpectatorView();
}


async function finalizeGame() {
    if (!state.game || !state.isHost) return;
    
    snapshotState("Finalize Game"); // Log for undo (though it's final)
    
    // Stop all clocks
    state.game.gameState.gameRunning = false;
    state.game.gameState.shotClockRunning = false;
    stopMasterTimer();
    
    // Set status to final
    state.game.status = 'final';
    
    // Save one last time
    await saveGameState();
    
    showToast('Game finalized! Returning to home.', 'success', 3000);
    
    // Redirect to dashboard
    setTimeout(() => {
        // Only redirect logged-in users. Guests go back to their landing page.
        if (state.user) {
            window.location.href = 'sports.html?mode=host';
        } else {
            showView('landing-view');
        }
    }, 2000);
}


function createGameSkeleton(code, config = {}) {
    const hostId = state.user ? state.user.uid : null;
    
    return {
        hostId: hostId, // This will be null for guests
        code: code,
        gameType: state.gameType,
        sport: 'basketball', 
        status: 'live', 
        settings: {
            gameName: config.gameName || 'Basketball Game',
            periodDuration: config.periodDuration || 12,
            shotClockDuration: config.shotClockDuration || 24,
            timeoutsPerTeam: config.timeoutsPerTeam || 7,
            periodType: config.periodType || 'quarter', // NEW
            periodCount: config.periodType === 'half' ? 2 : 4 // NEW
        },
        teamA: {
            name: config.teamAName || 'Team A',
            color: config.teamAColor || '#EA4335',
            score: 0,
            timeouts: config.timeoutsPerTeam || 7,
            fouls: 0,
            roster: [],
            stats: {}
        },
        teamB: {
            name: config.teamBName || 'Team B',
            color: config.teamBColor || '#4285F4',
            score: 0,
            timeouts: config.timeoutsPerTeam || 7,
            fouls: 0,
            roster: [],
            stats: {}
        },
        gameState: {
            period: 1, // Store period as a 1-based number
            gameTime: {
                minutes: config.periodDuration || 12,
                seconds: 0
            },
            shotClock: config.shotClockDuration || 24,
            possession: 'teamA',
            gameRunning: false,
            shotClockRunning: false
        },
        lastUpdate: Date.now()
    };
}

async function saveGameState() {
    if (!state.isHost) return; 

    if (state.game && state.gameCode && db) {
        try {
            state.game.lastUpdate = Date.now();
            await db.collection('games').doc(state.gameCode).set(state.game);
        } catch (e) {
            console.warn('Failed to save game to Firebase:', e);
            showToast('Game sync failed. Check connection.', 'error', 3000);
        }
    }
}

async function updateUserProfileWithGame(gameCode) {
    if (!state.user || !db || !firebase) return; 
    
    const userRef = db.collection('users').doc(state.user.uid);
    
    try {
        await userRef.update({
            hostedGames: firebase.firestore.FieldValue.arrayUnion(gameCode) 
        });
        console.log('User profile updated with new game.');
    } catch (error) {
        if (error.code === 'not-found') {
            console.warn('User profile not found, could not update hosted games.');
        } else {
            console.error('Error updating user profile:', error);
        }
    }
}

async function loadGameState(code) {
    if (!db) {
        showToast('Database not connected', 'error', 3000);
        return null;
    }
    try {
        const doc = await db.collection('games').doc(code).get();
        if (doc.exists) {
            return doc.data();
        } else {
            console.warn(`Game doc '${code}' does not exist`);
            return null;
        }
    } catch (e) {
        console.warn('Failed to load game from Firebase:', e);
        return null;
    }
}

function getTopScorer(team) {
    if (!state.game || !state.game[team] || !state.game[team].stats) return null;
    let topScorer = null;
    let highestPoints = 0;
    const stats = state.game[team].stats;
    const roster = state.game[team].roster;
    
    Object.keys(stats).forEach(playerNumber => {
        const playerStats = stats[playerNumber];
        if (playerStats && playerStats.totalPoints > highestPoints) {
            highestPoints = playerStats.totalPoints;
            topScorer = {
                number: playerNumber,
                name: roster.find(p => p.number == playerNumber)?.name || `#${playerNumber}`,
                points: playerStats.totalPoints
            };
        }
    });
    return topScorer;
}

function updateTopScorerDisplay() {
    const teamATopScorer = getTopScorer('teamA');
    const teamBTopScorer = getTopScorer('teamB');
    
    // Control View
    const teamADisplay = $('teamATopScorer');
    if (teamADisplay) {
        teamADisplay.textContent = (teamATopScorer && teamATopScorer.points > 0)
            ? `Top: ${teamATopScorer.name} (${teamATopScorer.points} pts)`
            : 'No scorer yet';
    }
    const teamBDisplay = $('teamBTopScorer');
    if (teamBDisplay) {
        teamBDisplay.textContent = (teamBTopScorer && teamBTopScorer.points > 0)
            ? `Top: ${teamBTopScorer.name} (${teamBTopScorer.points} pts)`
            : 'No scorer yet';
    }
    
    // Pro Viewer
    const viewerTeamATopScorer = $('viewerTeamATopScorer');
    if (viewerTeamATopScorer) {
        viewerTeamATopScorer.innerHTML = (teamATopScorer && teamATopScorer.points > 0)
            ? `<span style="color: #AAA; font-size: 1.2vw;">TOP SCORER:</span> ${teamATopScorer.name} (${teamATopScorer.points} PTS)`
            : '';
    }
    const viewerTeamBTopScorer = $('viewerTeamBTopScorer');
    if (viewerTeamBTopScorer) {
        viewerTeamBTopScorer.innerHTML = (teamBTopScorer && teamBTopScorer.points > 0)
            ? `<span style="color: #AAA; font-size: 1.2vw;">TOP SCORER:</span> ${teamBTopScorer.name} (${teamBTopScorer.points} PTS)`
            : '';
    }

    // Classic Viewer
    const classicTeamADisplay = $('classicViewerTeamATopScorer');
    if (classicTeamADisplay) {
        classicTeamADisplay.textContent = (teamATopScorer && teamATopScorer.points > 0)
            ? `Top: ${teamATopScorer.name} (${teamATopScorer.points} pts)`
            : 'No scorer yet';
    }
    const classicTeamBDisplay = $('classicViewerTeamBTopScorer');
    if (classicTeamBDisplay) {
        classicTeamBDisplay.textContent = (teamBTopScorer && teamBTopScorer.points > 0)
            ? `Top: ${teamBTopScorer.name} (${teamBTopScorer.points} pts)`
            : 'No scorer yet';
    }
}

// ================== EVENT HANDLERS ==================

function setupLandingHandlers() {
    $('watchGameBtn').addEventListener('click', handleWatchGame);
    $('watchCodeInput').addEventListener('input', handleWatchCodeInput);
    $('hostGameBtn').addEventListener('click', handleHostGame);
    $('hostCodeInput').addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        e.target.value = value;
    });
}

async function handleWatchGame() {
    console.log('✓ handleWatchGame called');
    const code = $('watchCodeInput').value.trim();
    if (code.length !== 6) {
        showToast('Enter a valid 6-digit code', 'error', 2000);
        return;
    }
    await joinSpectatorMode(code);
}

async function handleHostGame() {
    console.log('✓ handleHostGame called');
    state.isHost = true;
    let code = $('hostCodeInput').value.trim();

    // Generate default code if empty
    if (code === "") {
        code = generateGameCode();
        showToast(`Generated random code: ${code}`, 'info', 2000);
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
        showToast('Please enter a valid 6-digit code', 'error', 3000);
        return;
    }

    await checkCodeAndProceed(code);
}

async function checkCodeAndProceed(code) {
    const validationMsg = $('hostCodeValidation');
    validationMsg.textContent = 'Checking code...';
    validationMsg.className = 'validation-message info';
    validationMsg.classList.remove('hidden');

    const existingGame = await loadGameState(code);

    if (state.user) {
        // --- Logged-in Host ---
        if (existingGame) {
            if (existingGame.hostId === state.user.uid) {
                // It's THEIR game, let them resume
                validationMsg.textContent = 'Resuming your existing game...';
                validationMsg.className = 'validation-message success';
                showToast('Resuming your existing game...', 'success', 2000);
                
                state.game = existingGame;
                state.gameCode = code;
                state.gameType = existingGame.gameType;

                if (state.game.status === 'final') {
                    showToast('This game is finalized. Viewing stats.', 'info', 2000);
                    joinSpectatorMode(code); // Open in spectator mode
                    return;
                }
                
                showView('pre-game-view'); // Go to pre-game screen

            } else {
                validationMsg.textContent = 'This code is already in use. Try another.';
                validationMsg.className = 'validation-message error';
                showToast('Code already in use. Try another.', 'error', 3000);
                return;
            }
        } else {
            // Logged in host + new code = OK
            validationMsg.classList.add('hidden');
            state.gameCode = code;
            showConfigurationView();
        }
    } else {
        // --- Free Host ---
        if (existingGame) {
            // Free hosts can't resume (no way to verify ownership)
            validationMsg.textContent = 'This code is already in use. Try another.';
            validationMsg.className = 'validation-message error';
            showToast('Code already in use. Try another.', 'error', 3000);
            return;
        } else {
            // Free host + new code = OK
            validationMsg.classList.add('hidden');
            state.gameCode = code;
            showConfigurationView();
        }
    }
}

async function handleWatchCodeInput() {
    const value = $('watchCodeInput').value.replace(/\D/g, '').slice(0, 6);
    $('watchCodeInput').value = value;
    $('watchGameBtn').disabled = value.length !== 6;
    
    if (value.length === 6) {
        await validateWatchCode(value);
    } else {
        $('watchCodeValidation').classList.add('hidden');
    }
}

async function validateWatchCode(code) {
    const message = $('watchCodeValidation');
    if (!message) return;
    message.textContent = 'Checking code...';
    message.className = 'validation-message info';
    message.classList.remove('hidden');
    
    const gameExists = await loadGameState(code);
    
    if (gameExists) {
        message.textContent = 'Game found!';
        message.className = 'validation-message success';
    } else {
        message.textContent = 'Game not found';
        message.className = 'validation-message error';
    }
}

// --- UPDATED: Spectator View Logic ---
async function joinSpectatorMode(code) {
    console.log('Joining spectator mode for code:', code);
    const savedGame = await loadGameState(code);
    if (!savedGame) {
        showToast('Game not found', 'error', 2000);
        if($('watchCodeValidation')) {
            $('watchCodeValidation').textContent = 'Game not found';
            $('watchCodeValidation').className = 'validation-message error';
            $('watchCodeValidation').classList.remove('hidden');
        }
        return;
    }
    
    state.gameCode = code;
    state.game = savedGame;
    state.gameType = savedGame.gameType || 'friendly';
    state.isHost = false; 
    
    // Load and apply viewer theme immediately
    state.viewerTheme = localStorage.getItem('viewerTheme') || 'system';
    setViewerTheme(state.viewerTheme);
    
    showSpectatorView(); // This function now handles which view (pro/classic) to show
}

// --- NEW: Toggle Spectator View ---
function toggleSpectatorView() {
    const currentMode = localStorage.getItem('spectatorMode') || 'pro';
    if (currentMode === 'pro') {
        localStorage.setItem('spectatorMode', 'classic');
        showView('viewer-view-classic');
    } else {
        localStorage.setItem('spectatorMode', 'pro');
        showView('viewer-view-pro');
    }
    // No need to re-attach listeners, just call the modal function from the shared spot.
    updateSpectatorView(); // Re-populate the new view
}

// --- NEW: showSpectatorView decides which view to show ---
function showSpectatorView() {
    const preferredMode = localStorage.getItem('spectatorMode') || 'pro';
    
    if (preferredMode === 'classic') {
        showView('viewer-view-classic');
    } else {
        showView('viewer-view-pro');
    }
    
    // Attach listeners for the settings buttons to show the theme modal
    const togglePro = $('toggleViewPro');
    const toggleClassic = $('toggleViewClassic');
    
    if (togglePro) togglePro.onclick = showViewerSettingsModal;
    if (toggleClassic) toggleClassic.onclick = showViewerSettingsModal;

    // All controls are naturally hidden in this view
    if(state.game) updateSpectatorView();

    if (db && state.gameCode) {
        if (state.firestoreListener) state.firestoreListener();
        state.firestoreListener = db.collection('games').doc(state.gameCode)
          .onSnapshot((doc) => {
              console.log('SpectatorView received snapshot');
              if (doc.exists) {
                  state.game = doc.data();
                  updateSpectatorView();
                  const newState = state.game.gameState;
                  if ((newState.gameRunning || newState.shotClockRunning) && !state.timers.masterTimer) {
                      startMasterTimer();
                  } else if (!newState.gameRunning && !newState.shotClockRunning && state.timers.masterTimer) {
                      stopMasterTimer();
                  }
              } else {
                  showToast('Game session has ended', 'error', 3000);
              }
          }, (error) => {
              console.error("Error in Firestore listener:", error);
              showToast('Connection lost', 'error', 3000);
          });
    }
}
// --- END: Spectator View Logic ---

function showConfigurationView() {
    console.log('✓ Showing configuration view');
    
    if (!state.gameCode) {
        state.gameCode = generateGameCode();
    }
    
    showView('config-view');
    
    $('configGameCode').textContent = state.gameCode;
    setupConfigurationHandlers();
    updateColorPreviews();
}

function updateColorPreviews() {
    $('teamAColorPreview').style.backgroundColor = $('teamAColor').value;
    $('teamBColorPreview').style.backgroundColor = $('teamBColor').value;
}

function setupConfigurationHandlers() {
    console.log('✓ Setting up configuration handlers');
    
    $('copyConfigCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    
    $$('input[name="gameType"]').forEach(radio => {
        radio.onchange = (e) => { state.gameType = e.target.value; };
    });
    
    $('teamAColor').onchange = updateColorPreviews;
    $('teamBColor').onchange = updateColorPreviews;

    const backBtn = $('backToLanding');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            // This button now always goes back to the landing view
            showView('landing-view'); 
        };
    }
    
    $('proceedToSetup').onclick = (e) => {
        e.preventDefault();
        const config = gatherConfigurationData();

        if (validateConfiguration(config)) {
            state.game = createGameSkeleton(state.gameCode, config);
            saveGameState(); // Initial save
            
            if (state.user) {
                updateUserProfileWithGame(state.gameCode);
            } else {
                // Show guest disclaimer
                showGuestHostModal();
            }
            
            if (state.gameType === 'friendly') {
                initializeFriendlyGame();
                showView('pre-game-view'); // Go to pre-game screen
            } else {
                showTeamSetupView();
            }
        }
    };
}

function gatherConfigurationData() {
    // NEW: Read toggle switch
    const shotClockEnabled = $('shotClockToggle').checked;
    let shotClockDuration = shotClockEnabled ? 24 : 0; // Default to 24s if on, 0 if off.
    
    return {
        gameName: $('gameNameInput').value.trim() || 'Basketball Game',
        periodDuration: parseInt($('periodDurationSelect').value || '12'),
        shotClockDuration: shotClockDuration,
        timeoutsPerTeam: 7, 
        teamAName: $('teamAName').value.trim() || 'Team A',
        teamBName: $('teamBName').value.trim() || 'Team B',
        teamAColor: $('teamAColor').value || '#EA4335',
        teamBColor: $('teamBColor').value || '#4285F4',
        periodType: document.querySelector('input[name="periodType"]:checked').value || 'quarter' // NEW
    };
}

function validateConfiguration(config) {
    if (config.teamAName === config.teamBName) {
        showToast('Team names must be different', 'error', 2000);
        return false;
    }
    if (config.teamAColor === config.teamBColor) {
        showToast('Team colors must be different', 'error', 2000);
        return false;
    }
    return true;
}

function initializeFriendlyGame() {
    state.game.teamA.stats = {};
    state.game.teamB.stats = {};
    showToast('Friendly game ready!', 'success', 1500);
}

function showTeamSetupView() {
    console.log('Showing team setup view');
    showView('setup-view');
    $('setupGameCode').textContent = state.gameCode;
    updateTeamSetupTitles();
    setupTeamSetupHandlers();
    updateRosterDisplays();
}

function updateTeamSetupTitles() {
    // Set text color to the team's color
    $('teamASetupTitle').style.color = state.game.teamA.color;
    $('teamASetupTitle').textContent = state.game.teamA.name;
    $('teamBSetupTitle').style.color = state.game.teamB.color;
    $('teamBSetupTitle').textContent = state.game.teamB.name;
}

function setupTeamSetupHandlers() {
    $('copySetupCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    $('addTeamAPlayer').onclick = (e) => { e.preventDefault(); addPlayer('teamA'); };
    $('addTeamBPlayer').onclick = (e) => { e.preventDefault(); addPlayer('teamB'); };
    $('backToConfig').onclick = (e) => { e.preventDefault(); showView('config-view'); };
    
    $('skipRosterSetup').onclick = (e) => {
        e.preventDefault();
        initializeFriendlyGame();
        saveGameState();
        showView('pre-game-view'); // Go to pre-game screen
    };
    $('startGame').onclick = (e) => {
        e.preventDefault();
        if (validateTeamSetup()) {
            initializePlayerStats();
            saveGameState();
            showView('pre-game-view'); // Go to pre-game screen
        }
    };
}

function addPlayer(team) {
    const nameInput = $(`${team}PlayerName`);
    const numberInput = $(`${team}PlayerNumber`);
    const positionSelect = $(`${team}PlayerPosition`);
    
    const name = nameInput.value.trim();
    const number = parseInt(numberInput.value);
    const position = positionSelect.value || '';
    
    if (!validatePlayerInput(team, number, name)) return;
    
    state.game[team].roster.push({ number, name, position });
    nameInput.value = '';
    numberInput.value = '';
    positionSelect.value = '';
    updateRosterDisplays();
    saveGameState();
    showToast(`${name} added`, 'success', 1500);
}

function validatePlayerInput(team, number, name) {
    if (isNaN(number) || number < 0 || number > 99) {
        showToast('Jersey #: 0-99', 'error', 2000);
        return false;
    }
    if (!name) {
        showToast('Player name required', 'error', 2000);
        return false;
    }
    if (state.game[team].roster.length >= 15) {
        showToast('Max 15 players per team', 'error', 2000);
        return false;
    }
    if (state.game[team].roster.find(p => p.number === number)) {
        showToast(`#${number} already taken`, 'error', 2000);
        return false;
    }
    return true;
}

function updateRosterDisplays() {
    updateTeamRoster('teamA');
    updateTeamRoster('teamB');
    updateStartGameButton();
}

function updateTeamRoster(team) {
    const rosterContainer = $(`${team}Roster`);
    const countElement = $(`${team}Count`);
    const roster = state.game[team].roster;
    
    rosterContainer.innerHTML = '';
    roster.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'roster-item';
        item.innerHTML = `
            <div class="roster-info">
                <div class="roster-number">${player.number}</div>
                <div class="roster-details">
                    <div class="roster-name">${player.name}</div>
                    ${player.position ? `<div class="roster-position">${player.position}</div>` : ''}
                </div>
            </div>
            <button class="remove-player" data-team="${team}" data-index="${index}" title="Remove Player">✕</button>
        `;
        rosterContainer.appendChild(item);
    });
    
    $$(`#${team}Roster .remove-player`).forEach(btn => {
        btn.onclick = () => {
            removePlayer(btn.dataset.team, parseInt(btn.dataset.index));
        };
    });
    
    countElement.textContent = roster.length;
}

function removePlayer(team, index) {
    if (state.game && state.game[team].roster[index]) {
        const playerName = state.game[team].roster[index].name;
        snapshotState(`Remove Player: ${playerName}`); // Log for undo
        state.game[team].roster.splice(index, 1);
        updateRosterDisplays();
        saveGameState();
        showToast(`${playerName} removed`, 'info', 1500);
    }
}

function validateTeamSetup() {
    if (state.game.teamA.roster.length < 1 || state.game.teamB.roster.length < 1) {
        showToast('Each team needs at least 1 player', 'error', 2000);
        return false;
    }
    return true;
}

function updateStartGameButton() {
    const btn = $('startGame');
    if (!btn || !state.game) return;
    btn.disabled = state.game.teamA.roster.length < 1 || state.game.teamB.roster.length < 1;
}

function initializePlayerStats() {
    ['teamA', 'teamB'].forEach(team => {
        state.game[team].roster.forEach(player => {
            state.game[team].stats[player.number] = {
                freeThrows: 0, fieldGoals: 0, threePointers: 0,
                offensiveRebounds: 0, defensiveRebounds: 0, assists: 0,
                steals: 0, blocks: 0, turnovers: 0, fouls: 0,
                minutes: 0, totalPoints: 0
            };
        });
    });
}

// --- BUG FIX: New function to set up pre-game screen button ---
function setupPreGameHandlers() {
    const startBtn = $('startControlViewBtn');
    if(startBtn) {
        startBtn.onclick = (e) => { 
            e.preventDefault(); 
            showControlView(); 
        };
    }
}

function showControlView() {
    console.log('Showing control view');
    
    if (state.game && state.game.status === 'final') {
        showToast('This game is finalized. Viewing stats.', 'info', 2000);
        joinSpectatorMode(state.gameCode); // Open in spectator mode
        return;
    }
    
    showView('control-view');
    
    // Update button text for shot clock
    $('resetShotClockFull').textContent = `${state.game.settings.shotClockDuration}s`;
    
    $('controlGameCode').textContent = state.gameCode;
    $('copyControlCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    $('gameNameDisplay').textContent = state.game.settings.gameName;
    
    const shotClockSection = $('shotClockSection');
    if (state.game.settings.shotClockDuration === 0) {
        if (shotClockSection) shotClockSection.classList.add('hidden');
    } else {
        if (shotClockSection) shotClockSection.classList.remove('hidden');
    }
    
    const statsSection = $('statsSection');
    if (statsSection) {
        if (state.game.gameType === 'full') {
            statsSection.classList.add('show');
            setupPlayerScoringGrid();
            setupQuickStatControls();
            updateComprehensiveStatsTable();
        } else {
            statsSection.classList.remove('show');
        }
    }
    
    setupControlHandlers();
    updateControlDisplay();
    updateMasterStartButton();
    setupAutoSave();

    // Hide finalize/export for guests, but show share
    if (!state.user) {
        $('finalizeGameBtn').classList.add('hidden');
        $('exportGame').classList.add('hidden');
    }

    if (db && state.isHost) { // Listen for both guests and logged-in hosts
        if (state.firestoreListener) state.firestoreListener();

        state.firestoreListener = db.collection('games').doc(state.gameCode)
          .onSnapshot((doc) => {
              console.log('ControlView received snapshot');
              if (doc.exists) {
                  const newGame = doc.data();
                  if (!state.game || newGame.lastUpdate > state.game.lastUpdate) {
                      state.game = newGame;
                      updateControlDisplay();
                      if (state.game.gameType === 'full') {
                          setupPlayerScoringGrid();
                          updateComprehensiveStatsTable();
                      }
                  }
                  
                  const newState = state.game.gameState;
                  if ((newState.gameRunning || newState.shotClockRunning) && !state.timers.masterTimer) {
                      startMasterTimer();
                  } else if (!newState.gameRunning && !newState.shotClockRunning && state.timers.masterTimer) {
                      stopMasterTimer();
                  }
              } else {
                  showToast('Game session not found', 'error', 3000);
              }
          }, (error) => {
              console.error("Error in Firestore listener:", error);
              showToast('Connection lost', 'error', 3000);
          });
    }
}

function setupPlayerScoringGrid() {
    const grid = $('playerScoringGrid');
    if (!grid || !state.game) return;
    const selectedTeam = $('statTeamSelect').value || 'teamA';
    grid.innerHTML = '';
    
    const roster = state.game[selectedTeam].roster;
    if (roster.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No players added yet</p>';
        return;
    }
    
    roster.forEach(player => {
        const stats = state.game[selectedTeam].stats[player.number] || { totalPoints: 0, freeThrows: 0, fieldGoals: 0, threePointers: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };
        const totalRebounds = stats.offensiveRebounds + stats.defensiveRebounds;
        
        const card = document.createElement('div');
        card.className = 'player-score-card';
        card.innerHTML = `
            <div class="player-info">
                <div class="player-number">${player.number}</div>
                <div class="player-name">${player.name}</div>
            </div>
            <div class="player-stats">
                ${stats.totalPoints} PTS • ${stats.freeThrows} FT • ${stats.fieldGoals} 2PT • ${stats.threePointers} 3PT<br>
                ${totalRebounds} REB • ${stats.assists} AST • ${stats.steals} STL • ${stats.blocks} BLK • ${stats.turnovers} TO
            </div>
            <div class="player-scoring-buttons">
                <button class="btn btn--sm btn--score-pts" data-team="${selectedTeam}" data-player="${player.number}" data-stat="freeThrows" data-points="1">+1</button>
                <button class="btn btn--sm btn--score-pts" data-team="${selectedTeam}" data-player="${player.number}" data-stat="fieldGoals" data-points="2">+2</button>
                <button class="btn btn--sm btn--score-pts" data-team="${selectedTeam}" data-player="${player.number}" data-stat="threePointers" data-points="3">+3</button>
                <button class="btn btn--sm btn--score-reb" data-team="${selectedTeam}" data-player="${player.number}" data-stat="defensiveRebounds">+REB</button>
                <button class="btn btn--sm btn--score-to" data-team="${selectedTeam}" data-player="${player.number}" data-stat="turnovers">+TO</button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Add listeners for ALL buttons in the grid
    $$('#playerScoringGrid .player-scoring-buttons .btn').forEach(btn => {
        btn.onclick = () => {
            const points = parseInt(btn.dataset.points) || 0;
            if (points > 0) {
                // It's a score button
                addPlayerScore(btn.dataset.team, btn.dataset.player, btn.dataset.stat, points);
            } else {
                // It's a stat-only button (REB or TO)
                addPlayerStat(btn.dataset.team, btn.dataset.player, btn.dataset.stat);
            }
        };
    });
}

function setupQuickStatControls() {
    const quickStatPlayer = $('quickStatPlayer');
    const statTeamSelect = $('statTeamSelect');
    if (!quickStatPlayer || !statTeamSelect) return;
    
    const updateQuickStatPlayers = () => {
        const selectedTeam = statTeamSelect.value;
        const roster = state.game[selectedTeam].roster;
        quickStatPlayer.innerHTML = '<option value="">Select Player</option>';
        roster.forEach(player => {
            const option = document.createElement('option');
            option.value = player.number;
            option.textContent = `#${player.number} ${player.name}`;
            quickStatPlayer.appendChild(option);
        });
    };
    
    statTeamSelect.onchange = () => {
        setupPlayerScoringGrid();
        updateComprehensiveStatsTable();
        updateQuickStatPlayers();
    };
    
    updateQuickStatPlayers();
    
    $$('.stat-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const selectedTeam = statTeamSelect.value;
            const playerNumber = quickStatPlayer.value;
            const statType = e.target.dataset.stat;
            if (!playerNumber) {
                showToast('Select a player first', 'warning', 2000);
                return;
            }
            addPlayerStat(selectedTeam, playerNumber, statType);
        };
    });
}

function addPlayerScore(team, playerNumber, statType, points) {
    if (!state.game || !state.isHost || !state.game[team].stats[playerNumber]) return;
    
    const playerName = state.game[team].roster.find(p => p.number == playerNumber)?.name || `#${playerNumber}`;
    snapshotState(`+${points}pts for ${playerName}`); // Log for undo

    const playerStats = state.game[team].stats[playerNumber];
    
    playerStats[statType]++;
    playerStats.totalPoints += points;
    state.game[team].score += points;
    
    showScoreAnimation(points, team);
    setupPlayerScoringGrid();
    updateControlDisplay();
    updateTopScorerDisplay();
    updateComprehensiveStatsTable();
    saveGameState();
    
    const statDisplay = statType === 'freeThrows' ? 'Free Throw' : 
                          statType === 'fieldGoals' ? 'Field Goal' : '3-Pointer';
    showToast(`+${points} ${statDisplay} for ${playerName}`, 'success', 1500);
}

function addPlayerStat(team, playerNumber, statType) {
    if (!state.game || !state.isHost || !state.game[team].stats[playerNumber]) return;

    const statNames = {
        'offensiveRebounds': 'Off. Rebound', 'defensiveRebounds': 'Def. Rebound', 
        'assists': 'Assist', 'steals': 'Steal', 'blocks': 'Block',
        'turnovers': 'Turnover', 'fouls': 'Personal Foul'
    };
    const playerName = state.game[team].roster.find(p => p.number == playerNumber)?.name || `#${playerNumber}`;
    snapshotState(`${statNames[statType]} for ${playerName}`); // Log for undo

    const playerStats = state.game[team].stats[playerNumber];    
    playerStats[statType]++;
    
    if(statType === 'fouls') {
        state.game[team].fouls++; 
    }
    
    setupPlayerScoringGrid();
    updateComprehensiveStatsTable();
    updateControlDisplay(); 
    saveGameState();
    
    showToast(`${statNames[statType]} for ${playerName}`, 'success', 1500);
}

function updateComprehensiveStatsTable() {
    const tableBody = $('comprehensiveStatsTableBody');
    if (!tableBody || !state.game || state.game.gameType !== 'full') return;
    tableBody.innerHTML = '';
    const selectedTeam = $('statTeamSelect').value || 'teamA';
    
    state.game[selectedTeam].roster.forEach(player => {
        const stats = state.game[selectedTeam].stats[player.number] || {
            totalPoints: 0, freeThrows: 0, fieldGoals: 0, threePointers: 0,
            offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, 
            blocks: 0, turnovers: 0, fouls: 0, minutes: 0
        };
        const totalRebounds = stats.offensiveRebounds + stats.defensiveRebounds;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.number}</td>
            <td style="text-align: left; padding-left: 8px;">${player.name}</td>
            <td>${stats.totalPoints}</td>
            <td>${stats.freeThrows}</td>
            <td>${stats.fieldGoals}</td>
            <td>${stats.threePointers}</td>
            <td>${stats.offensiveRebounds}</td>
            <td>${stats.defensiveRebounds}</td>
            <td>${totalRebounds}</td>
            <td>${stats.assists}</td>
            <td>${stats.steals}</td>
            <td>${stats.blocks}</td>
            <td>${stats.turnovers}</td>
            <td>${stats.fouls}</td>
            <td>${stats.minutes}</td>
        `;
        tableBody.appendChild(row);
    });
}

function setupControlHandlers() {
    console.log('Setting up control handlers');
    
    $('startGameBtn').onclick = (e) => { e.preventDefault(); toggleMasterGame(); };
    $('resetAllBtn').onclick = (e) => { e.preventDefault(); showResetAllModal(); };
    $('editGameClock').onclick = (e) => { e.preventDefault(); showEditClockModal(); };
    $('gameClockDisplay').onclick = (e) => { if (state.isHost) showEditClockModal(); };
    $('shotClockDisplay').onclick = (e) => { if (state.isHost) showEditShotClockModal(); };
    $('editShotClock').onclick = (e) => { e.preventDefault(); showEditShotClockModal(); };
    $('nextPeriod').onclick = (e) => { e.preventDefault(); nextPeriodFunc(); };
    $('resetShotClock14').onclick = (e) => { e.preventDefault(); resetShotClockTo14(); };
    $('resetShotClockFull').onclick = (e) => { e.preventDefault(); resetShotClockDefault(); };
    $('startShotClock').onclick = (e) => { e.preventDefault(); startShotClockOnly(); };
    
    $('finalizeGameBtn').onclick = (e) => { e.preventDefault(); showFinalizeGameModal(); };
    $('exportGame').onclick = (e) => { e.preventDefault(); exportGameData(); };
    
    // Help and Undo handlers
    $('helpBtn').onclick = (e) => { e.preventDefault(); $('helpModal').classList.remove('hidden'); };
    $('closeHelpModal').onclick = () => { $('helpModal').classList.add('hidden'); };
    $('detailedHelpBtn').onclick = () => { $('detailedHelpModal').classList.remove('hidden'); };
    $('closeDetailedHelpModal').onclick = () => { $('detailedHelpModal').classList.add('hidden'); };
    $('undoBtn').onclick = (e) => { e.preventDefault(); handleUndo(); };
    
    // --- BUG FIX: Share Button copies direct scoreboard URL ---
    $('shareGameBtn').onclick = (e) => {
        e.preventDefault();
        // This is the correct, direct link
        const shareUrl = `${window.location.origin}${window.location.pathname}?watch=${state.gameCode}&sport=basketball`;
        copyToClipboard(shareUrl);
        showToast('Spectator link copied to clipboard!', 'success', 2500);
    };
    
    $$('.score-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (!state.isHost) {
                showToast('Only the host can control the game', 'warning');
                return;
            }
            updateScore(e.target.dataset.team, parseInt(e.target.dataset.points));
        };
    });
    $$('[data-action]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            handleCounterAction(e.target.dataset.action, e.target.dataset.team);
        };
    });
    
    $('possessionTeamA').onclick = (e) => { e.preventDefault(); if (!state.isHost) return; setPossession('teamA'); };
    $('possessionTeamB').onclick = (e) => { e.preventDefault(); if (!state.isHost) return; setPossession('teamB'); };
}


// --- NEW: Helper function to get the period label ---
function getPeriodLabel(periodNumber) {
    const periodType = state.game.settings.periodType;
    const periodCount = state.game.settings.periodCount;

    if (periodNumber <= periodCount) {
        // Regular period
        if (periodType === 'half') {
            return periodNumber === 1 ? "1st Half" : "2nd Half";
        } else {
            // Quarters
            switch (periodNumber) {
                case 1: return "1st Quarter";
                case 2: return "2nd Quarter";
                case 3: return "3rd Quarter";
                case 4: return "4th Quarter";
                default: return `${periodNumber}th Quarter`;
            }
        }
    } else {
        // Overtime
        const otNumber = periodNumber - periodCount;
        return `OT ${otNumber}`;
    }
}


function nextPeriodFunc() {
    if (!state.game || !state.isHost) return;
    
    const nextPeriod = state.game.gameState.period + 1;
    const periodName = getPeriodLabel(nextPeriod);

    if (confirm(`Are you sure you want to advance to ${periodName}? \n\nTeam Fouls will be reset to 0.`)) {
        snapshotState("Next Period"); // Log for undo

        // Increment period
        state.game.gameState.period = nextPeriod;

        // Reset clocks
        state.game.gameState.gameTime.minutes = state.game.settings.periodDuration;
        state.game.gameState.gameTime.seconds = 0;
        if (state.game.settings.shotClockDuration > 0) {
            state.game.gameState.shotClock = state.game.settings.shotClockDuration;
        }

        // Reset Team Fouls (Standard Basketball Rule for most periods)
        state.game.teamA.fouls = 0;
        state.game.teamB.fouls = 0;
        
        state.game.gameState.gameRunning = false;
        state.game.gameState.shotClockRunning = false;
        stopMasterTimer();
        updateControlDisplay();
        updateMasterStartButton();
        saveGameState();
        
        showToast(`Starting ${periodName}`, 'info', 2000);
    }
}

function updateScore(team, points) {
    if (!state.game || !state.isHost) return;
    
    const teamName = state.game[team].name;
    snapshotState(`Score ${points > 0 ? '+' : ''}${points} for ${teamName}`); // Log for undo

    state.game[team].score = Math.max(0, state.game[team].score + points);
    showScoreAnimation(points, team);
    updateControlDisplay();
    updateTopScorerDisplay();
    saveGameState();
}

function showScoreAnimation(points, team) {
    const scoreElement = $(`${team}Score`);
    if (!scoreElement) return;
    const rect = scoreElement.getBoundingClientRect();
    const anim = document.createElement('div');
    anim.className = 'score-animation';
    anim.textContent = points > 0 ? `+${points}` : points.toString();
    anim.style.position = 'fixed';
    anim.style.left = `${rect.left + rect.width / 2 - 20}px`;
    anim.style.top = `${rect.top + rect.height / 2 - 20}px`;
    anim.style.color = points > 0 ? 'var(--color-success)' : 'var(--color-error)';
    anim.style.zIndex = '1500';
    document.body.appendChild(anim);
    setTimeout(() => { if (anim.parentNode) anim.parentNode.removeChild(anim); }, 1500);
}

function updateControlDisplay() {
    if (!state.game) return;
    
    // Update main controls
    $('teamAScore').textContent = state.game.teamA.score;
    $('teamBScore').textContent = state.game.teamB.score;
    $('teamAName').textContent = state.game.teamA.name;
    $('teamBName').textContent = state.game.teamB.name;
    $('gameClockDisplay').textContent = formatTime(state.game.gameState.gameTime.minutes, state.game.gameState.gameTime.seconds);
    if ($('shotClockDisplay') && state.game.settings.shotClockDuration > 0) {
        $('shotClockDisplay').textContent = state.game.gameState.shotClock;
    }
    
    // Update Quarter/Half label
    const periodLabel = state.game.settings.periodType === 'half' ? "Half" : "Quarter";
    $('quarterHalfLabel').textContent = periodLabel;
    $('periodDisplay').textContent = getPeriodLabel(state.game.gameState.period).split(' ')[0];
    
    $('teamATimeouts').textContent = state.game.teamA.timeouts;
    $('teamBTimeouts').textContent = state.game.teamB.timeouts;
    $('teamAFouls').textContent = state.game.teamA.fouls;
    $('teamBFouls').textContent = state.game.teamB.fouls;
    
    updatePossessionDisplay();
    updateTopScorerDisplay();
    if (state.game.gameType === 'full') {
        updateComprehensiveStatsTable();
    }
}

function handleCounterAction(action, team) {
    if (!state.game || !state.isHost) return;
    const [type, operation] = action.split('-');
    const change = operation === 'plus' ? 1 : -1;
    
    snapshotState(`${type} ${operation} for ${state.game[team].name}`); // Log for undo
    
    if (type === 'timeout') {
        state.game[team].timeouts = Math.max(0, Math.min(7, state.game[team].timeouts + change));
    } else if (type === 'foul') {
        state.game[team].fouls = Math.max(0, state.game[team].fouls + change);
    }
    updateControlDisplay();
    saveGameState();
}

function setPossession(team) {
    if (!state.game || !state.isHost) return;
    snapshotState(`Set Possession: ${state.game[team].name}`); // Log for undo
    
    state.game.gameState.possession = team;
    updatePossessionDisplay();
    saveGameState();
}

function updatePossessionDisplay() {
    const btnA = $('possessionTeamA');
    const btnB = $('possessionTeamB');
    if (btnA && btnB && state.game) {
        const isTeamA = state.game.gameState.possession === 'teamA';
        btnA.classList.toggle('active', isTeamA);
        btnB.classList.toggle('active', !isTeamA);
        btnA.textContent = state.game.teamA.name;
        btnB.textContent = state.game.teamB.name;
    }
    
    // Pro Viewer
    const possDot = document.querySelector('.possession-dot');
    const possName = $('viewerPossessionTeamName');
    if (possName && state.game) {
        const isTeamA = state.game.gameState.possession === 'teamA';
        possName.textContent = isTeamA ? state.game.teamA.name.toUpperCase() : state.game.teamB.name.toUpperCase();
        if(possDot) possDot.style.background = isTeamA ? state.game.teamA.color : state.game.teamB.color;
    }
    
    // Classic Viewer
    const classicPoss = $('classicViewerPossession');
    if (classicPoss && state.game) {
        classicPoss.textContent = state.game.gameState.possession === 'teamA' ? state.game.teamA.name : state.game.teamB.name;
    }
}

// --- STYLED EXPORT FUNCTIONS (Unchanged) ---
const STYLES = {
    title: { font: { bold: true, sz: 24, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "357568" } }, alignment: { horizontal: "center", vertical: "center" } },
    subtitle: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } },
    teamHeader: { font: { bold: true, sz: 16, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "5F6368" } } },
    statHeader: { font: { bold: true, sz: 10, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "D9D9D9" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } } },
    cell: { font: { sz: 10 }, border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } } },
    cellCenter: { font: { sz: 10 }, alignment: { horizontal: "center" }, border: { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } } }
};
function exportGameData() {
    if (!state.game || typeof XLSX === 'undefined') { showToast('Export not available', 'error', 2000); return; }
    try {
        const wb = (state.game.gameType === 'full') ? createComprehensiveBoxScoreData(state.game) : createFriendlyGameExport(state.game);
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const fileName = `${state.game.settings.gameName.replace(/\s+/g, '_')}_Box_Score.xlsx`;
        saveAs(blob, fileName);
        showToast('Data exported successfully!', 'success', 2000);
    } catch (error) { console.error('Export error:', error); showToast('Export failed', 'error', 2000); }
}
function createFriendlyGameExport(g) {
    const wb = XLSX.utils.book_new(); const ws = {};
    const colWidths = [{ wch: 30 }, { wch: 20 }];
    ws['A1'] = { v: g.settings.gameName, s: STYLES.title };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    ws['A2'] = { v: `${g.teamA.name} vs ${g.teamB.name}`, s: STYLES.subtitle };
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
    ws['A4'] = { v: "Team", s: STYLES.teamHeader }; ws['B4'] = { v: "Final Score", s: STYLES.teamHeader };
    ws['A5'] = { v: g.teamA.name, s: STYLES.cell }; ws['B5'] = { v: g.teamA.score, s: STYLES.cellCenter };
    ws['A6'] = { v: g.teamB.name, s: STYLES.cell }; ws['B6'] = { v: g.teamB.score, s: STYLES.cellCenter };
    ws['!ref'] = `A1:B6`; ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Game Summary'); return wb;
}
function createComprehensiveBoxScoreData(g) {
    const wb = XLSX.utils.book_new(); const ws = {};
    const statHeaders = ['#', 'Player', 'PTS', 'FT', '2PT', '3PT', 'ORB', 'DRB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'MIN'];
    const colWidths = [ { wch: 5 }, { wch: 25 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 } ];
    ws['A1'] = { v: g.settings.gameName, s: STYLES.title };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: statHeaders.length - 1 } }]; 
    ws['A2'] = { v: `${g.teamA.name}: ${g.teamA.score}  |  ${g.teamB.name}: ${g.teamB.score}`, s: STYLES.subtitle };
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: statHeaders.length - 1 } });
    let R = 3; 
    ws[`A${R}`] = { v: g.teamA.name, s: STYLES.teamHeader };
    ws['!merges'].push({ s: { r: R-1, c: 0 }, e: { r: R-1, c: statHeaders.length - 1 } }); R++;
    statHeaders.forEach((h, C) => { ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: h, s: STYLES.statHeader }; }); R++;
    g.teamA.roster.forEach(p => { const stats = g.teamA.stats[p.number] || {}; const row = playerStatsToArray(p, stats); row.forEach((cell, C) => { ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: cell, s: C === 1 ? STYLES.cell : STYLES.cellCenter }; }); R++; });
    R++; 
    ws[`A${R}`] = { v: g.teamB.name, s: STYLES.teamHeader };
    ws['!merges'].push({ s: { r: R-1, c: 0 }, e: { r: R-1, c: statHeaders.length - 1 } }); R++;
    statHeaders.forEach((h, C) => { ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: h, s: STYLES.statHeader }; }); R++;
    g.teamB.roster.forEach(p => { const stats = g.teamB.stats[p.number] || {}; const row = playerStatsToArray(p, stats); row.forEach((cell, C) => { ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: cell, s: C === 1 ? STYLES.cell : STYLES.cellCenter }; }); R++; });
    ws['!ref'] = `A1:${XLSX.utils.encode_cell({r: R-1, c: statHeaders.length - 1})}`; ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Box Score'); return wb;
}
function playerStatsToArray(player, stats) {
    const s = stats || { totalPoints: 0, freeThrows: 0, fieldGoals: 0, threePointers: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, minutes: 0 };
    const totalRebounds = s.offensiveRebounds + s.defensiveRebounds;
    return [ player.number, player.name, s.totalPoints, s.freeThrows, s.fieldGoals, s.threePointers, s.offensiveRebounds, s.defensiveRebounds, totalRebounds, s.assists, s.steals, s.blocks, s.turnovers, s.fouls, s.minutes ];
}
// --- END EXPORT FUNCTIONS ---

// --- NEW UTILITY: Convert hex to RGB for CSS variables ---
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}
// --- END NEW UTILITY ---

// --- UPDATED: Now updates BOTH spectator views ---
function updateSpectatorView() {
    if (!state.game) return;
    
    // Common data
    const gameTime = formatTime(state.game.gameState.gameTime.minutes, state.game.gameState.gameTime.seconds);
    const periodLabel = state.game.settings.periodType === 'half' ? "HALF" : "QUARTER";
    const periodNum = getPeriodLabel(state.game.gameState.period).split(' ')[0];
    const shotClockVal = state.game.gameState.shotClock;
    const shotClockOn = state.game.settings.shotClockDuration > 0;
    const shotClockWarning = shotClockOn && shotClockVal <= 5;
    
    // --- BEGIN Professional Theme Color Handling (for viewer-pro only) ---
    const rootContainer = $('root-container');
    if (rootContainer && rootContainer.classList.contains('viewer-theme-professional')) {
        // Apply team colors as CSS variables for the Pro theme to use
        rootContainer.style.setProperty('--viewer-team-a-color', state.game.teamA.color);
        rootContainer.style.setProperty('--viewer-team-b-color', state.game.teamB.color);
        // NEW: Pass RGB values for shadows and team panel highlights
        rootContainer.style.setProperty('--viewer-team-a-color-rgb', hexToRgb(state.game.teamA.color));
        rootContainer.style.setProperty('--viewer-team-b-color-rgb', hexToRgb(state.game.teamB.color));
    }
    // --- END Professional Theme Color Handling ---

    
    // Pro View
    $('viewerGameName').textContent = state.game.settings.gameName;
    $('viewerTeamAName').textContent = state.game.teamA.name.toUpperCase();
    // Only set inline color if NOT in professional mode
    if (!rootContainer || !rootContainer.classList.contains('viewer-theme-professional')) {
        $('viewerTeamAName').style.color = state.game.teamA.color;
        $('viewerTeamBName').style.color = state.game.teamB.color;
    } else {
        // Set name colors to their default pro mode styles when in pro mode
        $('viewerTeamAName').style.color = '';
        $('viewerTeamBName').style.color = '';
    }
    $('viewerTeamAScore').textContent = state.game.teamA.score;
    $('viewerTeamBScore').textContent = state.game.teamB.score;
    
    $('viewerGameClock').textContent = gameTime;
    $('viewerQuarterHalfLabel').textContent = periodLabel;
    $('viewerPeriod').textContent = periodNum;
    $('viewerShotClockBox').style.display = shotClockOn ? 'block' : 'none';
    $('viewerShotClock').textContent = shotClockVal;
    $('viewerShotClock').classList.toggle('warning', shotClockWarning);
    $('viewerTeamAFouls').textContent = state.game.teamA.fouls;
    $('viewerTeamATimeouts').textContent = state.game.teamA.timeouts;
    $('viewerTeamBFouls').textContent = state.game.teamB.fouls;
    $('viewerTeamBTimeouts').textContent = state.game.teamB.timeouts;
    
    // Classic View
    $('classicViewerGameName').textContent = state.game.settings.gameName;
    $('classicViewerTeamAName').textContent = state.game.teamA.name;
    const classicTeamAScore = $('classicViewerTeamAScore');
    const classicTeamBScore = $('classicViewerTeamBScore');
    classicTeamAScore.textContent = state.game.teamA.score;
    classicTeamAScore.style.color = state.game.teamA.color;
    $('classicViewerTeamBName').textContent = state.game.teamB.name;
    classicTeamBScore.textContent = state.game.teamB.score;
    classicTeamBScore.style.color = state.game.teamB.color;

    $('classicViewerGameClock').textContent = gameTime;
    $('classicQuarterHalfLabel').textContent = periodLabel;
    $('classicViewerPeriod').textContent = periodNum;
    $('classicViewerShotClock').style.display = shotClockOn ? 'block' : 'none';
    $('classicViewerShotClock').textContent = shotClockVal;
    $('classicViewerShotClock').classList.toggle('warning', shotClockWarning);

    // Update shared data
    updatePossessionDisplay();
    updateTopScorerDisplay();
}

function setupAutoSave() {
    if (state.timers.autoSave) clearInterval(state.timers.autoSave);
    // Auto-save now works for ALL hosts
    if (state.isHost) {
        state.timers.autoSave = setInterval(saveGameState, 30000);
    }
}

// --- NEW: Keyboard Shortcut Handler ---
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only run shortcuts if in control view and not editing
        if (state.view !== 'control-view' || state.clockEditing) return;
        
        // Don't hijack text inputs
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
            return;
        }

        // --- Handle shortcuts ---
        switch(e.key) {
            case ' ': // Spacebar
                e.preventDefault();
                toggleMasterGame();
                break;
            case 'Enter': // Enter key
                e.preventDefault();
                resetShotClockDefaultAndStart();
                break;
            case 's': // Start Shot Clock
                e.preventDefault();
                startShotClockOnly();
                break;
            case 'r': // Reset Shot Clock (14s)
                e.preventDefault();
                resetShotClockTo14();
                break;
            case 'R': // Reset Shot Clock (Full, no start)
                e.preventDefault();
                resetShotClockDefault();
                break;
            case 'p': // Toggle Possession
                e.preventDefault();
                const newPoss = state.game.gameState.possession === 'teamA' ? 'teamB' : 'teamA';
                setPossession(newPoss);
                break;
            case 'z': // Undo
                e.preventDefault();
                handleUndo();
                break;
            case 'h': // Help
                e.preventDefault();
                $('helpModal').classList.toggle('hidden');
                break;
        }
    });
}

// ================== INITIALIZER (CALLED BY MAIN.JS) ==================
/**
 * @param {object} utils - The global utilities from main.js
 * @param {firebase.User | null} user - The authenticated user (or null)
 * @param {URLSearchParams} urlParams - The URL parameters
 */
function init(utils, user, urlParams) {
    console.log('Basketball module initializing...');
    
    // 1. Set up all utilities
    $ = utils.$;
    $$ = utils.$$;
    showToast = utils.showToast;
    copyToClipboard = utils.copyToClipboard;
    state.user = user; // Set user state

    // 2. Add global event listeners
    setupKeyboardShortcuts(); 

    // 3. Read the mode from the URL
    const watchCode = urlParams.get('watch');
    const hostMode = urlParams.get('host'); // 'true' (logged in) or 'free'
    const resumeCode = urlParams.get('code'); // Check if resuming a game (from sports.html)

    if (watchCode) {
        // This is a spectator
        state.isHost = false;
        joinSpectatorMode(watchCode); // This will showView('viewer')
    
    } else if (hostMode === 'true' || hostMode === 'free') {
        // This is a LOGGED-IN HOST or a GUEST HOST
        state.isHost = true;
        
        if (resumeCode) {
            // User clicked "Resume Game" on sports.html
            console.log('Resuming game with code:', resumeCode);
            state.gameCode = resumeCode; // Set the code from URL
            
            // Need to load the game data first
            loadGameState(resumeCode).then(gameData => {
                if (gameData) {
                    state.game = gameData;
                    state.gameType = gameData.gameType;
                    
                    if (gameData.status === 'final') {
                        showToast('This game is finalized. Viewing stats.', 'info', 2000);
                        joinSpectatorMode(resumeCode);
                        return;
                    }
                    
                    showView('pre-game-view'); // Go to pre-game screen
                } else {
                    showToast(`Game ${resumeCode} not found.`, 'error', 3000);
                    showView('landing-view'); // Fallback to landing
                    setupLandingHandlers();
                }
            });

        } else {
            // This is a new game, show the landing page
            showView('landing-view'); 
            setupLandingHandlers();
        }

    } else {
        // Fallback (e.g., someone types scoreboard.html?sport=basketball)
        // Show the landing page
        showView('landing-view');
        setupLandingHandlers();
    }
    
    console.log('✓ Basketball module ready!');
}

// --- NEW: Function to set viewer theme ---
function setViewerTheme(theme) {
    if (!theme) return;
    
    state.viewerTheme = theme;
    localStorage.setItem('viewerTheme', theme);
    
    const html = document.documentElement;
    const rootContainer = $('root-container'); // Ensure this ID exists in scoreboard.html
    
    // Reset base states
    html.removeAttribute('data-color-scheme');
    if (rootContainer) {
        rootContainer.classList.remove('viewer-theme-professional');
    }
    
    // 1. Handle Light Theme
    if (theme === 'light') {
        html.setAttribute('data-color-scheme', 'light');
    } 
    // 2. Handle Professional LED Theme
    else if (theme === 'professional') {
        // Force dark mode base so the rest of the UI (modals etc) looks correct
        html.setAttribute('data-color-scheme', 'dark');
        
        // Add the special class to the container
        if (rootContainer) {
            rootContainer.classList.add('viewer-theme-professional');
        }
    }
    // 3. System/Normal (Default)
    else {
        // Do nothing, let system preference or theme-loader.js handle it
    }
    
    // Highlight the selected button in the modal
    $$('.viewer-theme-btn').forEach(btn => {
        const isSelected = btn.dataset.theme === theme;
        
        // Reset styles
        btn.classList.remove('btn--primary');
        btn.classList.add('btn--secondary');
        btn.style.border = "1px solid var(--color-border)";

        // Apply active styles
        if (isSelected) {
            btn.classList.add('btn--primary');
            btn.classList.remove('btn--secondary');
            btn.style.border = "2px solid var(--color-primary)";
        }
    });

    // Force update the scoreboard values so colors/fonts redraw immediately
    updateSpectatorView();
}

// ================== EXPORT ==================
export default {
    sportName: "Basketball",
    buildHtml, // Imported from basketball-view.js
    init
};