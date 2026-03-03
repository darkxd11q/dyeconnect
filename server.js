const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const httpServer = http.createServer((req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const data = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('index.html bulunamadi');
  }
});

const wss = new WebSocketServer({ server: httpServer });
const rooms = new Map();

function genCode() {
  let c;
  do { c = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(c));
  return c;
}

function relay(from, raw) {
  const room = rooms.get(from.code); if (!room) return;
  const peer = from.role === 'source' ? room.display : room.source;
  if (peer && peer.readyState === 1) peer.send(raw);
}

wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    switch (m.type) {
      case 'create': {
        const code = genCode();
        rooms.set(code, { source: ws, display: null });
        ws.code = code; ws.role = 'source';
        ws.send(JSON.stringify({ type: 'created', code }));
        console.log('[+] Oda:', code); break;
      }
      case 'join': {
        const room = rooms.get(m.code);
        if (!room || !room.source) { ws.send(JSON.stringify({ type: 'error', msg: 'Oda bulunamadi.' })); return; }
        room.display = ws; ws.code = m.code; ws.role = 'display';
        room.source.send(JSON.stringify({ type: 'peer_joined' }));
        ws.send(JSON.stringify({ type: 'joined' }));
        console.log('[+] Katildi:', m.code); break;
      }
      case 'offer': case 'answer': case 'ice':
        relay(ws, raw.toString()); break;
    }
  });
  ws.on('close', () => {
    if (!ws.code) return;
    const room = rooms.get(ws.code); if (!room) return;
    const peer = ws.role === 'source' ? room.display : room.source;
    if (peer && peer.readyState === 1) peer.send(JSON.stringify({ type: 'peer_left' }));
    if (ws.role === 'source') { rooms.delete(ws.code); console.log('[-] Kapandi:', ws.code); }
    else room.display = null;
  });
});

setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.alive) { ws.terminate(); return; } ws.alive = false; ws.ping(); });
}, 20000);

const PORT = process.env.PORT || 8765;
httpServer.listen(PORT, () => console.log('✓ AmbiSync → http://localhost:' + PORT));
