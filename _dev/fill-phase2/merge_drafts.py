#!/usr/bin/env python3
"""校验全部城市草稿 → 报告缺失/无效 → (--merge) 合并进 data-src。build/selftest 另跑。"""
import json, glob, os, sys
SC="/private/tmp/claude-501/-Users-apple-kushim-cc/15524d52-a25e-4713-8f08-2961c2934966/scratchpad"
SRC="/Users/apple/kushim-cc/travel-planner/travel-radar/_dev/data-src"
REQ_DEEP=["taglines","highlights2","mustEat2","localFav","oldShops","smallStreets","phenology","wildlife","seasons","radar"]
REQ_RADAR=["quickGlance","travel","tips","inspiration"]
REQ_BUDGET=["stay","food","fun","trans","bigTrans","misc"]

expected=[c["id"] for c in json.load(open(f"{SC}/fill_list.json"))]+["深圳"]  # 98
def validate(f):
    d=json.load(open(f)); dp=d["deep"]
    assert all(k in dp for k in REQ_DEEP), "deep block 缺"
    for b in ["taglines","highlights2","mustEat2","localFav","oldShops","smallStreets"]:
        assert isinstance(dp[b],list), f"{b} 非 list"
    assert len(dp["seasons"])==12, f"seasons={len(dp['seasons'])}"
    for s in dp["seasons"]: assert "month" in s and "what" in s, "season 字段"
    assert all(k in dp["radar"] for k in REQ_RADAR), "radar 子键缺"
    assert len(d["climate"])==12, f"climate={len(d['climate'])}月"
    for m,v in d["climate"].items():
        assert len(v["iconSet"])==5 and len(v["condSet"])==5 and len(v["tempBase"])==2, f"climate {m}"
    for t in ["经济","中端","品质"]:
        assert all(k in d["budget"][t] for k in REQ_BUDGET), f"budget {t}"
    return d

present={}; invalid={}
for f in glob.glob(f"{SC}/cities/draft-*.json"):
    cid=os.path.basename(f)[6:-5]
    try: present[cid]=validate(f)
    except Exception as e: invalid[cid]=str(e)
missing=[c for c in expected if c not in present and c not in invalid]
print(f"期望 {len(expected)} | 有效 {len(present)} | 无效 {len(invalid)} | 缺失 {len(missing)}")
if invalid: print("无效:", {k:invalid[k] for k in list(invalid)[:20]})
if missing: print("缺失:", missing)

if "--merge" in sys.argv:
    partial = "--partial" in sys.argv
    if invalid:
        print("!! 有无效草稿,拒绝合并。先修。"); sys.exit(1)
    if missing and not partial:
        print("!! 有缺失,拒绝合并。加 --partial 只合已成的。"); sys.exit(1)
    if missing and partial:
        print(f"部分合并模式: 忽略 {len(missing)} 缺失城,只合 {len(present)} 有效城。")
    deep=json.load(open(f"{SRC}/deep.json")); clim=json.load(open(f"{SRC}/climate.json")); budg=json.load(open(f"{SRC}/budget.json"))
    added=0
    for cid,d in present.items():
        if cid in deep: continue  # 已有(不该发生),跳过不覆盖
        deep[cid]=d["deep"]; clim[cid]=d["climate"]; budg[cid]=d["budget"]; added+=1
    json.dump(deep,open(f"{SRC}/deep.json","w"),ensure_ascii=False,indent=0)
    json.dump(clim,open(f"{SRC}/climate.json","w"),ensure_ascii=False)
    json.dump(budg,open(f"{SRC}/budget.json","w"),ensure_ascii=False)
    print(f"✅ 合并 {added} 城 → 源 deep 现 {len(deep)} 城。下一步: build_data.py + selftest。")
else:
    print("(加 --merge 执行合并)")
