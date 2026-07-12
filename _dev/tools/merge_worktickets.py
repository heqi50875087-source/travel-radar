#!/usr/bin/env python3
# 外科式合并：把工单 md 里的 10 座深城并入 data/core.js + data/deep.js
# 只增不改：deep→TR_DEEP[城名]，climate/budget→TR_CORE，翻 hasDeep=true，缺坐标才补。
# 绝不重跑 build_data.py（data-src 已空会把 217 城冲没）。可重复执行、幂等。
import json, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = f"{ROOT}/data"
MD = [
    "/Volumes/ORICO/mac downloads/旅行雷达_工单03_成果.md",
    "/Volumes/ORICO/mac downloads/旅行雷达_工单04_成果.md",
]
# 坐标安全网：仅当 TR_CORE.coords 缺该城时才用（实测 10 城坐标已全在，此表为空转兜底）
APPROX = {
    "华山": (34.5, 110.1), "五台山": (39.0, 113.6), "武隆": (29.3, 107.8),
    "镜泊湖": (44.0, 128.9), "阿尔山": (47.2, 119.9), "茶卡盐湖": (36.7, 99.1),
    "嘉峪关": (39.8, 98.3), "中卫": (37.5, 105.2), "喀纳斯": (48.7, 87.0),
    "喀拉峻": (43.5, 82.9),
}
# 回滚用：把跑挂断言的城市 id 写进来，重跑即可把它剔除
EXCLUDE = set(a for a in sys.argv[1:])


def load_js(name, var):
    txt = open(f"{DATA}/{name}", encoding="utf-8").read().strip()
    prefix = f"window.{var}="
    assert txt.startswith(prefix), f"{name} 不是 {prefix}... 格式"
    body = txt[len(prefix):]
    if body.endswith(";"):
        body = body[:-1]
    return json.loads(body)


def emit(name, var, obj):
    js = f"window.{var}={json.dumps(obj, ensure_ascii=False, separators=(',', ':'))};"
    open(f"{DATA}/{name}", "w", encoding="utf-8").write(js)
    return len(js) / 1024


def parse_seasons(arr):
    """'6-9月' / '9月秋色' / '全年' → 月份数组（与 build_data.py 同逻辑，兜底建卡时用）"""
    months = set()
    for s in arr or []:
        if "全年" in s:
            return list(range(1, 13))
        for m in re.finditer(r"(\d{1,2})\s*[-–~]\s*(\d{1,2})\s*月", s):
            a, b = int(m.group(1)), int(m.group(2))
            months.update(range(a, b + 1) if a <= b else list(range(a, 13)) + list(range(1, b + 1)))
        for m in re.finditer(r"(?<![\d-])(\d{1,2})月", s):
            months.add(int(m.group(1)))
    return sorted(x for x in months if 1 <= x <= 12)


def blocks_from_md():
    out = []
    for p in MD:
        md = open(p, encoding="utf-8").read()
        for raw in re.findall(r"```json\s*\n(.*?)\n```", md, re.DOTALL):
            out.append(json.loads(raw))
    return out


# ponytail: 建卡/补字段是安全网，当前 10 城基础卡已完整，这两函数实际不触发
def make_city(cid, deep):
    qg = (deep.get("radar") or {}).get("quickGlance") or {}
    tags = deep.get("taglines") or []
    seasons = ["4-10月"]  # 无从判断时给个温和默认，下面 parse 出 bestMonths
    return {
        "id": cid, "region": "小众·国内", "province": "",
        "tagline": qg.get("subtitle") or " · ".join(tags[:3]) or cid,
        "seasons": seasons, "days": "1-2 天", "perDay": 500,
        "foodTags": [], "mustEat": [d.split("（")[0] for d in (deep.get("mustEat2") or [])[:3]],
        "highlights": [h.split("（")[0] for h in (deep.get("highlights2") or [])[:4]],
        "color": "#A8B5BC", "bestMonths": parse_seasons(seasons), "intl": False,
    }


def fill_missing(city, deep):
    qg = (deep.get("radar") or {}).get("quickGlance") or {}
    tags = deep.get("taglines") or []
    city.setdefault("tagline", qg.get("subtitle") or " · ".join(tags[:3]) or city["id"])
    city.setdefault("region", "小众·国内")
    city.setdefault("province", "")
    city.setdefault("seasons", ["4-10月"])
    city.setdefault("days", "1-2 天")
    city.setdefault("perDay", 500)
    city.setdefault("foodTags", [])
    city.setdefault("highlights", [h.split("（")[0] for h in (deep.get("highlights2") or [])[:4]])
    city.setdefault("color", "#A8B5BC")
    if not isinstance(city.get("bestMonths"), list):
        city["bestMonths"] = parse_seasons(city.get("seasons"))
    city.setdefault("intl", bool(str(city.get("region", "")).startswith(("国际", "海外", "小众·国际"))))


def main():
    CORE = load_js("core.js", "TR_CORE")
    DEEP = load_js("deep.js", "TR_DEEP")
    before = sum(1 for c in CORE["cities"] if c.get("hasDeep"))
    by_id = {c["id"]: c for c in CORE["cities"]}

    report = []
    for blk in blocks_from_md():
        cid = blk["id"]
        if cid in EXCLUDE:
            report.append(f"跳过 {cid}（EXCLUDE 回滚）")
            continue
        deep, clim, bud = blk["deep"], blk.get("climate"), blk.get("budget")

        # 校验：climate 12 月 + budget 三档，缺则拒并（不硬塞）
        if not clim or len(clim) != 12:
            report.append(f"跳过 {cid}（climate 非 12 月：{len(clim or {})}）")
            continue
        if not bud or not all(t in bud for t in ("经济", "中端", "品质")):
            report.append(f"跳过 {cid}（budget 三档不全）")
            continue

        DEEP[cid] = deep
        CORE["climate"][cid] = clim
        CORE["budget"][cid] = bud
        CORE["coords"].setdefault(cid, {"lat": APPROX.get(cid, (0, 0))[0], "lng": APPROX.get(cid, (0, 0))[1]})

        city = by_id.get(cid)
        if city is None:
            city = make_city(cid, deep)
            CORE["cities"].append(city)
            by_id[cid] = city
            note = "建卡"
        else:
            fill_missing(city, deep)
            note = "已存在补齐"
        city["hasDeep"] = True
        report.append(f"成功 {cid}（{note}）")

    kb_c = emit("core.js", "TR_CORE", CORE)
    kb_d = emit("deep.js", "TR_DEEP", DEEP)
    after = sum(1 for c in CORE["cities"] if c.get("hasDeep"))

    print(f"hasDeep：{before} → {after}")
    print(f"DEEP 档案数：{len(DEEP)} | cities：{len(CORE['cities'])} | core.js {kb_c:.0f}KB / deep.js {kb_d:.0f}KB")
    for r in report:
        print("  " + r)


if __name__ == "__main__":
    main()
