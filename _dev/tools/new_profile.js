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
    const goLinks = `<div class="go-links">
        <a class="go" target="_blank" rel="noopener" href="https://www.12306.cn/index/">🚄 12306 购票</a>
        <a class="go" target="_blank" rel="noopener" href="${amap("酒店")}">🏨 高德搜${esc(c.id)}酒店</a>
        <a class="go" target="_blank" rel="noopener" href="${amap("美食")}">🍜 高德搜${esc(c.id)}美食</a>
      </div>`;
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
    B("note", "笔记", "full", "📝", "我的笔记", "", `<textarea class="note-area" id="cityNote" placeholder="写点什么：想吃的店、朋友的建议、踩过的坑……只保存在你自己的设备里">${esc(S.notes[c.id] || "")}</textarea>`);

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

