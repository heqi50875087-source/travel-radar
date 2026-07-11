/* 旅行雷达 · 视图层（全部 innerHTML 模板 + 事件委托） */
(function (TR) {
  "use strict";
  const V = (TR.views = {});
  const $ = TR.$, $$ = TR.$$, esc = TR.esc, E = () => TR.engine;

  const cityById = (id) => window.TR_CORE.cities.find((c) => c.id === id);
  const MONTH_ICONS = ["❄️", "🏮", "🌸", "🌷", "🌿", "🌧", "🔥", "🌻", "🍂", "🍁", "🍂", "⛄️"];
  const REGION_ORDER = ["华东", "华南", "华中", "华北", "西南", "西北", "东北", "海岛", "小众·国内", "国际·亚洲", "海外·韩国", "国际·欧洲", "国际·美洲", "国际·大洋洲", "国际·非洲", "小众·国际"];

  /* ========== 雷达 ========== */
  V.radar = function (root) {
    const S = TR.state;
    const ctx = S.ctx;
    root.innerHTML = `
    <section class="hero contour">
      <canvas class="hero-canvas" id="radarCanvas" aria-hidden="true"></canvas>
      <div class="hero-inner">
        <p class="eyebrow">PERSONAL TRAVEL RADAR · 私人旅行参谋</p>
        <h1>这个月，<em>去哪儿</em><br>见一面世界？</h1>
        <p class="sub">把月份、假期和你的口味交给雷达，它从 ${window.TR_CORE.cities.length} 个目的地里替你收敛成三个答案——每个都说人话、给理由、提前预警。</p>
        <div class="pledge">
          <span><b>零</b>广告 · 零佣金</span><span><b>离线</b>可用</span><span>数据<b>只留在你的设备</b></span>
        </div>
      </div>
    </section>

    <section class="radar-panel card rv">
      <div class="rp-row">
        <span class="rp-label">出发</span>
        <input class="from-input picker-input" id="fromInput" value="${esc(S.settings.from)}" readonly aria-label="出发城市" placeholder="选择出发地">
        <div class="scope-switch" role="group" aria-label="国内或国际">
          <button data-scope="domestic" class="${ctx.scope === "domestic" ? "on" : ""}">🇨🇳 国内</button>
          <button data-scope="intl" class="${ctx.scope === "intl" ? "on" : ""}">🌏 国际</button>
        </div>
      </div>
      <div class="rp-row">
        <span class="rp-label">月份</span>
        <div class="rp-group" id="monthChips">
          ${Array.from({ length: 12 }, (_, i) => `<button class="chip ${ctx.month === i + 1 ? "on-terra" : ""}" data-month="${i + 1}">${i + 1}月</button>`).join("")}
        </div>
      </div>
      <div class="rp-row">
        <span class="rp-label">天数</span>
        <div class="stepper"><button data-days="-1" aria-label="减少">−</button><b id="daysVal">${ctx.days} 天</b><button data-days="1" aria-label="增加">＋</button></div>
        <span class="rp-label" style="margin-left:8px">预算</span>
        <div class="rp-group">
          ${["经济", "中端", "品质"].map((t) => `<button class="chip ${ctx.tier === t ? "on" : ""}" data-tier="${t}">${t}</button>`).join("")}
        </div>
      </div>
      <div class="rp-row" style="align-items:flex-start">
        <span class="rp-label" style="padding-top:7px">偏好</span>
        <div class="rp-group">
          ${E().PREFS.map((p) => `<button class="chip ${ctx.prefs.includes(p.id) ? "on-terra" : ""}" data-pref="${esc(p.id)}">${p.icon} ${p.id}</button>`).join("")}
        </div>
      </div>
    </section>

    <div class="sec-head rv"><span class="idx">No.01</span><h2>雷达锁定</h2><span class="hint" id="scanHint"></span></div>
    <div class="top-grid" id="topGrid"></div>
    <p class="radar-nudge rv">三个都不来电？往下翻候补，或回上面调一调口味偏好。</p>
    <div class="sec-head rv"><span class="idx">No.02</span><h2>候补名单</h2><span class="hint" id="moreHint"></span></div>
    <div class="more-grid" id="moreGrid"></div>
    <div class="more-foot"><button class="btn ghost" id="scanMore" hidden>再扫描 12 城 →</button></div>`;

    let lastRes = [], moreShown = 12;
    const moreCard = (r) => `
        <article class="card hover mini-card" data-city="${esc(r.city.id)}">
          <h4>${esc(r.city.id)}</h4>
          <p class="prov">${esc(r.city.province)}</p>
          <p class="why">${esc(r.reasons[0] ? r.reasons[0].txt : r.city.tagline)}</p>
        </article>`;
    function updateMoreBtn() {
      const btn = $("#scanMore"), hint = $("#moreHint"), total = Math.max(0, lastRes.length - 3);
      const shown = Math.min(moreShown, total);
      if (shown >= total) { btn.hidden = true; hint.textContent = total ? `雷达已扫完全部 ${lastRes.length} 城` : ""; }
      else { btn.hidden = false; btn.textContent = `再扫描 ${Math.min(12, total - shown)} 城 →`; hint.textContent = `已列 ${shown} / ${total}`; }
    }
    function recompute() {
      const res = E().recommend({ from: S.settings.from, month: ctx.month, days: ctx.days, prefs: ctx.prefs, scope: ctx.scope, tier: ctx.tier });
      lastRes = res; moreShown = 12;   // 换档：候补分页归零回 12
      const top = res.slice(0, 3), more = res.slice(3, 3 + moreShown);
      $("#scanHint").textContent = `${ctx.month}月 · ${ctx.days}天 · 从${S.settings.from}出发 · 扫描 ${res.length} 城`;
      TR.fx.swapGrid($("#topGrid"), top.map((r, i) => `
        <article class="card hover top-card" data-city="${esc(r.city.id)}" data-tilt>
          <span class="edge"></span><span class="rank">No.${i + 1}</span>
          <h3>${esc(r.city.id)}</h3>
          <p class="prov">${esc(r.city.region)} · ${esc(r.city.province)}${r.city.hasDeep ? " · 深度档案 ●" : ""}</p>
          <p class="tagline">${esc(r.city.tagline)}</p>
          <ul class="reasons">${r.reasons.slice(0, 4).map((x) => `<li>${esc(x.txt)}</li>`).join("")}</ul>
          ${r.warns.length ? `<ul class="warns">${r.warns.slice(0, 2).map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
          <div class="acts">
            <button class="btn sm terra" data-open="${esc(r.city.id)}">看档案</button>
            <button class="btn sm ghost" data-fav="${esc(r.city.id)}">${S.favs.includes(r.city.id) ? "已想去 ♥" : "想去 ♡"}</button>
          </div>
        </article>`).join(""));
      TR.fx.swapGrid($("#moreGrid"), more.map(moreCard).join(""));
      updateMoreBtn();
      // 雷达罗盘光点：按真实方位角+距离投到罗盘
      const C = window.TR_CORE.coords, o = C[S.settings.from];
      const dots = [];
      if (o) {
        res.slice(0, 40).forEach((r, i) => {
          const t = C[r.city.id];
          if (!t) return;
          const dx = t.lng - o.lng, dy = t.lat - o.lat;
          const ang = Math.atan2(-dy, dx);
          const dist = Math.min(1, Math.hypot(dx, dy) / (ctx.scope === "intl" ? 130 : 26));
          dots.push({ x: 0.5 + Math.cos(ang) * dist * 0.46, y: 0.5 + Math.sin(ang) * dist * 0.46, hot: i < 3 });
        });
      }
      TR.fx.radarSweep($("#radarCanvas"), { dots });   // 原地更新光点，扫描持续运行——不再拆重建（消除频闪 + 泄漏）
      TR.persist();
    }
    function scanMore() {   // 候补追加下一批 12（不替换已见，保留空间记忆），滚动锚定到新批首张
      const total = Math.max(0, lastRes.length - 3), prev = moreShown;
      moreShown = Math.min(moreShown + 12, total);
      const grid = $("#moreGrid"), tmp = document.createElement("div");
      tmp.innerHTML = lastRes.slice(3 + prev, 3 + moreShown).map(moreCard).join("");
      const nodes = Array.prototype.slice.call(tmp.children);
      nodes.forEach((c, i) => { grid.appendChild(c); if (!TR.prefersReducedMotion()) c.animate({ opacity: [0, 1], transform: ["translateY(14px)", "none"] }, { duration: 320, delay: Math.min(i * 60, 360), easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }); });
      updateMoreBtn();
      if (nodes[0]) nodes[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (!root._radarBound) { root._radarBound = true;
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button, [data-city]");
      if (!b) return;
      if (b.id === "scanMore") { scanMore(); return; }
      if (b.dataset.scope) { ctx.scope = b.dataset.scope; $$("[data-scope]").forEach((x) => x.classList.toggle("on", x.dataset.scope === ctx.scope)); recompute(); return; }
      if (b.dataset.month) { ctx.month = +b.dataset.month; $$("#monthChips .chip").forEach((c) => c.classList.toggle("on-terra", +c.dataset.month === ctx.month)); recompute(); return; }
      if (b.dataset.days) { ctx.days = TR.clamp(ctx.days + (+b.dataset.days), 1, 20); $("#daysVal").textContent = ctx.days + " 天"; recompute(); return; }
      if (b.dataset.tier) { ctx.tier = b.dataset.tier; $$("[data-tier]").forEach((c) => c.classList.toggle("on", c.dataset.tier === ctx.tier)); recompute(); return; }
      if (b.dataset.pref) {
        const i = ctx.prefs.indexOf(b.dataset.pref);
        i >= 0 ? ctx.prefs.splice(i, 1) : ctx.prefs.push(b.dataset.pref);
        b.classList.toggle("on-terra"); recompute(); return;
      }
      if (b.dataset.fav != null) { TR.toggleFav(b.dataset.fav); b.textContent = S.favs.includes(b.dataset.fav) ? "已想去 ♥" : "想去 ♡"; return; }
      if (b.dataset.open) { TR.router.go("city/" + b.dataset.open); return; }
      const cardEl = e.target.closest("[data-city]");
      if (cardEl && !e.target.closest("button")) TR.router.go("city/" + cardEl.dataset.city);
    }); }
    $("#fromInput").addEventListener("click", () => cityPicker(S.settings.from, (id) => {
      S.settings.from = id; $("#fromInput").value = id; TR.persist(); recompute(); TR.toast("出发地已设为 " + id);
    }));

    recompute();
    TR.fx.reveal(root); TR.fx.tilt(root);
  };

  /* ========== 城市（探索） ========== */
  V.explore = function (root) {
    const S = TR.state;
    let kw = "", region = S.exploreRegion || "全部";
    const regions = ["全部", ...REGION_ORDER.filter((r) => window.TR_CORE.cities.some((c) => c.region === r))];
    root.innerHTML = `
    <section class="explore-head">
      <div class="sec-head" style="margin-top:24px"><span class="idx">Atlas</span><h2>城市图集</h2><span class="hint">${window.TR_CORE.cities.length} 城 · ${Object.keys(window.TR_DEEP || {}).length || 90} 份深度档案</span></div>
      <div class="search-row"><input class="field" id="citySearch" placeholder="搜城市 / 省份 / 关键词（如：早茶、雪、古镇）" autocomplete="off"></div>
      <div class="const-wrap rv">
        <canvas class="const-canvas" id="constCanvas"></canvas>
        <span class="const-cap">星座图 · 亮点=有深度档案 · 点击直达</span>
      </div>
      <div class="region-tabs" id="regionTabs">
        ${regions.map((r) => `<button class="chip ${r === region ? "on" : ""}" data-region="${esc(r)}">${esc(r)}</button>`).join("")}
      </div>
    </section>
    <div class="city-grid" id="cityGrid"></div>`;

    function renderGrid() {
      const list = window.TR_CORE.cities.filter((c) => {
        if (region !== "全部" && c.region !== region) return false;
        if (!kw) return true;
        const hay = [c.id, c.province, c.region, c.tagline, (c.foodTags || []).join(""), (c.mustEat || []).join(""), (c.highlights || []).join("")].join(" ").toLowerCase();
        return hay.includes(kw.toLowerCase());
      });
      $("#cityGrid").innerHTML = list.length ? list.map((c) => `
        <article class="card hover city-card" data-city="${esc(c.id)}">
          <h4>${esc(c.id)} ${c.hasDeep ? '<span class="deep-dot" title="有深度档案"></span>' : ""}</h4>
          <p class="prov">${esc(c.province)} · ${esc(c.region)}</p>
          <p class="tl">${esc(c.tagline)}</p>
          <div class="foot"><span class="tag brass">${esc(c.days || "")}</span><span class="tag pine">¥${c.perDay}/天</span>${S.favs.includes(c.id) ? '<span class="tag terra">想去</span>' : ""}${S.visited.includes(c.id) ? '<span class="tag cyan">去过</span>' : ""}</div>
        </article>`).join("")
        : `<div class="empty" style="grid-column:1/-1"><b>没有匹配</b>换个关键词，或清空搜索</div>`;
    }
    $("#citySearch").addEventListener("input", (e) => { kw = e.target.value.trim(); renderGrid(); });
    $("#regionTabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-region]");
      if (!b) return;
      region = b.dataset.region; S.exploreRegion = region;
      $$("#regionTabs .chip").forEach((c) => c.classList.toggle("on", c.dataset.region === region));
      renderGrid();
    });
    root.addEventListener("click", (e) => {
      const card = e.target.closest(".city-card");
      if (card) TR.router.go("city/" + card.dataset.city);
    });
    renderGrid();
    TR.fx.constellation($("#constCanvas"), window.TR_CORE.cities, (c) => TR.router.go("city/" + c.id));
    TR.fx.reveal(root);
  };

  /* ========== 城市档案 ========== */
  V.city = function (root, id) {
    const c = cityById(id);
    if (!c) { root.innerHTML = `<div class="empty" style="margin-top:40px"><b>没有找到「${esc(id)}」</b><a class="btn sm ghost" href="#/explore" style="margin-top:10px">回城市图集</a></div>`; return; }
    const S = TR.state;
    root.innerHTML = `<div class="profile"><div class="profile-top">
      <button class="back-btn" onclick="history.back()">← 返回</button>
      <span style="flex:1"></span>
      <button class="btn sm ghost fav-btn ${S.favs.includes(id) ? "on" : ""}" id="favBtn">${S.favs.includes(id) ? "已想去 ♥" : "想去 ♡"}</button>
      <button class="btn sm ghost visited-btn ${S.visited.includes(id) ? "on" : ""}" id="visitedBtn">${S.visited.includes(id) ? "去过 ✓" : "去过?"}</button>
    </div><div id="profileBody"><div class="empty" style="margin-top:30px"><b>翻档案中……</b></div></div></div>`;

    $("#favBtn").addEventListener("click", () => { TR.toggleFav(id); V.city(root, id); });
    $("#visitedBtn").addEventListener("click", () => { TR.toggleVisited(id); V.city(root, id); });

    TR.whenDeep(() => renderProfile(root, c));
  };

  function renderProfile(root, c) {
    const S = TR.state;
    const body = $("#profileBody", root);
    if (!body) return;
    const d = (window.TR_DEEP || {})[c.id];
    const climate = (window.TR_CORE.climate || {})[c.id];
    const nowM = TR.monthNow();
    const amap = (kw) => E().amapLink(kw, c.id);

    // 道德经改版：条目不再挂内联链接——点条目弹小抽屉（导航/记笔记/复制）
    const item = (x, extra) => `<button class="item act ${extra || ""}" data-item="${esc(x)}">${esc(x)}</button>`;
    const chipFlow = (arr, top3) => `<div class="chips-flow">${arr.map((x, i) => item(x, top3 && i < 3 ? "top" : "")).join("")}</div>`;
    const rows = (arr, clickable) => `<div class="list-rows">${arr.map((x) => clickable
      ? `<div class="row"><span>${item(x)}</span></div>`
      : `<div class="row"><span>${esc(x)}</span></div>`).join("")}</div>`;
    // 折叠：先见精选，一点展开（kind: chips/rows/grid 决定预览高度）
    const fold = (html, kind, count, threshold) => count > threshold
      ? `<div class="fold folded f-${kind}">${html}</div><button class="fold-btn" data-fold>展开全部 ${count} 项 <i>↓</i></button>`
      : html;

    /* 十二月历 */
    let monthsHtml = "";
    if (d && d.seasons && d.seasons.length) {
      monthsHtml = d.seasons.map((s) => {
        const mNum = parseInt(s.month, 10);
        const cl = climate && climate[s.month];
        const temp = cl && cl.tempBase ? `${cl.tempBase[0]}~${cl.tempBase[1]}°C` : "";
        return `<div class="m-cell ${mNum === nowM ? "now" : ""} ${(c.bestMonths || []).includes(mNum) ? "best" : ""}">
          <div class="m-n">${esc(s.month)}<span class="ic">${esc(s.icon || "")}</span></div>
          <div class="m-t">${temp}</div>
          <div class="m-what">${esc(s.what)}</div></div>`;
      }).join("");
    } else if (climate) {
      monthsHtml = Array.from({ length: 12 }, (_, i) => {
        const key = (i + 1) + "月", cl = climate[key];
        if (!cl) return "";
        return `<div class="m-cell ${i + 1 === nowM ? "now" : ""} ${(c.bestMonths || []).includes(i + 1) ? "best" : ""}">
          <div class="m-n">${key}<span class="ic">${esc((cl.iconSet || [])[0] || MONTH_ICONS[i])}</span></div>
          <div class="m-t">${cl.tempBase ? cl.tempBase[0] + "~" + cl.tempBase[1] + "°C" : ""}</div>
          <div class="m-what">${esc((cl.condSet || []).slice(0, 3).join(" · "))}</div></div>`;
      }).join("");
    }

    /* 本月看点（当月物候+时令自动浮出） */
    let nowCard = "";
    if (d) {
      const nowSeason = (d.seasons || []).find((s) => parseInt(s.month, 10) === nowM);
      const mre = new RegExp("(^|[^0-9])" + nowM + "\\s*月");
      const nowPheno = (d.phenology || []).filter((p) => p.when && mre.test(p.when)).slice(0, 3);
      if (nowSeason || nowPheno.length) {
        nowCard = `<section class="card block now-card rv"><h3><span class="ping"></span>本月看点 · ${nowM}月</h3>
          ${nowSeason ? `<p class="now-what">${esc(nowSeason.icon || "")} ${esc(nowSeason.what)}</p>` : ""}
          ${nowPheno.length ? `<div class="chips-flow" style="margin-top:10px">${nowPheno.map((p) => `<span class="item bob">${esc(p.icon || "🌿")} ${esc(p.name)} · ${esc(p.where || p.when)}</span>`).join("")}</div>` : ""}
        </section>`;
      }
    }

    const solo = E().soloFood(c.id);
    const blocks = [];
    const anchors = [];
    const B = (aid, aname, cls, ico, title, count, inner) => {
      anchors.push({ aid, aname });
      blocks.push(`<section class="card block ${cls} rv" id="a-${aid}"><h3><span class="b-ico">${ico}</span>${title}${count ? ` <span class="b-count">×${count}</span>` : ""}</h3>${inner}</section>`);
    };

    if (d && d.radar && d.radar.quickGlance) {
      const q = d.radar.quickGlance;
      B("glance", "速览", "wide", "🧭", "速览", "", `<div class="list-rows">${q.bullets.map((b) => `<div class="row"><span>${esc(b)}</span></div>`).join("")}</div>
        <div class="chips-flow" style="margin-top:12px">${(q.tags || []).map((t) => `<span class="tag brass">${esc(t)}</span>`).join(" ")}</div>`);
    }
    if (monthsHtml) B("months", "月历", "full", "📅", "十二月历", "", `<div class="months-strip">${monthsHtml}</div><p class="desc" style="margin-top:4px">红框=当前月 · 金边=最佳季（${esc((c.seasons || []).join("、"))}）</p>`);
    if (d && d.mustEat2 && d.mustEat2.length) B("eat", "吃", "", "🍜", "必吃", d.mustEat2.length, fold(chipFlow(d.mustEat2, true), "chips", d.mustEat2.length, 12) + `<p class="desc tap-hint">点任意一项 → 导航 / 记笔记</p>`);
    if (solo.easy.length || solo.hard.length) B("solo", "一人食", "", "🥢", "一人食指北", "", `<div class="solo-cols">
      ${solo.easy.length ? `<div><h4>一个人吃刚刚好</h4>${chipFlow(solo.easy.slice(0, 8))}</div>` : ""}
      ${solo.hard.length ? `<div class="hardline"><h4>大菜 · 拼午市或例份</h4>${chipFlow(solo.hard.slice(0, 4))}</div>` : ""}
      </div>${solo.tip ? `<p class="solo-tip">💡 ${esc(solo.tip)}</p>` : ""}`);
    if (d && d.oldShops && d.oldShops.length) B("shops", "老字号", "", "🏮", "老字号", d.oldShops.length, fold(rows(d.oldShops, true), "rows", d.oldShops.length, 6));
    if (d && d.localFav && d.localFav.length) B("local", "心水", "", "❤️", "本地人心水", d.localFav.length, fold(rows(d.localFav, true), "rows", d.localFav.length, 6));
    if (d && d.highlights2 && d.highlights2.length) B("sights", "看点", "wide", "🗺", "看点", d.highlights2.length, fold(chipFlow(d.highlights2), "chips", d.highlights2.length, 12));
    if (d && d.smallStreets && d.smallStreets.length) B("streets", "街巷", "", "🏘", "老街小巷", d.smallStreets.length, fold(rows(d.smallStreets, true), "rows", d.smallStreets.length, 6));
    if (d && d.phenology && d.phenology.length) B("pheno", "物候", "wide", "🌸", "物候历", d.phenology.length, fold(`<div class="pheno-grid">${d.phenology.map((p) => `
      <div class="pheno"><div class="p-name"><i class="p-ico">${esc(p.icon || "🌿")}</i> ${esc(p.name)}</div><div class="p-when">${esc(p.when || "")}</div><div class="p-where">${esc(p.where || "")}</div></div>`).join("")}</div>`, "grid", d.phenology.length, 8));
    if (d && d.wildlife && d.wildlife.length) B("wild", "野生", "", "🐦", "野生小友", d.wildlife.length, fold(`<div class="pheno-grid">${d.wildlife.map((w) => `
      <div class="pheno"><div class="p-name"><i class="p-ico">${esc(w.icon || "🐾")}</i> ${esc(w.name)}</div><div class="p-where">${esc(w.where || "")}</div>${w.tip ? `<div class="p-when">${esc(w.tip)}</div>` : ""}</div>`).join("")}</div>`, "grid", d.wildlife.length, 6));
    // 交通住宿 + 一键预订跳转（融合：查-订-导航一条线）
    const goLinks = `<div class="go-links" id="bizGoLinks"></div>`;  // M1: TR.biz.renderLinks 注入订票深链
    if (d && d.radar && d.radar.travel) {
      const t = d.radar.travel;
      B("go", "交通住宿", "wide", "🚄", "抵达与住宿", "", `<div class="list-rows">
        ${t.fromTransport ? `<div class="row"><span><b>怎么去：</b>${esc(t.fromTransport)}</span></div>` : ""}
        ${t.cityTransport ? `<div class="row"><span><b>市内：</b>${esc(t.cityTransport)}</span></div>` : ""}</div>
        ${goLinks}
        ${t.stayZones && t.stayZones.length ? `<h4 style="margin:14px 0 9px;font-size:13.5px">🛏 住宿片区怎么选</h4><div class="stay-grid">${t.stayZones.map((z) => `<div class="stay"><b>${esc(z.name)}</b><span>${esc(z.vibe)}</span></div>`).join("")}</div>` : ""}
        ${t.tips && t.tips.length ? `<h4 style="margin:14px 0 9px;font-size:13.5px">📌 实操提示</h4>` + fold(rows(t.tips), "rows", t.tips.length, 5) : ""}`);
    } else {
      B("go", "预订", "", "🚄", "查订直达", "", goLinks);
    }
    if (d && d.radar && d.radar.tips) {
      const tp = d.radar.tips;
      if (tp.avoid && tp.avoid.length) B("avoid", "防坑", "wide avoid", "🛡", "防坑清单", tp.avoid.length, rows(tp.avoid));
      if (tp.etiquette && tp.etiquette.length) B("etiq", "随俗", "etiq", "🤝", "入乡随俗", "", rows(tp.etiquette));
    }
    if (d && d.inspiration) {
      const ins = d.inspiration;
      const seg = [];
      if (ins.locals && ins.locals.length) seg.push(`<h4 style="margin:0 0 9px;font-size:13.5px;color:var(--pine)">本地人才知道</h4>${rows(ins.locals, true)}`);
      if (ins.hidden && ins.hidden.length) seg.push(`<h4 style="margin:14px 0 9px;font-size:13.5px;color:var(--brass)">游客罕至</h4>${rows(ins.hidden, true)}`);
      if (ins.routes && ins.routes.length) seg.push(`<h4 style="margin:14px 0 9px;font-size:13.5px;color:var(--terra)">串线参考</h4>${rows(ins.routes)}`);
      if (seg.length) {
        const total = (ins.locals || []).length + (ins.hidden || []).length + (ins.routes || []).length;
        B("insp", "灵感", "full", "✨", "灵感 · 换个玩法", "", fold(seg.join(""), "rows", total, 8));
      }
    }
    if (!d) {
      B("base", "档案", "wide", "🗂", "基础档案", "", `<div class="list-rows">
        <div class="row"><span><b>看点：</b>${esc((c.highlights || []).join("、"))}</span></div>
        <div class="row"><span><b>必吃：</b>${esc((c.mustEat || []).join("、"))}</span></div>
        ${c.note ? `<div class="row"><span><b>提示：</b>${esc(c.note)}</span></div>` : ""}
        ${c.passport ? `<div class="row"><span><b>签证：</b>${esc(c.passport)}${c.currency ? " · 货币 " + esc(c.currency) : ""}</span></div>` : ""}
      </div><p class="desc" style="margin-top:10px">这座城市还没收录 14 区块深度档案，以上是基础卡。</p>`);
    }
    B("note", "笔记", "full", "📝", "我的笔记", "", `<textarea class="note-area" id="cityNote" placeholder="写点什么：想吃的店、朋友的建议、踩过的坑……只保存在你自己的设备里">${esc(S.notes[c.id] || "")}</textarea><span class="note-saved" id="noteSaved">已记下 ✓</span>`);

    body.innerHTML = `
      <section class="profile-hero contour">
        <h1 class="cityname">${esc(c.id)}<small>${esc(c.region)} · ${esc(c.province)}</small></h1>
        <p class="tagline">${esc(c.tagline)}</p>
        <div class="profile-meta">
          <span class="tag brass">建议 ${esc(c.days || "随意")}</span>
          <span class="tag pine">人均 ¥${c.perDay}/天</span>
          <span class="tag terra">最佳 ${esc((c.seasons || []).join(" · "))}</span>
          ${c.passport ? `<span class="tag cyan">${esc(c.passport)}</span>` : ""}
        </div>
        <div class="profile-acts">
          <button class="btn terra" id="genTripBtn">🎒 生成行程草稿</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="${E().amapLink(c.id, c.id)}">🗺 打开高德</a>
        </div>
      </section>
      ${nowCard}
      ${anchors.length > 3 ? `<nav class="anchor-nav glass" id="anchorNav">${anchors.map((a) => `<button class="chip" data-anchor="${a.aid}">${esc(a.aname)}</button>`).join("")}</nav>` : ""}
      <div class="bento">${blocks.join("")}</div>`;

    $("#genTripBtn").addEventListener("click", () => { TR.state.planPrefill = c.id; TR.router.go("plan"); });
    let noteTimer;
    $("#cityNote").addEventListener("input", (e) => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        const v = e.target.value.trim();
        if (v) S.notes[c.id] = v; else delete S.notes[c.id];
        TR.persist();
        const ns = $("#noteSaved"); if (ns) { ns.classList.add("show"); clearTimeout(ns._t); ns._t = setTimeout(() => ns.classList.remove("show"), 1200); }
      }, 400);
    });

    // 折叠展开 + 条目小抽屉 + 锚点跳转（委托一次）
    if (!body._pbBound) { body._pbBound = true;
      body.addEventListener("click", (e) => {
        const fb = e.target.closest("[data-fold]");
        if (fb) {
          const f = fb.previousElementSibling;
          f.style.maxHeight = f.scrollHeight + "px";
          requestAnimationFrame(() => f.classList.remove("folded"));
          setTimeout(() => { f.style.maxHeight = ""; }, 500);
          fb.remove();
          return;
        }
        const it = e.target.closest("[data-item]");
        if (it) { itemSheet(it.dataset.item, c.id); return; }
        const an = e.target.closest("[data-anchor]");
        if (an) {
          const t = $("#a-" + an.dataset.anchor);
          if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      });
    }
    // 锚点 scroll-spy
    const nav = $("#anchorNav");
    if (nav) {
      const spy = new IntersectionObserver((ents) => {
        for (const en of ents) {
          if (en.isIntersecting) {
            const aid = en.target.id.replace(/^a-/, "");
            TR.$$(".chip", nav).forEach((ch) => ch.classList.toggle("on", ch.dataset.anchor === aid));
          }
        }
      }, { rootMargin: "-30% 0px -60% 0px" });
      anchors.forEach((a) => { const el = $("#a-" + a.aid); if (el) spy.observe(el); });
    }
    // M1 订票深链 + M3「分享这座城」按钮（DOM 就绪后注入；模块缺席则无副作用）
    if (window.TR && TR.biz) { const _bs = $("#bizGoLinks", body); if (_bs) TR.biz.renderLinks(_bs, c); }
    if (window.TR && TR.share) { const _ah = $(".profile-acts", body); if (_ah) TR.share.button(_ah, c); }
    TR.fx.reveal(body);
  }

  /* 条目小抽屉：导航 / 记笔记 / 复制 */
  function itemSheet(name, cityId) {
    const S = TR.state;
    const rootM = $("#modal-root");
    rootM.innerHTML = `<div class="modal-mask" id="sheetMask"><div class="modal-box sheet">
      <div class="modal-head"><h3>${esc(name)}</h3><button class="modal-x" id="sheetX">✕</button></div>
      <div class="sheet-acts">
        <a class="btn terra" target="_blank" rel="noopener" href="${E().amapLink(name, cityId)}">🧭 高德导航</a>
        <button class="btn ghost" id="sheetNote">📝 记进${esc(cityId)}笔记</button>
        <button class="btn ghost" id="sheetCopy">📋 复制名字</button>
      </div></div></div>`;
    const close = () => { rootM.innerHTML = ""; };
    $("#sheetX").addEventListener("click", close);
    $("#sheetMask").addEventListener("click", (e) => { if (e.target.id === "sheetMask") close(); });
    $("#sheetNote").addEventListener("click", () => {
      S.notes[cityId] = ((S.notes[cityId] || "") + "\n· " + name).trim();
      TR.persist(); TR.toast("已记进笔记"); close();
      const ta = $("#cityNote"); if (ta) ta.value = S.notes[cityId];
    });
    $("#sheetCopy").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(name) : Promise.reject()).then(
        () => { TR.toast("已复制"); close(); },
        () => TR.toast("复制失败，长按手动复制"));
    });
  }
  /* 城市选择器：底部抽屉（复用 modal 体系），可搜索 + 按区域分组 + 想去快捷行。
     每次打开都是全量列表——根治 datalist「选一个后被过滤锁死」的顽疾。 */
  function cityPicker(currentValue, onPick) {
    const S = TR.state, rootM = $("#modal-root"), cities = window.TR_CORE.cities;
    const close = () => { rootM.innerHTML = ""; };
    const chip = (c) => `<button class="pick-chip ${c.id === currentValue ? "on" : ""}" data-pick="${esc(c.id)}">${esc(c.id)}${c.hasDeep ? '<i class="dot" title="有深度档案"></i>' : ""}</button>`;
    function bodyHtml(kw) {
      kw = (kw || "").trim().toLowerCase();
      const match = (c) => !kw || [c.id, c.province, c.region, c.tagline, (c.foodTags || []).join(""), (c.mustEat || []).join(""), (c.highlights || []).join("")].join(" ").toLowerCase().includes(kw);
      let html = "";
      if (!kw) {
        const favs = S.favs.map(cityById).filter(Boolean);
        if (favs.length) html += `<div class="pick-group"><h5>♥ 想去</h5><div class="pick-flow">${favs.map(chip).join("")}</div></div>`;
      }
      const list = cities.filter(match);
      if (!list.length) return `<div class="empty" style="margin-top:20px"><b>没找到「${esc(kw)}」</b>换个词，或搜省份 / 关键词（早茶、雪、古镇）</div>`;
      REGION_ORDER.forEach((rg) => {
        const inRg = list.filter((c) => c.region === rg);
        if (inRg.length) html += `<div class="pick-group"><h5>${esc(rg)} <span>${inRg.length}</span></h5><div class="pick-flow">${inRg.map(chip).join("")}</div></div>`;
      });
      return html;
    }
    rootM.innerHTML = `<div class="modal-mask" id="pickerMask"><div class="modal-box sheet city-picker">
      <div class="modal-head"><h3>选择城市</h3><button class="modal-x" id="pickerX">✕</button></div>
      <div class="search-row"><input class="field" id="pickerSearch" placeholder="搜城市 / 省份 / 关键词（早茶、雪、古镇）" autocomplete="off"></div>
      <div class="picker-body" id="pickerBody">${bodyHtml("")}</div>
    </div></div>`;
    $("#pickerX").addEventListener("click", close);
    $("#pickerMask").addEventListener("click", (e) => { if (e.target.id === "pickerMask") close(); });
    $("#pickerSearch").addEventListener("input", (e) => { $("#pickerBody").innerHTML = bodyHtml(e.target.value); });
    $("#pickerBody").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pick]");
      if (b) { onPick(b.dataset.pick); close(); }
    });
  }
  TR.cityPicker = cityPicker;

  /* ========== 行囊 ========== */
  V.plan = function (root, arg) {
    const S = TR.state;
    if (arg) {
      const trip = S.trips.find((t) => t.id === arg);
      if (trip) return renderTrip(root, trip);
    }
    const prefill = S.planPrefill || "";
    S.planPrefill = null;
    root.innerHTML = `
      <div class="sec-head" style="margin-top:24px"><span class="idx">Pack</span><h2>行囊</h2><span class="hint">行程 · 预算 · 装备 · 安全，一站备齐</span></div>
      <section class="card plan-new rv">
        <div class="rp-row">
          <span class="rp-label">目的地</span>
          <input class="from-input picker-input" style="width:150px" id="tripCity" value="${esc(prefill)}" readonly placeholder="选个城市">
          <span class="rp-label">月份</span>
          <select class="field" style="width:88px" id="tripMonth">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === S.ctx.month ? "selected" : ""}>${i + 1}月</option>`).join("")}</select>
        </div>
        <div class="rp-row">
          <span class="rp-label">出发日</span>
          <input type="date" class="field" id="tripDate" style="max-width:168px">
          <span class="rp-hint">可选 · 填了行程卡显示倒计时</span>
        </div>
        <div class="rp-row">
          <span class="rp-label">天数</span>
          <div class="stepper"><button id="tdMinus">−</button><b id="tripDays">3 天</b><button id="tdPlus">＋</button></div>
          <span class="rp-label" style="margin-left:6px">节奏</span>
          <div class="rp-group">
            <button class="chip" data-pace="slow">🐢 慢游</button>
            <button class="chip on" data-pace="std">🚶 标准</button>
            <button class="chip" data-pace="rush">⚡️ 特种兵</button>
          </div>
        </div>
        <button class="btn terra" id="createTrip">生成行程草稿</button>
      </section>
      <div class="sec-head rv"><span class="idx">Trips</span><h2>我的行程</h2></div>
      <div class="trip-list" id="tripList">${S.trips.length ? S.trips.map((t) => {
        let cd = "";
        if (t.date) { const d = Math.ceil((new Date(t.date + "T00:00:00") - new Date(new Date().toDateString())) / 86400000); cd = d > 1 ? `距出发 ${d} 天` : d === 1 ? "明天出发" : d === 0 ? "今天出发" : "已成行"; }
        return `<article class="card hover trip-card" data-trip="${t.id}">
          <div><div class="t-city">${esc(t.city)}${cd ? `<span class="t-cd">${cd}</span>` : ""}</div><div class="t-meta">${t.month}月 · ${t.days} 天 · ${t.pace === "slow" ? "慢游" : t.pace === "rush" ? "特种兵" : "标准"} · 建于 ${esc(t.created)}</div></div>
          <span class="t-go">→</span>
        </article>`; }).join("") : `<div class="empty"><b>还没有行程</b>上面选个城市，10 秒生成一份草稿</div>`}
      </div>`;

    let days = 3, pace = "std";
    $("#tripCity").addEventListener("click", () => cityPicker($("#tripCity").value, (id) => { $("#tripCity").value = id; }));
    $("#tdMinus").addEventListener("click", () => { days = TR.clamp(days - 1, 1, 15); $("#tripDays").textContent = days + " 天"; });
    $("#tdPlus").addEventListener("click", () => { days = TR.clamp(days + 1, 1, 15); $("#tripDays").textContent = days + " 天"; });
    $$("[data-pace]", root).forEach((b) => b.addEventListener("click", () => {
      pace = b.dataset.pace;
      $$("[data-pace]", root).forEach((x) => x.classList.toggle("on", x === b));
    }));
    $("#createTrip").addEventListener("click", () => {
      const cityId = $("#tripCity").value.trim();
      if (!cityById(cityId)) { TR.toast("先选一个有效的目的地城市"); return; }
      const month = +$("#tripMonth").value;
      const trip = {
        id: "t" + Date.now().toString(36),
        city: cityId, days, month, pace,
        date: $("#tripDate").value || "",
        created: new Date().toLocaleDateString("zh-CN"),
        itin: null, packDone: {},
      };
      TR.whenDeep(() => {
        trip.itin = E().genItinerary(cityId, days, pace);
        S.trips.unshift(trip);
        TR.persist();
        TR.router.go("plan/" + trip.id);
      });
    });
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-trip]");
      if (t) TR.router.go("plan/" + t.dataset.trip);
    });
    TR.fx.reveal(root);
  };

  function renderTrip(root, trip) {
    const S = TR.state;
    const c = cityById(trip.city) || {};
    const tab = trip._tab || "itin";
    const paceWarn = E().PACE_WARN[trip.pace];

    function slotHtml(day) {
      return `<div class="slots">${day.slots.map((s, si) => `
        <div class="slot"><span class="s-t">${esc(s.t)}</span>
          <span class="s-txt">${esc(s.icon)} ${esc(s.txt)}</span>
          ${s.nav ? `<a class="s-nav" target="_blank" rel="noopener" href="${E().amapLink(s.txt.replace(/^(早餐|午餐|晚餐)：/, ""), trip.city)}">导航</a>` : ""}
          <button class="s-swap" data-swap="${day.day}:${si}" title="换一个">换</button>
        </div>`).join("")}</div>`;
    }

    let inner = "";
    if (tab === "itin") {
      inner = `${paceWarn ? `<p class="pace-warn">⚡ ${esc(paceWarn)}</p>` : ""}
        ${(trip.itin || []).map((d) => `<div class="itin-day rv"><div class="d-head"><span class="d-num">Day ${d.day}</span>${d.tip ? `<span class="d-tip">📌 ${esc(d.tip)}</span>` : ""}</div>${slotHtml(d)}</div>`).join("")}
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <button class="btn ghost sm" id="reroll">🎲 整份重摇</button>
          <button class="btn ghost sm" id="copyItin">📋 复制成文字</button>
        </div>`;
    } else if (tab === "budget") {
      const b = E().calcBudget(trip.city, S.ctx.tier, trip.days);
      if (b.rough) {
        inner = `<div class="budget-box card"><div class="budget-total">¥${b.total.toLocaleString()}<small>${trip.days} 天粗估 · 人均 ¥${b.perDay}/天</small></div><p class="desc" style="margin-top:10px">这座城市没有分项预算预设，按基础卡人均估算。</p></div>`;
      } else {
        const total = b.breakdown.reduce((s, x) => s + x.v, 0);
        const max = Math.max(...b.breakdown.map((x) => x.v));
        inner = `<div class="budget-box card">
          <div class="budget-total">¥${total.toLocaleString()}<small>${S.ctx.tier}档 · ${trip.days} 天总预算</small></div>
          <div class="b-bars">${b.breakdown.map((x) => `
            <div class="b-bar"><span class="k">${esc(x.icon)} ${esc(x.k)}</span><div class="track"><div class="fill" style="width:${Math.round((x.v / max) * 100)}%"></div></div><span class="v">¥${x.v.toLocaleString()}</span></div>`).join("")}
          </div>
          <p class="desc" style="margin-top:12px">档位可在「雷达」处切换（当前 ${S.ctx.tier}）。住宿按 ${Math.max(1, trip.days - 1)} 晚计，大交通按往返计。</p></div>`;
      }
    } else if (tab === "pack") {
      const groups = E().genPacking(trip.city, trip.month, trip.days, !!c.intl);
      inner = groups.map((g, gi) => `<div class="pack-group card block"><h4>${esc(g.icon)} ${esc(g.name)}</h4><div class="pack-items">
        ${g.items.map((it, ii) => {
        const key = gi + ":" + ii, done = trip.packDone && trip.packDone[key];
        return `<div class="pack-item ${done ? "done" : ""}" data-pack="${key}"><span class="box">✓</span>${esc(it)}</div>`;
      }).join("")}</div></div>`).join("");
    } else if (tab === "safety") {
      const sc = E().safetyCard(trip, S.settings);
      inner = `<div class="safety-card rv">
        <h3>🛡 独行安全卡</h3><p class="s-sub">截图发给家人 · ${esc(sc.city)} ${esc(sc.dates)}</p>
        <dl>
          <div><dt>行程</dt><dd>${esc(sc.from)} → ${esc(sc.city)}，${esc(sc.dates)}${trip.itin ? "，共 " + trip.itin.length + " 天安排" : ""}</dd></div>
          ${sc.transport ? `<div><dt>抵达方式</dt><dd>${esc(sc.transport)}</dd></div>` : ""}
          <div><dt>住宿地址（出发前手填）</dt><dd id="stayAddr" contenteditable="true" style="border-bottom:1px dashed var(--brass-line);min-height:22px">${esc(trip.stayAddr || "点这里输入酒店名与地址")}</dd></div>
          <div><dt>紧急号码</dt><dd>${sc.emergency.map(esc).join("<br>")}</dd></div>
          <div><dt>约定</dt><dd>${sc.notes.map(esc).join("<br>")}</dd></div>
        </dl>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn ghost sm" id="printCard">🖨 打印/存 PDF</button></div>`;
    }

    root.innerHTML = `<div class="profile-top" style="margin-top:10px">
      <button class="back-btn" id="backPlan">← 行囊</button><span style="flex:1"></span>
      <button class="btn sm ghost" id="delTrip">删除</button>
    </div>
    <div class="sec-head" style="margin-top:14px"><span class="idx">Trip</span><h2>${esc(trip.city)} · ${trip.days} 天 · ${trip.month}月</h2>
      <a class="hint" href="#/city/${encodeURIComponent(trip.city)}">看档案 →</a></div>
    <div class="region-tabs">
      ${[["itin", "🧭 行程"], ["budget", "💰 预算"], ["pack", "🎒 装备"], ["safety", "🛡 安全卡"]].map(([k, l]) => `<button class="chip ${tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}
    </div>
    <div id="tripInner">${inner}</div>`;

    $("#backPlan").addEventListener("click", () => TR.router.go("plan"));
    $("#delTrip").addEventListener("click", () => {
      if (!confirm(`删除「${trip.city} ${trip.days}天」这份行程？`)) return;
      S.trips = S.trips.filter((t) => t.id !== trip.id);
      TR.persist(); TR.router.go("plan");
    });
    if (!root._tripBound) { root._tripBound = true;
    root.addEventListener("click", (e) => {
      const tb = e.target.closest("[data-tab]");
      if (tb) { trip._tab = tb.dataset.tab; renderTrip(root, trip); return; }
      const sw = e.target.closest("[data-swap]");
      if (sw) {
        const [dNum, si] = sw.dataset.swap.split(":").map(Number);
        trip._swapSeed = (trip._swapSeed || 0) + 1;
        const fresh = E().genItinerary(trip.city, trip.days + trip._swapSeed, trip.pace); // 位移采样
        const day = trip.itin.find((x) => x.day === dNum);
        const alt = fresh[(dNum - 1 + trip._swapSeed) % fresh.length].slots[si];
        if (alt && alt.txt !== day.slots[si].txt) day.slots[si] = alt;
        else { const alt2 = fresh[trip._swapSeed % fresh.length].slots[si]; if (alt2) day.slots[si] = alt2; }
        TR.persist(); renderTrip(root, trip); return;
      }
      const pk = e.target.closest("[data-pack]");
      if (pk) {
        trip.packDone = trip.packDone || {};
        const on = !trip.packDone[pk.dataset.pack];
        trip.packDone[pk.dataset.pack] = on;
        pk.classList.toggle("done", on);   // 原地切换，不再整页 renderTrip（高频交互 + 性能）
        const box = pk.querySelector(".box");
        if (on && box && !TR.prefersReducedMotion()) box.animate({ transform: ["scale(.4)", "scale(1.15)", "scale(1)"] }, { duration: 180, easing: "cubic-bezier(.22,1,.36,1)" });
        TR.persist(); return;
      }
    }); }
    if (tab === "itin") {
      $("#reroll") && $("#reroll").addEventListener("click", () => {
        trip._swapSeed = (trip._swapSeed || 0) + 3;
        trip.itin = E().genItinerary(trip.city, trip.days, trip.pace).map((d, i) => {
          const shift = E().genItinerary(trip.city, trip.days + trip._swapSeed, trip.pace);
          return shift[i] ? { ...shift[i], day: d.day } : d;
        });
        TR.persist(); renderTrip(root, trip);
      });
      $("#copyItin") && $("#copyItin").addEventListener("click", () => {
        const txt = trip.itin.map((d) => `Day ${d.day}\n` + d.slots.map((s) => `  ${s.t} ${s.txt}`).join("\n")).join("\n") + `\n—— 旅行雷达 · ${trip.city} ${trip.days}天`;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
          () => TR.toast("已复制，粘到备忘录或发给朋友"),
          () => TR.toast("复制失败，长按选择文字手动复制"));
      });
    }
    if (tab === "safety") {
      $("#printCard") && $("#printCard").addEventListener("click", () => window.print());
      const addr = $("#stayAddr");
      addr && addr.addEventListener("blur", () => { trip.stayAddr = addr.textContent.trim(); TR.persist(); });
    }
    // M1 行程→订单卡（仅行程 tab） + M2 装备清单「购」按钮（仅装备 tab）
    if (tab === "itin" && window.TR && TR.biz) TR.biz.tripCard($("#tripInner", root), [c], { from: S.settings.from });
    if (tab === "pack" && window.TR && TR.biz) TR.biz.decorateGearList($("#tripInner", root), { itemSelector: ".pack-item" });
    TR.fx.reveal(root);
  }

  /* ========== 我的 ========== */
  V.me = function (root) {
    const S = TR.state;
    const favCities = S.favs.map(cityById).filter(Boolean);
    const visitedCities = S.visited.map(cityById).filter(Boolean);
    const noteCities = Object.keys(S.notes).map(cityById).filter(Boolean);
    root.innerHTML = `
      <div class="sec-head" style="margin-top:24px"><span class="idx">Me</span><h2>我的</h2><span class="hint">全部数据只存在这台设备</span></div>

      <section class="card me-sec rv"><h3>⚙️ 设置</h3>
        <div class="set-row"><span class="k">出发地</span><div class="ctl">
          <input class="from-input picker-input" id="meFrom" value="${esc(S.settings.from)}" readonly></div></div>
        <div class="set-row"><span class="k">预算档</span><div class="ctl">${["经济", "中端", "品质"].map((t) => `<button class="chip ${S.ctx.tier === t ? "on" : ""}" data-tier="${t}">${t}</button>`).join("")}</div></div>
        <div class="set-row"><span class="k">外观</span><div class="ctl">${[["auto", "跟随系统"], ["light", "纸墨"], ["dark", "暗金"]].map(([v, l]) => `<button class="chip ${S.settings.theme === v ? "on" : ""}" data-theme-set="${v}">${l}</button>`).join("")}</div></div>
        <div class="set-row"><span class="k">字号</span><div class="ctl">${[["std", "标准"], ["big", "大字"]].map(([v, l]) => `<button class="chip ${S.settings.font === v ? "on" : ""}" data-font-set="${v}">${l}</button>`).join("")}</div></div>
      </section>

      <section class="card me-sec rv"><h3>♥ 想去 <span class="b-count" style="font-weight:400;font-style:italic;color:var(--brass)">×${favCities.length}</span></h3>
        ${favCities.length ? `<div class="fav-grid">${favCities.map((c) => `<article class="card hover mini-card" data-city="${esc(c.id)}"><h4>${esc(c.id)}</h4><p class="prov">${esc(c.province)}</p></article>`).join("")}</div>`
        : `<div class="empty"><b>还没收藏</b>在雷达或档案页点「想去 ♡」</div>`}
      </section>

      <section class="card me-sec rv"><h3>✓ 去过 <span class="b-count" style="font-weight:400;font-style:italic;color:var(--brass)">×${visitedCities.length}</span></h3>
        ${visitedCities.length ? `<div class="fav-grid">${visitedCities.map((c) => `<article class="card hover mini-card" data-city="${esc(c.id)}"><h4>${esc(c.id)}</h4><p class="prov">${esc(c.province)}</p></article>`).join("")}</div>`
        : `<div class="empty"><b>足迹待点亮</b>去过的城市在档案页标记，慢慢攒一张自己的地图</div>`}
      </section>

      ${noteCities.length ? `<section class="card me-sec rv"><h3>📝 我的笔记</h3><div class="list-rows">
        ${noteCities.map((c) => `<div class="row"><span><a href="#/city/${encodeURIComponent(c.id)}" style="border-bottom:1px dashed var(--brass-line)"><b>${esc(c.id)}</b></a> ${esc(S.notes[c.id].slice(0, 60))}${S.notes[c.id].length > 60 ? "…" : ""}</span></div>`).join("")}
      </div></section>` : ""}

      <section class="card me-sec rv"><h3>📲 装进手机（像小程序一样用）</h3>
        <ol class="install-steps">
          <li><b>iPhone</b>：Safari 打开本站 → 底部「分享」按钮 → 「添加到主屏幕」→ 桌面出现雷达图标，全屏使用、离线可用</li>
          <li><b>安卓</b>：Chrome 打开 → 右上菜单 → 「添加到主屏幕 / 安装应用」</li>
          <li>装好后即使断网，城市档案照样能翻</li>
        </ol>
      </section>

      <section class="card me-sec rv"><h3>💾 我的数据</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ghost sm" id="exportBtn">导出备份 JSON</button>
          <label class="btn ghost sm" style="cursor:pointer">导入备份<input type="file" id="importFile" accept=".json" hidden></label>
          <button class="btn ghost sm" id="wipeBtn" style="color:var(--danger)">清空全部</button>
        </div>
        <p class="desc" style="margin-top:10px">收藏、行程、笔记全部只存在本机 localStorage。换设备用导出/导入迁移。</p>
      </section>

      <section class="card me-sec rv"><h3>🧭 关于旅行雷达</h3>
        <p class="manifesto">这是一个人的旅行参谋部，也是你自己的旅行记忆体。<br>
        它<b>不卖票、不种草、不推流</b>——推荐只对你的口味负责；<br>
        它相信最好的旅行工具，是<b>最快帮你做完决定就该被关掉</b>的那种；<br>
        它把 ${window.TR_CORE.cities.length} 座城市、${Object.keys(window.TR_DEEP || {}).length || 90} 份深度档案装进口袋，<b>离线也在</b>。<br>
        <span style="font-size:12.5px;color:var(--ink-3)">数据：2024-2026 手工编研城市档案，非实时票价；交通与营业信息出行前请复核。</span></p>
      </section>`;

    if (!root._meBound) { root._meBound = true;
    root.addEventListener("click", (e) => {
      const card = e.target.closest("[data-city]");
      if (card) { TR.router.go("city/" + card.dataset.city); return; }
      const tier = e.target.closest("[data-tier]");
      if (tier) { TR.state.ctx.tier = tier.dataset.tier; TR.persist(); V.me(root); return; }
      const th = e.target.closest("[data-theme-set]");
      if (th) { const set = th.dataset.themeSet; TR.switchTheme(() => { TR.state.settings.theme = set; TR.persist(); V.me(root); }, th); return; }
      const fs = e.target.closest("[data-font-set]");
      if (fs) { TR.state.settings.font = fs.dataset.fontSet; TR.applyTheme(); TR.persist(); V.me(root); return; }
    }); }
    $("#meFrom").addEventListener("click", () => cityPicker(S.settings.from, (id) => {
      S.settings.from = id; $("#meFrom").value = id; TR.persist(); TR.toast("出发地已设为 " + id);
    }));
    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), state: TR.exportState() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "旅行雷达备份-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      TR.toast("备份已下载");
    });
    $("#importFile").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(r.result);
          TR.importState(obj.state || obj);
          TR.toast("导入成功");
          V.me(root);
        } catch (err) { TR.toast("导入失败：不是有效的备份文件"); }
      };
      r.readAsText(f);
    });
    $("#wipeBtn").addEventListener("click", () => {
      if (confirm("清空收藏、行程、笔记和设置？此操作不可恢复（建议先导出备份）")) {
        TR.wipeState(); V.me(root); TR.toast("已清空");
      }
    });
    // M1 合规页脚（配置为空时仅一行中性披露，无外联）
    if (window.TR && TR.biz) TR.biz.renderFooterDisclosure(root);
    TR.fx.reveal(root);
  };
})(window.TR);
