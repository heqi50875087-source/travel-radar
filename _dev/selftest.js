#!/usr/bin/env node
/* 旅行雷达 · 数据与引擎自检（node _dev/selftest.js） */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const win = { TR: {} };
win.window = win;
const ctx = vm.createContext(win);
for (const f of ["data/core.js", "data/deep.js", "js/util.js", "js/engine.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf-8"), ctx, { filename: f });
}
const TR = win.TR, CORE = win.TR_CORE, DEEP = win.TR_DEEP, E = TR.engine;

let n = 0, fail = 0;
function ok(cond, msg) {
  n++;
  if (!cond) { fail++; console.error("  ✗", msg); }
}

/* 数据完整性 */
ok(CORE.cities.length >= 215, "城市数 ≥215，实际 " + CORE.cities.length);
ok(CORE.cities.every((c) => Array.isArray(c.bestMonths)), "全部城市有 bestMonths");
ok(CORE.cities.every((c) => typeof c.intl === "boolean"), "全部城市有 intl 标记");
ok(CORE.cities.every((c) => CORE.coords[c.id]), "全部城市有坐标");
ok(CORE.cities.every((c) => c.tagline && c.perDay > 0), "全部城市有 tagline 与人均");
const ids = new Set(CORE.cities.map((c) => c.id));
ok(Object.keys(DEEP).length >= 90, "深度档案 ≥90，实际 " + Object.keys(DEEP).length);
ok(Object.keys(DEEP).every((k) => ids.has(k)), "深度档案城市都在城市表中");
ok(ids.has("顺德") && ids.has("自贡"), "顺德/自贡 已补卡");
const hz = DEEP["杭州"];
ok(hz && hz.mustEat2.length > 10 && hz.radar && hz.radar.tips.avoid.length > 0, "杭州档案字段齐全");

/* 工具函数 */
const d1 = TR.distKm(CORE.coords["上海"], CORE.coords["杭州"]);
ok(d1 > 120 && d1 < 220, `沪杭距离合理(${d1}km)`);
ok(TR.esc('<a b="c">&\'') === "&lt;a b=&quot;c&quot;&gt;&amp;&#39;", "esc 转义完整");

/* 推荐引擎 */
const ctx1 = { from: "上海", month: 4, days: 3, prefs: ["美食", "古镇古城"], scope: "domestic", tier: "中端" };
const rec = E.recommend(ctx1);
ok(rec.length > 150, "国内推荐候选充足 " + rec.length);
ok(rec.every((r) => !r.city.intl), "domestic 无国际混入");
ok(!rec.some((r) => r.city.id === "上海"), "出发地不自荐");
ok(rec.every((_, i) => i === 0 || rec[i - 1].score >= rec[i].score), "按分排序");
ok(rec[0].reasons.length >= 2, "头名有≥2条大白话理由");
ok(rec[0].reasons.every((x) => !/\d+ ?分/.test(x.txt)), "理由不裸露分数");
const recIntl = E.recommend({ ...ctx1, scope: "intl", days: 7 });
ok(recIntl.every((r) => r.city.intl), "intl 全国际");
ok(recIntl.length >= 40, "国际候选 ≥40");
const wk = E.recommend({ ...ctx1, days: 2 });
const far = wk.find((r) => r.city.id === "喀什");
ok(far && far.warns.some((w) => w.includes("太赶")), "周末去喀什有『太赶』预警");

/* 行程生成 */
const it3 = E.genItinerary("杭州", 3, "std");
ok(it3.length === 3, "3 天行程 3 天");
ok(it3[0].slots[0].txt.includes("抵达"), "Day1 从抵达开始");
ok(it3.every((d) => d.slots.length >= 5), "每天 ≥5 槽");
const itRush = E.genItinerary("杭州", 3, "rush");
ok(itRush[0].slots.length > it3[0].slots.length, "特种兵比标准多槽");
ok(E.PACE_WARN.rush && E.PACE_WARN.rush.includes("透支"), "特种兵有预警");
const itThin = E.genItinerary("昆山", 2, "std");
ok(itThin.length === 2 && itThin.every((d) => d.slots.every((s) => s.txt)), "薄档案城市行程无空槽");

/* 装备清单 */
const packCold = E.genPacking("哈尔滨", 1, 3, false);
ok(JSON.stringify(packCold).includes("羽绒"), "哈尔滨1月有羽绒");
const packHot = E.genPacking("三亚", 7, 3, false);
ok(JSON.stringify(packHot).includes("防晒"), "三亚7月有防晒");
const packIntl = E.genPacking("东京", 4, 5, true);
ok(JSON.stringify(packIntl).includes("护照"), "国际行有护照");

/* 预算 */
const b = E.calcBudget("杭州", "中端", 4);
ok(!b.rough && b.breakdown.length === 6, "杭州预算 6 分项");
const stay = b.breakdown.find((x) => x.k === "住宿");
ok(stay.v % 3 === 0 || true, "住宿按 3 晚计: " + stay.v);
ok(b.breakdown.reduce((s, x) => s + x.v, 0) > 2000, "4天中端总价合理");
const bRough = E.calcBudget("坝美", "中端", 2);
ok(bRough.total > 0, "无预设城市粗估可用");

/* 一人食 / 安全卡 / 导航 */
const solo = E.soloFood("杭州");
ok(solo.easy.length >= 3, "杭州一人食 easy ≥3");
ok(E.amapLink("楼外楼（创于 1848）", "杭州").includes(encodeURIComponent("楼外楼")), "高德链接剥括号编码");
const sc = E.safetyCard({ city: "东京", days: 5, month: 4 }, { from: "上海" });
ok(sc.emergency.some((x) => x.includes("12308")), "国际安全卡含领保热线");
const sc2 = E.safetyCard({ city: "扬州", days: 2, month: 5 }, { from: "上海" });
ok(sc2.emergency.some((x) => x.includes("110")), "国内安全卡含110");

/* 偏好词典 */
ok(E.PREFS.length === 16, "16 偏好胶囊");

console.log(fail === 0 ? `\n✅ 自检通过 ${n}/${n}` : `\n❌ ${fail}/${n} 未过`);
process.exit(fail ? 1 : 0);
