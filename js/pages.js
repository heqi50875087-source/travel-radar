/* 旅行雷达 · 信息页（关于 / 隐私政策 / 帮助）+ 首访引导
   —— 一个完整网站"该有的元素"：讲清自己是谁、如何待你的数据、怎么上手。
   全部沿用视图层的 innerHTML 模板 + 既有 CSS（card / me-sec / rv / manifesto）。 */
(function (TR) {
  "use strict";
  const V = TR.views, esc = TR.esc, $ = TR.$;

  // 顶部返回条：这些是「我的」下的子页，标签栏不高亮任一 tab，给一条明确回路
  const backBar = (label) =>
    `<div class="sec-head" style="margin-top:24px">
       <a class="crumb" href="#/me" aria-label="返回我的">← 我的</a>
       <span class="idx">Doc</span><h2>${esc(label)}</h2></div>`;

  const cityCount = () => (window.TR_CORE ? window.TR_CORE.cities.length : 217);
  const deepCount = () => Object.keys(window.TR_DEEP || {}).length || 119;

  /* ========== 关于 ========== */
  V.about = function (root) {
    root.innerHTML = `
      ${backBar("关于旅行雷达")}
      <section class="card me-sec rv"><h3>🧭 一个人的旅行参谋部</h3>
        <p class="manifesto">它<b>不卖票、不种草、不推流</b>——推荐只对你的口味负责；<br>
        它相信最好的旅行工具，是<b>最快帮你做完决定就该被关掉</b>的那种；<br>
        它把 ${cityCount()} 座城市、${deepCount()} 份深度档案装进口袋，<b>离线也在</b>。</p>
      </section>

      <section class="card me-sec rv"><h3>⚙️ 它怎么替你收敛答案</h3>
        <p class="desc">在「雷达」里选好<b>出发地 · 月份 · 天数 · 预算 · 口味</b>，它给每座候选城打分：
        当月是否当令（物候/气候）、离你远近、合不合你的偏好与预算，再排出前三名——
        每个都给理由，也会提前预警（雨季、旺季、证件门槛这类）。不满意就「抽一座城」交给缘分。</p>
      </section>

      <section class="card me-sec rv"><h3>📚 数据从哪来</h3>
        <p class="desc">城市档案是 2024–2026 年<b>手工编研</b>的行前功课：怎么玩、何时去、吃什么、老店与小街、
        当季物候与山水。它<b>不是实时数据</b>——票价、交通与营业信息会变，<b>出行前请自行复核</b>。
        深度档案仍在持续增补中，还没覆盖到的城市会先给基础卡。</p>
      </section>

      <section class="card me-sec rv"><h3>🔒 它怎么待你的数据</h3>
        <p class="desc">不设账号、不用 Cookie、不加载任何第三方统计或广告脚本；你的收藏、行程、笔记<b>只存在这台设备</b>。
        详见 <a class="doc-link" href="#/privacy">隐私政策</a>。上手有疑问看 <a class="doc-link" href="#/help">帮助与常见问题</a>。</p>
      </section>

      <section class="card me-sec rv"><h3>💛 关于作者</h3>
        <p class="desc">这是一个人利用业余时间做的非商业小工具，为"一个人也能从容出发"而写。
        它会慢慢长大，但始终守着三条：零广告、离线可用、数据不离开你的设备。</p>
        ${window.TR && TR.sound ? `<p class="theme-song" style="margin-top:10px">♪ 本站主题曲 · <a target="_blank" rel="noopener" href="${TR.sound.netease(TR.sound.ANTHEM.song, TR.sound.ANTHEM.artist)}">${esc(TR.sound.ANTHEM.song)}</a> · ${esc(TR.sound.ANTHEM.artist)}</p>` : ""}
      </section>`;
    if (window.TR && TR.biz) TR.biz.renderFooterDisclosure(root);
    TR.fx.reveal(root);
  };

  /* ========== 隐私政策 ========== */
  V.privacy = function (root) {
    root.innerHTML = `
      ${backBar("隐私政策")}
      <section class="card me-sec rv"><h3>一句话</h3>
        <p class="manifesto"><b>你的数据不出这台设备。</b>我们不认识你，也不想认识——没有账号、没有服务器在收你的数据。</p>
        <p class="desc" style="margin-top:6px;color:var(--ink-3)">更新日期：2026-07 · 本站为个人非商业项目</p>
      </section>

      <section class="card me-sec rv"><h3>① 我们收集什么</h3>
        <p class="desc"><b>不收集任何个人信息。</b>没有注册、没有登录、不用 Cookie、不做用户画像。
        你在站内的操作（收藏"想去"、标记"去过"、生成行程、写城市笔记、改设置）只写进<b>你浏览器的本地存储（localStorage）</b>，
        <b>不上传到任何服务器</b>——本站根本没有可以接收数据的后端。</p>
      </section>

      <section class="card me-sec rv"><h3>② 第三方统计与广告</h3>
        <p class="desc"><b>当前不加载任何第三方统计或广告脚本，页面零外联。</b>
        （站点保留一个可选的统计位，但仅在未来明确配置后才会启用，届时本页会同步说明；现在它是关闭的。）</p>
      </section>

      <section class="card me-sec rv"><h3>③ 什么时候会"离开"本站</h3>
        <p class="desc">唯一的对外连接发生在<b>你主动点击外链的那一刻</b>：如高德导航、12306、携程订票、装备购买、
        网易云/QQ 音乐搜索等。点击后你会跳转到对方网站，之后就由<b>对方的隐私政策</b>约束了，与本站无关。
        本站从不在后台替你请求这些第三方。</p>
      </section>

      <section class="card me-sec rv"><h3>④ 离线缓存</h3>
        <p class="desc">为了让你断网也能翻档案，Service Worker 会把本站<b>自身的静态文件</b>（页面、脚本、城市数据）缓存到设备。
        缓存内容全部来自本站，不含任何你的个人数据。清掉浏览器缓存即可移除。</p>
      </section>

      <section class="card me-sec rv"><h3>⑤ 你的控制权</h3>
        <p class="desc">在「我的 → 我的数据」里，你可以随时<b>导出备份</b>（下载成 JSON 存到自己手里）、
        <b>导入</b>（换设备迁移）、或<b>一键清空全部</b>。清空即彻底删除本机所有本站数据，不可恢复。</p>
        <div style="margin-top:10px"><a class="btn ghost sm" href="#/me">前往「我的」管理数据 →</a></div>
      </section>

      <section class="card me-sec rv"><h3>⑥ 儿童与变更</h3>
        <p class="desc">本站不面向特定人群定向、不采集信息，适合所有年龄使用。
        若隐私做法有变（例如未来启用统计），会在本页更新日期并说明。</p>
      </section>`;
    if (window.TR && TR.biz) TR.biz.renderFooterDisclosure(root);
    TR.fx.reveal(root);
  };

  /* ========== 帮助 · 常见问题 ========== */
  V.help = function (root) {
    const faqs = [
      ["这是什么？要花钱吗？",
        "旅行雷达是一个免费、零广告的旅行决策工具：帮你想清楚「这个月去哪、怎么玩透、一个人也从容」。不卖票、不佣金，永久免费。"],
      ["怎么用雷达找到该去的城市？",
        "在「雷达」页选出发地、月份、天数、预算和口味，它会从 " + cityCount() + " 个目的地里替你排出前三名，每个都给理由和预警。想随机一点，点「🎲 抽一座城」。"],
      ["怎么离线用 / 装到手机上？",
        "iPhone：用 Safari 打开本站 → 底部「分享」→「添加到主屏幕」；安卓：Chrome 右上菜单 →「添加到主屏幕/安装应用」。装好后即使断网，城市档案照样能翻。"],
      ["我的收藏、行程、笔记存在哪？换手机会丢吗？",
        "全部只存在<b>你这台设备的浏览器本地</b>，不上传服务器。换设备时：在「我的 → 我的数据」点<b>导出备份</b>，到新设备<b>导入</b>即可迁移。清浏览器数据或换浏览器会丢，记得先导出。"],
      ["数据安全吗？会被追踪吗？",
        "不会。没有账号、不用 Cookie、不加载第三方统计或广告，页面零外联。详见 <a class='doc-link' href='#/privacy'>隐私政策</a>。"],
      ["票价、营业时间、交通信息准吗？",
        "城市档案是手工编研的行前功课，<b>不是实时数据</b>。票价与营业信息会变，<b>出行前请务必自行复核官方渠道</b>。"],
      ["深浅色、字号、音效怎么调？",
        "都在「我的 → 设置」：外观（跟随系统/纸墨/暗金）、字号（标准/大字/特大）、音效开关。顶栏右上角的按钮也能一键切换深浅色。"],
      ["为什么有的城市没有深度档案？",
        "深度档案在持续增补中，还没写到的城市会先给基础卡。城市选择器里带小黄点（<i class='dot' style='display:inline-block;vertical-align:middle'></i>）的表示已有深度档案。"],
      ["有建议或发现错误怎么反馈？",
        "这是一个人做的非商业项目，暂无在线客服。欢迎把它推荐给同样一个人旅行的朋友——口口相传就是最好的支持。"],
    ];
    root.innerHTML = `
      ${backBar("帮助 · 常见问题")}
      <section class="card me-sec rv"><h3>快速上手</h3>
        <ol class="install-steps">
          <li><b>找城市</b>：在「雷达」选好条件，看排名前三的建议</li>
          <li><b>看透一座城</b>：点进档案，读「怎么玩·N天」，点「存进行囊」</li>
          <li><b>备齐再走</b>：「行囊」里管行程、预算、装备、安全清单</li>
          <li><b>攒自己的地图</b>：喜欢的点「想去 ♥」，去过的打卡点亮</li>
        </ol>
      </section>
      ${faqs.map(([q, a]) => `<details class="faq rv"><summary>${esc(q)}</summary><div class="faq-a">${a}</div></details>`).join("")}
      <section class="card me-sec rv" style="text-align:center">
        <a class="doc-link" href="#/about">关于旅行雷达</a> · <a class="doc-link" href="#/privacy">隐私政策</a>
      </section>`;
    if (window.TR && TR.biz) TR.biz.renderFooterDisclosure(root);
    TR.fx.reveal(root);
  };

  /* ========== 未知路由 · 走丢页 ========== */
  V.notFound = function (root) {
    root.innerHTML = `
      <div class="empty notfound" style="margin-top:56px">
        <span class="empty-ico bob" aria-hidden="true">🧭</span>
        <b>这个页面走丢了</b>
        地址似乎不对——回雷达重新出发吧。
        <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn terra sm" href="#/radar">回雷达</a>
          <a class="btn ghost sm" href="#/explore">看城市图集</a>
        </div>
      </div>`;
    TR.fx.reveal(root);
  };

  /* ========== 首访引导（只弹一次） ==========
     新访客落在雷达页毫无上下文——用一层可跳过的欢迎，讲清这是什么、四个 tab 干嘛，
     并邀请设置出发地。复用既有 modal 体系，尊重 reduced-motion（CSS 里已统一收敛）。 */
  TR.onboard = function (force) {
    if (!force && TR.store.get("onboarded", false)) return;
    const rootM = $("#modal-root");
    if (!rootM || rootM.querySelector(".onboard")) return;
    const S = TR.state;
    rootM.innerHTML = `<div class="modal-mask" id="obMask"><div class="modal-box onboard" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <div class="ob-mark" aria-hidden="true">📡</div>
      <h3 id="obTitle">欢迎来到旅行雷达</h3>
      <p class="ob-sub">一个人的旅行参谋部——帮你想清楚<b>这个月去哪、怎么玩透</b>。<br>零广告、离线可用、数据只留在你的设备。</p>
      <ul class="ob-tabs">
        <li><b>📡 雷达</b> 选月份口味，收敛出前三个该去的城</li>
        <li><b>🗺 城市</b> ${cityCount()} 城可翻，${deepCount()} 份深度档案</li>
        <li><b>🎒 行囊</b> 行程 · 预算 · 装备 · 安全，一站备齐</li>
        <li><b>🌿 我的</b> 收藏、足迹、笔记，攒一张自己的地图</li>
      </ul>
      <div class="ob-from">
        <span>你从哪出发？</span>
        <button class="from-input picker-input" id="obFrom">${esc(S.settings.from || "选择出发地")}</button>
      </div>
      <div class="ob-acts">
        <button class="btn terra" id="obStart">开始探索</button>
        <button class="btn ghost sm" id="obSkip">跳过</button>
      </div>
    </div></div>`;
    const done = TR.wireModal($("#obMask"), () => { TR.store.set("onboarded", true); rootM.innerHTML = ""; });
    $("#obFrom").addEventListener("click", () => TR.cityPicker(S.settings.from, (id) => {
      S.settings.from = id; TR.persist(); const b = $("#obFrom"); if (b) b.textContent = id;
    }));
    $("#obStart").addEventListener("click", () => { done(); if (TR.sfx) TR.sfx.pick(); });
    $("#obSkip").addEventListener("click", done);
    $("#obMask").addEventListener("click", (e) => { if (e.target.id === "obMask") done(); });
  };
})(window.TR);
