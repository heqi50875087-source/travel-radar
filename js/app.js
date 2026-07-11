/* 旅行雷达 · 启动器：状态、路由、主题、deep 异步加载、SW、装机提示 */
(function (TR) {
  "use strict";

  /* ---------- 状态 ---------- */
  const DEF = {
    settings: { from: "上海", theme: "auto", font: "std" },
    ctx: { month: TR.monthNow(), days: 3, prefs: ["美食"], scope: "domestic", tier: "中端" },
    favs: [], visited: [], trips: [], notes: {},
  };
  TR.state = {
    settings: Object.assign({}, DEF.settings, TR.store.get("settings", {})),
    ctx: Object.assign({}, DEF.ctx, TR.store.get("ctx", {})),
    favs: TR.store.get("favs", []),
    visited: TR.store.get("visited", []),
    trips: TR.store.get("trips", []),
    notes: TR.store.get("notes", {}),
  };
  // 行程里的临时字段不入库
  TR.persist = function () {
    const S = TR.state;
    TR.store.set("settings", S.settings);
    TR.store.set("ctx", S.ctx);
    TR.store.set("favs", S.favs);
    TR.store.set("visited", S.visited);
    TR.store.set("trips", S.trips.map((t) => { const { _tab, _swapSeed, ...rest } = t; return rest; }));
    TR.store.set("notes", S.notes);
  };
  TR.exportState = () => ({
    settings: TR.state.settings, ctx: TR.state.ctx, favs: TR.state.favs,
    visited: TR.state.visited, trips: TR.state.trips, notes: TR.state.notes,
  });
  TR.importState = function (obj) {
    if (!obj || typeof obj !== "object") throw new Error("bad");
    const S = TR.state;
    if (Array.isArray(obj.favs)) S.favs = obj.favs;
    if (Array.isArray(obj.visited)) S.visited = obj.visited;
    if (Array.isArray(obj.trips)) S.trips = obj.trips;
    if (obj.notes && typeof obj.notes === "object") S.notes = obj.notes;
    if (obj.settings) Object.assign(S.settings, obj.settings);
    if (obj.ctx) Object.assign(S.ctx, obj.ctx);
    TR.persist(); TR.applyTheme();
  };
  TR.wipeState = function () {
    ["settings", "ctx", "favs", "visited", "trips", "notes"].forEach((k) => TR.store.del(k));
    TR.state = JSON.parse(JSON.stringify(DEF));
    TR.applyTheme();
  };

  TR.toggleFav = function (id) {
    const f = TR.state.favs, i = f.indexOf(id);
    i >= 0 ? f.splice(i, 1) : f.unshift(id);
    TR.persist();
    TR.toast(i >= 0 ? "已从想去移除" : "已加入想去 ♥");
  };
  TR.toggleVisited = function (id) {
    const v = TR.state.visited, i = v.indexOf(id);
    i >= 0 ? v.splice(i, 1) : v.unshift(id);
    TR.persist();
    if (i < 0) TR.toast("又点亮一座城 ✓");
  };

  /* ---------- toast ---------- */
  let toastTimer;
  TR.toast = function (msg) {
    const el = TR.$("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  };

  /* ---------- 主题 ---------- */
  TR.applyTheme = function () {
    const t = TR.state.settings.theme;
    const dark = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.body.setAttribute("data-font", TR.state.settings.font === "big" ? "big" : "std");
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (TR.state.settings.theme === "auto") TR.applyTheme();
  });

  /* 「关灯/开灯」主题切换：光从开关圆心涌出/收拢（View Transitions；不支持或 reduce-motion 时瞬切） */
  TR.switchTheme = function (mutate, originEl) {
    const wasDark = document.documentElement.getAttribute("data-theme") === "dark";
    const apply = () => { mutate(); TR.applyTheme(); };
    if (!document.startViewTransition || TR.prefersReducedMotion()) return apply();
    const el = originEl || document.getElementById("themeBtn");
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    document.startViewTransition(apply).ready.then(() => {
      const toDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (toDark === wasDark) return;   // 明暗未翻转（如 auto→同色），跳过圆形动画
      const light = [`circle(0px at ${cx}px ${cy}px)`, `circle(${R}px at ${cx}px ${cy}px)`];
      document.documentElement.animate(
        { clipPath: toDark ? light.slice().reverse() : light },
        { duration: toDark ? 640 : 480,                       // 关灯慢、开灯快（人眼暗适应更慢）
          easing: toDark ? "cubic-bezier(.4,0,.2,1)" : "cubic-bezier(.22,1,.36,1)",
          pseudoElement: toDark ? "::view-transition-old(root)" : "::view-transition-new(root)" });
    });
  };

  /* ---------- deep.js 异步加载（script 注入，file:// 可用） ---------- */
  function loadDeep() {
    const s = document.createElement("script");
    s.src = "data/deep.js";
    s.onload = () => TR.deepReady();
    s.onerror = () => { console.warn("deep.js 加载失败，档案降级为基础卡"); window.TR_DEEP = window.TR_DEEP || {}; TR.deepReady(); };
    document.body.appendChild(s);
  }

  /* ---------- 路由 ---------- */
  const VIEWS = { radar: 1, explore: 1, city: 1, plan: 1, me: 1 };
  function dispatch() {
    const { view, arg } = TR.router.parse();
    const v = VIEWS[view] ? view : "radar";
    const root = TR.$("#view");
    root.replaceChildren();               // 清旧监听的根（innerHTML 前先断引用）
    const fresh = root.cloneNode(false);  // 丢弃旧事件监听器
    root.parentNode.replaceChild(fresh, root);
    fresh.classList.add("view-enter");
    setTimeout(() => fresh.classList.remove("view-enter"), 600);
    TR.views[v](fresh, arg ? decodeURIComponent(arg) : null);
    // 导航高亮
    TR.$$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === v));
    // 回到顶部（档案页从头读）
    window.scrollTo(0, 0);
  }
  TR.router.onChange(dispatch);

  /* ---------- 主题按钮 ---------- */
  TR.$("#themeBtn").addEventListener("click", (e) => {
    const cur = document.documentElement.getAttribute("data-theme");
    TR.switchTheme(() => { TR.state.settings.theme = cur === "dark" ? "light" : "dark"; TR.persist(); }, e.currentTarget);
  });

  /* ---------- Service Worker（仅 https；file:// 全功能不依赖） ---------- */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ---------- iOS 装机提示（一次性） ---------- */
  function installHint() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS && !standalone && !TR.store.get("hintShown", false) && location.protocol === "https:") {
      setTimeout(() => {
        TR.toast("Safari 分享 → 添加到主屏幕，就能当 App 用");
        TR.store.set("hintShown", true);
      }, 6000);
    }
  }

  /* ---------- 启动 ---------- */
  TR.applyTheme();
  if (!location.hash) location.hash = "#/radar";
  dispatch();
  loadDeep();
  installHint();
})(window.TR);
