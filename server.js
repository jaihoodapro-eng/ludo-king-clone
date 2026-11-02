// Authoritative Game Server with Native Socket.IO & 2v2 Team Play Engine
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const { LudoGameState } = require('./gameLogic');
const { LudoAI } = require('./aiEngine');
const { encryptLudoPacket, decryptLudoPacket } = require('./cryptoEngine');

const PORT = process.env.PORT || 3000;

// Active match sessions
const activeRooms = new Map();

// HTTP Static File Server (Serving 100% Authentic Ludo King Cocos Assets with On-Demand Mirroring)
const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  // API endpoint: Get live room status or create 2v2 match
  if (reqUrl === '/api/create-room' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const params = JSON.parse(body || '{}');
        const roomId = params.roomId || 'ROOM_' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const mode = params.mode || '2v2'; // 'CLASSIC' or '2v2'
        const playerConfigs = [
          { id: 'player_0', name: params.name || 'You (Red)', isBot: false },
          { id: 'bot_1', name: 'Bot 1 (Green)', isBot: true },
          { id: 'bot_2', name: 'Teammate (Yellow)', isBot: true },
          { id: 'bot_3', name: 'Bot 2 (Blue)', isBot: true }
        ];

        const game = new LudoGameState(roomId, playerConfigs, { mode });
        activeRooms.set(roomId, game);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, roomId, mode, gameState: game.serialize() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  const filePath = path.join(__dirname, 'public', reqUrl);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.bin': 'application/octet-stream',
    '.plist': 'application/xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback: On-demand download & cache directly from official CDN
        const upstreamUrl = 'https://ludoking.com/play' + reqUrl;
        const upReq = https.get(upstreamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://ludoking.com/play/'
          }
        }, (upRes) => {
          if (upRes.statusCode === 200) {
            const chunks = [];
            upRes.on('data', chunk => chunks.push(chunk));
            upRes.on('end', () => {
              const buffer = Buffer.concat(chunks);
              fs.mkdir(path.dirname(filePath), { recursive: true }, () => {
                fs.writeFile(filePath, buffer, () => {});
              });
              res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0'
              });
              res.end(buffer);
            });
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Asset Not Found: ${reqUrl}`);
          }
        });
        upReq.on('error', () => {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end(`404 Asset Not Found: ${reqUrl}`);
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0'
      });
      res.end(content);
    }
  });
});

// Socket.IO Server mount configured on path /v1/socket.io
const io = socketIo(server, {
  path: '/v1/socket.io',
  serveClient: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  origins: '*:*'
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] New connection established:', socket.id);

  // Inbound Ludo King encrypted packet handler
  socket.on('gc', (data) => {
    try {
      let payload = data;
      if (data && data.data && typeof data.data === 'string') {
        payload = decryptLudoPacket(data.data);
      }
      console.log('[Socket.IO] Inbound gc packet:', payload);

      // Support 2v2 Room Request / Turn Synchronization
      let replyData = { status: 'OK', ack: true, ts: Date.now() };

      if (payload && payload.action === 'CREATE_2V2_MATCH') {
        const roomId = 'ROOM_' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const game = new LudoGameState(roomId, [
          { id: socket.id, name: 'You (Red)', isBot: false },
          { id: 'bot_green', name: 'Bot (Green)', isBot: true },
          { id: 'bot_yellow', name: 'Teammate (Yellow)', isBot: true },
          { id: 'bot_blue', name: 'Bot (Blue)', isBot: true }
        ], { mode: '2v2' });
        activeRooms.set(roomId, game);
        socket.roomId = roomId;
        replyData = { action: 'ROOM_CREATED', roomId, mode: '2v2', gameState: game.serialize() };
      }

      const encReply = encryptLudoPacket(replyData);
      socket.emit('gc', { data: encReply });
    } catch (e) {
      console.error('[Socket.IO] Error processing gc:', e);
    }
  });

  socket.on('pc', (data) => {
    socket.broadcast.emit('pc', data);
  });

  socket.on('cc', (data) => {
    socket.broadcast.emit('cc', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 👑 LUDO KING™ AUTHORITATIVE ENGINE (WITH 2V2 TEAM PLAY)`);
  console.log(` Running live at: http://localhost:${PORT}`);
  console.log(` Mode Available: Classic 1v1v1v1 & 2v2 Team Play`);
  console.log(` Socket.IO Endpoint: /v1/socket.io`);
  console.log(`=======================================================`);
});
