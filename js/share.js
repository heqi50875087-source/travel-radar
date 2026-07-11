/* =====================================================================
 * 旅行雷达 · 商业化模块 M3 —— js/share.js
 * 分享增长包：TR.share.card(城市) 离线生成纸墨分享卡；TR.share.cityUrl 城市直达链；
 *             TR.share.button 档案页分享按钮；长按保存 + 复制链接兜底。
 *
 * 加载顺序：js/biz-config.js → (js/biz.js 可选) → 本文件
 * 约束：零依赖 / 零构建 / 可离线；Node 可 require（纯函数部分供 selftest 断言）
 * 颜色：canvas 为导出图片，无法引用 CSS 变量，故内置一份与站内变量一一对应的
 *       明文色板（--paper/--surface/--ink/--terra/--pine/--brass 的既有值，非新色；
 *       --ink-2/--ink-3 以 --ink 加透明度推导，若站内有确切值请替换 PALETTE 两行）。
 *       分享图固定用浅色纸面（社交场景一致性），不随站内深色模式切换。
 * ===================================================================== */
(function (root) {
  'use strict';

  /* ============ 0. 配置 / 小工具 ============ */
  function cfg() {
    var c = root.TR_BIZ || {};
    return {
      utmSource: String(c.utmSource || 'travel-radar'),
      siteBase:  String(c.siteBase || '')
    };
  }
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s).trim()); }
  function track(n, d) {
    try { if (root.TR && root.TR.biz && root.TR.biz.track) root.TR.biz.track(n, d); } catch (e) {}
  }

  var DEFAULT_BASE = 'https://heqi50875087-source.github.io/travel-radar/';

  function siteBase() {
    var C = cfg();
    if (C.siteBase) return C.siteBase.replace(/\/*$/, '/');
    if (typeof location !== 'undefined' && location.origin && location.origin !== 'null') {
      return (location.origin + location.pathname).replace(/index\.html$/, '').replace(/\/*$/, '/');
    }
    return DEFAULT_BASE;
  }

  /* ============ 1. 城市直达链接 ============ */
  /* 路由形态唯一调整点：若站内城市页 hash 不是 #/city/{名}，改这一个函数即可 */
  function routeOf(id) { return '#/city/' + enc(id); }

  /* {站点根}#/city/{城市}?utm_source=…&utm_medium=share —— query 在 hash 内，见 §3.3 路由补丁 */
  function cityUrl(cityId, medium) {
    var C = cfg();
    return siteBase() + api.routeOf(cityId) +
      '?utm_source=' + enc(C.utmSource) + '&utm_medium=' + enc(medium || 'share');
  }

  /* ============ 2. 卡片数据适配（指挥官唯一必核对点：fieldMap） ============ */
  /* 把右侧候选字段名对齐 cities 数据的真实字段；命中第一个非空即用 */
  var fieldMap = {
    name:       ['name', 'zh', 'title', 'id'],
    sub:        ['sub', 'tagline', 'slogan', 'desc', 'summary'],
    highlights: ['highlights', 'highlights2', 'spots', 'sights', 'pois', 'see'],
    eats:       ['eats', 'food', 'foods', 'eat', 'mustEat', 'mustEat2', 'foodTags'],
    monthTip:   ['monthTip', 'nowTip', 'seasonTip', 'note', 'months']
  };

  function pick(city, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = city[keys[i]];
      if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
    }
    return null;
  }
  function toText(x) {
    if (x == null) return '';
    if (typeof x === 'string') return x;
    if (typeof x === 'object') return String(x.name || x.title || x.text || x.tip || '');
    return String(x);
  }
  function toList(x, n) {
    var arr = Array.isArray(x) ? x : (x ? [x] : []);
    var out = [];
    for (var i = 0; i < arr.length && out.length < n; i++) {
      var t = toText(arr[i]).trim();
      if (t) out.push(t);
    }
    return out;
  }

  function cardData(city) {
    city = city || {};
    var month = new Date().getMonth() + 1;
    var tip = pick(city, fieldMap.monthTip);
    if (Array.isArray(tip)) tip = tip[month - 1];                       // 12 项数组按 1 月起算
    else if (tip && typeof tip === 'object') tip = tip[month] || tip[String(month)] || '';
    return {
      name: toText(pick(city, fieldMap.name)) || '未知之城',
      sub: toText(pick(city, fieldMap.sub)),
      highlights: toList(pick(city, fieldMap.highlights), 3),           // 3 条精选看点
      eats: toList(pick(city, fieldMap.eats), 2),                       // 2 条必吃
      monthTip: toText(tip),                                            // 当月看点
      month: month
    };
  }

  /* 城市取数钩子：默认扫常见全局；指挥官把 TR.share.getCity 指到真实取数函数即可（1 行） */
  function defaultGetCity(id) {
    var pools = [root.CITIES, root.cities, root.CITY_DATA, root.cityData,
                 root.TR && root.TR.cities];
    for (var i = 0; i < pools.length; i++) {
      var p = pools[i];
      if (!p) continue;
      if (Array.isArray(p)) {
        for (var j = 0; j < p.length; j++) {
          var c = p[j];
          if (c && (c.id === id || c.name === id || c.zh === id)) return c;
        }
      } else if (typeof p === 'object' && p[id]) {
        return p[id];
      }
    }
    return null;
  }

  /* ============ 3. 纸墨绘制 ============ */
  var PALETTE = {
    paper: '#F6F1E9', surface: '#FCFAF5', ink: '#211C16',
    ink2: 'rgba(33,28,22,.74)',   // ≈ --ink-2（若站内有确切值请替换本行）
    ink3: 'rgba(33,28,22,.52)',   // ≈ --ink-3（同上）
    terra: '#C75C3D', pine: '#2F4A3F', brass: '#B08A4F'
  };
  var FONT_SERIF = '"Songti SC","STSong","Noto Serif SC","SimSun",serif';
  var FONT_SANS  = '-apple-system,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif';

  /* 文本折行（纯函数，measure 注入，Node 可断言）：measure(str)→像素宽 */
  function wrapText(text, maxWidth, measure) {
    var lines = [], cur = '';
    var chars = String(text || '').split('');
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === '\n') { lines.push(cur); cur = ''; continue; }
      if (cur && measure(cur + ch) > maxWidth) { lines.push(cur); cur = (ch === ' ' ? '' : ch); }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* 小雷达纹样（canvas 重绘版）。
   * 【替换点】想用站内 SVG 原 logo：把函数体换成
   *   var p = new Path2D('<现有 SVG 的 d 路径>');
   *   ctx.save(); ctx.translate(x-r, y-r); ctx.scale(2*r/原viewBox宽, 2*r/原viewBox高);
   *   ctx.strokeStyle = color; ctx.stroke(p); ctx.restore(); */
  function drawRadar(g, x, y, r, color) {
    g.save();
    g.strokeStyle = color; g.fillStyle = color;
    g.lineWidth = Math.max(2, r * 0.06);
    [1, 0.66, 0.33].forEach(function (k) {
      g.beginPath(); g.arc(x, y, r * k, 0, Math.PI * 2); g.stroke();
    });
    g.globalAlpha = 0.16;                                    // 扫描扇面
    g.beginPath(); g.moveTo(x, y);
    g.arc(x, y, r, -Math.PI / 2, -Math.PI / 6); g.closePath(); g.fill();
    g.globalAlpha = 1;
    g.beginPath(); g.moveTo(x, y);                           // 扫描线
    g.lineTo(x + r * Math.cos(-Math.PI / 6), y + r * Math.sin(-Math.PI / 6)); g.stroke();
    g.beginPath();                                           // 光点
    g.arc(x + r * 0.55 * Math.cos(-Math.PI / 3.2),
          y + r * 0.55 * Math.sin(-Math.PI / 3.2),
          Math.max(3, r * 0.09), 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawCard(canvas, d, displayUrl) {
    var W = 1080, H = 1440;
    canvas.width = W; canvas.height = H;
    var g = canvas.getContext('2d');

    /* 纸面 + 黄铜双线框 */
    g.fillStyle = PALETTE.paper; g.fillRect(0, 0, W, H);
    g.strokeStyle = PALETTE.brass;
    g.lineWidth = 3;   g.strokeRect(36, 36, W - 72, H - 72);
    g.lineWidth = 1.2; g.strokeRect(52, 52, W - 104, H - 104);

    var x = 96, maxW = W - 192, y = 200;
    function measurer() { return function (s) { return g.measureText(s).width; }; }

    /* 城市名（衬线大字）+ 速览副标题 */
    g.textBaseline = 'alphabetic';
    g.fillStyle = PALETTE.ink;
    g.font = '600 104px ' + FONT_SERIF;
    g.fillText(d.name, x, y);
    if (d.sub) {
      g.font = '400 36px ' + FONT_SANS; g.fillStyle = PALETTE.ink2;
      wrapText(d.sub, maxW, measurer()).slice(0, 2).forEach(function (ln) {
        y += 56; g.fillText(ln, x, y);
      });
    }

    /* 黄铜分隔线 + 小菱形 */
    y += 56;
    g.strokeStyle = PALETTE.brass; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(W - 96, y); g.stroke();
    g.save(); g.translate(W / 2, y); g.rotate(Math.PI / 4);
    g.fillStyle = PALETTE.paper; g.fillRect(-9, -9, 18, 18); g.strokeRect(-9, -9, 18, 18);
    g.restore();
    y += 78;

    /* 小节：此刻看点（terra）/ 必吃两样（pine） */
    function section(label, color, items) {
      if (!items.length) return;
      g.font = '600 30px ' + FONT_SANS; g.fillStyle = color;
      g.fillText(label, x, y);
      g.font = '400 40px ' + FONT_SANS; g.fillStyle = PALETTE.ink;
      items.forEach(function (t) {
        wrapText('· ' + t, maxW, measurer()).slice(0, 2).forEach(function (ln, i) {
          y += 62; g.fillText(i ? '　' + ln : ln, x, y);
        });
      });
      y += 64;
    }
    section('此 刻 看 点', PALETTE.terra, d.highlights);
    section('必 吃 两 样', PALETTE.pine, d.eats);

    /* 当月看点盒（surface 底 + terra 侧条）；版面吃紧时自动省略，绝不溢出 */
    if (d.monthTip && y <= H - 380) {
      var tipFont = '400 34px ' + FONT_SANS;
      g.font = tipFont;
      var tipLines = wrapText(d.monthTip, maxW - 88, measurer()).slice(0, 3);
      var boxH = 66 + tipLines.length * 50;
      g.fillStyle = PALETTE.surface;
      roundRect(g, x - 8, y - 22, maxW + 16, boxH, 14); g.fill();
      g.fillStyle = PALETTE.terra; g.fillRect(x - 8, y - 22, 6, boxH);
      g.font = '600 26px ' + FONT_SANS; g.fillStyle = PALETTE.ink3;
      g.fillText(d.month + ' 月看点', x + 26, y + 14);
      g.font = tipFont; g.fillStyle = PALETTE.ink;
      var ty = y + 14;
      tipLines.forEach(function (ln) { ty += 50; g.fillText(ln, x + 26, ty); });
    }

    /* 页脚：直达地址 + 品牌一行 + 雷达纹样 */
    var fy = H - 128;
    g.strokeStyle = PALETTE.brass; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, fy - 46); g.lineTo(W - 96, fy - 46); g.stroke();
    g.fillStyle = PALETTE.ink2;
    var uf = 28;
    g.font = '400 ' + uf + 'px ' + FONT_SANS;
    while (uf > 20 && g.measureText(displayUrl).width > maxW - 130) {   // 自适应缩字，防长域名溢出
      uf -= 2; g.font = '400 ' + uf + 'px ' + FONT_SANS;
    }
    g.fillText(displayUrl, x, fy);
    g.font = '400 26px ' + FONT_SANS; g.fillStyle = PALETTE.ink3;
    g.fillText('旅行雷达 · 一个人的旅行参谋部', x, fy + 42);
    drawRadar(g, W - 152, fy - 6, 46, PALETTE.brass);
    return canvas;
  }

  /* ============ 4. 分享流程 ============ */
  var cssDone = false;
  function injectCSS() {
    if (cssDone || typeof document === 'undefined') return;
    cssDone = true;
    var css = '' +
      '.trs-btn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:7px 13px;' +
        'border:1px solid var(--line);border-radius:999px;background:var(--surface);' +
        'color:var(--ink);font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.trs-btn:active{transform:translateY(1px)}' +
      /* 遮罩 = --ink(#211C16) 的 50% 透明，非新色 */
      '.trs-mask{position:fixed;inset:0;background:rgba(33,28,22,.5);z-index:1000;' +
        'display:flex;align-items:center;justify-content:center;padding:20px}' +
      '.trs-box{max-width:min(420px,92vw);width:100%;max-height:92vh;overflow:auto;' +
        'background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:14px}' +
      '.trs-box img{display:block;width:100%;border:1px solid var(--line);border-radius:10px}' +
      '.trs-cap{margin:10px 0 0;font-size:12px;color:var(--ink-3);text-align:center;line-height:1.7}' +
      '.trs-actions{display:flex;gap:8px;margin-top:10px}' +
      '.trs-actions button{flex:1;min-height:42px;padding:10px;border:1px solid var(--line);' +
        'background:var(--surface);color:var(--ink-2);border-radius:10px;font-size:14px;cursor:pointer}';
    var el = document.createElement('style');
    el.id = 'trs-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }

  function closeOverlay() {
    var el = document.querySelector('.trs-mask');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function copyText(text, btn) {
    function ok() { if (btn) btn.textContent = '已复制 ✓'; }
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        ok();
      } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, legacy);
    } else legacy();
  }

  /* 长按保存浮层（navigator.share 不可用/被拒时的兜底） */
  function overlay(canvas, d, url) {
    injectCSS();
    closeOverlay();
    var mask = document.createElement('div');
    mask.className = 'trs-mask';
    mask.addEventListener('click', function (ev) { if (ev.target === mask) closeOverlay(); });

    var box = document.createElement('div');
    box.className = 'trs-box';
    var img = document.createElement('img');
    img.alt = d.name + ' · 旅行雷达分享卡';
    img.src = canvas.toDataURL('image/png');
    var cap = document.createElement('p');
    cap.className = 'trs-cap';
    cap.textContent = '长按图片保存 → 发朋友圈 / 小红书';
    var actions = document.createElement('div');
    actions.className = 'trs-actions';
    var bCopy = document.createElement('button');
    bCopy.type = 'button';
    bCopy.textContent = '复制城市链接';
    bCopy.addEventListener('click', function () { copyText(url, bCopy); });
    var bClose = document.createElement('button');
    bClose.type = 'button';
    bClose.textContent = '关闭';
    bClose.addEventListener('click', closeOverlay);
    actions.appendChild(bCopy);
    actions.appendChild(bClose);
    box.appendChild(img);
    box.appendChild(cap);
    box.appendChild(actions);
    mask.appendChild(box);
    document.body.appendChild(mask);
  }

  /* 核心：TR.share.card(城市对象 或 城市ID字符串)
   * 浏览器专用（canvas）。返回 Promise<{how:'native'|'overlay', url}>。 */
  function card(cityOrId) {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('TR.share.card 需要浏览器环境（canvas）'));
    }
    var city = (typeof cityOrId === 'string')
      ? (api.getCity(cityOrId) || { name: cityOrId })
      : (cityOrId || {});
    var d = cardData(city);
    var id = String(city.id || city.name || city.zh || d.name);
    var url = cityUrl(id, 'share');                                   // 带 utm 的完整直达链
    var displayUrl = siteBase().replace(/^https?:\/\//, '') + '#/city/' + d.name;  // 卡面可读形式

    var canvas = document.createElement('canvas');
    drawCard(canvas, d, displayUrl);
    track('share_card', { city: d.name });

    return new Promise(function (resolve) {
      var shareText = d.name + ' 该怎么玩、何时去、吃什么——旅行雷达帮你排好了';
      function fallback() { overlay(canvas, d, url); resolve({ how: 'overlay', url: url }); }
      canvas.toBlob(function (blob) {
        if (blob && typeof navigator !== 'undefined' && navigator.canShare &&
            typeof File !== 'undefined') {
          try {
            var file = new File([blob], d.name + '-旅行雷达.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              navigator.share({ files: [file], title: d.name + ' · 旅行雷达',
                                text: shareText, url: url })
                .then(function () { resolve({ how: 'native', url: url }); })
                .catch(fallback);                                     // 用户取消/系统拒绝 → 浮层兜底
              return;
            }
          } catch (e) {}
        }
        fallback();
      }, 'image/png');
    });
  }

  /* 档案页「分享这座城」按钮（1 行集成） */
  function button(container, city) {
    if (typeof document === 'undefined' || !container) return null;
    injectCSS();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'trs-btn';
    b.textContent = '分享这座城';
    b.addEventListener('click', function () { card(city); });
    container.appendChild(b);
    return b;
  }

  /* ============ 5. 挂载与导出 ============ */
  var api = {
    card: card,
    button: button,
    cityUrl: cityUrl,
    cardData: cardData,        // 亦供断言
    fieldMap: fieldMap,        // 指挥官核对字段映射的唯一入口
    getCity: defaultGetCity,   // 指挥官可覆写为真实取数函数（1 行）
    routeOf: routeOf,          // 城市页 hash 形态不同时覆写（1 行）
    _wrapText: wrapText,       // 纯函数，供断言
    _drawCard: drawCard,       // 供 _dev/og-cover.html 复用风格时参考
    _palette: PALETTE
  };
  root.TR = root.TR || {};
  root.TR.share = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
