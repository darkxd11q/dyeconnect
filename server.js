// ╔══════════════════════════════════════════════╗
// ║  AmbiSync – Tek Dosya (HTTP + WS + HTML)    ║
// ║  npm install ws  →  node server.js           ║
// ╚══════════════════════════════════════════════╝

const http   = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

/* ── Gömülü HTML ── */
const PAGE = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AmbiSync</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#07070f;color:#fff;font-family:'Segoe UI',sans-serif;height:100vh;overflow:hidden;}
.screen{display:none;width:100%;height:100vh;align-items:center;justify-content:center;flex-direction:column;}
.screen.active{display:flex;}
.logo{font-size:2.6rem;font-weight:800;background:linear-gradient(135deg,#7c6aff,#b06aff,#ff6ab0);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.3rem;letter-spacing:-1px;}
.tagline{color:#444;font-size:.85rem;margin-bottom:2rem;}
.cards{display:flex;gap:1.4rem;flex-wrap:wrap;justify-content:center;}
.card{background:#111128;border:1px solid #222244;border-radius:18px;padding:2rem 1.6rem;
  cursor:pointer;transition:all .22s;text-align:center;width:180px;}
.card:hover{border-color:#7c6aff;transform:translateY(-5px);box-shadow:0 12px 40px rgba(124,106,255,.25);}
.card-icon{font-size:2.6rem;margin-bottom:.7rem;}
.card-title{font-size:1.05rem;font-weight:700;margin-bottom:.3rem;}
.card-desc{color:#555;font-size:.78rem;line-height:1.4;}
.btn{background:linear-gradient(135deg,#7c6aff,#b06aff);border:none;color:#fff;
  padding:.65rem 1.8rem;border-radius:10px;cursor:pointer;font-size:.9rem;font-weight:600;
  transition:opacity .2s;margin-top:.8rem;}
.btn:hover{opacity:.85;} .btn:disabled{opacity:.3;cursor:not-allowed;}
.btn-ghost{background:none;border:none;color:#444;font-size:.78rem;cursor:pointer;margin-top:.8rem;padding:.3rem;}
.btn-ghost:hover{color:#888;}
.status{font-size:.82rem;margin-top:.6rem;color:#555;min-height:1.1em;}
.status.ok{color:#4ade80;} .status.err{color:#f87171;}
.panel{background:#111128;border:1px solid #222244;border-radius:16px;
  padding:1.5rem 1.6rem;text-align:center;max-width:400px;width:92%;}
.code-box{font-size:2rem;font-weight:800;color:#a78bfa;letter-spacing:6px;
  padding:.5rem 1rem;background:#0d0d20;border-radius:8px;margin:.4rem 0;font-family:'Courier New',monospace;}
.inp{background:#0d0d20;border:1px solid #222244;color:#fff;padding:.65rem 1rem;
  border-radius:8px;width:100%;font-size:1.1rem;margin:.5rem 0;text-align:center;
  letter-spacing:4px;outline:none;font-family:'Courier New',monospace;text-transform:uppercase;}
.inp:focus{border-color:#7c6aff;}
.tip{background:#0c0c22;border:1px solid #1a1a3a;border-radius:10px;
  padding:.9rem 1rem;font-size:.79rem;color:#5a5a99;line-height:1.7;margin-top:.9rem;text-align:left;}
.tip b{color:#9090cc;} .tip code{background:#111130;padding:.1rem .35rem;border-radius:4px;color:#a0a0ff;}
/* Ambi screen */
#sAmbi{background:#000;position:relative;}
#ambiCanvas{position:absolute;inset:0;width:100%;height:100%;}
.ambi-hud{position:absolute;bottom:1.2rem;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:.8rem;z-index:10;}
.fps-badge{color:rgba(255,255,255,.15);font-size:.72rem;font-family:monospace;}
.mini-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.35);font-size:.7rem;padding:.3rem .9rem;border-radius:6px;cursor:pointer;}
.mini-btn:hover{color:rgba(255,255,255,.7);}
</style>
</head>
<body>

<!-- WELCOME -->
<div class="screen active" id="sWelcome">
  <div class="logo">✦ AmbiSync</div>
  <div class="tagline">Ekran kenar renklerini ikinci cihazına anlık yansıt</div>
  <div class="cards">
    <div class="card" onclick="initSource()">
      <div class="card-icon">🖥️</div>
      <div class="card-title">Ana Cihaz</div>
      <div class="card-desc">Ekranı yakala ve yayınla</div>
    </div>
    <div class="card" onclick="initDisplay()">
      <div class="card-icon">📱</div>
      <div class="card-title">İkinci Cihaz</div>
      <div class="card-desc">Ambilight efektini görüntüle</div>
    </div>
  </div>
</div>

<!-- SOURCE -->
<div class="screen" id="sSource">
  <h2 style="font-size:1.1rem;margin-bottom:1rem;">🖥️ Ana Cihaz</h2>
  <div class="panel">
    <div style="color:#444;font-size:.7rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:.4rem;">Bağlantı Kodu</div>
    <div class="code-box" id="srcCode">------</div>
    <div class="status" id="srcStatus">Sunucuya bağlanıyor…</div>
  </div>
  <button class="btn" id="captureBtn" onclick="startCapture()" disabled>▶ Ekran Yakalamayı Başlat</button>
  <div class="tip" style="max-width:400px;width:92%;">
    <b>⚠️ Oyun / Uygulama yakalamak için:</b><br>
    1. Butona bas → açılan pencerede <b>"Ekran"</b> sekmesini seç (Tab/Pencere değil)<br>
    2. Oyununu <code>Borderless Windowed</code> (Çerçevesiz Pencere) modunda aç<br>
    3. Tarayıcı arka planda çalışabilir, oyun öne alınabilir<br>
    <b>Not:</b> Exclusive fullscreen oyunlar (<code>Alt+Enter</code> tam ekran) tarayıcı API kısıtı nedeniyle yakalanamaz.
  </div>
  <button class="btn-ghost" onclick="goHome()">← Geri</button>
  <canvas id="cv" style="display:none"></canvas>
</div>

<!-- DISPLAY CONNECT -->
<div class="screen" id="sConnect">
  <div class="panel">
    <div style="font-size:2.2rem;margin-bottom:.4rem;">📱</div>
    <h2 style="font-size:1.1rem;margin-bottom:.4rem;">İkinci Cihaz</h2>
    <p style="color:#555;font-size:.8rem;margin-bottom:.5rem;">Ana cihazdaki 6 haneli kodu gir</p>
    <input class="inp" id="codeInp" maxlength="6" placeholder="A3F9C1"
           oninput="this.value=this.value.toUpperCase().replace(/[^A-F0-9]/g,'')">
    <button class="btn" onclick="joinRoom()" style="width:100%">Bağlan &amp; Tam Ekran</button>
    <div class="status" id="dispStatus"></div>
  </div>
  <button class="btn-ghost" onclick="goHome()">← Geri</button>
</div>

<!-- AMBILIGHT FULL SCREEN -->
<div class="screen" id="sAmbi">
  <canvas id="ambiCanvas"></canvas>
  <div class="ambi-hud">
    <span class="fps-badge" id="fpsBadge">-- fps</span>
    <button class="mini-btn" onclick="exitAmbi()">✕ Çıkış</button>
  </div>
</div>

<script>
/* ── CONFIG ── */
const SEG   = 24;
const DEPTH = 0.04;
const ICE   = [{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const WS_URL = (()=>{ const p=location.protocol==='https:'?'wss':'ws'; return p+'://'+location.host; })();

/* ── STATE ── */
let ws=null,pc=null,dc=null,stream=null,rafId=null;
let role='',lastTs=0,frameCount=0,fpsTs=0;

/* ── UTILS ── */
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');}
function setSt(id,txt,cls=''){const e=$(id);e.textContent=txt;e.className='status '+(cls||'');}

/* ── Vivid boost: HSL saturation & brightness punch ── */
function vivid(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0,s=0,l=(mx+mn)/2;
  if(d){
    s=l>.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r)h=((g-b)/d+(g<b?6:0))/6;
    else if(mx===g)h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  s=Math.min(1,s*2+0.4);
  l=Math.min(0.78,Math.max(0.12,l*1.4+0.05));
  function h2r(p,q,t){t=(t+1)%1;if(t<1/6)return p+(q-p)*6*t;if(t<.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}
  let nr,ng,nb;
  if(!s){nr=ng=nb=l;}
  else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;nr=h2r(p,q,h+1/3);ng=h2r(p,q,h);nb=h2r(p,q,h-1/3);}
  return[Math.round(nr*255),Math.round(ng*255),Math.round(nb*255)];
}

/* ── CLEANUP ── */
function goHome(){cleanup();show('sWelcome');}
function cleanup(){
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  if(dc){try{dc.close();}catch(e){}}dc=null;
  if(pc){try{pc.close();}catch(e){}}pc=null;
  if(ws){try{ws.close();}catch(e){}}ws=null;
  try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
}

function exitAmbi(){cleanup();show('sWelcome');}

/* ── WebSocket ── */
function openWS(cb){
  ws=new WebSocket(WS_URL);
  ws.onopen=cb;
  ws.onerror=()=>{alert('Sunucuya bağlanılamadı: '+WS_URL);goHome();};
  ws.onmessage=e=>sig(JSON.parse(e.data));
}
function send(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}

async function sig(m){
  switch(m.type){
    case 'created':
      $('srcCode').textContent=m.code;
      setSt('srcStatus','İkinci cihazın bağlanması bekleniyor…');
      break;
    case 'joined':
      if(role==='display'){
        setSt('dispStatus','Bağlandı! Yükleniyor…','ok');
        setTimeout(()=>{initCanvas();show('sAmbi');enterFullscreen();},400);
      }
      break;
    case 'peer_joined': await makeOffer(); break;
    case 'offer':
      await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
      const ans=await pc.createAnswer();
      await pc.setLocalDescription(ans);
      send({type:'answer',sdp:ans});
      break;
    case 'answer': await pc.setRemoteDescription(new RTCSessionDescription(m.sdp)); break;
    case 'ice': if(m.candidate)await pc.addIceCandidate(new RTCIceCandidate(m.candidate)); break;
    case 'peer_left': goHome(); break;
    case 'error': alert(m.msg); break;
  }
}

/* ── WebRTC ── */
function makePC(){
  pc=new RTCPeerConnection({iceServers:ICE});
  pc.onicecandidate=e=>{if(e.candidate)send({type:'ice',candidate:e.candidate});};
  pc.onconnectionstatechange=()=>{
    if(pc.connectionState==='failed'||pc.connectionState==='disconnected')goHome();
  };
}

/* ── SOURCE ── */
function initSource(){
  role='source';show('sSource');
  $('srcCode').textContent='------';
  setSt('srcStatus','Sunucuya bağlanıyor…');
  $('captureBtn').disabled=true;
  openWS(()=>{
    send({type:'create'});
    makePC();
    dc=pc.createDataChannel('ambi',{ordered:false,maxRetransmits:0});
    dc.binaryType='arraybuffer';
    dc.onopen=()=>{setSt('srcStatus','✓ Bağlantı kuruldu!','ok');$('captureBtn').disabled=false;};
  });
}

async function makeOffer(){
  const o=await pc.createOffer();
  await pc.setLocalDescription(o);
  send({type:'offer',sdp:o});
}

async function startCapture(){
  try{
    stream=await navigator.mediaDevices.getDisplayMedia({
      video:{frameRate:{ideal:60},cursor:'never',displaySurface:'monitor'},
      audio:false,
      selfBrowserSurface:'exclude',   // Chrome 107+: kendi sekmesini listeden çıkar
      surfaceSwitching:'exclude',
      systemAudio:'exclude'
    });
  }catch(e){alert('Ekran seçilmedi veya izin reddedildi.');return;}

  const vid=document.createElement('video');
  vid.srcObject=stream;vid.play();
  const cv=$('cv'),cx=cv.getContext('2d',{willReadFrequently:true});
  stream.getVideoTracks()[0].addEventListener('ended',stopCapture);
  $('captureBtn').textContent='⏹ Durdur';
  $('captureBtn').onclick=stopCapture;

  vid.onloadedmetadata=()=>{
    cv.width=vid.videoWidth;cv.height=vid.videoHeight;
    const loop=ts=>{
      if(!stream)return;
      rafId=requestAnimationFrame(loop);
      if(ts-lastTs<14)return;
      lastTs=ts;
      cx.drawImage(vid,0,0);
      if(dc&&dc.readyState==='open')dc.send(sample(cv,cx));
    };
    rafId=requestAnimationFrame(loop);
  };
}

function stopCapture(){
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  $('captureBtn').textContent='▶ Ekran Yakalamayı Başlat';
  $('captureBtn').onclick=startCapture;
}

function sample(cv,cx){
  const w=cv.width,h=cv.height;
  const dw=Math.max(6,Math.round(w*DEPTH)),dh=Math.max(6,Math.round(h*DEPTH));
  const sw=Math.floor(w/SEG),sh=Math.floor(h/SEG);
  const buf=new Uint8Array(SEG*12);let o=0;
  for(let i=0;i<SEG;i++){let[r,g,b]=px(cx,i*sw,0,sw,dh);        buf[o++]=r;buf[o++]=g;buf[o++]=b;}
  for(let i=0;i<SEG;i++){let[r,g,b]=px(cx,i*sw,h-dh,sw,dh);     buf[o++]=r;buf[o++]=g;buf[o++]=b;}
  for(let i=0;i<SEG;i++){let[r,g,b]=px(cx,0,i*sh,dw,sh);         buf[o++]=r;buf[o++]=g;buf[o++]=b;}
  for(let i=0;i<SEG;i++){let[r,g,b]=px(cx,w-dw,i*sh,dw,sh);     buf[o++]=r;buf[o++]=g;buf[o++]=b;}
  return buf.buffer;
}
function px(cx,x,y,w,h){
  const d=cx.getImageData(x,y,w,h).data;
  let r=0,g=0,b=0,n=d.length>>2;
  for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
  return[r/n|0,g/n|0,b/n|0];
}

/* ── DISPLAY ── */
function initDisplay(){
  role='display';show('sConnect');setSt('dispStatus','');
  openWS(()=>{
    makePC();
    pc.ondatachannel=e=>{
      dc=e.channel;dc.binaryType='arraybuffer';
      dc.onmessage=ev=>paint(new Uint8Array(ev.data));
    };
  });
}

function joinRoom(){
  const code=$('codeInp').value.trim();
  if(code.length!==6){setSt('dispStatus','6 haneli kod gir','err');return;}
  setSt('dispStatus','Bağlanıyor…');
  send({type:'join',code});
}

function enterFullscreen(){
  const el=document.documentElement;
  try{(el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen).call(el);}catch(e){}
}

function initCanvas(){
  const cv=$('ambiCanvas');
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  const ctx=cv.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,cv.width,cv.height);
}

window.addEventListener('resize',()=>{
  if(!$('sAmbi').classList.contains('active'))return;
  const cv=$('ambiCanvas');cv.width=window.innerWidth;cv.height=window.innerHeight;
});

/* ── Painter: full-screen radial glow blobs with screen blending ── */
function paint(arr){
  const cv=$('ambiCanvas');
  const ctx=cv.getContext('2d');
  const W=cv.width||window.innerWidth,H=cv.height||window.innerHeight;

  ctx.fillStyle='#010108';ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='screen';

  const edges=[
    Array.from({length:SEG},(_,i)=>vivid(arr[i*3],arr[i*3+1],arr[i*3+2])),         // top
    Array.from({length:SEG},(_,i)=>vivid(arr[(SEG+i)*3],arr[(SEG+i)*3+1],arr[(SEG+i)*3+2])),   // bot
    Array.from({length:SEG},(_,i)=>vivid(arr[(SEG*2+i)*3],arr[(SEG*2+i)*3+1],arr[(SEG*2+i)*3+2])), // left
    Array.from({length:SEG},(_,i)=>vivid(arr[(SEG*3+i)*3],arr[(SEG*3+i)*3+1],arr[(SEG*3+i)*3+2]))  // right
  ];

  const gH=H*0.72,gW=W*0.72;

  function blob(cx,cy,rad,r,g,b){
    const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
    gr.addColorStop(0,   \`rgba(\${r},\${g},\${b},0.92)\`);
    gr.addColorStop(0.3, \`rgba(\${r},\${g},\${b},0.55)\`);
    gr.addColorStop(0.65,\`rgba(\${r},\${g},\${b},0.18)\`);
    gr.addColorStop(1,   \`rgba(\${r},\${g},\${b},0)\`);
    ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  }

  // Top
  edges[0].forEach(([r,g,b],i)=>blob(((i+.5)/SEG)*W, 0,   gH,r,g,b));
  // Bottom
  edges[1].forEach(([r,g,b],i)=>blob(((i+.5)/SEG)*W, H,   gH,r,g,b));
  // Left
  edges[2].forEach(([r,g,b],i)=>blob(0,  ((i+.5)/SEG)*H,  gW,r,g,b));
  // Right
  edges[3].forEach(([r,g,b],i)=>blob(W,  ((i+.5)/SEG)*H,  gW,r,g,b));

  ctx.globalCompositeOperation='source-over';

  // Center vignette
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.08,W/2,H/2,Math.min(W,H)*.68);
  vg.addColorStop(0,'rgba(0,0,0,0.6)');vg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  frameCount++;
  const now=performance.now();
  if(now-fpsTs>1000){$('fpsBadge').textContent=frameCount+' fps';frameCount=0;fpsTs=now;}
}
</script>
</body>
</html>`;

/* ── HTTP Server ── */
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAGE);
});

/* ── WebSocket Signaling ── */
const wss   = new WebSocketServer({ server: httpServer });
const rooms = new Map();

function genCode(){
  let c;
  do { c = crypto.randomBytes(3).toString('hex').toUpperCase(); } while(rooms.has(c));
  return c;
}

function relay(from, raw){
  const room = rooms.get(from.code);
  if (!room) return;
  const peer = from.role === 'source' ? room.display : room.source;
  if (peer && peer.readyState === 1) peer.send(raw);
}

wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    switch(m.type){
      case 'create': {
        const code = genCode();
        rooms.set(code, { source: ws, display: null });
        ws.code = code; ws.role = 'source';
        ws.send(JSON.stringify({ type: 'created', code }));
        console.log('[+] Oda:', code);
        break;
      }
      case 'join': {
        const room = rooms.get(m.code);
        if (!room || !room.source) {
          ws.send(JSON.stringify({ type:'error', msg:'Oda bulunamadı veya ana cihaz bağlı değil.' }));
          return;
        }
        room.display = ws; ws.code = m.code; ws.role = 'display';
        room.source.send(JSON.stringify({ type:'peer_joined' }));
        ws.send(JSON.stringify({ type:'joined' }));
        console.log('[+] İkinci cihaz katıldı:', m.code);
        break;
      }
      case 'offer': case 'answer': case 'ice':
        relay(ws, raw.toString());
        break;
    }
  });

  ws.on('close', () => {
    if (!ws.code) return;
    const room = rooms.get(ws.code);
    if (!room) return;
    const peer = ws.role === 'source' ? room.display : room.source;
    if (peer && peer.readyState === 1) peer.send(JSON.stringify({ type:'peer_left' }));
    if (ws.role === 'source') { rooms.delete(ws.code); console.log('[-] Oda kapandı:', ws.code); }
    else room.display = null;
  });
});

setInterval(()=>{
  wss.clients.forEach(ws=>{ if(!ws.alive){ws.terminate();return;} ws.alive=false; ws.ping(); });
}, 20_000);

const PORT = process.env.PORT || 8765;
httpServer.listen(PORT, () => console.log('✓ AmbiSync → http://localhost:' + PORT));
