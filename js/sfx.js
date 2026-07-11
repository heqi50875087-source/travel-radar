/* =====================================================================
 * 旅行雷达 · 音效 —— js/sfx.js
 * Web Audio 合成，零文件、零外联、可离线；只在"发现/收藏/点亮/存"等愉悦时刻响，克制不吵。
 * 受 settings.sound 开关控制；浏览器自动播放策略下，首次用户点击时唤醒 AudioContext。
 * ===================================================================== */
(function (root) {
  'use strict';
  var actx = null, on = false;
  function ctx() {
    if (!actx) { try { actx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  // 一个柔和的木质音：三角波 + 快速指数衰减（像轻敲实木，不刺耳）
  function tone(freq, when, dur, peak) {
    var c = actx; if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak || 0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + (dur || 0.2) + 0.03);
  }
  function play(seq) { if (!on || !ctx()) return; seq.forEach(function (s) { tone(s[0], s[1], s[2], s[3]); }); }

  var SFX = {
    setOn: function (v) { on = !!v; if (on) ctx(); },
    isOn: function () { return on; },
    // 抽到一座城 / 发现：两音上行（好奇 → 揭晓）
    pick: function () { play([[523.25, 0, 0.12], [783.99, 0.08, 0.2]]); },
    // 收藏 / 点亮去过 / 存进行囊：温暖的三音小上行
    save: function () { play([[587.33, 0, 0.1], [739.99, 0.07, 0.12], [987.77, 0.15, 0.22]]); },
    // 轻点（留给需要时用，默认不铺开以免吵）
    tap: function () { play([[660, 0, 0.09, 0.06]]); }
  };
  root.TR = root.TR || {};
  root.TR.sfx = SFX;
  if (typeof module !== 'undefined' && module.exports) module.exports = SFX;
})(typeof window !== 'undefined' ? window : globalThis);
