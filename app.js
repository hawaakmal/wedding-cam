/* =========================================================
   KAMERA MAJLIS — aplikasi utama
   ========================================================= */
(function () {
  const CFG = window.MAJLIS;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const NAMES = `${CFG.groom} & ${CFG.bride}`;
  const NS = 'km:' + location.pathname + ':';   // GitHub Pages kongsi origin — asingkan setiap projek
  const REMOTE = !!CFG.APPS_SCRIPT_URL;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg, ms = 2800) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* =========================================================
     MUZIK — Web Audio API
     ========================================================= */
  const Music = {
    ctx: null, gain: null, buf: null, src: null, synth: null, loading: null,
    offset: 0, startedAt: 0, playing: false, wanted: false,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.ctx.destination);
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS: main walaupun suis senyap
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    load() {
      if (!this.loading) {
        this.loading = fetch(CFG.music)
          .then(r => { if (!r.ok) throw new Error('tiada lagu'); return r.arrayBuffer(); })
          .then(a => new Promise((res, rej) => this.ctx.decodeAudioData(a, res, rej)))
          .then(b => { this.buf = b; })
          .catch(() => { this.buf = null; });
      }
      return this.loading;
    },
    ramp(to, secs) {
      const g = this.gain.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + secs);
    },
    async play() {
      if (!this.ensure()) return;
      this.wanted = true; this.ui();
      await this.load();
      if (!this.wanted || this.playing) return;
      this.ramp(CFG.musicVolume ?? 0.7, 1.2);
      if (this.buf) {
        const s = this.ctx.createBufferSource();
        s.buffer = this.buf; s.loop = true; s.connect(this.gain);
        const off = this.offset % this.buf.duration;
        s.start(0, off); this.startedAt = this.ctx.currentTime - off; this.src = s;
      } else {
        this.synth = musicBox(this.ctx, this.gain);
      }
      this.playing = true;
    },
    pause() {
      this.wanted = false; this.ui();
      if (!this.playing) return;
      this.ramp(0, 0.4);
      if (this.buf) this.offset = this.ctx.currentTime - this.startedAt;
      const src = this.src, syn = this.synth;
      setTimeout(() => { try { src && src.stop(); } catch (e) {} syn && syn.stop(); }, 450);
      this.src = this.synth = null; this.playing = false;
    },
    toggle() { this.wanted ? this.pause() : this.play(); },
    ui() { $$('.vinyl').forEach(v => v.classList.toggle('is-playing', this.wanted)); },
    blip(freq = 880, dur = 0.12, vol = 0.18) {
      const ctx = this.ensure(); if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    },
    shutter() {
      const ctx = this.ensure(); if (!ctx) return;
      const len = ctx.sampleRate * 0.09, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = 0.35;
      s.buffer = b; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    }
  };

  // Lagu kotak muzik ringkas (digunakan jika assets/lagu.mp3 tiada)
  function musicBox(ctx, out) {
    const step8 = 60 / 76 / 2;
    const prog = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]];
    const arp = [0, 1, 2, 3, 2, 1, 2, 3];
    let step = 0, next = ctx.currentTime + 0.1;
    function note(m, t, d, v) {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.12;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    }
    const timer = setInterval(() => {
      while (next < ctx.currentTime + 0.35) {
        const chord = prog[Math.floor(step / 8) % 4], i = step % 8;
        note(chord[arp[i]] + 12, next, 1.5, 0.14);
        if (i === 0) note(chord[0] - 12, next, 3.4, 0.1);
        next += step8; step++;
      }
    }, 90);
    return { stop() { clearInterval(timer); } };
  }

  function vinylMarkup(i) {
    return `<svg class="vinyl__spin" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id="vp${i}" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/>
        <radialGradient id="vl${i}" cx=".4" cy=".35"><stop offset="0" stop-color="#f8e3a3"/><stop offset="1" stop-color="#a87b2a"/></radialGradient>
      </defs>
      <text font-family="Cormorant Garamond, Georgia, serif" font-size="22" font-weight="600" fill="#d8b46a" letter-spacing="1.2">
        <textPath href="#vp${i}" startOffset="3%">Klik untuk mainkan lagu</textPath></text>
      <circle cx="100" cy="100" r="40" fill="url(#vl${i})"/>
      <circle cx="100" cy="100" r="33" fill="none" stroke="rgba(90,60,10,.35)" stroke-width="1"/>
      <circle cx="100" cy="100" r="25" fill="none" stroke="rgba(90,60,10,.25)" stroke-width="1"/>
    </svg>
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="15" fill="#3b2a12"/>
      <path class="i-play" d="M95 92l12 8-12 8z" fill="#f3dc9c"/>
      <g class="i-pause" fill="#f3dc9c"><rect x="93" y="92" width="5" height="16" rx="1"/><rect x="102" y="92" width="5" height="16" rx="1"/></g>
    </svg>`;
  }

  /* =========================================================
     PENYIMPANAN TEMPATAN (IndexedDB) — barisan hantar & mod demo
     ========================================================= */
  const DB = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open(NS + 'db', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('queue', { keyPath: 'qid' }); d.createObjectStore('demo', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    async function tx(name, mode, fn) {
      const d = await open();
      return new Promise((res, rej) => {
        const t = d.transaction(name, mode), req = fn(t.objectStore(name));
        t.oncomplete = () => res(req.result); t.onerror = () => rej(t.error);
      });
    }
    return {
      all: n => tx(n, 'readonly', s => s.getAll()),
      put: (n, v) => tx(n, 'readwrite', s => s.put(v)),
      del: (n, k) => tx(n, 'readwrite', s => s.delete(k))
    };
  })();

  /* =========================================================
     API — Google Apps Script (atau mod demo)
     ========================================================= */
  const driveImg = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
  const driveAlt = (id, w) => `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${w}`;

  async function call(url, opts = {}, ms = 45000) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(url, { ...opts, signal: ac.signal });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Ralat pelayan');
      return j;
    } finally { clearTimeout(t); }
  }
  const post = body => call(CFG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(body) }); // text/plain: tiada preflight CORS

  const Api = REMOTE ? {
    async list() {
      const j = await call(`${CFG.APPS_SCRIPT_URL}?action=list&t=${Date.now()}`, {}, 20000);
      return j.photos.map(p => ({ ...p, src: driveImg(p.id, 700), full: driveImg(p.id, 1600), alt: driveAlt(p.id, 700) }));
    },
    async upload(it) { return (await post({ action: 'upload', image: it.image, name: it.name, token: it.token })).id; },
    async remove(id, token) { await post({ action: 'delete', id, token }); },
    async blob(p) {
      const j = await call(`${CFG.APPS_SCRIPT_URL}?action=image&id=${encodeURIComponent(p.id)}`);
      return (await fetch('data:image/jpeg;base64,' + j.data)).blob();
    }
  } : {
    async list() { return (await DB.all('demo')).sort((a, b) => b.t - a.t).map(p => ({ ...p, full: p.src })); },
    async upload(it) { const id = 'demo-' + uid(); await DB.put('demo', { id, name: it.name, t: Date.now(), src: it.image }); await sleep(400); return id; },
    async remove(id) { await DB.del('demo', id); },
    async blob(p) { return (await fetch(p.src)).blob(); }
  };

  /* ---------- barisan hantar (tahan internet lemah di dewan) ---------- */
  let flushing = null;
  function flushQueue() {
    if (flushing) return flushing;
    flushing = (async () => {
      let items = [];
      try { items = (await DB.all('queue')).sort((a, b) => a.t - b.t); } catch (e) { return false; }
      for (const it of items) {
        try {
          const id = await Api.upload(it);
          const owned = store.get('owned', {}); owned[id] = it.token; store.set('owned', owned);
          await DB.del('queue', it.qid);
        } catch (e) { console.warn('Hantar gagal, cuba lagi nanti', e); return false; }
      }
      return true;
    })().finally(() => { flushing = null; if (current === 'album') Album.load(true); });
    return flushing;
  }
  window.addEventListener('online', flushQueue);
  setInterval(() => { if (navigator.onLine !== false) flushQueue(); }, 20000);

  /* ---------- simpan ke telefon ---------- */
  const coarse = matchMedia('(pointer: coarse)').matches;
  async function saveBlob(blobOrPromise) {
    try {
      const blob = await blobOrPromise;
      const name = `${CFG.groom}-${CFG.bride}-${Date.now()}.jpg`.replace(/\s+/g, '');
      const file = new File([blob], name, { type: 'image/jpeg' });
      if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: NAMES }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Gambar disimpan ✨');
    } catch (e) { console.error(e); toast('Maaf, gambar tidak dapat disimpan'); }
  }

  /* =========================================================
     NAVIGASI
     ========================================================= */
  let current = 'cover', depth = 0;
  function show(name, push = true) {
    if (name === current) return;
    const prev = current; current = name;
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === 'screen-' + name));
    if (push) { history.pushState({ screen: name }, ''); depth++; }
    if (prev === 'camera') Camera.leave();
    if (prev === 'album') Album.leave();
    if (name === 'camera') Camera.enter();
    if (name === 'album') Album.enter();
    window.scrollTo(0, 0);
  }
  history.replaceState({ screen: 'cover' }, '');
  window.addEventListener('popstate', e => { depth = Math.max(0, depth - 1); closeLightbox(); show((e.state && e.state.screen) || 'cover', false); });
  function back() { if (depth > 0) history.back(); else show('home'); }

  /* =========================================================
     PENAPIS — matriks warna sama seperti CSS filter
     (CSS untuk pratonton langsung, piksel untuk gambar akhir — iOS Safari tiada ctx.filter)
     ========================================================= */
  const FILTERS = {
    asli:       { label: 'Asli',        ops: [] },
    romantis:   { label: 'Romantis',    ops: [['sepia', .18], ['saturate', 1.15], ['hue-rotate', -12], ['brightness', 1.05], ['contrast', .95]] },
    klasik:     { label: 'Klasik',      ops: [['sepia', .38], ['contrast', 1.1], ['saturate', .85], ['brightness', .98]] },
    taman:      { label: 'Taman',       ops: [['saturate', 1.3], ['hue-rotate', 8], ['brightness', 1.04], ['contrast', 1.05]] },
    seri:       { label: 'Seri',        ops: [['brightness', 1.12], ['contrast', .9], ['saturate', 1.05]] },
    hitamputih: { label: 'Hitam Putih', ops: [['grayscale', 1], ['contrast', 1.15]] }
  };
  const cssFilter = ops => ops.length ? ops.map(([n, a]) => n === 'hue-rotate' ? `hue-rotate(${a}deg)` : `${n}(${a})`).join(' ') : 'none';
  function opMatrix(n, a) {
    let s;
    switch (n) {
      case 'grayscale': s = 1 - a; return { m: [.2126 + .7874 * s, .7152 - .7152 * s, .0722 - .0722 * s, .2126 - .2126 * s, .7152 + .2848 * s, .0722 - .0722 * s, .2126 - .2126 * s, .7152 - .7152 * s, .0722 + .9278 * s], o: 0 };
      case 'sepia': s = 1 - a; return { m: [.393 + .607 * s, .769 - .769 * s, .189 - .189 * s, .349 - .349 * s, .686 + .314 * s, .168 - .168 * s, .272 - .272 * s, .534 - .534 * s, .131 + .869 * s], o: 0 };
      case 'saturate': s = a; return { m: [.213 + .787 * s, .715 - .715 * s, .072 - .072 * s, .213 - .213 * s, .715 + .285 * s, .072 - .072 * s, .213 - .213 * s, .715 - .715 * s, .072 + .928 * s], o: 0 };
      case 'hue-rotate': {
        const r = a * Math.PI / 180, c = Math.cos(r), z = Math.sin(r);
        return { m: [.213 + c * .787 - z * .213, .715 - c * .715 - z * .715, .072 - c * .072 + z * .928,
                     .213 - c * .213 + z * .143, .715 + c * .285 + z * .140, .072 - c * .072 - z * .283,
                     .213 - c * .213 - z * .787, .715 - c * .715 + z * .715, .072 + c * .928 + z * .072], o: 0 };
      }
      case 'brightness': return { m: [a, 0, 0, 0, a, 0, 0, 0, a], o: 0 };
      case 'contrast': return { m: [a, 0, 0, 0, a, 0, 0, 0, a], o: (0.5 - 0.5 * a) * 255 };
    }
  }
  function applyFilter(canvas, ops) {
    if (!ops.length) return;
    const ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    const ms = ops.map(([n, a]) => opMatrix(n, a));
    const cl = v => v < 0 ? 0 : v > 255 ? 255 : v;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      for (const { m, o } of ms) {
        const nr = m[0] * r + m[1] * g + m[2] * b + o, ng = m[3] * r + m[4] * g + m[5] * b + o, nb = m[6] * r + m[7] * g + m[8] * b + o;
        r = cl(nr); g = cl(ng); b = cl(nb);
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* =========================================================
     KAMERA
     ========================================================= */
  const MODES = { 1: 'Satu', 2: '2 Grid', 4: '4 Grid' };
  const MODE_ICON = {
    1: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    2: '<svg viewBox="0 0 24 24"><rect x="7" y="4" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="7" y="13" width="10" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    4: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="4.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4.5" y="13" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="13" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  };

  const Camera = (() => {
    const W = Frames.W, H = Frames.H, LS = 0.5;
    const live = $('#liveCanvas'), lctx = live.getContext('2d');
    const over = $('#overlayCanvas'), octx = over.getContext('2d');
    live.width = W * LS; live.height = H * LS; over.width = W; over.height = H;
    const video = document.createElement('video');
    video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;
    Object.assign(video.style, { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    $('#stage').appendChild(video);

    const st = { frame: 'renda', filter: 'asli', mode: 1, shots: [], busy: false, result: null, facing: 'environment', mirror: false };
    let stream = null, ready = false, raf = 0, thumbTimer = 0, active = false;

    /* -- kawalan -- */
    const chips = $('#frameChips');
    Frames.keys.forEach(k => {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = Frames.list[k].label; b.setAttribute('role', 'radio'); b.dataset.k = k;
      b.onclick = () => setFrame(k); chips.appendChild(b);
    });
    const strip = $('#filterStrip'), thumbs = [];
    Object.entries(FILTERS).forEach(([k, f]) => {
      const b = document.createElement('button');
      b.className = 'filter'; b.setAttribute('role', 'radio'); b.dataset.k = k;
      const c = mk(116, 116); c.style.filter = cssFilter(f.ops); thumbs.push(c);
      const l = document.createElement('span'); l.textContent = f.label;
      b.append(c, l); b.onclick = () => setFilter(k); strip.appendChild(b);
    });
    function paintThumbs() {
      thumbs.forEach(c => {
        const x = c.getContext('2d');
        if (ready && video.videoWidth) {
          x.save(); if (st.mirror) { x.translate(116, 0); x.scale(-1, 1); }
          Frames.drawCover(x, video, video.videoWidth, video.videoHeight, 0, 0, 116, 116); x.restore();
        } else {
          const g = x.createLinearGradient(0, 0, 116, 116); g.addColorStop(0, '#e9d3c0'); g.addColorStop(.5, '#b6857a'); g.addColorStop(1, '#5a3c3a');
          x.fillStyle = g; x.fillRect(0, 0, 116, 116);
        }
      });
    }

    async function setFrame(k) {
      st.frame = k; store.set('frame', k);
      $$('#frameChips .chip').forEach(b => b.setAttribute('aria-checked', b.dataset.k === k));
      const ov = await Frames.overlay(k, CFG);
      if (st.frame !== k) return;
      octx.clearRect(0, 0, W, H); octx.drawImage(ov, 0, 0);
      if (!active) drawLive();
    }
    function setFilter(k) {
      st.filter = k; store.set('filter', k);
      $$('#filterStrip .filter').forEach(b => b.setAttribute('aria-checked', b.dataset.k === k));
      live.style.filter = cssFilter(FILTERS[k].ops);
    }
    function setMode(n) {
      st.mode = n; store.set('mode', n);
      $('#modeLabel').textContent = MODES[n]; $('#modeIcon').innerHTML = MODE_ICON[n];
    }
    $('#modeBtn').onclick = () => setMode(st.mode === 1 ? 2 : st.mode === 2 ? 4 : 1);

    /* -- strim kamera -- */
    function msg(text) { $('#camMsgText').textContent = text; $('#camMsg').hidden = !text; }
    async function start() {
      stop(); msg('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg('Pelayar ini tidak dapat membuka kamera. Cuba buka pautan dalam Chrome atau Safari — atau pilih gambar dari Galeri.'); return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: st.facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
      } catch (e) {
        msg(e.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Benarkan kamera untuk laman ini dalam tetapan pelayar, kemudian tekan "Cuba lagi". Anda juga boleh pilih gambar dari Galeri.'
          : 'Kamera tidak dapat dibuka. Anda masih boleh pilih gambar dari Galeri.');
        return;
      }
      if (!active) { stop(); return; }
      video.srcObject = stream;
      try { await video.play(); } catch (e) {}
      if (video.readyState < 2) await new Promise(r => video.addEventListener('loadeddata', r, { once: true }));
      const s = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
      st.mirror = s.facingMode ? s.facingMode === 'user' : true; // webcam komputer = kamera depan
      ready = true; paintThumbs();
      clearInterval(thumbTimer); thumbTimer = setInterval(paintThumbs, 1500);
      cancelAnimationFrame(raf); loop();
    }
    function stop() {
      cancelAnimationFrame(raf); clearInterval(thumbTimer); ready = false;
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      video.srcObject = null;
    }
    function loop() { if (!st.result) drawLive(); raf = requestAnimationFrame(loop); }

    function drawLive() {
      const win = Frames.win(st.frame), cs = Frames.cells(win, st.mode);
      lctx.setTransform(LS, 0, 0, LS, 0, 0); lctx.clearRect(0, 0, W, H);
      lctx.save(); Frames.clipWindow(lctx, win);
      lctx.fillStyle = '#efe3cf'; lctx.fillRect(win.x - 60, win.y - 60, win.w + 120, win.h + 120);
      cs.forEach((c, i) => {
        const shot = st.shots[i];
        if (shot) Frames.drawCover(lctx, shot, shot.width, shot.height, c.x, c.y, c.w, c.h);
        else if (i === st.shots.length && ready && video.videoWidth) {
          lctx.save();
          if (st.mirror) { lctx.translate(2 * c.x + c.w, 0); lctx.scale(-1, 1); }
          Frames.drawCover(lctx, video, video.videoWidth, video.videoHeight, c.x, c.y, c.w, c.h);
          lctx.restore();
        } else {
          lctx.fillStyle = '#4a0d17'; lctx.fillRect(c.x, c.y, c.w, c.h);
          lctx.fillStyle = 'rgba(246,236,220,.5)'; lctx.font = '600 90px "Cormorant Garamond", serif';
          lctx.textAlign = 'center'; lctx.textBaseline = 'middle'; lctx.fillText(i + 1, c.x + c.w / 2, c.y + c.h / 2);
        }
      });
      lctx.restore();
    }

    function grab() {
      const vw = video.videoWidth, vh = video.videoHeight, s = Math.min(1, 1600 / Math.max(vw, vh));
      const c = mk(Math.round(vw * s), Math.round(vh * s)), x = c.getContext('2d');
      if (st.mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
      x.drawImage(video, 0, 0, c.width, c.height);
      return c;
    }

    async function compose(shots, n) {
      const win = Frames.win(st.frame), cs = Frames.cells(win, n), ov = await Frames.overlay(st.frame, CFG);
      const out = mk(W, H), ctx = out.getContext('2d');
      ctx.fillStyle = '#3a0911'; ctx.fillRect(0, 0, W, H);
      ctx.save(); Frames.clipWindow(ctx, win);
      ctx.fillStyle = '#efe3cf'; ctx.fillRect(win.x - 60, win.y - 60, win.w + 120, win.h + 120);
      cs.forEach((c, i) => {
        const s = shots[i % shots.length], cw = Math.round(c.w), ch = Math.round(c.h);
        const t = mk(cw, ch); Frames.drawCover(t.getContext('2d'), s, s.width, s.height, 0, 0, cw, ch);
        applyFilter(t, FILTERS[st.filter].ops);
        ctx.drawImage(t, c.x, c.y, c.w, c.h);
      });
      ctx.restore();
      ctx.drawImage(ov, 0, 0);
      return out;
    }

    async function countdown() {
      const el = $('#countdown');
      for (const n of [3, 2, 1]) {
        el.classList.remove('tick'); el.innerHTML = `<span>${n}</span>`; void el.offsetWidth; el.classList.add('tick');
        Music.blip(n === 1 ? 1175 : 880);
        await sleep(850);
      }
      el.innerHTML = '';
    }
    function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); Music.shutter(); }
    function busy(on) { st.busy = on; $('#camControls').style.pointerEvents = on ? 'none' : ''; $('#camControls').style.opacity = on ? .55 : ''; }

    async function shoot() {
      if (st.busy) return;
      if (!ready) { toast('Kamera belum sedia — atau pilih dari Galeri'); return; }
      busy(true); st.shots = [];
      try {
        for (let i = 0; i < st.mode; i++) {
          await countdown();
          if (!ready || !active) return;
          st.shots.push(grab()); flash();
          if (i < st.mode - 1) await sleep(900);
        }
        await sleep(250);
        showResult(await compose(st.shots, st.mode));
      } finally { busy(false); }
    }

    async function fromGallery(files) {
      files = files.slice(0, 4);
      if (!files.length) return;
      busy(true);
      try {
        const imgs = (await Promise.all(files.map(fileToCanvas))).filter(Boolean);
        if (!imgs.length) { toast('Gambar tidak dapat dibuka'); return; }
        let n = st.mode;
        if (imgs.length < n) {
          const want = n; n = imgs.length >= 2 ? 2 : 1; setMode(n);
          toast(`Pilih ${want} gambar untuk ${MODES[want]} — kali ini guna ${MODES[n]}`);
        }
        showResult(await compose(imgs, n));
      } finally { busy(false); }
    }
    async function fileToCanvas(file) {
      try {
        let src, w, h;
        if (window.createImageBitmap) { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = src.width; h = src.height; }
        else {
          src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
          w = src.naturalWidth; h = src.naturalHeight;
        }
        const s = Math.min(1, 2000 / Math.max(w, h)), c = mk(Math.round(w * s), Math.round(h * s));
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        return c;
      } catch (e) { console.warn(e); return null; }
    }

    /* -- hasil -- */
    function showResult(canvas) {
      st.result = new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.88));
      st.result.then(b => { $('#resultImg').src = URL.createObjectURL(b); });
      $('#resultImg').hidden = false;
      $('#camControls').hidden = true; $('#resultActions').hidden = false;
      $('#flipBtn').style.visibility = 'hidden';
    }
    function clearResult() {
      const img = $('#resultImg');
      if (img.src) URL.revokeObjectURL(img.src);
      img.removeAttribute('src'); img.hidden = true;
      st.result = null; st.shots = [];
      $('#camControls').hidden = false; $('#resultActions').hidden = true;
      $('#flipBtn').style.visibility = '';
    }
    function blobToDataURL(b) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }); }

    async function send() {
      if (!st.result) return;
      const btn = $('#sendBtn'); btn.disabled = true;
      try {
        const image = await blobToDataURL(await st.result);
        await DB.put('queue', { qid: uid(), image, name: guestName(), token: uid() + uid(), t: Date.now() });
        clearResult();
        show('album');
        toast('Menghantar…', 1600);
        const ok = await flushQueue();
        toast(ok ? 'Terima kasih! Gambar anda sudah masuk album 💌'
                 : 'Sambungan lemah — gambar akan dihantar sendiri bila internet pulih', 3800);
      } catch (e) { console.error(e); toast('Maaf, ada masalah. Cuba lagi.'); }
      finally { btn.disabled = false; }
    }

    $('#shutter').onclick = shoot;
    $('#galleryBtn').onclick = () => $('#galleryInput').click();
    $('#galleryInput').onchange = e => { const f = [...e.target.files]; e.target.value = ''; fromGallery(f); };
    $('#flipBtn').onclick = () => { st.facing = st.facing === 'user' ? 'environment' : 'user'; start(); };
    $('#camRetry').onclick = start;
    $('#retakeBtn').onclick = clearResult;
    $('#saveBtn').onclick = () => st.result && saveBlob(st.result);
    $('#sendBtn').onclick = send;

    setFrame(Frames.list[store.get('frame')] ? store.get('frame') : 'renda');
    setFilter(FILTERS[store.get('filter')] ? store.get('filter') : 'asli');
    setMode(MODES[store.get('mode')] ? store.get('mode') : 1);
    paintThumbs();

    document.addEventListener('visibilitychange', () => {
      if (!active) return;
      if (document.hidden) stop(); else if (!st.result) start();
    });

    return {
      enter() { active = true; clearResult(); setFrame(st.frame); start(); },
      leave() { active = false; stop(); clearResult(); },
      refreshOverlay() { Frames.clearCache(); setFrame(st.frame); }
    };
  })();

  /* =========================================================
     ALBUM
     ========================================================= */
  const Album = (() => {
    const grid = $('#albumGrid');
    let timer = 0, loading = false, lastKey = '';
    async function load(quiet) {
      if (loading) return; loading = true;
      if (!quiet) $('#refreshBtn').style.opacity = .5;
      let pending = [], remote = [], err = null;
      try { pending = (await DB.all('queue')).sort((a, b) => b.t - a.t); } catch (e) {}
      try { remote = await Api.list(); } catch (e) { err = e; console.warn(e); }
      loading = false; $('#refreshBtn').style.opacity = '';
      if (err && !quiet) toast('Album tidak dapat dimuatkan. Semak sambungan internet.');
      render(pending, err ? null : remote);
    }
    function render(pending, remote) {
      if (remote === null) remote = render.last || [];
      render.last = remote;
      const owned = store.get('owned', {});
      const items = [
        ...pending.map(p => ({ id: p.qid, name: p.name, src: p.image, full: p.image, pending: true })),
        ...remote.map(p => ({ ...p, mine: !!owned[p.id] }))
      ];
      const key = items.map(i => i.id + (i.mine ? '*' : '')).join('|');
      const n = items.length;
      $('#albumCount').textContent = n ? `${n} kenangan daripada tetamu` : 'Kenangan daripada tetamu';
      $('#albumEmpty').hidden = n > 0;
      if (key === lastKey) return;
      lastKey = key;
      grid.innerHTML = '';
      items.forEach((it, i) => {
        const card = document.createElement('button');
        card.className = 'polaroid';
        card.style.setProperty('--r', `${((i * 37) % 5 - 2) * 0.7}deg`);
        const img = document.createElement('img');
        img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.alt = `Gambar daripada ${it.name || 'tetamu'}`;
        img.src = it.src;
        if (it.alt) img.onerror = () => { img.onerror = null; img.src = it.alt; };
        const box = document.createElement('div'); box.className = 'polaroid__img'; box.appendChild(img);
        const nm = document.createElement('p'); nm.className = 'polaroid__name'; nm.textContent = it.name || 'Tetamu';
        card.append(box, nm);
        if (it.pending || it.mine) {
          const b = document.createElement('span');
          b.className = 'badge' + (it.pending ? ' badge--pending' : '');
          b.textContent = it.pending ? 'Menghantar…' : 'Gambar anda';
          card.appendChild(b);
        }
        card.onclick = () => openLightbox(it);
        grid.appendChild(card);
      });
    }
    return {
      load,
      enter() { load(); clearInterval(timer); timer = setInterval(() => !document.hidden && load(true), 30000); },
      leave() { clearInterval(timer); }
    };
  })();

  /* ---------- lightbox ---------- */
  let lbItem = null, lbBlob = null;
  function openLightbox(it) {
    lbItem = it;
    const img = $('#lbImg');
    img.referrerPolicy = 'no-referrer'; img.src = it.full || it.src;
    img.onerror = () => { img.onerror = null; img.src = it.src; };
    $('#lbName').textContent = it.name || 'Tetamu';
    $('#lbDelete').hidden = !(it.mine || it.pending);
    $('#lbDelete').textContent = it.pending ? 'Batal' : 'Padam';
    lbBlob = it.pending ? fetch(it.src).then(r => r.blob()) : Api.blob(it);
    lbBlob.catch(() => {});
    $('#lightbox').hidden = false;
  }
  function closeLightbox() { $('#lightbox').hidden = true; lbItem = null; lbBlob = null; }
  $('#lbClose').onclick = closeLightbox;
  $('#lightbox').onclick = e => { if (e.target.id === 'lightbox') closeLightbox(); };
  $('#lbSave').onclick = () => lbBlob && saveBlob(lbBlob);
  $('#lbDelete').onclick = async () => {
    const it = lbItem; if (!it) return;
    const btn = $('#lbDelete');
    if (!btn.dataset.armed) { // tekan dua kali untuk sahkan
      btn.dataset.armed = '1'; btn.textContent = 'Pasti?';
      setTimeout(() => { delete btn.dataset.armed; btn.textContent = it.pending ? 'Batal' : 'Padam'; }, 3000);
      return;
    }
    delete btn.dataset.armed; btn.disabled = true;
    try {
      if (it.pending) await DB.del('queue', it.id);
      else {
        const owned = store.get('owned', {});
        await Api.remove(it.id, owned[it.id]);
        delete owned[it.id]; store.set('owned', owned);
      }
      closeLightbox(); toast('Gambar telah dipadam'); Album.load(true);
    } catch (e) { console.error(e); toast('Gambar tidak dapat dipadam. Cuba lagi.'); }
    finally { btn.disabled = false; }
  };

  /* =========================================================
     MULA
     ========================================================= */
  const guestName = () => ($('#guestName').value || '').trim().slice(0, 40);

  function bindText() {
    const map = { ...CFG, names: NAMES, mono0: CFG.monogram[0], mono1: CFG.monogram[1] };
    $$('[data-bind]').forEach(el => { el.textContent = map[el.dataset.bind] ?? ''; });
    $('#coverMono').textContent = CFG.monogram.join('&');
    if (!CFG.hijriLabel) $$('[data-hijri]').forEach(el => el.hidden = true);
    $('#pantun').innerHTML = '';
    (CFG.pantun || []).forEach(l => { const p = document.createElement('p'); p.textContent = l; $('#pantun').appendChild(p); });
    document.title = `${NAMES} · ${CFG.title}`;
    $('#demoNote').hidden = REMOTE;
  }

  function applyImages() {
    const im = CFG.images || {};
    if (im.cover) $('#coverArt').innerHTML = `<img src="${im.cover}" alt="">`;
    else if (im.coverPhoto) {
      $('#coverPhoto').innerHTML = `<image href="${im.coverPhoto}" width="210" height="190" preserveAspectRatio="xMidYMid slice"/>`;
    }
    if (im.homeCollage) {
      const c = $('#collage'), v = c.querySelector('.collage__vinyl');
      c.innerHTML = `<img class="collage__img" src="${im.homeCollage}" alt="${NAMES}">`;
      c.style.aspectRatio = 'auto'; c.appendChild(v);
    }
  }

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.race([
        Promise.all(['80px "Pinyon Script"', '600 30px "Cormorant Garamond"', '500 30px "Cormorant Garamond"'].map(f => document.fonts.load(f))),
        sleep(3500)
      ]);
    } catch (e) {}
  }

  function init() {
    bindText(); applyImages();
    $$('.vinyl').forEach((v, i) => { v.innerHTML = vinylMarkup(i); });
    $$('[data-music-toggle]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Music.toggle(); }));
    $$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
    $$('[data-back]').forEach(b => b.onclick = back);
    $('#refreshBtn').onclick = () => Album.load();

    const nameInput = $('#guestName');
    nameInput.value = store.get('name', '');
    nameInput.addEventListener('input', () => store.set('name', nameInput.value));

    $('#screen-cover').addEventListener('click', () => { Music.play(); show('home'); });

    const oval = $('#ovalCanvas');
    if (oval) Frames.homeOval(oval, CFG);
    fontsReady().then(() => { if (oval && oval.isConnected) Frames.homeOval(oval, CFG); Camera.refreshOverlay(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Music.wanted) { Music.pause(); Music.resume = true; }
      else if (!document.hidden && Music.resume) { Music.resume = false; Music.play(); }
    });

    flushQueue();
  }
  init();
})();
