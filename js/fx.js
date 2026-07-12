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

  /* ---------- 档案页 hero 季节物候粒子（小 canvas · IO 门控 · 25fps · 暗色化作星子） ---------- */
  FX.seasonParticles = function (canvas) {
    if (!canvas || canvas._spOn) return;
    canvas._spOn = true;
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const m = TR.monthNow();
    const season = m >= 3 && m <= 5 ? "petal" : m >= 6 && m <= 8 ? "firefly" : m >= 9 && m <= 11 ? "leaf" : "snow";
    let parts = [], raf = null, running = false, last = 0, w = 0, h = 0;
    const dark = () => document.documentElement.getAttribute("data-theme") === "dark";
    function size() {
      if (!canvas.isConnected) { window.removeEventListener("resize", size); return; }
      const r = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, r.width * DPR); h = canvas.height = Math.max(1, r.height * DPR);
      if (!parts.length) for (let i = 0; i < 9; i++) parts.push({
        x: Math.random() * w, y: Math.random() * h,
        r: (season === "snow" ? 2 : season === "firefly" ? 1.7 : 3) * DPR * (0.6 + Math.random()),
        vy: (season === "firefly" ? 0.05 : 0.2) * DPR * (0.6 + Math.random()),
        vx: (Math.random() - 0.5) * 0.25 * DPR, a: Math.random() * 6.28, sway: 0.4 + Math.random(), ph: Math.random() * 6,
      });
    }
    function frame(ts) {
      if (!running) return;
      if (!canvas.isConnected) { running = false; return; }
      if (ts - last < 40) { raf = requestAnimationFrame(frame); return; }   // ~25fps 够
      last = ts;
      ctx.clearRect(0, 0, w, h);
      const isDark = dark(), t = ts / 1000;
      const brass = cssVar("--brass") || "#B08A4F", terra = cssVar("--fx-hot") || "#C75C3D", soft = cssVar("--ink-3") || "#8a8178";
      for (const p of parts) {
        if (!reduced()) {
          p.y += p.vy; p.x += p.vx + Math.sin(t * p.sway + p.ph) * 0.3 * DPR; p.a += 0.012;
          if (p.y > h + 12) { p.y = -12; p.x = Math.random() * w; }
          if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
        }
        const shape = isDark ? "star" : season;
        ctx.save(); ctx.translate(p.x, p.y);
        if (shape === "firefly" || shape === "star") {
          const gl = 0.5 + 0.5 * Math.sin(t * 2 + p.ph);
          ctx.globalAlpha = (isDark ? 0.5 : 0.68) * (0.4 + gl * 0.6);
          ctx.fillStyle = isDark ? brass : terra;
          ctx.beginPath(); ctx.arc(0, 0, p.r * (0.8 + gl * 0.5), 0, 6.28); ctx.fill();
        } else if (shape === "snow") {
          ctx.globalAlpha = 0.5; ctx.fillStyle = soft;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill();
        } else {                                   // petal / leaf：小椭圆瓣
          ctx.rotate(p.a); ctx.globalAlpha = 0.46; ctx.fillStyle = season === "petal" ? terra : brass;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.7, 0, 0, 6.28); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener("resize", size);
    new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
        else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
      }
    }, { threshold: 0.02 }).observe(canvas);
    if (reduced()) { running = true; frame(1000); running = false; }   // 静态一帧
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
      // 航线弧：从出发地画一条会飞的虚线到 hover 的城（替代 3D 地球仪，雷达叙事更强）
      if (hoverIdx >= 0 && pts[hoverIdx]) {
        const fromId = (TR.state && TR.state.settings && TR.state.settings.from) || "上海";
        const fco = C[fromId], hp = pts[hoverIdx];
        if (fco && fromId !== hp.c.id) {
          const [fx, fy] = project(fco.lat, fco.lng, W, H);
          const dx = hp.x - fx, dy = hp.y - fy, nrm = Math.hypot(dx, dy) || 1;
          const lift = Math.min(nrm * 0.26, 96 * DPR);
          const cxp = (fx + hp.x) / 2 - (dy / nrm) * lift, cyp = (fy + hp.y) / 2 + (dx / nrm) * lift;
          ctx.save();
          ctx.strokeStyle = hot; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.3 * DPR;
          ctx.setLineDash([6 * DPR, 6 * DPR]); ctx.lineDashOffset = -tt * 34 * DPR;   // 相位推进=航线在飞
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(cxp, cyp, hp.x, hp.y); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 0.85; ctx.fillStyle = hot;             // 出发地锚点
          ctx.beginPath(); ctx.arc(fx, fy, 3 * DPR, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
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

  /* ---------- 结果网格换档：墨迹重写（旧墨被吸走 → 新卡次第上浮） ---------- */
  FX.swapGrid = function (el, html) {
    if (!el) return;
    if (reduced() || !el.children.length) { el.innerHTML = html; return; }
    el.getAnimations().forEach((a) => a.cancel());          // 连点：硬打断旧动画，绝不 debounce
    el.style.minHeight = el.offsetHeight + "px";            // 锁高，防换档时列表跳动
    el.animate({ opacity: [1, 0], transform: ["none", "translateY(4px)"] },
      { duration: 120, easing: "ease-out" }).finished.then(() => {
        el.innerHTML = html;
        Array.prototype.forEach.call(el.children, (c, i) => c.animate(
          { opacity: [0, 1], transform: ["translateY(14px)", "none"] },
          { duration: 320, delay: Math.min(i * 60, 360), easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
        requestAnimationFrame(() => { el.style.minHeight = ""; });
      }).catch(() => {});
  };

  /* ---------- 数字滚动 ---------- */
  FX.countUp = function (el, to, dur) {
    if (reduced()) { el.textContent = to.toLocaleString(); return; }
    const t0 = performance.now();
    (function step(ts) {
      const p = Math.min(1, (ts - t0) / (dur || 700));
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };

  /* 纸飞机：新行程"到达"行囊时沿弧线滑入落定（一次性 WAAPI，无长页负担） */
  FX.paperPlane = function (root) {
    if (reduced()) return;
    const target = (root && root.querySelector(".sec-head")) || document.body;
    const r = target.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "plane-fly"; el.textContent = "✈️"; el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    const ex = Math.max(24, r.left + 18), ey = r.top + r.height / 2, sx = -60, sy = ey - 130;
    const anim = el.animate([
      { transform: `translate(${sx}px,${sy}px) rotate(24deg)`, opacity: 0 },
      { transform: `translate(${(sx + ex) / 2}px,${sy - 16}px) rotate(6deg)`, opacity: 1, offset: .5 },
      { transform: `translate(${ex}px,${ey}px) rotate(-6deg)`, opacity: 1, offset: .88 },
      { transform: `translate(${ex}px,${ey}px) rotate(0)`, opacity: 0 },
    ], { duration: 920, easing: "cubic-bezier(.4,0,.2,1)" });
    anim.onfinish = anim.oncancel = () => el.remove();
  };

  /* ══ 大惊喜层（Fable 菜单 v1）· 守零依赖 / 离线 / reduce-motion 全降级 ══ */

  /* P0-1 点灯仪式：日落月升 + 星子扎眼（一次性天体层，叠在 switchTheme 圆形擦除之上；1.7s 后自清） */
  FX.lightCeremony = function (originEl, toDark) {
    if (reduced() || FX._skyBusy) return;
    FX._skyBusy = true;
    const layer = document.createElement("div");
    layer.className = "sky-ceremony"; layer.setAttribute("aria-hidden", "true");
    const sun = document.createElement("div"); sun.className = "cel sun";
    const moon = document.createElement("div"); moon.className = "cel moon";
    layer.append(sun, moon); document.body.appendChild(layer);
    const W = innerWidth, H = innerHeight, dur = 1000, ease = "cubic-bezier(.4,0,.2,1)";
    const pos = (x, y, s, o) => ({ transform: `translate(${x}px,${y}px) scale(${s})`, opacity: o });
    if (toDark) {
      sun.animate([pos(W * .62, H * .2, 1, 1), pos(W * .28, H * 1.04, .7, 0)], { duration: dur, easing: ease, fill: "forwards" });
      moon.animate([pos(W * .72, H * 1.04, .7, 0), pos(W * .4, H * .18, 1, 1)], { duration: dur, easing: ease, fill: "forwards" });
      const stars = document.createElement("div"); stars.className = "stars"; layer.appendChild(stars);
      const sh = [];
      for (let i = 0; i < 46; i++) sh.push(`${(Math.random() * W) | 0}px ${(Math.random() * H * .62) | 0}px 0 ${(Math.random() * 1.3).toFixed(1)}px #FDF7E3`);
      stars.style.boxShadow = sh.join(",");
      stars.animate([{ opacity: 0 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 1600, easing: "ease-in-out" });
    } else {
      moon.animate([pos(W * .4, H * .18, 1, 1), pos(W * .72, H * 1.04, .7, 0)], { duration: dur, easing: ease, fill: "forwards" });
      sun.animate([pos(W * .28, H * 1.04, .7, 0), pos(W * .62, H * .2, 1, 1)], { duration: dur, easing: ease, fill: "forwards" });
    }
    setTimeout(() => { layer.remove(); FX._skyBusy = false; }, 1700);
  };

  /* P0-3 过关盖章：收下型动作砸下朱印 + 墨渍迸溅，停留后飞向对应 tab（一次性，节点必清） */
  function mkStamp(opts) {
    const s = document.createElement("div"); s.className = "stamp";
    s.innerHTML = `<span class="s-main">${TR.esc(opts.text || "收讫")}</span><span class="s-sub">${TR.esc(opts.sub || "")}</span>`;
    return s;
  }
  FX.stamp = function (opts) {
    opts = opts || {};
    if (TR.sfx && opts.sound !== false) TR.sfx.save();   // 音效独立于动画：reduce-motion 下也有盖章声
    if (reduced()) {
      const st = document.createElement("div"); st.className = "stamp-stage";
      const s = mkStamp(opts); s.className = "stamp still"; st.appendChild(s); document.body.appendChild(st);
      s.animate([{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 900, easing: "ease" }).onfinish = () => st.remove();
      return;
    }
    const nav = opts.flyTo || "plan";  // 选"可见"的那个导航（桌面 tabbar 隐藏但仍在 DOM，getBoundingClientRect 会是 0）
    const tab = [].slice.call(document.querySelectorAll('.tabbar a[data-nav="' + nav + '"], .topnav a[data-nav="' + nav + '"]')).find((el) => el.offsetParent !== null) || null;
    const wrap = document.createElement("div"); wrap.className = "stamp-stage"; wrap.setAttribute("aria-hidden", "true");
    const stamp = mkStamp(opts); wrap.appendChild(stamp);
    const splats = [];
    for (let i = 0; i < 10; i++) { const d = document.createElement("i"); d.className = "splat"; wrap.appendChild(d); splats.push(d); }
    document.body.appendChild(wrap);
    let cleaned = false;
    const done = () => { if (cleaned) return; cleaned = true; wrap.remove(); };
    const slam = stamp.animate([
      { transform: "translate(-50%,-50%) scale(2.6) rotate(-16deg)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(.94) rotate(-6deg)", opacity: 1, offset: .34 },
      { transform: "translate(-50%,-50%) scale(1.05) rotate(-6deg)", offset: .42 },
      { transform: "translate(-50%,-50%) scale(1) rotate(-6deg)", opacity: 1, offset: .5 },
      { transform: "translate(-50%,-50%) scale(1) rotate(-6deg)", opacity: 1 },
    ], { duration: 900, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "forwards" });
    setTimeout(() => {
      document.body.animate([{ transform: "translateY(0)" }, { transform: "translateY(2px)" }, { transform: "translateY(0)" }], { duration: 90 });
      splats.forEach((d, i) => {
        const a = (i / splats.length) * 6.283 + Math.random() * .5, dist = 60 + Math.random() * 90;
        d.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: .9 }, { transform: `translate(calc(-50% + ${(Math.cos(a) * dist) | 0}px),calc(-50% + ${(Math.sin(a) * dist) | 0}px)) scale(1)`, opacity: 0 }], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
      });
    }, 300);
    slam.onfinish = () => {
      if (!tab) { stamp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = done; return; }
      const tr = tab.getBoundingClientRect(), tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
      const fly = stamp.animate([
        { transform: "translate(-50%,-50%) scale(1) rotate(-6deg)", opacity: 1 },
        { transform: `translate(${(tx - innerWidth / 2) | 0}px, ${(ty - innerHeight / 2) | 0}px) scale(.12) rotate(20deg)`, opacity: .15 },
      ], { duration: 520, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
      fly.onfinish = fly.oncancel = () => { done(); if (tab) { tab.classList.remove("badge-pop"); void tab.offsetWidth; tab.classList.add("badge-pop"); } };
    };
    setTimeout(done, 2000); // 兜底清理，杜绝 fill:forwards 残留常驻
  };

  /* P0-2 立体书城池：档案页 hero 的无图视觉主角——程序化纸雕地平线三层，进页翻立 + 指针视差
     用城市名作种子，山脊/天际线永远平滑干净且每城不同；按场景关键词调频幅并加点缀（日月/松/桥）。*/
  function _hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function _rng(seed) { let h = seed >>> 0; return () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; }; }
  function _pickScene(city) {
    const t = (city.tagline || "") + (city.region || "") + ((city.foodTags || []).join(""));
    if (/沙|漠|戈壁|盐湖|胡杨|雅丹|敦煌/.test(t)) return "desert";
    if (/海岛|海滨|海边|滨海|渔港|沙滩|群岛|椰|三亚|北海|海湾/.test(t)) return "coast";   // 收紧:不再让"洱海"等含"海"的湖误判为海岸
    if (/草原|牧场|牧区|坝上|那拉提|喀拉峻|草甸/.test(t)) return "grassland";
    if (/水乡|园林|运河|古镇|古城|湖|江|河|泉|洱海/.test(t)) return "water";               // 水乡先于森林:"园林"不再被"林"误判
    if (/森林|林海|针叶|白桦|雪乡|原始森林/.test(t)) return "forest";                        // 收紧:去掉裸"林/雪/冰"
    if (/雪山|高原|险|栈道|峰|岭|山|喀斯特|梯田|丹霞|峡谷/.test(t)) return "mountain";
    const r = city.region || "";
    if (/西北/.test(r)) return "desert";
    if (/海岛/.test(r)) return "coast";
    if (/西南/.test(r)) return "mountain";
    if (/东北/.test(r)) return "forest";
    if (/华东|华中/.test(r)) return "water";
    return "skyline";
  }
  const _JAG = { desert: 0, grassland: 0, coast: 0, mountain: 5, forest: 2, water: 0, skyline: 0 };     // 山峦锯齿险峻、沙丘草原平缓——拉开场景性格
  const _AMP = { desert: 1.5, grassland: .5, coast: .72, mountain: 1.55, forest: 1.0, water: .58, skyline: 1 };
  const _LIFT = { mountain: -16, desert: -6, water: 12, grassland: 16, coast: 8, forest: 0, skyline: 0 };  // 山更高、水草更低平
  function _ridge(rnd, baseY, amp, jag) {
    const n = 9, ph = rnd() * 6.283, f1 = 1 + ((rnd() * 2) | 0), f2 = Math.max(1, jag) * (1 + ((rnd() * 2) | 0));
    const y = (i) => baseY - amp * (0.5 + 0.5 * Math.sin(ph + i / n * 6.283 * f1)) - amp * 0.34 * Math.sin(i / n * 6.283 * f2);
    let d = `M0 160 L0 ${y(0).toFixed(1)}`;
    for (let i = 1; i <= n; i++) { const x = i / n * 400, px = (i - 1) / n * 400, cx = (px + x) / 2; d += ` Q${px.toFixed(1)} ${y(i - 1).toFixed(1)} ${cx.toFixed(1)} ${((y(i - 1) + y(i)) / 2).toFixed(1)}`; }
    return d + " L400 160 Z";
  }
  function _skyline(rnd, baseTop) {
    let d = "", x = -10;
    while (x < 410) { const w = 15 + ((rnd() * 28) | 0), top = baseTop + ((rnd() * 46) | 0); d += `M${x} 160V${top}h${w}V160Z`; x += w + 2 + ((rnd() * 7) | 0); }
    return d;
  }
  function _pines(rnd) { let d = "", x = -6; while (x < 406) { const w = 18 + ((rnd() * 16) | 0), h = 34 + ((rnd() * 34) | 0); d += `M${x} 160 L${(x + w / 2).toFixed(1)} ${160 - h} L${x + w} 160Z`; x += w * 0.72; } return d; }
  function _bridge(seed) { const cx = 130 + (_hash("b" + seed) % 140); return `M${cx - 48} 160 Q${cx} 116 ${cx + 48} 160 Z M${cx - 30} 160 Q${cx} 132 ${cx + 30} 160 Z`; }
  FX.cityDiorama = function (host, city) {
    if (!host || host._dioOn) return; host._dioOn = true;
    const scene = _pickScene(city), seed = _hash(city.id || "x"), urban = scene === "skyline";
    const wrap = document.createElement("div"); wrap.className = "diorama dio-" + scene; wrap.setAttribute("aria-hidden", "true");
    if (city.color) wrap.style.setProperty("--dio-sky", city.color);
    const defs = [{ c: "l0", baseY: 76, amp: 34, op: .42 }, { c: "l1", baseY: 98, amp: 30, op: .5 }, { c: "l2", baseY: 120, amp: 24, op: .72 }];
    defs.forEach((L, i) => {
      const rnd = _rng(seed + i * 911);
      let d = urban ? _skyline(rnd, 58 + i * 18) : _ridge(rnd, L.baseY + (_LIFT[scene] || 0), L.amp * (_AMP[scene] || 1), (_JAG[scene] || 0) + i + 1);
      if (scene === "forest" && i === 2) d += " " + _pines(_rng(seed + 77));
      if (scene === "water" && i === 2) d += " " + _bridge(seed);
      const layer = document.createElement("div"); layer.className = "dio-l " + L.c;
      layer.innerHTML = `<svg viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
      wrap.appendChild(layer);
    });
    const sun = document.createElement("div"); sun.className = "dio-sun"; wrap.appendChild(sun);
    host.insertBefore(wrap, host.firstChild);
    if (!reduced()) {
      Array.prototype.forEach.call(wrap.querySelectorAll(".dio-l"), (l, i) => {
        l.animate([{ transform: "translateZ(var(--z)) rotateX(-84deg)", opacity: 0 }, { transform: "translateZ(var(--z)) rotateX(0deg)", opacity: defs[i].op }],
          { duration: 760, delay: 150 + i * 130, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      });
      if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
        let tick = false, val = 0;
        host.addEventListener("pointermove", (e) => {
          const r = host.getBoundingClientRect(); val = (e.clientX - r.left) / r.width - .5;
          if (!tick) { tick = true; requestAnimationFrame(() => { wrap.style.setProperty("--px", val.toFixed(3)); tick = false; }); }
        });
        host.addEventListener("pointerleave", () => wrap.style.setProperty("--px", "0"));
      }
    }
  };
})(window.TR);
