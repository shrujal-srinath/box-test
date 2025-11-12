// Import the firebase services we need
import { db, firebase } from '../modules/firebase.js';

// Get access to the global utilities from main.js
let $;
let $$;
let showToast;
let copyToClipboard;

// ================== MODULE-SPECIFIC STATE ==================
const state = {
    isHost: false,
    user: null, // Will be set by init
    gameCode: null,
    game: null, // This will hold our game data from Firebase
    firestoreListener: null // This will hold our "live" listener
};

// ================== HTML BUILDER ==================
function buildHtml() {
    return `
    <section id="control-view" class="view">
        <div class="container-fluid">
            <header class="control-header">
                <div class="control-title">
                    <h2 id="gameNameDisplay">Badminton Match</h2>
                    <div class="game-code-display">
                        <span class="status status--info">
                            Game Code: <span id="controlGameCode">...</span>
                        </span>
                        <button id="copyControlCode" class="btn btn--outline btn--sm">Copy</button>
                    </div>
                </div>
                <div class="control-actions">
                    <button id="shareGameBtn" class="btn btn--outline">Share Link</button>
                    <button id="finalizeGameBtn" class="btn btn--danger host-control" style="display: none;">End Match</button>
                </div>
            </header>

            <div class="scoreboard" style="padding: 32px;">
                <div class="team-score" id="teamAScoreSection">
                    <input id="teamANameInput" class="form-control host-control" value="Player A" style="text-align: center; font-size: 1.5rem; display: none;">
                    <h3 id="teamANameDisplay">Player A</h3>
                    <div class="score-display" id="teamAScore">0</div>
                    <div class="score-controls host-control" style="display: none;">
                        <button class="btn btn--sm score-btn" data-team="teamA" data-points="1">+1</button>
                        <button class="btn btn--sm score-btn btn--score-minus" data-team="teamA" data-points="-1">-1</button>
                    </div>
                </div>

                <div class="clock-section">
                    <div class="period-display" style="font-size: 1.5rem; margin-bottom: 16px;">GAMES WON</div>
                    <div style="display: flex; gap: 32px; align-items: center;">
                        <div id="teamAGames" class="score-display" style="font-size: 3rem;">0</div>
                        <div class="period-display" style="font-size: 2.5rem;">-</div>
                        <div id="teamBGames" class="score-display" style="font-size: 3rem;">0</div>
                    </div>
                     <div class="host-control" style="display: none; margin-top: 24px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
                        <button id="awardGameTeamA" class="btn btn--sm btn--secondary">Award Game to Player A</button>
                        <button id="awardGameTeamB" class="btn btn--sm btn--secondary">Award Game to Player B</button>
                    </div>
                </div>

                <div class="team-score" id="teamBScoreSection">
                    <input id="teamBNameInput" class="form-control host-control" value="Player B" style="text-align: center; font-size: 1.5rem; display: none;">
                    <h3 id="teamBNameDisplay">Player B</h3>
                    <div class="score-display" id="teamBScore">0</div>
                    <div class="score-controls host-control" style="display: none;">
                        <button class="btn btn--sm score-btn" data-team="teamB" data-points="1">+1</button>
                        <button class="btn btn--sm score-btn btn--score-minus" data-team="teamB" data-points="-1">-1</button>
                    </div>
                </div>
            </div>
        </div>
    </section>
    `;
}

// ================== HELPER FUNCTIONS ==================

function createGameSkeleton(code) {
    return {
        hostId: state.user ? state.user.uid : null,
        code: code,
        sport: 'badminton',
        status: 'live',
        teamA: {
            name: 'Player A',
            score: 0,
            games: 0 // Changed from sets
        },
        teamB: {
            name: 'Player B',
            score: 0,
            games: 0 // Changed from sets
        },
        lastUpdate: Date.now()
    };
}

async function saveGameState() {
    if (!state.isHost || !state.game || !db) return;
    try {
        state.game.lastUpdate = Date.now();
        await db.collection('games').doc(state.gameCode).set(state.game);
    } catch (e) {
        console.warn('Failed to save game to Firebase:', e);
        if (state.user) {
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

function updateUI() {
    if (!state.game) return;

    // Set Team Names
    $('teamANameDisplay').textContent = state.game.teamA.name;
    $('teamBNameDisplay').textContent = state.game.teamB.name;
    $('teamANameInput').value = state.game.teamA.name;
    $('teamBNameInput').value = state.game.teamB.name;

    // Set Scores
    $('teamAScore').textContent = state.game.teamA.score;
    $('teamBScore').textContent = state.game.teamB.score;
    
    // Set Games
    $('teamAGames').textContent = state.game.teamA.games;
    $('teamBGames').textContent = state.game.teamB.games;

    // Set Game Name & Code
    $('gameNameDisplay').textContent = `${state.game.teamA.name} vs ${state.game.teamB.name}`;
    $('controlGameCode').textContent = state.gameCode;
    
    // Update button text
    if ($('awardGameTeamA')) $('awardGameTeamA').textContent = `Award Game to ${state.game.teamA.name}`;
    if ($('awardGameTeamB')) $('awardGameTeamB').textContent = `Award Game to ${state.game.teamB.name}`;
    
    // Show host controls
    if (state.isHost) {
        $$('.host-control').forEach(el => el.style.display = 'flex');
        $('teamANameInput').style.display = 'block';
        $('teamBNameInput').style.display = 'block';
        $('teamANameDisplay').style.display = 'none';
        $('teamBNameDisplay').style.display = 'none';
        $('finalizeGameBtn').style.display = 'flex';
    }
}

function attachHostListeners() {
    if (!state.isHost) return;

    // Score buttons
    $$('.score-btn').forEach(btn => {
        btn.onclick = (e) => {
            const team = e.target.dataset.team;
            const points = parseInt(e.target.dataset.points);
            state.game[team].score = Math.max(0, state.game[team].score + points);
            saveGameState();
        };
    });
    
    // Game award buttons
    $('awardGameTeamA').onclick = () => awardGame('teamA');
    $('awardGameTeamB').onclick = () => awardGame('teamB');

    // Team name inputs
    $('teamANameInput').onchange = (e) => {
        state.game.teamA.name = e.target.value || 'Player A';
        saveGameState();
    };
    $('teamBNameInput').onchange = (e) => {
        state.game.teamB.name = e.target.value || 'Player B';
        saveGameState();
    };

    // Header buttons
    $('copyControlCode').onclick = () => copyToClipboard(state.gameCode);
    $('shareGameBtn').onclick = () => {
        const shareUrl = `${window.location.origin}${window.location.pathname.replace('scoreboard.html', 'sports.html')}?mode=watch&code=${state.gameCode}&sport=badminton`;
        copyToClipboard(shareUrl);
        showToast('Spectator link copied!', 'success', 2500);
    };
    $('finalizeGameBtn').onclick = () => {
        if (confirm('Are you sure you want to end this match?')) {
            state.game.status = 'final';
            saveGameState().then(() => {
                showToast('Match finalized!', 'success', 2000);
                window.location.href = state.user ? 'sports.html?mode=host' : 'index.html';
            });
        }
    };
}

function awardGame(team) {
    if (!state.isHost) return;
    state.game[team].games++;
    state.game.teamA.score = 0;
    state.game.teamB.score = 0;
    showToast(`Game awarded to ${state.game[team].name}!`, 'success', 2000);
    saveGameState();
}

function setupFirebaseListener() {
    if (state.firestoreListener) state.firestoreListener(); 

    state.firestoreListener = db.collection('games').doc(state.gameCode)
        .onSnapshot((doc) => {
            if (doc.exists) {
                console.log('Received game update from Firebase');
                const newGame = doc.data();
                if (state.isHost && newGame.lastUpdate <= state.game.lastUpdate) {
                    return;
                }
                state.game = newGame;
                updateUI();
            } else {
                showToast('Game session not found or deleted', 'error', 3000);
            }
        }, (error) => {
            console.error("Error in Firestore listener:", error);
            showToast('Connection lost', 'error', 3000);
        });
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
        console.error('Error updating user profile:', error);
    }
}

// ================== INITIALIZER (CALLED BY MAIN.JS) ==================

async function init(utils, user, urlParams) {
    console.log('Badminton (College) module initializing...');
    
    $ = utils.$;
    $$ = utils.$$;
    showToast = utils.showToast;
    copyToClipboard = utils.copyToClipboard;
    state.user = user;
    
    const watchCode = urlParams.get('watch');
    const hostMode = urlParams.get('host');

    if (watchCode) {
        // --- SPECTATOR ---
        state.isHost = false;
        state.gameCode = watchCode;
        state.game = await loadGameState(watchCode);
        if (!state.game) {
            showToast('Game not found!', 'error', 3000);
            window.location.href = 'index.html';
            return;
        }
        
    } else if (hostMode) {
        // --- HOST ---
        state.isHost = true;
        state.gameCode = Math.floor(100000 + Math.random() * 900000).toString();
        state.game = createGameSkeleton(state.gameCode);
        
        await saveGameState();
        
        if (state.user) {
            await updateUserProfileWithGame(state.gameCode);
        }
        
    } else {
        window.location.href = 'index.html';
        return;
    }

    if (state.isHost) {
        attachHostListeners();
    }
    setupFirebaseListener();
    updateUI();
    
    console.log(`✓ Badminton module ready! Mode: ${state.isHost ? 'Host' : 'Watcher'}`);
}

// ================== EXPORT ==================
export default {
    sportName: "Badminton",
    buildHtml,
    init
};