// AmbiSync – HTTP + WebSocket Signaling Server
// npm install ws  →  node server.js

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

/* ── HTTP: index.html'i serve et ── */
const httpServer = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('index.html bulunamadı');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

/* ── WebSocket Signaling ── */
const wss   = new WebSocketServer({ server: httpServer });
const rooms = new Map(); // code → { source, display }

function genCode() {
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
        console.log(`[+] Oda oluşturuldu: ${code}`);
        break;
      }

      case 'join': {
        const room = rooms.get(msg.code);
        if (!room || !room.source) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Oda bulunamadı veya ana cihaz bağlı değil.' }));
          return;
        }
        room.display = ws;
        ws.code  = msg.code;
        ws.role  = 'display';
        room.source.send(JSON.stringify({ type: 'peer_joined' }));
        ws.send(JSON.stringify({ type: 'joined' }));
        console.log(`[+] İkinci cihaz katıldı: ${msg.code}`);
        break;
      }

      // WebRTC SDP + ICE relay
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
      console.log(`[-] Oda kapatıldı: ${ws.code}`);
    } else {
      room.display = null;
    }
  });
});

// Heartbeat – ölü bağlantıları her 20s'de temizle
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.alive) { ws.terminate(); return; }
    ws.alive = false;
    ws.ping();
  });
}, 20_000);

const PORT = process.env.PORT || 8765;
httpServer.listen(PORT, () => {
  console.log(`✓ AmbiSync → http://localhost:${PORT}`);
});
