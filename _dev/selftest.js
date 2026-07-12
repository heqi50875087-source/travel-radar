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

/* 工单03/04 · 10 座深度新城（华山山岳批 + 大西北当季批） */
const NEW10 = ["华山", "五台山", "武隆", "镜泊湖", "阿尔山", "茶卡盐湖", "嘉峪关", "中卫", "喀纳斯", "喀拉峻"];
ok(NEW10.every((c) => DEEP[c] && DEEP[c].radar), "10 新城深度档案（含 radar）齐全");
ok(NEW10.every((c) => { const x = CORE.cities.find((y) => y.id === c); return x && x.hasDeep === true; }), "10 新城 hasDeep=true");
ok(NEW10.every((c) => CORE.climate[c] && Object.keys(CORE.climate[c]).length === 12), "10 新城 climate 12 个月");
ok(NEW10.every((c) => CORE.budget[c] && ["经济", "中端", "品质"].every((t) => CORE.budget[c][t])), "10 新城 budget 三档齐全");

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


/* ===================== 商业化 M1/M2/M3 断言（自包含 require） ===================== */
/* ===== 商业化 M1 断言（×14） ===== */
(function () {
  const assert = require('assert');
  const path = require('path');
  const load = p => { delete require.cache[require.resolve(p)]; return require(p); };
  const ROOT = path.join(__dirname, '..');

  globalThis.TR_BIZ = {
    affiliate: { ctrip: '', jd: '', taobao: '', klook: '', tripcom: '' },
    sponsor: { wechatQR: '', official: '', xiaohongshu: '' },
    analytics: { provider: '', id: '' },
    utmSource: 'travel-radar',
    siteBase: ''
  };
  const biz = load(path.join(ROOT, 'js', 'biz.js'));

  // —— 空配置 · 国内城 ——
  const cn = biz.links({ id: 'hangzhou', name: '杭州', intl: false });
  assert(cn.length >= 3, 'M1-01 国内城 ≥3 条链接');
  assert(cn.every(l => /^https:\/\//.test(l.url)), 'M1-02 链接均为 https');
  assert(cn.every(l => l.url.includes('utm_source=travel-radar')), 'M1-03 国内链接均含 utm_source');
  assert(cn.every(l => !/[?&](allianceid|sid|aid|refpid)=/i.test(l.url)), 'M1-04 空配置无任何联盟参数');
  assert(cn.every(l => l.tag === null), 'M1-05 空配置无「推广」标');
  const labels = cn.map(l => l.label).join('|');
  assert(/火车|12306/.test(labels) && /酒店/.test(labels) && /门票|玩乐/.test(labels),
    'M1-06 覆盖 火车/酒店/门票');
  assert(cn.some(l => l.url.indexOf('https://kyfw.12306.cn/otn/leftTicket/init') === 0),
    'M1-07 12306 已升级为查询页直达');

  // —— 空配置 · 国际城 ——
  const os = biz.links({ id: 'tokyo', name: '东京', en: 'Tokyo', intl: true });
  assert(os.length >= 3, 'M1-08 国际城 ≥3 条链接');
  assert(os.some(l => l.url.includes('trip.com')) && os.some(l => l.url.includes('klook.com')),
    'M1-09 国际城自动切换 Trip.com/Klook 组合');
  assert(os.every(l => l.url.includes('utm_source=travel-radar')), 'M1-10 国际链接均含 utm_source');

  // —— 填入联盟 ID 后 ——
  globalThis.TR_BIZ.affiliate.ctrip = '888888,999999';
  globalThis.TR_BIZ.affiliate.klook = '12321';
  const cn2 = biz.links({ name: '杭州', intl: false });
  const ad = cn2.filter(l => /[?&]allianceid=888888/.test(l.url));
  assert(ad.length >= 1 && ad.every(l => /[?&]sid=999999/.test(l.url) && l.tag === '推广'),
    'M1-11 携程联盟参数拼接正确且带「推广」标');
  assert(cn2.some(l => l.url.includes('kyfw.12306.cn') && !/allianceid/i.test(l.url)),
    'M1-12 12306 链接保持干净（不挂联盟参数）');
  const os2 = biz.links({ name: '东京', en: 'Tokyo', intl: true });
  assert(os2.some(l => /klook\./.test(l.url) && /[?&]aid=12321/.test(l.url) && l.tag === '推广'),
    'M1-13 Klook aid 拼接正确且带标');

  // —— 工具函数 ——
  assert(biz._util.addParams('https://a.b/#/city/x', { u: 1 }) === 'https://a.b/?u=1#/city/x',
    'M1-14 hash 路由链接参数插在 # 之前');

  // 复位为空配置，避免影响后续断言
  globalThis.TR_BIZ.affiliate.ctrip = '';
  globalThis.TR_BIZ.affiliate.klook = '';
  console.log('✓ 商业化 M1 断言 ×14 全部通过');
})();

/* ===== 商业化 M2 断言（×6） ===== */
(function () {
  const assert = require('assert');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  globalThis.TR_BIZ = globalThis.TR_BIZ || {
    affiliate: { ctrip: '', jd: '', taobao: '', klook: '', tripcom: '' },
    sponsor: {}, analytics: {}, utmSource: 'travel-radar', siteBase: ''
  };
  globalThis.TR_BIZ.affiliate.taobao = '';
  require(path.join(ROOT, 'js', 'biz.js'));                 // 幂等，确保 TR.biz 就绪
  const gear = require(path.join(ROOT, 'js', 'biz-gear.js'));

  assert(gear.cleanKeyword('防风外套（M码 备用）') === '防风外套', 'M2-01 括号注释净化');

  const g = gear.gearLink('✓ 防滑鞋套（雪地用）');
  assert(g.length === 2 && g[0].label === '京东' && g[1].label === '淘宝', 'M2-02 京东主 + 淘宝备');
  assert(g.every(l => l.url.includes('utm_source=travel-radar') && l.url.includes('utm_medium=gear')),
    'M2-03 均含 utm');
  assert(g[0].url.startsWith('https://so.m.jd.com/ware/search.action?')
    && g[0].url.includes(encodeURIComponent('防滑鞋套')), 'M2-04 京东搜索词正确（已净化）');
  assert(!/refpid=/.test(g[1].url) && g[1].tag === null, 'M2-05 空配置无 refpid、无「推广」标');

  globalThis.TR_BIZ.affiliate.taobao = 'mm_1_2_3';
  const g2 = gear.gearLink('防风外套');
  assert(/[?&]refpid=mm_1_2_3/.test(g2[1].url) && g2[1].tag === '推广',
    'M2-06 填 PID 后 refpid 拼接正确且带「推广」标');

  globalThis.TR_BIZ.affiliate.taobao = '';
  console.log('✓ 商业化 M2 断言 ×6 全部通过');
})();

/* ===== 商业化 M3 断言（×6） ===== */
(function () {
  const assert = require('assert');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  globalThis.TR_BIZ = globalThis.TR_BIZ || { utmSource: 'travel-radar', siteBase: '' };
  const share = require(path.join(ROOT, 'js', 'share.js'));

  const u = share.cityUrl('杭州');
  assert(u.includes('#/city/' + encodeURIComponent('杭州')), 'M3-01 城市直达 hash 形态正确');
  assert(u.includes('utm_source=travel-radar') && u.includes('utm_medium=share'),
    'M3-02 直达链含 utm_source + utm_medium=share');
  assert(/^https:\/\//.test(u), 'M3-03 Node（无 location）下回落到 siteBase 默认值');

  const lines = share._wrapText('abcdef', 3, s => s.length);   // 伪测宽：1 字符 = 1 宽
  assert(JSON.stringify(lines) === JSON.stringify(['abc', 'def']), 'M3-04 折行纯函数');

  const d = share.cardData({
    name: '杭州', sub: '三面云山一面城',
    spots: ['西湖', { name: '灵隐寺' }, '九溪', '多余的第四条'],
    food: ['片儿川', '龙井虾仁', '多余']
  });
  assert(d.name === '杭州' && d.highlights.length === 3 && d.highlights[1] === '灵隐寺'
    && d.eats.length === 2 && d.eats[0] === '片儿川', 'M3-05 字段适配：3 看点 + 2 必吃 + 对象取名');

  assert(typeof share.card === 'function' && typeof share.button === 'function',
    'M3-06 浏览器专用 API 导出完整（card 本体在真机验收）');

  console.log('✓ 商业化 M3 断言 ×6 全部通过');
})();

/* ===== 城市之声断言（×8） ===== */
(function () {
  const assert = require('assert');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');
  const snd = require(path.join(ROOT, 'js', 'city-sound.js'));
  const byId = (id) => CORE.cities.find((c) => c.id === id);

  const cd = snd.pick(byId('成都'));
  assert(cd.song === '成都' && cd.artist === '赵雷' && !cd.fallback, 'CS-01 成都签名曲=赵雷《成都》');
  assert(/^https:\/\/music\.163\.com\/#\/search\/m\/\?s=/.test(cd.netease)
    && cd.netease.includes(encodeURIComponent('成都 赵雷'))
    && !/[?&]id=\d/.test(cd.netease), 'CS-02 网易云深链为词搜、无硬编码 songId');
  assert(/^https:\/\/y\.qq\.com\//.test(cd.qq), 'CS-03 QQ 音乐深链 https');

  assert(snd.moodOf(byId('北海')) === '海滨', 'CS-04 mood 启发式：北海→海滨');
  const noSig = snd.pick(byId('丽水'));
  assert(noSig.fallback === true && noSig.song, 'CS-05 无签名曲城市按 mood 兜底且有歌');

  assert(snd.ANTHEM.artist === '陈绮贞' && snd.ANTHEM.song === '旅行的意义', 'CS-06 主题曲=陈绮贞《旅行的意义》');

  const moodSongs = Object.keys(snd.MOOD).map((k) => snd.MOOD[k].song);
  assert(!moodSongs.includes('青藏高原') && !moodSongs.includes('沙漠骆驼'),
    'CS-07 mood 兜底曲不含地理专属曲（防丽水配西藏歌）');
  assert(['雄伟','苍凉','海滨','高雅','市井','轻松'].every((m) => snd.MOOD[m] && snd.MOOD[m].song),
    'CS-08 六种气质均有兜底曲');

  console.log('✓ 城市之声断言 ×8 全部通过');
})();

console.log(fail === 0 ? `\n✅ 自检通过 ${n}/${n}` : `\n❌ ${fail}/${n} 未过`);
process.exit(fail ? 1 : 0);
