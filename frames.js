/* =========================================================
   FRAMES — bingkai dilukis dengan HTML Canvas
   Semua koordinat dalam ruang output 1080 x 1440.
   ========================================================= */
(function () {
  const W = 1080, H = 1440, TAU = Math.PI * 2;
  const C = {
    cream: '#f6ecdc', creamDeep: '#efe2c9', ink: '#6e1628',
    gold: '#c9a35a', goldText: '#d8b46a', goldDark: '#9a7330', hole: '#5c1220'
  };

  // Ruang gambar (window) bagi setiap bingkai
  const FRAMES = {
    renda:    { label: 'Renda',    win: { shape: 'arch',    x: 220, y: 210, w: 640, h: 790 } },
    emas:     { label: 'Emas',     win: { shape: 'ellipse', x: 250, y: 225, w: 580, h: 780 } },
    polaroid: { label: 'Polaroid', win: { shape: 'rect',    x: 180, y: 200, w: 720, h: 850, rot: -2.5 } },
    asli:     { label: 'Asli',     win: { shape: 'rect',    x: 0,   y: 0,   w: W,   h: H } }
  };

  /* ---------- util ---------- */
  function rng(seed) { // mulberry32 — corak bunga sama setiap kali
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function archPath(ctx, x, y, w, h) {
    const r = w / 2;
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h); ctx.closePath();
  }
  function archPoints(x, y, w, h, step) {
    const r = w / 2, side = h - r, arc = Math.PI * r;
    const total = side * 2 + arc + w, n = Math.max(1, Math.round(total / step)), pts = [];
    for (let i = 0; i < n; i++) {
      let d = i * total / n;
      if (d < side) { pts.push([x, y + h - d]); continue; } d -= side;
      if (d < arc) { const a = Math.PI + d / r; pts.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]); continue; } d -= arc;
      if (d < side) { pts.push([x + w, y + r + d]); continue; } d -= side;
      pts.push([x + w - d, y + h]);
    }
    return pts;
  }

  function winTransform(ctx, win) {
    if (!win.rot) return;
    const cx = win.x + win.w / 2, cy = win.y + win.h / 2;
    ctx.translate(cx, cy); ctx.rotate(win.rot * Math.PI / 180); ctx.translate(-cx, -cy);
  }
  function winPath(ctx, win) {
    ctx.beginPath();
    if (win.shape === 'arch') archPath(ctx, win.x, win.y, win.w, win.h);
    else if (win.shape === 'ellipse') ctx.ellipse(win.x + win.w / 2, win.y + win.h / 2, win.w / 2, win.h / 2, 0, 0, TAU);
    else ctx.rect(win.x, win.y, win.w, win.h);
  }
  function clipWindow(ctx, win) { winTransform(ctx, win); winPath(ctx, win); ctx.clip(); }

  function cells(win, n) {
    const g = 12, { x, y, w, h } = win;
    if (n === 1) return [{ x, y, w, h }];
    if (n === 2) { const ch = (h - g) / 2; return [{ x, y, w, h: ch }, { x, y: y + ch + g, w, h: ch }]; }
    const cw = (w - g) / 2, ch = (h - g) / 2;
    return [
      { x, y, w: cw, h: ch }, { x: x + cw + g, y, w: cw, h: ch },
      { x, y: y + ch + g, w: cw, h: ch }, { x: x + cw + g, y: y + ch + g, w: cw, h: ch }
    ];
  }

  function drawCover(ctx, src, sw, sh, dx, dy, dw, dh) {
    const s = Math.max(dw / sw, dh / sh), w = dw / s, h = dh / s;
    ctx.drawImage(src, (sw - w) / 2, (sh - h) / 2, w, h, dx, dy, dw, dh);
  }

  function background(ctx) {
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.85);
    g.addColorStop(0, '#76192b'); g.addColorStop(1, '#3a0911');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function fitFont(ctx, text, family, size, maxW, weight = '') {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 18);
  }
  function spaced(ctx, text, cx, y, spacing) {
    const chars = [...text], widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing; });
    ctx.textAlign = 'center';
  }
  const SCRIPT = '"Pinyon Script", "Snell Roundhand", cursive';
  const SERIF = '"Cormorant Garamond", Georgia, serif';
  const names = cfg => `${cfg.groom} & ${cfg.bride}`;

  /* ---------- bunga ---------- */
  function petal(ctx, len, wid) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.3, wid * 0.8, -len * 0.95, 0, -len);
    ctx.bezierCurveTo(-wid * 0.8, -len * 0.95, -wid, -len * 0.3, 0, 0);
  }
  const PAL = {
    white: { inner: '#ffffff', outer: '#ece2e2', lip: '#e9a8ba', center: '#d9a441' },
    pink:  { inner: '#f7c3dd', outer: '#c2307a', lip: '#7d1846', center: '#f3d36b' },
    blush: { inner: '#fde9ee', outer: '#e7a3b6', lip: '#b9476d', center: '#e8be5a' }
  };
  function orchid(ctx, x, y, s, rot, pal) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    const fill = len => { const g = ctx.createRadialGradient(0, 0, 2, 0, -len * .5, len); g.addColorStop(0, pal.inner); g.addColorStop(1, pal.outer); return g; };
    for (const a of [0, 2.35, -2.35]) { ctx.save(); ctx.rotate(a); petal(ctx, 46, 12); ctx.fillStyle = fill(46); ctx.fill(); ctx.restore(); }
    for (const a of [1.2, -1.2]) { ctx.save(); ctx.rotate(a); petal(ctx, 42, 25); ctx.fillStyle = fill(42); ctx.fill(); ctx.restore(); }
    ctx.shadowColor = 'transparent';
    ctx.save(); ctx.rotate(Math.PI); petal(ctx, 22, 13); ctx.fillStyle = pal.lip; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, -2, 5, 0, TAU); ctx.fillStyle = pal.center; ctx.fill();
    ctx.restore();
  }
  function leaf(ctx, x, y, len, wid, ang, dark = '#2f5a35', light = '#6f9a5a') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(-wid, 0, wid, -len); g.addColorStop(0, dark); g.addColorStop(1, light);
    petal(ctx, len, wid); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(wid * .15, -len * .5, 0, -len * .95);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function plume(ctx, x, y, len, ang, col, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    for (let i = 0; i < 90; i++) {
      const t = r(), spread = (1 - t) * len * 0.16;
      ctx.beginPath();
      ctx.arc((r() - .5) * 2 * spread, -t * len, 1.5 + r() * 2.8, 0, TAU);
      ctx.fillStyle = col; ctx.globalAlpha = .55 + r() * .45; ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function bud(ctx, x, y, s, col) {
    ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 10 * s, 0.4, 0, TAU);
    const g = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10 * s); g.addColorStop(0, '#e8f0c8'); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
  }
  function bouquet(ctx, x, y, s, rot, kind = 'pink', seed = 7) {
    const r = rng(seed);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    for (let i = 0; i < 6; i++) leaf(ctx, (r() - .5) * 40, (r() - .5) * 30, 80 + r() * 50, 18 + r() * 10, -1.6 + i * 0.62 + r() * .2);
    if (kind === 'pink') {
      plume(ctx, 20, -10, 150, -0.35, '#d94f92', r);
      plume(ctx, -30, 0, 120, -1.1, '#e985b9', r);
      plume(ctx, 40, 10, 110, 0.9, '#c43d7f', r);
    }
    const pals = kind === 'pink' ? ['pink', 'pink', 'white', 'blush'] : ['white', 'white', 'blush', 'white'];
    const pos = [[0, 0], [-46, 26], [42, 30], [8, 54]];
    pos.forEach(([px, py], i) => orchid(ctx, px, py, 0.95 - i * 0.08, r() * 1.2 - .6, PAL[pals[i]]));
    bud(ctx, -70, -30, 1, '#97b26b'); bud(ctx, 64, -40, .8, '#97b26b'); bud(ctx, -20, -70, .7, '#a9c07a');
    ctx.restore();
  }
  function butterfly(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#fbf6ec'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 4;
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(d * 12, -8, 13, 18, d * 0.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(d * 9, 10, 8, 11, d * -0.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(-1.5, -14, 3, 28);
    ctx.restore();
  }
  function pearls(ctx, pts, r0 = 7) {
    pts.forEach(([x, y], i) => {
      const r = r0 * (0.75 + 0.25 * Math.sin(i * 1.3));
      const g = ctx.createRadialGradient(x - r * .4, y - r * .4, 0.5, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#efe6da'); g.addColorStop(1, '#b8aa98');
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    });
  }

  /* ---------- bingkai emas ---------- */
  function goldGrad(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    [[0, '#7a5212'], [.16, '#e9c56b'], [.3, '#fff0b3'], [.46, '#b98a2e'], [.6, '#f4d27c'], [.78, '#8f6219'], [1, '#e8c46a']]
      .forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  function ell(ctx, cx, cy, rx, ry) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); }
  function goldOval(ctx, cx, cy, rx, ry, th) {
    const G = goldGrad(ctx, cx - rx - th, cy - ry - th, cx + rx + th, cy + ry + th);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 14;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + th, ry + th, 0, 0, TAU); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.fillStyle = G; ctx.fill('evenodd');
    ctx.restore();
    const ring = (k, col, lw, a = 1) => { ell(ctx, cx, cy, rx + th * k, ry + th * k); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = a; ctx.stroke(); ctx.globalAlpha = 1; };
    ring(0.97, '#5e3d0c', 4); ring(0.66, '#fff3c4', 3, .8); ring(0.58, '#6b4510', 2, .6);
    ring(0.12, '#fff3c4', 2, .7); ring(0.02, '#4d3209', 6, .9);
    // manik
    const beads = 72;
    for (let i = 0; i < beads; i++) {
      const a = i / beads * TAU, x = cx + Math.cos(a) * (rx + th * .32), y = cy + Math.sin(a) * (ry + th * .32), br = th * .085;
      const g = ctx.createRadialGradient(x - br * .4, y - br * .4, 0.5, x, y, br);
      g.addColorStop(0, '#fff6cf'); g.addColorStop(.5, '#d7ad55'); g.addColorStop(1, '#6b4510');
      ctx.beginPath(); ctx.arc(x, y, br, 0, TAU); ctx.fillStyle = g; ctx.fill();
    }
    // daun akantus
    const lv = 44;
    for (let i = 0; i < lv; i++) {
      const a = i / lv * TAU, x = cx + Math.cos(a) * (rx + th * .82), y = cy + Math.sin(a) * (ry + th * .82);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + 0.6);
      petal(ctx, th * .34, th * .11);
      ctx.fillStyle = goldGrad(ctx, -10, -th * .34, 10, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(80,50,10,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    // hiasan utama atas/bawah/kiri/kanan
    [[-Math.PI / 2, 1.25], [Math.PI / 2, 1.05], [0, .8], [Math.PI, .8]].forEach(([a, k]) => {
      const x = cx + Math.cos(a) * (rx + th * .55), y = cy + Math.sin(a) * (ry + th * .55);
      cartouche(ctx, x, y, th * k, a + Math.PI / 2);
    });
  }
  function cartouche(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const G = goldGrad(ctx, -s, -s, s, s);
    for (let i = -3; i <= 3; i++) { // kipas kerang
      ctx.save(); ctx.rotate(i * 0.32); petal(ctx, s * .75, s * .16); ctx.fillStyle = G; ctx.fill();
      ctx.strokeStyle = 'rgba(80,50,10,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = s * .09; ctx.strokeStyle = G; ctx.lineCap = 'round';
    for (const d of [-1, 1]) { // skrol C
      ctx.beginPath(); ctx.arc(d * s * .5, s * .05, s * .22, d > 0 ? Math.PI * .9 : -Math.PI * .1, d > 0 ? Math.PI * 2.4 : Math.PI * 1.4); ctx.stroke();
    }
    const g = ctx.createRadialGradient(-s * .05, -s * .1, 1, 0, 0, s * .2);
    g.addColorStop(0, '#fff6cf'); g.addColorStop(1, '#8a5e17');
    ctx.beginPath(); ctx.arc(0, 0, s * .18, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }

  /* ---------- lapisan bingkai ---------- */
  function cutWindow(ctx, win) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; winTransform(ctx, win); winPath(ctx, win); ctx.fill(); ctx.restore();
  }

  function overlayRenda(ctx, cfg) {
    const win = FRAMES.renda.win;
    background(ctx); cutWindow(ctx, win);
    // renda
    const L = mk(), l = L.getContext('2d');
    l.fillStyle = C.cream; l.beginPath(); archPath(l, 165, 155, 750, 1090); l.fill();
    for (const [px, py] of archPoints(165, 155, 750, 1090, 34)) { l.beginPath(); l.arc(px, py, 22, 0, TAU); l.fill(); }
    l.globalCompositeOperation = 'destination-out'; l.beginPath(); archPath(l, 220, 210, 640, 980); l.fill();
    l.globalCompositeOperation = 'source-atop'; l.fillStyle = C.hole;
    for (let y = 100, row = 0; y < 1300; y += 22, row++)
      for (let x = (row % 2) * 11 + 120; x < 960; x += 22) { l.beginPath(); l.arc(x, y, 6, 0, TAU); l.fill(); }
    l.fillStyle = C.cream;
    for (const [px, py] of archPoints(193, 183, 694, 1034, 30)) { l.beginPath(); l.arc(px, py, 11, 0, TAU); l.fill(); }
    l.fillStyle = C.hole;
    for (const [px, py] of archPoints(193, 183, 694, 1034, 30)) { l.beginPath(); l.arc(px, py, 4, 0, TAU); l.fill(); }
    for (const [px, py] of archPoints(165, 155, 750, 1090, 34)) { l.beginPath(); l.arc(px, py, 7, 0, TAU); l.fill(); }
    l.beginPath(); archPath(l, 210, 200, 660, 1000); l.strokeStyle = '#7a1a2d'; l.lineWidth = 16; l.stroke();
    l.fillStyle = '#f0dcc8';
    for (const [px, py] of archPoints(210, 200, 660, 1000, 13)) { l.beginPath(); l.arc(px, py, 2.6, 0, TAU); l.fill(); }
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.drawImage(L, 0, 0); ctx.restore();
    // panel nama
    ctx.fillStyle = C.creamDeep; ctx.fillRect(220, 1000, 640, 190);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    fitFont(ctx, names(cfg), SCRIPT, 78, 580); ctx.fillText(names(cfg), 540, 1105);
    ctx.fillStyle = C.goldDark; ctx.font = `600 26px ${SERIF}`; spaced(ctx, cfg.dateShort, 540, 1152, 4);
    // hiasan
    bouquet(ctx, 230, 215, 1.05, -0.5, 'white', 11);
    const pts = []; for (let t = 0; t <= 1; t += 0.035) pts.push([890 + Math.sin(t * 7) * 26, 760 + t * 360]);
    pearls(ctx, pts, 8);
    ctx.fillStyle = C.goldText; ctx.font = `500 30px ${SERIF}`; ctx.fillText(cfg.hashtag, 540, 1370);
  }

  function overlayEmas(ctx, cfg) {
    const win = FRAMES.emas.win, cx = win.x + win.w / 2, cy = win.y + win.h / 2;
    background(ctx); cutWindow(ctx, win);
    goldOval(ctx, cx, cy, win.w / 2, win.h / 2, 82);
    bouquet(ctx, 900, 210, 1.15, 0.3, 'pink', 3);
    bouquet(ctx, 190, 1030, 1.15, -2.6, 'pink', 21);
    butterfly(ctx, 935, 760, 1.1, 0.4);
    ctx.textAlign = 'center'; ctx.fillStyle = C.cream;
    fitFont(ctx, names(cfg), SCRIPT, 100, 900); ctx.fillText(names(cfg), 540, 1255);
    ctx.fillStyle = C.goldText; ctx.font = `600 28px ${SERIF}`; spaced(ctx, cfg.dateShort, 540, 1320, 5);
    ctx.font = `500 26px ${SERIF}`; ctx.globalAlpha = .8; ctx.fillText(cfg.hashtag, 540, 1385); ctx.globalAlpha = 1;
  }

  function overlayPolaroid(ctx, cfg) {
    const win = FRAMES.polaroid.win;
    background(ctx);
    ctx.save(); winTransform(ctx, win);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#fbf7ef'; ctx.fillRect(140, 160, 800, 1140);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.ink; ctx.textAlign = 'center';
    fitFont(ctx, names(cfg), SCRIPT, 86, 720); ctx.fillText(names(cfg), 540, 1175);
    ctx.fillStyle = C.goldDark; ctx.font = `600 26px ${SERIF}`; spaced(ctx, cfg.dateShort, 540, 1235, 5);
    for (const [x, r] of [[200, -0.6], [880, 0.6]]) { // pita pelekat
      ctx.save(); ctx.translate(x, 165); ctx.rotate(r);
      ctx.fillStyle = 'rgba(232,214,180,.82)'; ctx.fillRect(-70, -22, 140, 44);
      ctx.restore();
    }
    ctx.restore();
    cutWindow(ctx, win);
    bouquet(ctx, 915, 1180, 0.9, 2.5, 'white', 5);
    ctx.fillStyle = C.goldText; ctx.font = `500 28px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(cfg.hashtag, 540, 1395);
  }

  function overlayAsli(ctx, cfg) {
    const g = ctx.createLinearGradient(0, 1050, 0, H);
    g.addColorStop(0, 'rgba(40,5,12,0)'); g.addColorStop(1, 'rgba(40,5,12,.8)');
    ctx.fillStyle = g; ctx.fillRect(0, 1050, W, H - 1050);
    ctx.textAlign = 'center'; ctx.fillStyle = C.cream;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 10;
    fitFont(ctx, names(cfg), SCRIPT, 80, 900); ctx.fillText(names(cfg), 540, 1330);
    ctx.fillStyle = C.goldText; ctx.font = `600 26px ${SERIF}`; spaced(ctx, cfg.dateShort, 540, 1388, 5);
    ctx.shadowColor = 'transparent';
  }

  const DRAW = { renda: overlayRenda, emas: overlayEmas, polaroid: overlayPolaroid, asli: overlayAsli };
  const cache = {};

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  async function overlay(key, cfg) {
    if (cache[key]) return cache[key];
    const c = mk(), ctx = c.getContext('2d');
    const custom = cfg.frameImages && cfg.frameImages[key];
    if (custom) {
      try { ctx.drawImage(await loadImg(custom), 0, 0, W, H); return (cache[key] = c); }
      catch (e) { console.warn('Bingkai PNG gagal dimuat, guna bingkai terbina:', custom); }
    }
    DRAW[key](ctx, cfg);
    return (cache[key] = c);
  }

  // Bingkai bujur emas untuk laman utama
  function homeOval(canvas, cfg) {
    canvas.width = 640; canvas.height = 800;
    const ctx = canvas.getContext('2d'), cx = 320, cy = 395, rx = 215, ry = 300;
    const g = ctx.createRadialGradient(cx, cy - 60, 20, cx, cy, ry);
    g.addColorStop(0, '#6d1526'); g.addColorStop(1, '#4a0c18');
    ell(ctx, cx, cy, rx, ry); ctx.fillStyle = g; ctx.fill();
    goldOval(ctx, cx, cy, rx, ry, 64);
    const tg = ctx.createLinearGradient(0, 280, 0, 500);
    tg.addColorStop(0, '#f3d98c'); tg.addColorStop(.5, '#c9a35a'); tg.addColorStop(1, '#e8c46a');
    ctx.fillStyle = tg; ctx.textAlign = 'center';
    fitFont(ctx, cfg.groom, SCRIPT, 92, 360); ctx.fillText(cfg.groom, cx, cy - 50);
    ctx.font = `64px ${SCRIPT}`; ctx.fillText('&', cx, cy + 20);
    fitFont(ctx, cfg.bride, SCRIPT, 92, 360); ctx.fillText(cfg.bride, cx, cy + 110);
    bouquet(ctx, 560, 560, 1.0, 0.5, 'pink', 9);
    bouquet(ctx, 70, 640, 0.75, -0.9, 'white', 13);
  }

  window.Frames = {
    W, H, list: FRAMES, keys: Object.keys(FRAMES),
    win: key => FRAMES[key].win, cells, clipWindow, drawCover, overlay, homeOval,
    clearCache: () => { for (const k in cache) delete cache[k]; }
  };
})();
