// sports/basketball-view.js

/**
 * Returns the HTML structure for the Basketball module.
 * Includes Landing, Config, Control, and Viewer views + Modals.
 */
export function buildHtml() {
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
                            <label class="form-label" for="hostCodeInput">Game Code (Optional)</label>
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
                                <label class="form-label">Game Format</label>
                                <div style="display: flex; gap: 16px; margin-top: 8px;">
                                    <label style="display: flex; align-items: center; gap: 8px; font-size: 16px;">
                                        <input type="radio" name="periodType" value="quarter" checked> Quarters (4)
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; font-size: 16px;">
                                        <input type="radio" name="periodType" value="half"> Halves (2)
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Duration (Mins)</label>
                                <select id="periodDurationSelect" class="form-control">
                                    <option value="8">8 minutes</option>
                                    <option value="10">10 minutes</option>
                                    <option value="12" selected>12 minutes</option>
                                    <option value="15">15 minutes</option>
                                    <option value="20">20 minutes</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Shot Clock (Defaults to 24s)</label>
                            <div class="theme-switch-container">
                                <span>Off</span>
                                <label class="theme-switch">
                                    <input type="checkbox" id="shotClockToggle" checked>
                                    <span class="theme-slider"></span>
                                </label>
                                <span>On</span>
                            </div>
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
                            <div class="form-row" style="grid-template-columns: 1fr 90px 100px auto; gap: 8px; align-items: flex-end;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Player Name</label>
                                    <input id="teamAPlayerName" class="form-control" placeholder="Name" maxlength="30">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Jersey #</label>
                                    <input id="teamAPlayerNumber" class="form-control" type="number" min="0" max="99" placeholder="#">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Position</label>
                                    <select id="teamAPlayerPosition" class="form-control">
                                        <option value="">Pos</option>
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
                        <div id="teamARoster" class="roster-list" style="padding: 16px 0 0 0;"></div>
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
                             <div class="form-row" style="grid-template-columns: 1fr 90px 100px auto; gap: 8px; align-items: flex-end;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Player Name</label>
                                    <input id="teamBPlayerName" class="form-control" placeholder="Name" maxlength="30">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Jersey #</label>
                                    <input id="teamBPlayerNumber" class="form-control" type="number" min="0" max="99" placeholder="#">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Position</label>
                                    <select id="teamBPlayerPosition" class="form-control">
                                        <option value="">Pos</option>
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
                        <div id="teamBRoster" class="roster-list" style="padding: 16px 0 0 0;"></div>
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

    <section id="pre-game-view" class="view hidden">
        <div class="container" style="max-width: 600px; padding-top: 50px; text-align: center;">
            <header class="landing-header">
                <h1 class="main-title">Game Ready!</h1>
                <p class="hero-subtitle">The game is set up. Review the shortcuts below.</p>
            </header>
            
            <div class="card">
                <div class="card__body">
                    <h3 style="text-align: center;">Keyboard Shortcuts</h3>
                    <table class="comprehensive-stats-table" style="font-size: 14px; table-layout: auto; margin-top: 16px;">
                        <thead>
                            <tr style="background: none;">
                                <th style="text-align: left; background: var(--color-secondary);">Key</th>
                                <th style="text-align: left; background: var(--color-secondary);">Action</th>
                            </tr>
                        </thead>
                        <tbody style="border: 1px solid var(--color-border);">
                            <tr><td style="font-weight: 600;">Spacebar</td><td>Start / Pause Game Clock</td></tr>
                            <tr><td style="font-weight: 600;">Enter</td><td>Reset Shot Clock to Full & START</td></tr>
                            <tr><td style="font-weight: 600;">R (Shift+r)</td><td>Reset Shot Clock to Full (No Start)</td></tr>
                            <tr><td style="font-weight: 600;">r</td><td>Reset Shot Clock to 14s (No Start)</td></tr>
                            <tr><td style="font-weight: 600;">s</td><td>Start Shot Clock Only</td></tr>
                            <tr><td style="font-weight: 600;">p</td><td>Toggle Possession</td></tr>
                            <tr><td style="font-weight: 600;">z</td><td>Undo Last Action</td></tr>
                            <tr><td style="font-weight: 600;">h</td><td>Show Help Menu</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section-actions" style="justify-content: center; margin-top: 24px;">
                <button id="startControlViewBtn" class="btn btn--primary btn--lg">START GAME</button>
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
                    <button id="helpBtn" class="btn btn--outline">Help (h)</button>
                    <button id="undoBtn" class="btn btn--secondary" disabled>Undo (z)</button>
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
                                    <div class="period-display"><span id="quarterHalfLabel">Quarter</span> <span id="periodDisplay">1</span></div>
                                    <div class="master-clock-controls">
                                        <button id="startGameBtn" class="btn btn--primary master-start-btn">START (Space)</button>
                                        <div class="clock-control-row">
                                            <button id="resetAllBtn" class="btn btn--outline btn--sm">Reset All</button>
                                            <button id="editGameClock" class="btn btn--secondary btn--sm">Edit Time</button>
                                            <button id="nextPeriod" class="btn btn--secondary btn--sm">Next</button>
                                        </div>
                                    </div>
                                    <div class="shot-clock-section" id="shotClockSection">
                                        <div class="shot-clock-display" id="shotClockDisplay" title="Click to edit">24</div>
                                        <div class="shot-clock-label">Shot Clock</div>
                                        <div class="shot-clock-actions">
                                            <button id="resetShotClock14" class="btn btn--warning btn--sm">14s</button>
                                            <button id="resetShotClockFull" class="btn btn--warning btn--sm">Full</button>
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
                                <h4>Possession (p)</h4>
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

    <section id="viewer-view-pro" class="view hidden">
        <header class="viewer-header">
            <div id="viewerGameName" class="viewer-game-name">Basketball Game</div>
            <button id="toggleViewPro" class="viewer-settings-btn">⚙️</button>
            <div id="viewerPossession" class="viewer-possession">
                <span class="possession-dot"></span>
                <span id="viewerPossessionTeamName">Team A</span>
            </div>
        </header>

        <main class="viewer-main-scoreboard">
            <div class="viewer-team-panel left" id="viewerTeamA">
                <div id="viewerTeamAName" class="viewer-team-name">TEAM A</div>
                <div id="viewerTeamAScore" class="viewer-team-score">0</div>
            </div>

            <div class="viewer-center-panel">
                <div class="viewer-qtr-box">
                    <div id="viewerQuarterHalfLabel" class="viewer-qtr-label">QUARTER</div>
                    <div id="viewerPeriod" class="viewer-quarter">1</div>
                </div>
                <div id="viewerGameClock" class="viewer-game-clock">12:00</div>
                <div class="viewer-sc-box" id="viewerShotClockBox">
                    <div class="viewer-sc-label">SHOT</div>
                    <div id="viewerShotClock" class="viewer-shot-clock">24</div>
                </div>
            </div>

            <div class="viewer-team-panel right" id="viewerTeamB">
                <div id="viewerTeamBName" class="viewer-team-name">TEAM B</div>
                <div id="viewerTeamBScore" class="viewer-team-score">0</div>
            </div>
        </main>

        <footer class="viewer-footer">
            <div class="viewer-stat-box" id="viewerTeamAFoulsBox">
                <div class="viewer-stat-label">FOULS</div>
                <div id="viewerTeamAFouls" class="viewer-stat-value">0</div>
            </div>
            <div class="viewer-stat-box" id="viewerTeamATimeoutsBox">
                <div class="viewer-stat-label">TIMEOUTS</div>
                <div id="viewerTeamATimeouts" class="viewer-stat-value">7</div>
            </div>
            <div id="viewerTeamATopScorer" class="viewer-top-scorer-small" style="text-align: right;">
            </div>
            <div id="viewerTeamBTopScorer" class="viewer-top-scorer-small" style="text-align: left;">
            </div>
            <div class="viewer-stat-box" id="viewerTeamBTimeoutsBox">
                <div class="viewer-stat-label">TIMEOUTS</div>
                <div id="viewerTeamBTimeouts" class="viewer-stat-value">7</div>
            </div>
            <div class="viewer-stat-box" id="viewerTeamBFoulsBox">
                <div class="viewer-stat-label">FOULS</div>
                <div id="viewerTeamBFouls" class="viewer-stat-value">0</div>
            </div>
        </footer>
    </section>

    <section id="viewer-view-classic" class="view hidden">
        <div class="container-fluid" style="padding-top: 20px;">
            <div class="viewer-info" style="margin-bottom: 20px; position: relative;">
                <div id="classicViewerGameName" class="game-name">Basketball Game</div>
                <button id="toggleViewClassic" class="btn btn--outline" style="font-size: 24px; padding: 4px 10px; position: absolute; right: 20px; top: 50%; transform: translateY(-50%);">⚙️</button>
                <div class="possession-indicator">
                    <span>Possession:</span>
                    <span id="classicViewerPossession">Team A</span>
                </div>
            </div>
            <div class="viewer-scoreboard">
                <div class="viewer-team" id="classicViewerTeamA">
                    <h2 id="classicViewerTeamAName">Team A</h2>
                    <div id="classicViewerTeamAScore" class="viewer-score">0</div>
                    <div id="classicViewerTeamATopScorer" class="viewer-top-scorer">No scorer yet</div>
                </div>
                <div class="viewer-center">
                    <div id="classicViewerGameClock" class="viewer-clock">12:00</div>
                    <div class="viewer-period"><span id="classicQuarterHalfLabel">Quarter</span> <span id="classicViewerPeriod">1</span></div>
                    <div id="classicViewerShotClock" class="viewer-shot-clock" style="display: none;">24</div>
                </div>
                <div class="viewer-team" id="classicViewerTeamB">
                    <h2 id="classicViewerTeamBName">Team B</h2>
                    <div id="classicViewerTeamBScore" class="viewer-score">0</div>
                    <div id="classicViewerTeamBTopScorer" class="viewer-top-scorer">No scorer yet</div>
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

    <div id="resetAllModal" class="modal hidden">
        <div class="modal-content">
            <h3>Reset All Clocks</h3>
            <p style="color: var(--color-text-secondary); margin: 16px 0;">
                Are you sure you want to reset the Game Clock and Shot Clock?
            </p>
            <div class="modal-actions">
                <button id="cancelResetAll" class="btn btn--outline">Cancel</button>
                <button id="confirmResetAll" class="btn btn--danger">Reset</button>
            </div>
        </div>
    </div>

    <div id="undoModal" class="modal hidden">
        <div class="modal-content">
            <h3>Undo Last Action</h3>
            <p style="color: var(--color-text-secondary); margin: 16px 0;">
                Are you sure you want to undo this action?
            </p>
            <p id="undoMessage" style="font-weight: 600; text-align: center; color: var(--color-warning);"></p>
            <div class="modal-actions">
                <button id="cancelUndo" class="btn btn--outline">Cancel</button>
                <button id="confirmUndo" class="btn btn--danger">Undo</button>
            </div>
        </div>
    </div>

    <div id="helpModal" class="modal hidden">
        <div class="modal-content" style="max-width: 500px;">
            <h3>Keyboard Shortcuts</h3>
            <p style="color: var(--color-text-secondary); margin: 16px 0;">
                Use these keys to control the game when not editing text.
            </p>
            <table class="comprehensive-stats-table" style="font-size: 14px; table-layout: auto;">
                <thead>
                    <tr style="background: none;">
                        <th style="text-align: left; background: var(--color-secondary);">Key</th>
                        <th style="text-align: left; background: var(--color-secondary);">Action</th>
                    </tr>
                </thead>
                <tbody style="border: 1px solid var(--color-border);">
                    <tr><td style="font-weight: 600;">Spacebar</td><td>Start / Pause Game Clock</td></tr>
                    <tr><td style="font-weight: 600;">Enter</td><td>Reset Shot Clock to Full & START</td></tr>
                    <tr><td style="font-weight: 600;">R (Shift+r)</td><td>Reset Shot Clock to Full (No Start)</td></tr>
                    <tr><td style="font-weight: 600;">r</td><td>Reset Shot Clock to 14s (No Start)</td></tr>
                    <tr><td style="font-weight: 600;">s</td><td>Start Shot Clock Only</td></tr>
                    <tr><td style="font-weight: 600;">p</td><td>Toggle Possession</td></tr>
                    <tr><td style="font-weight: 600;">z</td><td>Undo Last Action</td></tr>
                    <tr><td style="font-weight: 600;">h</td><td>Show this Help Menu</td></tr>
                </tbody>
            </table>
            <div class="modal-actions" style="justify-content: space-between; margin-top: 20px;">
                <button id="detailedHelpBtn" class="btn btn--outline">Detailed Explanations</button>
                <button id="closeHelpModal" class="btn btn--primary">Close</button>
            </div>
        </div>
    </div>

    <div id="detailedHelpModal" class="modal hidden">
        <div class="modal-content" style="max-width: 500px; text-align: left;">
            <h3>Detailed Explanations</h3>
            
            <h5 style="margin-top: 16px;">Clock Controls</h5>
            <ul style="font-size: 14px; color: var(--color-text-secondary); margin-left: 20px; line-height: 1.6;">
                <li><b>Start/Pause (Space):</b> Toggles the main game clock. This will also pause the shot clock.</li>
                <li><b>Reset Full & Start (Enter):</b> This is for a new possession after a score. It resets the shot clock to its full time (e.g., 24s) and starts it instantly.</li>
                <li><b>Reset Full (R):</b> Resets the shot clock to full but does NOT start it. Useful for setting up before a play.</li>
                <li><b>Reset 14s (r):</b> Resets the shot clock to 14s (or the offensive rebound time) and does NOT start it. Use this after an offensive rebound.</li>
                <li><b>Start Shot Clock (s):</b> Starts *only* the shot clock. The game clock remains paused. Use this for inbounding at the start of a period.</li>
            </ul>

            <h5 style="margin-top: 16px;">Game Management</h5>
            <ul style="font-size: 14px; color: var(--color-text-secondary); margin-left: 20px; line-height: 1.6;">
                <li><b>Undo (z):</b> Reverts the last major action (e.g., score, clock edit, foul). A confirmation is required.</li>
                <li><b>Toggle Possession (p):</b> Manually switches the possession arrow.</li>
                <li><b>Friendly vs. Full Game:</b> "Friendly" is for quick games with no player stats. "Full Game" enables player rosters and tracking of individual stats (PTS, REB, AST, etc.).</li>
            </ul>

            <div class="modal-actions">
                <button id="closeDetailedHelpModal" class="btn btn--primary">Close</button>
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

    <div id="viewerSettingsModal" class="modal hidden">
        <div class="modal-content" style="max-width: 340px;">
            <h3>Display Settings</h3>
            <p style="color: var(--color-text-secondary); margin-bottom: 20px; font-size: 14px;">
                Select a visual style for the scoreboard:
            </p>
            
            <div class="theme-selection-grid" style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn--secondary btn--full-width viewer-theme-btn" data-theme="system" style="justify-content: flex-start; padding: 12px;">
                    <span style="margin-right: 10px;">📱</span> System Default
                </button>

                <button class="btn btn--secondary btn--full-width viewer-theme-btn" data-theme="light" style="justify-content: flex-start; padding: 12px;">
                    <span style="margin-right: 10px;">☀️</span> Light Theme
                </button>

                <button class="btn btn--secondary btn--full-width viewer-theme-btn" data-theme="professional" style="justify-content: flex-start; padding: 12px; background: #000; color: #fff; border: 1px solid #333;">
                    <span style="margin-right: 10px;">📟</span> Professional LED
                </button>
            </div>

            <div class="modal-actions" style="justify-content: center; margin-top: 24px;">
                <button id="closeViewerSettingsModal" class="btn btn--outline">Close</button>
            </div>
        </div>
    </div>
    `;
}