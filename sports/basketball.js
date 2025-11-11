// This file exports ONE object: the 'basketball' module.

// Import the firebase services we need
import { db, firebase } from '../modules/firebase.js';

// Get access to the global utilities from main.js
let $;
let $$;
let showToast;
let copyToClipboard;

// ================== MODULE-SPECIFIC STATE ==================
const state = {
    view: 'landing', // Default view
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
    actionHistory: [],
    clockEditing: false,
    firestoreListener: null
};

// ================== HTML BUILDER ==================
function buildHtml() {
    return `
    <section id="landing-view" class="view">
        <div class="container" style="max-width: 840px; padding-top: 50px;">
            <header class="landing-header" style="margin-bottom: 24px;">
                <div class="basketball-icon">🏀</div>
                <h1 class="main-title">Basketball Scoreboard</h1>
            </header>

            <div class="setup-grid">
                <div class="card landing-card">
                    <div class="card__body">
                        <div class="card-icon">👁️</div>
                        <h3>Watch Game</h3>
                        <p>Enter a 6-digit code to spectate.</p>
                        <div class="form-group" style="margin-top: 16px;">
                            <label for="watchCodeInput" class="form-label">Game Code</label>
                            <input id="watchCodeInput" class="form-control" placeholder="e.g., 123456" maxlength="6">
                        </div>
                        <div id="watchCodeValidation" class="validation-message hidden"></div>
                        <button id="watchGameBtn" class="btn btn--primary btn--full-width" disabled>Watch Game</button>
                    </div>
                </div>

                <div class="card landing-card">
                    <div class="card__body">
                        <div class="card-icon">🎯</div>
                        <h3>Host Game</h3>
                        <p>Enter a code to resume, or leave blank for new.</p>
                        <div class="form-group" style="margin-top: 16px;">
                            <label for="hostCodeInput" class="form-label">Game Code (Optional)</label>
                            <input id="hostCodeInput" class="form-control" placeholder="Leave empty for random code" maxlength="6">
                        </div>
                        <div id="hostCodeValidation" class="validation-message hidden"></div>
                        <button id="hostGameBtn" class="btn btn--primary btn--full-width">Host/Resume Game</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="config-view" class="view hidden">
        <div class="container">
            <header class="section-header">
                <div>
                    <h2>Game Configuration</h2>
                    <p>Set up your game parameters</p>
                </div>
                 <div class="game-code-display">
                    <span class="status status--info">
                        Game Code: <span id="configGameCode">...</span>
                    </span>
                    <button id="copyConfigCode" class="btn btn--outline btn--sm">Copy</button>
                </div>
            </header>
            <div class="config-grid">
                <div class="card">
                    <div class="card__body">
                        <h3>1. Game Type</h3>
                        <div class="game-type-selection">
                            <label class="game-type-option">
                                <input type="radio" name="gameType" value="friendly" checked>
                                <div class="game-type-card">
                                    <div class="game-type-icon">🤝</div>
                                    <h4>Friendly Game</h4>
                                    <p>Quick game without player rosters</p>
                                </div>
                            </label>
                            <label class="game-type-option">
                                <input type="radio" name="gameType" value="full">
                                <div class="game-type-card">
                                    <div class="game-type-icon">📊</div>
                                    <h4>Full Game with Stats</h4>
                                    <p>Complete game with player statistics</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card__body">
                        <h3>2. Game Settings</h3>
                        <div class="form-group">
                            <label class="form-label" for="gameNameInput">Game Name</label>
                            <input id="gameNameInput" class="form-control" placeholder="Championship Final" maxlength="50">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="periodDurationSelect">Period Duration</label>
                                <select id="periodDurationSelect" class="form-control">
                                    <option value="8">8 minutes</option>
                                    <option value="10">10 minutes</option>
                                    <option value="12" selected>12 minutes</option>
                                    <option value="15">15 minutes</option>
                                    <option value="20">20 minutes</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="shotClockSelect">Shot Clock</label>
                                <select id="shotClockSelect" class="form-control">
                                    <option value="0">No Shot Clock</option>
                                    <option value="14">14 seconds</option>
                                    <option value="24" selected>24 seconds</option>
                                    <option value="30">30 seconds</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>
                        <div id="customShotClockGroup" class="form-group hidden">
                            <input id="customShotClock" class="form-control" type="number" min="5" max="60" placeholder="Custom seconds">
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card__body">
                        <h3>3. Team Configuration</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="teamAName">Team A Name</label>
                                <input id="teamAName" class="form-control" placeholder="Home Team" maxlength="20">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="teamAColor">Team A Color</label>
                                <div class="color-picker-group">
                                    <input id="teamAColor" class="form-control color-input" type="color" value="#EA4335">
                                    <div class="color-preview" id="teamAColorPreview"></div>
                                </div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="teamBName">Team B Name</label>
                                <input id="teamBName" class="form-control" placeholder="Away Team" maxlength="20">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="teamBColor">Team B Color</label>
                                <div class="color-picker-group">
                                    <input id="teamBColor" class="form-control color-input" type="color" value="#4285F4">
                                    <div class="color-preview" id="teamBColorPreview"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="section-actions">
                <button id="backToLanding" class="btn btn--outline">← Back</button>
                <button id="proceedToSetup" class="btn btn--primary">Continue</button>
            </div>
        </div>
    </section>

    <section id="setup-view" class="view hidden">
        <div class="container">
            <header class="section-header">
                <div>
                    <h2>Team Setup</h2>
                    <p>Add players to both teams</p>
                </div>
                <div class="game-code-display">
                    <span class="status status--info">
                        Game Code: <span id="setupGameCode">...</span>
                    </span>
                    <button id="copySetupCode" class="btn btn--outline btn--sm">Copy</button>
                </div>
            </header>
            <div class="setup-grid">
                <div class="card team-setup-card">
                    <div class="card__body">
                        <h3 id="teamASetupTitle">Team A</h3>
                        <div class="player-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <input id="teamAPlayerName" class="form-control" placeholder="Player Name" maxlength="30">
                                </div>
                                <div class="form-group">
                                    <input id="teamAPlayerNumber" class="form-control" type="number" min="0" max="99" placeholder="Jersey #">
                                </div>
                                <div class="form-group">
                                    <select id="teamAPlayerPosition" class="form-control">
                                        <option value="">Position</option>
                                        <option value="PG">PG</option>
                                        <option value="SG">SG</option>
                                        <option value="SF">SF</option>
                                        <option value="PF">PF</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                                <button id="addTeamAPlayer" class="btn btn--primary">Add</button>
                            </div>
                        </div>
                        <div id="teamARoster" class="roster-list" style="padding: 0 16px;"></div>
                        <div class="card__body">
                            <div class="roster-counter">
                                Players: <span id="teamACount">0</span>/15
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card team-setup-card">
                    <div class="card__body">
                        <h3 id="teamBSetupTitle">Team B</h3>
                        <div class="player-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <input id="teamBPlayerName" class="form-control" placeholder="Player Name" maxlength="30">
                                </div>
                                <div class="form-group">
                                    <input id="teamBPlayerNumber" class="form-control" type="number" min="0" max="99" placeholder="Jersey #">
                                </div>
                                <div class="form-group">
                                    <select id="teamBPlayerPosition" class="form-control">
                                        <option value="">Position</option>
                                        <option value="PG">PG</option>
                                        <option value="SG">SG</option>
                                        <option value="SF">SF</option>
                                        <option value="PF">PF</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                                <button id="addTeamBPlayer" class="btn btn--primary">Add</button>
                            </div>
                        </div>
                        <div id="teamBRoster" class="roster-list" style="padding: 0 16px;"></div>
                        <div class="card__body">
                            <div class="roster-counter">
                                Players: <span id="teamBCount">0</span>/15
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="section-actions">
                <button id="backToConfig" class="btn btn--outline">← Back to Configuration</button>
                <button id="skipRosterSetup" class="btn btn--secondary">Skip & Start Game</button>
                <button id="startGame" class="btn btn--primary" disabled>Start Game</button>
            </div>
        </div>
    </section>

    <section id="control-view" class="view hidden">
        <div class="container-fluid">
            <header class="control-header">
                <div class="control-title">
                    <h2 id="gameNameDisplay">Basketball Game</h2>
                    <div class="game-code-display">
                        <span class="status status--info">
                            Game Code: <span id="controlGameCode">...</span>
                        </span>
                        <button id="copyControlCode" class="btn btn--outline btn--sm">Copy</button>
                    </div>
                </div>
                <div class="control-actions">
                    <button id="shareGameBtn" class="btn btn--outline">Share</button>
                    <button id="exportGame" class="btn btn--outline">Export</button>
                    <button id="finalizeGameBtn" class="btn btn--danger">End Game</button>
                </div>
            </header>
            <div class="control-grid">
                <div class="scoreboard-section">
                    <div class="card">
                        <div class="card__body">
                            <div class="scoreboard">
                                <div class="team-score" id="teamAScoreSection">
                                    <h3 id="teamAName">Team A</h3>
                                    <div class="score-display" id="teamAScore">0</div>
                                    <div class="top-scorer" id="teamATopScorer">No scorer yet</div>
                                    <div class="score-controls">
                                        <button class="btn btn--sm score-btn btn--score-1" data-team="teamA" data-points="1">+1</button>
                                        <button class="btn btn--sm score-btn btn--score-2" data-team="teamA" data-points="2">+2</button>
                                        <button class="btn btn--sm score-btn btn--score-3" data-team="teamA" data-points="3">+3</button>
                                        <button class="btn btn--sm score-btn btn--score-minus" data-team="teamA" data-points="-1">-1</button>
                                    </div>
                                </div>
                                <div class="clock-section">
                                    <div class="clock-display game-clock" id="gameClockDisplay" title="Click to edit">12:00</div>
                                    <div class="period-display">Period <span id="periodDisplay">1</span></div>
                                    <div class="master-clock-controls">
                                        <button id="startGameBtn" class="btn btn--primary master-start-btn">START GAME</button>
                                        <div class="clock-control-row">
                                            <button id="resetAllBtn" class="btn btn--outline btn--sm">Reset All</button>
                                            <button id="editGameClock" class="btn btn--secondary btn--sm">Edit Time</button>
                                            <button id="nextPeriod" class="btn btn--secondary btn--sm">Next Period</button>
                                        </div>
                                    </div>
                                    <div class="shot-clock-section" id="shotClockSection">
                                        <div class="shot-clock-display" id="shotClockDisplay" title="Click to edit">24</div>
                                        <div class="shot-clock-label">Shot Clock</div>
                                        <div class="shot-clock-actions">
                                            <button id="resetShotClock14" class="btn btn--warning btn--sm">14s</button>
                                            <button id="resetShotClock24" class="btn btn--warning btn--sm">24s</button>
                                            <button id="editShotClock" class="btn btn--secondary btn--sm">Edit</button>
                                            <button id="startShotClock" class="btn btn--success btn--sm">Start</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="team-score" id="teamBScoreSection">
                                    <h3 id="teamBName">Team B</h3>
                                    <div class="score-display" id="teamBScore">0</div>
                                    <div class="top-scorer" id="teamBTopScorer">No scorer yet</div>
                                    <div class="score-controls">
                                        <button class="btn btn--sm score-btn btn--score-1" data-team="teamB" data-points="1">+1</button>
                                        <button class="btn btn--sm score-btn btn--score-2" data-team="teamB" data-points="2">+2</button>
                                        <button class="btn btn--sm score-btn btn--score-3" data-team="teamB" data-points="3">+3</button>
                                        <button class="btn btn--sm score-btn btn--score-minus" data-team="teamB" data-points="-1">-1</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="game-info-grid">
                        <div class="card">
                            <div class="card__body">
                                <h4>Team A Info</h4>
                                <div class="team-info">
                                    <div class="info-item">
                                        <span>Timeouts:</span>
                                        <div class="counter-controls">
                                            <button class="btn btn--sm" data-action="timeout-minus" data-team="teamA">-</button>
                                            <span id="teamATimeouts">7</span>
                                            <button class="btn btn--sm" data-action="timeout-plus" data-team="teamA">+</button>
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <span>Team Fouls:</span>
                                        <div class="counter-controls">
                                            <button class="btn btn--sm" data-action="foul-minus" data-team="teamA">-</button>
                                            <span id="teamAFouls">0</span>
                                            <button class="btn btn--sm" data-action="foul-plus" data-team="teamA">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card__body">
                                <h4>Possession</h4>
                                <div class="possession-controls">
                                    <button id="possessionTeamA" class="btn btn--outline possession-btn active">Team A</button>
                                    <button id="possessionTeamB" class="btn btn--outline possession-btn">Team B</button>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card__body">
                                <h4>Team B Info</h4>
                                <div class="team-info">
                                    <div class="info-item">
                                        <span>Timeouts:</span>
                                        <div class="counter-controls">
                                            <button class="btn btn--sm" data-action="timeout-minus" data-team="teamB">-</button>
                                            <span id="teamBTimeouts">7</span>
                                            <button class="btn btn--sm" data-action="timeout-plus" data-team="teamB">+</button>
                                        </div>
                                    </div>
                                    <div class="info-item">
                                        <span>Team Fouls:</span>
                                        <div class="counter-controls">
                                            <button class="btn btn--sm" data-action="foul-minus" data-team="teamB">-</button>
                                            <span id="teamBFouls">0</span>
                                            <button class="btn btn--sm" data-action="foul-plus" data-team="teamB">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="stats-section" id="statsSection">
                    <div class="card">
                        <div class="card__body">
                            <div class="stats-header">
                                <h4>Comprehensive Player Statistics</h4>
                                <div class="stats-controls">
                                    <select id="statTeamSelect" class="form-control">
                                        <option value="teamA">Team A</option>
                                        <option value="teamB">Team B</option>
                                    </select>
                                </div>
                            </div>
                            <div class="player-scoring-grid" id="playerScoringGrid"></div>
                            <div class="comprehensive-stats-section">
                                <h5>Full Statistics Table</h5>
                                <div class="stats-table-container">
                                    <table class="comprehensive-stats-table">
                                        <thead>
                                            <tr>
                                                <th class="sticky-col">#</th>
                                                <th class="sticky-col">Name</th>
                                                <th>PTS</th>
                                                <th>FT</th>
                                                <th>2PT</th>
                                                <th>3PT</th>
                                                <th>ORB</th>
                                                <th>DRB</th>
                                                <th>REB</th>
                                                <th>AST</th>
                                                <th>STL</th>
                                                <th>BLK</th>
                                                <th>TO</th>
                                                <th>PF</th>
                                                <th>MIN</th>
                                            </tr>
                                        </thead>
                                        <tbody id="comprehensiveStatsTableBody">
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="quick-stats-actions">
                                <h5>Quick Stat Entry</h5>
                                <div class="quick-stat-grid">
                                    <select id="quickStatPlayer" class="form-control">
                                        <option value="">Select Player</option>
                                    </select>
                                    <div class="stat-buttons">
                                        <button class="btn btn--sm stat-btn" data-stat="offensiveRebounds">+ORB</button>
                                        <button class="btn btn--sm stat-btn" data-stat="defensiveRebounds">+DRB</button>
                                        <button class="btn btn--sm stat-btn" data-stat="assists">+AST</button>
                                        <button class="btn btn--sm stat-btn" data-stat="steals">+STL</button>
                                        <button class="btn btn--sm stat-btn" data-stat="blocks">+BLK</button>
                                        <button class="btn btn--sm stat-btn" data-stat="turnovers">+TO</button>
                                        <button class="btn btn--sm stat-btn" data-stat="fouls">+PF</button>
                                    </div>
                                </div>
                            </div>
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
                    <div class="viewer-top-scorer" id="viewerTeamATopScorer">No scorer yet</div>
                </div>
                <div class="viewer-center">
                    <div class="viewer-clock" id="viewerGameClock">12:00</div>
                    <div class="viewer-period">Period <span id="viewerPeriod">1</span></div>
                    <div class="viewer-shot-clock" id="viewerShotClock" style="display: none;">24</div>
                </div>
                <div class="viewer-team" id="viewerTeamB">
                    <h2 id="viewerTeamBName">Team B</h2>
                    <div class="viewer-score" id="viewerTeamBScore">0</div>
                    <div class="viewer-top-scorer" id="viewerTeamBTopScorer">No scorer yet</div>
                </div>
            </div>
            <div class="viewer-info">
                <div class="game-name" id="viewerGameName">Basketball Game</div>
                <div class="possession-indicator">
                    <span>Possession:</span>
                    <span id="viewerPossession">Team A</span>
                </div>
            </div>
        </div>
    </section>
    
    <div id="guestHostModal" class="modal hidden">
        <div class="modal-content">
            <h3>Guest Host Mode</h3>
            <p style="color: var(--color-text-secondary); margin: 16px 0;">
                You are hosting as a guest. This game will be **publicly viewable** by anyone with the code, but it **will not be saved to a profile**.
            </p>
            <div class="modal-actions">
                <button id="confirmGuestHost" class="btn btn--primary">I Understand, Continue</button>
            </div>
        </div>
    </div>
    
    <div id="finalizeGameModal" class="modal hidden">
        <div class="modal-content">
            <h3>Finalize Game</h3>
            <p style="color: var(--color-text-secondary); margin: 16px 0;">
                Are you sure you want to end this game? This action cannot be undone.
            </p>
            <div class="modal-actions">
                <button id="cancelFinalize" class="btn btn--outline">Cancel</button>
                <button id="confirmFinalize" class="btn btn--danger">End Game</button>
            </div>
        </div>
    </div>

    <div id="editClockModal" class="modal hidden">
        <div class="modal-content">
            <h3>Edit Game Clock</h3>
            <div class="form-group">
                <label for="editMinutes">Minutes:</label>
                <input id="editMinutes" type="number" min="0" max="99" class="form-control">
            </div>
            <div class="form-group">
                <label for="editSeconds">Seconds:</label>
                <input id="editSeconds" type="number" min="0" max="59" class="form-control">
            </div>
            <div class="modal-actions">
                <button id="cancelClockEdit" class="btn btn--outline">Cancel</button>
                <button id="saveClockEdit" class="btn btn--primary">Save</button>
            </div>
        </div>
    </div>

    <div id="editShotClockModal" class="modal hidden">
        <div class="modal-content">
            <h3>Edit Shot Clock</h3>
            <div class="form-group">
                <label for="editShotClockSeconds">Seconds:</label>
                <input id="editShotClockSeconds" type="number" min="0" max="60" class="form-control">
            </div>
            <div class="modal-actions">
                <button id="cancelShotClockEdit" class="btn btn--outline">Cancel</button>
                <button id="saveShotClockEdit" class="btn btn--primary">Save</button>
            </div>
        </div>
    </div>
    `;
}

// ================== ALL BASKETBALL FUNCTIONS ==================

function formatTime(minutes, seconds) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generateGameCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function showView(viewName) {
    console.log(`Switching to view: ${viewName}`);
    const views = ['landing', 'config', 'setup', 'control', 'viewer'];
    
    views.forEach(view => {
        const element = $(`${view}-view`);
        if (element) {
            if (view === viewName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    });
    
    state.view = viewName;

    if (viewName === 'landing' || viewName === 'config') {
        if (state.firestoreListener) {
            state.firestoreListener(); 
            state.firestoreListener = null;
            console.log('Detached Firestore listener.');
        }
        stopMasterTimer();
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

function handleShotClockViolation() {
    console.log('Shot clock violation!');
    playShotClockViolationBuzzer();
    showToast('SHOT CLOCK VIOLATION!', 'error', 3000);
    
    if (state.game) {
        state.game.gameState.shotClockRunning = false;
        const currentPossession = state.game.gameState.possession;
        const newPossession = currentPossession === 'teamA' ? 'teamB' : 'teamA';
        state.game.gameState.possession = newPossession;
        state.game.gameState.shotClock = 0;
        updateControlDisplay();
        saveGameState();
        showToast('Shot clock stopped - use restart buttons', 'warning', 4000);
    }
}

function startMasterTimer() {
    if (state.timers.masterTimer) {
        clearInterval(state.timers.masterTimer);
    }
    
    state.timers.masterTimer = setInterval(() => {
        if (!state.game) {
            stopMasterTimer();
            return;
        }
        
        let updated = false;
        
        if (state.game.gameState.gameRunning) {
            if (state.game.gameState.gameTime.seconds > 0) {
                state.game.gameState.gameTime.seconds--;
                updated = true;
            } else if (state.game.gameState.gameTime.minutes > 0) {
                state.game.gameState.gameTime.minutes--;
                state.game.gameState.gameTime.seconds = 59;
                updated = true;
            } else {
                state.game.gameState.gameRunning = false;
                state.game.gameState.shotClockRunning = false;
                if(state.isHost) {
                    showToast('Period ended!', 'warning', 3000);
                    saveGameState();
                }
            }
        }
        
        if (state.game.gameState.shotClockRunning && state.game.settings.shotClockDuration > 0) {
            if (state.game.gameState.shotClock > 0) {
                state.game.gameState.shotClock--;
                updated = true;
                
                if (state.game.gameState.shotClock === 5) {
                    const shotClockDisplay = $('shotClockDisplay');
                    const viewerShotClock = $('viewerShotClock');
                    if (shotClockDisplay) shotClockDisplay.classList.add('warning');
                    if (viewerShotClock) viewerShotClock.classList.add('warning');
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
            if (state.view === 'control') updateControlDisplay();
            if (state.view === 'viewer') updateSpectatorView();
        }

        if (!state.game.gameState.gameRunning && !state.game.gameState.shotClockRunning) {
            stopMasterTimer();
            if (state.view === 'control' && $('startGameBtn')) updateMasterStartButton();
        }
    }, 1000);
}

function stopMasterTimer() {
    if (state.timers.masterTimer) {
        clearInterval(state.timers.masterTimer);
        state.timers.masterTimer = null;
    }
    if (state.view === 'control' && $('startGameBtn')) updateMasterStartButton();
}

function toggleMasterGame() {
    if (!state.game || !state.isHost) return;
    
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
        btn.textContent = 'PAUSE GAME';
        btn.className = 'btn btn--primary master-start-btn pause';
    } else {
        btn.textContent = 'START GAME';
        btn.className = 'btn btn--primary master-start-btn resume';
    }
}

function resetAllClocks() {
    if (!state.game || !state.isHost) return;
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
    const shotClockDisplay = $('shotClockDisplay');
    const viewerShotClock = $('viewerShotClock');
    if (shotClockDisplay) shotClockDisplay.classList.remove('warning');
    if (viewerShotClock) viewerShotClock.classList.remove('warning');
}

function resetShotClockTo14() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    state.game.gameState.shotClock = 14;
    removeShotClockWarning();
    updateControlDisplay();
    saveGameState();
    showToast('Shot clock reset to 14s', 'info', 1500);
}

function resetShotClockTo24() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    state.game.gameState.shotClock = 24;
    removeShotClockWarning();
    updateControlDisplay();
    saveGameState();
    showToast('Shot clock reset to 24s', 'info', 1500);
}

function handle24sResetKey(event) {
    if (
        event.key === 'Enter' &&
        state.view === 'control' &&
        !state.clockEditing &&
        state.isHost &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA'
    ) {
        resetShotClockTo24();
    }
}

function startShotClockOnly() {
    if (!state.game || !state.isHost || state.game.settings.shotClockDuration === 0) return;
    if (state.game.gameState.shotClock <= 0) {
        showToast('Reset shot clock first', 'warning', 2000);
        return;
    }
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


async function finalizeGame() {
    if (!state.game || !state.isHost) return;
    
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
            showView('landing');
        }
    }, 2000);
}


function createGameSkeleton(code, config = {}) {
    const hostId = state.user ? state.user.uid : null;
    
    return {
        hostId: hostId, // This will be null for guests
        code: code,
        gameType: state.gameType,
        sport: 'basketball', // <-- CRITICAL FIELD
        status: 'live', // <-- NEW: Game status
        settings: {
            gameName: config.gameName || 'Basketball Game',
            periodDuration: config.periodDuration || 12,
            shotClockDuration: config.shotClockDuration || 24,
            timeoutsPerTeam: config.timeoutsPerTeam || 7
        },
        teamA: {
            name: config.teamAName || 'Team A',
            color: config.teamAColor || '#EA4335', // New Default
            score: 0,
            timeouts: config.timeoutsPerTeam || 7,
            fouls: 0,
            roster: [],
            stats: {}
        },
        teamB: {
            name: config.teamBName || 'Team B',
            color: config.teamBColor || '#4285F4', // New Default
            score: 0,
            timeouts: config.timeoutsPerTeam || 7,
            fouls: 0,
            roster: [],
            stats: {}
        },
        gameState: {
            period: 1,
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
    // --- UPDATED LOGIC ---
    // Now saves as long as you are the host (logged in or not)
    if (!state.isHost) return; 

    if (state.game && state.gameCode && db) {
        try {
            state.game.lastUpdate = Date.now();
            await db.collection('games').doc(state.gameCode).set(state.game);
        } catch (e) {
            console.warn('Failed to save game to Firebase:', e);
            // Don't show toast to guests, they don't have permissions
            if (state.user) {
                showToast('Sync failed. Check permissions.', 'error', 2000);
            }
        }
    }
}

/**
 * Updates the host's user profile with the new game code.
 */
async function updateUserProfileWithGame(gameCode) {
    // This function will only run if state.user exists
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
    
    const viewerTeamATopScorer = $('viewerTeamATopScorer');
    if (viewerTeamATopScorer) {
        viewerTeamATopScorer.textContent = (teamATopScorer && teamATopScorer.points > 0)
            ? `Top: ${teamATopScorer.name} (${teamATopScorer.points} pts)`
            : 'No scorer yet';
    }
    
    const viewerTeamBTopScorer = $('viewerTeamBTopScorer');
    if (viewerTeamBTopScorer) {
        viewerTeamBTopScorer.textContent = (teamBTopScorer && teamBTopScorer.points > 0)
            ? `Top: ${teamBTopScorer.name} (${teamBTopScorer.points} pts)`
            : 'No scorer yet';
    }
}

// ================== EVENT HANDLERS ==================

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
                
                if (state.gameType === 'friendly') {
                    showControlView();
                } else {
                    showTeamSetupView(); // Let them review/edit roster
                }

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
    
    showSpectatorView();
}

function showConfigurationView() {
    console.log('✓ Showing configuration view');
    showView('config');
    
    if (!state.gameCode) {
        state.gameCode = generateGameCode();
    }
    
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
    
    $('shotClockSelect').onchange = (e) => {
        $('customShotClockGroup').classList.toggle('hidden', e.target.value !== 'custom');
    };
    
    $('teamAColor').onchange = updateColorPreviews;
    $('teamBColor').onchange = updateColorPreviews;

    const backBtn = $('backToLanding');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            // This button now always goes back to the landing view
            showView('landing'); 
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
                showControlView();
            } else {
                showTeamSetupView();
            }
        }
    };
}

function gatherConfigurationData() {
    const shotClockSelect = $('shotClockSelect').value;
    let shotClockDuration = 24;
    if (shotClockSelect === 'custom') {
        shotClockDuration = parseInt($('customShotClock').value || '24');
    } else {
        shotClockDuration = parseInt(shotClockSelect);
    }
    
    return {
        gameName: $('gameNameInput').value.trim() || 'Basketball Game',
        periodDuration: parseInt($('periodDurationSelect').value || '12'),
        shotClockDuration: shotClockDuration,
        timeoutsPerTeam: 7, 
        teamAName: $('teamAName').value.trim() || 'Team A',
        teamBName: $('teamBName').value.trim() || 'Team B',
        teamAColor: $('teamAColor').value || '#EA4335', // New Default
        teamBColor: $('teamBColor').value || '#4285F4'  // New Default
    };
}

function validateConfiguration(config) {
    if (config.shotClockDuration < 0 || config.shotClockDuration > 60) {
        showToast('Shot clock: 0-60 seconds (0 = disabled)', 'error', 3000);
        return false;
    }
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
    showView('setup');
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
    $('backToConfig').onclick = (e) => { e.preventDefault(); showView('config'); };
    
    $('skipRosterSetup').onclick = (e) => {
        e.preventDefault();
        initializeFriendlyGame();
        saveGameState();
        showControlView();
    };
    $('startGame').onclick = (e) => {
        e.preventDefault();
        if (validateTeamSetup()) {
            initializePlayerStats();
            saveGameState();
            showControlView();
        }
    };
}

function addPlayer(team) {
    // Order changed
    const nameInput = $(`${team}PlayerName`);
    const numberInput = $(`${team}PlayerNumber`);
    const positionSelect = $(`${team}PlayerPosition`);
    
    // Order changed
    const name = nameInput.value.trim();
    const number = parseInt(numberInput.value);
    const position = positionSelect.value || '';
    
    if (!validatePlayerInput(team, number, name)) return;
    
    state.game[team].roster.push({ number, name, position });
    numberInput.value = '';
    nameInput.value = '';
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

function showControlView() {
    console.log('Showing control view');
    
    if (state.game && state.game.status === 'final') {
        showToast('This game is finalized. Viewing stats.', 'info', 2000);
        joinSpectatorMode(state.gameCode); // Open in spectator mode
        return;
    }
    
    showView('control');
    
    $('controlGameCode').textContent = state.gameCode;
    $('copyControlCode').onclick = (e) => { e.preventDefault(); copyToClipboard(state.gameCode); };
    $('gameNameDisplay').textContent = state.game.settings.gameName;
    
    const shotClockSection = $('shotClockSection');
    const viewerShotClock = $('viewerShotClock');
    if (state.game.settings.shotClockDuration === 0) {
        if (shotClockSection) shotClockSection.classList.add('hidden');
        if (viewerShotClock) viewerShotClock.style.display = 'none';
    } else {
        if (shotClockSection) shotClockSection.classList.remove('hidden');
        if (viewerShotClock) viewerShotClock.style.display = 'block';
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
    const playerStats = state.game[team].stats[playerNumber];
    const playerName = state.game[team].roster.find(p => p.number == playerNumber)?.name || `#${playerNumber}`;
    
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
    const playerStats = state.game[team].stats[playerNumber];
    const playerName = state.game[team].roster.find(p => p.number == playerNumber)?.name || `#${playerNumber}`;
    
    playerStats[statType]++;
    
    if(statType === 'fouls') {
        state.game[team].fouls++; 
    }
    
    setupPlayerScoringGrid();
    updateComprehensiveStatsTable();
    updateControlDisplay(); 
    saveGameState();
    
    const statNames = {
        'offensiveRebounds': 'Off. Rebound', 'defensiveRebounds': 'Def. Rebound', 
        'assists': 'Assist', 'steals': 'Steal', 'blocks': 'Block',
        'turnovers': 'Turnover', 'fouls': 'Personal Foul'
    };
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
    $('resetAllBtn').onclick = (e) => { e.preventDefault(); resetAllClocks(); };
    $('editGameClock').onclick = (e) => { e.preventDefault(); showEditClockModal(); };
    $('gameClockDisplay').onclick = (e) => { if (state.isHost) showEditClockModal(); };
    $('shotClockDisplay').onclick = (e) => { if (state.isHost) showEditShotClockModal(); };
    $('editShotClock').onclick = (e) => { e.preventDefault(); showEditShotClockModal(); };
    $('nextPeriod').onclick = (e) => { e.preventDefault(); nextPeriodFunc(); };
    $('resetShotClock14').onclick = (e) => { e.preventDefault(); resetShotClockTo14(); };
    $('resetShotClock24').onclick = (e) => { e.preventDefault(); resetShotClockTo24(); };
    $('startShotClock').onclick = (e) => { e.preventDefault(); startShotClockOnly(); };
    
    $('finalizeGameBtn').onclick = (e) => { e.preventDefault(); showFinalizeGameModal(); };
    $('exportGame').onclick = (e) => { e.preventDefault(); exportGameData(); };
    
    // Share Button Listener
    $('shareGameBtn').onclick = (e) => {
        e.preventDefault();
        // Construct the full URL for watching
        const shareUrl = `${window.location.origin}${window.location.pathname.replace('scoreboard.html', 'sports.html')}?mode=watch&code=${state.gameCode}&sport=basketball`;
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

function nextPeriodFunc() {
    if (!state.game || !state.isHost) return;
    state.game.gameState.period++;
    state.game.gameState.gameTime.minutes = state.game.settings.periodDuration;
    state.game.gameState.gameTime.seconds = 0;
    if (state.game.settings.shotClockDuration > 0) {
        state.game.gameState.shotClock = state.game.settings.shotClockDuration;
    }
    state.game.gameState.gameRunning = false;
    state.game.gameState.shotClockRunning = false;
    stopMasterTimer();
    updateControlDisplay();
    updateMasterStartButton();
    saveGameState();
    showToast(`Period ${state.game.gameState.period} started`, 'info', 2000);
}

function updateScore(team, points) {
    if (!state.game || !state.isHost) return;
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
    $('teamAScore').textContent = state.game.teamA.score;
    $('teamBScore').textContent = state.game.teamB.score;
    $('teamAName').textContent = state.game.teamA.name;
    $('teamBName').textContent = state.game.teamB.name;
    $('gameClockDisplay').textContent = formatTime(state.game.gameState.gameTime.minutes, state.game.gameState.gameTime.seconds);
    if ($('shotClockDisplay') && state.game.settings.shotClockDuration > 0) {
        $('shotClockDisplay').textContent = state.game.gameState.shotClock;
    }
    $('periodDisplay').textContent = state.game.gameState.period;
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
}

// --- NEW STYLISH EXPORT FUNCTIONS ---

// Define Styles
const STYLES = {
    title: {
        font: { bold: true, sz: 24, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "357568" } }, // Teal
        alignment: { horizontal: "center", vertical: "center" }
    },
    subtitle: {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" }
    },
    teamHeader: {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "5F6368" } } // Dark Grey
    },
    statHeader: {
        font: { bold: true, sz: 10, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "D9D9D9" } }, // Light Grey
        alignment: { horizontal: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    cell: {
        font: { sz: 10 },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    },
    cellCenter: {
        font: { sz: 10 },
        alignment: { horizontal: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    }
};

function exportGameData() {
    if (!state.game || typeof XLSX === 'undefined') {
        showToast('Export not available', 'error', 2000);
        return;
    }
    
    try {
        const wb = (state.game.gameType === 'full') 
            ? createComprehensiveBoxScoreData(state.game) 
            : createFriendlyGameExport(state.game); // Use new friendly export
            
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        
        const fileName = `${state.game.settings.gameName.replace(/\s+/g, '_')}_Box_Score.xlsx`;
        
        // Use FileSaver.js (which is included in xlsx-js-style)
        saveAs(blob, fileName);
        
        showToast('Data exported successfully!', 'success', 2000);
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed', 'error', 2000);
    }
}

// New Styled Export for Friendly Games
function createFriendlyGameExport(g) {
    const wb = XLSX.utils.book_new();
    const ws = {};

    const colWidths = [{ wch: 30 }, { wch: 20 }];
    
    // Title
    ws['A1'] = { v: g.settings.gameName, s: STYLES.title };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    
    // Subtitle
    ws['A2'] = { v: `${g.teamA.name} vs ${g.teamB.name}`, s: STYLES.subtitle };
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
    
    // Headers
    ws['A4'] = { v: "Team", s: STYLES.teamHeader };
    ws['B4'] = { v: "Final Score", s: STYLES.teamHeader };
    
    // Team A
    ws['A5'] = { v: g.teamA.name, s: STYLES.cell };
    ws['B5'] = { v: g.teamA.score, s: STYLES.cellCenter };
    
    // Team B
    ws['A6'] = { v: g.teamB.name, s: STYLES.cell };
    ws['B6'] = { v: g.teamB.score, s: STYLES.cellCenter };
    
    ws['!ref'] = `A1:B6`;
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Game Summary');
    return wb;
}


function createComprehensiveBoxScoreData(g) {
    const wb = XLSX.utils.book_new();
    const ws = {};
    
    const statHeaders = ['#', 'Player', 'PTS', 'FT', '2PT', '3PT', 'ORB', 'DRB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'MIN'];
    const colWidths = [
        { wch: 5 },  // #
        { wch: 25 }, // Player
        { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, // PTS, FT, 2PT, 3PT
        { wch: 5 }, { wch: 5 }, { wch: 5 }, // ORB, DRB, REB
        { wch: 5 }, { wch: 5 }, { wch: 5 }, // AST, STL, BLK
        { wch: 5 }, { wch: 5 }, { wch: 5 }  // TO, PF, MIN
    ];

    // --- Title Row ---
    ws['A1'] = { v: g.settings.gameName, s: STYLES.title };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: statHeaders.length - 1 } }]; 

    // --- Final Score ---
    ws['A2'] = { v: `${g.teamA.name}: ${g.teamA.score}  |  ${g.teamB.name}: ${g.teamB.score}`, s: STYLES.subtitle };
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: statHeaders.length - 1 } });
    
    let R = 3; // Start content from row 4

    // --- Team A ---
    ws[`A${R}`] = { v: g.teamA.name, s: STYLES.teamHeader };
    ws['!merges'].push({ s: { r: R-1, c: 0 }, e: { r: R-1, c: statHeaders.length - 1 } });
    R++;
    
    statHeaders.forEach((h, C) => {
        ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: h, s: STYLES.statHeader };
    });
    R++;
    
    g.teamA.roster.forEach(p => {
        const stats = g.teamA.stats[p.number] || {};
        const row = playerStatsToArray(p, stats);
        row.forEach((cell, C) => {
            ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: cell, s: C === 1 ? STYLES.cell : STYLES.cellCenter };
        });
        R++;
    });

    R++; // Add a blank row
    
    // --- Team B ---
    ws[`A${R}`] = { v: g.teamB.name, s: STYLES.teamHeader };
    ws['!merges'].push({ s: { r: R-1, c: 0 }, e: { r: R-1, c: statHeaders.length - 1 } });
    R++;
    
    statHeaders.forEach((h, C) => {
        ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: h, s: STYLES.statHeader };
    });
    R++;
    
    g.teamB.roster.forEach(p => {
        const stats = g.teamB.stats[p.number] || {};
        const row = playerStatsToArray(p, stats);
        row.forEach((cell, C) => {
            ws[XLSX.utils.encode_cell({r: R-1, c: C})] = { v: cell, s: C === 1 ? STYLES.cell : STYLES.cellCenter };
        });
        R++;
    });

    ws['!ref'] = `A1:${XLSX.utils.encode_cell({r: R-1, c: statHeaders.length - 1})}`;
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Box Score');
    return wb;
}

// This function is now just a data helper
function playerStatsToArray(player, stats) {
    const s = stats || { totalPoints: 0, freeThrows: 0, fieldGoals: 0, threePointers: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, minutes: 0 };
    const totalRebounds = s.offensiveRebounds + s.defensiveRebounds;
    return [
        player.number, player.name, 
        s.totalPoints, s.freeThrows, s.fieldGoals, s.threePointers,
        s.offensiveRebounds, s.defensiveRebounds, totalRebounds,
        s.assists, s.steals, s.blocks, s.turnovers, s.fouls, s.minutes
    ];
}
// --- END EXPORT FUNCTIONS ---

function showSpectatorView() {
    console.log('Showing spectator view');
    showView('viewer');

    $$('.score-btn, .possession-btn, .master-start-btn, .clock-control-row button, .shot-clock-actions button, [data-action]').forEach(btn => {
        btn.disabled = true;
    });
    $$('.clock-display, .shot-clock-display').forEach(el => {
        el.title = "Spectator View";
        el.style.cursor = 'default';
    });
    if ($('quickStatPlayer')) $('quickStatPlayer').disabled = true;
    if ($('statTeamSelect')) $('statTeamSelect').disabled = true;
    if ($('finalizeGameBtn')) $('finalizeGameBtn').classList.add('hidden');
    if ($('exportGame')) $('exportGame').classList.add('hidden');
    if ($('shareGameBtn')) $('shareGameBtn').classList.add('hidden');


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

function updateSpectatorView() {
    if (!state.game) return;
    $('viewerTeamAName').textContent = state.game.teamA.name;
    $('viewerTeamBName').textContent = state.game.teamB.name;
    $('viewerTeamAScore').textContent = state.game.teamA.score;
    $('viewerTeamBScore').textContent = state.game.teamB.score;
    $('viewerGameClock').textContent = formatTime(state.game.gameState.gameTime.minutes, state.game.gameState.gameTime.seconds);
    const viewerShotClock = $('viewerShotClock');
    if (viewerShotClock && state.game.settings.shotClockDuration > 0) {
        viewerShotClock.textContent = state.game.gameState.shotClock;
        viewerShotClock.style.display = 'block';
    } else if (viewerShotClock) {
        viewerShotClock.style.display = 'none';
    }
    $('viewerPeriod').textContent = state.game.gameState.period;
    $('viewerGameName').textContent = state.game.settings.gameName;
    $('viewerPossession').textContent = state.game.gameState.possession === 'teamA' ? state.game.teamA.name : state.game.teamB.name;
    updateTopScorerDisplay();
}

function setupAutoSave() {
    if (state.timers.autoSave) clearInterval(state.timers.autoSave);
    // Auto-save now works for ALL hosts
    if (state.isHost) {
        state.timers.autoSave = setInterval(saveGameState, 30000);
    }
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
    document.addEventListener('keydown', handle24sResetKey);

    // 3. --- THIS IS THE NEW LOGIC ---
    // Read the mode from the URL
    const watchCode = urlParams.get('watch');
    const hostMode = urlParams.get('host'); // 'true' (logged in) or 'free'

    if (watchCode) {
        // This is a spectator, join the game immediately
        state.isHost = false;
        joinSpectatorMode(watchCode); // This will showView('viewer')
    
    } else if (hostMode === 'true' || hostMode === 'free') {
        // This is a LOGGED-IN HOST or a GUEST HOST
        state.isHost = true;
        
        // Show them the landing page
        showView('landing'); 
        
        // Add listeners for the landing page
        $('watchGameBtn').addEventListener('click', handleWatchGame);
        $('watchCodeInput').addEventListener('input', handleWatchCodeInput);
        $('hostGameBtn').addEventListener('click', handleHostGame);
        $('hostCodeInput').addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            e.target.value = value;
        });

    } else {
        // Fallback (e.g., someone types scoreboard.html?sport=basketball)
        // Treat as guest
        state.isHost = true;
        showView('landing');
        $('watchGameBtn').addEventListener('click', handleWatchGame);
        $('watchCodeInput').addEventListener('input', handleWatchCodeInput);
        $('hostGameBtn').addEventListener('click', handleHostGame);
        $('hostCodeInput').addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            e.target.value = value;
        });
    }
    
    console.log('✓ Basketball module ready!');
}

// ================== EXPORT ==================
export default {
    sportName: "Basketball",
    buildHtml,
    init
};