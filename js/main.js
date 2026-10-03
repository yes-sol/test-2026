(() => {
  const W = 336, H = 250, BASE = 160;
  const TAU = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VERSIONS = [
    { id: 'A', desc: '비행기 중심 · 빠른 모션', dur: 2.4, k: 0.8, blur: 1.25, city: false, clouds: false, swarm: false, ovals: true },
    { id: 'B', desc: '비행기 + 배경 parallax', dur: 3.0, k: 0.7, blur: 1, city: true, clouds: true, swarm: false },
    { id: 'C', desc: '비행기 + parallax + 주변 비행기', dur: 3.0, k: 0.7, blur: 1, city: true, clouds: true, swarm: true },
  ];

  let speed = 1, blurOn = true;

  /* ---------- seeded skyline ---------- */
  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function skyline(seed, tileW, minH, maxH, minW, maxW, tower) {
    const r = rng(seed), items = [];
    let x = 0;
    while (x < tileW - minW) {
      const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH);
      items.push({ x, w, h, cap: r() < 0.3 ? 4 + r() * 8 : 0, spire: r() < 0.12 ? 6 + r() * 10 : 0, win: r() < 0.5 });
      x += w + 1 + r() * 6;
    }
    if (tower) items.push({ x: tileW * 0.42, w: 3, h: 74, tower: true });
    return { w: tileW, items, maxH: Math.max(maxH, tower ? 84 : 0) };
  }
  const FAR = skyline(7, 560, 14, 44, 9, 20, true);
  const NEAR = skyline(23, 640, 20, 60, 12, 28, false);

  function drawSkyline(ctx, sky, offset, rgb, a, windows) {
    const g = ctx.createLinearGradient(0, BASE - sky.maxH, 0, BASE);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.65, `rgba(${rgb},${a * 0.55})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    const start = -(((offset % sky.w) + sky.w) % sky.w);
    for (let ox = start; ox < W; ox += sky.w) {
      for (const b of sky.items) {
        const x = ox + b.x;
        if (x + b.w + 10 < 0 || x - 10 > W) continue;
        ctx.fillStyle = g;
        if (b.tower) {
          ctx.fillRect(x, BASE - b.h, b.w, b.h);
          ctx.beginPath(); ctx.ellipse(x + 1.5, BASE - b.h + 14, 6, 3.5, 0, 0, TAU); ctx.fill();
          ctx.fillRect(x + 0.8, BASE - b.h - 10, 1.4, 10);
          continue;
        }
        ctx.fillRect(x, BASE - b.h, b.w, b.h);
        if (b.cap) ctx.fillRect(x + b.w * 0.22, BASE - b.h - b.cap, b.w * 0.56, b.cap);
        if (b.spire) ctx.fillRect(x + b.w / 2 - 0.7, BASE - b.h - b.cap - b.spire, 1.4, b.spire);
        if (windows && b.win) {
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          for (let y = BASE - b.h + 5; y < BASE - 12; y += 6) ctx.fillRect(x + 2, y, b.w - 4, 1);
        }
      }
    }
  }

  /* ---------- clouds + particles ---------- */
  const CLOUDS = [
    { y: 44, w: 64, h: 6, sp: 7, x0: 60, a: .38 },
    { y: 100, w: 54, h: 5, sp: 10, x0: 280, a: .3 },
    { y: 134, w: 96, h: 8, sp: 18, x0: 170, a: .26 },
    { y: 70, w: 140, h: 11, sp: 42, x0: 380, a: .2, near: true },
    { y: 124, w: 120, h: 9, sp: 54, x0: 40, a: .16, near: true },
  ];
  const DOTS = Array.from({ length: 14 }, (_, i) => {
    const r = rng(100 + i);
    return { y: 40 + r() * 110, x0: r() * 400, sp: 4 + r() * 22, rad: 0.8 + r() * 1.2, a: .18 + r() * .25 };
  });

  function oval(ctx, x, y, w, h, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    g.addColorStop(0, `rgba(108,168,240,${a})`);
    g.addColorStop(0.5, `rgba(108,168,240,${a * 0.45})`);
    g.addColorStop(1, 'rgba(108,168,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -w / 2, w, w);
    ctx.restore();
  }
  function wrapX(t, sp, x0, w) {
    const span = W + w * 2;
    return W + w - (((t * sp + x0) % span) + span) % span;
  }

  /* ---------- paper plane ---------- */
  function plane(ctx, x, y, s, ang, alpha) {
    if (alpha <= 0.002 || s <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    // lower wing
    ctx.fillStyle = '#3d8bf0';
    ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(-12, 3); ctx.lineTo(-22, 15); ctx.closePath(); ctx.fill();
    // keel fold
    ctx.fillStyle = '#2566cf';
    ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(-12, 3); ctx.lineTo(-15, 9); ctx.closePath(); ctx.fill();
    // top wing
    const g = ctx.createLinearGradient(-27, -15, 31, 0);
    g.addColorStop(0, '#b4d7ff'); g.addColorStop(1, '#6aaefa');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(-28, -16); ctx.lineTo(-12, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Main plane path. q = linear time in flight [0..1]. Easing makes speed peak at center.
  function mainAt(q, cfg) {
    const k = cfg.k;
    const p = q - k * Math.sin(TAU * q) / TAU;
    const sp = Math.sin(Math.PI * p);
    const x = W * (0.1 + 1.08 * p);
    const y = 128 - 60 * p - 22 * sp;
    const s = 0.12 + 0.98 * Math.pow(Math.max(0, sp), 1.6);
    const dx = 1.08 * W, dy = -60 - 22 * Math.PI * Math.cos(Math.PI * p);
    const ang = Math.atan2(dy, dx) - 0.12 + 0.05 * Math.sin(TAU * q);
    const fadeIn = Math.min(1, q / 0.1);
    const alpha = fadeIn * (0.5 + 0.5 * Math.min(1, s));
    return { x, y, s, ang, alpha };
  }

  function drawMain(ctx, t, cfg) {
    const FLIGHT = 0.88;
    const u = ((t % cfg.dur) + cfg.dur) % cfg.dur / cfg.dur;
    if (u > FLIGHT) return;
    const q = u / FLIGHT;
    const st = mainAt(q, cfg);
    const a = mainAt(Math.max(0, q - 0.004), cfg), b = mainAt(Math.min(1, q + 0.004), cfg);
    const dq = (Math.min(1, q + 0.004) - Math.max(0, q - 0.004)) || 0.008;
    const vx = (b.x - a.x) / dq, vy = (b.y - a.y) / dq;
    const v = Math.hypot(vx, vy) / (cfg.dur * FLIGHT); // px per second
    const vn = Math.min(1.5, v / 220);
    const ux = vx / (Math.hypot(vx, vy) || 1), uy = vy / (Math.hypot(vx, vy) || 1);

    if (blurOn && vn > 0.35) {
      const amt = (vn - 0.35) * cfg.blur;
      // trailing streak, like the soft lens shapes in the reference
      oval(ctx, st.x - ux * 46 * st.s, st.y - uy * 46 * st.s + 5 * st.s, 110 * st.s * amt, 9 * st.s, 0.32 * Math.min(1, amt) * st.alpha);
      // speed lines
      const tx = st.x - ux * 22 * st.s, ty = st.y - uy * 22 * st.s;
      ctx.lineCap = 'round';
      for (const j of [-1, 0.2, 1]) {
        const ox = -uy * j * 8 * st.s, oy = ux * j * 8 * st.s;
        const len = 70 * st.s * amt * (j === 0.2 ? 1.3 : 0.85);
        const x0 = tx + ox, y0 = ty + oy, x1 = x0 - ux * len, y1 = y0 - uy * len;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, `rgba(90,160,245,${0.45 * Math.min(1, amt) * st.alpha})`);
        g.addColorStop(1, 'rgba(90,160,245,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 0.6 + 1.2 * st.s;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      // ghost frames
      const N = 6;
      for (let i = N; i >= 1; i--) {
        const qi = q - i * 0.007 * amt;
        if (qi < 0) continue;
        const g = mainAt(qi, cfg);
        plane(ctx, g.x, g.y, g.s, g.ang, g.alpha * 0.16 * (1 - i / (N + 1)));
      }
    }
    plane(ctx, st.x, st.y, st.s, st.ang, st.alpha);
  }

  /* ---------- small planes (C) ---------- */
  const SWARM = [
    { z: .18, y: 34, sp: 34, gap: 90, x0: 140, a: .16 },
    { z: .22, y: 60, sp: 46, gap: 140, x0: 10, a: .2 },
    { z: .26, y: 112, sp: 60, gap: 220, x0: 230, a: .2 },
    { z: .34, y: 92, sp: 86, gap: 300, x0: 90, a: .24 },
    { z: .62, y: 142, sp: 210, gap: 900, x0: 520, a: .24, near: true },
    { z: .78, y: 40, sp: 270, gap: 1400, x0: 1200, a: .2, near: true },
  ];
  function drawSwarm(ctx, t, near) {
    for (const p of SWARM) {
      if (!!p.near !== near) continue;
      const m = 40 * p.z + 20, span = W + 2 * m + p.gap;
      const x = (((t * p.sp + p.x0) % span) + span) % span - m;
      if (x > W + m) continue;
      const y = p.y + Math.sin(t * 1.4 + p.x0) * 3 * p.z - (x / W) * 10 * p.z;
      const ang = -0.2 + Math.sin(t * 1.4 + p.x0) * 0.04;
      if (blurOn && p.near) {
        for (let i = 4; i >= 1; i--) plane(ctx, x - i * p.sp * 0.012, y + i * 0.5, p.z, ang, p.a * 0.25 * (1 - i / 5));
        oval(ctx, x - 40 * p.z, y + 3 * p.z, 90 * p.z, 6 * p.z, p.a * 0.8);
      }
      plane(ctx, x, y, p.z, ang, p.a);
    }
  }

  /* ---------- per-phone scene ---------- */
  function render(ph) {
    const { ctx, cfg, t } = ph;
    ctx.clearRect(0, 0, W, H);
    if (cfg.ovals) { oval(ctx, 96, 80, 62, 6, .4); oval(ctx, 232, 130, 54, 5, .35); }
    if (cfg.clouds) {
      for (const d of DOTS) {
        ctx.fillStyle = `rgba(110,165,238,${d.a})`;
        ctx.beginPath(); ctx.arc(wrapX(t, d.sp, d.x0, 4), d.y, d.rad, 0, TAU); ctx.fill();
      }
      for (const c of CLOUDS) if (!c.near) oval(ctx, wrapX(t, c.sp, c.x0, c.w), c.y, c.w, c.h, c.a);
    }
    if (cfg.city) {
      drawSkyline(ctx, FAR, t * 5, '186,212,244', .5, false);
      drawSkyline(ctx, NEAR, t * 12, '160,198,242', .55, true);
    }
    if (cfg.swarm) drawSwarm(ctx, t, false);
    drawMain(ctx, t, cfg);
    if (cfg.swarm) drawSwarm(ctx, t, true);
    if (cfg.clouds) for (const c of CLOUDS) if (c.near) oval(ctx, wrapX(t, c.sp, c.x0, c.w), c.y, c.w, c.h, c.a);
  }

  /* ---------- build DOM ---------- */
  const row = document.getElementById('row');
  const tpl = document.getElementById('phoneTpl');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const phones = VERSIONS.map(cfg => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.label b').textContent = cfg.id;
    node.querySelector('.label span').textContent = cfg.desc;
    const phone = node.querySelector('.phone');
    phone.setAttribute('aria-label', `버전 ${cfg.id} 재생/정지`);
    const canvas = node.querySelector('canvas');
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    row.appendChild(node);
    const ph = { cfg, ctx, phone, chip: node.querySelector('.chip'), t: cfg.dur * 0.42, playing: !reduced, dirty: true };
    const toggle = () => setPlaying(ph, !ph.playing);
    phone.addEventListener('click', toggle);
    phone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    return ph;
  });

  function setPlaying(ph, on) {
    ph.playing = on;
    ph.phone.classList.toggle('paused', !on);
    ph.phone.setAttribute('aria-pressed', String(on));
    ph.chip.textContent = on ? '재생 중' : '일시정지';
    ph.chip.classList.toggle('off', !on);
    ph.dirty = true;
  }
  phones.forEach(ph => setPlaying(ph, ph.playing));

  document.getElementById('playAll').onclick = () => phones.forEach(p => setPlaying(p, true));
  document.getElementById('pauseAll').onclick = () => phones.forEach(p => setPlaying(p, false));
  document.getElementById('restart').onclick = () => phones.forEach(p => { p.t = 0; p.dirty = true; });
  document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => {
    speed = +b.dataset.speed;
    document.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  });
  const blurBtn = document.getElementById('blurToggle');
  blurBtn.onclick = () => {
    blurOn = !blurOn;
    blurBtn.setAttribute('aria-pressed', String(blurOn));
    phones.forEach(p => p.dirty = true);
  };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * speed;
    last = now;
    for (const ph of phones) {
      if (ph.playing) { ph.t += dt; ph.dirty = true; }
      if (ph.dirty) { render(ph); ph.dirty = false; }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
