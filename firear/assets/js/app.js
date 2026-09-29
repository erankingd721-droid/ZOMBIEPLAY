/* =====================================================================
   האתר של הערוץ. יוטיוב + Kick, מתעדכן לבד.
   אין צורך לגעת בקובץ הזה: את כל ההגדרות משנים ב-config.js
   ===================================================================== */
(() => {
  'use strict';

  const CFG = window.SITE_CONFIG || {};
  const YT_DATA = window.YT_DATA || { channel: {}, items: [] };
  // גרסת "תמונת מצב": בלי חיבור לרשת (למשל כשהאתר מוצג בתוך Claude)
  const SNAP = window.SITE_SNAPSHOT || null;
  const TXT = {
    liveOffline: 'כרגע אין לייב. כשהלייב עולה, הכרטיס הזה מתעורר.',
    liveSnapshot: 'הלייבים עולים ביוטיוב וב-Kick. לחצו כדי לראות אם יש לייב עכשיו.',
    stepSubscribe: 'ולוחצים על הפעמון, ככה יודעים כשיש סרטון או לייב חדש.',
    stepChat: 'הצ׳אט הוא מה שעושה את הלייב. גם "היי" עוזר.',
    stepComment: 'לייק ותגובה מתחת לסרטון עוזרים לו להגיע ליותר אנשים.',
    stepShare: 'שולחים לחבר סרטון שצחקתם ממנו. זה הכי עוזר לערוץ קטן.',
    stepDiscord: 'עדכונים, שיחות וממים עם הקהילה.',
    stepTip: 'כל תרומה עוזרת לשפר את הערוץ.',
    ...(CFG.texts || {}),
  };

  // ─── עזרים ──────────────────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICONS = new Set(['spark', 'gamepad', 'users', 'globe', 'heart', 'star', 'bolt', 'chat', 'crown', 'trophy', 'gift', 'calendar', 'live', 'target', 'video', 'clock', 'eye', 'bell', 'share', 'youtube', 'kick', 'discord']);

  function safeUrl(u) {
    if (!u) return '';
    try {
      const url = new URL(String(u).trim(), location.href);
      return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  const cleanSlug = (s) => String(s || '').trim()
    .replace(/^https?:\/\/(www\.)?kick\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '').toLowerCase();

  // ─── הערוצים ────────────────────────────────────────────────────────
  const KICK_SLUG = cleanSlug(CFG.kick);
  const KICK = KICK_SLUG ? `https://kick.com/${KICK_SLUG}` : '';
  const KICK_API = `https://kick.com/api/v2/channels/${encodeURIComponent(KICK_SLUG)}`;

  const YTC = CFG.youtube || {};
  const YT_HANDLE = YTC.handle ? '@' + String(YTC.handle).replace(/^@/, '') : '';
  const YT_URL = YT_HANDLE ? `https://www.youtube.com/${YT_HANDLE}` : YTC.channelId ? `https://www.youtube.com/channel/${YTC.channelId}` : '';
  const HREFS = {
    kick: KICK,
    kickVideos: KICK && `${KICK}/videos`,
    ytSub: YT_URL && `${YT_URL}?sub_confirmation=1`,
    ytLive: YT_URL && `${YT_URL}/live`,
    ytVideos: YT_URL && `${YT_URL}/videos`,
  };
  const IMG = { ...(CFG.images || {}), ...(SNAP?.images || {}) };
  const ytWatch = (v) => (v.type === 'short' ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`);
  const ytThumb = (id) => (SNAP?.thumbBase ? `${SNAP.thumbBase}${id}.jpg` : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  const sticker = (file) => `assets/img/stickers/${file}`;

  // ─── פורמטים ────────────────────────────────────────────────────────
  const nf = new Intl.NumberFormat('he-IL');
  const cf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' });
  const fmt = (n) => nf.format(Math.round(Number(n) || 0));
  const fmtShort = (n) => (Number(n) >= 1000 ? cf.format(Number(n)) : fmt(n));

  function parseDate(s) {
    if (!s) return null;
    const str = String(s);
    const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(str) ? str : str.replace(' ', 'T') + 'Z');
    return isNaN(d) ? null : d;
  }

  function timeAgo(d) {
    if (!d) return '—';
    const s = (d.getTime() - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, sec] of units) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
    return 'ממש עכשיו';
  }

  // אורך בשניות → "1:43:42" / "10:14"
  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  // אורך בשניות → "1ש׳ 43ד׳"
  function fmtLength(sec) {
    const m = Math.round((Number(sec) || 0) / 60);
    const h = Math.floor(m / 60);
    return h ? `${h}ש׳ ${m % 60}ד׳` : `${m}ד׳`;
  }

  const monthYear = (d) => (d ? new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d) : '');

  async function getJSON(url, timeout = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ─── מצב ────────────────────────────────────────────────────────────
  const state = {
    kick: null,
    clips: [],
    kickLive: null,
    ytLive: null,
    items: [],          // סרטונים מיוטיוב + לייבים מ-Kick, מהחדש לישן
    subs: YT_DATA.channel?.subscribers ?? null,
    ytViews: YT_DATA.channel?.views ?? null,
    ytCount: YT_DATA.channel?.videos ?? null,
    tab: 'all',
  };
  const baseTitle = document.title;
  const liveNow = () => state.kickLive || state.ytLive;

  function setText(key, value) {
    $$(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value; });
  }

  function setImg(el, src) {
    const url = safeUrl(src);
    if (!el || !url) return;
    el.addEventListener('error', () => { el.hidden = true; }, { once: true });
    el.src = url;
    el.hidden = false;
  }

  // ─── ערכת צבעים ─────────────────────────────────────────────────────
  function applyTheme() {
    const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(CFG.accent || '') ? CFG.accent : '#3DFF1F';
    const root = document.documentElement.style;
    root.setProperty('--accent', accent);
    root.setProperty('--on-accent', luminance(accent) > 0.179 ? '#0b0d0c' : '#ffffff');
  }

  function luminance(hex) {
    let h = hex.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const [r, g, b] = [0, 2, 4]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // ─── קרעי נייר (נוצרים אוטומטית, כל אחד שונה) ─────────────────────
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tornEdge(rnd, W, base, amp) {
    const waves = [0, 1, 2].map((i) => ({
      k: ((Math.PI * 2) / W) * (1.2 + i * 2.4 + rnd() * 1.6),
      p: rnd() * 6.28,
      a: amp * [0.55, 0.3, 0.16][i],
    }));
    const pts = [];
    for (let x = -20; x <= W + 20; x += 4 + rnd() * 15) {
      let y = base;
      for (const w of waves) y += Math.sin(x * w.k + w.p) * w.a;
      y += (rnd() - 0.5) * amp * 0.5;
      if (rnd() < 0.06) y += (rnd() < 0.5 ? -1 : 1) * amp * (0.5 + rnd() * 0.9);
      pts.push([x, y]);
    }
    return pts;
  }

  function streakPath(rnd, W, cy, thick, slope) {
    const x0 = -40 + rnd() * W * 0.3;
    const x1 = W * (0.6 + rnd() * 0.45);
    const top = [];
    const bottom = [];
    for (let x = x0; x <= x1; x += 6 + rnd() * 14) {
      const u = (x - x0) / (x1 - x0);
      const taper = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.45);
      const c = cy + slope * (x - W / 2) + Math.sin(u * 9) * 2;
      const t = thick * taper * (0.75 + rnd() * 0.35);
      top.push([x, c - t / 2 + (rnd() - 0.5) * 3]);
      bottom.push([x, c + t / 2 + (rnd() - 0.5) * 3]);
    }
    const pts = top.concat(bottom.reverse());
    return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
  }

  function tearSVG(seed, dir) {
    const W = 1600, H = 160;
    const rnd = mulberry32(seed);
    const down = dir !== 'up';                 // down = הנייר למטה
    const side = down ? -1 : 1;                // לכיוון הצד הכהה
    const base = H * (down ? 0.6 : 0.4);
    const edge = tornEdge(rnd, W, base, 22);
    const fiber = edge.map(([x, y]) => [x, y + side * (1.5 + rnd() * 5)]);
    const closeY = down ? H + 10 : -10;
    const path = (pts) => `M-20 ${closeY} ` + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ` L${W + 20} ${closeY} Z`;
    const slope = (rnd() - 0.5) * 0.02;

    let specks = '';
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = base + side * (10 + rnd() * 52);
      const s = 1.5 + rnd() * 4.5;
      const cls = rnd() < 0.6 ? 'tear__speck' : 'tear__speck2';
      specks += `<rect class="${cls}" x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(s * (1 + rnd() * 2)).toFixed(1)}" height="${s.toFixed(1)}" transform="rotate(${(rnd() * 60 - 30).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" focusable="false">
      <path class="tear__streak" d="${streakPath(rnd, W, base + side * 18, 26, slope)}"/>
      <path class="tear__streak2" d="${streakPath(rnd, W, base + side * 36, 10, -slope)}"/>
      <path class="tear__streak" opacity=".7" d="${streakPath(rnd, W, base + side * 48, 6, slope * 1.5)}"/>
      ${specks}
      <path class="tear__fiber" d="${path(fiber)}"/>
      <path class="tear__paper" d="${path(edge)}"/>
    </svg>`;
  }

  function renderTears() {
    $$('.tear').forEach((el) => { el.innerHTML = tearSVG(Number(el.dataset.seed) || 1, el.dataset.dir); });
  }

  // ─── אנימציות: הכול כבר מוצג במצב הסופי, והאנימציה רצה כשהאלמנט נכנס למסך ───
  function whenVisible(el, fn) {
    if (!el || reduceMotion || !('IntersectionObserver' in window)) return;
    const ob = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      ob.disconnect();
      fn();
    }, { threshold: 0.35 });
    ob.observe(el);
  }

  function countUp(el, to) {
    el.textContent = fmt(to);
    whenVisible(el, () => {
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1300);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function growBar(bar, pct) {
    bar.style.width = `${pct}%`;
    whenVisible(bar, () => {
      bar.style.transition = 'none';
      bar.style.width = '0%';
      void bar.offsetWidth;
      bar.style.transition = '';
      bar.style.width = `${pct}%`;
    });
  }

  // ─── זהות וטקסטים ───────────────────────────────────────────────────
  function renderStatic() {
    const [w1, w2] = Array.isArray(CFG.wordmark) ? CFG.wordmark : [CFG.wordmark || CFG.name || '', ''];
    const name = CFG.name || `${w1}${w2}`;
    setText('name', name);
    setText('owner', CFG.owner || name);
    setText('tagName', CFG.owner ? `${name} · ${CFG.owner}` : name);
    setText('word1', String(w1).toUpperCase());
    setText('word2', String(w2 || '').toUpperCase());
    const root = document.documentElement.style;
    root.setProperty('--word-len', Math.max(3, `${w1}${w2}`.length));
    root.setProperty('--word-part', Math.max(3, String(w1).length, String(w2 || '').length));

    const hero = CFG.hero || {};
    setText('heroLine1', hero.line1 || '');
    setText('heroLine2', hero.line2 || '');
    setText('heroSub', hero.subtitle || '');
    $('#heroEyebrow').textContent = YT_HANDLE ? `YOUTUBE.COM/${YT_HANDLE.toUpperCase()}` : KICK_SLUG ? `KICK.COM/${KICK_SLUG.toUpperCase()}` : '';

    $('#aboutText').textContent = CFG.about?.text || '';
    const [noteTop, noteBottom] = CFG.about?.note || [];
    $('#noteTop').textContent = noteTop || '';
    $('#noteBottom').textContent = noteBottom || '';
    $('#aboutNote').hidden = !noteTop && !noteBottom;

    const support = CFG.support || {};
    $('#supportTitle').innerHTML = String(support.title || 'איך עוזרים\nלערוץ לגדול?').split('\n').map(esc).join('<br>');
    $('#supportText').textContent = support.text || '';
    $('#year').textContent = new Date().getFullYear();

    for (const a of $$('[data-href]')) {
      const href = HREFS[a.dataset.href];
      if (href) a.href = href;
      else a.hidden = true;
    }
    // בלי יוטיוב, Kick הוא הכפתור הראשי
    if (!YT_URL && KICK) $$('.js-kick-cta').forEach((a) => a.classList.replace('btn--ghost', 'btn--primary'));

    if (SNAP) document.body.classList.add('is-snapshot');
    renderImages();
    renderSchedule();
    renderSteps();
    renderStickers();
    updateSticker();
  }

  // תמונות: מה-config, ואם אין, מ-Kick
  function renderImages() {
    const kickUser = state.kick?.user || {};
    const avatar = IMG.avatar || kickUser.profile_pic;
    setImg($('#brandAvatar'), avatar);

    const about = $('#aboutImg');
    const badge = $('#aboutBadge');
    if (IMG.about) {
      about.classList.remove('is-photo');
      setImg(about, IMG.about);
      setImg(badge, avatar);
    } else if (avatar) {
      about.classList.add('is-photo');
      setImg(about, avatar);
      badge.hidden = true;
    }

    const banner = safeUrl(IMG.banner || state.kick?.banner_image?.url || state.kick?.offline_banner_image?.src);
    if (banner) {
      const el = $('#communityImg');
      el.style.setProperty('--img', `url("${banner}")`);
      el.classList.add('has-img');
    }
  }

  function updateSticker() {
    const hero = CFG.hero || {};
    const [top, bottom] = liveNow()
      ? hero.stickerLive || ['עכשיו באוויר.', 'בואו לצ׳אט!']
      : hero.stickerOffline || ['כרגע אופליין.', 'תכף חוזר.'];
    $('#stickerTop').textContent = top || '';
    $('#stickerBottom').textContent = bottom || '';
    $('#heroSticker').hidden = !top && !bottom;
  }

  function renderHeroStats() {
    const live = liveNow();
    const stats = [];
    if (YT_URL) stats.push(['מנויים ביוטיוב', state.subs != null ? fmt(state.subs) : '—', 'num']);
    if (KICK) stats.push(['עוקבים ב-Kick', state.kick ? fmt(state.kick.followers_count) : '—', 'num']);
    // בלי Kick, הצפיות ביוטיוב תופסות את המקום של העוקבים
    if ((SNAP || !KICK) && state.ytViews) stats.push(['צפיות ביוטיוב', fmt(state.ytViews), 'num']);
    // סטטוס רק כשאפשר לזהות לייב (Kick או מפתח API). אחרת: מספר הסרטונים
    const detectsLive = KICK || (YTC.apiKey && YTC.channelId);
    if (!SNAP && (detectsLive || live)) stats.push(['סטטוס', live ? `בלייב${live.platform === 'kick' ? ' ב-Kick' : ' ביוטיוב'}` : 'אופליין', live ? 'is-on' : '']);
    else if (!KICK && state.ytCount) stats.push(['סרטונים ביוטיוב', fmt(state.ytCount), 'num']);
    $('#heroStats').innerHTML = stats.map(([dt, dd, cls]) => `<div><dt>${esc(dt)}</dt><dd class="${cls}">${esc(dd)}</dd></div>`).join('');
  }

  function renderFacts() {
    const kick = state.kick;
    const cats = kick?.recent_categories || [];
    const facts = (CFG.about?.facts || []).map((f) => {
      switch (f.type) {
        case 'subs':
          return YT_URL && state.subs != null && { icon: 'youtube', label: 'מנויים ביוטיוב', title: fmt(state.subs), text: 'כל מנוי חדש מרגיש. תודה שאתם פה.' };
        case 'followers':
          return kick && { icon: 'kick', label: 'עוקבים ב-Kick', title: fmt(kick.followers_count), text: 'הלייבים עולים גם שם.' };
        case 'game': {
          if (!cats.length) return null;
          const more = cats.slice(1, 3).map((c) => c.name).join(', ');
          return { icon: 'gamepad', label: 'משחק לאחרונה', title: cats[0].name, text: more ? `וגם ${more}` : 'ומה שהצ׳אט יבחר.' };
        }
        case 'since': {
          const since = monthYear(parseDate(YT_DATA.channel?.joined));
          if (!since) return null;
          return { icon: 'calendar', label: 'ביוטיוב מאז', title: since, text: [state.ytCount && `${fmt(state.ytCount)} סרטונים`, state.ytViews && `${fmt(state.ytViews)} צפיות`].filter(Boolean).join(' ו-') };
        }
        default:
          return f;
      }
    }).filter(Boolean);
    $('#facts').innerHTML = facts.map((f) => `
      <div class="fact">
        <span class="fact__label">${icon(ICONS.has(f.icon) ? f.icon : 'spark')}${esc(f.label)}</span>
        <b class="fact__title">${esc(f.title)}</b>
        <p class="fact__text">${esc(f.text)}</p>
      </div>`).join('');
  }

  // ─── לייב ───────────────────────────────────────────────────────────
  function normKickLive(ls) {
    if (!ls || ls.is_live === false) return null;
    return {
      platform: 'kick',
      title: ls.session_title || '',
      viewers: Number(ls.viewers ?? ls.viewer_count ?? 0),
      start: parseDate(ls.created_at || ls.start_time) || new Date(),
      category: ls.category?.name || ls.categories?.[0]?.name || '',
      thumb: ls.thumbnail?.src || ls.thumbnail?.url || '',
      url: KICK,
    };
  }

  function applyLive() {
    const live = liveNow();
    const where = live ? (live.platform === 'kick' ? ' ב-Kick' : ' ביוטיוב') : '';
    document.body.classList.toggle('is-live', !!live);
    document.title = live ? `🔴 בלייב עכשיו · ${CFG.name || ''}` : baseTitle;

    $('#kickPillLabel').textContent = state.kickLive ? `LIVE · ${fmtShort(state.kickLive.viewers)}` : 'Kick';
    const bar = $('#livebar');
    bar.hidden = !live;
    if (live) {
      bar.href = live.url;
      $('#livebarWhere').textContent = where;
      $('#livebarTitle').textContent = live.title;
    }

    $('#liveStatus').textContent = live ? 'LIVE' : 'OFF';
    $('#liveText').textContent = SNAP
      ? TXT.liveSnapshot
      : live ? `${live.title || 'בלייב עכשיו!'}${live.category ? ` · ${live.category}` : ''}` : TXT.liveOffline;
    $('#liveViewers').textContent = live ? fmt(live.viewers) : '0';
    if (!live) $('#liveUptime').textContent = '—';

    renderHeroStats();
    renderScreen();
    updateSticker();
  }

  setInterval(() => {
    const live = liveNow();
    if (live?.start) $('#liveUptime').textContent = fmtClock((Date.now() - live.start) / 1000);
  }, 1000);

  async function pollKick() {
    if (!KICK_SLUG || SNAP) return;
    try {
      const res = await getJSON(`${KICK_API}/livestream`);
      state.kickLive = normKickLive(res?.data);
      applyLive();
    } catch { /* נשארים עם המצב האחרון */ }
  }

  const embedFrame = (id, title) => `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;

  // המסך בכותרת: לייב אם יש, ואם אין, הסרטון הכי חדש
  function renderScreen() {
    const body = $('#screenBody');
    const live = liveNow();
    const viewers = $('#screenViewers');
    $('#screenChip').textContent = live ? 'LIVE' : 'NEW';
    viewers.hidden = !live;
    if (live) viewers.innerHTML = `${icon('eye')} ${fmtShort(live.viewers)}`;

    const latest = state.items.find((v) => v.type !== 'short') || state.items[0];
    const key = live ? `live:${live.platform}:${live.title}` : latest ? `item:${latest.id}` : 'empty';
    // נגן פתוח נשאר פתוח, אלא אם לייב התחיל או נגמר
    if (body.dataset.mode === 'player' && String(body.dataset.key).startsWith('live') === !!live) return;
    if (body.dataset.key === key) {
      if (live && live.thumb) { const img = $(':scope > img', body); if (img) img.src = safeUrl(live.thumb); }
      return;
    }
    body.dataset.key = key;
    body.dataset.mode = 'poster';

    // בגרסת תמונת-מצב אין נגנים מוטמעים: הכפתור פותח את הסרטון באתר המקורי
    const playLink = (url, label) => `<a class="screen__play" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(label)}">${icon('play')}</a>`;
    const playButton = (label) => `<button class="screen__play" type="button" aria-label="${esc(label)}">${icon('play')}</button>`;

    if (live) {
      const pic = safeUrl(live.thumb) || (live.videoId ? ytThumb(live.videoId) : '');
      body.innerHTML = `
        ${pic ? `<img src="${esc(pic)}" alt="">` : '<div class="screen__pattern"></div>'}
        <div class="screen__overlay"><em>בלייב עכשיו${live.platform === 'kick' ? ' ב-Kick' : ' ביוטיוב'}</em><strong>${esc(live.title || '')}</strong><span>${esc(live.category || '')}</span></div>
        ${playButton('צפייה בלייב כאן')}`;
      $('.screen__play', body).addEventListener('click', () => {
        body.dataset.mode = 'player';
        body.innerHTML = live.platform === 'kick'
          ? `<iframe src="https://player.kick.com/${encodeURIComponent(KICK_SLUG)}?autoplay=true" title="הלייב ב-Kick" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
          : embedFrame(live.videoId, 'הלייב ביוטיוב');
      });
    } else if (latest) {
      const inline = latest.source === 'yt' && !SNAP;
      body.innerHTML = `
        ${latest.thumb ? `<img src="${esc(latest.thumb)}" alt="">` : '<div class="screen__pattern"></div>'}
        <div class="screen__overlay"><em>${latest.type === 'live' ? 'הלייב האחרון' : latest === state.items[0] ? 'הכי חדש בערוץ' : 'הסרטון האחרון'} · ${esc(timeAgo(latest.date))}</em><strong>${esc(latest.title)}</strong></div>
        ${inline ? playButton('לצפות בסרטון') : playLink(latest.url, 'לצפות בסרטון')}`;
      if (inline) {
        $('.screen__play', body).addEventListener('click', () => {
          body.dataset.mode = 'player';
          body.innerHTML = embedFrame(latest.id, latest.title);
        });
      }
    } else {
      body.innerHTML = '<div class="screen__pattern"></div><div class="screen__overlay"><strong>בקרוב כאן: הסרטון הכי חדש</strong></div>';
    }
  }

  // ─── סרטונים (יוטיוב + לייבים מ-Kick) ───────────────────────────────
  function sortItems() {
    state.items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }

  function ytItem(id, type, title, views, dur, date) {
    return { source: 'yt', id, type, title, views, dur, date: parseDate(date) || date, thumb: ytThumb(id), url: ytWatch({ id, type }) };
  }

  function loadBakedYouTube() {
    state.items = (YT_DATA.items || [])
      .filter(([, type, , , dur]) => !(type === 'live' && dur < 180)) // לייבים שנפלו בהתחלה
      .map((row) => ytItem(...row));
    sortItems();
  }

  // לייבים מ-Kick. לייב ששודר גם ביוטיוב (אותו זמן בערך) לא נכנס פעמיים
  function addKickVods(list) {
    const ytLives = state.items.filter((v) => v.source === 'yt' && v.type === 'live' && v.date);
    const seen = new Set(state.items.map((v) => v.id));
    for (const v of list || []) {
      if (!v || v.is_live) continue;
      const date = parseDate(v.start_time || v.created_at);
      const id = v.video?.uuid || String(v.id);
      if (!date || seen.has(id)) continue;
      if (ytLives.some((y) => Math.abs(y.date - date) < 3 * 3600 * 1000)) continue;
      state.items.push({
        source: 'kick', id, type: 'live', title: v.session_title || 'לייב',
        views: v.views ?? v.video?.views ?? null, dur: (Number(v.duration) || 0) / 1000 || null, date,
        thumb: safeUrl(v.thumbnail?.src),
        url: v.video?.uuid ? `${KICK}/videos/${encodeURIComponent(v.video.uuid)}` : `${KICK}/videos`,
      });
      seen.add(id);
    }
    sortItems();
  }

  // סרטונים חדשים מה-RSS של יוטיוב (דרך rss2json, בלי מפתח)
  async function loadYouTubeFeed() {
    if (!YTC.channelId) return false;
    const rss = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(YTC.channelId)}`;
    const res = await getJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`);
    if (res?.status !== 'ok') return false;
    // כולל סרטונים שסוננו (לייבים שנפלו), כדי שלא יחזרו דרך ה-RSS
    const known = new Set([...state.items.map((v) => v.id), ...(YT_DATA.items || []).map((row) => row[0])]);
    let added = 0;
    for (const it of res.items || []) {
      const id = String(it.guid || '').replace('yt:video:', '');
      if (!/^[\w-]{11}$/.test(id) || known.has(id)) continue;
      const type = /\/shorts\//.test(it.link || '') ? 'short' : /לייב|\blive\b|שידור/i.test(it.title || '') ? 'live' : 'video';
      state.items.push(ytItem(id, type, it.title || '', null, null, it.pubDate));
      known.add(id);
      added++;
    }
    if (added) sortItems();
    return added > 0;
  }

  // עם מפתח API: מספרים עדכניים + זיהוי לייב ביוטיוב
  async function loadYouTubeApi() {
    const key = encodeURIComponent(YTC.apiKey);
    const base = 'https://www.googleapis.com/youtube/v3';
    const ch = await getJSON(`${base}/channels?part=statistics,contentDetails&id=${encodeURIComponent(YTC.channelId)}&key=${key}`);
    const c = ch.items?.[0];
    if (!c) return;
    const st = c.statistics || {};
    if (!st.hiddenSubscriberCount) state.subs = Number(st.subscriberCount);
    state.ytViews = Number(st.viewCount);
    state.ytCount = Number(st.videoCount);

    const uploads = c.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return;
    const pl = await getJSON(`${base}/playlistItems?part=contentDetails&maxResults=25&playlistId=${uploads}&key=${key}`);
    const ids = (pl.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) return;
    const vids = await getJSON(`${base}/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids.join(',')}&key=${key}`);
    const byId = new Map(state.items.map((v) => [v.id, v]));
    state.ytLive = null;
    for (const v of vids.items || []) {
      let item = byId.get(v.id);
      if (!item) {
        item = ytItem(v.id, v.liveStreamingDetails ? 'live' : 'video', '', null, null, null);
        state.items.push(item);
        byId.set(v.id, item);
      }
      item.title = v.snippet?.title || item.title;
      item.views = Number(v.statistics?.viewCount ?? item.views);
      item.dur = isoSeconds(v.contentDetails?.duration) || item.dur;
      item.date = parseDate(v.liveStreamingDetails?.actualStartTime || v.snippet?.publishedAt) || item.date;
      if (v.snippet?.liveBroadcastContent === 'live') {
        state.ytLive = {
          platform: 'youtube', videoId: v.id, title: item.title,
          viewers: Number(v.liveStreamingDetails?.concurrentViewers || 0),
          start: parseDate(v.liveStreamingDetails?.actualStartTime), category: '',
          thumb: ytThumb(v.id), url: `https://www.youtube.com/watch?v=${v.id}`,
        };
      }
    }
    sortItems();
  }

  const isoSeconds = (iso) => {
    const m = String(iso || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return m ? ((+m[1] || 0) * 86400) + ((+m[2] || 0) * 3600) + ((+m[3] || 0) * 60) + (+m[4] || 0) : 0;
  };

  // בגרסה המלאה, סרטון מיוטיוב נפתח בנגן בתוך האתר
  const playsInline = (v) => v.source === 'yt' && !SNAP;
  const typeLabel = (v) => (v.type === 'short' ? 'SHORT' : v.type === 'live' ? (v.source === 'kick' ? 'לייב · KICK' : 'לייב') : '');

  function itemCard(v, clone) {
    const hide = clone ? ' aria-hidden="true" tabindex="-1"' : '';
    const label = typeLabel(v);
    return `
      <a class="clip clip--${v.type}" href="${esc(v.url)}" target="_blank" rel="noopener"${playsInline(v) ? ` data-yt="${esc(v.id)}"` : ''}${hide}>
        <div class="clip__thumb"${v.type === 'short' ? ` style="--thumb:url('${esc(v.thumb)}')"` : ''}>
          ${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" decoding="async">` : ''}
          ${v.dur ? `<span class="clip__dur">${fmtClock(v.dur)}</span>` : ''}
          ${label ? `<span class="clip__type">${label}</span>` : ''}
          <span class="clip__play"><span>${icon('play')}</span></span>
        </div>
        <div class="clip__body">
          <p class="clip__title">${esc(v.title)}</p>
          <p class="clip__meta">
            ${v.views != null ? `<span>${icon('eye')}${fmtShort(v.views)}</span>` : ''}
            <span>${icon('clock')}${esc(timeAgo(v.date))}</span>
          </p>
        </div>
      </a>`;
  }

  const clipTitle = (c) => String(c.title || '').replace(/\s*\|\s*clip\s*$/i, '').trim() || 'קליפ';

  function kickClipCard(c, clone) {
    const url = `${KICK}/clips/${encodeURIComponent(c.id)}`;
    const thumb = safeUrl(c.thumbnail_url);
    const hide = clone ? ' aria-hidden="true" tabindex="-1"' : '';
    return `
      <a class="clip" href="${esc(url)}" target="_blank" rel="noopener"${SNAP ? '' : ` data-clip="${esc(c.id)}"`}${hide}>
        <div class="clip__thumb">
          ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : ''}
          <span class="clip__dur">${fmtClock(c.duration)}</span>
          <span class="clip__type">KICK</span>
          <span class="clip__play"><span>${icon('play')}</span></span>
        </div>
        <div class="clip__body">
          <p class="clip__title">${esc(clipTitle(c))}</p>
          <p class="clip__meta">
            <span>${icon('eye')}${fmtShort(c.views ?? c.view_count)}</span>
            <span>${icon('clock')}${esc(timeAgo(parseDate(c.created_at)))}</span>
          </p>
        </div>
      </a>`;
  }

  function currentList() {
    if (state.tab === 'clips') return state.clips.map((c) => ({ kind: 'clip', c }));
    const list = state.tab === 'all' ? state.items : state.items.filter((v) => v.type === state.tab);
    return list.map((v) => ({ kind: 'item', v }));
  }

  // לשוניות בלי תוכן לא מוצגות
  function updateTabs() {
    const has = {
      all: state.items.length > 0,
      video: state.items.some((v) => v.type === 'video'),
      short: state.items.some((v) => v.type === 'short'),
      live: state.items.some((v) => v.type === 'live'),
      clips: state.clips.length > 0,
    };
    $$('#videoTabs button').forEach((b) => { b.hidden = !has[b.dataset.tab]; });
    if (!has[state.tab]) {
      state.tab = has.all ? 'all' : has.clips ? 'clips' : 'all';
      $$('#videoTabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab)));
    }
  }

  function renderVideos() {
    updateTabs();
    const marquee = $('#videoMarquee');
    const track = $('#videoTrack');
    const items = currentList().slice(0, 16);
    if (!items.length) {
      marquee.classList.add('is-static');
      track.innerHTML = '<p class="empty">הסרטונים יופיעו כאן בקרוב.</p>';
      return;
    }
    const card = (x, clone) => (x.kind === 'clip' ? kickClipCard(x.c, clone) : itemCard(x.v, clone));
    const real = items.map((x) => card(x, false)).join('');

    if (reduceMotion) {
      marquee.classList.add('is-static');
      track.innerHTML = real;
      return;
    }
    // מודדים עותק אחד ומשכפלים מספיק פעמים כדי שלא יהיה חור בגלילה האינסופית
    marquee.classList.remove('is-static');
    track.style.animation = 'none';
    track.innerHTML = real;
    const copyW = track.scrollWidth || 1;
    const reps = Math.max(1, Math.ceil((marquee.clientWidth + 40) / copyW));
    const clone = items.map((x) => card(x, true)).join('');
    track.innerHTML = real + clone.repeat(reps - 1) + clone.repeat(reps);
    track.style.setProperty('--dur', `${Math.round((copyW * reps) / 42)}s`);
    track.style.animation = '';
  }

  function setupVideos() {
    $('#videoTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
      $$('#videoTabs button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      state.tab = btn.dataset.tab;
      renderVideos();
    });

    // לחיצה על סרטון פותחת נגן בתוך האתר (רק בגרסה המלאה)
    document.addEventListener('click', (e) => {
      if (SNAP || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      const yt = e.target.closest('[data-yt]');
      if (yt) {
        const v = state.items.find((x) => x.id === yt.dataset.yt);
        if (!v) return;
        e.preventDefault();
        openYouTube(v);
        return;
      }
      const clip = e.target.closest('[data-clip]');
      if (clip) {
        const c = state.clips.find((x) => x.id === clip.dataset.clip);
        if (!c) return;
        e.preventDefault();
        openClip(c);
      }
    });

    let lastW = innerWidth;
    let t;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (Math.abs(innerWidth - lastW) < 60) return;
        lastW = innerWidth;
        renderVideos();
      }, 250);
    });
  }

  // ─── נגן ────────────────────────────────────────────────────────────
  let hls = null;

  function openDialog(vertical) {
    const dlg = $('#player');
    dlg.classList.toggle('modal--vertical', !!vertical);
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function openYouTube(v) {
    $('#playerTitle').textContent = v.title;
    $('#playerMeta').textContent = [v.views != null ? `${fmt(v.views)} צפיות` : '', timeAgo(v.date), v.type === 'live' ? 'לייב' : v.type === 'short' ? 'שורט' : ''].filter(Boolean).join(' · ');
    $('#playerLink').href = v.url;
    $('#playerMedia').innerHTML = embedFrame(v.id, v.title);
    openDialog(v.type === 'short');
  }

  async function openClip(c) {
    const url = `${KICK}/clips/${encodeURIComponent(c.id)}`;
    const src = safeUrl(c.video_url || c.clip_url);
    const media = $('#playerMedia');
    $('#playerTitle').textContent = clipTitle(c);
    $('#playerMeta').textContent = [`${fmt(c.views ?? c.view_count)} צפיות`, timeAgo(parseDate(c.created_at)), c.creator?.username ? `נחתך ע״י ${c.creator.username}` : ''].filter(Boolean).join(' · ');
    $('#playerLink').href = url;
    media.innerHTML = `<video controls playsinline autoplay poster="${esc(safeUrl(c.thumbnail_url))}"></video>`;
    openDialog(false);

    const video = $('video', media);
    const fallback = () => {
      media.innerHTML = `<div class="modal__fallback"><p>אי אפשר לנגן את הקליפ כאן.</p><a class="btn btn--primary btn--sm" href="${esc(url)}" target="_blank" rel="noopener">לצפייה ב-Kick</a></div>`;
    };
    if (!src) return fallback();
    try {
      if (!window.Hls) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.15/hls.min.js');
    } catch { /* ננסה ניגון מובנה */ }
    if (!$('#player').open || !video.isConnected) return;
    if (window.Hls?.isSupported()) {
      hls = new window.Hls();
      hls.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) fallback(); });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      return fallback();
    }
    video.play().catch(() => {});
  }

  function setupPlayer() {
    const dlg = $('#player');
    const close = () => (typeof dlg.close === 'function' ? dlg.close() : dlg.removeAttribute('open'));
    // עוצרים את הניגון בכל סגירה (כפתור, Esc, לחיצה בחוץ). לא סומכים על אירוע close,
    // שלא תמיד נורה, אלא על שינוי המאפיין open
    const stop = () => {
      if (dlg.open) return;
      if (hls) { hls.destroy(); hls = null; }
      $('#playerMedia').innerHTML = '';
    };
    new MutationObserver(stop).observe(dlg, { attributes: true, attributeFilter: ['open'] });
    $('#playerClose').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  // ─── קישורים ────────────────────────────────────────────────────────
  const PLATFORMS = {
    youtube:   { name: 'YouTube', icon: 'youtube', color: '#FF0033', text: 'סרטונים, שורטס ולייבים.' },
    kick:      { name: 'Kick', icon: 'kick', color: '#53FC18', text: 'הלייבים בזמן אמת.' },
    discord:   { name: 'Discord', icon: 'discord', color: '#7B87FF', text: 'השרת של הקהילה: עדכונים, שיחות קול וממים.' },
    tiktok:    { name: 'TikTok', icon: 'tiktok', color: '#FFFFFF', text: 'קליפים קצרים ורגעים מצחיקים.' },
    instagram: { name: 'Instagram', icon: 'instagram', color: '#FF4F8B', text: 'מאחורי הקלעים וסטוריז.' },
    whatsapp:  { name: 'WhatsApp', icon: 'whatsapp', color: '#25D366', text: 'התראה ישר לטלפון כשהלייב עולה.' },
    x:         { name: 'X', icon: 'x', color: '#FFFFFF', text: 'עדכונים ומחשבות.' },
    twitch:    { name: 'Twitch', icon: 'twitch', color: '#A970FF', text: 'גם שם, מדי פעם.' },
    tip:       { name: 'תרומות', icon: 'gift', color: '#FFC53D', text: 'תמיכה בערוץ.' },
    email:     { name: 'מייל', icon: 'mail', color: '#FFFFFF', text: 'לשיתופי פעולה.' },
  };
  const LINK_ORDER = ['discord', 'tiktok', 'instagram', 'whatsapp', 'x', 'twitch', 'tip', 'email'];

  function fromHandle(p, value) {
    const v = String(value || '').trim();
    if (!v || v === '-') return '';
    if (/^(https?:|mailto:)/i.test(v)) return v;
    const h = v.replace(/^@/, '');
    switch (p) {
      case 'instagram': return `https://instagram.com/${h}`;
      case 'tiktok': return `https://www.tiktok.com/@${h}`;
      case 'x': return `https://x.com/${h}`;
      case 'twitch': return `https://twitch.tv/${h}`;
      case 'email': return /@/.test(v) ? `mailto:${v}` : '';
      case 'discord': return /^(discord\.gg|discord\.com)\//i.test(v) ? `https://${v}` : ''; // שם משתמש הוא לא הזמנה
      default: return /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v) ? `https://${v}` : '';
    }
  }

  function collectLinks() {
    const out = [];
    if (YT_URL) out.push(['youtube', YT_URL]);
    if (KICK) out.push(['kick', KICK]);
    const cfg = CFG.links || {};
    const user = state.kick?.user || {};
    const fromKick = { instagram: user.instagram, tiktok: user.tiktok, x: user.twitter };
    for (const p of LINK_ORDER) {
      const own = String(cfg[p] || '').trim();
      const url = safeUrl(fromHandle(p, own === '-' ? '' : own || fromKick[p]));
      if (url && !(p === 'email' && SNAP)) out.push([p, url]); // mailto לא עובד בתוך Claude
    }
    return out;
  }

  function renderLinks() {
    const links = collectLinks();
    const texts = CFG.linkTexts || {};
    $('#linkGrid').innerHTML = links.map(([p, url]) => {
      const P = PLATFORMS[p];
      return `
        <a class="link-row" href="${esc(url)}" target="_blank" rel="noopener" style="--brand:${P.color}">
          <span class="link-row__icon">${icon(P.icon)}</span>
          <span>
            <b class="link-row__name">${esc(P.name)}</b>
            <span class="link-row__desc">${esc(texts[p] || P.text)}</span>
          </span>
          <span class="link-row__arrow">${icon('arrow')}</span>
        </a>`;
    }).join('');
    $('#footSocials').innerHTML = links
      .map(([p, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(PLATFORMS[p].name)}">${icon(PLATFORMS[p].icon)}</a>`)
      .join('');
  }

  // ─── הקהילה ─────────────────────────────────────────────────────────
  function nextMilestone(n) {
    const steps = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500,
      10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 250000, 500000, 1000000];
    return steps.find((s) => s > n) || (Math.floor(n / 1000000) + 1) * 1000000;
  }

  function renderGoals() {
    const rows = [];
    if (YT_URL && state.subs != null) rows.push({ icon: 'youtube', label: 'מנויים ביוטיוב', cur: state.subs, target: nextMilestone(state.subs), unit: 'מנויים', count: true });
    if (state.kick) {
      const n = Number(state.kick.followers_count) || 0;
      rows.push({ icon: 'kick', label: 'עוקבים ב-Kick', cur: n, target: nextMilestone(n), unit: 'עוקבים', count: true });
    }
    if (!KICK && YT_URL && state.ytViews) rows.push({ icon: 'eye', label: 'צפיות ביוטיוב', cur: state.ytViews, target: nextMilestone(state.ytViews), unit: 'צפיות', count: true });
    for (const g of CFG.goals || []) {
      if (g?.title && Number(g.target) > 0) rows.push({ icon: 'star', label: g.title, cur: Number(g.current) || 0, target: Number(g.target), reward: g.reward });
    }
    $('#cardGoals').hidden = !rows.length;
    const list = $('#goalsList');
    list.innerHTML = rows.map((r) => {
      const pct = Math.min(100, (r.cur / r.target) * 100);
      return `
        <li class="goal">
          <div class="goal__top">
            <span class="goal__icon goal__icon--${r.icon}">${icon(r.icon)}</span>
            <div class="goal__main">
              <span class="goal__label">${esc(r.label)}</span>
              <b class="goal__num num"${r.count ? ` data-to="${r.cur}"` : ''}>${fmt(r.cur)}</b>
            </div>
            <span class="goal__target">היעד הבא<br><b class="num">${fmt(r.target)}</b></span>
          </div>
          <div class="progress" role="progressbar" aria-label="${esc(r.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i data-pct="${pct.toFixed(1)}"></i></div>
          <p class="goal__note">${r.unit ? `עוד ${fmt(r.target - r.cur)} ${r.unit} ומגיעים ל-${fmt(r.target)}` : r.reward ? `${icon('gift')}${esc(r.reward)}` : ''}</p>
        </li>`;
    }).join('');
    $$('.goal__num[data-to]', list).forEach((el) => countUp(el, Number(el.dataset.to)));
    $$('.progress > i', list).forEach((bar) => growBar(bar, Number(bar.dataset.pct)));
  }

  function renderTop() {
    const top = [...state.items].filter((v) => v.views != null).sort((a, b) => b.views - a.views).slice(0, 5);
    $('#cardTop').hidden = !top.length;
    $('#topList').innerHTML = top.map((v, i) => `
      <li>
        <a class="top__item" href="${esc(v.url)}" target="_blank" rel="noopener"${playsInline(v) ? ` data-yt="${esc(v.id)}"` : ''}>
          <span class="top__rank">${i + 1}</span>
          <span class="top__thumb clip--${v.type}"${v.type === 'short' ? ` style="--thumb:url('${esc(v.thumb)}')"` : ''}>${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy">` : ''}</span>
          <span class="top__body">
            <span class="top__title">${esc(v.title)}</span>
            <span class="top__meta">${icon('eye')}${fmt(v.views)}${typeLabel(v) ? ` · ${typeLabel(v)}` : ''}</span>
          </span>
        </a>
      </li>`).join('');
  }

  // הלייב האחרון, ובערוץ בלי לייבים: הסרטון האחרון
  function renderLast() {
    const live = state.items.find((v) => v.type === 'live');
    const last = live || state.items.find((v) => v.type === 'video');
    const link = $('#lastLink');
    $('#cardLast').hidden = !last;
    if (!last) return;
    $('#cardLast .last__badge').textContent = live ? 'הלייב האחרון' : 'הסרטון האחרון';
    link.href = last.url;
    if (playsInline(last)) link.dataset.yt = last.id;
    else delete link.dataset.yt;
    $('#lastTitle').textContent = last.title || 'לייב';
    setImg($('#lastThumb'), last.thumb);
    $('#lastDuration').textContent = last.dur ? fmtLength(last.dur) : '—';
    $('#lastViews').textContent = last.views != null ? fmtShort(last.views) : '—';
    $('#lastWhen').textContent = timeAgo(last.date);
    $('#lastWhere').innerHTML = last.source === 'kick' ? `${icon('kick')}שודר ב-Kick` : `${icon('youtube')}${live ? 'שודר' : 'עלה'} ביוטיוב`;
  }

  function renderGames() {
    const cats = state.kick?.recent_categories || [];
    $('#cardGames').hidden = !cats.length;
    $('#gamesGrid').innerHTML = cats.slice(0, 6).map((c, i) => {
      const art = safeUrl(c.banner?.url || c.banner?.src);
      const meta = [i === 0 ? 'שיחקנו לאחרונה' : '', !SNAP && c.viewers ? `${fmtShort(c.viewers)} צופים ב-Kick עכשיו` : ''].filter(Boolean).join(' · ');
      return `
        <a class="game" href="https://kick.com/category/${encodeURIComponent(c.slug || '')}" target="_blank" rel="noopener">
          <span class="game__art">${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : icon('gamepad')}</span>
          <span class="game__body">
            <b>${esc(c.name)}</b>
            <span class="game__meta">${esc(meta)}</span>
            ${(c.tags || []).slice(0, 3).map((t) => `<i class="tag">${esc(t)}</i>`).join('')}
          </span>
        </a>`;
    }).join('');
  }

  function renderSchedule() {
    const items = (CFG.schedule || []).filter((s) => s && (s.day || s.time));
    $('#cardSchedule').hidden = !items.length;
    const today = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date().getDay()];
    $('#scheduleList').innerHTML = items.map((s) => `
      <li class="${String(s.day || '').includes(today) ? 'is-today' : ''}">
        <b>${esc(s.day)}</b>
        <span class="num">${esc(s.time)}</span>
        <span>${esc(s.title)}</span>
      </li>`).join('');
  }

  // ─── איך עוזרים + סטיקרים ───────────────────────────────────────────
  function renderSteps() {
    const links = collectLinks();
    const discord = links.find(([p]) => p === 'discord')?.[1];
    const tip = links.find(([p]) => p === 'tip')?.[1];
    const channel = YT_URL || KICK;
    // צ׳אט רק לערוץ שעושה לייבים. בלי לייבים: תגובות
    const streams = KICK || state.items.some((v) => v.type === 'live');
    // צעדים נוספים מ-config (support.steps)
    const extra = (CFG.support?.steps || []).filter((s) => s?.title).map((s) => {
      const href = safeUrl(s.href);
      return { icon: ICONS.has(s.icon) ? s.icon : 'star', title: s.title, text: s.text || '', cta: href ? s.cta || 'לפרטים' : '', href };
    });
    const steps = [
      YT_URL && { icon: 'youtube', title: 'נרשמים ביוטיוב', text: TXT.stepSubscribe, cta: 'להרשמה', href: HREFS.ytSub },
      KICK && { icon: 'kick', title: 'עוקבים ב-Kick', text: 'הלייבים עולים גם שם, עם צ׳אט בזמן אמת.', cta: 'לעקוב', href: KICK },
      ...extra,
      streams
        ? { icon: 'chat', title: 'כותבים בצ׳אט', text: TXT.stepChat }
        : { icon: 'chat', title: 'כותבים תגובה', text: TXT.stepComment },
      channel && { icon: 'share', title: 'משתפים סרטון', text: TXT.stepShare, cta: SNAP ? 'להעתיק את הקישור לערוץ' : 'לשתף את האתר', share: true },
      discord && { icon: 'discord', title: 'מצטרפים לדיסקורד', text: TXT.stepDiscord, cta: 'להצטרפות', href: discord },
      tip && { icon: 'gift', title: 'תורמים לערוץ', text: TXT.stepTip, cta: 'לתרומה', href: tip },
    ].filter(Boolean);

    $('#steps').innerHTML = steps.map((s, i) => `
      <li class="step">
        <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="card__icon">${icon(s.icon)}</span>
        <div class="step__body">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>
          ${s.share ? `<button class="link-arrow step__share" type="button"><span>${esc(s.cta)}</span> ${icon('share')}</button><output class="step__copy" hidden></output>`
            : s.href ? `<a class="link-arrow" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.cta)} ${icon('arrow')}</a>` : ''}
        </div>
      </li>`).join('');

    const share = $('.step__share');
    share?.addEventListener('click', async () => {
      const label = $('span', share);
      const out = $('.step__copy');
      // בתוך Claude הכתובת של הדף היא לא הקישור לשיתוף, אז מעתיקים את הקישור לערוץ
      const url = SNAP ? channel : location.href.split('#')[0];
      try {
        if (!SNAP && navigator.share) { await navigator.share({ title: document.title, url }); return; }
        await navigator.clipboard.writeText(url);
        label.textContent = 'הקישור הועתק!';
      } catch {
        out.textContent = url;          // אם אי אפשר להעתיק, מציגים את הקישור לסימון ידני
        out.hidden = false;
      }
    });
  }

  function renderStickers() {
    const list = CFG.stickers || [];
    $('#stickerBlock').hidden = !list.length;
    $('#stickerHint').hidden = !!SNAP;
    $('#stickerGrid').innerHTML = list.map((s) => {
      const src = esc(sticker(s.file));
      const inner = `<img src="${src}" alt="${esc(s.he)}" loading="lazy"><span class="sticker-card__name">${esc(s.name)}</span>`;
      // הורדה לא עובדת בתוך Claude, אז שם הסטיקרים רק מוצגים
      return SNAP
        ? `<li><span class="sticker-card" title="${esc(s.he)}">${inner}</span></li>`
        : `<li><a class="sticker-card" href="${src}" download="${esc(`${String(CFG.name || 'sticker').toLowerCase()}-${s.name.toLowerCase()}.png`)}" title="${esc(`${s.he}. לחצו להורדה`)}">${inner}<span class="sticker-card__dl">${icon('download')}</span></a></li>`;
    }).join('');
  }

  // ─── ניווט ──────────────────────────────────────────────────────────
  function setupNav() {
    const nav = $('#nav');
    const burger = $('#burger');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    };
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    $$('#navLinks a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });

    if (!('IntersectionObserver' in window)) return;
    const links = new Map($$('#navLinks a').map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-active'));
        links.get(e.target.id)?.classList.add('is-active');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // ─── טעינה ──────────────────────────────────────────────────────────
  function renderNumbers() {
    renderHeroStats();
    renderFacts();
    renderGoals();
  }

  function renderItems() {
    renderVideos();
    renderTop();
    renderLast();
    renderScreen();
  }

  async function loadYouTube() {
    if (SNAP) return;
    try {
      if (await loadYouTubeFeed()) renderItems();
    } catch (err) { console.warn('[site] YouTube feed:', err); }

    if (YTC.apiKey && YTC.channelId) {
      try {
        await loadYouTubeApi();
        renderItems();
        renderNumbers();
        applyLive();
      } catch (err) { console.warn('[site] YouTube API:', err); }
    }
  }

  function onKickChannel() {
    renderImages();
    renderNumbers();
    renderGames();
    renderLinks();
    renderSteps();
  }

  async function loadKick() {
    if (!KICK_SLUG) return;
    if (SNAP) {
      state.kick = SNAP.kick || null;
      if (state.kick) onKickChannel();
      return;
    }
    getJSON(`${KICK_API}/clips?sort=date&time=all`)
      .then((r) => {
        state.clips = (r?.clips || []).filter((c) => c?.id && c.privacy !== 'private');
        renderVideos();
      })
      .catch(() => {});

    getJSON(`${KICK_API}/videos`)
      .then((v) => { addKickVods(Array.isArray(v) ? v : []); renderItems(); })
      .catch(() => {});

    try {
      state.kick = await getJSON(KICK_API);
    } catch (err) {
      console.warn('[site] Kick:', err);
      return;
    }
    onKickChannel();
    state.kickLive = normKickLive(state.kick.livestream);
    applyLive();
    if (state.kickLive) pollKick(); // תמונה ממוזערת ונתונים עדכניים של הלייב

    setInterval(pollKick, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollKick(); });
  }

  // קישור עם #links / #videos וכו' קופץ לאזור. התוכן שמעליו נבנה אחרי הטעינה ומזיז אותו,
  // אז קופצים שוב כשהכול במקום, כל עוד המבקר עוד לא גלל בעצמו
  function followHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = /^[\w-]+$/.test(id) && document.getElementById(id);
    if (!target) return;
    let userMoved = false;
    const stop = () => { userMoved = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => addEventListener(ev, stop, { once: true, passive: true }));
    const jump = () => { if (!userMoved) target.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    requestAnimationFrame(jump);
    document.fonts?.ready.then(jump);
    addEventListener('load', jump, { once: true });
    setTimeout(jump, 1500); // אחרי שהנתונים מ-Kick ומיוטיוב נכנסו
  }

  function init() {
    applyTheme();
    renderTears();
    loadBakedYouTube();
    renderStatic();
    renderLinks();
    renderGames();
    renderNumbers();
    renderItems();
    setupNav();
    setupVideos();
    setupPlayer();
    applyLive();
    loadYouTube();
    loadKick();
    followHash();
    // בתוך Claude ה-# מגיע לדף רק אחרי שהוא נטען
    addEventListener('hashchange', followHash);
  }

  init();
})();
