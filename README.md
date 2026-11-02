# Ludo King™ Master Web Clone (Full Stack Engine)

Engineered directly from reverse-engineered bytecode, AST reconstruction, and cryptographic wire analysis of `https://ludoking.com/play/`.

---

## 🚀 Features

1. **Exact 15x15 Ludo Board Geometry**:
   - 4 Quadrants (Red, Green, Yellow, Blue).
   - 52 common path tiles with 8 authentic safe star tiles.
   - 4 colored home corridors and center victory triangles.
2. **Reverse-Engineered AES-128-CBC Wire Cryptography (`cryptoEngine.js`)**:
   - Real-time encryption/decryption using the 10-Key and 6-IV Master Rings extracted from Ludo King's `EncryptionDecryptionManager`.
   - Wire framing header: `[KeyIndex][IVIndex][Base64 Ciphertext]`.
3. **AI Bot Heuristics Engine (`aiEngine.js`)**:
   - Priority 1: Kill moves against opponents (Weight: 120).
   - Priority 2: Home finish & safe corridor entry (Weight: 100/75).
   - Priority 3: Star tile occupation (Weight: 65).
   - Priority 4: Base opening on dice 6 (Weight: 50).
   - Vulnerability detection and distance calculations.
4. **Authoritative Server & Multiplayer Room Lobby (`server.js`)**:
   - 2-4 Player Rooms with real-time WebSocket state synchronization.
   - Consecutive three-sixes penalty rule.
   - Bonus turn on dice 6, token capture, or home entry.
   - Dynamic bot fallback when players disconnect.
5. **Interactive UI with Live Crypto Packet Inspector**:
   - Mobile-responsive canvas-style HTML5/CSS3 interface.
   - Live sliding inspector panel showing real-time encrypted AES wire packets.

---

## 📦 How to Run

1. Start the game server:
   ```bash
   node server.js
   ```
2. Open your browser:
   ```
   http://localhost:3000
   ```
