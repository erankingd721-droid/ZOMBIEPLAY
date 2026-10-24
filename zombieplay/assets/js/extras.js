/* =====================================================================
   תוספות לעמוד הראשי (מעל app.js):
   חיפוש סרטונים ו"תפתיע אותי", המספרים וציר הזמן של הערוץ, דיסקורד חי,
   הסקין בתלת-ממד, שלט האופליין, ספירה לאחור ללייב הבא (אם יש לוח שידורים)
   וביצת הפתעה. הכול מהנתונים האמיתיים: data/youtube.js, יוטיוב, Kick ודיסקורד.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var YT = window.YT_DATA || { channel: {}, items: [] };
  var YTC = CFG.youtube || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var fmt = function (n) { return Number(n || 0).toLocaleString('he-IL'); };
  var DAY = 86400000;

  function timeAgo(d) {
    if (!d) return '';
    var days = Math.floor((Date.now() - d.getTime()) / DAY);
    if (days < 1) return 'היום';
    if (days === 1) return 'אתמול';
    if (days < 30) return 'לפני ' + days + ' ימים';
    var months = Math.round(days / 30.4);
    if (months < 12) return months === 1 ? 'לפני חודש' : 'לפני ' + months + ' חודשים';
    var years = Math.round(days / 365);
    return years === 1 ? 'לפני שנה' : 'לפני ' + years + ' שנים';
  }
  var dateHe = function (d) { return d ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }) : ''; };

  function getJSON(url, headers) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(url, { signal: ctrl.signal, headers: headers || { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }

  // ─── הסרטונים מהנתונים ─────────────────────────────────────────────
  var TYPE_HE = { video: 'סרטון', short: 'שורט', live: 'לייב' };
  var items = (YT.items || [])
    .filter(function (r) { return !(r[1] === 'live' && r[4] < 180); }) // לייבים שנפלו בהתחלה
    .map(function (r) {
      return { id: r[0], type: r[1], title: r[2], views: r[3], dur: r[4], date: r[5] ? new Date(r[5]) : null };
    })
    .sort(function (a, b) { return (b.date || 0) - (a.date || 0); });

  var watchUrl = function (v) { return v.type === 'short' ? 'https://www.youtube.com/shorts/' + v.id : 'https://www.youtube.com/watch?v=' + v.id; };
  var thumb = function (v) { return 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg'; };

  // app.js פותח נגן בתוך האתר לכל קישור עם data-yt
  function openVideo(v) {
    var a = document.createElement('a');
    a.href = watchUrl(v);
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.yt = v.id;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ─── חיפוש ו"תפתיע אותי" ───────────────────────────────────────────
  function setupSearch() {
    var input = $('#vSearch');
    var list = $('#vSearchList');
    if (!input || !list) return;
    var norm = function (s) { return String(s).toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' '); };
    var t;

    function show() {
      var words = norm(input.value).split(/\s+/).filter(Boolean);
      if (!words.length) { list.hidden = true; list.innerHTML = ''; return; }
      var found = items.filter(function (v) {
        var title = norm(v.title);
        return words.every(function (w) { return title.indexOf(w) !== -1; });
      }).slice(0, 6);
      list.innerHTML = found.length
        ? found.map(function (v) {
            return '<li><a class="vsearch__item" href="' + esc(watchUrl(v)) + '" target="_blank" rel="noopener" data-yt="' + esc(v.id) + '">' +
              '<img src="' + esc(thumb(v)) + '" alt="" loading="lazy">' +
              '<span><b>' + esc(v.title) + '</b><small>' + [TYPE_HE[v.type], v.views != null ? fmt(v.views) + ' צפיות' : '', timeAgo(v.date)].filter(Boolean).join(' · ') + '</small></span></a></li>';
          }).join('')
        : '<li class="vsearch__empty">לא מצאתי סרטון כזה. נסו מילה אחרת.</li>';
      list.hidden = false;
    }

    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 120); });
    input.addEventListener('focus', show);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; show(); }
      if (e.key === 'Enter') { var first = $('.vsearch__item', list); if (first) { e.preventDefault(); first.click(); } }
    });
    list.addEventListener('click', function () { setTimeout(function () { list.hidden = true; }, 0); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.vsearch')) list.hidden = true; });

    var rnd = $('#vRandom');
    if (rnd) rnd.addEventListener('click', function () {
      if (!items.length) return;
      openVideo(items[Math.floor(Math.random() * items.length)]);
    });
  }

  // ─── המספרים ────────────────────────────────────────────────────────
  var numbers = {
    subs: { label: 'מנויים ביוטיוב', value: YT.channel && YT.channel.subscribers },
    views: { label: 'צפיות בערוץ', value: YT.channel && YT.channel.views },
    videos: { label: 'סרטונים ביוטיוב', value: YT.channel && YT.channel.videos },
    kick: { label: 'עוקבים ב-Kick', value: null },
    discord: { label: 'חברים בדיסקורד', value: null, note: '' },
    hours: { label: 'שעות לייב', value: null, plus: true },
    days: { label: 'ימים מאז שהערוץ נפתח', value: null },
  };
  (function () {
    var lives = items.filter(function (v) { return v.type === 'live'; });
    var secs = lives.reduce(function (s, v) { return s + (v.dur || 0); }, 0);
    if (secs) numbers.hours.value = Math.floor(secs / 3600);
    if (YT.channel && YT.channel.joined) numbers.days.value = Math.floor((Date.now() - new Date(YT.channel.joined)) / DAY);
  })();

  function countUp(el, to) {
    if (reduceMotion || !('IntersectionObserver' in window)) { el.textContent = fmt(to); return; }
    el.textContent = fmt(to);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      var step = function (now) {
        var p = Math.min(1, (now - t0) / 1100);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
  }

  function renderNumbers() {
    var box = $('#numbers');
    if (!box) return;
    var order = ['subs', 'views', 'videos', 'kick', 'discord', 'hours', 'days'];
    box.innerHTML = order.filter(function (k) { return numbers[k].value != null; }).map(function (k) {
      var n = numbers[k];
      return '<li class="numbers__item"><b class="numbers__num" data-to="' + n.value + '">' + fmt(n.value) + (n.plus ? '+' : '') + '</b>' +
        '<span class="numbers__label">' + esc(n.label) + '</span>' + (n.note ? '<span class="numbers__note">' + esc(n.note) + '</span>' : '') + '</li>';
    }).join('');
    $$('.numbers__num', box).forEach(function (el) {
      var to = Number(el.dataset.to);
      if (el.textContent.slice(-1) === '+') return; // "לפחות": בלי אנימציה
      countUp(el, to);
    });
  }

  function loadLiveNumbers() {
    var jobs = [];
    if (YTC.apiKey && YTC.channelId) {
      jobs.push(getJSON('https://www.googleapis.com/youtube/v3/channels?part=statistics&id=' + encodeURIComponent(YTC.channelId) + '&key=' + encodeURIComponent(YTC.apiKey))
        .then(function (j) {
          var st = j.items && j.items[0] && j.items[0].statistics;
          if (!st) return;
          if (!st.hiddenSubscriberCount) numbers.subs.value = Number(st.subscriberCount);
          numbers.views.value = Number(st.viewCount);
          numbers.videos.value = Number(st.videoCount);
        }).catch(function () {}));
    }
    if (CFG.kick) {
      jobs.push(getJSON('https://kick.com/api/v2/channels/' + encodeURIComponent(CFG.kick))
        .then(function (j) { if (j && j.followers_count != null) numbers.kick.value = Number(j.followers_count); })
        .catch(function () {}));
    }
    jobs.push(loadDiscord());
    Promise.all(jobs).then(function () { renderNumbers(); renderTimeline(); });
  }

  // ─── דיסקורד חי ─────────────────────────────────────────────────────
  var discordText = '';
  function loadDiscord() {
    var url = String((CFG.links && CFG.links.discord) || '');
    var m = url.match(/discord(?:\.gg|(?:app)?\.com\/invite)\/([\w-]+)/i);
    if (!m) return Promise.resolve();
    return getJSON('https://discord.com/api/v10/invites/' + m[1] + '?with_counts=true')
      .then(function (j) {
        if (!j || j.approximate_member_count == null) return;
        numbers.discord.value = j.approximate_member_count;
        if (j.approximate_presence_count) numbers.discord.note = fmt(j.approximate_presence_count) + ' מחוברים עכשיו';
        discordText = fmt(j.approximate_member_count) + ' חברים' + (j.approximate_presence_count ? ', ' + fmt(j.approximate_presence_count) + ' מחוברים עכשיו' : '');
        markDiscord();
      })
      .catch(function () {});
  }
  function markDiscord() {
    if (!discordText) return;
    $$('#linkGrid a.link-row[href*="discord"]').forEach(function (a) {
      var desc = $('.link-row__desc', a);
      if (!desc || $('.link-row__live', desc)) return;
      desc.insertAdjacentHTML('beforeend', ' <span class="link-row__live"><i></i>' + esc(discordText) + '</span>');
    });
  }

  // ─── ציר הזמן ───────────────────────────────────────────────────────
  function renderTimeline() {
    var box = $('#timeline');
    if (!box) return;
    var oldest = function (type) {
      return items.filter(function (v) { return v.type === type && v.date; }).sort(function (a, b) { return a.date - b.date; })[0];
    };
    var top = items.filter(function (v) { return v.views != null; }).sort(function (a, b) { return b.views - a.views; })[0];
    var latest = items[0];
    var steps = [];
    if (YT.channel && YT.channel.joined) steps.push({ date: new Date(YT.channel.joined), title: 'הערוץ נפתח', text: 'ZombiePlay נולד. הזומבי עוד לא ידע מה מחכה לו.' });
    var fv = oldest('video');
    if (fv) steps.push({ date: fv.date, title: 'הסרטון הראשון', text: fv.title, v: fv });
    var fs = oldest('short');
    if (fs) steps.push({ date: fs.date, title: 'השורט הראשון', text: fs.title, v: fs });
    if (top) steps.push({ date: top.date, title: 'השיא: ' + fmt(top.views) + ' צפיות', text: top.title, v: top });
    if (latest && latest !== top) steps.push({ date: latest.date, title: 'הכי חדש בערוץ', text: latest.title, v: latest });
    steps.sort(function (a, b) { return a.date - b.date; });
    steps.push({ date: null, title: 'עכשיו: ' + fmt(numbers.subs.value) + ' מנויים', text: 'והזומבי רק מתחיל. הפרק הבא כבר בדרך.', now: true });

    box.innerHTML = steps.map(function (s) {
      var body = '<span class="timeline__date">' + (s.date ? esc(dateHe(s.date)) : 'היום') + '</span><b class="timeline__title">' + esc(s.title) + '</b><span class="timeline__text">' + esc(s.text) + '</span>';
      return '<li class="timeline__item' + (s.now ? ' is-now' : '') + '">' +
        (s.v ? '<a href="' + esc(watchUrl(s.v)) + '" target="_blank" rel="noopener" data-yt="' + esc(s.v.id) + '">' + body + '</a>' : '<div>' + body + '</div>') + '</li>';
    }).join('');
  }

  // ─── שלט האופליין ───────────────────────────────────────────────────
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function nextScheduled() {
    var best = null;
    (CFG.schedule || []).forEach(function (s) {
      var day = DAYS.findIndex(function (d) { return String(s && s.day || '').indexOf(d) !== -1; });
      var m = String(s && s.time || '').match(/(\d{1,2}):(\d{2})/);
      if (day < 0 || !m) return;
      var now = new Date();
      var at = new Date(now);
      at.setHours(+m[1], +m[2], 0, 0);
      at.setDate(at.getDate() + ((day - now.getDay() + 7) % 7));
      if (at <= now) at.setDate(at.getDate() + 7);
      if (!best || at < best.at) best = { at: at, title: s.title || '' };
    });
    return best;
  }
  function countdown(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400);
    var hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
    var mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    var ss = String(s % 60).padStart(2, '0');
    return (d ? d + ' ימים · ' : '') + hh + ':' + mm + ':' + ss;
  }

  function setupSign() {
    var line = $('#offlineSince');
    var lastLive = items.find(function (v) { return v.type === 'live' && v.date; });
    var sched = nextScheduled();
    var card = $('#cardSchedule');
    var cd = null;
    if (sched && card) {
      cd = document.createElement('p');
      cd.className = 'schedule__countdown';
      card.appendChild(cd);
    }
    var tick = function () {
      var next = nextScheduled();
      if (cd && next) cd.innerHTML = 'הלייב הבא בעוד <b class="num">' + countdown(next.at - Date.now()) + '</b>';
      if (!line) return;
      if (next) line.textContent = 'הלייב הבא: ' + DAYS[next.at.getDay()] + ' ' + String(next.at.getHours()).padStart(2, '0') + ':' + String(next.at.getMinutes()).padStart(2, '0');
      else if (lastLive) line.textContent = 'הלייב האחרון: ' + timeAgo(lastLive.date);
    };
    tick();
    if (sched) setInterval(tick, 1000);
  }

  // ─── הסקין בתלת-ממד ─────────────────────────────────────────────────
  function setupSkin() {
    var canvas = $('#skinCanvas');
    var stage = $('.skin__stage');
    if (!canvas || !stage || !('IntersectionObserver' in window)) return;
    var name = 'ZombiePlay55';
    var viewer = null;
    var started = false;
    var wanted = reduceMotion ? 'idle' : 'walk';
    function applyAnim() {
      var sv = window.skinview3d;
      if (!viewer || !sv) return;
      var A = { walk: sv.WalkingAnimation, run: sv.RunningAnimation, wave: sv.WaveAnimation, idle: sv.IdleAnimation }[wanted];
      if (A) viewer.animation = new A();
    }
    $$('#skinAnims button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.anim === wanted));
      b.addEventListener('click', function () {
        wanted = b.dataset.anim;
        $$('#skinAnims button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        applyAnim();
      });
    });

    var copyBtn = $('#skinName');
    var hint = $('#skinHint');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var done = function () { if (hint) hint.textContent = 'הועתק! מוסיפים את ZombiePlay55 כחבר ונפגשים בשרת.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(name).then(done, function () {});
    });

    function size() {
      var w = Math.min(stage.clientWidth || 360, 420);
      return { w: w, h: Math.round(w * 1.25) };
    }

    function start() {
      started = true;
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/skinview3d@3.4.2/bundles/skinview3d.bundle.js';
      s.onload = function () {
        var sv = window.skinview3d;
        if (!sv) return;
        var d = size();
        viewer = new sv.SkinViewer({ canvas: canvas, width: d.w, height: d.h });
        viewer.zoom = 0.7;
        viewer.fov = 60;
        viewer.autoRotate = !reduceMotion;
        viewer.autoRotateSpeed = 0.6;
        viewer.controls.enableZoom = false;
        applyAnim();
        // הסקין העדכני לפי השם במיינקראפט, ואם לא נטען: העותק שבאתר
        viewer.loadSkin('https://mc-heads.net/skin/' + name).catch(function () { return viewer.loadSkin('assets/img/skin.png'); });
        stage.classList.add('is-ready');

        addEventListener('resize', function () { var n = size(); viewer.setSize(n.w, n.h); });
      };
      document.head.appendChild(s);
    }

    new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting;
      if (on && !started) start();
      if (viewer) viewer.renderPaused = !on; // לא מצייר כשלא רואים אותו
    }, { rootMargin: '300px' }).observe(stage);
  }

  // ─── ביצת הפתעה: 5 לחיצות על הזומבי, או ↑↑↓↓←→←→BA ─────────────────
  function rain() {
    toast('🧟 מצאתם את הזומבי הסודי! עכשיו תגידו בצ׳אט: "הזומבי ער"');
    if (reduceMotion) return;
    var files = (CFG.stickers || []).map(function (s) { return 'assets/img/stickers/' + s.file; });
    if (!files.length) return;
    var layer = document.createElement('div');
    layer.className = 'zp-rain';
    layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 28; i++) {
      var img = document.createElement('img');
      img.src = files[i % files.length];
      img.alt = '';
      img.style.left = Math.random() * 96 + '%';
      img.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
      img.style.animationDuration = (2.4 + Math.random() * 1.8).toFixed(2) + 's';
      img.style.setProperty('--spin', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      img.style.width = (56 + Math.random() * 56).toFixed(0) + 'px';
      layer.appendChild(img);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 5200);
  }

  function toast(text) {
    var old = $('.zp-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'zp-toast';
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('is-out'); }, 3600);
    setTimeout(function () { el.remove(); }, 4200);
  }

  function setupEgg() {
    var clicks = [];
    $$('#heroSticker, #aboutImg, .mc-sign').forEach(function (el) {
      el.addEventListener('click', function () {
        var now = Date.now();
        clicks = clicks.filter(function (t) { return now - t < 2500; }).concat(now);
        if (clicks.length >= 5) { clicks = []; rain(); }
      });
    });
    var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;
    addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === code[pos] ? pos + 1 : k === code[0] ? 1 : 0;
      if (pos === code.length) { pos = 0; rain(); }
    });
  }

  // ─── הפעלה ──────────────────────────────────────────────────────────
  setupSearch();
  renderNumbers();
  renderTimeline();
  setupSign();
  setupSkin();
  setupEgg();
  loadLiveNumbers();
  var grid = $('#linkGrid');
  if (grid) new MutationObserver(markDiscord).observe(grid, { childList: true });
})();
