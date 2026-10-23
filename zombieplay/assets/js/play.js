/* =====================================================================
   משחקי צופים בעמוד הראשי: מראה אם משחק צ'אט רץ עכשיו, כמה זומבים בפארק,
   ואת המובילים בכל הזמנים. המצב מגיע מהבוט (KickGuard) דרך הכתובות ב-config.js
   (chatGames.url, game.url). כשהבוט כבוי הכרטיסים פשוט נשארים כמו שהם.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var CHAT_URL = (CFG.chatGames && CFG.chatGames.url) || '';
  var PARK_URL = (CFG.game && CFG.game.url) || '';
  var POLL_MS = 30000;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function getJSON(url) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(url, { signal: ctrl.signal, headers: { 'ngrok-skip-browser-warning': '1', Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }

  function setStatus(el, text, isOn) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-on', !!isOn);
  }

  function showChat(s) {
    var status = $('#playChatStatus');
    var board = $('#playBoard');
    if (!s) {
      setStatus(status, 'בלייבים', false);
      if (board) board.hidden = true;
      return;
    }
    var round = s.round && s.round.status === 'running' ? s.round : null;
    if (round) setStatus(status, 'משחק עכשיו: ' + (round.title || 'משחק'), true);
    else setStatus(status, s.enabled === false ? 'כבוי כרגע' : 'מחכה למשחק הבא', false);

    var top = (s.allTime || []).filter(function (e) { return e && e.n; }).slice(0, 3);
    if (board) {
      board.innerHTML = top.map(function (e, i) {
        return '<li><span class="play-board__rank">' + (i + 1) + '</span><bdi>' + esc(e.n) + '</bdi><b>' + Number(e.p || 0).toLocaleString('he-IL') + '</b></li>';
      }).join('');
      board.hidden = !top.length;
    }
  }

  function showPark(s) {
    var status = $('#playParkStatus');
    if (!s || s.enabled === false) return setStatus(status, 'בלייבים', false);
    if (s.paused) return setStatus(status, 'בהפסקה', false);
    var n = (s.players || []).length;
    setStatus(status, n ? n + ' זומבים בפארק' : 'הפארק פתוח', n > 0);
  }

  function load() {
    if (document.hidden) return;
    if (CHAT_URL) getJSON(CHAT_URL).then(showChat, function () { showChat(null); });
    if (PARK_URL) getJSON(PARK_URL).then(showPark, function () { showPark(null); });
  }

  if (!CHAT_URL && !PARK_URL) return;
  load();
  setInterval(load, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
