/* 旅行雷达 · 基础工具（无依赖，file:// 与 http 双兼容） */
window.TR = window.TR || {};
(function (TR) {
  "use strict";

  TR.$ = (sel, root) => (root || document).querySelector(sel);
  TR.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  TR.esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  // 球面距离 km
  TR.distKm = function (a, b) {
    if (!a || !b) return null;
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)));
  };

  TR.monthNow = () => new Date().getMonth() + 1;
  TR.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // localStorage 带版本与容错
  const NS = "tr2026.";
  TR.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) {}
    },
    del(key) { try { localStorage.removeItem(NS + key); } catch (e) {} },
  };

  // hash 路由：#/radar  #/city/杭州  #/plan/xxx
  TR.router = {
    parse() {
      const raw = (location.hash || "#/radar").replace(/^#\/?/, "");
      const h = decodeURIComponent(raw.split("?")[0]);   // M3: 剥掉 utm 等 query，仅用路径匹配路由
      const seg = h.split("/").filter(Boolean);
      return { view: seg[0] || "radar", arg: seg.slice(1).join("/") || null };
    },
    go(path) { location.hash = "#/" + path; },
    onChange(fn) { window.addEventListener("hashchange", fn); },
  };

  // 惰性单次执行
  TR.once = function (fn) {
    let done = false, val;
    return function () { if (!done) { done = true; val = fn.apply(this, arguments); } return val; };
  };

  TR.prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 模态无障碍：打开后聚焦首个可交互元素、Esc 关闭、Tab 焦点不逃逸、关闭后焦点归还开启者。
     用法：设好 innerHTML 后 `const close = TR.wireModal(maskEl, baseClose)`，之后一律用返回的 close。 */
  TR.wireModal = function (mask, baseClose) {
    if (!mask) return baseClose;
    const opener = document.activeElement;
    const box = mask.querySelector(".modal-box") || mask;
    const SEL = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';
    const foc = () => TR.$$(SEL, box).filter((el) => el.offsetParent !== null);
    setTimeout(() => { const f = box.querySelector("[data-autofocus]") || foc()[0]; if (f) { try { f.focus(); } catch (e) {} } }, 0);
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = foc(); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener("keydown", onKey);
    function close() {
      document.removeEventListener("keydown", onKey);
      baseClose();
      if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
    }
    return close;
  };

  // 深度数据就绪回调（deep.js 异步加载）
  TR.whenDeep = function (cb) {
    if (window.TR_DEEP) { cb(window.TR_DEEP); return; }
    (TR._deepWaiters = TR._deepWaiters || []).push(cb);
  };
  TR.deepReady = function () {
    (TR._deepWaiters || []).forEach((cb) => { try { cb(window.TR_DEEP); } catch (e) {} });
    TR._deepWaiters = [];
  };
})(window.TR);
