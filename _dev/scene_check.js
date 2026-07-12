/* 场景差异化 + 景深验证：抓不同场景城市的 hero */
const { chromium } = require("playwright");
const BASE = "http://localhost:8123", OUT = "/private/tmp/claude-501/-Users-apple-kushim-cc/31e268f5-c6e4-4733-ba12-73e9cf640ff6/scratchpad";
const CITIES = [["苏州", "water"], ["大理", "mountain?"], ["三亚", "coast?"], ["敦煌", "desert?"]];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1.5 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  for (const [city, hint] of CITIES) {
    await p.goto(BASE + "/#/city/" + encodeURIComponent(city), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1500);
    const dio = await p.locator(".diorama").count();
    const scene = await p.evaluate(() => { const d = document.querySelector(".diorama"); return d ? d.className : "none"; });
    await p.screenshot({ path: OUT + "/scene-" + city + ".png" });
    console.log(city + " (" + hint + ") → diorama=" + dio + " class=" + scene);
  }
  console.log("errors=" + errs.length);
  await b.close();
})();
