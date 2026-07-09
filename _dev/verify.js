/* Playwright 双端走查：截图 + 交互链路 + 控制台错误收集 */
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8123";
const OUT = __dirname + "/shots";
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function run(tag, viewport) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`[${tag}] PAGEERROR ${e.message}`));

    await page.goto(BASE + "/#/radar", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${tag}-1radar.png`, fullPage: false });

    // 雷达交互：切月份、加偏好、切国际
    await page.click('[data-month="10"]');
    await page.click('[data-pref="秋色"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${tag}-2radar-oct.png` });
    const topCity = await page.textContent(".top-card h3");

    // 探索页 + 搜索
    await page.goto(BASE + "/#/explore", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${tag}-3explore.png` });
    await page.fill("#citySearch", "早茶");
    await page.waitForTimeout(300);
    const searchCount = await page.locator(".city-card").count();

    // 城市档案（扬州 = 深度档案）
    await page.goto(BASE + "/#/city/" + encodeURIComponent("扬州"), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/${tag}-4city.png`, fullPage: true });
    const blockCount = await page.locator(".block").count();

    // 收藏
    await page.click("#favBtn");
    await page.waitForTimeout(300);

    // 行囊：生成行程
    await page.goto(BASE + "/#/plan", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.fill("#tripCity", "扬州");
    await page.click("#createTrip");
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${tag}-5trip.png`, fullPage: true });
    const dayCount = await page.locator(".itin-day").count();

    // 预算 tab
    await page.click('[data-tab="budget"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${tag}-6budget.png` });
    // 装备 tab + 勾选
    await page.click('[data-tab="pack"]');
    await page.waitForTimeout(400);
    const firstPack = page.locator(".pack-item").first();
    await firstPack.click();
    const packDone = await firstPack.getAttribute("class");
    await page.screenshot({ path: `${OUT}/${tag}-7pack.png` });
    // 安全卡
    await page.click('[data-tab="safety"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${tag}-8safety.png` });

    // 我的 + 暗色
    await page.goto(BASE + "/#/me", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${tag}-9me.png`, fullPage: true });
    await page.click("#themeBtn");
    await page.waitForTimeout(400);
    await page.goto(BASE + "/#/radar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${tag}-10dark.png` });

    console.log(`[${tag}] top1=${topCity && topCity.trim()} 搜早茶=${searchCount}城 档案块=${blockCount} 行程天=${dayCount} 勾选=${packDone.includes("done") ? "✓" : "✗"}`);
    // 断言
    if (!topCity) errors.push(`[${tag}] 雷达无结果`);
    if (searchCount < 1) errors.push(`[${tag}] 搜索无结果`);
    if (blockCount < 8) errors.push(`[${tag}] 档案块过少 ${blockCount}`);
    if (dayCount !== 3) errors.push(`[${tag}] 行程天数 ${dayCount}≠3`);
    if (!packDone.includes("done")) errors.push(`[${tag}] 装备勾选失效`);
    await page.close();
  }

  await run("mobile", { width: 390, height: 844 });
  await run("desktop", { width: 1440, height: 900 });
  await browser.close();

  if (errors.length) { console.error("❌ 问题：\n" + errors.join("\n")); process.exit(1); }
  console.log("✅ 双端走查通过，截图在 _dev/shots/");
})();
