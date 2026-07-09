/* 旅行雷达 · 特效层（颜色一律读 CSS 变量，随主题切换；尊重 reduce-motion） */
(function (TR) {
  "use strict";
  const FX = (TR.fx = {});
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const reduced = () => TR.prefersReducedMotion();

  /* ---------- 滚动显现 ---------- */
  let revealIO;
  FX.reveal = function (root) {
    if (!revealIO) {
      revealIO = new IntersectionObserver((ents) => {
        for (const en of ents) {
          if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
        }
      }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    }
    const els = TR.$$(".rv", root);
    els.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i * 45, 360) + "ms";
      revealIO.observe(el);
    });
    // 保底：IO 未触发（截图、打印、奇异滚动容器）也绝不留白
    setTimeout(() => els.forEach((el) => el.classList.add("in")), 1600);
  };

  /* ---------- 卡片 3D 倾斜（桌面指针设备限定） ---------- */
  FX.tilt = function (root) {
    if (reduced() || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    TR.$$("[data-tilt]", root).forEach((el) => {
      if (el._tiltBound) return;
      el._tiltBound = true;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  };

  /* ---------- 雷达扫描 canvas（品牌动效） ---------- */
  // 在容器内画：同心圈 + 扫描扇 + 目的地光点（真实坐标投影）
  FX.radarSweep = function (canvas, opts) {
    if (!canvas) return;
    canvas._dots = (opts && opts.dots) || [];   // [{x:0-1, y:0-1, hot:bool}]
    if (canvas._radarOn) return;                // 已初始化：仅更新光点
    canvas._radarOn = true;
    const ctx = canvas.getContext("2d");
    let raf = null, angle = -Math.PI / 2, running = false, last = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    function size() {
      if (!canvas.isConnected) { window.removeEventListener("resize", size); return; }
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * DPR; canvas.height = r.height * DPR;
    }
    function frame(ts) {
      if (!running) return;
      if (!canvas.isConnected) { running = false; return; } // 视图已切走，停表
      if (ts - last < 33) { raf = requestAnimationFrame(frame); return; } // ~30fps 足够
      last = ts;
      const dots = canvas._dots;
      const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.46;
      const ink = cssVar("--fx-ink") || "#2F4A3F";
      const hot = cssVar("--fx-hot") || "#C75C3D";
      ctx.clearRect(0, 0, W, H);
      // 同心圈与十字
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.16; ctx.lineWidth = DPR;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      // 扫描扇（渐变余辉）
      if (!reduced()) angle += 0.014;
      const grad = ctx.createConicGradient ? ctx.createConicGradient(angle, cx, cy) : null;
      if (grad) {
        grad.addColorStop(0, hot + "55"); grad.addColorStop(0.12, hot + "18");
        grad.addColorStop(0.25, "transparent"); grad.addColorStop(1, "transparent");
        ctx.globalAlpha = 1; ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      }
      // 扫描线
      ctx.globalAlpha = 0.7; ctx.strokeStyle = hot; ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R); ctx.stroke();
      // 光点（扫过点亮，余辉衰减）
      for (const d of dots) {
        const dx = (d.x - 0.5) * 2 * R * 0.92, dy = (d.y - 0.5) * 2 * R * 0.92;
        if (dx * dx + dy * dy > R * R) continue;
        const da = Math.atan2(dy, dx);
        let diff = (angle - da) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const glow = Math.max(0, 1 - diff / 1.6);
        ctx.globalAlpha = 0.25 + glow * 0.75;
        ctx.fillStyle = d.hot ? hot : ink;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, (d.hot ? 3.2 : 2.2) * DPR + glow * 2 * DPR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener("resize", size);
    // 视口内才跑
    new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
        else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
      }
    }, { threshold: 0.05 }).observe(canvas);
    if (reduced()) { running = true; frame(100); running = false; } // 静态一帧
  };

  /* ---------- 地图星座 canvas（探索页：全部城市坐标点亮） ---------- */
  FX.constellation = function (canvas, cities, onPick) {
    if (!canvas || canvas._constOn) return;
    canvas._constOn = true;
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const C = window.TR_CORE.coords;
    // 投影范围（中国为主视野，简单等距圆柱）
    const B = { latMin: 17, latMax: 54, lngMin: 73, lngMax: 136 };
    let pts = [], hoverIdx = -1, t0 = performance.now(), raf = null, running = false;

    function project(lat, lng, W, H) {
      const pad = 0.06;
      const x = ((lng - B.lngMin) / (B.lngMax - B.lngMin)) * (1 - pad * 2) + pad;
      const y = ((B.latMax - lat) / (B.latMax - B.latMin)) * (1 - pad * 2) + pad;
      return [x * W, y * H];
    }
    function size() {
      if (!canvas.isConnected) { window.removeEventListener("resize", size); return; }
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * DPR; canvas.height = r.height * DPR;
      pts = [];
      for (const c of cities) {
        const co = C[c.id];
        if (!co || c.intl) continue;
        const [x, y] = project(co.lat, co.lng, canvas.width, canvas.height);
        pts.push({ x, y, c });
      }
    }
    function frame(ts) {
      if (!running) return;
      if (!canvas.isConnected) { running = false; return; }
      const W = canvas.width, H = canvas.height;
      const ink = cssVar("--fx-ink") || "#2F4A3F";
      const hot = cssVar("--fx-hot") || "#C75C3D";
      ctx.clearRect(0, 0, W, H);
      const tt = reduced() ? 0 : (ts - t0) / 1000;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const tw = 0.5 + 0.5 * Math.sin(tt * 1.4 + i * 1.7);
        const isHover = i === hoverIdx;
        const deep = p.c.hasDeep;
        ctx.globalAlpha = deep ? 0.55 + tw * 0.45 : 0.22 + tw * 0.18;
        ctx.fillStyle = isHover ? hot : (deep ? hot : ink);
        ctx.beginPath();
        ctx.arc(p.x, p.y, (deep ? 2.6 : 1.7) * DPR * (isHover ? 1.9 : 1), 0, Math.PI * 2);
        ctx.fill();
        if (isHover) {
          ctx.globalAlpha = 0.9; ctx.fillStyle = hot;
          ctx.font = `${12 * DPR}px sans-serif`;
          ctx.fillText(p.c.id, p.x + 8 * DPR, p.y - 6 * DPR);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    function pick(e) {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * DPR, my = (e.clientY - r.top) * DPR;
      let best = -1, bd = 22 * DPR;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - mx, pts[i].y - my);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    canvas.addEventListener("pointermove", (e) => {
      hoverIdx = pick(e);
      canvas.style.cursor = hoverIdx >= 0 ? "pointer" : "default";
    });
    canvas.addEventListener("click", (e) => {
      const i = pick(e);
      if (i >= 0 && onPick) onPick(pts[i].c);
    });
    size();
    window.addEventListener("resize", size);
    new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
        else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
      }
    }, { threshold: 0.05 }).observe(canvas);
  };

  /* ---------- 数字滚动 ---------- */
  FX.countUp = function (el, to, dur) {
    if (reduced()) { el.textContent = to; return; }
    const t0 = performance.now();
    (function step(ts) {
      const p = Math.min(1, (ts - t0) / (dur || 700));
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };
})(window.TR);
