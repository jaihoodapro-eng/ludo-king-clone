// AI Bot Decision Engine (Re-engineered from ComputerAI & AIWeight with 2v2 Team Awareness)
const { START_OFFSETS, SAFE_INDICES } = require('./gameLogic');

class LudoAI {
  /**
   * Decides which token to move based on reverse-engineered weights:
   * 1. Kill Move on Opponent (Weight: 100)
   * 2. Enter Home (Weight: 80-100)
   * 3. Move into Safe Star Tile (Weight: 60)
   * 4. Open from Base on 6 (Weight: 50)
   * 5. Assist Teammate (2v2 mode, Weight: 40)
   * 6. Advance furthest token safely (Weight: 30)
   */
  static chooseMove(gameState, playerIndex) {
    const validMoves = gameState.validMoves;
    if (!validMoves || validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    const player = gameState.players[playerIndex];
    const dice = gameState.currentDice;

    let bestScore = -Infinity;
    let bestMove = validMoves[0];

    for (const move of validMoves) {
      // move can be { playerIndex, tokenIdx, isTeammate }
      const targetPlayerIndex = move.playerIndex !== undefined ? move.playerIndex : playerIndex;
      const tokenIdx = move.tokenIdx !== undefined ? move.tokenIdx : move;
      const targetPlayer = gameState.players[targetPlayerIndex];
      const step = targetPlayer.tokens[tokenIdx];
      let score = 0;

      // Bonus if helping teammate advance in 2v2
      if (move.isTeammate) {
        score += 20;
      }

      // 1. Token in Base: Freeing it on a 6
      if (step === -1 && dice === 6) {
        score += 50;
      } else {
        const nextStep = step + dice;

        // 2. Entering Home
        if (nextStep === 56) {
          score += 100;
        } else if (nextStep > 50) {
          // Entering safe home corridor
          score += 75 + (nextStep - 50);
        } else {
          const nextGlobalTile = (START_OFFSETS[targetPlayerIndex] + nextStep) % 52;
          const isSafe = SAFE_INDICES.includes(nextGlobalTile);

          // 3. Can we capture an opponent?
          let canKill = false;
          if (!isSafe) {
            gameState.players.forEach((opp, oppIdx) => {
              if (gameState.mode === '2v2' && opp.team === targetPlayer.team) return; // Never kill teammate
              if (oppIdx === targetPlayerIndex) return;

              opp.tokens.forEach(oppStep => {
                if (oppStep >= 0 && oppStep <= 50) {
                  const oppGlobal = (START_OFFSETS[oppIdx] + oppStep) % 52;
                  if (oppGlobal === nextGlobalTile) {
                    canKill = true;
                  }
                }
              });
            });
          }

          if (canKill) {
            score += 120; // High priority: capture
          } else if (isSafe) {
            score += 65;  // Safe Star Tile
          } else {
            // General progress
            score += nextStep * 0.5;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}

module.exports = { LudoAI };
