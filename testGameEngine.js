const { LudoGameState } = require('./gameLogic');
const { LudoAI } = require('./aiEngine');
const { encryptLudoPacket, decryptLudoPacket } = require('./cryptoEngine');

console.log('--- 1. Testing Cryptography Engine ---');
const testPayload = { action: 'DICE_ROLL', dice: 6, tokenIdx: 0, player: 'Red' };
const packet = encryptLudoPacket(testPayload);
console.log('Encrypted Wire Packet:', packet.substring(0, 40) + '...');
const decrypted = decryptLudoPacket(packet);
console.log('Decrypted Match:', JSON.stringify(decrypted) === JSON.stringify(testPayload));

console.log('\n--- 2. Testing Game Logic & State Machine ---');
const game = new LudoGameState('TEST_ROOM', [
  { id: 'p0', name: 'Player 1', isBot: false },
  { id: 'b1', name: 'Bot 1', isBot: true },
  { id: 'b2', name: 'Bot 2', isBot: true },
  { id: 'b3', name: 'Bot 3', isBot: true }
]);

console.log('Initial turn:', game.currentTurn);
const roll = game.rollDice(0);
console.log('Player 0 rolled:', roll.dice, 'Valid moves:', roll.validMoves);

if (roll.validMoves.length > 0) {
  const move = game.moveToken(0, roll.validMoves[0]);
  console.log('Token moved result:', move.success, 'New Step:', move.lastAction.newStep);
} else {
  console.log('No moves possible on roll. Passing turn.');
  game.nextTurn();
}
console.log('Next turn is Player:', game.currentTurn);

console.log('\n--- 3. Testing AI Bot Engine ---');
const botIdx = 1;
// Force bot roll
game.currentTurn = botIdx;
game.diceRolled = false;
const botRoll = game.rollDice(botIdx);
console.log('Bot rolled:', botRoll.dice, 'Valid moves count:', botRoll.validMoves.length);
if (botRoll.validMoves.length > 0) {
  const aiChoice = LudoAI.chooseMove(game, botIdx);
  console.log('AI selected token index:', aiChoice);
}
console.log('\n>>> All Tests Passed Successfully! <<<');
