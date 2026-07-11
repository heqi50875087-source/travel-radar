/* =====================================================================
 * 旅行雷达 · 商业化模块 M1 —— js/biz.js
 * 出行转化链接层：TR.biz.links(city, ctx) + 订票区/行程卡渲染 + 合规页脚 + 极简埋点
 *
 * 依赖：js/biz-config.js 先加载（缺省时自动按空配置兜底，站点行为不变）
 * 约束：零依赖 / 零构建 / 可离线；Node 可 require（供 _dev/selftest.js 断言）
 * 颜色：只用站内 CSS 变量（--paper/--surface/--ink/--ink-2/--ink-3/--terra/
 *       --pine/--brass/--line/--shadow-*），不引入任何新色值
 * ===================================================================== */
(function (root) {
  'use strict';

  /* ============ 0. 配置读取（每次调用时读取，运行时可改） ============ */
  function cfg() {
    var c = root.TR_BIZ || {};
    var a = c.affiliate || {};
    return {
      ctrip:     String(a.ctrip   || '').trim(),
      tripcom:   String(a.tripcom || '').trim(),
      klook:     String(a.klook   || '').trim(),
      analytics: c.analytics || {},
      utmSource: String(c.utmSource || 'travel-radar'),
      siteBase:  String(c.siteBase || '')
    };
  }

  /* "123,456" / "123，456" / "123_456" / "123 456" → {a:'123', b:'456'} */
  function parsePair(raw) {
    if (!raw) return null;
    var p = String(raw).split(/[,\uFF0C_|\s]+/).filter(Boolean);
    if (!p[0]) return null;
    return { a: p[0], b: p[1] || '' };
  }

  /* ============ 1. URL / 日期工具 ============ */
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s).trim()); }

  function merge(a, b) {
    var o = {}, k;
    if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
    if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
    return o;
  }

  /* 追加查询参数；空值跳过；hash 路由链接把参数插在 # 之前 */
  function addParams(url, params) {
    var pairs = [], k;
    for (k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      var v = params[k];
      if (v === '' || v == null) continue;
      pairs.push(enc(k) + '=' + enc(v));
    }
    if (!pairs.length) return url;
    var i = url.indexOf('#');
    var base = i === -1 ? url : url.slice(0, i);
    var hash = i === -1 ? '' : url.slice(i);
    base += (base.indexOf('?') === -1 ? '?' : '&') + pairs.join('&');
    return base + hash;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function datePlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function lc(s) { return String(s || '').toLowerCase(); }

  /* Klook 域名：大陆访问 klook.com 不稳时可一行切到持牌站 'www.klook.cn' */
  var KLOOK_HOST = 'www.klook.com';

  /* ============ 2. 核心：TR.biz.links(city, ctx) ============
   * city：城市对象。字段做了兼容取值：
   *   名称 city.name || city.zh || city.title || city.id
   *   国际城标记 city.intl || city.international || city.abroad（truthy 即国际）
   *   可选数据钩子（补上即自动升级为更深的直达，见 M1 文档 §1）：
   *     city.tele（12306 电报码）、city.iata（机场三字码）、
   *     city.ctripCityId（携程城市 ID）、city.en（英文名，Klook/Trip.com 用）
   * ctx（全部可选）：
   *   { from:'出发地中文', fromTele:'出发站电报码', fromIata:'出发机场三字码',
   *     date:'YYYY-MM-DD', medium:'utm_medium 值（默认 city-links）' }
   * 返回：[{ label, url, tag }]，tag 为 '推广'（真实挂了联盟参数）或 null。
   * 所有 URL 一律追加 utm_source（及 utm_medium）。 */
  function links(city, ctx) {
    city = city || {}; ctx = ctx || {};
    var C = cfg();
    var name = String(city.name || city.zh || city.title || city.id || '').trim();
    var en   = String(city.en || city.enName || '').trim();
    var intl = !!(city.intl || city.international || city.abroad);
    var date = isDate(ctx.date) ? ctx.date : datePlus(1);
    var from = String(ctx.from || '').trim();
    var out  = [];

    var utm = { utm_source: C.utmSource, utm_medium: ctx.medium || 'city-links' };
    var ctripAff = parsePair(C.ctrip);    // 只挂 *.ctrip.com
    var tripAff  = parsePair(C.tripcom);  // 只挂 trip.com（两套账号，绝不混挂）

    function push(label, url, extra, tagged) {
      out.push({
        label: label,
        url: addParams(url, merge(utm, extra)),
        tag: tagged ? '\u63A8\u5E7F' /* 推广 */ : null
      });
    }
    function ctripP(extra) {
      return ctripAff
        ? merge(extra, { allianceid: ctripAff.a, sid: ctripAff.b, ouid: 'tr' })
        : (extra || null);
    }
    function tripP(extra) {
      return tripAff
        ? merge(extra, { Allianceid: tripAff.a, SID: tripAff.b })
        : (extra || null);
    }

    if (!intl) {
      /* ---------- 国内城 ---------- */

      /* ① 火车票 · 携程（可挂联盟）：知道出发地 → 车次列表直达；否则频道首页
       *    收录格式还带空的 rDate=&hubCityName=，为可选空参，此处省略（语义等价） */
      if (from && name) {
        push('\u706B\u8F66\u7968 \u00B7 \u643A\u7A0B', 'https://m.ctrip.com/webapp/train/list',
          ctripP({ ticketType: '0', dStation: from, aStation: name, dDate: date,
                   highSpeedOnly: '0' }),
          !!ctripAff);
      } else {
        push('\u706B\u8F66\u7968 \u00B7 \u643A\u7A0B', 'https://m.ctrip.com/html5/trains/',
          ctripP(null), !!ctripAff);
      }

      /* ② 12306 官方查票（信任锚点；不挂任何联盟参数）
       *    两侧都有电报码时升级为条件直达（fs/ts 需要 站名,电报码） */
      var p12306 = null;
      if (from && name && ctx.fromTele && city.tele) {
        p12306 = { linktypeid: 'dc', fs: from + ',' + ctx.fromTele,
                   ts: name + ',' + city.tele, date: date, flag: 'N,N,Y' };
      }
      push('12306 \u67E5\u7968', 'https://kyfw.12306.cn/otn/leftTicket/init', p12306, false);

      /* ③ 酒店 · 携程（可挂联盟）：有携程城市 ID → 列表直达；否则酒店搜索页 */
      if (city.ctripCityId) {
        push('\u9152\u5E97 \u00B7 \u643A\u7A0B', 'https://hotels.ctrip.com/hotels/list',
          ctripP({ city: city.ctripCityId, display: name,
                   optionId: city.ctripCityId, optionType: 'City' }),
          !!ctripAff);
      } else {
        push('\u9152\u5E97 \u00B7 \u643A\u7A0B', 'https://m.ctrip.com/webapp/hotels/hotelsearch/search',
          ctripP({ redirectSearch: '1' }), !!ctripAff);
      }

      /* ④ 门票·玩乐 · 去哪儿（关键词直达；分销挂参未查证，暂不带标，见 TODO） */
      push('\u95E8\u7968\u73A9\u4E50 \u00B7 \u53BB\u54EA\u513F', 'https://piao.qunar.com/ticket/list.htm',
        { keyword: name }, false);

      /* ⑤ 机票 · 携程（可挂联盟）：双方 IATA 齐 → 航线页直达；否则频道首页 */
      var flyUrl = 'https://m.ctrip.com/html5/flight/swift/index';
      if (ctx.fromIata && city.iata) {
        flyUrl = 'https://m.ctrip.com/html5/flight/' + lc(ctx.fromIata) + '-' + lc(city.iata) + '-day-1.html';
      }
      push('\u673A\u7968 \u00B7 \u643A\u7A0B', flyUrl, ctripP(null), !!ctripAff);

      /* ⑥ 地图 · 高德（延续改造前既有能力，官方 URI API） */
      push('\u5730\u56FE \u00B7 \u9AD8\u5FB7', 'https://uri.amap.com/search',
        { keyword: name, src: C.utmSource, callnative: '1' }, false);

    } else {
      /* ---------- 国际城（自动切换 Trip.com / Klook 组合） ---------- */

      /* ① 机票 · Trip.com：双方 IATA 齐 → 搜索结果直达；否则频道首页 */
      if (ctx.fromIata && city.iata) {
        push('\u673A\u7968 \u00B7 Trip.com', 'https://www.trip.com/flights/showfarefirst',
          tripP({ dcity: lc(ctx.fromIata), acity: lc(city.iata), ddate: date,
                  triptype: 'ow', 'class': 'y', quantity: '1',
                  locale: 'zh-CN', curr: 'CNY' }),
          !!tripAff);
      } else {
        push('\u673A\u7968 \u00B7 Trip.com', 'https://www.trip.com/flights/',
          tripP({ locale: 'zh-CN', curr: 'CNY' }), !!tripAff);
      }

      /* ② 酒店 · Trip.com（频道首页；keyword 直达强依赖 cityId，见 TODO） */
      push('\u9152\u5E97 \u00B7 Trip.com', 'https://www.trip.com/hotels/',
        tripP({ locale: 'zh-CN', curr: 'CNY' }), !!tripAff);

      /* ③ 玩乐 · Klook：关键词搜索直达（英文名优先，其次中文名） */
      var kp = { query: en || name };
      var kTag = false;
      if (C.klook) { kp.aid = C.klook; kTag = true; }
      push('\u73A9\u4E50 \u00B7 Klook', 'https://' + KLOOK_HOST + '/zh-CN/search/result/', kp, kTag);

      /* ④ 地图 · 高德（海外主要城市有底图与 POI，保持全站一致） */
      push('\u5730\u56FE \u00B7 \u9AD8\u5FB7', 'https://uri.amap.com/search',
        { keyword: name, src: C.utmSource, callnative: '1' }, false);
    }

    return out;
  }

  /* ============ 3. 极简埋点（缺憾 #4 的最小实现；默认彻底关闭） ============
   * 原则：provider/id 任一为空 → 不加载任何脚本、track() 是空操作、零外联。
   * 开启后也只发匿名事件（事件名 + 少量上下文），不含任何用户标识。 */
  var analyticsReady = false;
  function initAnalytics() {
    var a = cfg().analytics || {};
    if (analyticsReady || !a.provider || !a.id) return false;
    if (typeof document === 'undefined') return false;
    if (a.provider === 'baidu') {
      root._hmt = root._hmt || [];
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://hm.baidu.com/hm.js?' + encodeURIComponent(a.id);
      s.onerror = function () {};                    // 离线 / 被拦截时静默失败，不影响站点
      (document.head || document.documentElement).appendChild(s);
      analyticsReady = true;
      return true;
    }
    return false;
  }
  function track(name, data) {
    var a = cfg().analytics || {};
    if (!a.provider || !a.id) return;                // 默认关闭：什么都不做
    if (a.provider === 'baidu' && root._hmt) {
      try {
        root._hmt.push(['_trackEvent', 'biz', String(name || ''),
          JSON.stringify(data || {}).slice(0, 120)]);
      } catch (e) {}
    }
  }

  /* ============ 4. 合规文案（承诺升级，缺憾 #5 的门） ============ */
  var DISCLOSURE =
    '\u5E26\u300C\u63A8\u5E7F\u300D\u6807\u7684\u94FE\u63A5\u53EF\u80FD\u4E3A\u7AD9\u957F\u5E26\u6765' +
    '\u5C11\u91CF\u4F63\u91D1\uFF0C\u4EF7\u683C\u4E0E\u4F60\u76F4\u63A5\u641C\u5230\u7684\u4E00\u81F4\u3002' +
    '\u4F9D\u65E7\u4E0D\u8DDF\u8E2A\u4F60\u2014\u2014\u6570\u636E\u4E0D\u51FA\u4F60\u7684\u8BBE\u5907\u3002';
    /* 「带「推广」标的链接可能为站长带来少量佣金，价格与你直接搜到的一致。
        依旧不跟踪你——数据不出你的设备。」 */

  var FOOTER_TEXT =
    '\u672C\u7AD9\u79BB\u7EBF\u53EF\u7528\u3001\u4E0D\u8DDF\u8E2A\u4F60\u3002\u90E8\u5206\u51FA\u884C/' +
    '\u88C5\u5907\u94FE\u63A5\u5E26\u300C\u63A8\u5E7F\u300D\u5C0F\u6807\u2014\u2014\u7ECF\u5B83\u4EEC\u4E0B' +
    '\u5355\uFF0C\u7AD9\u957F\u53EF\u80FD\u5F97\u5230\u4E00\u70B9\u4F63\u91D1\uFF0C\u4F60\u7684\u4EF7\u683C' +
    '\u4E0D\u53D8\u3002\u7EDF\u8BA1\u9ED8\u8BA4\u5173\u95ED\uFF1B\u5373\u4FBF\u5F00\u542F\uFF0C\u4E5F\u53EA' +
    '\u662F\u533F\u540D\u805A\u5408\u3002';
    /* 「本站离线可用、不跟踪你。部分出行/装备链接带「推广」小标——经它们下单，
        站长可能得到一点佣金，你的价格不变。统计默认关闭；即便开启，也只是匿名聚合。」 */

  /* ============ 5. UI 渲染（浏览器专用；Node 下这些函数直接返回 null） ============ */
  var cssInjected = false;
  function injectCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var css = '' +
      '.trb-links{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}' +
      '.trb-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;' +
        'padding:7px 13px;border:1px solid var(--line);border-radius:999px;' +
        'background:var(--surface);color:var(--ink);font-size:13px;line-height:1.2;' +
        'text-decoration:none;-webkit-tap-highlight-color:transparent}' +
      '.trb-chip:active{transform:translateY(1px)}' +
      '.trb-tag{font-size:10px;color:var(--ink-3);border:1px solid var(--line);' +
        'border-radius:4px;padding:0 4px;line-height:15px;flex:none}' +
      '.trb-note{font-size:12px;color:var(--ink-3);margin:4px 0 0;line-height:1.6}' +
      '.trb-card{border:1px solid var(--line);border-radius:14px;background:var(--surface);' +
        'padding:14px 16px 12px;margin:16px 0;box-shadow:var(--shadow-1,none)}' +
      '.trb-card-title{margin:0 0 2px;font-size:15px;font-weight:600;color:var(--ink)}' +
      '.trb-card-sub{margin:0 0 6px;font-size:12px;color:var(--ink-2);line-height:1.6}' +
      '.trb-card-city{margin:10px 0 0;font-size:13px;font-weight:600;color:var(--ink-2)}' +
      '.trb-footer{font-size:12px;color:var(--ink-3);line-height:1.7;margin:12px 0 0;' +
        'padding-top:10px;border-top:1px solid var(--line)}';
    var el = document.createElement('style');
    el.id = 'trb-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }

  /* 订票区渲染：container 内追加一排链接 chip。
   * opts.noNote = true 时不渲染合规小字（供 tripCard 统一渲染一条）。
   * 返回 { el, hasAd }。 */
  function renderLinks(container, city, ctx, opts) {
    if (typeof document === 'undefined' || !container) return null;
    injectCSS();
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'trb-links';
    var hasAd = false;
    links(city, ctx).forEach(function (l) {
      var a = document.createElement('a');
      a.className = 'trb-chip';
      a.href = l.url;
      a.target = '_blank';
      a.rel = l.tag ? 'noopener nofollow sponsored' : 'noopener nofollow';
      var t = document.createElement('span');
      t.textContent = l.label;
      a.appendChild(t);
      if (l.tag) {
        hasAd = true;
        var tag = document.createElement('span');
        tag.className = 'trb-tag';
        tag.textContent = l.tag;                  // 「推广」，--ink-3 色，10px，不刺眼但清晰
        a.appendChild(tag);
      }
      a.addEventListener('click', function () {
        track('link_click', { label: l.label, city: String(city && (city.name || city.id) || '') });
      });
      wrap.appendChild(a);
    });
    container.appendChild(wrap);
    if (hasAd && !opts.noNote) {
      var note = document.createElement('p');
      note.className = 'trb-note';
      note.textContent = DISCLOSURE;
      container.appendChild(note);
    }
    return { el: wrap, hasAd: hasAd };
  }

  /* 行程页尾部「把行程变成订单」卡：cities 为行程涉及的城市对象数组（取前 4 个） */
  function tripCard(container, cities, ctx) {
    if (typeof document === 'undefined' || !container) return null;
    injectCSS();
    var card = document.createElement('section');
    card.className = 'trb-card';
    var h = document.createElement('h4');
    h.className = 'trb-card-title';
    h.textContent = '\u628A\u884C\u7A0B\u53D8\u6210\u8BA2\u5355';        // 把行程变成订单
    var sub = document.createElement('p');
    sub.className = 'trb-card-sub';
    sub.textContent = '\u8DEF\u7EBF\u5B9A\u4E86\u5C31\u522B\u62D6\uFF0C\u5148\u628A\u7968\u548C' +
      '\u5E8A\u843D\u5B9A\uFF0C\u5269\u4E0B\u7684\u4EA4\u7ED9\u597D\u5929\u6C14\u3002';
      // 路线定了就别拖，先把票和床落定，剩下的交给好天气。
    card.appendChild(h);
    card.appendChild(sub);
    var anyAd = false;
    (cities || []).slice(0, 4).forEach(function (c) {
      var row = document.createElement('div');
      var label = document.createElement('p');
      label.className = 'trb-card-city';
      label.textContent = String(c && (c.name || c.zh || c.id) || '');
      row.appendChild(label);
      card.appendChild(row);
      var r = renderLinks(row, c, merge(ctx, { medium: 'trip-card' }), { noNote: true });
      if (r && r.hasAd) anyAd = true;
    });
    if (anyAd) {
      var note = document.createElement('p');
      note.className = 'trb-note';
      note.textContent = DISCLOSURE;
      card.appendChild(note);
    }
    container.appendChild(card);
    return card;
  }

  /* 合规页脚一行字（「我的」页或全站页脚容器） */
  function renderFooterDisclosure(container) {
    if (typeof document === 'undefined' || !container) return null;
    injectCSS();
    var p = document.createElement('p');
    p.className = 'trb-footer';
    p.textContent = FOOTER_TEXT;
    container.appendChild(p);
    return p;
  }

  /* ============ 6. 挂载与导出 ============ */
  var api = {
    links: links,
    renderLinks: renderLinks,
    tripCard: tripCard,
    renderFooterDisclosure: renderFooterDisclosure,
    initAnalytics: initAnalytics,
    track: track,
    disclosure: DISCLOSURE,
    _util: { addParams: addParams, merge: merge, enc: enc,
             fmtDate: fmtDate, datePlus: datePlus, parsePair: parsePair }
  };

  root.TR = root.TR || {};
  root.TR.biz = merge(root.TR.biz, api);

  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* 浏览器加载即尝试初始化统计——配置为空时是空操作、零外联 */
  if (typeof document !== 'undefined') {
    try { initAnalytics(); } catch (e) {}
  }
})(typeof window !== 'undefined' ? window : globalThis);
