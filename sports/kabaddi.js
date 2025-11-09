// This file exports ONE object: the 'kabaddi' module.

// Import the firebase services we need
import { db, auth } from '../modules/firebase.js';

// Get access to the global utilities from main.js
const { $, $$, showToast, copyToClipboard } = window.utils;

// ================== MODULE-SPECIFIC STATE ==================
const RAID_DURATION = 30; // 30-second raid timer

const state = {
    view: 'landing',
    isHost: false,
    isFreeHost: false,
    user: null, 
    gameCode: null,
    game: null,
    timers: {
        raidTimer: null,
        autoSave: null
    },
    firestoreListener: null
};

// ================== HTML BUILDER ==================
function buildHtml() {
    return `
    <section id="landing-view" class="view">
        <div class="container">
            <header class="landing-header">
                <div class="basketball-icon">🏃</div>
                <h1 class="main-title">Kabaddi Scoreboard</h1>
                <p class="hero-subtitle">Host a new match or enter a code to watch.</p>
            </header>
            <div class="landing-cards">
                <div class="card landing-card">
                    <div class="card__body">
                        <div class="card-icon">👁️</div>
                        <h3>Watch Match</h3>
                        <p>Enter a match code to spectate</p>
                        <input id="watchCodeInput" class="form-control" placeholder="Enter 6-digit code" maxlength="6">
                        <div id="codeValidationMessage" class="validation-message hidden"></div>
                        <button id="watchGameBtn" class="btn btn--primary btn--full-width" disabled>Watch Match</button>
                    </div>
                </div>
                <div class="card landing-card" id="host-card">
                    <div class="card__body">
                        <div class="card-icon">🎯</div>
                        <h3>Host Match</h3>
                        <div id="host-container">
                            </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="config-view" class="view hidden">
        <div class="container" style="max-width: 640px;">
            <header class="section-header">
                <div>
                    <h2>Match Configuration</h2>
                    <p>Set up your match parameters</p>
                </div>
                <div class="game-code-display">
                    <span class="status status--info">
                        Match Code: <span id="configGameCode">000000</span>
                    </span>
                    <button id="copyConfigCode" class="btn btn--outline btn--sm">Copy</button>
                </div>
            </header>
            <div class="card">
                <div class="card__body">
                    <h3>Match Settings</h3>
                    <div class="form-group">
                        <label class="form-label" for="gameNameInput">Match Name</label>
                        <input id="gameNameInput" class="form-control" placeholder="e.g., Final Match" maxlength="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="timeoutsInput">Timeouts per Half</label>
                        <select id="timeoutsInput" class="form-control">
                            <option value="2">2 Timeouts</option>
                            <option value="3" selected>3 Timeouts</option>
                            <option value="4">4 Timeouts</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card__body">
                    <h3>Team Configuration</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="teamAName">Team A Name</label>
                            <input id="teamAName" class="form-control" placeholder="Home Team" maxlength="20">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="teamAColor">Team A Color</label>
                            <input id="teamAColor" class="form-control color-input" type="color" value="#FF6B35">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="teamBName">Team B Name</label>
                            <input id="teamBName" class="form-control" placeholder="Away Team" maxlength="20">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="teamBColor">Team B Color</label>
                            <input id="teamBColor" class="form-control color-input" type="color" value="#1B263B">
                        </div>
                    </div>
                </div>
            </div>
            <div class="section-actions">
                <button id="backToLandingFromConfig" class="btn btn--outline">← Back to Landing</button>
                <button id="proceedToControl" class="btn btn--primary">Start Match</button>
            </div>
        </div>
    </section>

    <section id="control-view" class="view hidden">
        <div class="container-fluid">
            <header class="control-header">
                <div class="control-title">
                    <h2 id="gameNameDisplay">Kabaddi Match</h2>
                    <div class="game-code-display">
                        <span class="status status--info">
                            Match Code: <span id="controlGameCode">000000</span>
                        </span>
                        <button id="copyControlCode" class="btn btn--outline btn--sm">Copy</button>
                    </div>
                </div>
                <div class="control-actions" id="control-actions">
                    </div>
            </header>
            
            <div class="scoreboard" style="margin-bottom: 24px;">
                <div class="team-score" id="teamAScoreSection">
                    <h3 id="teamAName">Team A</h3>
                    <div class="score-display" id="teamAScore">0</div>
                    <div class="score-controls">
                        <button class="btn btn--sm score-btn" data-team="teamA" data-points="1">+1 Point</button>
                        <button class="btn btn--sm score-btn" data-team="teamA" data-points="2">+2 Points</button>
                        <button class="btn btn--sm btn--warning" id="allOutTeamA">+ ALL OUT</button>
                    </div>
                </div>
                
                <div class="clock-section">
                    <div class="clock-display" id="raidTimerDisplay" style="font-size: 4rem; color: var(--color-warning);">${RAID_DURATION}</div>
                    <div class="period-display">Half <span id="periodDisplay">1</span></div>
                    <div class="master-clock-controls">
                        <button id="startRaidBtn" class="btn btn--primary master-start-btn">START RAID</button>
                        <div class="clock-control-row">
                            <button id="resetRaidBtn" class="btn btn--outline btn--sm">Reset Raid</button>
                            <button id="nextHalfBtn" class="btn btn--secondary btn--sm">Next Half</button>
                        </div>
                    </div>
                </div>
                
                <div class="team-score" id="teamBScoreSection">
                    <h3 id="teamBName">Team B</h3>
                    <div class="score-display" id="teamBScore">0</div>
                    <div classs="score-controls">
                        <button class="btn btn--sm score-btn" data-team="teamB" data-points="1">+1 Point</button>
                        <button class="btn btn--sm score-btn" data-team="teamB" data-points="2">+2 Points</button>
                        <button class="btn btn--sm btn--warning" id="allOutTeamB">+ ALL OUT</button>
                    </div>
                </div>
            </div>

            <div class="game-info-grid">
                <div class="card">
                    <div class="card__body">
                        <h4>Team A Timeouts</h4>
                        <div class="counter-controls">
                            <button class="btn btn--sm" data-action="timeout-minus" data-team="teamA">-</button>
                            <span id="teamATimeouts">3</span>
                            <button class="btn btn--sm" data-action="timeout-plus" data-team="teamA">+</button>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card__body">
                        <h4>Possession</h4>
                        <div class="possession-controls">
                            <button id="possessionTeamA" class="btn btn--outline possession-btn active">Team A Raid</button>
                            <button id="possessionTeamB" class="btn btn--outline possession-btn">Team B Raid</button>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card__body">
                        <h4>Team B Timeouts</h4>
                        <div class="counter-controls">
                            <button class="btn btn--sm" data-action="timeout-minus" data-team="teamB">-</button>
                            <span id="teamBTimeouts">3</span>
                            <button class="btn btn--sm" data-action="timeout-plus" data-team="teamB">+</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="viewer-view" class="view hidden">
        <div class="container-fluid">
            <div class="viewer-scoreboard">
                <div class="viewer-team" id="viewerTeamA">
                    <h2 id="viewerTeamAName">Team A</h2>
                    <div class="viewer-score" id="viewerTeamAScore">0</div>
                </div>
                <div class="viewer-center">
                    <div class="viewer-clock" id="viewerRaidTimer" style="font-size: 5rem; color: var(--color-warning);">${RAID_DURATION}</div>
                    <div class="viewer-period">Half <span id="viewerPeriod">1</span></div>
                </div>
                <div class="viewer-team" id="viewerTeamB">
                    <h2 id="viewerTeamBName">Team B</h2>
                    <div class="viewer-score" id="viewerTeamBScore">0</div>
                </div>
            </div>
            <div class="viewer-info">
                <div class="game-name" id="viewerGameName">Kabaddi Match</div>
                <div class="possession-indicator">
                    <span>Current Raid:</span>
                    <span id="viewerPossession">Team A</span>
                </div>
            </div>
        </div>
    </section>
    `;
}

// ================== KABADDI FUNCTIONS ==================

function formatTime(seconds) {
    return seconds.toString().padStart(2, '0');
}

function showView(viewName) {
    console.log(`Switching to view: ${viewName}`);
    const views = ['landing', 'config', 'control', 'viewer'];
    views.forEach(view => {
        const element = $(`${view}-view`);
        if (element) {
            element.classList.toggle('hidden', view !== viewName);
            element.style.display = (view === viewName) ? 'block' : 'none';
        }
    });
    state.view = viewName;
    if (viewName === 'landing' || viewName === 'config') {
        if (state.firestoreListener) state.firestoreListener();
        stopRaidTimer();
    }
}

function playBuzzer() {
    const buzzer = $('buzzerSound');
    if (buzzer) {
        buzzer.currentTime = 0;
        buzzer.play().catch(e => console.log('Audio play failed:', e));
    }
}

function startRaidTimer() {
    if (state.timers.raidTimer) clearInterval(state.timers.raidTimer);
    
    state.game.gameState.raidTimerRunning = true;
    updateRaidTimerButton();
    saveGameState(); // Sync start
    
    state.timers.raidTimer = setInterval(() => {
        if (state.game.gameState.raidTime > 0) {
            state.game.gameState.raidTime--;
            updateTimerDisplay();
        } else {
            // Raid time is up
            stopRaidTimer(true); // true = play buzzer
            showToast('Raid time over!', 'warning', 2000);
            saveGameState(); // Sync stop
        }
    }, 1000);
}

function stopRaidTimer(playSound = false) {
    if (state.timers.raidTimer) {
        clearInterval(state.timers.raidTimer);
        state.timers.raidTimer = null;
    }
    state.game.gameState.raidTimerRunning = false;
    if (playSound) {
        playBuzzer();
    }
    updateRaidTimerButton();
}

function resetRaidTimer() {
    stopRaidTimer(false);
    state.game.gameState.raidTime = RAID_DURATION;
    updateTimerDisplay();
    saveGameState();
    showToast('Raid timer reset', 'info', 1500);
}

function updateTimerDisplay() {
    const time = state.game.gameState.raidTime;
    if ($('raidTimerDisplay')) $('raidTimerDisplay').textContent = formatTime(time);
    if ($('viewerRaidTimer')) $('viewerRaidTimer').textContent = formatTime(time);
}

function updateRaidTimerButton() {
    const btn = $('startRaidBtn');
    if (!btn) return;
    if (state.game.gameState.raidTimerRunning) {
        btn.textContent = 'STOP RAID';
        btn.className = 'btn btn--primary master-start-btn pause';
    } else {
        btn.textContent = 'START RAID';
        btn.className = 'btn btn--primary master-start-btn resume';
    }
}

function createGameSkeleton(code, config) {
    const hostId = (state.user && !state.isFreeHost) ? state.user.uid : null;
    const timeouts = parseInt(config.timeoutsInput || '3');
    
    return {
        hostId: hostId,
        code: code,
        settings: {
            gameName: config.gameName || 'Kabaddi Match',
            timeoutsPerHalf: timeouts
        },
        teamA: {
            name: config.teamAName || 'Team A',
            color: config.teamAColor || '#FF6B35',
            score: 0,
            timeouts: timeouts,
        },
        teamB: {
            name: config.teamBName || 'Team B',
            color: config.teamBColor || '#1B263B',
            score: 0,
            timeouts: timeouts,
        },
        gameState: {
            half: 1,
            raidTime: RAID_DURATION,
            raidTimerRunning: false,
            possession: 'teamA'
        },
        lastUpdate: Date.now()
    };
}

async function saveGameState() {
    if (state.isFreeHost) return; 
    if (state.game && state.gameCode && db && state.isHost) {
        try {
            state.game.lastUpdate = Date.now();
            await db.collection('games').doc(state.gameCode).set(state.game);
        } catch (e) {
            console.warn('Failed to save game to Firebase:', e);
            showToast('Sync failed. Check permissions.', 'error', 2000);
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
        return doc.exists ? doc.data() : null;
    } catch (e) {
        console.warn('Failed to load game from Firebase:', e);
        return null;
    }
}

function handleCreateGame(event) {
    event.preventDefault();
    state.gameCode = state.isFreeHost ? "LOCAL" : generateGameCode();
    console.log('✓ Game code generated:', state.gameCode);
    showToast('Match created successfully!', 'success', 1500);
    showConfigurationView();
}

async function handleWatchGame(event) {
    event.preventDefault();
    const code = $('watchCodeInput').value.trim();
    if (code.length !== 6) {
        showToast('Enter a valid 6-digit code', 'error', 2000);
        return;
    }
    await joinSpectatorMode(code);
}

async function handleWatchCodeInput(event) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
    event.target.value = value;
    $('watchGameBtn').disabled = value.length !== 6;
    if (value.length === 6) await validateGameCode(value);
    else $('codeValidationMessage').classList.add('hidden');
}

async function validateGameCode(code) {
    const message = $('codeValidationMessage');
    if (!message) return;
    message.textContent = 'Checking code...';
    message.className = 'validation-message info';
    message.classList.remove('hidden');
    const gameExists = await loadGameState(code);
    message.textContent = gameExists ? 'Match found!' : 'Match not found';
    message.className = gameExists ? 'validation-message success' : 'validation-message error';
}

async function joinSpectatorMode(code) {
    const savedGame = await loadGameState(code);
    if (!savedGame) {
        showToast('Match not found', 'error', 2000);
        return;
    }
    state.gameCode = code;
    state.game = savedGame;
    state.isHost = (state.user && state.user.uid === savedGame.hostId); 
    state.isFreeHost = false;
    showSpectatorView();
}

function showConfigurationView() {
    showView('config');
    $('configGameCode').textContent = state.gameCode;
    if (state.isFreeHost) {
        $('configGameCode').parentElement.style.display = 'none';
    }
    $('copyConfigCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    $('backToLandingFromConfig').onclick = (e) => { e.preventDefault(); showView('landing'); };
    $('proceedToControl').onclick = (e) => {
        e.preventDefault();
        const config = {
            gameName: $('gameNameInput').value.trim() || 'Kabaddi Match',
            timeoutsInput: $('timeoutsInput').value,
            teamAName: $('teamAName').value.trim() || 'Team A',
            teamBName: $('teamBName').value.trim() || 'Team B',
            teamAColor: $('teamAColor').value || '#FF6B35',
            teamBColor: $('teamBColor').value || '#1B263B'
        };
        state.game = createGameSkeleton(state.gameCode, config);
        saveGameState(); // Initial save
        showControlView();
    };
}

function showControlView() {
    showView('control');
    
    // Set control panel buttons
    const controlActions = $('control-actions');
    if (controlActions) {
        if (state.isFreeHost) {
            controlActions.innerHTML = `<a href="sport-select.html" class="btn btn--secondary">New Sport</a>`;
        } else if (state.isHost) {
            controlActions.innerHTML = `<button id="signOutBtn" class="btn btn--secondary">Sign Out</button>`;
        }
    }

    $('controlGameCode').textContent = state.gameCode;
    $('gameNameDisplay').textContent = state.game.settings.gameName;
    if (state.isFreeHost) {
        $('controlGameCode').parentElement.style.display = 'none';
    }
    
    setupControlHandlers();
    updateControlDisplay();
    updateRaidTimerButton();
    setupAutoSave();

    // Listen for updates
    if (db && state.gameCode && !state.isFreeHost) {
        if (state.firestoreListener) state.firestoreListener();
        state.firestoreListener = db.collection('games').doc(state.gameCode)
          .onSnapshot((doc) => {
              console.log('ControlView received snapshot');
              if (doc.exists) {
                  state.game = doc.data();
                  updateControlDisplay();
                  // Check timer state
                  if (state.game.gameState.raidTimerRunning && !state.timers.raidTimer) {
                      startRaidTimer();
                  } else if (!state.game.gameState.raidTimerRunning && state.timers.raidTimer) {
                      stopRaidTimer(false);
                  }
              } else {
                  showToast('Game session not found', 'error', 3000);
                  showView('landing');
              }
          }, (error) => {
              console.error("Error in Firestore listener:", error);
              showToast('Connection lost', 'error', 3000);
          });
    }
}

function setupControlHandlers() {
    if ($('copyControlCode')) $('copyControlCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    if ($('signOutBtn')) $('signOutBtn').onclick = (e) => { e.preventDefault(); handleSignOut(); };
    
    // Timer
    $('startRaidBtn').onclick = (e) => {
        e.preventDefault();
        if (state.game.gameState.raidTimerRunning) stopRaidTimer(false);
        else startRaidTimer();
    };
    $('resetRaidBtn').onclick = (e) => { e.preventDefault(); resetRaidTimer(); };
    $('nextHalfBtn').onclick = (e) => { e.preventDefault(); nextHalf(); };
    
    // Scoring
    $$('.score-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            updateScore(e.target.dataset.team, parseInt(e.target.dataset.points));
        };
    });
    $('allOutTeamA').onclick = (e) => { e.preventDefault(); handleAllOut('teamA'); };
    $('allOutTeamB').onclick = (e) => { e.preventDefault(); handleAllOut('teamB'); };
    
    // Counters
    $$('[data-action]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            handleCounterAction(e.target.dataset.action, e.target.dataset.team);
        };
    });
    
    // Possession
    $('possessionTeamA').onclick = (e) => { e.preventDefault(); setPossession('teamA'); };
    $('possessionTeamB').onclick = (e) => { e.preventDefault(); setPossession('teamB'); };
}

function updateScore(team, points) {
    if (!state.game) return;
    state.game[team].score = Math.max(0, state.game[team].score + points);
    showScoreAnimation(points, team);
    updateControlDisplay();
    saveGameState();
}

function handleAllOut(team) {
    if (!state.game) return;
    // Award 2 points to the *other* team
    const scoringTeam = team === 'teamA' ? 'teamB' : 'teamA';
    state.game[scoringTeam].score += 2;
    showToast(`All Out! +2 points for ${state.game[scoringTeam].name}`, 'success', 2500);
    showScoreAnimation(2, scoringTeam);
    updateControlDisplay();
    saveGameState();
}

function nextHalf() {
    if (!state.game) return;
    if (state.game.gameState.half === 1) {
        state.game.gameState.half = 2;
        showToast('Starting Second Half!', 'info', 2000);
        // Reset timeouts for the new half
        const timeouts = state.game.settings.timeoutsPerHalf;
        state.game.teamA.timeouts = timeouts;
        state.game.teamB.timeouts = timeouts;
    } else {
        showToast('Match is already in the second half', 'warning', 2000);
    }
    resetRaidTimer();
    updateControlDisplay();
    saveGameState();
}

function handleCounterAction(action, team) {
    if (!state.game) return;
    const [type, operation] = action.split('-');
    const change = operation === 'plus' ? 1 : -1;
    const maxTimeouts = state.game.settings.timeoutsPerHalf;
    
    if (type === 'timeout') {
        state.game[team].timeouts = Math.max(0, Math.min(maxTimeouts, state.game[team].timeouts + change));
    }
    updateControlDisplay();
    saveGameState();
}

function setPossession(team) {
    if (!state.game) return;
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
        btnA.textContent = `${state.game.teamA.name} Raid`;
        btnB.textContent = `${state.game.teamB.name} Raid`;
    }
}

function showScoreAnimation(points, team) {
    const scoreElement = $(`${team}Score`);
    if (!scoreElement) return;
    const rect = scoreElement.getBoundingClientRect();
    const anim = document.createElement('div');
    anim.className = 'score-animation';
    anim.textContent = `+${points}`;
    anim.style.position = 'fixed';
    anim.style.left = `${rect.left + rect.width / 2 - 20}px`;
    anim.style.top = `${rect.top + rect.height / 2 - 20}px`;
    anim.style.color = 'var(--color-success)';
    anim.style.zIndex = '1500';
    document.body.appendChild(anim);
    setTimeout(() => { if (anim.parentNode) anim.parentNode.removeChild(anim); }, 1500);
}

function updateControlDisplay() {
    if (!state.game) return;
    $('teamAScore').textContent = state.game.teamA.score;
    $('teamBScore').textContent = state.game.teamB.score;
    $('teamAName').textContent = state.game.teamA.name;
    $('teamBName').textContent = state.game.teamB.name;
    $('periodDisplay').textContent = state.game.gameState.half;
    $('teamATimeouts').textContent = state.game.teamA.timeouts;
    $('teamBTimeouts').textContent = state.game.teamB.timeouts;
    updateTimerDisplay();
    updatePossessionDisplay();
}

function showSpectatorView() {
    console.log('Showing spectator view');
    showView('viewer');
    if(state.game) updateSpectatorView();

    if (db && state.gameCode && !state.isFreeHost) {
        if (state.firestoreListener) state.firestoreListener();
        state.firestoreListener = db.collection('games').doc(state.gameCode)
          .onSnapshot((doc) => {
              console.log('SpectatorView received snapshot');
              if (doc.exists) {
                  state.game = doc.data();
                  updateSpectatorView();
                  // Check timer state
                  if (state.game.gameState.raidTimerRunning && !state.timers.raidTimer) {
                      startRaidTimer();
                  } else if (!state.game.gameState.raidTimerRunning && state.timers.raidTimer) {
                      stopRaidTimer(false);
                  }
              } else {
                  showToast('Game session has ended', 'error', 3000);
                  showView('landing');
              }
          }, (error) => {
              console.error("Error in Firestore listener:", error);
              showToast('Connection lost', 'error', 3000);
          });
    }
}

function updateSpectatorView() {
    if (!state.game) return;
    $('viewerTeamAName').textContent = state.game.teamA.name;
    $('viewerTeamBName').textContent = state.game.teamB.name;
    $('viewerTeamAScore').textContent = state.game.teamA.score;
    $('viewerTeamBScore').textContent = state.game.teamB.score;
    $('viewerPeriod').textContent = state.game.gameState.half;
    $('viewerGameName').textContent = state.game.settings.gameName;
    $('viewerPossession').textContent = state.game.gameState.possession === 'teamA' ? state.game.teamA.name : state.game.teamB.name;
    $('viewerRaidTimer').textContent = formatTime(state.game.gameState.raidTime);
}

function setupAutoSave() {
    if (state.timers.autoSave) clearInterval(state.timers.autoSave);
    if (state.isHost && !state.isFreeHost) {
        state.timers.autoSave = setInterval(saveGameState, 30000);
    }
}

function handleSignOut() {
    auth.signOut().then(() => {
        showToast('Signed out', 'info', 2000);
        state.user = null;
        state.isHost = false;
        state.isFreeHost = false;
        localStorage.setItem('userIsHost', 'false');
        localStorage.setItem('userMode', 'guest');
        showView('landing');
    }).catch(error => {
        console.error('Sign out error:', error);
        showToast(error.message, 'error', 4000);
    });
}

// ================== INITIALIZER (CALLED BY MAIN.JS) ==================
function init() {
    console.log('Kabaddi module initializing...');
    
    // Check auth state from storage
    state.user = auth.currentUser;
    state.isHost = localStorage.getItem('userIsHost') === 'true';
    state.isFreeHost = localStorage.getItem('userMode') === 'free';
    
    // Update the host UI based on the status
    const hostContainer = $('host-container');
    if (state.isHost || state.isFreeHost) {
        hostContainer.innerHTML = `
            <p>You are a host. Create a new match to get started.</p>
            <button id="createGameBtn" class="btn btn--primary btn--full-width">Create New Match</button>
        `;
        $('createGameBtn').addEventListener('click', handleCreateGame);
    } else {
        hostContainer.innerHTML = `
            <p>Please <a href="index.html">go back to the home page</a> to sign in or start a free session.</p>
        `;
    }

    // Add landing page event listeners
    $('watchGameBtn').addEventListener('click', handleWatchGame);
    $('watchCodeInput').addEventListener('input', handleWatchCodeInput);

    // Show the initial view
    showView('landing');
    
    console.log('✓ Kabaddi module ready!');
}

// ================== EXPORT ==================
export default {
    sportName: "Kabaddi",
    buildHtml,
    init
};