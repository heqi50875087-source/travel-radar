#!/usr/bin/env python3
# 导入外部 AI 整理的城市档案：python3 import_cities.py <成果文件.md或.json> [--write]
# 不带 --write 只校验出报告；带 --write 合入 data-src 并提示重跑 build_data.py
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = f"{ROOT}/_dev/data-src"
MONTHS = [f"{i}月" for i in range(1, 13)]

def load_payloads(path):
    text = open(path, encoding="utf-8").read()
    if path.endswith(".json"):
        obj = json.loads(text)
        return obj if isinstance(obj, list) else [obj]
    blocks = re.findall(r"```json\s*(.*?)```", text, re.S)
    out = []
    for i, b in enumerate(blocks):
        try:
            out.append(json.loads(b))
        except Exception as e:
            print(f"  ✗ 第 {i+1} 个 json 代码块解析失败: {e}")
    return out

def check(o, errs):
    cid = o.get("id")
    if not cid:
        errs.append("缺 id"); return None
    d = o.get("deep")
    if d:
        for k, lo in [("taglines", 3), ("highlights2", 6), ("mustEat2", 5), ("localFav", 1), ("seasons", 12)]:
            v = d.get(k)
            if not isinstance(v, list) or len(v) < lo:
                errs.append(f"{cid}.deep.{k} 少于 {lo} 条或缺失")
        if isinstance(d.get("seasons"), list):
            got = [s.get("month") for s in d["seasons"]]
            if sorted(got, key=lambda x: MONTHS.index(x) if x in MONTHS else 99) != MONTHS:
                errs.append(f"{cid}.deep.seasons 月份不齐或格式错（须 1月..12月 各一条）")
        r = d.get("radar") or {}
        q = (r.get("quickGlance") or {})
        if len(q.get("bullets") or []) != 5: errs.append(f"{cid}.quickGlance.bullets 须恰好 5 条")
        if len(((r.get("tips") or {}).get("avoid")) or []) < 4: errs.append(f"{cid}.tips.avoid 少于 4 条")
        t = r.get("travel") or {}
        if "上海" not in (t.get("fromTransport") or ""): errs.append(f"{cid}.travel.fromTransport 未包含从上海出发方案")
    cl = o.get("climate")
    if cl:
        for m in MONTHS:
            e = cl.get(m)
            if not e: errs.append(f"{cid}.climate 缺 {m}"); continue
            if len(e.get("iconSet") or []) != 5 or len(e.get("condSet") or []) != 5:
                errs.append(f"{cid}.climate.{m} iconSet/condSet 须各 5 项")
            tb = e.get("tempBase")
            if not (isinstance(tb, list) and len(tb) == 2 and all(isinstance(x, (int, float)) for x in tb) and tb[0] <= tb[1]):
                errs.append(f"{cid}.climate.{m}.tempBase 须 [低,高] 数字")
    b = o.get("budget")
    if b:
        for tier in ["经济", "中端", "品质"]:
            p = b.get(tier)
            if not p or any(k not in p for k in ["stay", "food", "fun", "trans", "bigTrans", "misc"]):
                errs.append(f"{cid}.budget.{tier} 六项不齐")
    return cid

def main():
    if len(sys.argv) < 2:
        print(__doc__ or "用法: import_cities.py <文件> [--write]"); sys.exit(1)
    path, write = sys.argv[1], "--write" in sys.argv
    cities = {c["id"] for c in json.load(open(f"{SRC}/cities.json", encoding="utf-8"))} | {"顺德", "自贡"}
    payloads = load_payloads(path)
    print(f"读到 {len(payloads)} 城")
    errs, oks = [], []
    for o in payloads:
        cid = check(o, errs)
        if cid and cid not in cities:
            errs.append(f"{cid} 不在城市清单里（名字必须一字不差）")
        elif cid:
            oks.append(o)
    bad_ids = {e.split(".")[0].split(" ")[0] for e in errs}
    good = [o for o in oks if o["id"] not in bad_ids]
    print(f"通过 {len(good)} 城；问题 {len(errs)} 条")
    for e in errs: print("  ✗", e)
    if not write or not good:
        print("（校验模式，未写入。确认后加 --write）" if not write else "无可写入城市")
        return
    deep = json.load(open(f"{SRC}/deep.json", encoding="utf-8"))
    climate = json.load(open(f"{SRC}/climate.json", encoding="utf-8"))
    budget = json.load(open(f"{SRC}/budget.json", encoding="utf-8"))
    for o in good:
        cid = o["id"]
        if o.get("deep"): deep[cid] = o["deep"]
        if o.get("climate"): climate[cid] = o["climate"]
        if o.get("budget"): budget[cid] = o["budget"]
    json.dump(deep, open(f"{SRC}/deep.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(climate, open(f"{SRC}/climate.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(budget, open(f"{SRC}/budget.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"✅ 已合入 {len(good)} 城 → 记得跑: python3 _dev/tools/build_data.py && node _dev/selftest.js")

main()
