/* פארק הזומבים: מצייר את הפארק ומזיז את הזומבים של הצופים.
   המצב מגיע מהבוט (/public/game). מה שקורה במשחק נקבע בבוט, כאן רק מציירים ומנפישים.
   כתובת המצב: ?api=... בכתובת הדף, או SITE_CONFIG.game.url באתר, או /public/game כשהדף מוגש מהבוט. */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var qs = new URLSearchParams(location.search);
  var canvas = document.getElementById('park');
  var ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  var API = qs.get('api') || ((window.SITE_CONFIG || {}).game || {}).url || '/public/game';
  var LOCAL = API.charAt(0) === '/' || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(API);
  var POLL_MS = LOCAL ? 1000 : 5000; // the public address has request limits, so viewers poll slowly
  var BG = qs.get('bg') !== 'transparent';
  var PROPS = qs.get('props') !== '0';
  var STICKERS = canvas.getAttribute('data-stickers') || 'stickers/';
  var FONT = 'Rubik, "Segoe UI", Arial, sans-serif';

  // ─── the map ───────────────────────────────────────────────────────
  var ZONES = {
    gate:   { x: 100,  y: 590, he: 'השער' },
    slide:  { x: 255,  y: 400, he: 'מגלשת הקברים' },
    pool:   { x: 590,  y: 575, he: 'בריכת הרעל' },
    bakery: { x: 985,  y: 500, he: 'מאפיית המוחות' },
    bar:    { x: 1050, y: 640, he: 'בר הדם' },
    bed:    { x: 440,  y: 290, he: 'חדר השינה' },
    fire:   { x: 770,  y: 330, he: 'המדורה' },
    dance:  { x: 330,  y: 640, he: 'רחבת הריקודים' },
    wall:   { x: 1150, y: 410, he: 'קיר הגרפיטי' }
  };
  var COLORS = { green: '#3dff1f', red: '#ff3b4f', blue: '#3b8bff', yellow: '#ffd21f', purple: '#a45bff', pink: '#ff6bd0', orange: '#ff9a1f', white: '#ffffff' };
  var FILTERS = {
    green: '', red: 'hue-rotate(250deg) saturate(1.4)', blue: 'hue-rotate(110deg) saturate(1.3)',
    yellow: 'hue-rotate(310deg) saturate(1.5) brightness(1.1)', purple: 'hue-rotate(170deg) saturate(1.3)',
    pink: 'hue-rotate(220deg) saturate(1.2) brightness(1.15)', orange: 'hue-rotate(280deg) saturate(1.5)', white: 'saturate(0) brightness(1.5)'
  };
  var FACES = { happy: '01_happy_love', shocked: '02_shocked', angry: '03_angry', scared: '04_scared', crying: '05_crying', thinking: '06_thinking', sleepy: '07_sleepy_tired', shy: '08_blushing_shy' };
  var ACT_FACE = { fight: 'angry', sleep: 'sleepy', relax: 'sleepy', eat: 'happy', drink: 'shy', dance: 'happy', slide: 'shocked', swim: 'thinking', dive: 'shocked', graffiti: 'thinking', meet: 'shy', follow: 'happy', rise: 'shocked' };
  var ACT_EMOJI = { eat: '🧠', drink: '🩸', dance: '🎵', fight: '💥', graffiti: '🖌️', relax: '🔥' };

  var images = {};
  Object.keys(FACES).forEach(function (k) {
    var img = new Image();
    img.src = STICKERS + FACES[k] + '.png';
    images[k] = img;
  });

  // ─── state from the bot ────────────────────────────────────────────
  var state = { enabled: true, paused: false, players: [], events: [], graffiti: [], notices: [] };
  var avatars = {}; // key -> drawing state
  var skew = 0; // server clock - my clock
  var online = false;
  var lastOk = 0;
  var firstSync = true;

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  function rnd(seed) { var x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

  function applyState(s) {
    state = s;
    skew = (s.now || Date.now()) - Date.now();
    var seen = {};
    s.players.forEach(function (p) {
      seen[p.k] = true;
      var a = avatars[p.k];
      if (!a) {
        a = avatars[p.k] = { key: p.k, seed: hash(p.k), x: ZONES.gate.x, y: ZONES.gate.y + 20, face: 1, born: Date.now(), wander: null, slideStart: 0 };
      }
      a.p = p;
    });
    Object.keys(avatars).forEach(function (k) { if (!seen[k]) delete avatars[k]; });
    if (firstSync) {
      // the page was just opened: everybody who is already in the park starts where they are, not at the gate
      firstSync = false;
      var t0 = Date.now();
      Object.keys(avatars).forEach(function (k) { var tg = target(avatars[k], t0); avatars[k].x = tg.x; avatars[k].y = tg.y; avatars[k].born = 0; });
    }
    $('count').textContent = s.players.length;
  }

  function $(id) { return document.getElementById(id); }

  function poll() {
    var headers = { Accept: 'application/json' };
    if (!LOCAL) headers['ngrok-skip-browser-warning'] = '1';
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(API, { headers: headers, signal: ctrl.signal })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (s) { online = true; lastOk = Date.now(); applyState(s); })
      .catch(function () { online = false; })
      .then(function () { clearTimeout(t); });
  }

  // ─── what each zombie wants to do ──────────────────────────────────
  function nowMs() { return Date.now() + skew; }
  function zoneBlocked(z) {
    var t = nowMs();
    return state.events.some(function (e) { return e.u > t && e.z === z && (e.t === 'fire' || e.t === 'sabotage'); });
  }
  function chaosOn() { var t = nowMs(); return state.events.some(function (e) { return e.u > t && e.t === 'chaos'; }); }

  function target(a, time) {
    var p = a.p;
    var z = ZONES[p.z] || ZONES.gate;
    var act = p.a;
    var sx = a.seed * 6.28;
    var spread = function (r) { return { x: z.x + Math.cos(sx) * r, y: z.y + Math.sin(sx) * r * 0.5 }; };
    var other = function (k) { return k && avatars[k] ? avatars[k] : null; };

    if (zoneBlocked(p.z) && p.z !== 'gate') return { x: ZONES.gate.x + 40 + a.seed * 140, y: 600 + a.seed * 40, speed: 170, scared: true };
    if (act === 'fight') {
      var o = other(p.x);
      if (o) { var side = p.k < o.key ? -1 : 1; return { x: o.x + side * 38, y: o.y, speed: 150, shake: 5 }; }
    }
    if (act === 'meet') { var m = other(p.m); if (m) return { x: m.x + (a.seed < 0.5 ? -50 : 50), y: m.y + 4, speed: 160 }; }
    if (act === 'follow') { var f = other(p.f); if (f) return { x: f.x - f.face * 48, y: f.y + 6, speed: 180 }; }
    if (act === 'slide') {
      if (!a.slideStart) a.slideStart = time;
      var st = ((time - a.slideStart) % 4200) / 4200;
      return { x: 185 + st * 150, y: 330 + st * 150, speed: 9999, fixed: true };
    }
    if (act === 'swim') { var w = time / 1800 + a.seed * 9; return { x: z.x + Math.cos(w) * 110, y: z.y + Math.sin(w * 1.3) * 28, speed: 70, bob: 4 }; }
    if (act === 'dive') { return { x: z.x + (a.seed - 0.5) * 120, y: z.y, speed: 120, dive: true }; }
    if (act === 'sleep') { var b = spread(28); return { x: b.x, y: z.y, speed: 120, lying: true }; }
    if (act === 'dance') { var d = spread(70); return { x: d.x, y: z.y + (a.seed - 0.5) * 40, speed: 130, dance: true }; }
    if (act === 'relax') { var r = spread(75); return { x: r.x, y: z.y + 40 + Math.abs(r.y - z.y) * 0.3, speed: 110 }; }
    if (act === 'rise') { return { x: z.x + 60, y: z.y, speed: 60, rise: true }; }
    if (act) { var s = spread(act === 'graffiti' ? 70 : 60); return { x: s.x, y: s.y + 20, speed: 130 }; }
    // nothing to do: wander around the last place
    if (!a.wander || time > a.wander.until) {
      var n = Math.floor(time / 1000) + a.seed * 100;
      a.wander = { x: z.x + (rnd(n) - 0.5) * 240, y: z.y + (rnd(n + 7) - 0.3) * 90, until: time + 3000 + rnd(n + 3) * 4000 };
    }
    return { x: a.wander.x, y: a.wander.y, speed: 55 };
  }

  function step(a, dt, time) {
    var t = target(a, time);
    var speed = chaosOn() ? 280 : t.speed;
    var tx = Math.max(40, Math.min(W - 40, t.x)), ty = Math.max(200, Math.min(H - 30, t.y));
    var dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy);
    if (t.fixed) { a.x = tx; a.y = ty; a.moving = true; }
    else if (dist > 2) {
      var mv = Math.min(dist, speed * dt);
      a.x += (dx / dist) * mv; a.y += (dy / dist) * mv;
      a.moving = dist > 6;
    } else a.moving = false;
    if (Math.abs(dx) > 4) a.face = dx > 0 ? 1 : -1;
    a.fx = t;
  }

  // ─── drawing ───────────────────────────────────────────────────────
  function text(str, x, y, size, color, align, stroke) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.lineJoin = 'round';
    if (stroke !== false) { ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  }

  function drawSky(time) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#060b09'); g.addColorStop(0.55, '#0f1c15'); g.addColorStop(1, '#0a130e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 60; i++) {
      var sx = rnd(i) * W, sy = rnd(i + 99) * 260;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time / 700 + i);
      ctx.fillStyle = '#e8ffe0'; ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    var mg = ctx.createRadialGradient(1100, 90, 10, 1100, 90, 160);
    mg.addColorStop(0, 'rgba(200,255,190,.45)'); mg.addColorStop(1, 'rgba(200,255,190,0)');
    ctx.fillStyle = mg; ctx.fillRect(900, 0, 380, 260);
    ctx.fillStyle = '#e4ffd8'; ctx.beginPath(); ctx.arc(1100, 90, 38, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#0b130f';
    ctx.beginPath(); ctx.moveTo(0, 300); for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 250 + 40 * Math.sin(x / 210) + 20 * Math.sin(x / 97)); ctx.lineTo(W, 520); ctx.lineTo(0, 520); ctx.fill();
    var gg = ctx.createLinearGradient(0, 480, 0, H);
    gg.addColorStop(0, '#14241b'); gg.addColorStop(1, '#0b150f');
    ctx.fillStyle = gg; ctx.fillRect(0, 480, W, H - 480);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(60, 560, W - 120, 120);
  }

  function label(z) { text(ZONES[z].he, ZONES[z].x, ZONES[z].y - 92, 15, '#bfe8b0'); }

  function blockedMark(z, time) {
    var zn = ZONES[z];
    ctx.save(); ctx.translate(zn.x, zn.y - 10); ctx.rotate(-0.15);
    ctx.fillStyle = '#ffd21f'; ctx.fillRect(-80, -8, 160, 16);
    ctx.fillStyle = '#111';
    for (var i = -80; i < 80; i += 24) { ctx.beginPath(); ctx.moveTo(i, -8); ctx.lineTo(i + 12, -8); ctx.lineTo(i + 4, 8); ctx.lineTo(i - 8, 8); ctx.fill(); }
    ctx.restore();
    text('🚧', zn.x, zn.y - 30, 30, '#fff', 'center', false);
  }

  function flames(z, time) {
    var zn = ZONES[z];
    for (var i = 0; i < 14; i++) {
      var ph = time / 160 + i * 1.7;
      var fx = zn.x + (rnd(i + 1) - 0.5) * 140, fh = 30 + 34 * Math.abs(Math.sin(ph));
      ctx.fillStyle = i % 3 ? 'rgba(255,140,30,.85)' : 'rgba(255,60,30,.9)';
      ctx.beginPath(); ctx.moveTo(fx - 12, zn.y + 18); ctx.quadraticCurveTo(fx, zn.y + 18 - fh * 1.6, fx + 12, zn.y + 18); ctx.fill();
    }
  }

  function drawProps(time) {
    var blocked = function (z) { return zoneBlocked(z); };
    var mal = state.events.some(function (e) { return e.u > nowMs() && e.t === 'malfunction'; });
    var z;
    // gate
    z = ZONES.gate; ctx.strokeStyle = '#5b6b60'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(z.x - 50, z.y + 40); ctx.lineTo(z.x - 50, z.y - 40); ctx.arc(z.x, z.y - 40, 50, Math.PI, 0); ctx.lineTo(z.x + 50, z.y + 40); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,80,' + (0.7 + 0.2 * Math.sin(time / 300)) + ')'; ctx.beginPath(); ctx.arc(z.x, z.y - 75, 8, 0, 6.3); ctx.fill();
    // slide
    z = ZONES.slide; ctx.fillStyle = '#4b5a51'; ctx.beginPath(); ctx.moveTo(175, 320); ctx.lineTo(215, 310); ctx.lineTo(355, 465); ctx.lineTo(315, 480); ctx.fill();
    ctx.fillStyle = 'rgba(61,255,31,.45)'; ctx.beginPath(); ctx.moveTo(185, 322); ctx.lineTo(210, 316); ctx.lineTo(345, 466); ctx.lineTo(322, 474); ctx.fill();
    // pool
    z = ZONES.pool; ctx.fillStyle = mal ? 'rgba(255,50,60,.55)' : 'rgba(61,255,31,.4)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, 170, 62, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = mal ? '#ff5560' : '#2aa813'; ctx.lineWidth = 5; ctx.stroke();
    for (var b = 0; b < 7; b++) { var bp = (time / 1400 + b / 7) % 1; ctx.fillStyle = 'rgba(220,255,210,' + (0.6 - bp * 0.6) + ')'; ctx.beginPath(); ctx.arc(z.x - 110 + b * 36, z.y + 20 - bp * 40, 4 + (b % 3), 0, 6.3); ctx.fill(); }
    // bakery
    z = ZONES.bakery; ctx.fillStyle = '#3a2f2a'; ctx.fillRect(z.x - 70, z.y - 80, 140, 90); ctx.fillStyle = '#6a3a2a'; ctx.beginPath(); ctx.moveTo(z.x - 85, z.y - 80); ctx.lineTo(z.x, z.y - 130); ctx.lineTo(z.x + 85, z.y - 80); ctx.fill();
    text('🧠', z.x, z.y - 38, 34, '#fff', 'center', false);
    // bar
    z = ZONES.bar; ctx.fillStyle = '#4a1f28'; ctx.fillRect(z.x - 70, z.y - 40, 140, 52); ctx.fillStyle = '#7a2a38'; ctx.fillRect(z.x - 76, z.y - 48, 152, 10);
    text('🩸', z.x, z.y - 8, 28, '#fff', 'center', false);
    // bed (coffin)
    z = ZONES.bed; ctx.save(); ctx.translate(z.x, z.y); ctx.fillStyle = '#3b2b22'; ctx.beginPath(); ctx.moveTo(-70, -20); ctx.lineTo(-50, -34); ctx.lineTo(50, -34); ctx.lineTo(70, -20); ctx.lineTo(50, 34); ctx.lineTo(-50, 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8fb0'; ctx.fillRect(-58, -22, 26, 18); ctx.restore();
    // campfire
    z = ZONES.fire; ctx.fillStyle = '#4b3422'; ctx.fillRect(z.x - 34, z.y + 12, 68, 10);
    for (var f = 0; f < 5; f++) { var fh = 26 + 22 * Math.abs(Math.sin(time / 130 + f * 2)); ctx.fillStyle = f % 2 ? '#ff9a1f' : '#ff4d1f'; ctx.beginPath(); ctx.moveTo(z.x - 28 + f * 14, z.y + 14); ctx.quadraticCurveTo(z.x - 20 + f * 14, z.y + 14 - fh * 1.5, z.x - 6 + f * 14, z.y + 14); ctx.fill(); }
    // dance floor
    z = ZONES.dance; for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) {
      var hue = (time / 12 + i * 40 + j * 70) % 360; ctx.fillStyle = 'hsla(' + hue + ',90%,55%,.35)'; ctx.fillRect(z.x - 100 + i * 50, z.y - 40 + j * 28, 46, 25);
    }
    // wall with graffiti
    z = ZONES.wall; ctx.fillStyle = '#3a3f3c'; ctx.fillRect(z.x - 70, z.y - 200, 140, 210);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    for (var r = 0; r < 7; r++) { ctx.beginPath(); ctx.moveTo(z.x - 70, z.y - 200 + r * 30); ctx.lineTo(z.x + 70, z.y - 200 + r * 30); ctx.stroke(); }
    var cols = ['#ff6bd0', '#3dff1f', '#ffd21f', '#3b8bff', '#ff9a1f', '#a45bff'];
    (state.graffiti || []).slice(-6).forEach(function (gr, i) {
      ctx.save(); ctx.translate(z.x, z.y - 170 + i * 30); ctx.rotate((rnd(i + gr.text.length) - 0.5) * 0.25);
      text(gr.text.slice(0, 16), 0, 0, 15, cols[i % cols.length], 'center', false); ctx.restore();
    });
    Object.keys(ZONES).forEach(label);
    Object.keys(ZONES).forEach(function (k) { if (k !== 'gate' && blocked(k)) blockedMark(k, time); });
    state.events.forEach(function (e) { if (e.u > nowMs() && e.t === 'fire' && e.z) flames(e.z, time); });
  }

  function drawAvatar(a, time) {
    var p = a.p, t = a.fx || {};
    var faceKey = p.mo || (p.a ? ACT_FACE[p.a] : null) || (a.seed < 0.5 ? 'happy' : 'thinking');
    if (t.scared) faceKey = 'scared';
    if (chaosOn()) faceKey = 'scared';
    var img = images[faceKey];
    if (!img || !img.complete || !img.naturalWidth) return;
    var size = 78;
    var w = size * (img.naturalWidth / img.naturalHeight), h = size;
    var age = (Date.now() - a.born) / 1000;
    var grow = t.rise ? Math.min(1, age / 1.6) : 1;
    var bob = a.moving ? Math.sin(time / 90 + a.seed * 9) * 3 : Math.sin(time / 500 + a.seed * 9) * 1.2;
    if (t.dance) bob = -Math.abs(Math.sin(time / 180 + a.seed * 7)) * 14;
    if (t.dive) bob = Math.sin(time / 400 + a.seed * 5) * 18 + 10;
    if (t.bob) bob += Math.sin(time / 350 + a.seed * 5) * t.bob;
    var shake = (t.shake || (chaosOn() || t.scared ? 4 : 0)) ? (Math.random() - 0.5) * (t.shake || 4) * 2 : 0;
    var x = a.x + shake, y = a.y + bob;

    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 4, w * 0.3, 8, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS[p.c] || COLORS.green; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(a.x, a.y + 4, w * 0.3 + 3, 10, 0, 0, 6.3); ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    if (t.lying) ctx.rotate(-Math.PI / 2 * a.face);
    if (t.dance) ctx.rotate(Math.sin(time / 160 + a.seed * 6) * 0.25);
    ctx.scale(a.face * grow, grow);
    if (FILTERS[p.c] && 'filter' in ctx) ctx.filter = FILTERS[p.c];
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    if ('filter' in ctx) ctx.filter = 'none';

    var top = y - h - (t.lying ? -40 : 0);
    if (p.h) text(p.h, x, top + 6, 26, '#fff', 'center', false);
    if (ACT_EMOJI[p.a]) text(ACT_EMOJI[p.a], x + 34, top + 22 + Math.sin(time / 250) * 4, 22, '#fff', 'center', false);
    if (p.a === 'sleep') text('Zzz', x + 30, top - 4 - ((time / 40) % 20), 18, '#cfe6ff');
    text(p.n, x, y + 24, 14, COLORS[p.c] || '#fff');
    if (p.sp) {
      var tw = Math.min(200, p.sp.length * 9 + 22);
      ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(x - tw / 2, top - 38, tw, 26, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6, top - 12); ctx.lineTo(x + 6, top - 12); ctx.lineTo(x, top - 4); ctx.fill();
      text(p.sp, x, top - 19, 13, '#111', 'center', false);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawHud(time) {
    var list = state.notices || [];
    list.forEach(function (n, i) {
      var age = (nowMs() - n.t) / 1000;
      if (age > 25) return;
      ctx.globalAlpha = Math.max(0, Math.min(1, (25 - age) / 5));
      text(n.text, 24, H - 24 - (list.length - 1 - i) * 26, 16, '#fff', 'left');
    });
    ctx.globalAlpha = 1;
    if (!state.players.length && online) text('כתבו visit! בצ׳אט כדי להיכנס לפארק 🧟', W / 2, H / 2 + 40, 28, '#bfe8b0');
    if (state.paused) text('⏸️ הפארק בהפסקה', W / 2, 80, 34, '#ffd21f');
    if (!state.enabled) text('הפארק כבוי', W / 2, 80, 34, '#ff6b6b');
    if (chaosOn() && Math.sin(time / 90) > 0.85) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, W, H); }
  }

  // ─── loop ──────────────────────────────────────────────────────────
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    var time = Date.now();
    ctx.clearRect(0, 0, W, H);
    var shakeAll = chaosOn() ? (Math.random() - 0.5) * 6 : 0;
    ctx.save(); ctx.translate(shakeAll, shakeAll);
    if (BG) drawSky(time);
    if (PROPS) drawProps(time);
    var list = Object.keys(avatars).map(function (k) { return avatars[k]; });
    list.forEach(function (a) { step(a, dt, time); });
    list.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { drawAvatar(a, time); });
    ctx.restore();
    drawHud(time);
    var badge = $('status');
    if (badge) {
      var stale = !online && Date.now() - lastOk > 15000;
      badge.textContent = stale ? 'הפארק לא זמין כרגע. הוא עולה כשערן בלייב והבוט רץ.' : '';
      badge.hidden = !stale;
    }
    requestAnimationFrame(frame);
  }

  if (qs.get('overlay') === '1') document.body.classList.add('overlay');
  poll();
  setInterval(function () { if (!document.hidden || LOCAL) poll(); }, POLL_MS);
  requestAnimationFrame(frame);

  // for tests / debugging
  window.__park = { applyState: applyState, avatars: avatars };
})();
