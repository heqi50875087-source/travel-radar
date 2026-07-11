/* =====================================================================
 * 旅行雷达 · 商业化模块 M2 —— js/biz-gear.js
 * 装备清单带货：TR.biz.gearLink(itemName) + 「购」按钮 + 底部比价选单
 *
 * 加载顺序：js/biz-config.js → js/biz.js → 本文件
 * 约束：零依赖 / 可离线；Node 可 require（先 require biz.js）
 * ===================================================================== */
(function (root) {
  'use strict';

  var biz = root.TR && root.TR.biz;
  if (!biz || !biz._util) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[biz-gear] \u9700\u5148\u52A0\u8F7D js/biz.js'); // 需先加载 js/biz.js
    }
    return;
  }
  var U = biz._util;

  function cfgGear() {
    var c = root.TR_BIZ || {};
    var a = c.affiliate || {};
    return {
      taobao: String(a.taobao || '').trim(),
      jd: String(a.jd || '').trim(),   // 占位：京东联盟需后台转链，见 M2 文档 §1.1
      utmSource: String(c.utmSource || 'travel-radar')
    };
  }

  /* ---------- 关键词净化：去括号注释/清单符号/勾选痕迹，压空白，截 24 字 ---------- */
  function cleanKeyword(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/[\uFF08(\u3010\[][^\uFF08\uFF09()\u3010\u3011\[\]]*[)\uFF09\]\u3011]/g, ' '); // （…）(…)【…】[…]
    s = s.replace(/[\u2714\u2713\u2611\u2610\u25A1\u25A2\u00B7\u2022\u2219\u25E6\-\u2013\u2014*+>]/g, ' ');
    s = s.replace(/\u8D2D$/, ' ');            // 防御：万一取到了带「购」按钮字样的文本
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 24) s = s.slice(0, 24);
    return s;
  }

  /* ---------- 核心：TR.biz.gearLink(itemName) ----------
   * 返回 [{label:'京东'|'淘宝', url, tag:'推广'|null}]，京东主、淘宝备。
   * 所有 URL 追加 utm_source / utm_medium=gear。 */
  function gearLink(itemName) {
    var kw = cleanKeyword(itemName);
    var C = cfgGear();
    var utm = { utm_source: C.utmSource, utm_medium: 'gear' };
    var out = [];

    /* 京东：M 站搜索直达；联盟须后台转链，无法前端拼参 → 暂不带标（见 M2 §1.1 / §6） */
    out.push({
      label: '\u4EAC\u4E1C', // 京东
      url: U.addParams('https://so.m.jd.com/ware/search.action', U.merge({ keyword: kw }, utm)),
      tag: null
    });

    /* 淘宝：uland 搜索落地页（免登录）；填了阿里妈妈 PID 则挂 refpid 并标「推广」 */
    var tp = U.merge({ keyword: kw }, utm);
    var tag = null;
    if (C.taobao) { tp.refpid = C.taobao; tag = '\u63A8\u5E7F'; } // 推广
    out.push({
      label: '\u6DD8\u5B9D', // 淘宝
      url: U.addParams('https://uland.taobao.com/sem/tbsearch', tp),
      tag: tag
    });

    return out;
  }

  /* ---------- UI：低调「购」小按钮（--brass 色）+ 底部比价选单 ---------- */
  var cssDone = false;
  function injectCSS() {
    if (cssDone || typeof document === 'undefined') return;
    cssDone = true;
    var css = '' +
      '.trb-buy{margin-left:8px;flex:none;vertical-align:middle;border:1px solid var(--brass);' +
        'color:var(--brass);background:transparent;border-radius:6px;font-size:11px;' +
        'line-height:1;padding:3px 6px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.trb-buy:active{opacity:.65}' +
      /* 遮罩色 = --ink(#211C16) 的 35% 透明，非新色 */
      '.trb-sheet-mask{position:fixed;inset:0;background:rgba(33,28,22,.35);z-index:998}' +
      '.trb-sheet{position:fixed;left:0;right:0;bottom:0;z-index:999;background:var(--surface);' +
        'border-radius:16px 16px 0 0;border-top:1px solid var(--line);' +
        'padding:16px 16px calc(14px + env(safe-area-inset-bottom,0px))}' +
      '.trb-sheet h5{margin:0 0 2px;font-size:15px;color:var(--ink)}' +
      '.trb-sheet .trb-sheet-tip{margin:0 0 8px;font-size:12px;color:var(--ink-3);line-height:1.6}' +
      '.trb-sheet a{display:flex;align-items:center;justify-content:space-between;gap:8px;' +
        'min-height:46px;padding:12px 4px;border-top:1px solid var(--line);color:var(--ink);' +
        'font-size:14px;text-decoration:none;-webkit-tap-highlight-color:transparent}' +
      '.trb-sheet .trb-tag{font-size:10px;color:var(--ink-3);border:1px solid var(--line);' +
        'border-radius:4px;padding:0 4px;line-height:15px;flex:none}' +
      '.trb-sheet-close{display:block;width:100%;margin-top:10px;padding:11px;' +
        'border:1px solid var(--line);background:transparent;color:var(--ink-2);' +
        'border-radius:10px;font-size:14px;cursor:pointer}';
    var el = document.createElement('style');
    el.id = 'trb-gear-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }

  function closeSheet() {
    ['.trb-sheet-mask', '.trb-sheet'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function openSheet(itemName) {
    if (typeof document === 'undefined') return;
    injectCSS();
    closeSheet();
    var kw = cleanKeyword(itemName);
    var mask = document.createElement('div');
    mask.className = 'trb-sheet-mask';
    mask.addEventListener('click', closeSheet);

    var sheet = document.createElement('div');
    sheet.className = 'trb-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');

    var h = document.createElement('h5');
    h.textContent = '\u641C\u540C\u6B3E\u6BD4\u4EF7 \u00B7 ' + kw;   // 搜同款比价 ·
    var tip = document.createElement('p');
    tip.className = 'trb-sheet-tip';
    tip.textContent = '\u53EA\u662F\u5E2E\u4F60\u628A\u5173\u952E\u8BCD\u641C\u51FA\u6765\uFF0C' +
      '\u8D27\u6BD4\u4E09\u5BB6\u518D\u4E0B\u624B\u3002';            // 只是帮你把关键词搜出来，货比三家再下手。
    sheet.appendChild(h);
    sheet.appendChild(tip);

    gearLink(itemName).forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.url;
      a.target = '_blank';
      a.rel = l.tag ? 'noopener nofollow sponsored' : 'noopener nofollow';
      var s = document.createElement('span');
      s.textContent = '\u53BB' + l.label + '\u641C\u300C' + kw + '\u300D'; // 去{店}搜「{词}」
      a.appendChild(s);
      if (l.tag) {
        var t = document.createElement('span');
        t.className = 'trb-tag';
        t.textContent = l.tag;
        a.appendChild(t);
      }
      a.addEventListener('click', function () {
        biz.track('gear_click', { shop: l.label, kw: kw });
        closeSheet();
      });
      sheet.appendChild(a);
    });

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'trb-sheet-close';
    close.textContent = '\u5148\u4E0D\u4E70';                        // 先不买
    close.addEventListener('click', closeSheet);
    sheet.appendChild(close);

    document.body.appendChild(mask);
    document.body.appendChild(sheet);
  }

  /* ---------- 给装备清单每项加「购」按钮 ----------
   * rootEl：清单容器
   * opts.itemSelector：清单项选择器，默认 'li'
   * opts.getName(el)：取装备名，默认 el.textContent
   * 特性：幂等（已加过的跳过，清单重渲染后再调一次即可）；
   *       名称在装点时捕获（此刻按钮还没进 DOM，textContent 是干净的）；
   *       按钮 click 里 stopPropagation + preventDefault，不碰原有勾选交互。
   * 返回：本次新加按钮数。 */
  function decorateGearList(rootEl, opts) {
    if (typeof document === 'undefined' || !rootEl) return 0;
    injectCSS();
    opts = opts || {};
    var sel = opts.itemSelector || 'li';
    var getName = opts.getName || function (el) { return el.textContent || ''; };
    var n = 0;
    Array.prototype.forEach.call(rootEl.querySelectorAll(sel), function (el) {
      if (el.querySelector('.trb-buy')) return;      // 幂等
      var rawName = String(getName(el) || '');
      var kw = cleanKeyword(rawName);
      if (!kw) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'trb-buy';
      btn.textContent = '\u8D2D';                    // 购
      btn.title = '\u641C\u540C\u6B3E\u6BD4\u4EF7\uFF1A\u4EAC\u4E1C / \u6DD8\u5B9D';
      btn.setAttribute('aria-label', '\u641C\u300C' + kw + '\u300D\u6BD4\u4EF7');
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();                        // 不触发清单项自身的勾选
        ev.preventDefault();
        openSheet(rawName);                          // 用装点时捕获的原始名，不受按钮文字污染
      });
      el.appendChild(btn);
      n++;
    });
    return n;
  }

  /* ---------- 挂载与导出 ---------- */
  var api = {
    gearLink: gearLink,
    cleanKeyword: cleanKeyword,
    decorateGearList: decorateGearList,
    openGearSheet: openSheet
  };
  root.TR.biz.gearLink = gearLink;
  root.TR.biz.cleanKeyword = cleanKeyword;
  root.TR.biz.decorateGearList = decorateGearList;
  root.TR.biz.openGearSheet = openSheet;

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
