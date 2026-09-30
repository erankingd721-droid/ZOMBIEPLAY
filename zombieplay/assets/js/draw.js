/* הדף של הצופה שנבחר לצייר ("נחש את הציור"). שלבים: שם משתמש ← קוד אימות בצ'אט ← לוח ציור עם המילה.
   הדף מדבר עם הבוט דרך הכתובת שב-config.js (chatGames.url). המילה מגיעה רק אחרי שהקוד נכתב בצ'אט מהחשבון הנבחר. */
(function () {
  'use strict';

  var CFG = (window.SITE_CONFIG || {}).chatGames || {};
  var API = String(CFG.url || '').replace(/\/public\/games\/?$/, '');
  var COLORS = ['#111111', '#ff3b4f', '#3b8bff', '#22b10f', '#f5c400', '#a45bff', '#ff8a00', '#7a4b22'];
  var SIZES = [3, 7, 12];
  var $ = function (id) { return document.getElementById(id); };

  var token = '';
  var name = '';
  try { token = sessionStorage.getItem('zp_draw_token') || ''; name = sessionStorage.getItem('zp_draw_name') || ''; } catch (e) {}
  var color = 0;
  var size = 1;
  var strokes = []; // local strokes, each {c, w, p, segs}
  var outbox = [];
  var current = null;
  var skew = 0;
  var endsAt = 0;
  var pollTimer = null;
  var view = '';

  function show(id) {
    ['stepName', 'stepCode', 'stepDraw', 'stepEnd'].forEach(function (s) { $(s).hidden = s !== id; });
    view = id;
  }

  function call(path, opts) {
    opts = opts || {};
    var headers = { 'ngrok-skip-browser-warning': '1' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body, signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(t);
        return r.json().catch(function () { return {}; }).then(function (json) { return { status: r.status, json: json }; });
      }, function (e) { clearTimeout(t); throw e; });
  }

  // ─── step 1: the name ──────────────────────────────────────────────
  $('nameForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('nameMsg');
    msg.textContent = '';
    if (!API) { msg.textContent = 'הדף עוד לא מחובר לבוט (chatGames.url חסר ב-config.js).'; return; }
    call('/draw/claim', { method: 'POST', body: JSON.stringify({ name: $('nameInput').value }) })
      .then(function (r) {
        if (r.status !== 200) { msg.textContent = r.json.error || 'לא הצלחנו.'; return; }
        token = r.json.token;
        name = r.json.name;
        try { sessionStorage.setItem('zp_draw_token', token); sessionStorage.setItem('zp_draw_name', name); } catch (err) {}
        $('codeBox').textContent = r.json.code;
        show('stepCode');
        startPolling();
      })
      .catch(function () { msg.textContent = 'אין חיבור לבוט. אולי הוא כבוי כרגע.'; });
  });

  // ─── polling the state ─────────────────────────────────────────────
  function startPolling() {
    clearInterval(pollTimer);
    poll();
    pollTimer = setInterval(poll, 1500);
  }

  function poll() {
    if (!token) return;
    call('/draw/state?token=' + encodeURIComponent(token)).then(function (r) {
      var s = r.json;
      if (s.now) skew = s.now - Date.now();
      if (!s.active || s.error) { reset('אין סיבוב ציור פעיל, או שהקוד פג. אפשר להתחיל מחדש אם נבחרתם.'); return; }
      endsAt = s.endsAt;
      if (s.status !== 'running') {
        $('endTitle').textContent = s.winner ? '🏆 ' + s.winner + ' ניחש!' : '⏰ נגמר הזמן';
        $('endText').textContent = 'המילה הייתה: ' + s.answer + '. תודה שציירתם!';
        show('stepEnd');
        clearInterval(pollTimer);
        return;
      }
      if (!s.verified) {
        $('codeBox').textContent = s.code;
        if (view !== 'stepCode') show('stepCode');
        return;
      }
      if (view !== 'stepDraw') { show('stepDraw'); initBoard(); }
      $('wordBox').textContent = s.word;
      $('catBox').textContent = s.cat ? '(' + s.cat + ')' : '';
    }).catch(function () {});
  }

  function reset(text) {
    clearInterval(pollTimer);
    token = '';
    try { sessionStorage.removeItem('zp_draw_token'); } catch (e) {}
    show('stepName');
    $('nameMsg').textContent = text || '';
  }

  setInterval(function () {
    if (view !== 'stepDraw' || !endsAt) return;
    var t = Math.max(0, Math.ceil((endsAt - (Date.now() + skew)) / 1000));
    $('timeBox').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }, 500);

  // ─── the board ─────────────────────────────────────────────────────
  var cv = $('board');
  var ctx = cv.getContext('2d');
  var ready = false;

  function initBoard() {
    if (ready) return;
    ready = true;
    $('colors').innerHTML = COLORS.map(function (c, i) {
      return '<button type="button" class="d-color' + (i === color ? ' on' : '') + '" data-i="' + i + '" style="background:' + c + '" aria-label="צבע ' + (i + 1) + '"></button>';
    }).join('');
    $('sizes').innerHTML = ['דק', 'בינוני', 'עבה'].map(function (t, i) {
      return '<button type="button" class="d-size' + (i === size ? ' on' : '') + '" data-i="' + i + '">' + t + '</button>';
    }).join('');
    repaint();
  }

  $('colors').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b) return;
    color = Number(b.dataset.i);
    [].forEach.call($('colors').children, function (x) { x.classList.toggle('on', x === b); });
  });
  $('sizes').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b) return;
    size = Number(b.dataset.i);
    [].forEach.call($('sizes').children, function (x) { x.classList.toggle('on', x === b); });
  });

  function drawStroke(st) {
    ctx.strokeStyle = ctx.fillStyle = COLORS[st.c] || COLORS[0];
    ctx.lineWidth = st.w * 1.8;
    ctx.lineCap = ctx.lineJoin = 'round';
    var p = st.p;
    if (p.length === 2) { ctx.beginPath(); ctx.arc(p[0], p[1] * 0.7, st.w, 0, 6.3); ctx.fill(); return; }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1] * 0.7);
    for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1] * 0.7);
    ctx.stroke();
  }

  function repaint() {
    ctx.fillStyle = '#f7f9f3';
    ctx.fillRect(0, 0, 1000, 700);
    strokes.forEach(drawStroke);
    if (current) drawStroke(current);
  }

  function point(e) {
    var r = cv.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000))), Math.round(Math.max(0, Math.min(1000, ((e.clientY - r.top) / r.height) * 1000)))];
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    var p = point(e);
    current = { c: color, w: SIZES[size], p: [p[0], p[1]] };
    repaint();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!current) return;
    var p = point(e);
    var n = current.p.length;
    if (Math.hypot(p[0] - current.p[n - 2], p[1] - current.p[n - 1]) < 4) return;
    current.p.push(p[0], p[1]);
    if (current.p.length >= 120) { // long stroke: send the part drawn so far and go on from its last point
      outbox.push({ c: current.c, w: current.w, p: current.p.slice() });
      strokes.push({ c: current.c, w: current.w, p: current.p.slice(), cont: true }); // cont: the next entry goes on from here
      current = { c: current.c, w: current.w, p: [p[0], p[1]] };
    }
    repaint();
  });
  function endStroke() {
    if (!current) return;
    outbox.push({ c: current.c, w: current.w, p: current.p.slice() });
    strokes.push(current);
    current = null;
    repaint();
    flush();
  }
  cv.addEventListener('pointerup', endStroke);
  cv.addEventListener('pointercancel', endStroke);

  function flush() {
    if (!outbox.length || !token) return;
    var batch = outbox.splice(0, 50);
    call('/draw/stroke', { method: 'POST', body: JSON.stringify({ token: token, strokes: batch }) })
      .then(function (r) {
        if (r.status === 200) $('drawMsg').textContent = '';
        else if (r.status === 403) $('drawMsg').textContent = 'הציור נעצר (אולי הסיבוב נגמר).';
        else { outbox = batch.concat(outbox); $('drawMsg').textContent = 'בעיית חיבור, מנסה שוב…'; }
      })
      .catch(function () { outbox = batch.concat(outbox); $('drawMsg').textContent = 'בעיית חיבור, מנסה שוב…'; });
  }
  setInterval(flush, 800);

  // undo removes the whole last stroke. A long stroke was sent in pieces (cont = goes on in the next entry),
  // so every piece has to go; pieces that were not sent yet are simply taken out of the outbox.
  $('undoBtn').addEventListener('click', function () {
    if (!strokes.length) return;
    var pieces = 1;
    strokes.pop();
    while (strokes.length && strokes[strokes.length - 1].cont) { strokes.pop(); pieces++; }
    repaint();
    var remote = 0;
    for (var i = 0; i < pieces; i++) {
      if (outbox.length) outbox.pop();
      else remote++;
    }
    (function undo(n) {
      if (n <= 0) return;
      call('/draw/stroke', { method: 'POST', body: JSON.stringify({ token: token, undo: true }) }).then(function () { undo(n - 1); }).catch(function () {});
    })(remote);
  });
  $('clearBtn').addEventListener('click', function () {
    outbox = [];
    strokes = [];
    current = null;
    repaint();
    call('/draw/stroke', { method: 'POST', body: JSON.stringify({ token: token, clear: true }) }).catch(function () {});
  });

  if (token) startPolling();
  else show('stepName');
})();
