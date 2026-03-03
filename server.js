// AmbiSync – Signaling Server (Node.js + ws)
// npm install ws  →  node server.js

const { WebSocketServer } = require('ws');
const http  = require('http');
const crypto = require('crypto');

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AmbiSync Signaling OK');
});

const wss   = new WebSocketServer({ server: httpServer });
const rooms = new Map(); // code → { source, display }

function genCode() {
  // 6-char uppercase hex e.g. "A3F9C1"
  let code;
  do { code = crypto.randomBytes(3).toString('hex').toUpperCase(); }
  while (rooms.has(code));
  return code;
}

function relay(from, raw) {
  const room = rooms.get(from.code);
  if (!room) return;
  const peer = from.role === 'source' ? room.display : room.source;
  if (peer && peer.readyState === 1) peer.send(raw);
}

wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'create': {
        const code = genCode();
        rooms.set(code, { source: ws, display: null });
        ws.code = code;
        ws.role = 'source';
        ws.send(JSON.stringify({ type: 'created', code }));
        console.log(`[+] Room created: ${code}`);
        break;
      }

      case 'join': {
        const room = rooms.get(msg.code);
        if (!room || !room.source) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Oda bulunamadı' }));
          return;
        }
        room.display = ws;
        ws.code = msg.code;
        ws.role = 'display';
        // Tell source → create WebRTC offer
        room.source.send(JSON.stringify({ type: 'peer_joined' }));
        ws.send(JSON.stringify({ type: 'joined' }));
        console.log(`[+] Display joined: ${msg.code}`);
        break;
      }

      // WebRTC signaling relay
      case 'offer':
      case 'answer':
      case 'ice':
        relay(ws, raw.toString());
        break;
    }
  });

  ws.on('close', () => {
    if (!ws.code) return;
    const room = rooms.get(ws.code);
    if (!room) return;
    const peer = ws.role === 'source' ? room.display : room.source;
    if (peer && peer.readyState === 1)
      peer.send(JSON.stringify({ type: 'peer_left' }));
    if (ws.role === 'source') {
      rooms.delete(ws.code);
      console.log(`[-] Room closed: ${ws.code}`);
    } else {
      room.display = null;
    }
  });
});

// Heartbeat – drop dead connections every 20s
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.alive) { ws.terminate(); return; }
    ws.alive = false;
    ws.ping();
  });
}, 20_000);

const PORT = process.env.PORT || 8765;
httpServer.listen(PORT, () => {
  console.log(`✓ AmbiSync signaling server → ws://localhost:${PORT}`);
});
