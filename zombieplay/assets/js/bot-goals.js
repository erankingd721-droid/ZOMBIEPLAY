/* =====================================================================
   יעדי הלייב מהבוט (KickGuard) בכרטיס "מטרות קהילה".
   מופעל רק אם ב-config.js מוגדר botGoals.url. כשהבוט כבוי או שאין לייב, הבלוק מוסתר.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = (window.SITE_CONFIG || {}).botGoals || {};
  if (!CFG.url) return;

  var POLL_MS = Math.max(15, Number(CFG.everySeconds) || 30) * 1000;
  var ICON = { hours: 'clock', followers: 'kick', subs: 'star', ytSubs: 'youtube', ytLikes: 'heart', viewers: 'eye' };
  var ICON_CLASS = { followers: 'kick', subs: 'star', ytSubs: 'youtube', ytLikes: 'youtube' };
  var UNIT = { followers: 'פולואים', subs: 'סאבים', ytSubs: 'מנויים', ytLikes: 'לייקים', viewers: 'צופים' };

  var card = document.getElementById('cardGoals');
  var anchor = document.getElementById('goalsList');
  if (!card || !anchor) return;

  var style = document.createElement('style');
  style.textContent =
    '.botgoals{margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid var(--line)}' +
    '.botgoals__head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;font-size:13px;color:var(--dim)}' +
    '.botgoals__live{display:inline-flex;align-items:center;gap:6px;font-weight:800;color:#ff3b4f}' +
    '.botgoals__live::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;animation:botpulse 1.4s infinite}' +
    '.botgoals__time b{color:var(--text)}' +
    '@keyframes botpulse{50%{opacity:.25}}' +
    '@media (prefers-reduced-motion:reduce){.botgoals__live::before{animation:none}}';
  document.head.appendChild(style);

  var box = document.createElement('div');
  box.className = 'botgoals';
  box.hidden = true;
  box.innerHTML =
    '<div class="botgoals__head"><span class="botgoals__live" id="botGoalsState">יעדי הלייב</span>' +
    '<span class="botgoals__time">בלייב כבר <b class="num" id="botGoalsTime">0:00</b></span></div>' +
    '<ul class="goals" id="botGoalsList"></ul>';
  card.insertBefore(box, anchor);

  var list = box.querySelector('#botGoalsList');
  var stateEl = box.querySelector('#botGoalsState');
  var timeEl = box.querySelector('#botGoalsTime');
  var data = null;
  var fetchedAt = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    return h + ':' + String(m).padStart(2, '0');
  }
  function num(n) {
    return Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
  }

  function row(g) {
    var isHours = g.type === 'hours';
    var pct = g.done ? 100 : Math.max(0, Math.min(100, Number(g.pct) || 0));
    var cur = isHours ? clock(g.value * 3600) : num(Math.floor(g.value));
    var target = isHours ? g.target + ':00' : num(g.target);
    var note = g.done
      ? '✅ היעד הושלם!'
      : isHours
        ? 'עוד ' + clock(Math.max(0, g.target - g.value) * 3600) + ' שעות ומגיעים ל-' + g.target
        : 'עוד ' + num(Math.max(0, g.target - Math.floor(g.value))) + ' ' + (UNIT[g.type] || '') + ' ומגיעים ל-' + num(g.target);
    return (
      '<li class="goal"><div class="goal__top">' +
      '<span class="goal__icon goal__icon--' + (ICON_CLASS[g.type] || 'star') + '"><svg class="icon"><use href="#i-' + (ICON[g.type] || 'target') + '"/></svg></span>' +
      '<div class="goal__main"><span class="goal__label">' + esc(g.label) + '</span><b class="goal__num num">' + esc(cur) + '</b></div>' +
      '<span class="goal__target">היעד<br><b class="num">' + esc(target) + '</b></span></div>' +
      '<div class="progress" role="progressbar" aria-label="' + esc(g.label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<p class="goal__note">' + esc(note) + '</p></li>'
    );
  }

  function render() {
    var show = data && data.active && Array.isArray(data.goals) && data.goals.length;
    box.hidden = !show;
    if (!show) return;
    card.hidden = false; // the site hides this card when it has no goals of its own
    stateEl.textContent = data.paused ? 'הפסקה קצרה' : 'בלייב עכשיו';
    list.innerHTML = data.goals.map(row).join('');
    tick();
  }

  function tick() {
    if (!data || !data.active) return;
    var extra = data.paused ? 0 : (Date.now() - fetchedAt) / 1000;
    timeEl.textContent = clock((Number(data.elapsedSec) || 0) + extra);
  }

  function load() {
    if (document.hidden) return;
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    fetch(CFG.url, { signal: ctrl.signal, headers: { 'ngrok-skip-browser-warning': '1', Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (json) {
        data = json && typeof json === 'object' ? json : null;
        fetchedAt = Date.now();
        render();
      })
      .catch(function () { data = null; render(); }) // bot offline: just hide the block
      .then(function () { clearTimeout(t); });
  }

  load();
  setInterval(load, POLL_MS);
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
