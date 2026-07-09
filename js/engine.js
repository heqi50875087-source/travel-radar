/* 旅行雷达 · 推荐引擎与生成器（纯规则，无网络依赖） */
(function (TR) {
  "use strict";
  const E = (TR.engine = {});

  /* ---------- 偏好胶囊词典 ---------- */
  E.PREFS = [
    { id: "美食", icon: "🍜", kw: ["美食", "吃", "菜", "小吃", "早茶", "火锅", "面", "烧烤", "甜", "咖啡", "茶", "酒", "食"] },
    { id: "山水", icon: "⛰", kw: ["山", "湖", "江", "峡谷", "瀑布", "溪", "森林", "草原", "峰", "岭"] },
    { id: "古镇古城", icon: "🏮", kw: ["古镇", "古城", "古街", "老街", "古村", "水乡", "古都", "遗址"] },
    { id: "博物馆", icon: "🏛", kw: ["博物", "美术馆", "文化", "历史", "遗产", "院"] },
    { id: "海岛海滨", icon: "🌊", kw: ["海", "岛", "滩", "湾", "潜水", "赶海"] },
    { id: "冰雪", icon: "❄️", kw: ["雪", "冰", "滑雪", "雾凇", "温泉"] },
    { id: "赏花", icon: "🌸", kw: ["花", "樱", "梅", "桃", "杜鹃", "油菜", "荷"] },
    { id: "秋色", icon: "🍁", kw: ["秋", "红叶", "银杏", "胡杨", "芦苇"] },
    { id: "清净小众", icon: "🌿", kw: ["小众", "清净", "安静", "隐", "秘境", "人少", "原生态"] },
    { id: "街巷漫步", icon: "🚶", kw: ["citywalk", "街", "巷", "梧桐", "骑楼", "洋楼", "市井", "菜市"] },
    { id: "夜与灯火", icon: "🌃", kw: ["夜", "灯", "夜市", "霓虹", "演艺", "酒吧"] },
    { id: "徒步户外", icon: "🥾", kw: ["徒步", "户外", "露营", "骑行", "穿越", "登"] },
    { id: "摄影出片", icon: "📷", kw: ["摄影", "出片", "日出", "日落", "星空", "机位"] },
    { id: "民俗风情", icon: "🎎", kw: ["民俗", "民族", "苗", "侗", "藏", "傣", "节庆", "市集"] },
    { id: "避暑", icon: "🧊", kw: ["避暑", "凉", "清爽", "高原"] },
    { id: "避寒", icon: "☀️", kw: ["避寒", "温暖", "热带", "阳光"] },
  ];

  const searchableCache = {};
  function searchable(c) {
    if (!searchableCache[c.id]) {
      searchableCache[c.id] = [
        c.tagline, c.note, c.region, c.province,
        (c.foodTags || []).join(" "), (c.mustEat || []).join(" "),
        (c.highlights || []).join(" "), (c.seasons || []).join(" "),
      ].join(" ").toLowerCase();
    }
    return searchableCache[c.id];
  }

  /* ---------- 距离与交通估计 ---------- */
  E.distInfo = function (fromId, toId) {
    const C = window.TR_CORE.coords;
    const d = TR.distKm(C[fromId], C[toId]);
    if (d == null) return null;
    let way;
    if (d <= 120) way = "高铁半小时圈";
    else if (d <= 350) way = "高铁 1-2 小时";
    else if (d <= 700) way = "高铁 2-4 小时";
    else if (d <= 1400) way = "高铁半天 / 飞行 2 小时内";
    else if (d <= 3000) way = "飞行 2-4 小时";
    else if (d <= 6000) way = "飞行 4-8 小时";
    else way = "长途飞行 8 小时+";
    return { km: d, way };
  };

  function parseDaysRange(str) {
    const m = String(str || "").match(/(\d+)\s*[-–~]?\s*(\d+)?\s*天/);
    if (!m) return null;
    const a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
    return [a, b];
  }

  const TIER_IDEAL = { "经济": 400, "中端": 650, "品质": 1000 };

  /* ---------- 推荐主函数 ---------- */
  // ctx: {from, month, days, prefs[], scope:'domestic'|'intl', tier}
  E.recommend = function (ctx) {
    const cities = window.TR_CORE.cities;
    const list = [];
    for (const c of cities) {
      if (ctx.scope === "intl" ? !c.intl : c.intl) continue;
      if (c.id === ctx.from) continue;
      const r = scoreCity(c, ctx);
      list.push(r);
    }
    list.sort((a, b) => b.score - a.score);
    return list;
  };

  function scoreCity(c, ctx) {
    let score = 50;
    const reasons = [], warns = [];
    const bm = c.bestMonths || [];

    // 季节
    if (bm.length) {
      const adj = bm.some((m) => Math.abs(m - ctx.month) === 1 || Math.abs(m - ctx.month) === 11);
      if (bm.includes(ctx.month)) {
        score += 22;
        reasons.push({ t: "season", txt: `${ctx.month}月正当季（${(c.seasons || []).join("、")}）`, w: 22 });
      } else if (adj) {
        score += 8;
        reasons.push({ t: "season", txt: `临近最佳季（${(c.seasons || []).join("、")}）`, w: 8 });
      } else {
        score -= 6;
        warns.push(`${ctx.month}月不是它的最佳季节`);
      }
    }

    // 距离（长假远途豁免）
    const di = E.distInfo(ctx.from, c.id);
    if (di) {
      let dScore = 0;
      if (di.km <= 350) dScore = 18;
      else if (di.km <= 700) dScore = 13;
      else if (di.km <= 1400) dScore = 8;
      else if (di.km <= 3000) dScore = 3;
      else dScore = -6;
      if (ctx.days >= 6 && dScore < 0) dScore = 2; // 长假远途合理
      if (ctx.days <= 2 && di.km > 1400) { dScore -= 8; warns.push("周末去太赶，路上时间占比过高"); }
      score += dScore;
      if (dScore > 0) reasons.push({ t: "dist", txt: `距${ctx.from} ${di.km}km · ${di.way}`, w: dScore });
    }

    // 偏好命中
    if (ctx.prefs && ctx.prefs.length) {
      const text = searchable(c);
      const hits = [];
      for (const pid of ctx.prefs) {
        const p = E.PREFS.find((x) => x.id === pid);
        if (p && p.kw.some((k) => text.includes(k.toLowerCase()))) hits.push(pid);
      }
      const pScore = Math.min(20, hits.length * 5);
      score += pScore;
      if (hits.length) reasons.push({ t: "pref", txt: `契合你选的「${hits.join("、")}」`, w: pScore });
    }

    // 天数适配
    const dr = parseDaysRange(c.days);
    if (dr && ctx.days) {
      if (ctx.days >= dr[0] && ctx.days <= dr[1]) {
        score += 8;
        reasons.push({ t: "days", txt: `建议玩 ${c.days}，和你的 ${ctx.days} 天正好`, w: 8 });
      } else if (ctx.days === dr[0] - 1 || ctx.days === dr[1] + 1) {
        score += 4;
      } else if (ctx.days > dr[1] + 2) {
        score -= 3; warns.push(`${ctx.days} 天对它偏长（建议 ${c.days}），可搭配周边`);
      } else if (ctx.days < dr[0] - 1) {
        score -= 5; warns.push(`${ctx.days} 天玩不透（建议 ${c.days}）`);
      }
    }

    // 预算档
    if (ctx.tier && c.perDay) {
      const gap = Math.abs(c.perDay - TIER_IDEAL[ctx.tier]) / TIER_IDEAL[ctx.tier];
      if (gap < 0.35) { score += 6; reasons.push({ t: "budget", txt: `人均约 ¥${c.perDay}/天，符合${ctx.tier}档`, w: 6 }); }
      else if (c.perDay > TIER_IDEAL[ctx.tier] * 1.6) { score -= 4; warns.push(`人均 ¥${c.perDay}/天偏贵`); }
    }

    // 内容厚度与签证
    if (c.hasDeep) { score += 5; reasons.push({ t: "deep", txt: "备有 14 区块深度档案（必吃/防坑/本地人玩法）", w: 5 }); }
    if (c.intl && c.passport) {
      if (/免签|落地签/.test(c.passport)) { score += 6; reasons.push({ t: "visa", txt: c.passport, w: 6 }); }
      else warns.push(`签证：${c.passport}`);
    }

    // 假期拥挤提示（不扣分）
    const HOT = ["杭州", "西安", "成都", "重庆", "长沙", "北京", "上海", "三亚", "大理", "丽江", "厦门", "南京"];
    if ([2, 5, 10].includes(ctx.month) && HOT.includes(c.id)) warns.push("节假日热门，人流预警");

    reasons.sort((a, b) => b.w - a.w);
    return { city: c, score: Math.round(score), reasons, warns };
  }

  /* ---------- 高德一键导航（规划→执行闭环，零 API 纯链接） ---------- */
  E.amapLink = function (name, cityId) {
    const kw = String(name).replace(/（.*?）|\(.*?\)/g, "").split(/[·:：]/)[0].trim();
    return "https://uri.amap.com/search?keyword=" + encodeURIComponent(kw) +
      "&city=" + encodeURIComponent(cityId || "") + "&src=travel-radar";
  };

  /* ---------- 行程草稿生成（pace: slow 慢游 / std 标准 / rush 特种兵） ---------- */
  E.genItinerary = function (cityId, days, pace) {
    pace = pace || "std";
    const deep = (window.TR_DEEP || {})[cityId] || {};
    const core = window.TR_CORE.cities.find((c) => c.id === cityId) || {};
    const sights = (deep.highlights2 || core.highlights || []).slice();
    const eats = (deep.mustEat2 || core.mustEat || []).slice();
    const streets = (deep.smallStreets || []).slice();
    const shops = (deep.oldShops || []).slice();
    const locals = ((deep.inspiration || {}).locals || []).slice();
    const tips = (((deep.radar || {}).travel || {}).tips || []).slice();

    const pick = (arr, i, fb) => (arr.length ? arr[i % arr.length] : fb);
    const perDay = pace === "slow" ? 1 : pace === "rush" ? 3 : 2; // 每天景点数
    const out = [];
    let si = 0;
    for (let d = 0; d < days; d++) {
      const slots = [];
      slots.push({ t: "早", txt: d === 0 ? "抵达 · 安顿行李" : "早餐：" + pick(eats, d * 3 + 2, "本地早点铺"), icon: "🌅" });
      slots.push({ t: "上午", txt: pick(sights, si++, "老城区随走"), icon: "🚶", nav: true });
      slots.push({ t: "午", txt: "午餐：" + pick(eats, d * 3, "看档案「必吃」挑一家"), icon: "🍜" });
      if (pace === "slow") {
        slots.push({ t: "下午", txt: pick(streets, d, "咖啡馆坐一下午 · 看人来人往"), icon: "☕", nav: true });
      } else {
        slots.push({ t: "下午", txt: pick(sights, si++, pick(streets, d, "咖啡馆歇脚")), icon: "📷", nav: true });
        if (pace === "rush") slots.push({ t: "傍晚", txt: pick(sights, si++, pick(streets, d + 1, "登高看日落")), icon: "🌇", nav: true });
      }
      slots.push({ t: "晚", txt: "晚餐：" + (d % 2 === 0 ? pick(shops, d, pick(eats, d * 3 + 1, "老字号")) : pick(eats, d * 3 + 1, "夜市小吃")), icon: "🌙", nav: true });
      slots.push({ t: "夜", txt: d === days - 1 ? "收拾 · 给这趟旅程写三行小结" : pick(streets, d + 1, pick(locals, d, "江边/老街夜走")), icon: "✨" });
      out.push({ day: d + 1, slots, tip: pick(tips, d, null) });
    }
    return out;
  };

  E.PACE_WARN = {
    slow: null,
    std: null,
    rush: "特种兵节奏：日均 3+ 个点，注意补水补糖，鞋要好；连续 3 天以上极易透支",
  };

  /* ---------- 一人食指北（从菜品类型派生：面/粉/小吃/早茶类天然适合单人） ---------- */
  E.soloFood = function (cityId) {
    const deep = (window.TR_DEEP || {})[cityId] || {};
    const core = window.TR_CORE.cities.find((c) => c.id === cityId) || {};
    const eats = deep.mustEat2 || core.mustEat || [];
    const EASY = /面|粉|饼|包|饺|馄饨|小笼|生煎|串|烤|粥|豆花|糕|团|糖水|甜|奶|茶|咖啡|早茶|小吃|卤|拌|汤(?!锅)/;
    const HARD = /锅|蒸猪|全鱼|烤鸭|宴|桌菜|火锅(?!粉)/;
    const easy = [], hard = [];
    for (const e of eats) (EASY.test(e) && !HARD.test(e) ? easy : hard).push(e);
    return {
      easy: easy.slice(0, 10),
      hard: hard.slice(0, 6),
      tip: hard.length ? "大菜类一个人点不动？找有「例份/半份」的老字号，或午市去（分量小价格低人也少）" : null,
    };
  };

  /* ---------- 安全卡（独行安全网：可截图发家人） ---------- */
  E.safetyCard = function (trip, settings) {
    const c = window.TR_CORE.cities.find((x) => x.id === trip.city) || {};
    return {
      city: trip.city,
      dates: trip.month ? `${trip.month}月 · ${trip.days} 天` : `${trip.days} 天`,
      from: (settings && settings.from) || "上海",
      transport: (((window.TR_DEEP || {})[trip.city] || {}).radar || {}).travel?.fromTransport || "",
      emergency: c.intl
        ? ["当地报警/急救号码出发前查好", "中国领事保护热线 +86-10-12308", "外交部领事直通车公众号"]
        : ["110 报警 · 120 急救 · 119 火警", "12345 市民热线", "文旅投诉 12318"],
      notes: ["每晚向家人报平安", "住宿地址已写在下方", "手机没电前发最后位置"],
    };
  };

  /* ---------- 装备清单生成 ---------- */
  E.genPacking = function (cityId, month, days, intl) {
    const cl = ((window.TR_CORE.climate || {})[cityId] || {})[month + "月"];
    const groups = [];
    const base = ["身份证", "手机 + 充电宝(≤20000mAh)", "充电线 + 插头", "常用药(肠胃/感冒/创可贴)", "纸巾湿巾", "水杯", "耳机"];
    if (intl) base.unshift("护照 + 签证材料", "转换插头", "少量当地现金", "离线地图/翻译App");
    groups.push({ name: "证件与随身", icon: "🎒", items: base });

    let wear = [];
    if (cl && cl.tempBase) {
      const [lo, hi] = cl.tempBase;
      if (hi >= 30) wear = ["短袖 ×" + Math.min(days, 4), "薄长裤/短裤", "防晒帽", "墨镜", "防晒霜 SPF50", "小风扇(可选)"];
      else if (hi >= 22) wear = ["短袖 + 薄外套", "长裤", "舒适步行鞋", "防晒霜"];
      else if (hi >= 14) wear = ["长袖 + 风衣/夹克", "长裤", "步行鞋", "薄围巾(早晚凉)"];
      else if (hi >= 6) wear = ["毛衣 + 厚外套", "秋裤(怕冷带)", "保暖鞋", "围巾"];
      else wear = ["羽绒服", "毛衣 + 秋裤", "手套 + 毛线帽", "防滑保暖鞋", "暖宝宝"];
      if (lo <= 5 && hi >= 18) wear.push("早晚温差大：洋葱式穿搭");
      const conds = (cl.condSet || []).join("");
      if (/雨|⛈|梅/.test(conds + (cl.iconSet || []).join(""))) wear.push("折叠伞/轻便雨衣", "防水鞋或备用袜");
      if (/雪|🌨|❄/.test(conds + (cl.iconSet || []).join(""))) wear.push("防滑鞋套");
      groups.push({ name: `穿着（${month}月约 ${lo}~${hi}°C）`, icon: "🧥", items: wear });
    } else {
      groups.push({ name: "穿着", icon: "🧥", items: ["按目的地当月气温准备，洋葱式穿搭最稳"] });
    }
    groups.push({ name: "独行加分项", icon: "🌟", items: ["门锁报警器/门挡(女生住青旅可带)", "行程共享给家人朋友", "纸质紧急联系卡", "小锁(青旅储物柜)", "保温杯 + 速溶咖啡(火车早班)"] });
    return groups;
  };

  /* ---------- 预算计算 ---------- */
  E.calcBudget = function (cityId, tier, days) {
    const p = ((window.TR_CORE.budget || {})[cityId] || {})[tier];
    if (!p) {
      const c = window.TR_CORE.cities.find((x) => x.id === cityId);
      const per = c ? c.perDay : 600;
      return { rough: true, total: per * days, perDay: per, days };
    }
    const daily = p.stay + p.food + p.fun + p.trans + p.misc;
    return {
      rough: false, days,
      breakdown: [
        { k: "住宿", v: p.stay * Math.max(1, days - 1), icon: "🛏" },
        { k: "吃喝", v: p.food * days, icon: "🍜" },
        { k: "玩乐门票", v: p.fun * days, icon: "🎫" },
        { k: "市内交通", v: p.trans * days, icon: "🚇" },
        { k: "大交通往返", v: p.bigTrans * 2, icon: "🚄" },
        { k: "杂项", v: p.misc * days, icon: "🧾" },
      ],
      get total() { return this.breakdown.reduce((s, x) => s + x.v, 0); },
    };
  };
})(window.TR);
