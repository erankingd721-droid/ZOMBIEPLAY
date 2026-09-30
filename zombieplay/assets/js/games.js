/* משחקי צ'אט: מציג את המשחק הנוכחי (איש תלוי, חידה, טריוויה, ערבוביה, חשבון, ניחוש מספר) והטבלה.
   המצב מגיע מהבוט (/public/games). הכול נקבע בבוט, כאן רק מציירים.
   כתובת המצב: ?api=... בכתובת הדף, או SITE_CONFIG.chatGames.url באתר, או /public/games כשהדף מוגש מהבוט.
   ?overlay=1 = בלי כותרות ורקע, לשכבה ב-OBS.  ?board=0 = בלי טבלת הניקוד. */
(function () {
  'use strict';

  var qs = new URLSearchParams(location.search);
  var root = document.getElementById('cg');
  var API = qs.get('api') || ((window.SITE_CONFIG || {}).chatGames || {}).url || '/public/games';
  var LOCAL = API.charAt(0) === '/' || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(API);
  var POLL_MS = LOCAL ? 1000 : 4000; // the public address has request limits, so viewers poll slowly
  var SHOW_BOARD = qs.get('board') !== '0';
  if (qs.get('overlay') === '1') document.body.classList.add('overlay');

  var css = [
    '#cg{--acc:#3dff1f;--bad:#ff4d5e;--gold:#ffd21f;--line:rgba(255,255,255,.14);font-family:Rubik,"Segoe UI",Arial,sans-serif;color:#fff;direction:rtl}',
    '#cg *{box-sizing:border-box}',
    '#cg .wrap{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) 280px;align-items:start}',
    '#cg.noboard .wrap{grid-template-columns:minmax(0,1fr)}',
    '@media (max-width:760px){#cg .wrap{grid-template-columns:minmax(0,1fr)}}',
    '#cg .card{padding:22px 26px;border:1px solid var(--line);border-radius:22px;background:rgba(10,18,13,.88);backdrop-filter:blur(4px);box-shadow:0 10px 40px rgba(0,0,0,.45)}',
    '#cg .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}',
    '#cg .title{margin:0;font-size:26px;font-weight:900;color:var(--acc)}',
    '#cg .cat{color:#9fc79a;font-size:16px}',
    '#cg .bar{height:10px;margin-bottom:18px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}',
    '#cg .bar i{display:block;height:100%;background:var(--acc);transition:width .9s linear}',
    '#cg .bar.low i{background:var(--bad)}',
    '#cg .q{margin:0 0 14px;font-size:clamp(24px,3.2vw,40px);font-weight:800;line-height:1.3}',
    '#cg .tiles{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;direction:rtl;margin:10px 0}',
    '#cg .tile{min-width:54px;height:66px;padding:0 6px;display:grid;place-items:center;border-radius:12px;border-bottom:5px solid var(--acc);background:rgba(255,255,255,.08);font-size:38px;font-weight:900}',
    '#cg .tile.blank{color:transparent;border-bottom-color:rgba(255,255,255,.35)}',
    '#cg .tile.scr{border-bottom-color:var(--gold);transform:rotate(var(--r,0deg))}',
    '#cg .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}',
    '#cg .chip{padding:2px 12px;border-radius:99px;background:rgba(255,77,94,.25);border:1px solid var(--bad);font-size:20px;font-weight:700}',
    '#cg .hang{display:grid;gap:18px;grid-template-columns:170px minmax(0,1fr);align-items:center}',
    '#cg .hang svg{width:100%;height:auto;stroke:#fff;stroke-width:5;stroke-linecap:round;fill:none}',
    '#cg .hang svg .part{stroke:var(--bad)}',
    '#cg .opts{display:grid;gap:10px}',
    '#cg .opt{position:relative;display:flex;align-items:center;gap:14px;padding:12px 16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.06);font-size:clamp(18px,2.2vw,28px);font-weight:700;overflow:hidden}',
    '#cg .opt b{flex:none;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:var(--acc);color:#0b130d;font-size:22px}',
    '#cg .opt span{flex:1;position:relative}',
    '#cg .opt em{position:relative;font-style:normal;color:#b9d6b4;font-size:20px}',
    '#cg .opt .fill{position:absolute;inset:0 auto 0 0;background:rgba(61,255,31,.16);transition:width .6s}',
    '#cg .opt.right{border-color:var(--acc);background:rgba(61,255,31,.22)}',
    '#cg .opt.wrong{opacity:.45}',
    '#cg .math{font-size:clamp(56px,9vw,110px);font-weight:900;text-align:center;direction:ltr;letter-spacing:.04em}',
    '#cg .range{font-size:clamp(28px,4vw,52px);font-weight:900;text-align:center;margin:8px 0 14px}',
    '#cg .range b{color:var(--acc)}',
    '#cg .guesses{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
    '#cg .guess{padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.1);font-size:18px}',
    '#cg .result{margin-top:16px;padding:14px 18px;border-radius:14px;font-size:clamp(20px,2.4vw,30px);font-weight:800;text-align:center}',
    '#cg .result.won{background:rgba(61,255,31,.18);border:1px solid var(--acc)}',
    '#cg .result.bad{background:rgba(255,77,94,.16);border:1px solid var(--bad)}',
    '#cg .result small{display:block;margin-top:4px;font-size:.6em;font-weight:500;color:#cfe4cb}',
    '#cg .idle{padding:34px 20px;text-align:center}',
    '#cg .idle h2{margin:0 0 8px;font-size:30px}',
    '#cg .idle p{margin:0;color:#b9d6b4;font-size:18px}',
    '#cg .board{padding:18px 20px}',
    '#cg .board h2{margin:0 0 10px;font-size:20px;color:var(--gold)}',
    '#cg .board ol{margin:0;padding:0;list-style:none}',
    '#cg .board li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:18px}',
    '#cg .board li:last-child{border-bottom:0}',
    '#cg .board li b{color:var(--acc)}',
    '#cg .board .none{color:#9fb39a;font-size:15px}',
    '#cg .off{position:fixed;inset-inline:0;bottom:12px;text-align:center;color:#ff9b9b;font-size:14px}',
    '#cg .sum h2{margin:0 0 12px;font-size:30px;font-weight:900;color:var(--gold)}',
    '#cg .sum table{width:100%;border-collapse:collapse;font-size:clamp(18px,2.2vw,28px)}',
    '#cg .sum td{padding:8px 10px;border-bottom:1px solid var(--line)}',
    '#cg .sum tr:first-child td{font-weight:900;color:var(--gold)}',
    '#cg .sum td.pts{text-align:left;font-weight:900;color:var(--acc);white-space:nowrap}',
    '#cg .sum td.ans{text-align:left;color:#b9d6b4;font-size:.75em;white-space:nowrap}',
    '#cg .sum .ask{margin-top:16px;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,.08);font-size:clamp(16px,1.8vw,22px);text-align:center}',
    '#cg .sum .ask b{color:var(--acc)}',
    '#cg .left{font-size:18px;font-weight:700;color:#cfe4cb;direction:ltr;unicode-bidi:embed}',
    'body.overlay{background:transparent!important;overflow:hidden}',
    'body.overlay #cg{padding:24px}',
    'body.overlay #cg .wrap{grid-template-columns:minmax(0,900px) 300px;justify-content:center}',
    'body.overlay #cg.noboard .wrap{grid-template-columns:minmax(0,900px)}',
    'body.overlay .nochrome{display:none!important}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var state = null;
  var skew = 0;
  var online = false;
  var lastOk = 0;

  function poll() {
    var headers = { Accept: 'application/json' };
    if (!LOCAL) headers['ngrok-skip-browser-warning'] = '1';
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(API, { headers: headers, signal: ctrl.signal })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (s) { state = s; skew = (s.now || Date.now()) - Date.now(); online = true; lastOk = Date.now(); render(); })
      .catch(function () { online = false; render(); })
      .then(function () { clearTimeout(t); });
  }

  // ─── the parts of each game ────────────────────────────────────────
  var HANG_PARTS = [
    '<circle class="part" cx="105" cy="52" r="15"/>',
    '<path class="part" d="M105 67v46"/>',
    '<path class="part" d="M105 78l-22 20"/>',
    '<path class="part" d="M105 78l22 20"/>',
    '<path class="part" d="M105 113l-20 30"/>',
    '<path class="part" d="M105 113l20 30"/>'
  ];

  function tiles(letters, cls) {
    return '<div class="tiles">' + letters.map(function (c, i) {
      var blank = c === '_';
      return '<div class="tile ' + (blank ? 'blank' : '') + (cls ? ' ' + cls : '') + '"' + (cls === 'scr' ? ' style="--r:' + ((i * 7) % 9 - 4) + 'deg"' : '') + '>' + (blank ? '&nbsp;' : esc(c)) + '</div>';
    }).join('') + '</div>';
  }

  function body(r) {
    if (r.type === 'hangman') {
      var bad = r.maxLives - r.lives;
      var svg = '<svg viewBox="0 0 160 180"><path d="M20 170h110M50 170V15h55v22"/>' + HANG_PARTS.slice(0, bad).join('') + '</svg>';
      var wrong = r.wrong.length ? '<div class="chips"><span class="cat">אותיות שגויות:</span>' + r.wrong.map(function (l) { return '<span class="chip">' + esc(l) + '</span>'; }).join('') + '</div>' : '';
      return '<div class="hang">' + svg + '<div>' + tiles(r.mask) + '<div class="cat" style="text-align:center">כותבים אות בצ׳אט, או את המילה כולה · נשארו ' + r.lives + ' חיים</div>' + wrong + '</div></div>';
    }
    if (r.type === 'riddle') {
      return '<p class="q">' + esc(r.q) + '</p>' + (r.hint ? '<div class="cat">רמז: ' + r.len + ' אותיות</div>' + tiles(r.hintMask) : '<div class="cat">' + r.len + ' אותיות · ענו בצ׳אט</div>');
    }
    if (r.type === 'trivia') {
      var total = r.votes.reduce(function (a, b) { return a + b; }, 0) || 1;
      return '<p class="q">' + esc(r.q) + '</p><div class="opts">' + r.options.map(function (o, i) {
        var cls = r.correct == null ? '' : i === r.correct ? ' right' : ' wrong';
        return '<div class="opt' + cls + '"><i class="fill" style="width:' + Math.round((r.votes[i] / total) * 100) + '%"></i><b>' + (i + 1) + '</b><span>' + esc(o) + '</span><em>' + r.votes[i] + '</em></div>';
      }).join('') + '</div><div class="cat" style="margin-top:10px">כותבים בצ׳אט את המספר של התשובה (1-4)</div>';
    }
    if (r.type === 'scramble') return '<div class="cat" style="text-align:center">סדרו את האותיות · ' + esc(r.cat) + '</div>' + tiles(r.letters, 'scr');
    if (r.type === 'math') return '<div class="math">' + esc(r.q) + ' = ?</div><div class="cat" style="text-align:center">הראשון שכותב את התשובה מנצח</div>';
    return '<div class="range">המספר בין <b>' + r.low + '</b> ל-<b>' + r.high + '</b></div><div class="guesses">' +
      r.guesses.map(function (g) { return '<span class="guess">' + esc(g.n) + ': ' + g.g + ' ' + g.d + '</span>'; }).join('') + '</div>';
  }

  function result(r) {
    if (r.status === 'running') return '';
    if (r.status === 'won') {
      var extra = r.type === 'trivia' && r.correctCount ? r.correctCount + ' ענו נכון' : 'התשובה: ' + r.answer;
      return '<div class="result won">🏆 ' + esc(r.winner || '') + ' ' + (r.type === 'trivia' ? 'ענה נכון ראשון' : 'פתר') + ' · +' + r.points + '<small>' + esc(extra) + '</small></div>';
    }
    var text = r.status === 'lost' ? '💀 נגמרו החיים' : r.status === 'timeout' ? '⏰ נגמר הזמן' : r.status === 'skipped' ? '⏭️ דילגנו' : '🛑 המשחק נעצר';
    return '<div class="result bad">' + text + '<small>התשובה: ' + esc(r.answer) + '</small></div>';
  }

  function timerPct(r) {
    var now = Date.now() + skew;
    return Math.max(0, Math.min(100, ((r.endsAt - now) / (r.endsAt - r.startedAt)) * 100));
  }

  function board(s) {
    var rows = (s.board || []).length ? s.board : [];
    return '<aside class="card board"><h2>🏆 הטבלה של הערב</h2>' +
      (rows.length ? '<ol>' + rows.slice(0, 6).map(function (e, i) { return '<li><span>' + (i + 1) + '. ' + esc(e.n) + '</span><b>' + e.p + (e.a ? ' <small style="color:#9fc79a;font-weight:500">· ' + e.a + '✓</small>' : '') + '</b></li>'; }).join('') + '</ol>' : '<div class="none">עוד אין ניקוד. הראשון שעונה נכון מקבל נקודות!</div>') +
      ((s.allTime || []).length ? '<h2 style="margin-top:16px;font-size:16px">כל הזמנים</h2><ol>' + s.allTime.slice(0, 3).map(function (e, i) { return '<li><span>' + (i + 1) + '. ' + esc(e.n) + '</span><b>' + e.p + '</b></li>'; }).join('') + '</ol>' : '') +
      '</aside>';
  }

  function summaryCard(s) {
    var b = s.brk;
    var rows = (b.top || []).map(function (e, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(e.n) + '</td><td class="pts">' + e.p + ' נק׳</td><td class="ans">' + e.a + ' תשובות נכונות</td></tr>';
    }).join('');
    return '<div class="card sum"><h2>📊 סיכום ' + (b.games || '') + ' משחקים</h2>' +
      (rows ? '<table>' + rows + '</table>' : '<div class="cat">אף אחד עוד לא צבר נקודות.</div>') +
      '<div class="ask">' + (b.continueAt ? 'ממשיכים בעוד <b id="cont"></b>' : 'המודים מחליטים: <b>להמשיך</b> או <b>לעצור</b>') + '</div></div>';
  }

  function fmt(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  var lastHtml = '';
  function render() {
    if (!state) { root.innerHTML = ''; return; }
    if (!state.enabled && document.body.classList.contains('overlay')) { root.innerHTML = ''; lastHtml = ''; return; } // off: nothing on the stream
    var r = state.round;
    var main;
    if (!state.enabled) main = '<div class="card idle"><h2>משחקי הצ׳אט כבויים</h2></div>';
    else if (state.brk) main = summaryCard(state);
    else if (!r) main = '<div class="card idle"><h2>🎲 משחקי צ׳אט</h2><p>איש תלוי, חידות, טריוויה ועוד. המשחק הבא מתחיל בקרוב, תהיו בצ׳אט!' + (state.auto ? '' : ' (המודים מפעילים)') + '</p></div>';
    else {
      main = '<div class="card"><div class="head"><h2 class="title">🎲 ' + esc(r.title) + '</h2><span class="cat">' + (r.cat ? esc(r.cat) + ' · ' : '') + (state.series && state.series.games > 0 ? 'משחק ' + Math.min(state.series.games, state.series.done + (r.status === 'running' ? 1 : 0)) + ' מתוך ' + state.series.games + ' · ' : '') + '<span class="left" id="left"></span></span></div>' +
        (r.status === 'running' ? '<div class="bar" id="bar"><i style="width:' + timerPct(r) + '%"></i></div>' : '') + body(r) + result(r) + '</div>';
    }
    var html = '<div class="wrap">' + main + (SHOW_BOARD ? board(state) : '') + '</div>' +
      (!online && Date.now() - lastOk > 15000 ? '<div class="off nochrome">משחקי הצ׳אט לא זמינים כרגע. הם עולים כשערן בלייב והבוט רץ.</div>' : '');
    root.className = SHOW_BOARD ? '' : 'noboard';
    if (html !== lastHtml) { root.innerHTML = html; lastHtml = html; }
  }

  // the timer bar keeps moving between polls
  setInterval(function () {
    if (!state) return;
    var now = Date.now() + skew;
    var left = document.getElementById('left');
    if (left && state.round) left.textContent = state.round.status === 'running' ? '⏱ ' + fmt(state.round.endsAt - now) : '';
    var cont = document.getElementById('cont');
    if (cont && state.brk && state.brk.continueAt) cont.textContent = fmt(state.brk.continueAt - now);
    var bar = document.getElementById('bar');
    if (!bar || !state || !state.round) return;
    var pct = timerPct(state.round);
    bar.firstChild.style.width = pct + '%';
    bar.classList.toggle('low', pct < 25);
  }, 500);

  poll();
  setInterval(function () { if (!document.hidden || LOCAL) poll(); }, POLL_MS);

  window.__games = { get state() { return state; }, render: render };
})();
