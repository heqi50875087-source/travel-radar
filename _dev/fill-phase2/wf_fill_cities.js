export const meta = {
  name: 'fill-city-archives',
  description: '为 97 座缺档城市研究起草深度档案草稿(交主会话审校合并)',
  phases: [{ title: '起草', detail: '每城一个研究子代理:读基准+参照城,web核实,写草稿自检' }],
}

const SC = "/private/tmp/claude-501/-Users-apple-kushim-cc/15524d52-a25e-4713-8f08-2961c2934966/scratchpad";
const SPEC = SC + "/城市档案_基准规范.md";
const OUTDIR = SC + "/cities";
const SRC = "/Users/apple/kushim-cc/travel-planner/travel-radar/_dev/data-src";
const CITIES = [{"id": "漳州", "region": "华南", "province": "福建", "intl": false, "type": "city"}, {"id": "秦皇岛", "region": "华北", "province": "河北", "intl": false, "type": "city"}, {"id": "保定", "region": "华北", "province": "河北", "intl": false, "type": "city"}, {"id": "唐山", "region": "华北", "province": "河北", "intl": false, "type": "nature"}, {"id": "包头", "region": "华北", "province": "内蒙古", "intl": false, "type": "city"}, {"id": "额济纳", "region": "华北", "province": "内蒙古", "intl": false, "type": "city"}, {"id": "郑州", "region": "华中", "province": "河南", "intl": false, "type": "city"}, {"id": "宜昌", "region": "华中", "province": "湖北", "intl": false, "type": "city"}, {"id": "恩施", "region": "华中", "province": "湖北", "intl": false, "type": "city"}, {"id": "岳阳", "region": "华中", "province": "湖南", "intl": false, "type": "city"}, {"id": "井冈山", "region": "华中", "province": "江西", "intl": false, "type": "nature"}, {"id": "珠海", "region": "华南", "province": "广东", "intl": false, "type": "city"}, {"id": "佛山", "region": "华南", "province": "广东", "intl": false, "type": "nature"}, {"id": "阳江", "region": "华南", "province": "广东", "intl": false, "type": "city"}, {"id": "惠州", "region": "华南", "province": "广东", "intl": false, "type": "city"}, {"id": "北海", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "南宁", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "柳州", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "崇左", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "百色", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "河池", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "贺州", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "钦州", "region": "华南", "province": "广西", "intl": false, "type": "city"}, {"id": "海口", "region": "海岛", "province": "海南", "intl": false, "type": "city"}, {"id": "峨眉山", "region": "西南", "province": "四川", "intl": false, "type": "nature"}, {"id": "稻城亚丁", "region": "西南", "province": "四川", "intl": false, "type": "nature"}, {"id": "康定", "region": "西南", "province": "四川", "intl": false, "type": "city"}, {"id": "阆中", "region": "西南", "province": "四川", "intl": false, "type": "city"}, {"id": "香格里拉", "region": "西南", "province": "云南", "intl": false, "type": "city"}, {"id": "腾冲", "region": "西南", "province": "云南", "intl": false, "type": "city"}, {"id": "遵义", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "镇远", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "黔东南", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "荔波", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "安顺", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "黔南", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "黔西南", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "毕节", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "铜仁", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "六盘水", "region": "西南", "province": "贵州", "intl": false, "type": "city"}, {"id": "林芝", "region": "西北", "province": "西藏", "intl": false, "type": "city"}, {"id": "日喀则", "region": "西北", "province": "西藏", "intl": false, "type": "city"}, {"id": "咸阳", "region": "西北", "province": "陕西", "intl": false, "type": "city"}, {"id": "汉中", "region": "西北", "province": "陕西", "intl": false, "type": "city"}, {"id": "青海湖", "region": "西北", "province": "青海", "intl": false, "type": "nature"}, {"id": "伊犁", "region": "西北", "province": "新疆", "intl": false, "type": "city"}, {"id": "雪乡", "region": "东北", "province": "黑龙江", "intl": false, "type": "nature"}, {"id": "漠河", "region": "东北", "province": "黑龙江", "intl": false, "type": "nature"}, {"id": "长春", "region": "东北", "province": "吉林", "intl": false, "type": "city"}, {"id": "长白山", "region": "东北", "province": "吉林", "intl": false, "type": "nature"}, {"id": "丹东", "region": "东北", "province": "辽宁", "intl": false, "type": "city"}, {"id": "台中", "region": "华东", "province": "台湾", "intl": false, "type": "city"}, {"id": "台南", "region": "华东", "province": "台湾", "intl": false, "type": "city"}, {"id": "高雄", "region": "华东", "province": "台湾", "intl": false, "type": "city"}, {"id": "花莲", "region": "华东", "province": "台湾", "intl": false, "type": "city"}, {"id": "吉隆坡", "region": "国际·亚洲", "province": "马来西亚", "intl": true, "type": "intl"}, {"id": "巴厘岛", "region": "国际·亚洲", "province": "印尼", "intl": true, "type": "intl"}, {"id": "迪拜", "region": "国际·亚洲", "province": "阿联酋", "intl": true, "type": "intl"}, {"id": "伦敦", "region": "国际·欧洲", "province": "英国", "intl": true, "type": "intl"}, {"id": "罗马", "region": "国际·欧洲", "province": "意大利", "intl": true, "type": "intl"}, {"id": "巴塞罗那", "region": "国际·欧洲", "province": "西班牙", "intl": true, "type": "intl"}, {"id": "阿姆斯特丹", "region": "国际·欧洲", "province": "荷兰", "intl": true, "type": "intl"}, {"id": "布拉格", "region": "国际·欧洲", "province": "捷克", "intl": true, "type": "intl"}, {"id": "维也纳", "region": "国际·欧洲", "province": "奥地利", "intl": true, "type": "intl"}, {"id": "苏黎世", "region": "国际·欧洲", "province": "瑞士", "intl": true, "type": "intl"}, {"id": "雷克雅未克", "region": "国际·欧洲", "province": "冰岛", "intl": true, "type": "intl"}, {"id": "圣托里尼", "region": "国际·欧洲", "province": "希腊", "intl": true, "type": "intl"}, {"id": "纽约", "region": "国际·美洲", "province": "美国", "intl": true, "type": "intl"}, {"id": "旧金山", "region": "国际·美洲", "province": "美国", "intl": true, "type": "intl"}, {"id": "洛杉矶", "region": "国际·美洲", "province": "美国", "intl": true, "type": "intl"}, {"id": "温哥华", "region": "国际·美洲", "province": "加拿大", "intl": true, "type": "intl"}, {"id": "墨西哥城", "region": "国际·美洲", "province": "墨西哥", "intl": true, "type": "intl"}, {"id": "悉尼", "region": "国际·大洋洲", "province": "澳大利亚", "intl": true, "type": "intl"}, {"id": "墨尔本", "region": "国际·大洋洲", "province": "澳大利亚", "intl": true, "type": "intl"}, {"id": "奥克兰", "region": "国际·大洋洲", "province": "新西兰", "intl": true, "type": "intl"}, {"id": "开罗", "region": "国际·非洲", "province": "埃及", "intl": true, "type": "intl"}, {"id": "开普敦", "region": "国际·非洲", "province": "南非", "intl": true, "type": "intl"}, {"id": "马拉喀什", "region": "国际·非洲", "province": "摩洛哥", "intl": true, "type": "intl"}, {"id": "丹巴", "region": "小众·国内", "province": "四川", "intl": false, "type": "niche"}, {"id": "扎尕那", "region": "小众·国内", "province": "甘肃", "intl": false, "type": "niche"}, {"id": "雨崩", "region": "小众·国内", "province": "云南", "intl": false, "type": "niche"}, {"id": "坝美", "region": "小众·国内", "province": "云南", "intl": false, "type": "niche"}, {"id": "年保玉则", "region": "小众·国内", "province": "青海", "intl": false, "type": "niche"}, {"id": "黔东南小寨", "region": "小众·国内", "province": "贵州", "intl": false, "type": "niche"}, {"id": "晋东南", "region": "小众·国内", "province": "山西", "intl": false, "type": "niche"}, {"id": "独山子大峡谷", "region": "小众·国内", "province": "新疆", "intl": false, "type": "niche"}, {"id": "沙湾古镇", "region": "小众·国内", "province": "广东", "intl": false, "type": "niche"}, {"id": "恩阳古镇", "region": "小众·国内", "province": "四川", "intl": false, "type": "niche"}, {"id": "格鲁吉亚", "region": "小众·国际", "province": "格鲁吉亚", "intl": true, "type": "intl"}, {"id": "亚美尼亚", "region": "小众·国际", "province": "亚美尼亚", "intl": true, "type": "intl"}, {"id": "阿尔巴尼亚", "region": "小众·国际", "province": "阿尔巴尼亚", "intl": true, "type": "intl"}, {"id": "北马其顿", "region": "小众·国际", "province": "北马其顿", "intl": true, "type": "intl"}, {"id": "法罗群岛", "region": "小众·国际", "province": "丹麦法罗", "intl": true, "type": "intl"}, {"id": "亚速尔群岛", "region": "小众·国际", "province": "葡萄牙亚速尔", "intl": true, "type": "intl"}, {"id": "塔吉克斯坦", "region": "小众·国际", "province": "塔吉克斯坦", "intl": true, "type": "intl"}, {"id": "不丹", "region": "小众·国际", "province": "不丹", "intl": true, "type": "intl"}, {"id": "琅勃拉邦", "region": "小众·国际", "province": "老挝", "intl": true, "type": "intl"}];

const STATUS = {
  type: "object",
  required: ["id", "ok"],
  properties: {
    id: { type: "string" },
    ok: { type: "boolean", description: "自检是否通过并已写文件" },
    counts: { type: "object", additionalProperties: { type: "integer" }, description: "各 block 条数" },
    seasons: { type: "integer" },
    climateMonths: { type: "integer" },
    caveats: { type: "string", description: "需人工复核的存疑点(分号分隔)" },
    sources: { type: "integer", description: "核实用了几个网络来源" }
  },
  additionalProperties: true
};

function refFor(t) {
  if (t === "intl") return "巴黎(欧洲)、首尔、新加坡(亚洲)";
  if (t === "nature") return "华山、五台山、张掖(自然/名山)";
  if (t === "niche") return "霞浦、松阳(小众)";
  return "广州、泉州、洛阳(城市)";
}

function prompt(c) {
  return "你是旅行档案编研员,为中文旅行网站「旅行雷达」起草【" + c.id + "】(" + c.region + "·" + c.province +
    (c.intl ? " · 国际城" : "") + ",类型:" + c.type + ")的深度档案。真实第一,宁缺勿造,绝不编造具体店名/老字号/数据。\n\n" +
    "① 先 Read 基准规范并严格遵守其声音/深度/schema:" + SPEC + "\n" +
    "② Read 同类参照城逐字对齐 schema:打开 " + SRC + "/deep.json 看 " + refFor(c.type) +
    ";再看 " + SRC + "/climate.json 与 " + SRC + "/budget.json 里同一参照城的结构。\n" +
    "③ 用 web 搜索(WebSearch/exa/firecrawl)核实真实景点/美食/物候/节庆/气候/交通" +
    (c.intl ? "/签证货币礼俗时差" : "") + "。稀少的类目(老字号/老街)就少写并如实,不要凑数。\n" +
    "④ 产出 {deep, climate, budget} 写到 " + OUTDIR + "/draft-" + c.id + ".json (UTF-8, 严格 schema)。\n" +
    "⑤ 自检(python3 断言):seasons 恰好 12;climate 恰好 12 月且每月 iconSet/condSet 各 5;deep 十个 block 键齐全;radar 四子键(quickGlance/travel/tips/inspiration)齐全;budget 三档字段(stay/food/fun/trans/bigTrans/misc)齐全。修到全过再返回。\n\n" +
    "返回结构化状态:id、ok(自检过且已写文件)、counts(各 block 条数)、seasons、climateMonths、caveats(需复核点)、sources。" +
    "不要编辑 scratchpad 以外任何文件,尤其不要碰 data-src 活文件。";
}

log("开始起草 " + CITIES.length + " 城(并发上限自动约 12,分批跑完)");
const results = await parallel(CITIES.map((c) => () =>
  agent(prompt(c), { label: "draft:" + c.id, phase: "起草", agentType: "general-purpose", schema: STATUS })
    .then((s) => s || { id: c.id, ok: false, caveats: "agent 返回空/失败" })
));
const done = results.filter((r) => r && r.ok);
log("起草完成 ok=" + done.length + "/" + CITIES.length);
return { total: CITIES.length, ok: done.length, results };
