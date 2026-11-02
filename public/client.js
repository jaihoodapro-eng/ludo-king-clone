// Client Game Controller & Board Renderer for Ludo King Clone

const COLORS = ['red', 'green', 'yellow', 'blue'];

// Board Coordinates
const COMMON_PATH = [
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  { x: 7, y: 0 },
  { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  { x: 14, y: 7 },
  { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  { x: 7, y: 14 },
  { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  { x: 0, y: 7 },
  { x: 0, y: 6 }
];

const START_OFFSETS = { 0: 1, 1: 14, 2: 27, 3: 40 };
const SAFE_INDICES = [1, 9, 14, 22, 27, 35, 40, 48];

const HOME_RUNS = {
  0: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
  1: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
  2: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
  3: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }]
};

const BASE_OFFSETS = {
  0: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }],
  1: [{ x: 11, y: 2 }, { x: 12, y: 2 }, { x: 11, y: 3 }, { x: 12, y: 3 }],
  2: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }],
  3: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 }]
};

// Client State
let socket = null;
let currentGameState = null;
let myPlayerIndex = 0;
let myRoomId = null;

// Initialize Grid Layout
function initBoardGrid() {
  const grid = document.getElementById('path-grid');
  grid.innerHTML = '';

  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 15; x++) {
      // Exclude quadrants and center
      if (
        (x < 6 && y < 6) ||
        (x > 8 && y < 6) ||
        (x > 8 && y > 8) ||
        (x < 6 && y > 8) ||
        (x >= 6 && x <= 8 && y >= 6 && y <= 8)
      ) {
        continue;
      }

      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.gridColumnStart = x + 1;
      cell.style.gridRowStart = y + 1;
      cell.dataset.x = x;
      cell.dataset.y = y;

      // Colorize home corridors
      if (y === 7 && x >= 1 && x <= 5) cell.classList.add('red-path');
      if (x === 7 && y >= 1 && y <= 5) cell.classList.add('green-path');
      if (y === 7 && x >= 9 && x <= 13) cell.classList.add('yellow-path');
      if (x === 7 && y >= 9 && y <= 13) cell.classList.add('blue-path');

      // Common Path Index & Stars
      COMMON_PATH.forEach((pt, idx) => {
        if (pt.x === x && pt.y === y) {
          if (SAFE_INDICES.includes(idx)) {
            cell.classList.add('safe');
            if (idx === 1) cell.classList.add('star-red');
            if (idx === 14) cell.classList.add('star-green');
            if (idx === 27) cell.classList.add('star-yellow');
            if (idx === 40) cell.classList.add('star-blue');
          }
        }
      });

      grid.appendChild(cell);
    }
  }
}

// Socket Connection
function connectSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    logCrypto('Connected to game server. AES-128 handshake ready.');
    startNewGame('BOTS');
  };

  socket.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      let payload = msg.data;

      if (msg.encrypted && typeof msg.data === 'string') {
        logCrypto(`[RX WIRE PACKET]: ${msg.data.substring(0, 36)}...`, true);
        payload = await CryptoClient.decrypt(msg.data);
      }

      handleServerEvent(msg.event, payload);
    } catch (e) {
      console.error('Socket parse err:', e);
    }
  };

  socket.onclose = () => {
    document.getElementById('room-badge').innerText = 'Disconnected';
    document.getElementById('room-badge').style.background = '#e74c3c';
  };
}

async function sendEvent(eventName, data, encrypt = false) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  if (encrypt) {
    const encStr = await CryptoClient.encrypt(data);
    logCrypto(`[TX WIRE PACKET]: ${encStr.substring(0, 36)}...`, true);
    socket.send(JSON.stringify({ event: eventName, encrypted: true, data: encStr }));
  } else {
    socket.send(JSON.stringify({ event: eventName, data }));
  }
}

// Server Event Dispatcher
function handleServerEvent(event, data) {
  switch (event) {
    case 'ROOM_CREATED':
    case 'ROOM_JOINED':
      myRoomId = data.roomId;
      myPlayerIndex = data.playerIndex;
      currentGameState = data.state;
      document.getElementById('room-badge').innerText = `${data.roomId} (P${myPlayerIndex + 1})`;
      updateUI();
      break;

    case 'PLAYER_JOINED':
      currentGameState = data.state;
      updateUI();
      break;

    case 'DICE_ROLLED':
      animateDice(data.playerIndex, data.dice);
      currentGameState.currentDice = data.dice;
      currentGameState.validMoves = data.validMoves;
      currentGameState.diceRolled = true;
      updateUI();
      break;

    case 'TOKEN_MOVED':
      currentGameState = data.gameState;
      renderTokens();
      updateUI();
      break;

    case 'TURN_CHANGED':
      currentGameState.currentTurn = data.currentTurn;
      currentGameState.diceRolled = false;
      currentGameState.validMoves = [];
      updateUI();
      break;

    case 'ERROR':
      alert('Game Error: ' + data);
      break;
  }
}

// Dice Roll Click
function handleDiceClick(playerIndex) {
  if (!currentGameState) return;
  if (currentGameState.currentTurn !== playerIndex) return;
  if (currentGameState.currentTurn !== myPlayerIndex) return;
  if (currentGameState.diceRolled) return;

  const diceEl = document.getElementById(`dice-${playerIndex}`);
  diceEl.classList.add('rolling');
  sendEvent('ROLL_DICE', {}, true);
}

function animateDice(playerIndex, value) {
  const diceEl = document.getElementById(`dice-${playerIndex}`);
  diceEl.classList.add('rolling');
  setTimeout(() => {
    diceEl.classList.remove('rolling');
    diceEl.innerText = value;
  }, 400);
}

// Move Token Click
function handleTokenClick(playerIndex, tokenIndex) {
  if (!currentGameState) return;
  if (currentGameState.currentTurn !== playerIndex) return;
  if (currentGameState.currentTurn !== myPlayerIndex) return;
  if (!currentGameState.diceRolled) return;
  if (!currentGameState.validMoves.includes(tokenIndex)) return;

  sendEvent('MOVE_TOKEN', { tokenIndex }, true);
}

// Token Rendering on Board
function renderTokens() {
  if (!currentGameState) return;

  // Clear existing tokens from board
  document.querySelectorAll('.token').forEach(t => t.remove());

  const boardEl = document.getElementById('ludo-board');
  const boardRect = boardEl.getBoundingClientRect();
  const stepSize = boardRect.width / 15;

  currentGameState.players.forEach((player, pIdx) => {
    player.tokens.forEach((step, tIdx) => {
      let coords = null;

      if (step === -1) {
        // Base coordinate
        coords = BASE_OFFSETS[pIdx][tIdx];
      } else if (step >= 0 && step <= 50) {
        // Common path
        const globalTile = (START_OFFSETS[pIdx] + step) % 52;
        coords = COMMON_PATH[globalTile];
      } else if (step > 50 && step < 56) {
        // Home run corridor
        coords = HOME_RUNS[pIdx][step - 51];
      } else if (step === 56) {
        // Center Home
        coords = { x: 7, y: 7 };
      }

      if (!coords) return;

      const token = document.createElement('div');
      token.className = `token ${player.color}`;
      token.style.left = `${coords.x * (100 / 15) + 0.6}%`;
      token.style.top = `${coords.y * (100 / 15) + 0.6}%`;
      token.style.width = `${100 / 15 - 1.2}%`;
      token.style.height = `${100 / 15 - 1.2}%`;

      // Is it clickable?
      const isMyTurn = currentGameState.currentTurn === pIdx && pIdx === myPlayerIndex;
      if (isMyTurn && currentGameState.diceRolled && currentGameState.validMoves.includes(tIdx)) {
        token.classList.add('clickable');
        token.onclick = (e) => {
          e.stopPropagation();
          handleTokenClick(pIdx, tIdx);
        };
      }

      boardEl.appendChild(token);
    });
  });
}

// UI State Synchronization
function updateUI() {
  if (!currentGameState) return;

  currentGameState.players.forEach((p, idx) => {
    const card = document.getElementById(`player-card-${idx}`);
    const nameEl = card.querySelector('.name');
    nameEl.innerText = p.name + (p.isBot ? ' 🤖' : '');

    if (currentGameState.currentTurn === idx) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  const activePlayer = currentGameState.players[currentGameState.currentTurn];
  const banner = document.getElementById('turn-banner');

  if (currentGameState.status === 'FINISHED') {
    const winner = currentGameState.players[currentGameState.winners[0]];
    banner.innerText = `🏆 ${winner.name} Won the Game!`;
  } else {
    banner.innerText = `${activePlayer.name}'s Turn (${activePlayer.color.toUpperCase()})`;
  }

  renderTokens();
}

// Modal Handlers
function openMultiplayerModal() {
  document.getElementById('multiplayer-modal').classList.remove('hidden');
}

function closeMultiplayerModal() {
  document.getElementById('multiplayer-modal').classList.add('hidden');
}

function createOnlineRoom() {
  const name = document.getElementById('player-name-input').value || 'Host Player';
  sendEvent('CREATE_ROOM', { mode: 'MULTIPLAYER', playerName: name });
  closeMultiplayerModal();
}

function joinOnlineRoom() {
  const name = document.getElementById('player-name-input').value || 'Guest Player';
  const code = document.getElementById('room-code-input').value.trim();
  if (!code) return alert('Enter room code');
  sendEvent('JOIN_ROOM', { roomId: code, playerName: name });
  closeMultiplayerModal();
}

function startNewGame(mode) {
  sendEvent('CREATE_ROOM', { mode, playerName: 'You' });
}

function toggleCryptoInspector() {
  document.getElementById('crypto-inspector').classList.toggle('hidden');
}

function logCrypto(text, isEncrypted = false) {
  const container = document.getElementById('crypto-logs');
  if (!container) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry' + (isEncrypted ? ' encrypted' : '');
  entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  container.prepend(entry);
  if (container.children.length > 30) container.removeChild(container.lastChild);
}

// Initialize on Load
window.onload = () => {
  initBoardGrid();
  connectSocket();
  window.addEventListener('resize', renderTokens);
};
