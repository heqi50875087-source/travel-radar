const { chromium } = require("playwright");
const BASE = "http://localhost:8123";
const OUT = "/private/tmp/claude-501/-Users-apple-kushim-cc/31e268f5-c6e4-4733-ba12-73e9cf640ff6/scratchpad";
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + "/#/city/" + encodeURIComponent("华山"), { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.locator("text=去过").first().click();
  await p.waitForTimeout(360);                       // 砸落中途
  const stage = await p.locator(".stamp-stage").count();
  const splat = await p.locator(".stamp-stage .splat").count();
  await p.screenshot({ path: OUT + "/fx-7stamp.png" });
  console.log("stamp-stage=" + stage + " splat=" + splat + " errors=" + errors.length);
  await b.close();
})();
