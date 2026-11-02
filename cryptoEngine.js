// Ludo King Cryptographic Engine (Recovered from ludoking.com/play/ client)
const crypto = require('crypto');

const MASTER_KEYS = [
  'jbic95s45p7e6s30',
  '7mmm6gfd5hs36b2d',
  '35vcks7m7mxscikn',
  'b1dq078uo8f4xqka',
  'sgdns6bry78ymnwa',
  'b6tfohtkzycdc09a',
  'dvfltftoxfyu8wwz',
  'aq580fnbnbx3vxfn',
  '8agu0jka1837keua',
  'c90zdpqedmr49v79'
];

const MASTER_IVS = [
  '7rbe9u3fura9at3t',
  'b7jlt31dew3lszqb',
  'jqv1bmgbm9cwhig7',
  'da5fuf33ehql15p0',
  'dhw6s5fbkhlgumq9',
  '29r8hzphpsbm746t'
];

/**
 * Encrypts a payload into the Ludo King wire format:
 * [KeyIndex 0-9][IVIndex 0-5][Base64 AES-128-CBC Ciphertext]
 */
function encryptLudoPacket(payloadObj, keyIdx, ivIdx) {
  if (keyIdx === undefined) keyIdx = Math.floor(Math.random() * MASTER_KEYS.length);
  if (ivIdx === undefined) ivIdx = Math.floor(Math.random() * MASTER_IVS.length);

  const key = Buffer.from(MASTER_KEYS[keyIdx], 'utf8');
  const iv = Buffer.from(MASTER_IVS[ivIdx], 'utf8');
  const jsonStr = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);

  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(true);

  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  return `${keyIdx}${ivIdx}${encrypted.toString('base64')}`;
}

/**
 * Decrypts a Ludo King wire format packet.
 */
function decryptLudoPacket(packetStr) {
  if (typeof packetStr !== 'string' || packetStr.length < 3) {
    throw new Error('Invalid packet format');
  }

  const keyIdx = parseInt(packetStr.charAt(0), 10);
  const ivIdx = parseInt(packetStr.charAt(1), 10);
  const cipherBase64 = packetStr.slice(2);

  if (isNaN(keyIdx) || keyIdx >= MASTER_KEYS.length || isNaN(ivIdx) || ivIdx >= MASTER_IVS.length) {
    throw new Error('Unknown key or IV index in packet header');
  }

  const key = Buffer.from(MASTER_KEYS[keyIdx], 'utf8');
  const iv = Buffer.from(MASTER_IVS[ivIdx], 'utf8');

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherBase64, 'base64')), decipher.final()]);
  const text = decrypted.toString('utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

module.exports = {
  MASTER_KEYS,
  MASTER_IVS,
  encryptLudoPacket,
  decryptLudoPacket
};
