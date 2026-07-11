/* =====================================================================
 * 旅行雷达 · 城市之声 —— js/city-sound.js
 * 一城一歌：按城市气质，深链到网易云 / QQ 音乐「正版搜索播放」。
 *
 * 版权红线：绝不打包任何音频文件、绝不内嵌播放器 iframe（那会破离线/零外联黄金线）。
 *           只做「歌名 + 歌手」搜索深链——点一下跳持牌平台正版播放，词搜不锁 songId、永不失效。
 * 约束：零依赖 / 零构建 / 可离线；Node 可 require（供 _dev/selftest.js 断言）。
 * 颜色：只用站内 CSS 变量，不引入新色值。
 * ===================================================================== */
(function (root) {
  'use strict';

  function enc(s) { return encodeURIComponent(String(s == null ? '' : s).trim()); }

  /* 搜索深链：词搜最稳（歌手可能换版本、歌单会下架，但「歌名 歌手」永远搜得到） */
  function netease(song, artist) {
    return 'https://music.163.com/#/search/m/?s=' + enc(song + ' ' + (artist || '')) + '&type=1';
  }
  function qqmusic(song, artist) {
    return 'https://y.qq.com/n/ryqq/search?w=' + enc(song + ' ' + (artist || '')) + '&t=song';
  }

  /* ============ 全站主题曲：陈绮贞《旅行的意义》 ============ */
  var ANTHEM = { song: '旅行的意义', artist: '陈绮贞',
    why: '“你离开我，就是旅行的意义”——每一次出发，都是给自己的答案。' };

  /* ============ 一城一歌 · 手挑签名曲（确有其曲、耳熟能详、搜得到） ============
     只收「一听到就想起这座城」的；其余城市走 mood 兜底，绝不硬凑不存在的歌。 */
  var SONGS = {
    '成都':   { song: '成都',            artist: '赵雷',       mood: '市井', why: '“和我在成都的街头走一走”，民谣把烟火气唱成了慢板。' },
    '西安':   { song: '西安人的歌',      artist: '范炜',       mood: '市井', why: '一口秦腔陕普，肉夹馍与钟楼都在词里了。' },
    '北京':   { song: '北京 北京',        artist: '汪峰',       mood: '苍凉', why: '“如果有一天我不得不离去”，写给每个在北京奔波的人。' },
    '上海':   { song: '夜上海',          artist: '周璇',       mood: '高雅', why: '老唱片里的十里洋场，梧桐与霓虹的旧梦。' },
    '天津':   { song: '大天津',          artist: '李亮节',     mood: '市井', why: '天津话唱的市井热闹，卫嘴子的自来乐。' },
    '重庆':   { song: '火锅底料',        artist: 'GAI周延',    mood: '市井', why: '8D 魔幻山城，火锅麻辣与江湖气一锅滚烫。' },
    '长沙':   { song: '浏阳河',          artist: '李谷一',     mood: '高雅', why: '“浏阳河，弯过了几道弯”，湘江边的经典民谣。' },
    '武汉':   { song: '汉阳门花园',      artist: '冯翔',       mood: '市井', why: '“冬天腊梅花，夏天石榴花”，一口武汉话的江城旧忆。' },
    '大理':   { song: '去大理',          artist: '郝云',       mood: '轻松', why: '“是不是对生活不太满意，很久没有笑过又不知为何”——那就去大理。' },
    '丽江':   { song: '一瞬间',          artist: '丽江小倩',    mood: '轻松', why: '古城酒吧里飘出的旋律，一瞬间就把人留住。' },
    '拉萨':   { song: '回到拉萨',        artist: '郑钧',       mood: '雄伟', why: '“回到我阔别已久的家”，布达拉宫下的信仰与辽阔。' },
    '厦门':   { song: '鼓浪屿之波',      artist: '', mood: '海滨', why: '琴岛涛声，海风里的老情歌。' },
    '青岛':   { song: '大海',            artist: '张雨生',      mood: '海滨', why: '红瓦绿树，碧海蓝天，配一首关于海的经典。' },
    '杭州':   { song: '梁祝',            artist: '', mood: '高雅', why: '小提琴协奏曲里的江南，西湖烟雨与化蝶传说。' },
    '苏州':   { song: '茉莉花',          artist: '', mood: '高雅', why: '江苏民歌的婉转，园林与评弹的底色。' },
    '扬州':   { song: '烟花三月',        artist: '张也',       mood: '高雅', why: '“烟花三月下扬州”，瘦西湖畔的诗意江南。' },
    '桂林':   { song: '我想去桂林',      artist: '', mood: '轻松', why: '“我想去桂林呀我想去桂林”，山水甲天下的向往。' },
    '三亚':   { song: '请到天涯海角来',   artist: '', mood: '海滨', why: '“这里四季春常在”，天涯海角的椰风海韵。' },
    '哈尔滨': { song: '太阳岛上',        artist: '郑绪岚',     mood: '轻松', why: '“明媚的夏日里”，冰城夏都的松花江畔。' },
    '泉州':   { song: '爱拼才会赢',      artist: '叶启田',      mood: '市井', why: '闽南人的海洋气魄，半城烟火半城仙。' },
    '喀什':   { song: '花儿为什么这样红', artist: '',           mood: '苍凉', why: '《冰山上的来客》插曲，帕米尔高原的深情。' },
    '敦煌':   { song: '月牙泉',          artist: '田震',       mood: '苍凉', why: '月牙泉就在敦煌城外，一泓清泉守着千年大漠。' },
    '平遥':   { song: '人说山西好风光',   artist: '', mood: '高雅', why: '晋商古城的沉厚，一曲唱尽表里山河。' },
    '青海湖': { song: '在那遥远的地方',   artist: '王洛宾',      mood: '雄伟', why: '“好像红太阳”，高原湖畔的经典情歌。' },
    '西双版纳': { song: '月光下的凤尾竹', artist: '', mood: '轻松', why: '葫芦丝的傣乡月色，热带雨林的温柔。' }
  };

  /* ============ mood 兜底曲：没有专属签名曲时，按气质配一首（确有其曲） ============ */
  /* 兜底曲刻意「不锁地理」——只传气质，免得浙南山水被配上《青藏高原》。
     具体的地方专属曲（青藏高原/西海情歌等）只留给真正对得上的签名城。 */
  var MOOD = {
    '雄伟': { song: '沧海一声笑', artist: '黄霑',   why: '一曲笑傲江湖，唱尽大好河山的辽阔苍茫。' },
    '苍凉': { song: '南山南',     artist: '马頔',   why: '“南山南，北秋悲”，辽远处的一点惆怅。' },
    '海滨': { song: '浪花一朵朵', artist: '任贤齐', why: '有海的地方，就配一首轻快的浪花。' },
    '高雅': { song: '渔舟唱晚',   artist: '',       why: '古筝里的水墨中国，配得上园林与古都。' },
    '市井': { song: '阿珍爱上了阿强', artist: '五条人', why: '菜市场与老街里的市井浪漫。' },
    '轻松': ANTHEM  // 兜底即主题曲《旅行的意义》
  };

  /* ============ 从城市数据派生气质 mood（tagline/region/highlights 关键词） ============
     顺序有讲究：先判专门气质（苍凉/雄伟/海滨），再判泛气质（高雅/市井），最后轻松兜底。 */
  var RULES = [
    ['苍凉', /大漠|沙漠|戈壁|胡杨|丝路|丝绸之路|楼兰|边塞|荒|孤烟|雅丹|盐湖|无人区/],
    ['雄伟', /雪山|高原|高山|名山|五岳|珠峰|冰川|峡谷|雄|险峻|海拔|峰林|天山|昆仑|梯田|大川/],
    ['海滨', /海岛|海滨|海湾|沙滩|银滩|渔港|潜水|赶海|群岛|滨海|[^。]海鲜/],
    ['高雅', /园林|古都|文人|宋韵|六朝|书画|昆曲|评弹|瓷都|茶香|雅|琴|禅|水乡|古典/],
    ['市井', /烟火|市井|老街|老城|夜市|火锅|串串|早茶|市集|巷|码头|工业|江湖/]
  ];
  function moodOf(city) {
    if (!city) return '轻松';
    var text = [city.tagline, city.region, (city.highlights || []).join(' '),
                (city.foodTags || []).join(' '), (city.seasons || []).join(' ')].join(' ');
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(text)) return RULES[i][0];
    return '轻松';
  }

  /* ============ 取一城的配歌：专属签名曲优先，否则按 mood 兜底 ============ */
  function pick(city) {
    var id = city && (city.id || city.name || city);
    var s = SONGS[id];
    var mood = (s && s.mood) || moodOf(city);
    if (!s) { var m = MOOD[mood] || MOOD['轻松']; s = { song: m.song, artist: m.artist, why: m.why, mood: mood, fallback: true }; }
    return {
      song: s.song, artist: s.artist || '', why: s.why, mood: mood, fallback: !!s.fallback,
      isAnthem: !!s.fallback && s.song === ANTHEM.song,
      netease: netease(s.song, s.artist), qq: qqmusic(s.song, s.artist)
    };
  }

  var MOOD_ICON = { '雄伟': '🏔', '苍凉': '🏜', '海滨': '🌊', '高雅': '🎐', '市井': '🏮', '轻松': '🎈' };

  /* ============ 渲染「城市之声」卡片（纸墨风；深链正版播放） ============ */
  function card(city) {
    var p = pick(city);
    var ic = MOOD_ICON[p.mood] || '🎵';
    var el = document.createElement('section');
    el.className = 'card block city-sound rv';
    el.innerHTML =
      '<h3><span class="b-ico">🎧</span>城市之声 <span class="b-count">' + ic + ' ' + p.mood + '</span></h3>' +
      '<div class="cs-body">' +
        '<div class="cs-disc" aria-hidden="true"><span class="cs-needle"></span></div>' +
        '<div class="cs-info">' +
          '<div class="cs-song">' + esc(p.song) + (p.artist ? '<span class="cs-artist">' + esc(p.artist) + '</span>' : '') + '</div>' +
          '<p class="cs-why">' + esc(p.why) + '</p>' +
          '<div class="cs-acts">' +
            '<a class="btn terra sm" target="_blank" rel="noopener" href="' + p.netease + '">▶ 网易云听</a>' +
            '<a class="cs-alt" target="_blank" rel="noopener" href="' + p.qq + '">QQ 音乐</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="desc cs-foot">' + (p.isAnthem ? '旅行雷达主题曲 · 哪座城都配它' : p.fallback ? '按这座城的气质配的' : '这座城的签名曲') +
        ' · 跳转正版平台播放，站内不留任何音频' + '</p>';
    return el;
  }

  /* esc：浏览器用 TR.esc，Node 用本地兜底（selftest 只测纯函数，不测 card） */
  function esc(s) {
    if (root.TR && root.TR.esc) return root.TR.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  var api = { netease: netease, qq: qqmusic, moodOf: moodOf, pick: pick, card: card,
              ANTHEM: ANTHEM, SONGS: SONGS, MOOD: MOOD };
  root.TR = root.TR || {};
  root.TR.sound = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
