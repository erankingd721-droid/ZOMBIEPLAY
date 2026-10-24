/* =====================================================================
   קבר הסאב והלייק (סקשן #slGrave): הקבר עולה מהאדמה כשמגיעים אליו, ולחיצה על "הירשמו"
   פותחת את ההרשמה לערוץ ביוטיוב (אותו קישור כמו כפתור "הירשמו ביוטיוב" באתר, מ-config.js)
   ואת האנימציה: כפתור אפור, לייק כחול, פעמון צהוב ומצלצל. בלי ערוץ מוגדר הסקשן מוסתר.
   ===================================================================== */
(function () {
  'use strict';

  var wrap = document.getElementById('slWrap');
  var sec = document.getElementById('slGrave');
  var stage = document.getElementById('slStage');
  var dg = document.getElementById('sl');
  if (!wrap || !sec || !stage || !dg) return;

  var CFG = window.SITE_CONFIG || {};
  var YTC = CFG.youtube || {};
  var handle = YTC.handle ? '@' + String(YTC.handle).replace(/^@/, '') : '';
  var base = handle ? 'https://www.youtube.com/' + handle : (YTC.channelId ? 'https://www.youtube.com/channel/' + YTC.channelId : '');
  if (!base) { wrap.hidden = true; return; }
  var subUrl = base + '?sub_confirmation=1';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var join = Array.prototype.slice.call(sec.querySelectorAll('[data-sl-join]'));
  join.forEach(function (a) { a.href = subUrl; });

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

  function burst() {
    if (reduce || !dg.animate) return;
    var n = 14, cx = 300, cy = 398, cols = ['#f01919', '#2b8cf4', '#ffd33d'];
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
  stage.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    dg.classList.remove('is-shake'); void dg.offsetWidth; dg.classList.add('is-shake');
  });

  // כמה מנויים יש, מהנתונים של האתר (data/youtube.js)
  var live = document.getElementById('slLive');
  var subs = window.YT_DATA && window.YT_DATA.channel && Number(window.YT_DATA.channel.subscribers);
  if (live && subs) {
    live.querySelector('span').textContent = subs.toLocaleString('he-IL') + ' מנויים ביוטיוב';
    live.hidden = false;
  }
})();
