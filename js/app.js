/* 旅行雷达 · 启动器：状态、路由、主题、deep 异步加载、SW、装机提示 */
(function (TR) {
  "use strict";

  /* ---------- 状态 ---------- */
  const DEF = {
    settings: { from: "上海", theme: "auto", font: "std", sound: true },
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
    TR.store.set("trips", S.trips.map((t) => { const { _tab, _swapSeed, _fresh, ...rest } = t; return rest; }));
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
    if (i < 0 && TR.sfx) TR.sfx.save();
    TR.toast(i >= 0 ? "已从想去移除" : "已加入想去 ♥");
  };
  TR.toggleVisited = function (id) {
    const v = TR.state.visited, i = v.indexOf(id);
    i >= 0 ? v.splice(i, 1) : v.unshift(id);
    TR.persist();
    if (i < 0) {
      if (TR.fx && TR.fx.stamp) { const d = new Date(), mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0"); TR.fx.stamp({ text: id, sub: "打卡 · " + mm + "." + dd, flyTo: "me" }); }
      else { if (TR.sfx) TR.sfx.save(); TR.toast("又点亮一座城 ✓"); }
    }
  };

  /* 抽一座城：旅行最大的快乐是"发现"——优先当前范围内有深度档案的城，直达档案页 */
  TR.randomCity = function () {
    const cities = window.TR_CORE.cities, scope = TR.state.ctx.scope;
    let pool = cities.filter((c) => (scope === "intl" ? c.intl : !c.intl) && c.hasDeep);
    if (pool.length < 5) pool = cities.filter((c) => (scope === "intl" ? c.intl : !c.intl));
    if (!pool.length) pool = cities;
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (TR.sfx) TR.sfx.pick();
    TR.toast("缘分指向 " + c.id + " ✨");
    TR.router.go("city/" + c.id);
  };

  /* 建一份行程：档案页「存进行囊」与行囊页「生成草稿」共用（需 deep 已就绪） */
  TR.createTrip = function (cityId, days, month, pace, date) {
    return {
      id: "t" + Date.now().toString(36),
      city: cityId, days: days, month: month, pace: pace,
      date: date || "", created: new Date().toLocaleDateString("zh-CN"),
      itin: TR.engine.genItinerary(cityId, days, pace), packDone: {}, _fresh: true,
    };
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
    const f = TR.state.settings.font;
    document.body.setAttribute("data-font", f === "big" || f === "xl" ? f : "std");
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (TR.state.settings.theme === "auto") TR.applyTheme();
  });

  /* 「关灯/开灯」主题切换：光从开关圆心涌出/收拢（View Transitions；不支持或 reduce-motion 时瞬切） */
  TR.switchTheme = function (mutate, originEl) {
    const wasDark = document.documentElement.getAttribute("data-theme") === "dark";
    const apply = () => { mutate(); TR.applyTheme(); };
    // 闸门：过渡进行中再点、或不支持/减动画 → 直接瞬切、不叠动画。
    // 超长档案页上快速连点会堆叠多重 View Transition（各自给整页拍快照）拖垮主线程致卡死，这道闸门根治。
    if (!document.startViewTransition || TR.prefersReducedMotion() || TR._vtBusy) return apply();
    const el = originEl || document.getElementById("themeBtn");
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 4;  // +4 盖住对角锯齿缝
    TR._vtBusy = true;
    const vt = document.startViewTransition(apply);
    vt.finished.finally(() => { TR._vtBusy = false; });
    vt.ready.then(() => {
      const toDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (toDark === wasDark) return;   // 明暗未翻转（如 auto→同色），跳过圆形动画
      const light = [`circle(0px at ${cx}px ${cy}px)`, `circle(${R}px at ${cx}px ${cy}px)`];
      document.documentElement.animate(
        { clipPath: toDark ? light.slice().reverse() : light },
        { duration: toDark ? 640 : 480,                       // 关灯慢、开灯快（人眼暗适应更慢）
          easing: toDark ? "cubic-bezier(.4,0,.2,1)" : "cubic-bezier(.22,1,.36,1)",
          fill: "forwards",                                   // 终态保持到过渡拆除，杜绝结束闪帧
          pseudoElement: toDark ? "::view-transition-old(root)" : "::view-transition-new(root)" });
    }).catch(() => {});
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
  const VIEWS = { radar: 1, explore: 1, city: 1, plan: 1, me: 1, about: 1, privacy: 1, help: 1 };
  function dispatch() {
    const { view, arg } = TR.router.parse();
    // 已知视图正常渲染；未知路由 → 走丢页（保留地址栏坏 hash，不静默假装是雷达）
    const v = VIEWS[view] ? view : (TR.views.notFound ? "notFound" : "radar");
    const root = TR.$("#view");
    root.replaceChildren();               // 清旧监听的根（innerHTML 前先断引用）
    const fresh = root.cloneNode(false);  // 丢弃旧事件监听器
    root.parentNode.replaceChild(fresh, root);
    fresh.classList.add("view-enter");
    setTimeout(() => fresh.classList.remove("view-enter"), 600);
    TR.views[v](fresh, arg ? decodeURIComponent(arg) : null);
    // 导航高亮 + aria-current（屏读播报当前页）
    TR.$$("[data-nav]").forEach((a) => {
      const on = a.dataset.nav === v;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    // 回到顶部（档案页从头读）
    window.scrollTo(0, 0);
  }
  TR.router.onChange(dispatch);

  /* ---------- 主题按钮 ---------- */
  TR.$("#themeBtn").addEventListener("click", (e) => {
    const cur = document.documentElement.getAttribute("data-theme");
    const toDark = cur !== "dark";
    if (TR.fx && TR.fx.lightCeremony) TR.fx.lightCeremony(e.currentTarget, toDark);   // 点灯仪式：日落月升+星子
    TR.switchTheme(() => { TR.state.settings.theme = toDark ? "dark" : "light"; TR.persist(); }, e.currentTarget);
  });

  /* ---------- 跳到主内容（WCAG 2.4.1 Bypass Blocks）：hash 路由下手动移焦，避免 #view 被当路由 ---------- */
  (function () {
    const sk = TR.$("#skipLink");
    if (sk) sk.addEventListener("click", (e) => { e.preventDefault(); const m = TR.$("#view"); if (m) { m.setAttribute("tabindex", "-1"); m.focus(); } });
  })();

  /* ---------- 键盘：readonly 的选择器输入用 Enter/Space 打开（click 不会被键盘触发） ---------- */
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList && e.target.classList.contains("picker-input")) {
      e.preventDefault(); e.target.click();
    }
  });

  /* ---------- Service Worker（仅 https；file:// 全功能不依赖） ---------- */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    // 新版 SW 接管后自动刷新一次拿到最新（首访无旧 SW 不刷，避免刷新循环）
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing || !hadController) return;
      refreshing = true; location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => { try { reg.update(); } catch (e) {} }).catch(() => {});
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
  if (TR.sfx) TR.sfx.setOn(TR.state.settings.sound !== false);
  if (!location.hash) location.hash = "#/radar";
  dispatch();
  loadDeep();
  installHint();
  if (TR.onboard) TR.onboard();
  // E1 季节角标：底栏「雷达」按当前月出一枚小节气（3-5🌸 6-8🍃 9-11🍂 12-2❄）
  (function () {
    const m = TR.monthNow(), e = m >= 3 && m <= 5 ? "🌸" : m >= 6 && m <= 8 ? "🍃" : m >= 9 && m <= 11 ? "🍂" : "❄️";
    const lab = document.querySelector('.tabbar a[data-nav="radar"] span');
    if (lab && !lab.querySelector(".season-badge")) { const s = document.createElement("sup"); s.className = "season-badge"; s.textContent = e; s.setAttribute("aria-hidden", "true"); lab.appendChild(s); }
  })();
})(window.TR);
