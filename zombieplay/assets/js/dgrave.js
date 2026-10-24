/* =====================================================================
   קבר הדיסקורד (סקשן #discordGrave): הקבר עולה מהאדמה כשמגיעים אליו, ולחיצה על הכפתור
   הופכת אותו לירוק ופותחת את ההזמנה לדיסקורד מ-config.js (links.discord).
   בלי הזמנה תקפה הסקשן מוסתר. מספרי החברים מגיעים מה-API הציבורי של ההזמנה, כמו ב-extras.js.
   ===================================================================== */
(function () {
  'use strict';

  var wrap = document.getElementById('dgWrap');
  var sec = document.getElementById('discordGrave');
  var stage = document.getElementById('dgStage');
  var dg = document.getElementById('dg');
  if (!wrap || !sec || !stage || !dg) return;

  var CFG = window.SITE_CONFIG || {};
  var raw = String((CFG.links && CFG.links.discord) || '').trim();
  var m = raw.match(/^(?:https?:\/\/)?(?:www\.)?(discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]+)/i);
  if (!m) { wrap.hidden = true; return; }              // שם משתמש או קישור שבור זה לא הזמנה
  var invite = 'https://' + m[1] + '/' + m[2];
  var code = m[2];

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var join = Array.prototype.slice.call(sec.querySelectorAll('[data-dg-join]'));
  join.forEach(function (a) { a.href = invite; });

  // המידות מצוירות על לוח של 600 פיקסלים: --u הוא פיקסל אחד של הלוח
  var u = 0.8;
  function size() {
    u = Math.max(0.3, stage.clientWidth / 600);
    stage.style.setProperty('--u', u + 'px');
  }
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else addEventListener('resize', size);

  var COLORS = ['#4b2f1a', '#6b4425', '#7a5030', '#5cbc3a', '#4aa32e'];
  function piece(cls, left, top, d, color) {
    var el = document.createElement('i');
    el.className = cls;
    el.style.cssText = 'left:' + left + ';top:' + top + ';width:' + d + 'px;height:' + d + 'px;background:' + color + ';margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px';
    dg.appendChild(el);
    return el;
  }

  // אדמה שעפה כשהקבר עולה (אותה פיזיקה כמו באנימציה לווידאו)
  function soil() {
    if (reduce || !dg.animate) return;
    var count = 18, g = 1700;
    for (var i = 0; i < count; i++) {
      var d = (14 + (i % 4) * 6) * u, v = 430 + (i * 53 % 100) * 4.2, vx = ((i * 37) % 100 - 50) * 3, x0 = ((i * 61) % 100 - 50) * 5.4;
      var el = piece('dg__soil', '50%', 'calc(var(--u) * 500)', d, COLORS[i % 5]);
      var frames = [], t, y;
      for (t = 0; t <= 1.0; t += 0.04) {
        y = -34 - (v * t - 0.5 * g * t * t);
        if (y > 6) break;
        frames.push({ opacity: 1, transform: 'translate(' + (x0 + vx * t) * u + 'px,' + y * u + 'px) rotate(' + (i * 53 + t * 320) + 'deg)' });
      }
      if (frames.length < 2) { el.remove(); continue; }
      el.animate(frames, { duration: frames.length * 40, delay: 200 + (i % 3) * 30, fill: 'both', easing: 'linear' }).onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }

  // ריבועים וגל כשלוחצים
  function burst() {
    if (reduce || !dg.animate) return;
    var n = 14, cx = 300, cy = 398, cols = ['#5865f2', '#23a55a', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var ang = i / n * Math.PI * 2 + (i % 2) * 0.25, r = 150 + (i % 3) * 16, d = (10 + (i % 3) * 5) * u;
      var el = piece('dg__spark', cx * u + 'px', cy * u + 'px', d, cols[i % 3]);
      el.animate([
        { opacity: 1, transform: 'translate(0,0) scale(1) rotate(' + (i * 37) + 'deg)' },
        { opacity: 0, transform: 'translate(' + Math.cos(ang) * r * u + 'px,' + (Math.sin(ang) * r + 46) * u + 'px) scale(0) rotate(' + (i * 37 + 260) + 'deg)' }
      ], { duration: 700, easing: 'cubic-bezier(.22,.9,.3,1)', fill: 'forwards' }).onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
    var rip = dg.querySelector('.dg__ripple');
    if (rip) rip.animate([{ opacity: .55, transform: 'scale(.85)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 600, easing: 'cubic-bezier(.22,.9,.3,1)' });
  }

  var shown = false;
  function show() {
    if (shown) return;
    shown = true;
    dg.classList.add('is-in');
    soil();
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(); io.disconnect(); } });
    }, { threshold: 0.35 });
    io.observe(stage);
  } else show();

  var done = false;
  function clicked() {
    if (done) return;
    done = true;
    dg.classList.add('is-done');
    burst();
  }
  join.forEach(function (a) { a.addEventListener('click', clicked); });
  // לחיצה על הקבר עצמו: רעידה קטנה
  stage.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    dg.classList.remove('is-shake'); void dg.offsetWidth; dg.classList.add('is-shake');
  });

  // כמה חברים בשרת ומי מחובר, מה-API הציבורי של ההזמנה
  var live = document.getElementById('dgLive');
  if (live && window.fetch) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch('https://discord.com/api/v10/invites/' + code + '?with_counts=true', ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(timer);
        if (!j || !j.approximate_member_count) return;
        var t = Number(j.approximate_member_count).toLocaleString('he-IL') + ' חברים';
        if (j.approximate_presence_count) t += ', ' + Number(j.approximate_presence_count).toLocaleString('he-IL') + ' מחוברים עכשיו';
        live.querySelector('span').textContent = t;
        live.hidden = false;
      })
      .catch(function () { clearTimeout(timer); });
  }
})();
