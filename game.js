/* ============================================================
   NEON RUSH v2 — a lightweight endless highway car game
   Pure vanilla JavaScript + Canvas 2D. No dependencies.
   New: drift banking, graded near-misses, brake, touch pads.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('game-root');
  if (!root) return;

  /* ---------------- utils ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function damp(rate, dt) { return 1 - Math.exp(-rate * dt); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------------- build DOM ---------------- */
  root.innerHTML =
    '<canvas class="ng-canvas" role="img" aria-label="Neon Rush — endless highway car game"></canvas>' +
    '<div class="ng-vignette" aria-hidden="true"></div>' +

    '<div class="ng-hud" aria-hidden="true">' +
      '<div class="ng-score-panel ng-glass">' +
        '<span class="ng-label">SCORE</span>' +
        '<span class="ng-score ng-num">0</span>' +
        '<span class="ng-best-row">BEST <b class="ng-num ng-best-val">0</b></span>' +
      '</div>' +
      '<div class="ng-right-col">' +
        '<div class="ng-speed-panel ng-glass">' +
          '<div class="ng-speed-row"><span class="ng-speed ng-num">0</span><span class="ng-unit">km/h</span></div>' +
          '<div class="ng-speed-bar"><i></i></div>' +
        '</div>' +
        '<div class="ng-btns">' +
          '<button class="ng-icon-btn ng-pause-btn ng-glass" type="button" aria-label="Pause game" tabindex="-1">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.4"/><rect x="14" y="4" width="4" height="16" rx="1.4"/></svg>' +
          '</button>' +
          '<button class="ng-icon-btn ng-mute-btn ng-glass" type="button" aria-label="Toggle sound">' +
            '<svg class="ic-on" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>' +
            '<svg class="ic-off" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ng-drift-chip ng-glass"><span class="ng-drift-tag">DRIFT</span><b class="ng-num ng-drift-val">+0</b></div>' +
      '<div class="ng-boost-wrap">' +
        '<div class="ng-boost-bar"><i></i></div>' +
        '<span class="ng-boost-label">BOOST</span>' +
      '</div>' +
      '<div class="ng-pads">' +
        '<button class="ng-pad ng-boost-btn" type="button" aria-label="Boost (hold)">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"/></svg>' +
          '<span>BOOST</span>' +
        '</button>' +
        '<button class="ng-pad ng-brake-btn" type="button" aria-label="Brake (hold)">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8.2 2h7.6l6.2 6.2v7.6l-6.2 6.2H8.2L2 15.8V8.2L8.2 2z"/></svg>' +
          '<span>BRAKE</span>' +
        '</button>' +
        '<button class="ng-pad ng-drift-btn" type="button" aria-label="Drift (hold)">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>' +
          '<span>DRIFT</span>' +
        '</button>' +
      '</div>' +
      '<div class="ng-combo-pop"><span class="ng-combo-label">NEAR MISS</span><b class="ng-combo-num">×2</b><i class="ng-combo-bar"><b></b></i></div>' +
    '</div>' +

    '<div class="ng-screen ng-menu" data-screen="menu">' +
      '<div class="ng-menu-inner">' +
        '<p class="ng-kicker">ENDLESS NEON HIGHWAY</p>' +
        '<h1 class="ng-title">NEON&nbsp;RUSH</h1>' +
        '<p class="ng-tag">Drift the corners, brake through gaps, chain near-misses.</p>' +
        '<div class="ng-best-chip ng-glass">BEST&nbsp;<b class="ng-num ng-menu-best">0</b></div>' +
        '<button class="ng-play-btn" type="button">PLAY</button>' +
        '<div class="ng-controls">' +
          '<span class="ng-ctl"><kbd>A</kbd><kbd>D</kbd> steer</span>' +
          '<span class="ng-ctl"><kbd>SPACE</kbd> drift</span>' +
          '<span class="ng-ctl"><kbd>SHIFT</kbd> boost</span>' +
          '<span class="ng-ctl"><kbd>S</kbd> brake</span>' +
          '<span class="ng-ctl"><kbd>P</kbd> pause</span>' +
          '<span class="ng-ctl ng-touch-hint">drag to steer · hold DRIFT / BRAKE / BOOST pads</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="ng-screen ng-over" data-screen="over">' +
      '<div class="ng-menu-inner">' +
        '<p class="ng-kicker ng-crash-kicker">WRECKED</p>' +
        '<h2 class="ng-over-title">GAME OVER</h2>' +
        '<div class="ng-final-score ng-num">0</div>' +
        '<div class="ng-newbest" hidden>NEW BEST!</div>' +
        '<div class="ng-stats">' +
          '<div class="ng-stat ng-glass"><span>BEST</span><b class="ng-num ng-st-best">0</b></div>' +
          '<div class="ng-stat ng-glass"><span>DISTANCE</span><b class="ng-num ng-st-dist">0 m</b></div>' +
          '<div class="ng-stat ng-glass"><span>NEAR MISS</span><b class="ng-num ng-st-near">0</b></div>' +
          '<div class="ng-stat ng-glass"><span>ORBS</span><b class="ng-num ng-st-orbs">0</b></div>' +
          '<div class="ng-stat ng-glass"><span>MAX COMBO</span><b class="ng-num ng-st-combo">×0</b></div>' +
          '<div class="ng-stat ng-glass"><span>DRIFT PTS</span><b class="ng-num ng-st-drift">0</b></div>' +
        '</div>' +
        '<button class="ng-play-btn ng-retry-btn" type="button">RETRY</button>' +
        '<p class="ng-hint">press SPACE to restart</p>' +
      '</div>' +
    '</div>' +

    '<div class="ng-screen ng-paused" data-screen="paused">' +
      '<div class="ng-menu-inner">' +
        '<h2 class="ng-over-title">PAUSED</h2>' +
        '<button class="ng-play-btn ng-resume-btn" type="button">RESUME</button>' +
        '<p class="ng-hint">press P or ESC to resume</p>' +
      '</div>' +
    '</div>';

  var canvas = root.querySelector('.ng-canvas');
  var ctx = canvas.getContext('2d');
  var el = {
    score: root.querySelector('.ng-score'),
    bestVal: root.querySelector('.ng-best-val'),
    menuBest: root.querySelector('.ng-menu-best'),
    speed: root.querySelector('.ng-speed'),
    speedFill: root.querySelector('.ng-speed-bar i'),
    boostFill: root.querySelector('.ng-boost-bar i'),
    boostWrap: root.querySelector('.ng-boost-wrap'),
    boostBtn: root.querySelector('.ng-boost-btn'),
    brakeBtn: root.querySelector('.ng-brake-btn'),
    driftBtn: root.querySelector('.ng-drift-btn'),
    driftChip: root.querySelector('.ng-drift-chip'),
    driftVal: root.querySelector('.ng-drift-val'),
    comboPop: root.querySelector('.ng-combo-pop'),
    comboNum: root.querySelector('.ng-combo-num'),
    comboBar: root.querySelector('.ng-combo-bar b'),
    pauseBtn: root.querySelector('.ng-pause-btn'),
    muteBtn: root.querySelector('.ng-mute-btn'),
    screens: {
      menu: root.querySelector('[data-screen="menu"]'),
      over: root.querySelector('[data-screen="over"]'),
      paused: root.querySelector('[data-screen="paused"]')
    },
    finalScore: root.querySelector('.ng-final-score'),
    newBest: root.querySelector('.ng-newbest'),
    stBest: root.querySelector('.ng-st-best'),
    stDist: root.querySelector('.ng-st-dist'),
    stNear: root.querySelector('.ng-st-near'),
    stOrbs: root.querySelector('.ng-st-orbs'),
    stCombo: root.querySelector('.ng-st-combo'),
    stDrift: root.querySelector('.ng-st-drift'),
    retryBtn: root.querySelector('.ng-retry-btn'),
    resumeBtn: root.querySelector('.ng-resume-btn'),
    playBtn: root.querySelector('.ng-play-btn')
  };

  /* ---------------- constants ---------------- */
  var LANES = 4;
  var TRAFFIC_COLORS = ['#f472b6', '#fbbf24', '#a3e635', '#e8eef7', '#fb7185', '#c4b5fd', '#5eead4'];
  var COMBO_WINDOW = 2.0;

  /* ---------------- canvas sizing ---------------- */
  var W = 0, H = 0, dpr = 1;
  var roadW = 0, roadX = 0, laneW = 0;
  var bgGrad = null;

  function laneX(i) { return roadX + laneW * (i + 0.5); }

  function resize() {
    var hadMetrics = roadW > 0;
    var relX = hadMetrics ? clamp((P.x - roadX) / roadW, 0.08, 0.92) : 0.5;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    roadW = W < 560 ? W - 44 : clamp(W * 0.56, 300, 520);
    roadX = (W - roadW) / 2;
    laneW = roadW / LANES;
    if (hadMetrics && P) P.x = roadX + relX * roadW;
    bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#04070e');
    bgGrad.addColorStop(0.55, '#070c18');
    bgGrad.addColorStop(1, '#0b1322');
    makeStars();
  }

  /* ---------------- state ---------------- */
  var mode = 'menu'; // menu | playing | dying | over | paused
  var t = 0, elapsed = 0, dist = 0, score = 0, scroll = 0;
  var difficulty = 0;
  var worldSpeed = 0, speedMul = 1;
  var boostMeter = 35, boostHeld = false, boosting = false;
  var brakeHeld = false, braking = false, prevBraking = false;
  var driftHeld = false, drifting = false, driftDir = 1, driftT = 0, driftBank = 0;
  var driftChain = 1, lastBankT = -9;
  var combo = 0, comboTimer = 0;
  var shake = 0, flash = 0, timeScale = 1, dyingT = 0, overAt = 0;
  var hitStop = 0, brakeTint = 0;
  var edgeGlow = { a: 0, color: '94, 234, 212' };
  var stats = { near: 0, orbs: 0, topSpeed: 0, maxCombo: 0, driftPts: 0 };
  var spawnT = 1.1, orbT = 1.6, lightAcc = 0, exhaustAcc = 0, trailAcc = 0, smokeAcc = 0;
  var traffic = [], orbsArr = [], parts = [], floats = [], trails = [], sideLights = [], speedLines = [], stars = [];
  var lastScoreShown = -1, lastSpeedShown = -1;
  var lastComboOn = false, lastComboNum = -1, lastDriftOn = false, lastDriftVal = '', lastBraking = false;

  var P = { x: 0, y: 0, vx: 0, tilt: 0, w: 40, h: 78 };
  function playerY() { return H * 0.78; }

  function getBest() { var v = parseInt(lsGet('neonrush.best') || '0', 10); return isNaN(v) ? 0 : v; }
  function setBest(v) { lsSet('neonrush.best', String(v)); }
  function isMuted() { return lsGet('neonrush.muted') === '1'; }

  var best = getBest();
  el.bestVal.textContent = fmt(best);
  el.menuBest.textContent = fmt(best);

  /* ---------------- stars ---------------- */
  function makeStars() {
    stars = [];
    var n = Math.round((W * H) / 16000);
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: Math.random() < 0.85 ? 1 : 2,
        a: rand(0.15, 0.7),
        tw: rand(1, 3),
        ph: rand(0, Math.PI * 2),
        par: rand(0.03, 0.1)
      });
    }
  }

  /* ---------------- audio (WebAudio synth, no files) ---------------- */
  var AC = null, master = null, engine = null, driftLoop = null, noiseBuf = null;

  function initAudio() {
    if (AC) {
      if (AC.state === 'suspended') AC.resume();
      return;
    }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = new Ctx();
      master = AC.createGain();
      master.gain.value = isMuted() ? 0 : 0.5;
      master.connect(AC.destination);
      var len = AC.sampleRate;
      noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }

  function ensureEngine() {
    if (!AC || engine) return;
    try {
      var o1 = AC.createOscillator(); o1.type = 'sawtooth';
      var o2 = AC.createOscillator(); o2.type = 'square';
      var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      var g = AC.createGain(); g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
      o1.start(); o2.start();
      engine = { o1: o1, o2: o2, f: f, g: g };
    } catch (e) { engine = null; }
  }

  function ensureDriftLoop() {
    if (!AC || driftLoop) return;
    try {
      var src = AC.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var f = AC.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 1.8; f.frequency.value = 800;
      var g = AC.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      driftLoop = { src: src, f: f, g: g };
    } catch (e) { driftLoop = null; }
  }

  function updateEngine() {
    if (!engine || !AC) return;
    var now = AC.currentTime;
    var on = (mode === 'playing' || mode === 'dying' || mode === 'menu');
    var vol = on ? (mode === 'menu' ? 0.02 : 0.045) : 0;
    engine.g.gain.setTargetAtTime(vol, now, 0.12);
    var sf = clamp(worldSpeed / (H * 0.9), 0, 1.4);
    engine.o1.frequency.setTargetAtTime(40 + sf * 75, now, 0.06);
    engine.o2.frequency.setTargetAtTime((40 + sf * 75) * 2.02, now, 0.06);
    engine.f.frequency.setTargetAtTime(260 + sf * 850, now, 0.08);
    /* tire screech loop while drifting */
    if (driftLoop) {
      var dv = drifting && on ? 0.05 + Math.min(0.06, Math.abs(P.vx) / (roadW * 8)) : 0;
      driftLoop.g.gain.setTargetAtTime(dv, now, 0.07);
      if (drifting) {
        driftLoop.f.frequency.setTargetAtTime(650 + Math.abs(P.vx) * 0.4 + Math.sin(t * 26) * 150, now, 0.05);
      }
    }
  }

  function tone(f0, f1, dur, type, vol, delay) {
    if (!AC || isMuted()) return;
    try {
      var t0 = AC.currentTime + (delay || 0);
      var o = AC.createOscillator();
      var g = AC.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(Math.max(1, f0), t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  function noiseHit(dur, vol, fFrom, fTo, type) {
    if (!AC || isMuted() || !noiseBuf) return;
    try {
      var t0 = AC.currentTime;
      var src = AC.createBufferSource();
      src.buffer = noiseBuf;
      var f = AC.createBiquadFilter();
      f.type = type || 'bandpass';
      f.Q.value = 0.9;
      f.frequency.setValueAtTime(fFrom, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, fTo), t0 + dur);
      var g = AC.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  var sfx = {
    ui: function () { tone(660, 920, 0.07, 'triangle', 0.14); },
    start: function () { tone(440, 880, 0.16, 'triangle', 0.16); tone(880, 1320, 0.14, 'triangle', 0.1, 0.08); },
    blip: function () { tone(640, 1000, 0.08, 'sine', 0.16); tone(1000, 1400, 0.1, 'sine', 0.1, 0.05); },
    whoosh: function (c) {
      var k = c || 1;
      noiseHit(0.16 + 0.02 * Math.min(k, 6), 0.24, 500 + k * 80, 2200 + k * 120, 'bandpass');
    },
    driftStart: function () { noiseHit(0.3, 0.16, 260, 950, 'bandpass'); },
    bank: function (chain) {
      var b = Math.min(chain || 1, 5);
      tone(500 + b * 60, 760 + b * 60, 0.09, 'triangle', 0.2);
      tone(760 + b * 60, 1150 + b * 60, 0.12, 'triangle', 0.16, 0.07);
    },
    brake: function () { tone(240, 100, 0.22, 'sine', 0.1); noiseHit(0.18, 0.06, 900, 300, 'lowpass'); },
    crash: function () { noiseHit(0.55, 0.5, 1400, 90, 'lowpass'); tone(130, 28, 0.45, 'sawtooth', 0.35); }
  };

  /* ---------------- spawning ---------------- */
  function makeCar(lane) {
    var w = laneW * 0.56;
    return {
      lane: lane,
      y: -P.h * 1.6 - rand(0, 90),
      f: rand(0.42, 0.6 + 0.16 * difficulty),
      w: w,
      h: w * 1.88,
      color: pick(TRAFFIC_COLORS)
    };
  }

  function laneClearAtTop(lane) {
    for (var i = 0; i < traffic.length; i++) {
      var c = traffic[i];
      if (c.lane === lane && c.y < c.h + 150) return false;
    }
    return true;
  }

  function spawnWave() {
    var count = 1;
    if (difficulty > 0.18 && Math.random() < clamp(difficulty + 0.15, 0, 0.85)) count = 2;
    if (difficulty > 0.55 && Math.random() < 0.16) count = 3;
    var lanes = [0, 1, 2, 3];
    for (var i = lanes.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = lanes[i]; lanes[i] = lanes[j]; lanes[j] = tmp;
    }
    var placed = 0;
    for (var k = 0; k < lanes.length && placed < count; k++) {
      if (laneClearAtTop(lanes[k])) {
        traffic.push(makeCar(lanes[k]));
        placed++;
      }
    }
  }

  function spawnOrb() {
    var ln = (Math.random() * 4) | 0;
    if (!laneClearAtTop(ln)) return;
    orbsArr.push({
      lane: ln,
      x: laneX(ln),
      y: -50,
      r: Math.max(9, laneW * 0.15),
      pulse: rand(0, Math.PI * 2)
    });
  }

  /* ---------------- particles / fx ---------------- */
  function spawnExhaust() {
    var back = P.y + P.h * 0.46;
    parts.push({
      x: P.x + rand(-P.w * 0.18, P.w * 0.18),
      y: back,
      vx: rand(-24, 24) - P.vx * 0.25,
      vy: worldSpeed * rand(0.55, 0.8),
      life: rand(0.22, 0.4),
      max: 0.4,
      size: rand(2, 4.5),
      color: boosting ? '122, 235, 218' : '148, 180, 210',
      glow: boosting
    });
  }

  function spawnSmoke() {
    parts.push({
      x: P.x - driftDir * P.w * 0.22 + rand(-P.w * 0.3, P.w * 0.3),
      y: P.y + P.h * 0.42,
      vx: -driftDir * rand(26, 80) + rand(-18, 18),
      vy: worldSpeed * rand(0.3, 0.5),
      life: rand(0.4, 0.85),
      max: 0.85,
      size: rand(3, 7),
      color: '168, 186, 208',
      glow: false
    });
  }

  function pushTrails() {
    var rearY = P.y + P.h * 0.38;
    var rot = driftDir * rand(0.16, 0.32);
    trails.push({ x: P.x - P.w * 0.32, y: rearY, life: 0.85, max: 0.85, rot: rot });
    trails.push({ x: P.x + P.w * 0.32, y: rearY, life: 0.85, max: 0.85, rot: rot });
    if (trails.length > 140) trails.splice(0, trails.length - 140);
  }

  function explosion(x, y, baseColor) {
    for (var i = 0; i < 46; i++) {
      var a = rand(0, Math.PI * 2);
      var sp = rand(60, 460);
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.4, 1.05),
        max: 1.05,
        size: rand(2, 6),
        color: pick(['255, 122, 89', '255, 196, 87', baseColor, '236, 244, 255']),
        glow: true
      });
    }
    for (var j = 0; j < 14; j++) {
      parts.push({
        x: x + rand(-14, 14), y: y + rand(-24, 24),
        vx: rand(-40, 40), vy: rand(-30, 90),
        life: rand(0.7, 1.3), max: 1.3,
        size: rand(6, 13),
        color: '70, 78, 96', glow: false
      });
    }
  }

  function sparkBurst(x, y, rgb) {
    for (var i = 0; i < 12; i++) {
      var a = rand(0, Math.PI * 2);
      var sp = rand(40, 190);
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.25, 0.55), max: 0.55,
        size: rand(1.5, 3.5), color: rgb, glow: true
      });
    }
  }

  function addFloat(x, y, text, color, size) {
    floats.push({ x: x, y: y, text: text, color: color, size: size || 16, life: 1, max: 1 });
  }

  /* ---------------- drift core ---------------- */
  function startDrift(steer) {
    drifting = true;
    driftT = 0;
    driftBank = 0;
    driftDir = steer || (P.vx >= 0 ? 1 : -1);
    shake = Math.max(shake, 2.5);
    ensureDriftLoop();
    sfx.driftStart();
  }

  function endDrift(bank) {
    if (!drifting) return;
    drifting = false;
    if (driftLoop && AC) driftLoop.g.gain.setTargetAtTime(0, AC.currentTime, 0.08);
    if (bank && driftT > 0.25) doBank();
    driftBank = 0;
    driftT = 0;
  }

  function doBank() {
    var b = Math.round(driftBank);
    if (b < 15) return;
    if (t - lastBankT < COMBO_WINDOW + 0.5) driftChain = Math.min(driftChain + 1, 5);
    else driftChain = 1;
    lastBankT = t;
    var pts = Math.round(b * (1 + 0.25 * (driftChain - 1)));
    score += pts;
    stats.driftPts += pts;
    boostMeter = Math.min(100, boostMeter + Math.min(18, pts * 0.05));
    addFloat(P.x, playerY() - 96,
      driftChain > 1 ? 'DRIFT ×' + driftChain + '  +' + fmt(pts) : 'DRIFT  +' + fmt(pts),
      '#fcd34d', driftChain > 1 ? 19 : 17);
    sparkBurst(P.x, playerY() + P.h * 0.3, '252, 211, 77');
    shake = Math.max(shake, 4);
    sfx.bank(driftChain);
    buzz(30);
  }

  /* ---------------- game events ---------------- */
  function nearMiss(c, gapX) {
    combo = comboTimer > 0 ? Math.min(combo + 1, 9) : 1;
    comboTimer = COMBO_WINDOW;
    stats.near++;
    stats.maxCombo = Math.max(stats.maxCombo, combo);

    var grade, base, color, size;
    if (gapX < 7) { grade = 'INSANE'; base = 150; color = '#f472b6'; size = 21; }
    else if (gapX < 14) { grade = 'CLOSE'; base = 90; color = '#8ef5e2'; size = 17; }
    else { grade = ''; base = 50; color = '#7dd3fc'; size = 15; }

    var pts = base * (1 + 0.2 * (combo - 1));
    var mods = [];
    if (drifting) { pts *= 1.5; mods.push('DRIFT'); }
    if (braking) { pts *= 2; mods.push('BRAVE'); }
    pts = Math.round(pts);
    score += pts;

    var label = mods.join(' ');
    if (grade) label = label ? label + ' ' + grade : grade;
    var text = (label ? label + ' ' : '') + (combo > 1 ? '×' + combo + ' ' : '') + '+' + fmt(pts);
    addFloat(c.lane !== undefined ? laneX(c.lane) : c.x, playerY() - 74, text, color, size);

    if (gapX < 7) {
      hitStop = 0.1;
      edgeGlow = { a: 0.5, color: '244, 114, 182' };
      shake = Math.max(shake, 6);
      buzz(55);
    } else {
      edgeGlow = { a: Math.max(edgeGlow.a, 0.28), color: '94, 234, 212' };
      shake = Math.max(shake, 3);
      buzz(20);
    }
    sfx.whoosh(combo);
  }

  function collectOrb(o) {
    score += 25;
    stats.orbs++;
    boostMeter = Math.min(100, boostMeter + 16);
    addFloat(o.x, o.y - 20, '+25', '#a5f3fc', 15);
    sparkBurst(o.x, o.y, '94, 234, 212');
    sfx.blip();
  }

  function crash(c) {
    if (drifting && driftBank >= 30) addFloat(P.x, playerY() - P.h * 0.6, 'DRIFT LOST', '#fb7185', 16);
    endDrift(false);
    mode = 'dying';
    dyingT = 0;
    root.dataset.mode = 'dying';
    shake = 15;
    flash = 0.6;
    explosion(P.x, playerY(), '94, 234, 212');
    sparkBurst(c.lane !== undefined ? laneX(c.lane) : P.x, playerY() - P.h * 0.4, '255, 122, 89');
    sfx.crash();
    buzz(120);
  }

  function gameOver() {
    mode = 'over';
    overAt = performance.now();
    root.dataset.mode = 'over';
    var s = Math.round(score);
    var isBest = s > best;
    if (isBest) { best = s; setBest(s); }
    el.finalScore.textContent = fmt(s);
    el.newBest.hidden = !isBest;
    el.stBest.textContent = fmt(best);
    el.stDist.textContent = fmt(Math.round(dist / P.h * 4.5)) + ' m';
    el.stNear.textContent = String(stats.near);
    el.stOrbs.textContent = String(stats.orbs);
    el.stCombo.textContent = '×' + stats.maxCombo;
    el.stDrift.textContent = fmt(stats.driftPts);
    el.bestVal.textContent = fmt(best);
    el.menuBest.textContent = fmt(best);
  }

  function reset() {
    traffic = []; orbsArr = []; parts = []; floats = []; trails = []; speedLines = [];
    score = 0; dist = 0; elapsed = 0; difficulty = 0;
    boostMeter = 35; boosting = false; combo = 0; comboTimer = 0;
    braking = false; prevBraking = false; drifting = false; driftBank = 0; driftT = 0;
    driftChain = 1; lastBankT = -9; hitStop = 0; brakeTint = 0;
    edgeGlow = { a: 0, color: '94, 234, 212' };
    spawnT = 1.15; orbT = 1.7; lightAcc = 0; exhaustAcc = 0; trailAcc = 0; smokeAcc = 0;
    shake = 0; flash = 0; timeScale = 1; dyingT = 0;
    speedMul = 1;
    stats = { near: 0, orbs: 0, topSpeed: 0, maxCombo: 0, driftPts: 0 };
    P.w = laneW * 0.58;
    P.h = P.w * 1.92;
    P.x = roadX + roadW / 2;
    P.vx = 0; P.tilt = 0;
    lastScoreShown = -1; lastSpeedShown = -1;
    lastComboOn = false; lastComboNum = -1; lastDriftOn = false; lastDriftVal = ''; lastBraking = false;
  }

  function startGame() {
    initAudio();
    ensureEngine();
    reset();
    mode = 'playing';
    root.dataset.mode = 'playing';
    sfx.start();
  }

  function togglePause() {
    if (mode === 'playing') {
      mode = 'paused';
      root.dataset.mode = 'paused';
      boostHeld = brakeHeld = driftHeld = false;
      endDrift(false);
      sfx.ui();
    } else if (mode === 'paused') {
      mode = 'playing';
      root.dataset.mode = 'playing';
      sfx.ui();
    }
  }

  /* ---------------- input ---------------- */
  var keys = { left: false, right: false };
  var drag = { active: false, x: 0 };

  window.addEventListener('keydown', function (e) {
    var k = e.key, code = e.code || '';
    var isSpace = k === ' ' || code === 'Space';
    var isLeft = k === 'ArrowLeft' || code === 'ArrowLeft' || k === 'a' || k === 'A' || code === 'KeyA';
    var isRight = k === 'ArrowRight' || code === 'ArrowRight' || k === 'd' || k === 'D' || code === 'KeyD';
    var isBrake = k === 's' || k === 'S' || code === 'KeyS' || k === 'ArrowDown' || code === 'ArrowDown';
    var isBoost = k === 'ArrowUp' || code === 'ArrowUp' || k === 'w' || k === 'W' || code === 'KeyW' || k === 'Shift';
    var isDrift = isSpace;
    var isEnter = k === 'Enter' || code === 'Enter' || code === 'NumpadEnter';
    if (isSpace || code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') e.preventDefault();
    if (e.repeat) return;
    initAudio();
    if (isLeft) keys.left = true;
    if (isRight) keys.right = true;
    if (isBrake) brakeHeld = true;
    if (isDrift) {
      if (mode === 'menu' || mode === 'over') { tryStart(); } else { driftHeld = true; }
    }
    if (isBoost) {
      if (mode === 'menu' || mode === 'over') { tryStart(); }
      else boostHeld = true;
    }
    if (isEnter && (mode === 'menu' || mode === 'over')) tryStart();
    if (k === 'p' || k === 'P' || code === 'KeyP' || k === 'Escape') togglePause();
  });

  window.addEventListener('keyup', function (e) {
    var k = e.key, code = e.code || '';
    if (k === 'ArrowLeft' || code === 'ArrowLeft' || k === 'a' || k === 'A' || code === 'KeyA') keys.left = false;
    if (k === 'ArrowRight' || code === 'ArrowRight' || k === 'd' || k === 'D' || code === 'KeyD') keys.right = false;
    if (k === 's' || k === 'S' || code === 'KeyS' || k === 'ArrowDown' || code === 'ArrowDown') brakeHeld = false;
    if (k === ' ' || code === 'Space') driftHeld = false;
    if (k === 'ArrowUp' || code === 'ArrowUp' || k === 'w' || k === 'W' || code === 'KeyW' || k === 'Shift') boostHeld = false;
  });

  function tryStart() {
    if (mode === 'menu') { startGame(); return; }
    if (mode === 'over' && performance.now() - overAt > 500) startGame();
  }

  canvas.addEventListener('pointerdown', function (e) {
    initAudio(); ensureEngine();
    drag.active = true;
    drag.x = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', function (e) {
    if (drag.active) drag.x = e.clientX;
  });
  function endDrag() { drag.active = false; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function bindPad(btn, on, off) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      initAudio(); ensureEngine();
      btn.classList.add('is-down');
      on();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    });
    function up() { btn.classList.remove('is-down'); off(); }
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  }
  bindPad(el.boostBtn, function () { boostHeld = true; }, function () { boostHeld = false; });
  bindPad(el.brakeBtn, function () { brakeHeld = true; }, function () { brakeHeld = false; });
  bindPad(el.driftBtn, function () { driftHeld = true; }, function () { driftHeld = false; });

  el.playBtn.addEventListener('click', function () { initAudio(); tryStart(); });
  el.retryBtn.addEventListener('click', function () { initAudio(); tryStart(); });
  el.resumeBtn.addEventListener('click', function () { togglePause(); });
  el.pauseBtn.addEventListener('click', function () { togglePause(); });
  el.muteBtn.addEventListener('click', function () {
    var m = !isMuted();
    lsSet('neonrush.muted', m ? '1' : '0');
    if (master) master.gain.value = m ? 0 : 0.5;
    el.muteBtn.classList.toggle('muted', m);
    if (!m) { initAudio(); sfx.ui(); }
  });
  el.muteBtn.classList.toggle('muted', isMuted());

  el.screens.menu.addEventListener('click', function (e) {
    if (e.target === el.screens.menu || e.target.classList.contains('ng-menu-inner')) { initAudio(); tryStart(); }
  });

  window.addEventListener('blur', function () {
    if (mode === 'playing') togglePause();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && mode === 'playing') togglePause();
  });
  window.addEventListener('resize', resize);

  /* ---------------- update ---------------- */
  function update(dt, realDt) {
    t += dt;

    /* difficulty & speed */
    if (mode === 'playing') {
      elapsed += dt;
      difficulty = Math.min(1, elapsed / 95);
      braking = brakeHeld;
      boosting = boostHeld && boostMeter > 0.5 && !braking;
      if (boosting) boostMeter = Math.max(0, boostMeter - 30 * dt);
      else boostMeter = Math.min(100, boostMeter + (braking ? 7 : 2.2) * dt);
      var sTarget = braking ? 0.52 : (boosting ? 1.45 : (drifting ? 0.96 : 1));
      speedMul = lerp(speedMul, sTarget, damp(braking ? 6.5 : 5, dt));
      worldSpeed = H * (0.4 + 0.52 * difficulty) * speedMul;
      stats.topSpeed = Math.max(stats.topSpeed, worldSpeed);
      score += (worldSpeed / H) * 60 * (boosting ? 2 : (braking ? 0.35 : 1)) * dt;
      dist += worldSpeed * dt;
      if (braking && !prevBraking) sfx.brake();
      prevBraking = braking;
    } else if (mode === 'menu') {
      worldSpeed = lerp(worldSpeed, H * 0.24, damp(1.6, dt));
    } else {
      worldSpeed = lerp(worldSpeed, 0, damp(3.2, dt));
    }
    scroll += worldSpeed * dt;

    /* combo timer */
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }

    /* player */
    P.y = playerY();
    var minX = roadX + P.w / 2 + 5;
    var maxX = roadX + roadW - P.w / 2 - 5;
    if (mode === 'playing') {
      P.w = laneW * 0.58;
      P.h = P.w * 1.92;

      var steer = 0;
      if (drag.active) {
        var target = clamp(drag.x, minX, maxX);
        var prevX = P.x;
        P.x += (target - P.x) * damp(drifting ? 10 : 16, dt);
        P.vx = dt > 0 ? (P.x - prevX) / dt : 0;
        steer = Math.abs(target - P.x) > 1.5 ? (target > P.x ? 1 : -1) : 0;
      } else {
        steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        var acc = roadW * (drifting ? 12 : 9);
        var maxV = roadW * (drifting ? 2.05 : 1.8);
        if (steer !== 0) P.vx += steer * acc * dt;
        else P.vx *= Math.exp((drifting ? -3.2 : -9) * dt);
        P.vx = clamp(P.vx, -maxV, maxV);
        P.x += P.vx * dt;
      }
      if (P.x < minX) { P.x = minX; P.vx = Math.max(0, P.vx); }
      if (P.x > maxX) { P.x = maxX; P.vx = Math.min(0, P.vx); }

      /* drift state machine */
      var wantDrift = driftHeld && steer !== 0;
      if (!drifting && wantDrift && speedMul > 0.45) {
        startDrift(steer);
      } else if (drifting) {
        if (steer !== 0) driftDir = steer;
        else if (Math.abs(P.vx) > roadW * 0.05) driftDir = P.vx > 0 ? 1 : -1;
        driftT += dt;
        if (driftT > 0.12) {
          driftBank += (80 + 280 * Math.min(1, Math.abs(P.vx) / (roadW * 2))) * (1 + 0.12 * combo) * dt;
        }
        trailAcc += dt;
        while (trailAcc > 0.02) { trailAcc -= 0.02; pushTrails(); }
        smokeAcc += dt;
        while (smokeAcc > 0.028) { smokeAcc -= 0.028; spawnSmoke(); }
        if (!wantDrift || speedMul < 0.5) endDrift(true);
      }

      var yawT = clamp(P.vx / (roadW * 1.8), -1, 1) * 0.15 + (drifting ? driftDir * 0.3 : 0);
      P.tilt = lerp(P.tilt, yawT, damp(10, dt));

      exhaustAcc += dt;
      var exRate = boosting ? 0.012 : 0.024;
      while (exhaustAcc > exRate) { exhaustAcc -= exRate; spawnExhaust(); }
    } else if (mode === 'menu') {
      P.w = laneW * 0.58; P.h = P.w * 1.92;
      P.x = roadX + roadW / 2 + Math.sin(t * 0.55) * roadW * 0.16;
      P.tilt = Math.cos(t * 0.55) * 0.05;
      exhaustAcc += dt;
      while (exhaustAcc > 0.03) { exhaustAcc -= 0.03; spawnExhaust(); }
    }

    /* spawning */
    if (mode === 'playing') {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = lerp(1.32, 0.62, difficulty) * rand(0.8, 1.25);
        spawnWave();
      }
      orbT -= dt;
      if (orbT <= 0) { orbT = rand(1.5, 2.7); spawnOrb(); }
    }

    /* traffic */
    var py = P.y;
    for (var i = traffic.length - 1; i >= 0; i--) {
      var c = traffic[i];
      c.x = laneX(c.lane);
      var rel = worldSpeed * (1 - c.f);
      var prevY = c.y;
      c.y += rel * dt;

      if (mode === 'playing') {
        /* collision (slightly forgiving hitboxes) */
        var dx = Math.abs(c.x - P.x);
        var dy = Math.abs(c.y - py);
        if (dx < (c.w + P.w) * 0.41 && dy < (c.h + P.h) * 0.44) {
          crash(c);
        } else if (prevY < py && c.y >= py) {
          var gapX = dx - (c.w + P.w) / 2;
          if (gapX < 22) nearMiss(c, gapX);
        }
      }
      if (c.y > H + c.h * 2) traffic.splice(i, 1);
    }

    /* orbs */
    for (var j = orbsArr.length - 1; j >= 0; j--) {
      var o = orbsArr[j];
      o.x = laneX(o.lane);
      o.y += worldSpeed * dt;
      o.pulse += dt * 5;
      if (mode === 'playing') {
        var odx = o.x - P.x, ody = o.y - py;
        if (odx * odx + ody * ody < (o.r + P.w * 0.55) * (o.r + P.w * 0.55)) {
          collectOrb(o);
          orbsArr.splice(j, 1);
          continue;
        }
      }
      if (o.y > H + 60) orbsArr.splice(j, 1);
    }

    /* tire trails scroll with the road */
    for (var tr = trails.length - 1; tr >= 0; tr--) {
      trails[tr].y += worldSpeed * dt;
      trails[tr].life -= dt;
      if (trails[tr].life <= 0 || trails[tr].y > H + 40) trails.splice(tr, 1);
    }

    /* side lights (parallax scenery) */
    lightAcc += worldSpeed * dt;
    while (lightAcc > 38) {
      lightAcc -= 38;
      var left = Math.random() < 0.5;
      sideLights.push({
        x: left ? roadX - rand(12, 70) : roadX + roadW + rand(12, 70),
        y: -120,
        len: rand(26, 80),
        a: rand(0.05, 0.16),
        color: pick(['44, 212, 191', '244, 114, 182', '226, 232, 240'])
      });
    }
    for (var s = sideLights.length - 1; s >= 0; s--) {
      sideLights[s].y += worldSpeed * dt;
      if (sideLights[s].y > H + 130) sideLights.splice(s, 1);
    }
    if (sideLights.length > 90) sideLights.splice(0, sideLights.length - 90);

    /* speed lines */
    var sf = worldSpeed / (H * 0.9);
    if (sf > 0.52 && Math.random() < (sf - 0.4)) {
      speedLines.push({
        x: Math.random() * W,
        y: -30,
        len: lerp(40, 150, clamp(sf - 0.5, 0, 1)),
        v: worldSpeed * 2.3,
        a: rand(0.05, 0.13)
      });
    }
    for (var l = speedLines.length - 1; l >= 0; l--) {
      speedLines[l].y += speedLines[l].v * dt;
      if (speedLines[l].y > H + 160) speedLines.splice(l, 1);
    }
    if (speedLines.length > 26) speedLines.splice(0, speedLines.length - 26);

    /* particles */
    for (var p = parts.length - 1; p >= 0; p--) {
      var pt = parts[p];
      pt.life -= dt;
      if (pt.life <= 0) { parts.splice(p, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.exp(-2.4 * dt);
      if (!pt.glow) pt.vy += 60 * dt;
    }

    /* floating texts */
    for (var f = floats.length - 1; f >= 0; f--) {
      floats[f].y -= 58 * dt;
      floats[f].life -= dt * 0.9;
      if (floats[f].life <= 0) floats.splice(f, 1);
    }

    /* stars parallax */
    for (var st = 0; st < stars.length; st++) {
      var s2 = stars[st];
      s2.y += worldSpeed * s2.par * dt;
      if (s2.y > H + 4) { s2.y = -4; s2.x = Math.random() * W; }
    }

    /* fx decay (real time) */
    shake *= Math.exp(-6 * realDt);
    if (shake < 0.08) shake = 0;
    flash = Math.max(0, flash - 1.8 * realDt);
    edgeGlow.a = Math.max(0, edgeGlow.a - 1.6 * realDt);
    brakeTint = lerp(brakeTint, braking && mode === 'playing' ? 1 : 0, damp(6, realDt));
    if (hitStop > 0) hitStop -= realDt;

    if (mode === 'dying') {
      dyingT += realDt;
      if (dyingT > 1.0) gameOver();
    }
  }

  /* ---------------- draw ---------------- */
  function drawCar(x, y, w, h, color, isPlayer, tilt, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    /* ground shadow */
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.06, w * 0.62, h * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isPlayer) {
      ctx.save();
      ctx.shadowColor = opts.drift ? 'rgba(251, 191, 36, 0.8)' : 'rgba(45, 212, 191, 0.85)';
      ctx.shadowBlur = 22;
      ctx.fillStyle = opts.drift ? 'rgba(251, 191, 36, 0.26)' : 'rgba(45, 212, 191, 0.32)';
      rr(ctx, -w / 2 - 2, -h / 2, w + 4, h, w * 0.3);
      ctx.fill();
      ctx.restore();
    }

    /* body */
    var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (isPlayer) {
      g.addColorStop(0, '#7dfce9');
      g.addColorStop(0.5, '#2dd4bf');
      g.addColorStop(1, '#0f9d8f');
    } else {
      g.addColorStop(0, shade(color, 1.25));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, 0.62));
    }
    rr(ctx, -w / 2, -h / 2, w, h, w * 0.26);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    /* cabin glass */
    ctx.fillStyle = 'rgba(8, 14, 26, 0.82)';
    rr(ctx, -w * 0.34, -h * 0.26, w * 0.68, h * 0.36, w * 0.16);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 235, 255, 0.16)';
    rr(ctx, -w * 0.3, -h * 0.24, w * 0.6, h * 0.12, w * 0.1);
    ctx.fill();

    if (isPlayer) {
      /* center stripe */
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      rr(ctx, -w * 0.07, -h / 2 + 3, w * 0.14, h * 0.2, w * 0.07);
      ctx.fill();
    }

    /* brake light beams (player, braking) */
    if (isPlayer && opts.brake) {
      var beam = ctx.createLinearGradient(0, h / 2, 0, h / 2 + h * 0.95);
      beam.addColorStop(0, 'rgba(255, 70, 100, 0.45)');
      beam.addColorStop(1, 'rgba(255, 70, 100, 0)');
      ctx.fillStyle = beam;
      ctx.fillRect(-w * 0.44, h / 2 - 2, w * 0.32, h * 0.95);
      ctx.fillRect(w * 0.12, h / 2 - 2, w * 0.32, h * 0.95);
    }

    /* taillights (rear = bottom, all cars face up the road) */
    ctx.save();
    if (isPlayer && opts.brake) {
      ctx.shadowColor = '#ff8296';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff8fa4';
    } else {
      ctx.shadowColor = '#ff5d7a';
      ctx.shadowBlur = 9;
      ctx.fillStyle = '#ff5d7a';
    }
    rr(ctx, -w * 0.4, h / 2 - h * 0.075, w * 0.22, h * 0.045, 2);
    ctx.fill();
    rr(ctx, w * 0.18, h / 2 - h * 0.075, w * 0.22, h * 0.045, 2);
    ctx.fill();
    ctx.restore();

    /* headlights (faint) */
    ctx.fillStyle = 'rgba(255, 255, 240, 0.4)';
    rr(ctx, -w * 0.38, -h / 2 + h * 0.03, w * 0.18, h * 0.028, 2);
    ctx.fill();
    rr(ctx, w * 0.2, -h / 2 + h * 0.03, w * 0.18, h * 0.028, 2);
    ctx.fill();

    ctx.restore();
  }

  function shade(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = clamp(Math.round(r * k), 0, 255);
    g = clamp(Math.round(g * k), 0, 255);
    b = clamp(Math.round(b * k), 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (shake > 0.1) ctx.translate(rand(-shake, shake), rand(-shake, shake));

    /* background */
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    /* horizon glow */
    var hg = ctx.createRadialGradient(W / 2, -H * 0.12, 10, W / 2, -H * 0.12, H * 0.75);
    hg.addColorStop(0, 'rgba(45, 212, 191, 0.12)');
    hg.addColorStop(0.5, 'rgba(45, 212, 191, 0.03)');
    hg.addColorStop(1, 'rgba(45, 212, 191, 0)');
    ctx.fillStyle = hg;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    /* stars */
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (0.6 + 0.4 * Math.sin(t * s.tw + s.ph));
      ctx.fillStyle = 'rgba(200, 225, 255, ' + a.toFixed(3) + ')';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }

    /* dot grid */
    var gap = 64;
    var off = scroll % gap;
    ctx.fillStyle = 'rgba(148, 180, 220, 0.05)';
    for (var gy = -off; gy < H; gy += gap) {
      for (var gx = (gap / 2); gx < W; gx += gap) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }

    /* side light streaks */
    for (var sl = 0; sl < sideLights.length; sl++) {
      var L = sideLights[sl];
      ctx.fillStyle = 'rgba(' + L.color + ',' + L.a.toFixed(3) + ')';
      ctx.fillRect(L.x, L.y, 2, L.len);
      ctx.fillStyle = 'rgba(' + L.color + ',' + (L.a * 0.35).toFixed(3) + ')';
      ctx.fillRect(L.x - 2, L.y, 6, L.len);
    }

    /* road */
    var rg = ctx.createLinearGradient(roadX, 0, roadX + roadW, 0);
    rg.addColorStop(0, '#0a101d');
    rg.addColorStop(0.5, '#0d1526');
    rg.addColorStop(1, '#0a101d');
    ctx.fillStyle = rg;
    ctx.fillRect(roadX, -30, roadW, H + 60);

    /* lane dashes */
    ctx.save();
    ctx.strokeStyle = 'rgba(225, 238, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([30, 42]);
    ctx.lineDashOffset = -(scroll % 72);
    for (var li = 1; li < LANES; li++) {
      var lx = roadX + laneW * li;
      ctx.beginPath();
      ctx.moveTo(lx, -10);
      ctx.lineTo(lx, H + 10);
      ctx.stroke();
    }
    ctx.restore();

    /* glowing edge rails */
    ctx.save();
    ctx.shadowColor = 'rgba(45, 212, 191, 0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(roadX + 1, -10); ctx.lineTo(roadX + 1, H + 10);
    ctx.moveTo(roadX + roadW - 1, -10); ctx.lineTo(roadX + roadW - 1, H + 10);
    ctx.stroke();
    ctx.restore();

    /* tire trails */
    for (var ti = 0; ti < trails.length; ti++) {
      var tr2 = trails[ti];
      var ta = clamp(tr2.life / tr2.max, 0, 1) * 0.55;
      ctx.save();
      ctx.translate(tr2.x, tr2.y);
      ctx.rotate(tr2.rot);
      ctx.fillStyle = 'rgba(4, 7, 12, ' + ta.toFixed(3) + ')';
      rr(ctx, -2.6, -10, 5.2, 20, 2.6);
      ctx.fill();
      ctx.restore();
    }

    /* orbs */
    for (var oi = 0; oi < orbsArr.length; oi++) {
      var o = orbsArr[oi];
      var pulse = 1 + Math.sin(o.pulse) * 0.14;
      var r = o.r * pulse;
      var og = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, r * 2.6);
      og.addColorStop(0, 'rgba(125, 252, 233, 0.5)');
      og.addColorStop(0.45, 'rgba(45, 212, 191, 0.18)');
      og.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bffff2';
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(125, 252, 233, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* traffic */
    for (var ti2 = 0; ti2 < traffic.length; ti2++) {
      var c2 = traffic[ti2];
      drawCar(c2.x, c2.y, c2.w, c2.h, c2.color, false, 0);
    }

    /* player */
    if (mode !== 'over') {
      drawCar(P.x, P.y, P.w, P.h, '#2dd4bf', true, P.tilt, {
        brake: braking, drift: drifting, boost: boosting
      });
    }

    /* particles */
    for (var pi = 0; pi < parts.length; pi++) {
      var p = parts[pi];
      var al = clamp(p.life / p.max, 0, 1);
      if (p.glow) {
        ctx.save();
        ctx.shadowColor = 'rgba(' + p.color + ',' + al.toFixed(2) + ')';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(' + p.color + ',' + al.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + al * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(' + p.color + ',' + (al * 0.55).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* speed lines */
    for (var li2 = 0; li2 < speedLines.length; li2++) {
      var sl2 = speedLines[li2];
      ctx.strokeStyle = 'rgba(220, 240, 255, ' + sl2.a.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sl2.x, sl2.y);
      ctx.lineTo(sl2.x, sl2.y + sl2.len);
      ctx.stroke();
    }

    /* floating texts */
    for (var fi = 0; fi < floats.length; fi++) {
      var ft = floats[fi];
      var fa = clamp(ft.life / ft.max, 0, 1);
      ctx.save();
      ctx.font = '700 ' + ft.size + 'px ' + '"Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = fa;
      ctx.fillText(ft.text, clamp(ft.x, 70, W - 70), ft.y);
      ctx.restore();
    }

    ctx.restore(); /* end shake */

    /* brake focus tint */
    if (brakeTint > 0.02) {
      var bt = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
      bt.addColorStop(0, 'rgba(110, 140, 190, 0)');
      bt.addColorStop(1, 'rgba(110, 140, 190, ' + (brakeTint * 0.22).toFixed(3) + ')');
      ctx.fillStyle = bt;
      ctx.fillRect(0, 0, W, H);
    }

    /* near-miss edge glow */
    if (edgeGlow.a > 0.01) {
      var eg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.34, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
      eg.addColorStop(0, 'rgba(' + edgeGlow.color + ',0)');
      eg.addColorStop(1, 'rgba(' + edgeGlow.color + ',' + (edgeGlow.a * 0.55).toFixed(3) + ')');
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, W, H);
    }

    /* crash flash */
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255, 235, 235, ' + (flash * 0.75).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- HUD ---------------- */
  function updateHud() {
    var sc = Math.round(score);
    if (sc !== lastScoreShown) {
      lastScoreShown = sc;
      el.score.textContent = fmt(sc);
    }
    var kmh = Math.round(worldSpeed / H * 240);
    if (kmh !== lastSpeedShown) {
      lastSpeedShown = kmh;
      el.speed.textContent = String(kmh);
      el.speedFill.style.transform = 'scaleX(' + clamp((worldSpeed / H - 0.15) / 0.85, 0.04, 1).toFixed(3) + ')';
    }
    if (braking !== lastBraking) {
      lastBraking = braking;
      el.speedFill.classList.toggle('braking', braking);
    }
    el.boostFill.style.transform = 'scaleX(' + (boostMeter / 100).toFixed(3) + ')';
    el.boostWrap.classList.toggle('charged', boostMeter >= 99);
    el.boostFill.classList.toggle('low', boostMeter < 20);

    /* combo popup */
    var cOn = mode === 'playing' && combo >= 2 && comboTimer > 0;
    if (cOn !== lastComboOn) {
      lastComboOn = cOn;
      el.comboPop.classList.toggle('on', cOn);
    }
    if (cOn) {
      if (combo !== lastComboNum) { lastComboNum = combo; el.comboNum.textContent = '×' + combo; }
      el.comboBar.style.transform = 'scaleX(' + clamp(comboTimer / COMBO_WINDOW, 0, 1).toFixed(3) + ')';
    }

    /* drift chip */
    var dShow = mode === 'playing' && (drifting || driftBank >= 5);
    if (dShow !== lastDriftOn) {
      lastDriftOn = dShow;
      el.driftChip.classList.toggle('on', dShow);
      if (!dShow) el.driftChip.classList.remove('hot');
    }
    if (dShow) {
      var dv = '+' + fmt(Math.round(driftBank));
      if (dv !== lastDriftVal) { lastDriftVal = dv; el.driftVal.textContent = dv; }
      el.driftChip.classList.toggle('hot', drifting);
    }
  }

  /* ---------------- main loop ---------------- */
  var lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var realDt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    if (mode !== 'paused') {
      var ts;
      if (hitStop > 0) ts = 0.25;
      else if (mode === 'dying') ts = 0.3;
      else ts = 1;
      timeScale = lerp(timeScale, ts, damp(14, realDt));
      update(realDt * timeScale, realDt);
    }
    updateEngine();
    draw();
    updateHud();
  }

  resize();
  P.w = laneW * 0.58;
  P.h = P.w * 1.92;
  P.x = roadX + roadW / 2;
  worldSpeed = H * 0.24;
  root.dataset.mode = 'menu';
  requestAnimationFrame(frame);
})();
