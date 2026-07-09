#!/usr/bin/env python3
# 数据管线：data-src/*.json → site/data/core.js + site/data/deep.js
# 源数据回收自旧版 page.tsx（0520旅游9），本脚本是唯一加工入口，改数据先改 data-src 再重跑
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = f"{ROOT}/_dev/data-src"
OUT = f"{ROOT}/data"
os.makedirs(OUT, exist_ok=True)

def load(name):
    with open(f"{SRC}/{name}.json", encoding="utf-8") as f:
        return json.load(f)

cities, coords, climate, budget, deep = (load(n) for n in ["cities", "coords", "climate", "budget", "deep"])

# 深度档案有但基础卡缺的两城，补卡
EXTRA = [
    {"id": "顺德", "region": "华南", "province": "广东", "tagline": "世界美食之都 · 粤菜之源 · 每一口都认真", "seasons": ["10-12月", "3-4月"], "days": "2-3 天", "perDay": 500, "foodTags": ["粤菜", "顺德菜", "甜品"], "mustEat": ["双皮奶", "顺德鱼生", "煲仔饭", "伦教糕", "均安蒸猪"], "highlights": ["清晖园", "逢简水乡", "华盖路步行街", "顺峰山公园"], "color": "#E8C9A0", "note": "纯为吃而去的城市：早茶-鱼生-煲仔饭-糖水一天四轮"},
    {"id": "自贡", "region": "西南", "province": "四川", "tagline": "千年盐都 · 恐龙之乡 · 灯会冠绝西南", "seasons": ["2-4月灯会", "10-11月"], "days": "1-2 天", "perDay": 400, "foodTags": ["盐帮菜", "川菜"], "mustEat": ["冷吃兔", "跳水鱼", "富顺豆花", "火边子牛肉"], "highlights": ["自贡灯会", "恐龙博物馆", "燊海井", "仙市古镇"], "color": "#E5989B", "note": "盐帮菜是川菜里最猛的一支；春节灯会全国最强"},
]
have = {c["id"] for c in cities}
for e in EXTRA:
    if e["id"] not in have:
        cities.append(e)

# 补充坐标（coords-fill 代理产出，±0.3° 精度够画图算距离）
fill_path = f"{SRC}/coords_fill.json"
if os.path.exists(fill_path):
    with open(fill_path, encoding="utf-8") as f:
        fill = json.load(f)
    for k, v in fill.items():
        coords.setdefault(k, {"lat": v[0], "lng": v[1]})
# 旧 coords 格式统一成 {lat, lng}
norm_coords = {}
for k, v in coords.items():
    if isinstance(v, list):
        norm_coords[k] = {"lat": v[0], "lng": v[1]}
    else:
        norm_coords[k] = {"lat": v.get("lat"), "lng": v.get("lng") if v.get("lng") is not None else v.get("lon")}
for e in EXTRA:
    norm_coords.setdefault("顺德", {"lat": 22.80, "lng": 113.29})
    norm_coords.setdefault("自贡", {"lat": 29.35, "lng": 104.78})

def parse_seasons(arr):
    """'9-11月' / '3-5月樱花' / '11-4月' / '全年' → 月份数组"""
    months = set()
    for s in arr or []:
        if "全年" in s:
            return list(range(1, 13))
        for m in re.finditer(r"(\d{1,2})\s*[-–~]\s*(\d{1,2})\s*月", s):
            a, b = int(m.group(1)), int(m.group(2))
            if a <= b:
                months.update(range(a, b + 1))
            else:  # 跨年 11-4月
                months.update(list(range(a, 13)) + list(range(1, b + 1)))
        for m in re.finditer(r"(?<![\d-])(\d{1,2})月", s):
            months.add(int(m.group(1)))
    return sorted(x for x in months if 1 <= x <= 12)

for c in cities:
    c["bestMonths"] = parse_seasons(c.get("seasons"))
    c["hasDeep"] = c["id"] in deep
    c["intl"] = bool(c["region"].startswith("国际") or c["region"].startswith("海外") or c["region"] == "小众·国际")

def emit(path, varname, obj):
    js = f"window.{varname}={json.dumps(obj, ensure_ascii=False, separators=(',', ':'))};"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"{path}  {len(js)/1024:.0f} KB")

emit(f"{OUT}/core.js", "TR_CORE", {
    "cities": cities, "coords": norm_coords, "climate": climate, "budget": budget,
})
emit(f"{OUT}/deep.js", "TR_DEEP", deep)

missing = [c["id"] for c in cities if c["id"] not in norm_coords]
print(f"城市 {len(cities)} | 深度档案 {len(deep)} | 仍缺坐标 {len(missing)}: {missing[:10]}")
