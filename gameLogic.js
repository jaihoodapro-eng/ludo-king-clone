// Authoritative Game Rules & State Machine for Ludo King Clone (With 2v2 Team Play Support)

const COLORS = ['red', 'green', 'yellow', 'blue'];

// Coordinates on a 15x15 standard Ludo grid
// Red starts top-left (0), Green top-right (1), Yellow bottom-right (2), Blue bottom-left (3)
// 52 common path tiles
const COMMON_PATH = [
  // Red side: 0 to 4 going right
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  // Turn up into green quadrant: 5 to 10
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  { x: 7, y: 0 }, // 11
  { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 }, // 12-17
  // Turn right into green/yellow: 18 to 23
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  { x: 14, y: 7 }, // 24
  { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 }, // 25-30
  // Turn down into yellow/blue: 31 to 36
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  { x: 7, y: 14 }, // 37
  { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 }, // 38-43
  // Turn left back to red: 44 to 49
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  { x: 0, y: 7 }, // 50
  { x: 0, y: 6 }  // 51
];

// Start offsets on the common 52-tile path for each player
const START_OFFSETS = {
  0: 1,   // Red enters at index 1: {x: 1, y: 6} (Red star/start)
  1: 14,  // Green enters at index 14: {x: 8, y: 1} (Green star/start)
  2: 27,  // Yellow enters at index 27: {x: 13, y: 8} (Yellow star/start)
  3: 40   // Blue enters at index 40: {x: 6, y: 13} (Blue star/start)
};

// Safe squares where tokens cannot be captured
const SAFE_INDICES = [1, 9, 14, 22, 27, 35, 40, 48];

// Home run paths (5 tiles before reaching center/home 56)
const HOME_RUNS = {
  0: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }], // Red
  1: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }], // Green
  2: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }], // Yellow
  3: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }]  // Blue
};

// Home Base spawn positions
const BASE_POSITIONS = {
  0: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }], // Red
  1: [{ x: 11, y: 2 }, { x: 12, y: 2 }, { x: 11, y: 3 }, { x: 12, y: 3 }], // Green
  2: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }], // Yellow
  3: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 }]  // Blue
};

class LudoGameState {
  constructor(roomId, playerConfigs, options = {}) {
    this.roomId = roomId;
    this.mode = options.mode || 'CLASSIC'; // 'CLASSIC' or '2v2'
    
    // In 2v2:
    // Team A: Red (0) & Yellow (2)
    // Team B: Green (1) & Blue (3)
    this.players = playerConfigs.map((p, idx) => ({
      id: p.id,
      name: p.name || `Player ${idx + 1}`,
      color: COLORS[idx],
      isBot: !!p.isBot,
      team: this.mode === '2v2' ? (idx % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : null,
      teammateIndex: this.mode === '2v2' ? (idx === 0 ? 2 : idx === 2 ? 0 : idx === 1 ? 3 : 1) : null,
      tokens: [-1, -1, -1, -1], // -1 = Base, 0 = Start, 1..50 = Common, 51..55 = Home Run, 56 = Home (Won)
      hasWon: false,
      consecutiveSixes: 0
    }));

    this.currentTurn = 0; // Player index (0-3)
    this.currentDice = null;
    this.diceRolled = false;
    this.validMoves = [];
    this.winners = [];
    this.winningTeam = null;
    this.status = 'PLAYING'; // 'WAITING', 'PLAYING', 'FINISHED'
    this.lastAction = null;
  }

  rollDice(playerIndex) {
    if (this.status !== 'PLAYING') return { error: 'Game not active' };
    if (playerIndex !== this.currentTurn) return { error: 'Not your turn' };
    if (this.diceRolled) return { error: 'Dice already rolled' };

    const value = Math.floor(Math.random() * 6) + 1;
    this.currentDice = value;
    this.diceRolled = true;

    const player = this.players[playerIndex];
    if (value === 6) {
      player.consecutiveSixes++;
    } else {
      player.consecutiveSixes = 0;
    }

    // 3 consecutive sixes penalty: lose turn
    if (player.consecutiveSixes === 3) {
      player.consecutiveSixes = 0;
      this.lastAction = { type: 'THREE_SIXES_PENALTY', playerIndex, dice: value };
      this.nextTurn();
      return { dice: value, penalty: true, validMoves: [] };
    }

    this.validMoves = this.calculateValidMoves(playerIndex, value);

    // If no moves possible, pass turn after delay
    if (this.validMoves.length === 0) {
      this.lastAction = { type: 'NO_MOVES', playerIndex, dice: value };
      return { dice: value, validMoves: [] };
    }

    return { dice: value, validMoves: this.validMoves };
  }

  calculateValidMoves(playerIndex, dice) {
    const player = this.players[playerIndex];
    const moves = [];

    // Check current player's own tokens
    player.tokens.forEach((step, tokenIdx) => {
      if (step === -1) {
        if (dice === 6) moves.push({ playerIndex, tokenIdx, isTeammate: false });
      } else if (step >= 0 && step < 56) {
        if (step + dice <= 56) {
          moves.push({ playerIndex, tokenIdx, isTeammate: false });
        }
      }
    });

    // In 2v2 Mode: If current player has already finished all 4 tokens home,
    // their turn and dice roll can control their teammate's tokens!
    if (this.mode === '2v2' && player.hasWon && player.teammateIndex !== null) {
      const teammate = this.players[player.teammateIndex];
      teammate.tokens.forEach((step, tokenIdx) => {
        if (step === -1) {
          if (dice === 6) moves.push({ playerIndex: player.teammateIndex, tokenIdx, isTeammate: true });
        } else if (step >= 0 && step < 56) {
          if (step + dice <= 56) {
            moves.push({ playerIndex: player.teammateIndex, tokenIdx, isTeammate: true });
          }
        }
      });
    }

    return moves;
  }

  moveToken(actingPlayerIndex, targetTokenIndex, targetPlayerIndex = actingPlayerIndex) {
    if (this.status !== 'PLAYING') return { error: 'Game not active' };
    if (actingPlayerIndex !== this.currentTurn) return { error: 'Not your turn' };
    if (!this.diceRolled) return { error: 'Must roll dice first' };

    // Verify valid move
    const isValid = this.validMoves.some(m => 
      m.tokenIdx === targetTokenIndex && m.playerIndex === targetPlayerIndex
    );
    if (!isValid) return { error: 'Invalid move' };

    const tokenOwner = this.players[targetPlayerIndex];
    let step = tokenOwner.tokens[targetTokenIndex];
    let killedOpponent = false;

    if (step === -1) {
      tokenOwner.tokens[targetTokenIndex] = 0;
    } else {
      tokenOwner.tokens[targetTokenIndex] += this.currentDice;
    }

    const newStep = tokenOwner.tokens[targetTokenIndex];

    // Check if entered Home (56)
    if (newStep === 56) {
      const allHome = tokenOwner.tokens.every(s => s === 56);
      if (allHome && !tokenOwner.hasWon) {
        tokenOwner.hasWon = true;
        this.winners.push(targetPlayerIndex);

        if (this.mode === '2v2') {
          // Check if teammate is also all home
          const teammate = this.players[tokenOwner.teammateIndex];
          if (teammate.hasWon) {
            this.winningTeam = tokenOwner.team;
            this.status = 'FINISHED';
          }
        } else {
          if (this.winners.length === this.players.length - 1) {
            this.status = 'FINISHED';
          }
        }
      }
    } else if (newStep >= 0 && newStep <= 50) {
      // Check for kill on common path
      const globalTileIndex = (START_OFFSETS[targetPlayerIndex] + newStep) % 52;
      const isSafe = SAFE_INDICES.includes(globalTileIndex);

      if (!isSafe) {
        this.players.forEach((opp, oppIdx) => {
          // In 2v2 mode: Friendly fire is disabled! Tokens of the same team cannot kill each other.
          if (this.mode === '2v2' && opp.team === tokenOwner.team) return;
          if (oppIdx === targetPlayerIndex) return;

          opp.tokens.forEach((oppStep, oppTokenIdx) => {
            if (oppStep >= 0 && oppStep <= 50) {
              const oppGlobalTile = (START_OFFSETS[oppIdx] + oppStep) % 52;
              if (oppGlobalTile === globalTileIndex) {
                // Captured opponent!
                opp.tokens[oppTokenIdx] = -1;
                killedOpponent = true;
              }
            }
          });
        });
      }
    }

    const earnedBonusTurn = (this.currentDice === 6 || killedOpponent || newStep === 56);

    this.lastAction = {
      type: 'MOVE',
      actingPlayerIndex,
      targetPlayerIndex,
      targetTokenIndex,
      newStep,
      killedOpponent,
      earnedBonusTurn,
      mode: this.mode
    };

    if (!earnedBonusTurn) {
      this.nextTurn();
    } else {
      // Reset dice state for bonus turn
      this.currentDice = null;
      this.diceRolled = false;
      this.validMoves = [];
    }

    return {
      success: true,
      lastAction: this.lastAction,
      gameState: this.serialize()
    };
  }

  nextTurn() {
    this.currentDice = null;
    this.diceRolled = false;
    this.validMoves = [];

    if (this.status === 'FINISHED') return;

    let loops = 0;
    do {
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
      loops++;
      // In 2v2: If a player has won but their teammate hasn't, they still get turns to help their teammate!
      if (this.mode === '2v2') {
        const p = this.players[this.currentTurn];
        const tm = this.players[p.teammateIndex];
        if (p.hasWon && tm.hasWon) {
          continue; // both team members won, skip turn
        } else {
          break; // player can play for themselves or teammate
        }
      }
    } while (this.players[this.currentTurn].hasWon && loops < this.players.length);

    if (loops >= this.players.length) {
      this.status = 'FINISHED';
    }
  }

  serialize() {
    return {
      roomId: this.roomId,
      mode: this.mode,
      winningTeam: this.winningTeam,
      players: this.players,
      currentTurn: this.currentTurn,
      currentDice: this.currentDice,
      diceRolled: this.diceRolled,
      validMoves: this.validMoves,
      status: this.status,
      winners: this.winners,
      lastAction: this.lastAction
    };
  }
}

module.exports = {
  LudoGameState,
  COLORS,
  COMMON_PATH,
  START_OFFSETS,
  SAFE_INDICES,
  HOME_RUNS,
  BASE_POSITIONS
};
