const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("http://localhost:8123/#/city/" + encodeURIComponent("华山"), { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1900);
  const info = await p.evaluate(() => {
    const all = document.querySelectorAll(".diorama");
    const dio = all[0];
    if (!dio) return { err: "no diorama" };
    const cs = getComputedStyle(dio);
    const hero = dio.parentElement;
    return {
      count: all.length,
      matches: dio.matches(".diorama"),
      className: dio.className,
      parentTag: hero.tagName + "." + hero.className,
      position: cs.position, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right,
      height: cs.height, width: cs.width, zIndex: cs.zIndex, display: cs.display, inset: cs.inset || "(n/a)",
      contain: cs.contain, transformStyle: cs.transformStyle,
      heroOffsetH: hero.offsetHeight, heroClientH: hero.clientHeight, heroPos: getComputedStyle(hero).position,
      // 直接查有没有别的规则赢了 position
      matchedRules: (() => { try { return [...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } }).filter(r => r.selectorText && r.selectorText.includes("diorama") && !r.selectorText.includes(" ")).map(r => r.selectorText + " {" + (r.style.position ? "position:" + r.style.position + ";" : "") + (r.style.zIndex ? "z-index:" + r.style.zIndex : "") + "}") } catch (e) { return [String(e)] } })(),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
