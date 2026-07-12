/* 大惊喜层冒烟测试：控制台零错误 + 逐特性断言 + 截图 */
const { chromium } = require("playwright");
const BASE = "http://localhost:8123";
const OUT = "/private/tmp/claude-501/-Users-apple-kushim-cc/31e268f5-c6e4-4733-ba12-73e9cf640ff6/scratchpad";
const errors = [];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("  ✗ " + m); } };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

  // ── 雷达首页 ──
  await page.goto(BASE + "/#/radar", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + "/fx-1radar.png" });

  // ── P0-1 点灯仪式：点主题钮 → sky-ceremony 出现，data-theme 翻转 ──
  const themeBefore = await page.getAttribute("html", "data-theme");
  await page.click("#themeBtn");
  await page.waitForTimeout(280);
  const skyOn = await page.locator(".sky-ceremony").count();
  ok(skyOn >= 1, "P0-1 点灯仪式：点主题钮后应出现 .sky-ceremony 天体层（实得 " + skyOn + "）");
  await page.screenshot({ path: OUT + "/fx-2ceremony.png" });
  await page.waitForTimeout(1700);
  const themeAfter = await page.getAttribute("html", "data-theme");
  ok(themeBefore !== themeAfter, "P0-1 主题应翻转（" + themeBefore + "→" + themeAfter + "）");
  const skyGone = await page.locator(".sky-ceremony").count();
  ok(skyGone === 0, "P0-1 仪式后天体层应自清（实得 " + skyGone + "）");
  await page.screenshot({ path: OUT + "/fx-3dark.png" });
  await page.click("#themeBtn"); // 切回浅色
  await page.waitForTimeout(1800);

  // ── P0-4 登机牌：探索页城市卡应为 .city-flip，点 ✈ 翻面出登机牌 ──
  await page.goto(BASE + "/#/explore", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const flipCards = await page.locator(".city-flip").count();
  ok(flipCards > 0, "P0-4 探索页应有 .city-flip 卡（实得 " + flipCards + "）");
  const card3d = await page.locator(".card3d").count();
  ok(card3d > 0, "P0-4 应有 .card3d 翻转容器（实得 " + card3d + "）");
  await page.locator(".flip-tab").first().click();
  await page.waitForTimeout(750);
  const flipped = await page.locator(".card3d.flipped").count();
  ok(flipped >= 1, "P0-4 点 ✈ 后应有 .card3d.flipped（实得 " + flipped + "）");
  const bp = await page.locator(".card3d.flipped .bp").count();
  ok(bp >= 1, "P0-4 翻面背面应懒加载出登机牌 .bp（实得 " + bp + "）");
  await page.screenshot({ path: OUT + "/fx-4boardingpass.png" });

  // ── P0-2 立体书城池：进新城华山档案页，应有 diorama 三层 + 日月盘 ──
  await page.goto(BASE + "/#/city/" + encodeURIComponent("华山"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);
  const dio = await page.locator(".diorama").count();
  ok(dio === 1, "P0-2 华山档案页应有 1 个 .diorama（实得 " + dio + "）");
  const dioLayers = await page.locator(".diorama .dio-l").count();
  ok(dioLayers === 3, "P0-2 城池应有 3 层 .dio-l（实得 " + dioLayers + "）");
  const dioSun = await page.locator(".diorama .dio-sun").count();
  ok(dioSun === 1, "P0-2 应有日月盘 .dio-sun（实得 " + dioSun + "）");
  const cityname = await page.textContent(".profile-hero .cityname");
  ok(cityname && cityname.includes("华山"), "P0-2 华山档案页正常渲染（城名=" + (cityname || "").slice(0, 6) + "）");
  const blocks = await page.locator(".block").count();
  ok(blocks >= 6, "P0-2 华山深度档案区块 ≥6（实得 " + blocks + "，验证 deep 数据也在）");
  await page.screenshot({ path: OUT + "/fx-5diorama-huashan.png", fullPage: false });

  // ── 另一座新城茶卡盐湖（盐湖→coast/desert 场景）截图对比 ──
  await page.goto(BASE + "/#/city/" + encodeURIComponent("茶卡盐湖"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const dio2 = await page.locator(".diorama").count();
  ok(dio2 === 1, "P0-2 茶卡盐湖也有 diorama（实得 " + dio2 + "）");
  await page.screenshot({ path: OUT + "/fx-6diorama-chaka.png" });

  // ── 控制台零错误（最关键） ──
  ok(errors.length === 0, "控制台/页面零错误（实得 " + errors.length + " 条）");

  await browser.close();
  console.log("\n错误日志：" + (errors.length ? "\n" + errors.join("\n") : "无"));
  console.log(`\n冒烟结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
