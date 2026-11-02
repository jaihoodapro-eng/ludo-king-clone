// Client-side implementation of Ludo King AES-128-CBC Wire Cryptography
// Uses Web Crypto API (SubtleCrypto)

const CLIENT_MASTER_KEYS = [
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

const CLIENT_MASTER_IVS = [
  '7rbe9u3fura9at3t',
  'b7jlt31dew3lszqb',
  'jqv1bmgbm9cwhig7',
  'da5fuf33ehql15p0',
  'dhw6s5fbkhlgumq9',
  '29r8hzphpsbm746t'
];

const CryptoClient = {
  async encrypt(payloadObj) {
    const keyIdx = Math.floor(Math.random() * CLIENT_MASTER_KEYS.length);
    const ivIdx = Math.floor(Math.random() * CLIENT_MASTER_IVS.length);

    const keyStr = CLIENT_MASTER_KEYS[keyIdx];
    const ivStr = CLIENT_MASTER_IVS[ivIdx];
    const jsonStr = JSON.stringify(payloadObj);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyStr);
    const ivData = encoder.encode(ivStr);
    const plainBytes = encoder.encode(jsonStr);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: ivData },
      cryptoKey,
      plainBytes
    );

    const base64Cipher = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
    return `${keyIdx}${ivIdx}${base64Cipher}`;
  },

  async decrypt(packetStr) {
    if (typeof packetStr !== 'string' || packetStr.length < 3) return null;

    const keyIdx = parseInt(packetStr.charAt(0), 10);
    const ivIdx = parseInt(packetStr.charAt(1), 10);
    const cipherBase64 = packetStr.slice(2);

    const keyStr = CLIENT_MASTER_KEYS[keyIdx];
    const ivStr = CLIENT_MASTER_IVS[ivIdx];

    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyStr);
    const ivData = encoder.encode(ivStr);

    const cipherBytes = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivData },
      cryptoKey,
      cipherBytes
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  }
};
