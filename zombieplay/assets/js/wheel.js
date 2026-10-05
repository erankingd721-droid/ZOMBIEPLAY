// גלגל הזומבי – page for the site.
// The tasks here are the same as the live StreamElements widget (Desktop\zombie-wheel\fields.json).
// Changing a task? change it in both places.
(() => {
  const TASKS = [
    ['בלי שריון', 'מורידים את כל השריון ומשחקים ככה', 5],
    ['מדברים כמו זומבי', 'מדברים רק כמו זומבי: אררר... מוחות...', 2],
    ['ביי ביי לנשק', 'זורקים את הנשק הכי טוב שלך ולא מרימים אותו', 0],
    ['רק אגרופים', 'בלי נשק ובלי כלים ביד, רק ידיים', 3],
    ["הצ'אט בוחר", "הצ'אט מחליט מה המשימה (בלי משהו שהורג מיד!)", 0],
    ['אסור לקפוץ', 'לא נוגעים במקש הקפיצה', 5],
    ['הולכים אחורה', 'זזים רק אחורה, אסור ללכת קדימה', 2],
    ['בלי ממשק', 'מכבים את הממשק עם F1, בלי לבבות ובלי מלאי על המסך', 3],
    ['בשר רקוב', 'אוכלים חתיכת בשר רקוב, כמו זומבי אמיתי', 0],
    ['שיר זומבים', "שרים לצ'אט שיר על זומבים, לפחות 30 שניות", 0],
    ['ריקוד מביך', "רוקדים מול המצלמה חצי דקה, הצ'אט שופט", 0],
    ['עכבר מטורף', 'מעלים את רגישות העכבר למקסימום', 3],
    ['עין של דג', 'מעלים את שדה הראייה (FOV) למקסימום', 5],
    ['שומר לילה', 'בלילה הבא עומדים בחוץ דקה וחצי עם לפיד ביד', 1.5],
    ['חצי מהאוכל', 'זורקים חצי מכל האוכל שיש לך במלאי', 0],
    ['זריקה עיוורת', 'עוצמים עיניים ולוחצים Q עשר פעמים במלאי', 0],
    ['בית מאדמה', 'הבית הבא נבנה רק מאדמה, וישנים בו הלילה', 0],
    ['מבטא מצחיק', "מדברים במבטא שהצ'אט בוחר", 5],
    ['שתיקה', "אסור לדבר, עונים לצ'אט רק בהקלדה", 3],
    ['סיבוב כפול!', 'מסובבים שוב ומבצעים את שתי המשימות', 'x2']
  ];
  const COLORS = ['#5d9b3a','#8b5a2b','#7f7f7f','#2f52a8','#e0b52c','#b3261e','#3fbfb8','#a8834e','#7a45b0','#d9822b','#3d3d3d','#e05aa0'];
  const TAU = Math.PI * 2;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const timeText = m => m === 'x2' ? '🔁 עוד סיבוב' : !m ? '' : m === 1 ? '⏱ דקה' : m < 1 ? `⏱ ${m * 60} שניות` : `⏱ ${m} דקות`;

  // ---------- tasks list ----------
  $('#wTasks').innerHTML = TASKS.map(([s, d, m], i) => `
    <li class="w-task">
      <span class="w-sw" style="background:${COLORS[i % COLORS.length]}"></span>
      <div><b>${esc(s)}</b><p>${esc(d)}</p></div>
      ${m ? `<span class="w-time">${timeText(m)}</span>` : ''}
    </li>`).join('');

  // ---------- wheel ----------
  const cv = $('#wCanvas'), ctx = cv.getContext('2d');
  let angle = 0, spinning = false, last = -1, ac = null;

  const noise = (() => {
    const S = 1000, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'); let seed = 42; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let y = 0; y < S; y += 25) for (let i = 0; i < S; i += 25) {
      const v = r();
      if (v < .35) x.fillStyle = `rgba(0,0,0,${.08 + r() * .18})`; else if (v > .75) x.fillStyle = `rgba(255,255,255,${.06 + r() * .14})`; else continue;
      x.fillRect(i, y, 25, 25);
    }
    return c;
  })();

  function draw() {
    const S = cv.width, C = S / 2, n = TASKS.length, R = C * 0.9, r = R * 0.9, seg = TAU / n;
    ctx.clearRect(0, 0, S, S); ctx.save(); ctx.translate(C, C + 20);
    ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = '#6b4a25'; ctx.fill();
    ctx.save(); ctx.rotate(angle);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.drawImage(noise, -C, -C); ctx.restore();
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, x = Math.cos(a) * (R + r) / 2, y = Math.sin(a) * (R + r) / 2;
      ctx.fillStyle = '#000'; ctx.fillRect(x - 11, y - 11, 22, 22); ctx.fillStyle = '#e0b52c'; ctx.fillRect(x - 7, y - 7, 14, 14);
    }
    ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    for (let i = 0; i < n; i++) {
      const a0 = i * seg - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + seg); ctx.closePath(); ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); ctx.drawImage(noise, -C, -C); ctx.restore();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 8;
    for (let i = 0; i < n; i++) { const a = i * seg - Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
    ctx.font = '800 31px Rubik, sans-serif'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    for (let i = 0; i < n; i++) {
      let t = TASKS[i][0]; const maxW = r * 0.66;
      if (ctx.measureText(t).width > maxW) { while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); t += '…'; }
      const a = i * seg - Math.PI / 2 + seg / 2;
      ctx.save(); ctx.rotate(a);
      if (Math.cos(a + angle) < 0) { ctx.rotate(Math.PI); ctx.textAlign = 'left'; } else ctx.textAlign = 'right';
      const x = ctx.textAlign === 'left' ? -(r - 28) : r - 28;
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(t, x + 4, 4); ctx.fillStyle = '#fff'; ctx.fillText(t, x, 0);
      ctx.restore();
    }
    ctx.restore();
    const h = 70;
    ctx.fillStyle = '#000'; ctx.fillRect(-h - 8, -h - 8, (h + 8) * 2, (h + 8) * 2);
    ctx.fillStyle = '#e0b52c'; ctx.fillRect(-h, -h, h * 2, h * 2);
    ctx.fillStyle = '#fff3a0'; ctx.fillRect(-h, -h, h * 2, 12); ctx.fillRect(-h, -h, 12, h * 2);
    ctx.fillStyle = '#a57a14'; ctx.fillRect(-h, h - 12, h * 2, 12); ctx.fillRect(h - 12, -h, 12, h * 2);
    ctx.fillStyle = '#c99a1e'; ctx.fillRect(-30, -30, 24, 24); ctx.fillRect(10, 6, 24, 24); ctx.fillRect(-20, 22, 16, 16);
    const p = 16, rows = [7, 7, 5, 5, 3, 3, 1], top = -R - 50;
    rows.forEach((w, k) => { ctx.fillStyle = '#000'; ctx.fillRect(-(w / 2) * p - 6, top + k * p - 6, w * p + 12, p + 12); });
    rows.forEach((w, k) => { ctx.fillStyle = k < 2 ? '#ff5a4a' : '#b3261e'; ctx.fillRect(-(w / 2) * p, top + k * p, w * p, p); });
    ctx.restore();
  }

  function beep(f, at, len, g) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime + at;
      o.type = 'square'; o.frequency.value = f; gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + len + .02);
    } catch (e) {}
  }
  const idxAt = a => Math.floor((((-a) % TAU) + TAU) % TAU / (TAU / TASKS.length));

  function spin() {
    if (spinning) return;
    spinning = true; $('#wSpin').disabled = true; $('#wResult').hidden = true;
    const n = TASKS.length, seg = TAU / n;
    let k = Math.floor(Math.random() * n); if (k === last) k = (k + 1 + Math.floor(Math.random() * (n - 1))) % n; last = k;
    const base = -(k + .15 + Math.random() * .7) * seg, start = angle;
    const end = base + TAU * Math.ceil((start + TAU * 6 - base) / TAU), dur = 5000, t0 = performance.now();
    let cur = idxAt(start);
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      angle = start + (end - start) * (1 - Math.pow(1 - p, 4)); draw();
      const i = idxAt(angle); if (i !== cur) { cur = i; beep(660 + Math.random() * 80, 0, .05, .05); }
      if (p < 1) return requestAnimationFrame(step);
      angle = end % TAU; spinning = false; $('#wSpin').disabled = false;
      [523, 784, 1046].forEach((f, j) => beep(f, j * .09, .2, .07));
      const [s, d, m] = TASKS[k];
      $('#wResTitle').textContent = s; $('#wResText').textContent = d; $('#wResTime').textContent = timeText(m);
      $('#wResSw').style.background = COLORS[k % COLORS.length];
      $('#wResult').hidden = false;
    };
    requestAnimationFrame(step);
  }

  $('#wSpin').addEventListener('click', spin);
  draw();
  if (document.fonts) document.fonts.ready.then(draw);
})();
