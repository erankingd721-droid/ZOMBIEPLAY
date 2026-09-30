/* =====================================================================
   אזור מודים ומנהל. העמוד ציבורי אבל לא עושה כלום בלי קוד: הבוט (KickGuard, אצל ערן במחשב)
   בודק את הקוד ומחזיר אישור זמני. ההגדרות ב-config.js תחת modArea.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = (window.SITE_CONFIG || {}).modArea || {};
  var API = String(CFG.url || '').replace(/\/+$/, '');
  var KEY = 'zp_mod_token';
  var POLL_MS = 5000;

  var $ = function (s) { return document.querySelector(s); };
  var loginBox = $('#loginBox');
  var panel = $('#panel');
  var token = '';
  var role = '';
  var timer = null;
  var lastData = null;

  try { token = sessionStorage.getItem(KEY) || ''; } catch (e) {}

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 3600) + ':' + String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  }
  function pill(el, text, kind) {
    el.textContent = text;
    el.className = 'mod-pill' + (kind ? ' ' + kind : '');
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'ngrok-skip-browser-warning': '1' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body, signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(t);
        return r.json().catch(function () { return {}; }).then(function (json) { return { status: r.status, json: json }; });
      }, function (e) { clearTimeout(t); throw e; });
  }

  // ─── התחברות ───────────────────────────────────────────────────────
  function showLogin(msg) {
    token = '';
    role = '';
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    clearInterval(timer);
    panel.hidden = true;
    loginBox.hidden = false;
    $('#loginMsg').textContent = msg || '';
  }

  function showPanel() {
    loginBox.hidden = true;
    panel.hidden = false;
    renderInfo();
    refresh();
    clearInterval(timer);
    timer = setInterval(function () { if (!document.hidden) refresh(); }, POLL_MS);
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('#loginMsg');
    var btn = e.target.querySelector('button');
    if (!API) { msg.textContent = 'האזור עוד לא מחובר לבוט (modArea.url חסר ב-config.js).'; return; }
    msg.textContent = '';
    btn.disabled = true;
    api('/login', { method: 'POST', body: JSON.stringify({ code: $('#code').value }) })
      .then(function (r) {
        if (r.status === 200 && r.json.token) {
          token = r.json.token;
          try { sessionStorage.setItem(KEY, token); } catch (err) {}
          $('#code').value = '';
          showPanel();
        } else {
          msg.textContent = r.json.error || 'הכניסה נכשלה.';
        }
      })
      .catch(function () { msg.textContent = 'לא מצליח להתחבר לבוט. אולי הוא כבוי כרגע.'; })
      .then(function () { btn.disabled = false; });
  });

  $('#logout').addEventListener('click', function () {
    api('/logout', { method: 'POST' }).catch(function () {}).then(function () { showLogin(''); });
  });

  // ─── נתונים ────────────────────────────────────────────────────────
  function refresh() {
    api('/status')
      .then(function (r) {
        if (r.status === 401) return showLogin('החיבור פג. הכנס את הקוד שוב.');
        if (r.status !== 200) throw new Error(r.status);
        lastData = r.json;
        $('#offline').hidden = true;
        render(r.json);
      })
      .catch(function () {
        $('#offline').hidden = false;
        pill($('#botPill'), 'הבוט לא זמין', 'bad');
      });
  }

  function render(d) {
    role = d.role;
    pill($('#rolePill'), role === 'admin' ? '👑 מנהל' : '🛡️ מוד', 'on');
    var g = d.guard || {};
    pill($('#botPill'), !g.enabled ? 'הבוט מושהה' : g.dryRun ? 'הבוט במצב בדיקה' : 'הבוט פעיל', !g.enabled ? 'bad' : g.dryRun ? 'warn' : 'on');
    $('#bans').textContent = (g.stats && g.stats.bans) || 0;
    $('#timeouts').textContent = (g.stats && g.stats.timeouts) || 0;
    $('#lock').textContent = g.lockdown ? 'פעילה (' + Math.ceil((g.lockdownLeftSec || 0) / 60) + ' דק׳)' : 'כבויה';

    var goals = d.goals || {};
    var live = goals.live || {};
    pill($('#liveKick'), live.kick ? 'Kick · בלייב' : 'Kick · אופליין', live.kick ? 'on' : '');
    pill($('#liveYt'), d.youtubeLive ? 'YouTube · בלייב' : 'YouTube · אופליין', d.youtubeLive ? 'on' : '');
    $('#liveLine').textContent = goals.active
      ? (goals.paused ? 'הפסקה קצרה. ' : 'בלייב כבר ' + clock(goals.elapsedSec) + ' שעות. ') + 'שיא צופים: ' + (goals.peakViewers || 0)
      : 'אין לייב כרגע.';
    $('#goals').innerHTML = (goals.goals || []).map(function (x) {
      var isHours = x.type === 'hours';
      var cur = x.done ? '✅' : isHours ? clock(x.value * 3600) + '/' + x.target + ':00' : Math.floor(x.value) + '/' + x.target;
      return '<div class="mod-goal"><div class="mod-goal__top"><span>' + esc(x.label) + '</span><b class="num">' + esc(cur) +
        '</b></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + x.pct + '"><i style="width:' + (x.done ? 100 : x.pct) + '%"></i></div></div>';
    }).join('');

    renderActions(d.actions || [], g.enabled);
    renderGame(d);
    renderCg(d);
    var rec = d.recent || [];
    $('#recent').innerHTML = rec.length
      ? rec.map(function (r) {
          return '<li><time>' + new Date(r.t).toLocaleTimeString('en-GB') + '</time><span class="t">' + esc(r.text) + '</span></li>';
        }).join('')
      : '<li class="muted">עוד לא קרה כלום.</li>';
  }

  // ─── פעולות ────────────────────────────────────────────────────────
  var LABELS = {
    lock: '🔒 נעילה נגד בוטים',
    unlock: '🔓 בטל נעילה',
    report: '📣 שלח עדכון יעדים לצ׳אט',
    end: '🏁 שלח סיכום סוף לייב',
    undo: '↩️ בטל באנים מהפשיטה האחרונה',
    off: '⏸️ השהה את הבוט',
    on: '▶️ הפעל את הבוט',
  };
  var CONFIRM = {
    undo: 'לבטל את כל הבאנים מהפשיטה האחרונה?',
    off: 'להשהות את ההגנה? הבוט יפסיק לחסום עד שתפעיל אותו שוב.',
    end: 'לשלוח עכשיו את סיכום סוף הלייב לצ׳אט?',
  };

  function renderActions(allowed, enabled) {
    var list = allowed.filter(function (a) { return a.indexOf('game-') === 0 || a.indexOf('cg-') === 0 ? false : a === 'off' ? enabled !== false : a === 'on' ? enabled === false : true; });
    var box = $('#actions');
    var sig = list.join(',');
    if (box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    box.innerHTML = list.map(function (a) {
      return '<button class="btn btn--ghost btn--sm" type="button" data-a="' + a + '">' + LABELS[a] + '</button>';
    }).join('');
  }

  function send(action, arg, msg) {
    if (CONFIRM[action] && !confirm(CONFIRM[action])) return;
    msg.style.color = 'var(--dim)';
    msg.textContent = 'שולח…';
    api('/action', { method: 'POST', body: JSON.stringify({ action: action, arg: arg || '' }) })
      .then(function (r) {
        if (r.status === 401) return showLogin('החיבור פג. הכנס את הקוד שוב.');
        msg.style.color = r.status === 200 ? 'var(--accent)' : 'var(--live)';
        msg.textContent = r.status === 200 ? 'בוצע ✔' : (r.json.error || 'הפעולה נכשלה.');
        refresh();
      })
      .catch(function () { msg.style.color = 'var(--live)'; msg.textContent = 'הבוט לא זמין.'; });
  }

  $('#actions').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]');
    if (b) send(b.dataset.a, '', $('#actionMsg'));
  });

  // ─── משחקי צ׳אט ─────────────────────────────────────────────────────
  var CG_TYPES = { hangman: '🪢 איש תלוי', riddle: '🧩 חידה', trivia: '🧠 טריוויה', scramble: '🔤 ערבוביה', math: '➗ חשבון', number: '🔢 ניחוש מספר' };
  var CG_LABELS = { 'cg-skip': '⏭️ דלג', 'cg-stop': '🛑 עצור', 'cg-auto-on': '🔁 הפעל אוטומטי', 'cg-auto-off': '⏹️ כבה אוטומטי', 'cg-reset': '🧹 אפס ניקוד', 'cg-off': '⏻ כבה את המשחקים', 'cg-on': '⏻ הפעל את המשחקים' };
  CONFIRM['cg-reset'] = 'לאפס את כל טבלאות הניקוד, גם של כל הזמנים?';

  function renderCg(d) {
    var c = d.chatGames || {};
    var acts = d.actions || [];
    $('#cgLine').textContent = c.off ? 'משחקי הצ׳אט כבויים (מתג). השכבה בשידור ריקה.' : c.enabled === false ? 'משחקי הצ׳אט כבויים ב-config.js.' : (c.running ? 'רץ עכשיו: ' + c.running : 'אין משחק רץ.') + (c.auto ? ' · מצב אוטומטי פועל' : '') + ' · ' + (c.players || 0) + ' שחקנים הערב';
    var start = acts.indexOf('cg-start') >= 0 && !c.off ? Object.keys(CG_TYPES) : [];
    var sbox = $('#cgStart');
    if (sbox.dataset.sig !== start.join(',')) {
      sbox.dataset.sig = start.join(',');
      sbox.innerHTML = start.map(function (t) { return '<button class="btn btn--ghost btn--sm" type="button" data-t="' + t + '">' + CG_TYPES[t] + '</button>'; }).join('');
    }
    var other = acts.filter(function (a) { if (!CG_LABELS[a]) return false;
      if (c.off) return a === 'cg-on';
      return a === 'cg-on' ? false : a === 'cg-auto-on' ? !c.auto : a === 'cg-auto-off' ? !!c.auto : true; });
    var abox = $('#cgActions');
    if (abox.dataset.sig !== other.join(',')) {
      abox.dataset.sig = other.join(',');
      abox.innerHTML = other.map(function (a) { return '<button class="btn btn--ghost btn--sm" type="button" data-a="' + a + '">' + CG_LABELS[a] + '</button>'; }).join('');
    }
  }
  $('#cgStart').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]');
    if (b) send('cg-start', b.dataset.t, $('#cgMsg'));
  });
  $('#cgActions').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]');
    if (b) send(b.dataset.a, '', $('#cgMsg'));
  });

  // ─── פארק הזומבים ──────────────────────────────────────────────────
  var GAME_LABELS = {
    'game-chaos': '⚡ כאוס בפארק',
    'game-clear': '🧽 נקה את הגרפיטי',
    'game-pause': '⏸️ הפסק את הפארק',
    'game-resume': '▶️ המשך את הפארק',
    'game-reset': '🧹 אפס את הפארק',
  };
  CONFIRM['game-reset'] = 'להוציא את כל הזומבים ולנקות את הפארק?';

  function renderGame(d) {
    var g = d.game || {};
    var names = (g.names || []).slice(0, 14).join(', ');
    $('#gameLine').textContent = !g.enabled ? 'הפארק כבוי ב-config.js.' : (g.players || 0) + ' זומבים בפארק' + (g.paused ? ' · בהפסקה' : '') + (names ? ': ' + names : '');
    var allowed = (d.actions || []).filter(function (a) { return GAME_LABELS[a] && (a === 'game-pause' ? !g.paused : a === 'game-resume' ? !!g.paused : true); });
    var box = $('#gameActions');
    var sig = allowed.join(',');
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.innerHTML = allowed.map(function (a) { return '<button class="btn btn--ghost btn--sm" type="button" data-a="' + a + '">' + GAME_LABELS[a] + '</button>'; }).join('');
    }
    $('#removeForm').hidden = (d.actions || []).indexOf('game-remove') < 0;
  }
  $('#gameActions').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]');
    if (b) send(b.dataset.a, '', $('#gameMsg'));
  });
  $('#removeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#removeName').value.trim();
    if (name) { send('game-remove', name, $('#gameMsg')); $('#removeName').value = ''; }
  });

  // ─── מידע למודים (מ-config.js) ─────────────────────────────────────
  function renderInfo() {
    var html = '';
    function block(title, items, asCode) {
      if (!items || !items.length) return;
      html += '<h3>' + esc(title) + '</h3><ul>' + items.map(function (x) {
        if (asCode && typeof x === 'object') return '<li><code>' + esc(x.cmd) + '</code> ' + esc(x.text) + '</li>';
        return '<li>' + esc(x) + '</li>';
      }).join('') + '</ul>';
    }
    block('חוקי הערוץ', CFG.rules);
    block('פקודות בצ׳אט', CFG.commands, true);
    block('טיפים', CFG.notes);
    $('#infoBody').innerHTML = html || '<p class="muted">עוד לא נוסף מידע. אפשר להוסיף ב-config.js תחת modArea.</p>';
  }

  if (token && API) showPanel();
})();
