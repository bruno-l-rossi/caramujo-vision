/* Caramujo Vision — módulos visuais
   Cada módulo: { name, group, defaults, schema, init(m), draw(m, d, dt, t) }
   m = instância { canvas, ctx, w, h, s (ajustes), st (estado), mouse {x,y,over} }
   d = dados de áudio do frame (ver audio.js) */

(function () {
  'use strict';

  var CV = window.CV = window.CV || {};
  CV.registry = {};
  CV.order = [];
  CV.register = function (id, def) { CV.registry[id] = def; CV.order.push(id); };

  /* ---------- paletas ---------- */
  // cada tema com 4 cores bem espalhadas (variedade dentro) e assinatura própria (distinção entre eles)
  var PALETTES = {
    // ---- FUNDO ESCURO: traço claro e saturado ----
    preto:    [[0, 0, 100], [0, 0, 74], [0, 0, 50], [0, 0, 88]],
    neon:     [[318, 100, 62], [186, 100, 56], [268, 100, 70], [92, 100, 58]],
    vhs:      [[2, 94, 56], [26, 100, 52], [44, 96, 54], [340, 86, 56]],
    oceano:   [[196, 100, 56], [172, 96, 46], [222, 92, 62], [148, 84, 48]],
    floresta: [[132, 78, 50], [88, 70, 46], [162, 82, 42], [52, 74, 52]],
    rubi:     [[350, 96, 56], [8, 100, 50], [326, 86, 50], [22, 94, 54]],
    ambar:    [[42, 100, 60], [26, 100, 52], [52, 100, 64], [12, 92, 52]],
    poente:   [[14, 100, 62], [336, 88, 62], [286, 76, 62], [40, 100, 58]],
    // ---- FUNDO CLARO: traço ESCURO, senão some no fundo ----
    papel:    [[0, 0, 8], [0, 0, 26], [0, 0, 42], [0, 0, 16]],
    gelo:     [[212, 92, 26], [192, 96, 22], [242, 72, 34], [172, 88, 22]],
    areia:    [[18, 88, 30], [2, 82, 34], [34, 92, 28], [354, 70, 26]],
    // ---- FUNDO MÉDIO: traço quente e claro ----
    ardosia:  [[44, 68, 78], [12, 74, 64], [172, 34, 74], [30, 62, 72]],
    lavanda:  [[268, 46, 22], [318, 42, 30], [230, 52, 28], [286, 38, 18]]
  };


  /* fundo por tema: contraste e temperatura mudam junto com a paleta.
     bg = fundo do painel, ink = quanto a cor "pega" na tela (grade, textos). */
  var THEME_BG = {
    // cada tema é um lugar: fundo, texto, grade e traço combinam entre si.
    // light: true avisa os módulos que o fundo é claro (traço escurece, mistura multiplica).
    preto:    { bg: '#050506', panel: '#08080a', grid: 0.06, text: '#8b8b91', ink: '#f0efe9' },
    papel:    { bg: '#e9e7e0', panel: '#f4f2ec', grid: 0.42, text: '#55554e', ink: '#121210', light: 1 },
    ardosia:  { bg: '#374545', panel: '#3e4e4e', grid: 0.18, text: '#c2ccc8', ink: '#f6ecc9' },
    neon:     { bg: '#04030e', panel: '#070618', grid: 0.1, text: '#8a86c9', ink: '#f0e9ff' },
    vhs:      { bg: '#1c0a06', panel: '#240e08', grid: 0.13, text: '#cf8a6c', ink: '#ffd6bb' },
    gelo:     { bg: '#dbe7ee', panel: '#e8f1f6', grid: 0.34, text: '#4a6270', ink: '#0d2733', light: 1 },
    areia:    { bg: '#e0d3bc', panel: '#ebe0cd', grid: 0.36, text: '#6b5a44', ink: '#241a10', light: 1 },
    oceano:   { bg: '#03121f', panel: '#051a2b', grid: 0.13, text: '#6fa2c4', ink: '#e0f4ff' },
    floresta: { bg: '#08170e', panel: '#0b1f14', grid: 0.11, text: '#79a888', ink: '#e2ffe8' },
    rubi:     { bg: '#19040a', panel: '#210610', grid: 0.11, text: '#c2758a', ink: '#ffdfe6' },
    ambar:    { bg: '#191004', panel: '#221607', grid: 0.12, text: '#c9a065', ink: '#ffecc2' },
    poente:   { bg: '#25101a', panel: '#2e1522', grid: 0.13, text: '#d18f9e', ink: '#ffe2d6' },
    lavanda:  { bg: '#cfc6e2', panel: '#ded7ec', grid: 0.34, text: '#5d5473', ink: '#1d1630', light: 1 },
    psy:      { bg: '#0a0412', panel: '#0e0619', grid: 0.09, text: '#a184c4', ink: '#f6e9ff' }
  };

  CV.themeBg = function (th) { return THEME_BG[th] || THEME_BG.preto; };
  // fundo do painel do módulo (respeita tema próprio do módulo)
  CV.bgOf = function (m) { return CV.themeBg(CV.themeOf(m)).panel; };
  // tema efetivo do módulo: o dele (m.s.theme) se escolhido, senão o global. Permite mesclar temas.
  CV.themeOf = function (m) {
    return (m && m.s && m.s.theme && m.s.theme !== 'global') ? m.s.theme : (CV.theme || 'psy');
  };
  CV.pal = function (m, idx, t) {
    if (m.s.colorMode === 'custom') return [(m.s.hue + idx * 32) % 360, 92, 60];
    var th = CV.themeOf(m);
    if (th === 'psy') return [(t * 26 + idx * 65) % 360, 95, 60];
    var p = PALETTES[th] || PALETTES.preto;
    return p[((idx % p.length) + p.length) % p.length];
  };
  CV.hsla = function (c, a) { return 'hsla(' + c[0].toFixed(1) + ',' + c[1] + '%,' + c[2] + '%,' + (a === undefined ? 1 : a) + ')'; };
  // só o tema MONO força branco puro. O PAPEL (fundo claro) passa pela paleta,
  // que já devolve tons escuros, então os módulos ficam legíveis sem código extra.
  CV.isMono = function (m) {
    if (m.s.colorMode === 'custom') return false;
    var th = CV.themeOf(m);
    return th === 'preto' || th === 'mono';
  };
  // tema de fundo claro: os módulos escurecem o traço em vez de clarear
  CV.isLight = function (m) { return !!CV.themeBg(CV.themeOf(m)).light; };
  /* mistura das camadas. Em fundo escuro, somar luz ('lighter') dá o brilho.
     Em fundo claro isso só lava tudo até sumir, então lá a gente MULTIPLICA
     (as camadas escurecem umas às outras) e o desenho ganha contraste de verdade. */
  CV.blend = function (m, c, on) {
    c.globalCompositeOperation = (on === false) ? 'source-over' : (CV.isLight(m) ? 'multiply' : 'lighter');
  };
  // rastro intuitivo: slider 0..1, quanto MAIOR mais rastro. Converte pro alpha de limpeza (menor = rastro longo).
  CV.trailClear = function (v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return 0.5 - 0.47 * v; };
  // véu de limpeza na cor de fundo DO TEMA (antes era preto fixo: por isso os temas mudavam pouco)
  CV.trailFill = function (m, v) {
    var hex = CV.bgOf(m), r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + CV.trailClear(v) + ')';
  };

  var NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  CV.noteName = function (freq) {
    if (freq < 20) return '';
    var n = Math.round(12 * Math.log2(freq / 440));
    var name = NOTES[((n % 12) + 12) % 12];
    var oct = 4 + Math.floor((n + 9) / 12);
    return name + oct;
  };
  CV.noteCents = function (freq) {
    if (freq < 20) return '';
    var nn = 12 * Math.log2(freq / 440), r = Math.round(nn);
    var name = NOTES[((r % 12) + 12) % 12];
    var oct = 4 + Math.floor((r + 9) / 12);
    var cents = Math.round((nn - r) * 100);
    return name + oct + ' ' + (cents >= 0 ? '+' : '−') + Math.abs(cents) + ' Cents';
  };
  CV.fmtHz = function (f) { return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + 'kHz' : Math.round(f) + 'Hz'; };

  var COMMON = [
    { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
    { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
    { k: 'glow', label: 'Brilho', min: 0, max: 40, step: 1, def: 14 }
  ];
  function defs(extra) {
    var d = { sens: 1, speed: 1, glow: 14, colorMode: 'theme', hue: 180, theme: 'global' };
    if (extra) for (var k in extra) d[k] = extra[k];
    return d;
  }
  function offscreen(m, key) {
    var o = m.st[key];
    if (!o || o.width !== m.canvas.width || o.height !== m.canvas.height) {
      o = document.createElement('canvas');
      o.width = Math.max(2, m.canvas.width); o.height = Math.max(2, m.canvas.height);
      m.st[key] = o;
    }
    return o;
  }
  // rótulo dentro do módulo: escurece sozinho quando o tema é de fundo claro
  function label(c, txt, x, y, align, col, m) {
    c.font = '9px "SF Mono", ui-monospace, monospace';
    c.textAlign = align || 'left';
    var dark = m && CV.isLight(m);
    c.fillStyle = col || (dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)');
    c.fillText(txt, x, y);
  }
  // linhas de grade/régua: idem, invertem no tema claro
  CV.gridInk = function (m, a) {
    return CV.isLight(m) ? 'rgba(0,0,0,' + (a * 1.6) + ')' : 'rgba(255,255,255,' + a + ')';
  };

  /* ---------- base WebGL compartilhada ---------- */
  var GLSL_LIB = [
    'precision highp float;',
    'uniform vec2 u_res; uniform vec2 u_mouse;',
    'uniform float u_t, u_bass, u_mid, u_high, u_beat, u_hue, u_sat, u_a, u_b, u_gate;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5;',
    '  for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7); a *= 0.5; } return v; }',
    'vec3 pal(float x){ vec3 c = 0.5 + 0.5*cos(6.2831*(x + vec3(0.0,0.33,0.67)));',
    '  return mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, u_sat); }'
  ].join('\n');

  CV.glSetup = function (m, fragBody) {
    var gl = m.canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) { m.st.gl = null; return; }
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }');
    var fs = sh(gl.FRAGMENT_SHADER, GLSL_LIB + '\n' + fragBody);
    if (!vs || !fs) { m.st.gl = null; return; }
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    gl.useProgram(pr);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    m.st.u = {};
    ['u_res', 'u_mouse', 'u_t', 'u_bass', 'u_mid', 'u_high', 'u_beat', 'u_hue', 'u_sat', 'u_a', 'u_b', 'u_gate'].forEach(function (n) {
      m.st.u[n] = gl.getUniformLocation(pr, n);
    });
    m.st.gl = gl;
    m.st.pt = 0;
  };

  /* velocidade do relógio interno, suavizada. O beat sobe de 0 a 1 num salto seco:
     usado cru, o visual "pula". Aqui ele entra com inércia, então o movimento é contínuo. */
  CV.rate = function (m, d, dt, base, gateAmt, beatAmt) {
    var gate = CV.gate(m, d, dt);
    var tgt = base + gate * gateAmt + (d ? d.beatPulse * beatAmt : 0);
    if (m.st.rt === undefined) m.st.rt = tgt;
    m.st.rt += (tgt - m.st.rt) * Math.min(1, dt * 7);
    return m.st.rt;
  };

  /* portão de energia: o áudio é quem molda; silêncio = quieto e apagado */
  CV.gate = function (m, d, dt) {
    var tg = d ? Math.min(1, (d.level * 5 + d.bass * 0.8) * m.s.sens) : 0;
    if (m.st.gate === undefined) m.st.gate = 0;
    m.st.gate += (tg - m.st.gate) * Math.min(1, dt * (tg > m.st.gate ? 12 : 2.5));
    return m.st.gate;
  };

  CV.glFrame = function (m, d, dt, extraA, extraB) {
    var gl = m.st.gl;
    if (!gl) return false;
    var gate = CV.gate(m, d, dt);
    // o tempo interno anda no ritmo da música: grave e beat empurram, silêncio congela.
    // a velocidade é suavizada (CV.rate), senão o beat dá um tranco no shader.
    m.st.pt += dt * m.s.speed * CV.rate(m, d, dt, 0.03, 1.1, 0.7);
    var THEME_HUE = { neon: 0.85, vhs: 0.03, poente: 0.05, gelo: 0.58, vapor: 0.86, floresta: 0.34, rubi: 0.97, oceano: 0.5, ambar: 0.1 };
    var th = CV.themeOf(m);
    var hue;
    if (m.s.colorMode === 'custom') hue = m.s.hue / 360;
    else if (THEME_HUE[th] !== undefined) hue = THEME_HUE[th];
    else hue = m.st.pt * 0.02; // psy e mono giram (mono vira cinza pelo u_sat=0)
    var mx = 0.5, my = 0.5;
    if (m.mouse && m.mouse.over) { mx = m.mouse.x / m.w; my = 1 - m.mouse.y / m.h; }
    gl.viewport(0, 0, m.canvas.width, m.canvas.height);
    gl.uniform2f(m.st.u.u_res, m.canvas.width, m.canvas.height);
    gl.uniform2f(m.st.u.u_mouse, mx, my);
    gl.uniform1f(m.st.u.u_t, m.st.pt);
    gl.uniform1f(m.st.u.u_bass, d ? Math.min(1.4, d.bass * m.s.sens * 1.5) : 0);
    gl.uniform1f(m.st.u.u_mid, d ? d.mid : 0);
    gl.uniform1f(m.st.u.u_high, d ? Math.min(1, d.high * m.s.sens * 2.2) : 0);
    gl.uniform1f(m.st.u.u_beat, d ? d.beatPulse : 0);
    gl.uniform1f(m.st.u.u_hue, hue);
    gl.uniform1f(m.st.u.u_sat, (th === 'mono' && m.s.colorMode !== 'custom') ? 0 : 1);
    gl.uniform1f(m.st.u.u_a, extraA || 0);
    gl.uniform1f(m.st.u.u_b, extraB || 0);
    gl.uniform1f(m.st.u.u_gate, gate);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  /* ================= ESPECTRO ================= */
  CV.register('spectrum', {
    name: 'Espectro', group: 'Estúdio',
    defaults: defs({ fill: 1, smooth: 1.0, nivelar: 0.7, grade: 1, glow: 8 }),
    schema: [
      { k: 'sens', label: 'Ganho', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'smooth', label: 'Suavidade', min: 0.2, max: 3, step: 0.05, def: 1.0 },
      { k: 'nivelar', label: 'Nivelar agudos', min: 0, max: 1, step: 0.05, def: 0.7 },
      { k: 'glow', label: 'Brilho da linha', min: 0, max: 40, step: 1, def: 8 },
      { k: 'grade', label: 'Grade de Hz', min: 0, max: 1, step: 1, def: 1 },
      { k: 'fill', label: 'Preenchimento', min: 0, max: 1, step: 1, def: 1 }
    ],
    init: function (m) { m.st.vals = []; m.st.slow = []; m.st.peaks = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var N = 220, f = d.freq, n = f.length, i;
      if (m.st.vals.length !== N) {
        m.st.vals = new Array(N).fill(0);
        m.st.slow = new Array(N).fill(0);
        m.st.peaks = new Array(N).fill(0);
      }
      var FMIN = 26, FMAX = 18000, binHz = 22050 / n;
      function xToFreq(x) { return FMIN * Math.pow(FMAX / FMIN, x / w); }
      function freqToX(fr) { return Math.log(fr / FMIN) / Math.log(FMAX / FMIN) * w; }
      // magnitude interpolada entre bins: tira o serrilhado, curva mais macia
      function magAt(fr) {
        var pos = fr / binHz;
        var i0 = pos | 0; if (i0 < 0) i0 = 0; if (i0 > n - 1) i0 = n - 1;
        var i1 = i0 + 1 < n ? i0 + 1 : i0, fa = pos - i0;
        return (f[i0] * (1 - fa) + f[i1] * fa) / 255;
      }
      // duas cores estilo analisador: principal quente + secundária fria
      var main, mainHi, sec;
      if (s.colorMode === 'custom') {
        main = [s.hue, 90, 56]; mainHi = [s.hue, 96, 66]; sec = [(s.hue + 205) % 360, 82, 60];
      } else {
        var cM = CV.pal(m, 0, t), cS = CV.pal(m, 2, t);
        main = [cM[0], cM[1], 56]; mainHi = [cM[0], Math.min(100, cM[1] + 8), 66]; sec = [cS[0], cS[1], 60];
      }
      var att = Math.min(1, 40 * dt / s.smooth), rel = Math.min(1, 3.6 * dt / s.smooth);
      var attS = att * 0.5, relS = rel * 0.45;
      var baseH = h * 0.92;
      for (i = 0; i < N; i++) {
        var fr = FMIN * Math.pow(FMAX / FMIN, i / (N - 1));
        var tilt = 1 + (Math.min(3.5, Math.pow(fr / 90, 0.32)) - 1) * s.nivelar;
        var v = Math.pow(magAt(fr), 1.4) * s.sens * tilt; if (v > 1) v = 1;
        var cur = m.st.vals[i];
        m.st.vals[i] = cur + (v - cur) * (v > cur ? att : rel);
        var cs = m.st.slow[i];
        m.st.slow[i] = cs + (v - cs) * (v > cs ? attS : relS);
        m.st.peaks[i] = Math.max(m.st.vals[i], m.st.peaks[i] - dt * 0.25);
      }
      // grade de frequência por décadas (100Hz / 1kHz / 10kHz marcados), como no MiniMeters
      if (s.grade >= 0.5) {
        var ticks = [30, 40, 50, 60, 80, 100, 200, 300, 400, 500, 600, 800, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000];
        var labels = { 100: '100Hz', 1000: '1kHz', 10000: '10kHz' };
        for (var g2 = 0; g2 < ticks.length; g2++) {
          var fq = ticks[g2]; if (fq < FMIN || fq > FMAX) continue;
          var gx = freqToX(fq), strong = labels[fq];
          c.strokeStyle = strong ? CV.gridInk(m, 0.16) : CV.gridInk(m, 0.055);
          c.lineWidth = 1;
          c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, h); c.stroke();
          if (strong) label(c, labels[fq], gx + 3, 11, 'left', null, m);
        }
      }
      var X = function (k) { return k / (N - 1) * w; };
      function path(arr, close) {
        c.beginPath();
        if (close) { c.moveTo(0, h); c.lineTo(0, h - arr[0] * baseH); }
        else c.moveTo(0, h - arr[0] * baseH);
        for (var k = 0; k < N - 1; k++) {
          var x0 = X(k), x1 = X(k + 1);
          var y0 = h - arr[k] * baseH, y1 = h - arr[k + 1] * baseH;
          c.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        c.lineTo(w, h - arr[N - 1] * baseH);
        if (close) { c.lineTo(w, h); c.closePath(); }
      }
      c.lineJoin = 'round';
      // 1) secundária (fria): fio fino atrás, sem gradientão
      c.strokeStyle = CV.hsla(sec, 0.5); c.lineWidth = 1; path(m.st.slow, false); c.stroke();
      // 2) principal (quente): preenchimento baixo e chapado (peso visual leve)
      if (s.fill >= 0.5) {
        path(m.st.vals, true);
        var mg = c.createLinearGradient(0, h, 0, h * 0.12);
        mg.addColorStop(0, CV.hsla(main, 0.18));
        mg.addColorStop(0.6, CV.hsla(main, 0.05));
        mg.addColorStop(1, CV.hsla(main, 0));
        c.fillStyle = mg; c.fill();
      }
      // 3) pico-hold: fio fino contínuo no lugar dos pontos soltos
      c.strokeStyle = CV.hsla(mainHi, 0.38); c.lineWidth = 1; path(m.st.peaks, false); c.stroke();
      // 4) linha principal nítida, só um respiro de brilho
      c.shadowBlur = CV.isLight(m) ? 0 : s.glow * 0.4; c.shadowColor = CV.hsla(mainHi, 1);
      c.strokeStyle = CV.hsla(mainHi, 1); c.lineWidth = 1.3; path(m.st.vals, false); c.stroke();
      c.shadowBlur = 0;
      // 5) régua de base fina
      c.strokeStyle = CV.gridInk(m, 0.09); c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h - 0.5); c.lineTo(w, h - 0.5); c.stroke();
      // hover: dB | Hz | nota + cents
      if (m.mouse && m.mouse.over) {
        var mxx = m.mouse.x, fr2 = xToFreq(mxx);
        var bin2 = Math.min(n - 1, Math.round(fr2 / binHz));
        var db = d.freq[bin2] > 0 ? (20 * Math.log10(d.freq[bin2] / 255)).toFixed(2) : '-∞';
        c.strokeStyle = CV.isLight(m) ? 'rgba(20,20,18,0.55)' : 'rgba(240,239,233,0.5)';
        c.beginPath(); c.moveTo(mxx, 0); c.lineTo(mxx, h); c.stroke();
        var txt = db + 'dB · ' + CV.fmtHz(fr2) + ' · ' + CV.noteCents(fr2);
        c.font = '10px "SF Mono", ui-monospace, monospace';
        var tw = c.measureText(txt).width;
        var tx = Math.min(w - tw - 10, Math.max(6, mxx + 8));
        var ty = Math.max(18, Math.min(h - 6, m.mouse.y));
        c.fillStyle = CV.isLight(m) ? 'rgba(245,243,236,0.92)' : 'rgba(7,7,11,0.88)';
        c.fillRect(tx - 4, ty - 22, tw + 8, 16);
        c.fillStyle = CV.isLight(m) ? '#141412' : '#f0efe9';
        c.textAlign = 'left';
        c.fillText(txt, tx, ty - 10);
      }
    }
  });

  /* ================= ONDA ROLANTE ================= */
  CV.register('wavescroll', {
    name: 'Onda rolante', group: 'Estúdio',
    defaults: defs({ smooth: 1.2, glow: 10 }),
    schema: [
      { k: 'sens', label: 'Ganho', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Rolagem', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'glow', label: 'Brilho', min: 0, max: 40, step: 1, def: 10 },
      { k: 'smooth', label: 'Suavidade', min: 0.2, max: 3, step: 0.05, def: 1.2 }
    ],
    init: function (m) { m.st.emx = 0; m.st.emn = 0; m.st.erms = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d) { c.clearRect(0, 0, w, h); return; }
      var dx = Math.max(1, Math.round(1.4 * s.speed * (m.dpr || 1)));
      bc.globalCompositeOperation = 'copy';
      bc.drawImage(buf, -dx, 0);
      CV.blend(m, bc, false);
      var td = d.time, mn = 0, mx = 0, i;
      for (i = 0; i < td.length; i++) { if (td[i] < mn) mn = td[i]; if (td[i] > mx) mx = td[i]; }
      mn *= s.sens; mx *= s.sens;
      // envelope suavizado
      var att = Math.min(1, 32 * dt / s.smooth), rel = Math.min(1, 4 * dt / s.smooth);
      m.st.emx += (mx - m.st.emx) * (mx > m.st.emx ? att : rel);
      m.st.emn += (mn - m.st.emn) * (mn < m.st.emn ? att : rel);
      var rms = Math.min(1, d.rms * 2.6 * s.sens);
      m.st.erms += (rms - m.st.erms) * (rms > m.st.erms ? att : rel);
      // cor pelo conteúdo, puxada do tema: grave numa cor do tema, agudo noutra
      var bal = Math.min(1, Math.max(0, d.centroid * 3.2 - 0.12));
      if (m.st.hueSm === undefined) m.st.hueSm = 0.5;
      m.st.hueSm += (bal - m.st.hueSm) * Math.min(1, dt * 6);
      var cLo, cHiT;
      if (s.colorMode === 'custom') { cLo = [s.hue, 90, 55]; cHiT = [(s.hue + 60) % 360, 90, 55]; }
      else { cLo = CV.pal(m, 0, t); cHiT = CV.pal(m, 2, t); }
      var dh = ((((cHiT[0] - cLo[0]) % 360) + 540) % 360) - 180; // menor caminho no círculo de cor
      var hue = ((cLo[0] + dh * m.st.hueSm) % 360 + 360) % 360;
      var satW = cLo[1] + (cHiT[1] - cLo[1]) * m.st.hueSm;
      var lite = 46 + d.rms * 80 + d.high * 34;
      var col = [hue, satW, Math.min(72, lite)];
      var colHi = [hue, Math.max(0, satW - 12), Math.min(94, lite + 26)];
      var H = buf.height, mid = H / 2, amp = H * 0.48, dpr = m.dpr || 1;
      var x = buf.width - dx;
      bc.clearRect(x, 0, dx, H);
      var y0 = mid - Math.min(1, m.st.emx) * amp;   // topo da onda
      var y1 = mid - Math.max(-1, m.st.emn) * amp;   // base da onda
      // 1) brilho externo sutil (bloom), pra não ficar chapado
      if (s.glow > 0) {
        var gpx = Math.min(H * 0.1, s.glow * 0.5 * dpr);
        CV.blend(m, bc);
        var og = bc.createLinearGradient(0, y0 - gpx, 0, y1 + gpx);
        og.addColorStop(0, CV.hsla(col, 0));
        og.addColorStop(0.5, CV.hsla(col, 0.07));
        og.addColorStop(1, CV.hsla(col, 0));
        bc.fillStyle = og;
        bc.fillRect(x, y0 - gpx, dx, (y1 - y0) + gpx * 2);
        CV.blend(m, bc, false);
      }
      // 2) corpo cheio: waveform sólida, bordas só levemente macias (como no MiniMeters)
      var g = bc.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, CV.hsla(col, 0.55));
      g.addColorStop(0.12, CV.hsla(col, 0.95));
      g.addColorStop(0.5, CV.hsla(col, 1));
      g.addColorStop(0.88, CV.hsla(col, 0.95));
      g.addColorStop(1, CV.hsla(col, 0.55));
      bc.fillStyle = g;
      bc.fillRect(x, y0, dx, Math.max(1, y1 - y0));
      // 3) núcleo RMS mais claro (leitura de energia)
      var ry = mid - m.st.erms * amp, rh = Math.max(1, m.st.erms * amp * 2);
      bc.fillStyle = CV.hsla(colHi, 0.8);
      bc.fillRect(x, ry, dx, rh);
      // 4) fios claros no meio, topo e base: rolando viram contorno nítido
      var lw = Math.max(1, dpr);
      CV.blend(m, bc);
      bc.fillStyle = CV.hsla(colHi, 0.85);
      bc.fillRect(x, y0, dx, lw);
      bc.fillRect(x, y1 - lw, dx, lw);
      bc.fillStyle = CV.hsla(colHi, 0.5);
      bc.fillRect(x, mid - lw * 0.5, dx, lw);
      CV.blend(m, bc, false);
      c.clearRect(0, 0, w, h);
      c.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, w, h);
    }
  });

  /* ================= LOUDNESS ================= */
  CV.register('loudness', {
    name: 'Loudness', group: 'Estúdio',
    defaults: defs({ glow: 8, alvo: -14 }),
    schema: [
      { k: 'glow', label: 'Brilho', min: 0, max: 40, step: 1, def: 8 },
      { k: 'alvo', label: 'Alvo (LUFS)', min: -30, max: -6, step: 1, def: -14 }
    ],
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var lufsRaw = d.lufsApprox ? d.lufsApprox() : -70;
      // número calmo de ler: sobe rápido, desce devagar (integração tipo medidor de estúdio)
      if (m.st.lufsSm === undefined) m.st.lufsSm = lufsRaw;
      // número estável: sobe com calma, desce bem devagar (não pula em 1 segundo)
      var kL = Math.min(1, dt * (lufsRaw > m.st.lufsSm ? 2.2 : 0.45));
      m.st.lufsSm += (lufsRaw - m.st.lufsSm) * kL;
      var lufs = m.st.lufsSm;
      var avg = d.lufsAvgVal !== undefined ? d.lufsAvgVal : -70;
      var LMIN = -36, LMAX = 0;
      function toY(v) { return 8 + (1 - (Math.max(LMIN, Math.min(LMAX, v)) - LMIN) / (LMAX - LMIN)) * (h - 52); }
      var col = CV.pal(m, 0, t), colHot = CV.pal(m, 3, t);
      var barW = Math.min(30, w * 0.3), x = w / 2 - barW / 2;
      // trilho e marcas da régua
      c.fillStyle = CV.gridInk(m, 0.05);
      c.fillRect(x, 8, barW, h - 52);
      [-30, -23, -14, -9, -6, -3].forEach(function (mk) {
        var y = toY(mk);
        c.fillStyle = CV.gridInk(m, 0.14);
        c.fillRect(x - 4, y, barW + 8, 1);
        label(c, String(mk), x - 8, y + 3, 'right', null, m);
      });
      // barra atual
      var yv = toY(lufs);
      var hot = lufs > -9;
      c.shadowBlur = CV.isLight(m) ? 0 : s.glow * 0.5; c.shadowColor = CV.hsla(hot ? colHot : col, 1);
      c.fillStyle = CV.hsla(hot ? colHot : col, 0.92);
      c.fillRect(x, yv, barW, 8 + (h - 52) - yv);
      c.shadowBlur = 0;
      // marcador da média
      var ya = toY(avg);
      c.fillStyle = CV.isLight(m) ? '#141412' : '#fff';
      c.fillRect(x - 6, ya - 1, barW + 12, 2);
      // marcador do alvo
      var yt = toY(s.alvo);
      c.strokeStyle = CV.isLight(m) ? 'rgba(20,20,18,0.6)' : 'rgba(240,239,233,0.6)';
      c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(x - 6, yt); c.lineTo(x + barW + 6, yt); c.stroke();
      c.setLineDash([]);
      // números
      c.fillStyle = CV.isLight(m) ? 'rgba(10,10,8,0.92)' : 'rgba(255,255,255,0.92)';
      c.font = '600 ' + Math.min(20, h * 0.14) + 'px "SF Mono", ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText(lufs <= -69 ? '-∞' : lufs.toFixed(1), w / 2, h - 24);
      c.font = '10px "SF Mono", ui-monospace, monospace';
      c.fillStyle = CV.isLight(m) ? 'rgba(10,10,8,0.55)' : 'rgba(255,255,255,0.5)';
      c.fillText('MÉD ' + (avg <= -69 ? '-∞' : avg.toFixed(1)), w / 2, h - 10);
      label(c, 'LUFS≈', w / 2, 14, 'center', null, m);
    }
  });

  /* ================= ESPAÇO ESTÉREO ================= */
  CV.register('gonio', {
    name: 'Espaço estéreo', group: 'Estúdio',
    defaults: defs({ trail: 0.7, fog: 0 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 },
      { k: 'fog', label: 'Ambiente', min: 0, max: 1.5, step: 0.05, def: 0 }
    ]),
    init: function (m) { m.st.rot = 0; m.st.wsm = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
      // inclinação leve com o mouse: sensação de olhar a sala
      var tiltX = 0, tiltY = 0;
      if (m.mouse && m.mouse.over) {
        tiltX = (m.mouse.x / w - 0.5) * 0.3;
        tiltY = (m.mouse.y / h - 0.5) * 0.3;
      }
      // névoa de ambiente: respira com o nível
      if (s.fog > 0) {
        m.st.rot += dt * 0.2 * s.speed;
        CV.blend(m, c);
        for (var fb = 0; fb < 2; fb++) {
          var fa = m.st.rot + fb * 3.1;
          var fx = cx + Math.cos(fa) * R * 0.35, fy = cy + Math.sin(fa) * R * 0.25;
          var fr = R * (0.5 + d.level * 2);
          var fg = c.createRadialGradient(fx, fy, 0, fx, fy, fr);
          var fcol = CV.pal(m, fb, t);
          fg.addColorStop(0, CV.hsla(fcol, Math.min(0.14, d.level * 1.2) * s.fog));
          fg.addColorStop(1, CV.hsla(fcol, 0));
          c.fillStyle = fg;
          c.fillRect(0, 0, w, h);
        }
        CV.blend(m, c, false);
      }
      // nuvem orgânica de amostras: sem grade, sem mira
      var L = d.timeL, Rr = d.timeR, n = Math.min(L.length, Rr.length);
      var sc = R * s.sens;
      var mono = CV.isMono(m);
      CV.blend(m, c);
      // PERFORMANCE: fillRect no lugar de arc (era ~340 arcos por quadro, bem mais caro)
      for (var i = 0; i < n; i += 3) {
        var x = (L[i] - Rr[i]) * 0.707, y = -(L[i] + Rr[i]) * 0.707;
        var depth = 1 - i / n; // amostra recente = mais perto
        var r2 = Math.sqrt(x * x + y * y);
        var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor(r2 * 8), t);
        var sz = 0.6 + depth * 1.6 + r2 * 2.4;
        c.fillStyle = CV.hsla(col, Math.min(0.6, (0.05 + r2 * 1.3) * (0.35 + depth)));
        c.fillRect(cx + x * sc * (1 + tiltX) - sz * 0.5, cy + y * sc * (0.9 + tiltY) - sz * 0.5, sz, sz);
      }
      CV.blend(m, c, false);
      // largura estéreo: barra discreta na base
      var sMid = 0, sSide = 0;
      for (i = 0; i < n; i += 4) {
        var md = (L[i] + Rr[i]) * 0.5, sd = (L[i] - Rr[i]) * 0.5;
        sMid += md * md; sSide += sd * sd;
      }
      var width = Math.sqrt(sSide) / (Math.sqrt(sMid) + 0.0001);
      m.st.wsm += (Math.min(1.4, width) - m.st.wsm) * Math.min(1, dt * 4);
      var acc = mono ? [0, 0, 90] : CV.pal(m, 2, t);
      var bw = Math.min(1, m.st.wsm) * w * 0.6;
      c.fillStyle = CV.gridInk(m, 0.06);
      c.fillRect(w * 0.2, h - 12, w * 0.6, 2);
      c.fillStyle = CV.hsla(acc, 0.75);
      c.fillRect(w / 2 - bw / 2, h - 12, bw, 2);
      label(c, 'L', w * 0.2 - 10, h - 8, 'left', null, m);
      label(c, 'R', w * 0.8 + 4, h - 8, 'left', null, m);
    }
  });

  /* ================= OSCILOSCÓPIO ================= */
  CV.register('scope', {
    name: 'Osciloscópio', group: 'Estúdio',
    defaults: defs({ trail: 0.6, glow: 8, linhas: 1, fosforo: 0 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.6 },
      { k: 'linhas', label: 'Camadas', min: 1, max: 3, step: 1, def: 1 },
      { k: 'fosforo', label: 'Verde fósforo', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      // linha central de referência (leitura de instrumento)
      c.strokeStyle = CV.gridInk(m, 0.07); c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h / 2 + 0.5); c.lineTo(w, h / 2 + 0.5); c.stroke();
      var td = d.time, n = td.length;
      var start = 0;
      for (var i = 1; i < n / 2; i++) if (td[i - 1] <= 0 && td[i] > 0) { start = i; break; }
      var span = Math.floor(n / 2);
      var layers = Math.round(s.linhas);
      c.lineJoin = 'round';
      for (var ly = 0; ly < layers; ly++) {
        var col;
        if (s.fosforo >= 0.5) col = [130, 90, 62]; // verde de osciloscópio antigo (opcional)
        else col = CV.isMono(m) ? [0, 0, 96] : CV.pal(m, ly, t);
        var off = ly * 40, ampMul = 1 - ly * 0.25;
        c.shadowBlur = CV.isLight(m) ? 0 : s.glow * 0.4; c.shadowColor = CV.hsla(col, 1);
        c.strokeStyle = CV.hsla(col, 0.95 - ly * 0.3);
        c.lineWidth = 1.3 - ly * 0.3; c.beginPath();
        for (i = 0; i < span; i++) {
          var x = i / (span - 1) * w;
          var y = h / 2 - td[(start + i + off) % n] * s.sens * h * 0.44 * ampMul;
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      c.shadowBlur = 0;
    }
  });

  /* ================= ESPECTROGRAMA ================= */
  CV.register('spectrogram', {
    name: 'Espectrograma', group: 'Estúdio',
    defaults: defs({ contraste: 1.5 }),
    schema: [
      { k: 'sens', label: 'Ganho', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Rolagem', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'contraste', label: 'Contraste', min: 0.6, max: 3, step: 0.05, def: 1.5 }
    ],
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d) { c.clearRect(0, 0, w, h); return; }
      var dx = Math.max(1, Math.round(1.2 * s.speed * (m.dpr || 1)));
      bc.globalCompositeOperation = 'copy';
      bc.drawImage(buf, -dx, 0);
      CV.blend(m, bc, false);
      var H = buf.height, n = d.freq.length;
      var FMIN = 30, FMAX = 16000;
      bc.clearRect(buf.width - dx, 0, dx, H);
      var rows = Math.min(160, H);
      for (var r = 0; r < rows; r++) {
        var fr = FMIN * Math.pow(FMAX / FMIN, 1 - r / (rows - 1));
        var bin = Math.min(n - 1, Math.round(fr / (22050 / n)));
        var v = Math.pow(d.freq[bin] / 255, s.contraste) * s.sens; if (v > 1) v = 1;
        if (v < 0.05) continue;
        var col;
        if (m.s.colorMode !== 'custom' && CV.themeOf(m) === 'mono') col = [0, 0, v * 100];
        else { var base = CV.pal(m, 0, t); col = [(base[0] + v * 70) % 360, base[1], 12 + v * 55]; }
        bc.fillStyle = CV.hsla(col, Math.min(1, 0.15 + v));
        bc.fillRect(buf.width - dx, r / rows * H, dx, H / rows + 1);
      }
      c.clearRect(0, 0, w, h);
      c.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, w, h);
      // hover: qual frequência é essa linha
      if (m.mouse && m.mouse.over) {
        var fr2 = FMIN * Math.pow(FMAX / FMIN, 1 - m.mouse.y / h);
        c.strokeStyle = CV.isLight(m) ? 'rgba(20,20,18,0.5)' : 'rgba(240,239,233,0.45)';
        c.beginPath(); c.moveTo(0, m.mouse.y); c.lineTo(w, m.mouse.y); c.stroke();
        var txt = CV.fmtHz(fr2) + ' · ' + CV.noteName(fr2);
        c.font = '10px "SF Mono", ui-monospace, monospace';
        var tw = c.measureText(txt).width;
        c.fillStyle = CV.isLight(m) ? 'rgba(245,243,236,0.9)' : 'rgba(7,7,11,0.85)';
        c.fillRect(6, m.mouse.y - 20, tw + 8, 15);
        c.fillStyle = CV.isLight(m) ? '#141412' : '#f0efe9';
        c.textAlign = 'left';
        c.fillText(txt, 10, m.mouse.y - 8);
      }
    }
  });

  /* ================= PSY (líquido) ================= */
  var PSY_FRAG = [
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);',
    '  vec2 mo = (u_mouse - 0.5) * 2.0;',
    '  float t = u_t;',
    '  vec2 p = uv * u_b;',
    '  p += mo * 0.4 * u_a * 0.125;',
    '  vec2 q = vec2(fbm(p + t*0.10), fbm(p + vec2(5.2,1.3) - t*0.13));',
    '  float mdist = length(uv - mo*0.5);',
    '  float mpush = exp(-mdist*3.0) * u_a * 0.125;',
    '  vec2 r = vec2(fbm(p + (3.0 + u_bass*4.0 + mpush*3.0)*q + t*0.15), fbm(p + 4.0*q + vec2(8.3,2.8) - t*0.12));',
    '  float f = fbm(p + u_a * r);',
    '  float hue = u_hue + f*1.2 + u_bass*0.25 + mpush*0.4;',
    '  vec3 col = pal(hue);',
    '  float lum = 0.05 + f*f*(0.75 + u_bass*1.3) + u_bass*0.7 + mpush*0.5;',
    '  col *= lum;',
    '  col += u_high * 0.32 * pow(noise(p*40.0 + t*8.0), 6.0);',
    '  col += u_beat * 0.15;',
    '  float vig = 1.0 - dot(uv,uv)*0.68;',
    '  gl_FragColor = vec4(col * vig * (0.02 + 0.98*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('psy', {
    name: 'PSY (líquido)', group: 'Arte', webgl: true,
    defaults: defs({ warp: 3, zoom: 1.6, mousef: 1 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'warp', label: 'Derretimento', min: 0.5, max: 8, step: 0.1, def: 3 },
      { k: 'zoom', label: 'Zoom', min: 0.5, max: 4, step: 0.05, def: 1.6 },
      { k: 'mousef', label: 'Reação ao mouse', min: 0, max: 2, step: 0.1, def: 1 }
    ],
    init: function (m) { CV.glSetup(m, PSY_FRAG); },
    draw: function (m, d, dt, t) {
      // u_a carrega derretimento * reação-mouse; o grave aumenta o derretimento
      var warp = m.s.warp * (0.5 + (d ? d.bass * m.s.sens * 1.3 : 0)) * (m.mouse && m.mouse.over ? (1 + m.s.mousef * 0.4) : 1);
      if (!CV.glFrame(m, d, dt, warp, m.s.zoom)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, m.w, m.h);
      }
    }
  });

  /* ================= TÚNEL ================= */
  var TUNNEL_FRAG = [
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);',
    '  vec2 mo = (u_mouse - 0.5) * 0.6;',
    '  uv -= mo;',
    '  float t = u_t;',
    '  float r = length(uv) + 0.0001;',
    '  float a = atan(uv.y, uv.x);',
    '  float seg = max(2.0, u_a);',
    '  float wedge = 6.2831 / seg;',
    '  a = abs(mod(a, wedge) - wedge*0.5);',
    '  float depth = u_b / r + t * 1.6;',
    '  float stripes = 0.5 + 0.5*sin(depth*3.0 - t*2.0 + u_bass*4.0);',
    '  float tex = fbm(vec2(a*4.0, depth*0.5));',
    '  float rings = smoothstep(0.35, 0.0, abs(fract(depth*0.5 + u_beat*0.3) - 0.5) - u_beat*0.15);',
    '  vec3 col = pal(u_hue + depth*0.06 + a*0.25 + tex*0.3);',
    '  col *= (0.14 + stripes*0.5 + tex*0.6) * (0.55 + u_bass*0.9);',
    '  col += pal(u_hue + 0.5) * rings * (0.12 + u_beat*0.5);',
    '  col += u_high * 0.26 * pow(noise(vec2(a*30.0, depth*2.0) + t*4.0), 5.0);',
    '  col *= smoothstep(0.0, 0.14, r);',
    '  float vig = 1.0 - dot(uv,uv)*0.52;',
    '  gl_FragColor = vec4(col * vig * (0.02 + 0.98*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('tunnel', {
    name: 'Túnel', group: 'Arte', webgl: true,
    defaults: defs({ seg: 8, zoom: 0.6 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'seg', label: 'Espelhos', min: 2, max: 16, step: 1, def: 8 },
      { k: 'zoom', label: 'Profundidade', min: 0.2, max: 1.5, step: 0.05, def: 0.6 }
    ],
    init: function (m) { CV.glSetup(m, TUNNEL_FRAG); },
    draw: function (m, d, dt, t) {
      if (!CV.glFrame(m, d, dt, m.s.seg, m.s.zoom)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, m.w, m.h);
      }
    }
  });

  /* ================= LISSAJOUS ================= */
  CV.register('lissa', {
    name: 'Lissajous', group: 'Arte',
    defaults: defs({ trail: 0.8, modo: 0, glow: 7 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.8 },
      { k: 'modo', label: 'Harmônico', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) { m.st.rot = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var rotSpeed = 0.02 + gate * 0.35;
      if (m.mouse && m.mouse.over) rotSpeed += (m.mouse.x / w - 0.5) * 1.2;
      m.st.rot += dt * rotSpeed * s.speed;
      var cx = w / 2, cy = h / 2, sc = Math.min(w, h) * 0.42;
      if (m.mouse && m.mouse.over) sc *= 1 + (0.5 - m.mouse.y / h) * 0.5;
      var col = CV.pal(m, 0, t);
      c.save();
      c.translate(cx, cy); c.rotate(m.st.rot);
      CV.blend(m, c);
      c.shadowBlur = CV.isLight(m) ? 0 : s.glow * 0.5; c.shadowColor = CV.hsla(col, 1);
      if (s.modo >= 0.5) {
        var a = 2 + Math.round(d.bass * s.sens * 5), b2 = 3 + Math.round(d.high * s.sens * 6);
        var ph = t * 0.5 * s.speed, amp = sc * (0.12 + d.level * 3 * s.sens) * (0.2 + 0.8 * gate);
        c.strokeStyle = CV.hsla(col, 0.32 * (0.1 + 0.9 * gate));
        c.lineWidth = 0.9;
        c.beginPath();
        var STEPS = 700;
        for (var i2 = 0; i2 <= STEPS; i2++) {
          var u = i2 / STEPS * 6.283 * 2;
          var x2 = Math.sin(a * u + ph) * amp * (0.8 + 0.2 * Math.sin(u * 3 + t));
          var y2 = Math.sin(b2 * u) * amp * (0.8 + 0.2 * Math.cos(u * 2 - t));
          i2 === 0 ? c.moveTo(x2, y2) : c.lineTo(x2, y2);
        }
        c.stroke();
      } else {
        var L = d.timeL, R = d.timeR, n = Math.min(L.length, R.length);
        c.lineWidth = 0.7;
        for (var layer = 0; layer < 3; layer++) {
          var off = layer * 90;
          var cl = CV.pal(m, layer, t);
          c.strokeStyle = CV.hsla(cl, 0.24 * (0.1 + 0.9 * gate));
          c.beginPath();
          for (var j = 0; j + off < n; j += 4) {
            var x3 = L[j] * sc * s.sens * (1 + layer * 0.15);
            var y3 = R[j + off] * sc * s.sens * (1 + layer * 0.15);
            j === 0 ? c.moveTo(x3, y3) : c.lineTo(x3, y3);
          }
          c.stroke();
        }
      }
      c.restore();
      CV.blend(m, c, false);
      c.shadowBlur = 0;
    }
  });

  /* ================= TRAÇO (linha viva) ================= */
  CV.register('trace', {
    name: 'Traço', group: 'Arte',
    defaults: defs({ glow: 4, trail: 0.7, tensao: 1 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 },
      { k: 'tensao', label: 'Tensão', min: 0.2, max: 3, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.ys = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var N = 140, i;
      if (!m.st.ys) { m.st.ys = new Float32Array(N); m.st.pt = 0; }
      m.st.pt += dt * s.speed * (0.05 + gate * 1.4);
      var pt2 = m.st.pt, ys = m.st.ys;
      var td = d.time, step = Math.floor(td.length / N);
      var k = Math.min(1, dt * (4 + s.tensao * 8));
      for (i = 0; i < N; i++) {
        var env = Math.sin(i / (N - 1) * Math.PI); // pontas presas nas bordas
        var wave = td[i * step] * h * 0.34 * s.sens;
        var drift = Math.sin(i * 0.05 + pt2 * 2.0) * Math.cos(i * 0.021 - pt2 * 1.3) * h * 0.22 * (0.3 + d.mid * 1.6);
        ys[i] += ((wave + drift) * env * gate - ys[i]) * k;
      }
      // tensão: a linha se alisa como corda
      for (var pass = 0; pass < 2; pass++)
        for (i = 1; i < N - 1; i++) ys[i] += ((ys[i - 1] + ys[i + 1]) * 0.5 - ys[i]) * 0.5;
      var col = CV.isMono(m) ? [0, 0, 96] : CV.pal(m, 0, t);
      c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1);
      c.strokeStyle = CV.hsla(col, 0.3 + gate * 0.6);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(0, h / 2 + ys[0]);
      for (i = 1; i < N - 1; i++) {
        var x0 = i / (N - 1) * w, x1 = (i + 1) / (N - 1) * w;
        c.quadraticCurveTo(x0, h / 2 + ys[i], (x0 + x1) / 2, h / 2 + (ys[i] + ys[i + 1]) / 2);
      }
      c.lineTo(w, h / 2 + ys[N - 1]);
      c.stroke();
      c.shadowBlur = 0;
    }
  });

  /* ================= CAMPO DE FLUXO ================= */
  CV.register('flow', {
    name: 'Campo de fluxo', group: 'Arte',
    defaults: defs({ glow: 2, dens: 1, trail: 0.8 }),
    schema: COMMON.concat([
      { k: 'dens', label: 'Densidade', min: 0.3, max: 2.5, step: 0.05, def: 1 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.8 }
    ]),
    init: function (m) { m.st.ps = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.03 + gate * 0.9 + d.beatPulse * 0.5);
      var pt2 = m.st.pt;
      var ps = m.st.ps, want = Math.round(520 * s.dens);
      while (ps.length < want) ps.push({ x: Math.random() * w, y: Math.random() * h, life: Math.random(), b: Math.random() });
      if (ps.length > want) ps.length = want;
      var energy = Math.min(1.2, (d.level * 4 + d.bass * 0.6) * s.sens);
      var k1 = 0.011, k2 = 0.014, turb = 1 + d.bass * s.sens * 2.5;
      CV.blend(m, c);
      var mono = CV.isMono(m);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        var a = (Math.sin(p.y * k1 + pt2 * 1.7) + Math.cos(p.x * k2 - pt2 * 1.2)) * Math.PI * turb;
        var v = (6 + energy * 170) * dt;
        p.x += Math.cos(a) * v;
        p.y += Math.sin(a) * v;
        p.x += (Math.random() - 0.5) * d.high * s.sens * 5;
        p.y += (Math.random() - 0.5) * d.high * s.sens * 5;
        p.life -= dt * 0.22;
        if (p.life <= 0 || p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4) {
          p.x = Math.random() * w; p.y = Math.random() * h; p.life = 1; p.b = Math.random();
          continue;
        }
        var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor(p.b * 4), t);
        var star2 = p.b > 0.92;
        var bright = star2 ? 0.7 : 0.16; // poucas estrelas, muito pó
        c.fillStyle = CV.hsla(col, (0.03 + bright * p.life * (0.25 + energy)) * (0.1 + 0.9 * gate));
        // PERFORMANCE: o brilho não liga/desliga por partícula (era o gargalo); as estrelas
        // ficam maiores em vez de ganharem sombra individual.
        c.fillRect(p.x, p.y, star2 ? 2.2 : 1.1, star2 ? 2.2 : 1.1);
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= ASCII ================= */
  CV.register('ascii', {
    name: 'ASCII', group: 'Arte',
    defaults: defs({ cel: 14, texto: ' .:-=+*#%@' }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'cel', label: 'Tamanho da célula', min: 10, max: 26, step: 1, def: 14 },
      { k: 'texto', label: 'Símbolos (escuro→claro)', type: 'text', def: ' .:-=+*#%@' }
    ],
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.05 + gate * 1.3);
      var pt2 = m.st.pt;
      var ramp = (s.texto && s.texto.length > 1) ? s.texto : ' .:-=+*#%@';
      var cell = Math.max(8, s.cel);
      var cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      var f = d.freq, n = f.length;
      c.font = (cell * 0.9) + 'px "SF Mono", ui-monospace, monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var mono = CV.isMono(m);
      for (var x = 0; x < cols; x++) {
        var fr = 30 * Math.pow(16000 / 30, x / Math.max(1, cols - 1));
        var bin = Math.min(n - 1, Math.round(fr / (22050 / n)));
        var spec = Math.pow(f[bin] / 255, 1.3) * s.sens;
        for (var y = 0; y < rows; y++) {
          var ny = y / Math.max(1, rows - 1);
          var bulge = 1 - Math.abs(ny * 2 - 1); // mais forte no meio
          var flow = 0.5 + 0.5 * Math.sin(x * 0.32 + pt2 * 2.4 + 2.2 * Math.sin(y * 0.48 - pt2 * 1.1));
          var v = spec * bulge * (0.35 + 0.65 * flow) * (0.15 + 0.85 * gate);
          if (v < 0.05) continue;
          if (v > 1) v = 1;
          var ch = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
          var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor(v * 3), t);
          c.fillStyle = CV.hsla(col, 0.12 + v * 0.85);
          c.fillText(ch, x * cell + cell / 2, y * cell + cell / 2);
        }
      }
    }
  });

  /* ================= ONDAS EM CAMADAS ================= */
  CV.register('wavelayers', {
    name: 'Ondas em camadas', group: 'Arte',
    defaults: defs({ glow: 3, camadas: 14 }),
    schema: COMMON.concat([{ k: 'camadas', label: 'Camadas', min: 6, max: 24, step: 1, def: 14 }]),
    init: function (m) { m.st.hist = []; m.st.skip = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var K = Math.round(s.camadas);
      // guarda um retrato da onda a cada 3 frames
      if (++m.st.skip % Math.max(1, Math.round(3 / s.speed)) === 0) {
        var td = d.time, P = 96, snap = new Float32Array(P);
        var stp = Math.floor(td.length / P);
        for (var i = 0; i < P; i++) snap[i] = td[i * stp];
        m.st.hist.push(snap);
        if (m.st.hist.length > K) m.st.hist.shift();
      }
      var hist = m.st.hist, L = hist.length;
      if (!L) return;
      var mono = CV.isMono(m);
      var pad = h * 0.12, span = h - pad * 2;
      for (var j = 0; j < L; j++) {
        var depth = j / Math.max(1, L - 1); // 1 = mais recente, embaixo
        var snap2 = hist[j];
        var yBase = pad + depth * span;
        var amp = h * 0.16 * s.sens * (0.4 + depth * 0.6) * (0.15 + 0.85 * gate);
        var col = mono ? [0, 0, 100] : CV.pal(m, j, t);
        var alpha = 0.08 + depth * 0.72;
        if (depth > 0.9 && s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
        c.strokeStyle = CV.hsla(col, alpha);
        c.lineWidth = 0.8 + depth * 0.7;
        c.beginPath();
        for (var x2 = 0; x2 < snap2.length; x2++) {
          var px = x2 / (snap2.length - 1) * w;
          var py = yBase - Math.abs(snap2[x2]) * amp - snap2[x2] * amp * 0.4;
          x2 === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.stroke();
        c.shadowBlur = 0;
      }
    }
  });

  /* ================= FITA (linhas de seda) ================= */
  CV.register('silk', {
    name: 'Fita (seda)', group: 'Arte',
    defaults: defs({ trail: 0.82, fios: 5, glow: 5 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.82 },
      { k: 'fios', label: 'Fios', min: 2, max: 9, step: 1, def: 5 }
    ]),
    init: function (m) { m.st.threads = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var want = Math.round(s.fios);
      while (m.st.threads.length < want) {
        var idx = m.st.threads.length;
        m.st.threads.push({ i: idx, hist: [], r: 0, rv: 0 });
      }
      if (m.st.threads.length > want) m.st.threads.length = want;
      var cx = w / 2, cy = h / 2, base = Math.min(w, h);
      var gate = CV.gate(m, d, dt);
      var bass = d.bass * s.sens, high = d.high * s.sens;
      // o relógio dos fios é a música: sem som eles param no lugar
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * (0.05 + gate * 1.4 + d.beatPulse * 0.6);
      var pt2 = m.st.pt;
      CV.blend(m, c);
      m.st.threads.forEach(function (th) {
        var i = th.i;
        var sp = s.speed * (0.5 + i * 0.09);
        var ang = pt2 * sp * 0.9 + i * (6.283 / m.st.threads.length);
        // raio com mola: beat dá o coice, silêncio recolhe pro centro
        var rT = base * (0.04 + (0.12 + 0.14 * Math.sin(pt2 * 0.37 + i * 1.3)) * gate) * (1 + bass * 0.9);
        if (d.beat) th.rv += base * 0.5;
        th.rv += (rT - th.r) * 8 * dt - th.rv * 4 * dt;
        th.r += th.rv * dt;
        var wob = Math.sin(pt2 * 3.1 + i * 2.2) * base * 0.05 * (1 + d.mid * 2) * gate;
        var hx = cx + Math.cos(ang) * (th.r + wob);
        var hy = cy + Math.sin(ang * 1.3 + i) * (th.r * 0.8 + wob);
        // se o mouse está em cima, os fios correm atrás dele
        if (m.mouse && m.mouse.over) {
          hx = hx * 0.45 + m.mouse.x * 0.55;
          hy = hy * 0.45 + m.mouse.y * 0.55;
        }
        // agudo treme a mão
        hx += (Math.random() - 0.5) * high * 14;
        hy += (Math.random() - 0.5) * high * 14;
        th.hist.push([hx, hy]);
        if (th.hist.length > 70) th.hist.shift();
        var nseg = th.hist.length;
        for (var k2 = 1; k2 < nseg; k2++) {
          var age = k2 / nseg; // 1 = mais recente
          var cl = CV.pal(m, i + Math.floor(age * 2), t + age * 0.4);
          c.strokeStyle = CV.hsla(cl, (0.05 + age * 0.5) * (0.1 + 0.9 * gate));
          c.lineWidth = 0.5 + age * 2.6 * (0.6 + bass);
          c.shadowBlur = CV.isLight(m) ? 0 : s.glow * age; c.shadowColor = CV.hsla(cl, 1);
          c.beginPath();
          c.moveTo(th.hist[k2 - 1][0], th.hist[k2 - 1][1]);
          c.lineTo(th.hist[k2][0], th.hist[k2][1]);
          c.stroke();
        }
      });
      c.shadowBlur = 0;
      CV.blend(m, c, false);
    }
  });

  /* ================= TERRENO (ondas em camadas viram montanha 3D) ================= */
  CV.register('terreno', {
    name: 'Terreno', group: 'Arte',
    defaults: defs({ glow: 3, camadas: 18, relevo: 1 }),
    schema: COMMON.concat([
      { k: 'camadas', label: 'Cordilheiras', min: 8, max: 32, step: 1, def: 18 },
      { k: 'relevo', label: 'Relevo do grave', min: 0, max: 2, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.hist = []; m.st.skip = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var K = Math.round(s.camadas);
      // um retrato da onda a cada poucos frames: a cordilheira rola pra frente
      if (++m.st.skip % Math.max(1, Math.round(2 / s.speed)) === 0) {
        var td = d.time, P = 128, snap0 = new Float32Array(P), stp = Math.floor(td.length / P);
        for (var i0 = 0; i0 < P; i0++) snap0[i0] = td[i0 * stp];
        m.st.hist.push({ w: snap0, bass: d.bass * s.sens });
        if (m.st.hist.length > K) m.st.hist.shift();
      }
      var hist = m.st.hist, L = hist.length;
      if (!L) return;
      var mono = CV.isMono(m), cx = w / 2;
      var horizon = h * 0.28, span = h - horizon;
      // de trás (perto do horizonte, pequeno) pra frente (embaixo, grande): o de frente cobre o de trás = 3D
      for (var j = 0; j < L; j++) {
        var depth = j / Math.max(1, L - 1);
        var row = hist[L - 1 - j];
        var persp = 0.28 + depth * 0.72;
        var yBase = horizon + Math.pow(depth, 1.35) * span;
        var amp = h * 0.16 * s.sens * (0.35 + depth * 0.9) * (1 + row.bass * 1.6 * s.relevo) * (0.15 + 0.85 * gate);
        var snap = row.w, PN = snap.length;
        var col = mono ? [0, 0, 92] : CV.pal(m, j, t);
        c.beginPath();
        c.moveTo(cx - (w / 2) * persp, yBase);
        for (var x2 = 0; x2 < PN; x2++) {
          var px = cx + ((x2 / (PN - 1)) - 0.5) * w * persp;
          var py = yBase - Math.abs(snap[x2]) * amp - snap[x2] * amp * 0.35;
          c.lineTo(px, py);
        }
        c.lineTo(cx + (w / 2) * persp, yBase);
        c.lineTo(cx + (w / 2) * persp, h);
        c.lineTo(cx - (w / 2) * persp, h);
        c.closePath();
        var g = c.createLinearGradient(0, yBase - amp, 0, yBase + span * 0.25);
        g.addColorStop(0, CV.hsla([col[0], col[1], Math.min(82, col[2] * (0.6 + depth))], 0.92));
        g.addColorStop(1, 'rgba(5,5,8,' + (0.85 + depth * 0.15) + ')');
        c.fillStyle = g; c.fill();
        if (depth > 0.55 && s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
        c.strokeStyle = CV.hsla([col[0], col[1], Math.min(92, 55 + depth * 45)], 0.32 + depth * 0.6);
        c.lineWidth = 0.6 + depth * 1.2;
        c.beginPath();
        for (var x3 = 0; x3 < PN; x3++) {
          var px2 = cx + ((x3 / (PN - 1)) - 0.5) * w * persp;
          var py2 = yBase - Math.abs(snap[x3]) * amp - snap[x3] * amp * 0.35;
          x3 === 0 ? c.moveTo(px2, py2) : c.lineTo(px2, py2);
        }
        c.stroke();
        c.shadowBlur = 0;
      }
    }
  });

  /* ================= HARMONÓGRAFO (pêndulos desenhando teias finas) ================= */
  CV.register('harmonografo', {
    name: 'Harmonógrafo', group: 'Arte',
    defaults: defs({ trail: 0.06, glow: 4, fios: 2 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Persistência', min: 0.01, max: 0.2, step: 0.005, def: 0.04 },
      { k: 'fios', label: 'Canetas', min: 1, max: 4, step: 1, def: 2 }
    ]),
    init: function (m) { m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.05 + gate * 1.2 + d.beatPulse * 0.4);
      var pt2 = m.st.pt, cx = w / 2, cy = h / 2, sc = Math.min(w, h) * 0.4;
      // frequências dos pêndulos levemente destoadas pelo áudio: a teia respira
      var f1 = 2 + Math.round(d.bass * s.sens * 3), f2 = 3 + Math.round(d.high * s.sens * 4);
      var amp = sc * (0.4 + d.level * 2.2 * s.sens) * (0.2 + 0.8 * gate);
      var pens = Math.round(s.fios), mono = CV.isMono(m);
      var a2 = (m.mouse && m.mouse.over) ? (m.mouse.x / w - 0.5) * 2 : 0;
      var ca = Math.cos(a2), sa = Math.sin(a2);
      CV.blend(m, c);
      c.lineWidth = 0.7;
      for (var p = 0; p < pens; p++) {
        var col = mono ? [0, 0, 94] : CV.pal(m, p, t);
        var ph = pt2 * 0.5 + p * 1.7, phase = p * 0.6;
        c.strokeStyle = CV.hsla(col, 0.1 + 0.35 * gate);
        if (s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
        c.beginPath();
        var STEPS = 480;
        for (var i = 0; i <= STEPS; i++) {
          var u = i / STEPS * 6.283 * 3;
          var env = Math.exp(-u * 0.02 * (0.6 + p * 0.1));
          var x = (Math.sin(f1 * u + ph) + Math.sin((f1 + 0.4) * u + phase) * 0.4) * amp * env;
          var y = (Math.sin(f2 * u + phase) + Math.sin((f2 + 0.3) * u - ph) * 0.4) * amp * env;
          var xr = x * ca - y * sa, yr = x * sa + y * ca;
          i === 0 ? c.moveTo(cx + xr, cy + yr) : c.lineTo(cx + xr, cy + yr);
        }
        c.stroke();
        c.shadowBlur = 0;
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= ENXAME (bando de pontos: beat espanta, música reagrupa) ================= */
  CV.register('enxame', {
    name: 'Enxame', group: 'Arte',
    defaults: defs({ glow: 2, dens: 1, trail: 0.7 }),
    schema: COMMON.concat([
      { k: 'dens', label: 'Tamanho do bando', min: 0.3, max: 2, step: 0.05, def: 1 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 }
    ]),
    init: function (m) { m.st.ps = []; m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var ps = m.st.ps, want = Math.round(90 * s.dens);
      while (ps.length < want) ps.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, b: Math.random() });
      if (ps.length > want) ps.length = want;
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.2 + gate * 0.9);
      // bando persegue um alvo que passeia; o mouse chama pra ele
      var tx = w * (0.5 + 0.34 * Math.sin(m.st.pt * 0.6));
      var ty = h * (0.5 + 0.34 * Math.cos(m.st.pt * 0.47));
      if (m.mouse && m.mouse.over) { tx = m.mouse.x; ty = m.mouse.y; }
      var scatter = d.beat, energy = Math.min(1.4, (d.level * 3.5 + d.bass) * s.sens);
      var mono = CV.isMono(m), n = ps.length, i, j;
      for (i = 0; i < n; i++) {
        var p = ps[i];
        var dxc = tx - p.x, dyc = ty - p.y, dist = Math.sqrt(dxc * dxc + dyc * dyc) + 0.001;
        var pull = (0.5 + energy * 1.6) * (0.25 + 0.75 * gate);
        p.vx += (dxc / dist) * pull; p.vy += (dyc / dist) * pull;
        if (scatter) { p.vx -= (dxc / dist) * (90 + p.b * 160); p.vy -= (dyc / dist) * (90 + p.b * 160); }
        p.vx += (Math.random() - 0.5) * d.high * s.sens * 20;
        p.vy += (Math.random() - 0.5) * d.high * s.sens * 20;
        p.vx *= 0.92; p.vy *= 0.92;
        p.x += p.vx * dt * 6; p.y += p.vy * dt * 6;
        if (p.x < 0) { p.x = 0; p.vx *= -0.6; } else if (p.x > w) { p.x = w; p.vx *= -0.6; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.6; } else if (p.y > h) { p.y = h; p.vy *= -0.6; }
      }
      // fios entre nós próximos. PERFORMANCE: junta os fios em 4 camadas de opacidade
      // e desenha 4 traços no total, em vez de um traço por par (eram milhares por quadro).
      var linkD = Math.min(w, h) * (0.22 + 0.12 * gate), linkD2 = linkD * linkD;
      CV.blend(m, c);
      var lcol = mono ? [0, 0, 100] : CV.pal(m, 0, t);
      c.lineWidth = 1;
      var BK = 4, buckets = m.st.bk;
      if (!buckets) { buckets = m.st.bk = []; for (i = 0; i < BK; i++) buckets.push([]); }
      for (i = 0; i < BK; i++) buckets[i].length = 0;
      for (i = 0; i < n; i++) {
        var a = ps[i];
        for (j = i + 1; j < n; j++) {
          var b = ps[j], ddx = a.x - b.x, ddy = a.y - b.y, dd2 = ddx * ddx + ddy * ddy;
          if (dd2 > linkD2) continue;
          var near = 1 - Math.sqrt(dd2) / linkD;
          var bi = (near * near * BK) | 0; if (bi > BK - 1) bi = BK - 1;
          buckets[bi].push(a.x, a.y, b.x, b.y);
        }
      }
      for (i = 0; i < BK; i++) {
        var arr = buckets[i]; if (!arr.length) continue;
        c.strokeStyle = CV.hsla(lcol, ((i + 0.5) / BK) * (0.05 + 0.5 * gate));
        c.beginPath();
        for (j = 0; j < arr.length; j += 4) { c.moveTo(arr[j], arr[j + 1]); c.lineTo(arr[j + 2], arr[j + 3]); }
        c.stroke();
      }
      // nós: dois passes (comuns e estrelas), com o brilho ligado uma vez só
      var alphaN = (0.25 + 0.75 * gate);
      c.shadowBlur = 0;
      for (i = 0; i < n; i++) {
        var q = ps[i]; if (q.b > 0.85) continue;
        c.fillStyle = CV.hsla(mono ? [0, 0, 100] : CV.pal(m, (q.b * 4) | 0, t), 0.5 * alphaN);
        c.fillRect(q.x - 1.2, q.y - 1.2, 2.4, 2.4);
      }
      if (s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(lcol, 1); }
      for (i = 0; i < n; i++) {
        var q2 = ps[i]; if (q2.b <= 0.85) continue;
        c.fillStyle = CV.hsla(mono ? [0, 0, 100] : CV.pal(m, (q2.b * 4) | 0, t), 0.85 * alphaN);
        c.fillRect(q2.x - 2, q2.y - 2, 4, 4);
      }
      c.shadowBlur = 0;
      CV.blend(m, c, false);
    }
  });

  /* ================= AURORA (cortinas de luz verticais, irmã calma do PSY) ================= */
  var AURORA_FRAG = [
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float t = u_t;',
    '  vec2 mo = (u_mouse - 0.5);',
    '  float x = uv.x + mo.x * 0.15;',
    '  float fold = fbm(vec2(x * 3.0 + t * 0.15, t * 0.1));',
    '  float sway = sin(x * 8.0 + t * 0.6 + u_bass * 4.0) * 0.12 * (0.5 + u_bass);',
    '  float cx = x + (sway + (fold - 0.5) * 0.4) * u_a;',
    '  float curtain = 0.0;',
    '  for (int i = 0; i < 3; i++){',
    '    float fi = float(i);',
    '    float bands = fbm(vec2(cx * (u_b + fi*3.0), uv.y * 1.4 - t * (0.25 + fi*0.12) - fi));',
    '    float vfall = smoothstep(0.0, 0.65, uv.y) * smoothstep(1.05, 0.5, uv.y);',
    '    curtain += bands * vfall * (0.5 - fi*0.12);',
    '  }',
    '  curtain = pow(max(curtain, 0.0), 1.6);',
    '  float shimmer = u_high * 0.4 * pow(fbm(vec2(cx*30.0, uv.y*20.0 - t*4.0)), 4.0) * smoothstep(0.4,1.0,uv.y);',
    '  float hue = u_hue + cx * 0.15 + curtain * 0.15;',
    '  vec3 base = pal(hue);',
    '  vec3 col = base * (curtain * (1.2 + u_bass*1.2) + shimmer);',
    '  col += base * u_beat * 0.15;',
    '  gl_FragColor = vec4(col * (0.03 + 0.97*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('aurora', {
    name: 'Aurora', group: 'Arte', webgl: true,
    defaults: defs({ dobra: 1, cortinas: 6 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'dobra', label: 'Dobra da cortina', min: 0, max: 2.5, step: 0.05, def: 1 },
      { k: 'cortinas', label: 'Nº de cortinas', min: 2, max: 14, step: 0.5, def: 6 }
    ],
    init: function (m) { CV.glSetup(m, AURORA_FRAG); },
    draw: function (m, d, dt, t) {
      if (!CV.glFrame(m, d, dt, m.s.dobra, m.s.cortinas)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, m.w, m.h);
      }
    }
  });

  /* ================= ÓRBITA (partículas gravitando um sol que pulsa no grave) ================= */
  CV.register('orbita', {
    name: 'Órbita', group: 'Arte',
    defaults: defs({ dens: 1, trail: 0.8, gravidade: 1 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'dens', label: 'Partículas', min: 0.3, max: 2, step: 0.05, def: 1 },
      { k: 'gravidade', label: 'Gravidade do sol', min: 0.3, max: 2.5, step: 0.05, def: 1 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.8 }
    ],
    init: function (m) { m.st.ps = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var cx = w / 2, cy = h / 2;
      if (m.mouse && m.mouse.over) { cx = m.mouse.x; cy = m.mouse.y; }
      var base = Math.min(w, h);
      var G = base * base * (0.6 + d.bass * s.sens * 1.3) * s.gravidade; // gravidade sobe no grave
      var sunR = base * (0.02 + (0.05 + d.bass * s.sens * 0.12) * (0.3 + 0.7 * gate)) + base * d.beatPulse * 0.05;
      var ps = m.st.ps, want = Math.round(360 * s.dens);
      function spawn(p) {
        var a = Math.random() * 6.283, rr = base * (0.15 + Math.random() * 0.35);
        var vo = Math.sqrt(G / rr);
        p.x = cx + Math.cos(a) * rr; p.y = cy + Math.sin(a) * rr;
        p.vx = -Math.sin(a) * vo; p.vy = Math.cos(a) * vo;
      }
      while (ps.length < want) { var np = { x: 0, y: 0, vx: 0, vy: 0, b: Math.random() }; spawn(np); ps.push(np); }
      if (ps.length > want) ps.length = want;
      var mono = CV.isMono(m);
      CV.blend(m, c);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        var dx = cx - p.x, dy = cy - p.y, r2 = dx * dx + dy * dy + 60, r = Math.sqrt(r2);
        var a = G / r2, sp = s.speed;
        p.vx += (dx / r) * a * dt; p.vy += (dy / r) * a * dt;
        if (d.beat) { p.vx += (-dy / r) * base * 0.4; p.vy += (dx / r) * base * 0.4; } // beat chuta pra órbita
        p.x += p.vx * dt * sp; p.y += p.vy * dt * sp;
        if (r < sunR * 0.8 || r > base * 1.25) spawn(p);
        var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor(p.b * 4), t);
        var spd = Math.min(1, (Math.abs(p.vx) + Math.abs(p.vy)) / (base * 0.9));
        c.fillStyle = CV.hsla(col, (0.14 + spd * 0.6) * (0.2 + 0.8 * gate));
        c.fillRect(p.x, p.y, 1.3, 1.3);
      }
      // o sol
      var sunCol = mono ? [0, 0, 100] : CV.pal(m, 0, t);
      var sg = c.createRadialGradient(cx, cy, 0, cx, cy, sunR * 2.6);
      sg.addColorStop(0, CV.hsla([sunCol[0], sunCol[1], 94], 0.78 * (0.3 + 0.7 * gate)));
      sg.addColorStop(0.4, CV.hsla(sunCol, 0.36 * (0.3 + 0.7 * gate)));
      sg.addColorStop(1, CV.hsla(sunCol, 0));
      c.fillStyle = sg;
      c.fillRect(cx - sunR * 2.6, cy - sunR * 2.6, sunR * 5.2, sunR * 5.2);
      CV.blend(m, c, false);
    }
  });

  /* ================= MARÉ (interferência de ondas de várias fontes; não é alvo) ================= */
  CV.register('mare', {
    name: 'Maré', group: 'Arte',
    defaults: defs({ cel: 15, ondulacao: 1 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'cel', label: 'Malha', min: 8, max: 30, step: 1, def: 15 },
      { k: 'ondulacao', label: 'Ondulação', min: 0.4, max: 2.5, step: 0.05, def: 1 }
    ],
    init: function (m) { m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.1 + gate * 1.4 + d.beatPulse * 0.5);
      var pt2 = m.st.pt;
      var cell = Math.max(6, s.cel), ond = s.ondulacao;
      var cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
      // três fontes em pontos diferentes, uma por banda: o cruzamento gera interferência (moiré), não anéis de alvo
      var srcs = [
        { x: w * 0.14, y: h * 0.52, k: 0.030 * ond, band: d.bass * s.sens },
        { x: w * 0.86, y: h * 0.34, k: 0.052 * ond, band: d.high * s.sens },
        { x: w * 0.50, y: h * 0.92, k: 0.041 * ond, band: d.mid * s.sens }
      ];
      if (m.mouse && m.mouse.over) { srcs[0].x = m.mouse.x; srcs[0].y = m.mouse.y; }
      var mono = CV.isMono(m);
      CV.blend(m, c);
      for (var yi = 0; yi < rows; yi++) {
        for (var xi = 0; xi < cols; xi++) {
          var px = xi * cell, py = yi * cell, sum = 0;
          for (var q = 0; q < 3; q++) {
            var sq = srcs[q];
            var dxs = px - sq.x, dys = py - sq.y, dr = Math.sqrt(dxs * dxs + dys * dys);
            sum += Math.sin(dr * sq.k - pt2 * (1 + q * 0.4)) * (0.3 + sq.band * 2);
          }
          var v = sum / 3, inten = Math.max(0, v) * (0.2 + 0.8 * gate);
          if (inten < 0.05) continue;
          var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor((0.5 + v * 0.5) * 4), t);
          var sz = 0.6 + inten * (cell * 0.34);
          c.fillStyle = CV.hsla(col, Math.min(0.9, 0.1 + inten));
          c.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
        }
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= CONTORNO (linhas de contorno do espectro empilhadas) ================= */
  CV.register('contorno', {
    name: 'Contorno', group: 'Arte',
    defaults: defs({ glow: 4, camadas: 22 }),
    schema: COMMON.concat([{ k: 'camadas', label: 'Camadas', min: 8, max: 40, step: 1, def: 22 }]),
    init: function (m) { m.st.hist = []; m.st.skip = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var K = Math.round(s.camadas), P = 80;
      if (++m.st.skip % Math.max(1, Math.round(2 / s.speed)) === 0) {
        var f = d.freq, n = f.length, binHz = 22050 / n, snap = new Float32Array(P);
        for (var i = 0; i < P; i++) {
          var fr = 30 * Math.pow(16000 / 30, i / (P - 1));
          var pos = fr / binHz, i0 = pos | 0; if (i0 > n - 2) i0 = n - 2;
          var fa = pos - i0;
          snap[i] = Math.pow((f[i0] * (1 - fa) + f[i0 + 1] * fa) / 255, 1.3);
        }
        m.st.hist.push(snap);
        if (m.st.hist.length > K) m.st.hist.shift();
      }
      var hist = m.st.hist, L = hist.length;
      if (!L) return;
      var mono = CV.isMono(m), col = mono ? [0, 0, 100] : CV.pal(m, 0, t);
      var pad = h * 0.1, span = h - pad * 2;
      var amp = h * 0.34 * s.sens * (0.2 + 0.8 * gate);
      if (m.mouse && m.mouse.over) amp *= 0.6 + (1 - m.mouse.y / h) * 0.9;
      for (var j = 0; j < L; j++) {
        var depth = j / Math.max(1, L - 1), snap2 = hist[j];
        var yBase = pad + depth * span, a2 = amp * (0.35 + depth * 0.65), x, px, py;
        c.beginPath(); c.moveTo(0, yBase);
        for (x = 0; x < P; x++) { px = x / (P - 1) * w; py = yBase - snap2[x] * a2; c.lineTo(px, py); }
        c.lineTo(w, yBase); c.closePath();
        c.fillStyle = CV.bgOf(m); c.fill();
        var lc = mono ? [0, 0, 55 + depth * 40] : [col[0], col[1], 42 + depth * 26];
        if (s.glow > 0 && depth > 0.7) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(lc, 1); }
        c.strokeStyle = CV.hsla(lc, 0.3 + depth * 0.6); c.lineWidth = 0.8 + depth * 0.7;
        c.beginPath();
        for (x = 0; x < P; x++) { px = x / (P - 1) * w; py = yBase - snap2[x] * a2; x === 0 ? c.moveTo(px, py) : c.lineTo(px, py); }
        c.stroke(); c.shadowBlur = 0;
      }
    }
  });

  /* ================= CORDAS (cordas verticais que vibram por banda) ================= */
  CV.register('cordas', {
    name: 'Cordas', group: 'Arte',
    defaults: defs({ glow: 6, cordas: 28, tensao: 1 }),
    schema: COMMON.concat([
      { k: 'cordas', label: 'Nº de cordas', min: 10, max: 48, step: 1, def: 28 },
      { k: 'tensao', label: 'Tensão', min: 0.3, max: 2.5, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.amp = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), N = Math.round(s.cordas);
      if (!m.st.amp || m.st.amp.length !== N) {
        m.st.amp = new Float32Array(N); m.st.ph = new Float32Array(N); m.st.mode = new Float32Array(N);
        for (var q = 0; q < N; q++) m.st.mode[q] = 1 + (q % 3);
      }
      var amp = m.st.amp, ph = m.st.ph, mode = m.st.mode;
      var f = d.freq, n = f.length, binHz = 22050 / n, mono = CV.isMono(m);
      var pad = w * 0.06, gapx = (w - pad * 2) / Math.max(1, N - 1);
      for (var i = 0; i < N; i++) {
        var fr = 45 * Math.pow(7000 / 45, i / Math.max(1, N - 1));
        var bin = Math.min(n - 1, Math.round(fr / binHz));
        var e = Math.pow(f[bin] / 255, 1.2) * s.sens;
        amp[i] += (e - amp[i]) * (e > amp[i] ? 0.5 : 0.06);
        var xi = pad + i * gapx;
        if (m.mouse && m.mouse.over && Math.abs(m.mouse.x - xi) < gapx * 0.6) amp[i] = Math.min(1, amp[i] + 0.5);
        if (d.beat) amp[i] = Math.min(1, amp[i] + 0.22 * (0.4 + i / N));
        ph[i] += dt * (6 + fr * 0.01) * s.tensao * (0.5 + gate);
        var A = amp[i] * gapx * 0.9 * (0.2 + 0.8 * gate);
        var col = mono ? [0, 0, 100] : CV.pal(m, i % 4, t);
        var lum = Math.min(92, 40 + amp[i] * 45);
        if (s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow * amp[i]; c.shadowColor = CV.hsla(col, 1); }
        c.strokeStyle = CV.hsla([col[0], col[1], lum], 0.22 + amp[i] * 0.7);
        c.lineWidth = 0.8 + amp[i] * 1.4;
        c.beginPath();
        for (var y = 0; y <= h; y += 8) {
          var env = Math.sin(Math.PI * y / h);
          var xx = xi + A * env * Math.sin(mode[i] * Math.PI * y / h + ph[i]);
          y === 0 ? c.moveTo(xx, y) : c.lineTo(xx, y);
        }
        c.stroke(); c.shadowBlur = 0;
      }
    }
  });

  /* ================= TINTA (gotas de tinta que difundem no beat) ================= */
  CV.register('tinta', {
    name: 'Tinta', group: 'Arte',
    defaults: defs({ gotas: 1, trail: 0.14 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'gotas', label: 'Densidade', min: 0.4, max: 2.5, step: 0.05, def: 1 },
      { k: 'trail', label: 'Difusão', min: 0.04, max: 0.4, step: 0.01, def: 0.14 }
    ],
    init: function (m) { m.st.drops = []; m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(6,6,8,' + s.trail + ')';
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), drops = m.st.drops;
      m.st.pt += dt * s.speed * (0.2 + gate);
      var mono = CV.isMono(m);
      if (d.beat && drops.length < 60 * s.gotas) {
        var nDrop = Math.round(1 + 2 * s.gotas);
        for (var q = 0; q < nDrop; q++) {
          var mx = (m.mouse && m.mouse.over) ? m.mouse.x : w * (0.15 + 0.7 * Math.random());
          var my = (m.mouse && m.mouse.over) ? m.mouse.y : h * (0.15 + 0.7 * Math.random());
          drops.push({ x: mx, y: my, r: 2, rMax: Math.min(w, h) * (0.1 + 0.28 * Math.random()) * (0.6 + d.bass), life: 1, ci: (Math.random() * 4) | 0, vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 16 });
        }
      }
      CV.blend(m, c);
      for (var i = drops.length - 1; i >= 0; i--) {
        var p = drops[i];
        p.r += (p.rMax - p.r) * Math.min(1, dt * 2.5);
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt * 0.35;
        if (p.life <= 0) { drops.splice(i, 1); continue; }
        var col = mono ? [0, 0, 100] : CV.pal(m, p.ci, t);
        var rr = p.r * (0.5 + 0.5 * gate) * (1 + d.bass * 0.5);
        var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, CV.hsla(col, 0.22 * p.life));
        g.addColorStop(0.5, CV.hsla(col, 0.08 * p.life));
        g.addColorStop(1, CV.hsla(col, 0));
        c.fillStyle = g;
        c.beginPath(); c.arc(p.x, p.y, rr, 0, 6.283); c.fill();
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= BARRAS 3D (equalizador em perspectiva, cidade que pulsa) ================= */
  CV.register('barras', {
    name: 'Barras 3D', group: 'Arte',
    defaults: defs({ glow: 3, barras: 32, prof: 1 }),
    schema: COMMON.concat([
      { k: 'barras', label: 'Nº de barras', min: 12, max: 64, step: 1, def: 32 },
      { k: 'prof', label: 'Profundidade', min: 0.3, max: 2, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.vals = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), N = Math.round(s.barras);
      if (!m.st.vals || m.st.vals.length !== N) m.st.vals = new Float32Array(N);
      var vals = m.st.vals, f = d.freq, n = f.length, binHz = 22050 / n, mono = CV.isMono(m);
      var depth = 10 + 22 * s.prof;
      var mt = (m.mouse && m.mouse.over) ? (m.mouse.x / w - 0.5) : 0;
      var dxp = depth * 0.7 * (1 - mt), dyp = -depth * 0.7;
      var pad = w * 0.04, bw = (w - pad * 2 - Math.abs(dxp)) / N;
      var baseY = h * 0.86, maxH = h * 0.66;
      for (var i = 0; i < N; i++) {
        var fr = 40 * Math.pow(14000 / 40, i / Math.max(1, N - 1));
        var bin = Math.min(n - 1, Math.round(fr / binHz));
        var tilt = 1 + Math.min(2.5, Math.pow(fr / 120, 0.28)) * 0.4;
        var e = Math.min(1, Math.pow(f[bin] / 255, 1.35) * s.sens * tilt);
        vals[i] += (e - vals[i]) * (e > vals[i] ? 0.55 : 0.12);
        var bh = vals[i] * maxH * (0.2 + 0.8 * gate) * (1 + d.bass * 0.25);
        var x0 = pad + i * bw, x1 = x0 + bw * 0.86, yTop = baseY - bh;
        var col = mono ? [0, 0, 78] : CV.pal(m, i % 4, t);
        var lum = 28 + vals[i] * 42;
        c.fillStyle = CV.hsla([col[0], col[1], lum], 0.92);
        c.fillRect(x0, yTop, x1 - x0, baseY - yTop);
        c.fillStyle = CV.hsla([col[0], col[1], Math.min(92, lum + 26)], 0.96);
        c.beginPath(); c.moveTo(x0, yTop); c.lineTo(x0 + dxp, yTop + dyp); c.lineTo(x1 + dxp, yTop + dyp); c.lineTo(x1, yTop); c.closePath(); c.fill();
        c.fillStyle = CV.hsla([col[0], col[1], Math.max(8, lum - 16)], 0.96);
        c.beginPath(); c.moveTo(x1, yTop); c.lineTo(x1 + dxp, yTop + dyp); c.lineTo(x1 + dxp, baseY + dyp); c.lineTo(x1, baseY); c.closePath(); c.fill();
        if (s.glow > 0 && vals[i] > 0.5) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); c.fillStyle = CV.hsla([col[0], col[1], 90], 0.9); c.fillRect(x0, yTop, x1 - x0, 2); c.shadowBlur = 0; }
      }
      c.strokeStyle = CV.gridInk(m, 0.08); c.lineWidth = 1;
      c.beginPath(); c.moveTo(pad, baseY + 0.5); c.lineTo(w - pad, baseY + 0.5); c.stroke();
    }
  });

  /* ================= COLMEIA (grade hexagonal, equalizador de favos) ================= */
  CV.register('colmeia', {
    name: 'Colmeia', group: 'Arte',
    defaults: defs({ glow: 4, cel: 16 }),
    schema: COMMON.concat([{ k: 'cel', label: 'Tamanho do favo', min: 10, max: 34, step: 1, def: 16 }]),
    init: function (m) { m.st.vals = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      var R = Math.max(7, s.cel), hx = R * 1.5, hy = Math.sqrt(3) * R;
      var cols = Math.max(1, Math.ceil(w / hx) + 1), rows = Math.max(1, Math.ceil(h / hy) + 1);
      if (!m.st.vals || m.st.vals.length !== cols) m.st.vals = new Float32Array(cols);
      var vals = m.st.vals, f = d.freq, n = f.length, binHz = 22050 / n, mono = CV.isMono(m), ci, ri;
      for (ci = 0; ci < cols; ci++) {
        var fr = 40 * Math.pow(13000 / 40, ci / Math.max(1, cols - 1));
        var bin = Math.min(n - 1, Math.round(fr / binHz));
        var tilt = 1 + Math.min(2.5, Math.pow(fr / 120, 0.28)) * 0.4;
        var e = Math.min(1, Math.pow(f[bin] / 255, 1.35) * s.sens * tilt);
        vals[ci] += (e - vals[ci]) * (e > vals[ci] ? 0.5 : 0.12);
      }
      function hexPath(cx, cy) {
        c.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = Math.PI / 3 * k, px = cx + R * 0.9 * Math.cos(a), py = cy + R * 0.9 * Math.sin(a);
          k === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath();
      }
      for (ci = 0; ci < cols; ci++) {
        var cx = ci * hx, level = vals[ci] * (0.2 + 0.8 * gate);
        var col = mono ? [0, 0, 90] : CV.pal(m, ci % 4, t);
        for (ri = 0; ri < rows; ri++) {
          var cy = ri * hy + (ci % 2 ? hy / 2 : 0);
          var bottomFrac = (rows - 1 - ri) / Math.max(1, rows - 1);
          var lit = level - bottomFrac;
          if (lit > 0.02) {
            var b = Math.min(1, lit * 3);
            if (s.glow > 0 && b > 0.7) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
            c.fillStyle = CV.hsla([col[0], col[1], (mono ? 55 : 40) + b * 35], 0.9);
            hexPath(cx, cy); c.fill(); c.shadowBlur = 0;
          } else {
            c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
            hexPath(cx, cy); c.stroke();
          }
        }
      }
    }
  });

  /* ================= VITRAL (células irregulares que pulsam por banda) ================= */
  CV.register('vitral', {
    name: 'Vitral', group: 'Arte',
    defaults: defs({ glow: 0, cel: 24 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'cel', label: 'Tamanho da célula', min: 14, max: 46, step: 1, def: 24 }
    ],
    init: function (m) { m.st.jit = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), cell = Math.max(12, s.cel);
      var cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1, i;
      if (!m.st.jit || m.st.jc !== cols || m.st.jr !== rows) {
        m.st.jc = cols; m.st.jr = rows;
        var J = new Float32Array((cols + 1) * (rows + 1) * 2);
        for (i = 0; i < (cols + 1) * (rows + 1); i++) { J[i * 2] = (Math.random() - 0.5) * cell * 0.6; J[i * 2 + 1] = (Math.random() - 0.5) * cell * 0.6; }
        m.st.jit = J; m.st.band = new Float32Array(cols * rows);
        for (i = 0; i < cols * rows; i++) m.st.band[i] = Math.random();
      }
      var J2 = m.st.jit, band = m.st.band, mono = CV.isMono(m);
      function vtx(ix, iy) { var idx = (iy * (cols + 1) + ix) * 2; return [ix * cell + J2[idx], iy * cell + J2[idx + 1]]; }
      var bands = [d.bass, d.mid, d.high];
      for (var yi = 0; yi < rows; yi++) {
        for (var xi = 0; xi < cols; xi++) {
          var bi = band[yi * cols + xi], bandIdx = bi < 0.4 ? 0 : bi < 0.7 ? 1 : 2;
          var energy = Math.min(1, bands[bandIdx] * s.sens * 1.4) * (0.15 + 0.85 * gate);
          var a = vtx(xi, yi), b2 = vtx(xi + 1, yi), cc = vtx(xi + 1, yi + 1), dd = vtx(xi, yi + 1);
          var col = mono ? [0, 0, 55 + energy * 35] : CV.pal(m, bandIdx, t);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b2[0], b2[1]); c.lineTo(cc[0], cc[1]); c.lineTo(dd[0], dd[1]); c.closePath();
          c.fillStyle = CV.hsla([col[0], col[1], mono ? col[2] : 22 + energy * 45], 0.35 + energy * 0.6);
          c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.2; c.stroke();
        }
      }
    }
  });

  /* ================= CASCATA (chuva de luz: cada faixa cai numa coluna) ================= */
  CV.register('cascata', {
    name: 'Cascata', group: 'Arte',
    defaults: defs({ glow: 4, colunas: 40, trail: 0.7 }),
    schema: COMMON.concat([
      { k: 'colunas', label: 'Colunas', min: 16, max: 80, step: 1, def: 40 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 }
    ]),
    init: function (m) { m.st.drops = []; m.st.emit = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), N = Math.round(s.colunas);
      if (!m.st.emit || m.st.emit.length !== N) m.st.emit = new Float32Array(N);
      var emit = m.st.emit, drops = m.st.drops, f = d.freq, n = f.length, binHz = 22050 / n, mono = CV.isMono(m), colW = w / N, i;
      for (i = 0; i < N; i++) {
        var fr = 40 * Math.pow(14000 / 40, i / Math.max(1, N - 1));
        var bin = Math.min(n - 1, Math.round(fr / binHz));
        var e = Math.min(1, Math.pow(f[bin] / 255, 1.3) * s.sens);
        emit[i] += (e - emit[i]) * (e > emit[i] ? 0.6 : 0.2);
        if (emit[i] > 0.25 && Math.random() < emit[i] * 0.8 * (0.2 + 0.8 * gate) && drops.length < 700) {
          drops.push({ col: i, y: 0, v: 80 + emit[i] * 260, b: emit[i], ci: i % 4, life: 1 });
        }
      }
      CV.blend(m, c);
      for (var j = drops.length - 1; j >= 0; j--) {
        var p = drops[j];
        p.y += p.v * dt; p.life -= dt * 0.4;
        if (p.y > h + 20 || p.life <= 0) { drops.splice(j, 1); continue; }
        var x = p.col * colW + colW * 0.5, col = mono ? [0, 0, 100] : CV.pal(m, p.ci, t), len = 8 + p.b * 26;
        var g = c.createLinearGradient(x, p.y - len, x, p.y);
        g.addColorStop(0, CV.hsla(col, 0));
        g.addColorStop(1, CV.hsla([col[0], col[1], Math.min(92, 55 + p.b * 35)], (0.4 + p.b * 0.5) * p.life));
        c.strokeStyle = g; c.lineWidth = Math.max(1, colW * 0.3);
        if (s.glow > 0 && p.b > 0.6) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
        c.beginPath(); c.moveTo(x, p.y - len); c.lineTo(x, p.y); c.stroke(); c.shadowBlur = 0;
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= MALHA (tecido 3D que ondula com o som) ================= */
  CV.register('malha', {
    name: 'Malha', group: 'Arte',
    defaults: defs({ glow: 3, grade: 16 }),
    schema: COMMON.concat([{ k: 'grade', label: 'Densidade', min: 8, max: 28, step: 1, def: 16 }]),
    init: function (m) { m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * CV.rate(m, d, dt, 0.05, 0.9, 0.4);
      var pt = m.st.pt, G = Math.round(s.grade), mono = CV.isMono(m), col = mono ? [0, 0, 90] : CV.pal(m, 0, t);
      // relevo e bandas também com inércia: o tecido ondula, não pisca
      if (m.st.ampS === undefined) { m.st.ampS = 0; m.st.bassS = 0; m.st.midS = 0; }
      var kS = Math.min(1, dt * 6);
      m.st.ampS += (Math.min(w, h) * 0.16 * s.sens * (0.15 + 0.85 * gate) - m.st.ampS) * kS;
      m.st.bassS += (d.bass - m.st.bassS) * kS;
      m.st.midS += (d.mid - m.st.midS) * kS;
      var amp = m.st.ampS, bass = m.st.bassS, mid = m.st.midS;
      var mx = (m.mouse && m.mouse.over) ? (m.mouse.x / w - 0.5) : 0, my = (m.mouse && m.mouse.over) ? (m.mouse.y / h - 0.5) : 0;
      function proj(gx, gy) {
        var nx = gx - 0.5, ny = gy - 0.5;
        var z = Math.sin(gx * 6 + pt * 1.3 + Math.sin(gy * 5 - pt)) * (0.4 + bass * 1.4) + Math.cos(gy * 7 - pt * 1.1) * (0.2 + mid * 0.8);
        z *= amp;
        var persp = 1 + ny * (0.5 + my * 0.5);
        return [w * 0.5 + nx * w * 0.86 * persp + mx * 40, h * 0.5 + ny * h * 0.7 - z, z];
      }
      var pts = [], yi, xi;
      for (yi = 0; yi <= G; yi++) { var row = []; for (xi = 0; xi <= G; xi++) row.push(proj(xi / G, yi / G)); pts.push(row); }
      // PERFORMANCE: uma linha inteira por traço (2×G traços), em vez de um traço por segmento
      // (eram ~600 chamadas por quadro). O brilho vira 3 faixas de profundidade.
      c.lineWidth = 1;
      var BANDS = 3, bi2, row2, p2;
      for (bi2 = 0; bi2 < BANDS; bi2++) {
        var lo = bi2 / BANDS, hi = (bi2 + 1) / BANDS, mid2 = (lo + hi) / 2;
        c.strokeStyle = CV.hsla([col[0], col[1], 40 + mid2 * (mono ? 45 : 30)], (0.22 + mid2 * 0.5) * (0.2 + 0.8 * gate));
        c.beginPath();
        for (yi = 0; yi <= G; yi++) {
          row2 = pts[yi];
          var drawing = false;
          for (xi = 0; xi <= G; xi++) {
            p2 = row2[xi];
            var bn = Math.min(1, Math.max(0, p2[2] / (amp + 0.001) * 0.5 + 0.5));
            if (bn >= lo && bn < hi) { drawing ? c.lineTo(p2[0], p2[1]) : (c.moveTo(p2[0], p2[1]), drawing = true); }
            else drawing = false;
          }
        }
        for (xi = 0; xi <= G; xi++) {
          var drawing2 = false;
          for (yi = 0; yi <= G; yi++) {
            p2 = pts[yi][xi];
            var bn2 = Math.min(1, Math.max(0, p2[2] / (amp + 0.001) * 0.5 + 0.5));
            if (bn2 >= lo && bn2 < hi) { drawing2 ? c.lineTo(p2[0], p2[1]) : (c.moveTo(p2[0], p2[1]), drawing2 = true); }
            else drawing2 = false;
          }
        }
        c.stroke();
      }
    }
  });

  /* ================= TÚNEL DE FIOS (corredor wireframe que gira e pulsa) ================= */
  CV.register('tunelfio', {
    name: 'Túnel de fios', group: 'Arte',
    defaults: defs({ glow: 3, lados: 8, aneis: 16 }),
    schema: COMMON.concat([
      { k: 'lados', label: 'Lados', min: 3, max: 12, step: 1, def: 8 },
      { k: 'aneis', label: 'Anéis', min: 6, max: 26, step: 1, def: 16 }
    ]),
    init: function (m) { m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.1 + gate * 0.8 + d.beatPulse * 0.5);
      var pt = m.st.pt, cx = w * 0.5, cy = h * 0.5;
      if (m.mouse && m.mouse.over) { cx += (m.mouse.x / w - 0.5) * w * 0.3; cy += (m.mouse.y / h - 0.5) * h * 0.3; }
      var sides = Math.round(s.lados), rings = Math.round(s.aneis);
      var mono = CV.isMono(m), col = mono ? [0, 0, 92] : CV.pal(m, 0, t);
      var maxR = Math.sqrt(w * w + h * h) * 0.55, twist = pt * 0.25 + d.mid * 1.0, frac = (pt * 0.12) % 1;
      c.lineJoin = 'round';
      var prev = null, prevDD = 0, i, k;
      for (i = 0; i <= rings; i++) {
        var dd = ((i / rings) + frac) % 1;
        var R = maxR * (0.03 + dd * dd * 0.97) * (1 + d.bass * 0.25), rot = twist + dd * 1.4, pts = [];
        for (k = 0; k < sides; k++) { var a = rot + k / sides * 6.2831; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
        var alpha = Math.sin(dd * Math.PI) * (0.15 + 0.85 * gate);
        if (s.glow > 0 && dd > 0.6) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow * alpha; c.shadowColor = CV.hsla(col, 1); }
        c.strokeStyle = CV.hsla([col[0], col[1], (mono ? 48 : 44) + dd * 38], alpha * 0.9);
        c.lineWidth = 0.8 + dd * 1.3;
        c.beginPath();
        for (k = 0; k < sides; k++) { k === 0 ? c.moveTo(pts[0][0], pts[0][1]) : c.lineTo(pts[k][0], pts[k][1]); }
        c.closePath(); c.stroke();
        if (prev && Math.abs(dd - prevDD) < 0.5) {
          c.beginPath();
          for (k = 0; k < sides; k++) { c.moveTo(prev[k][0], prev[k][1]); c.lineTo(pts[k][0], pts[k][1]); }
          c.stroke();
        }
        prev = pts; prevDD = dd; c.shadowBlur = 0;
      }
    }
  });

  /* ================= NÓ (curva de Lissajous 3D girando no espaço) ================= */
  CV.register('no', {
    name: 'Nó', group: 'Arte',
    defaults: defs({ glow: 4, trail: 0.5 }),
    schema: COMMON.concat([{ k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.5 }]),
    init: function (m) { m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = CV.trailFill(m, s.trail);
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.1 + gate * 0.7);
      var pt = m.st.pt, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4;
      var rotY = pt * 0.5 + (m.mouse && m.mouse.over ? (m.mouse.x / w - 0.5) * 3 : 0);
      var rotX = pt * 0.33 + (m.mouse && m.mouse.over ? (m.mouse.y / h - 0.5) * 2 : 0);
      var mono = CV.isMono(m), col = mono ? [0, 0, 95] : CV.pal(m, 0, t);
      var amp = 0.5 + d.level * 3 * s.sens * (0.3 + 0.7 * gate);
      var cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
      CV.blend(m, c);
      if (s.glow > 0) { c.shadowBlur = CV.isLight(m) ? 0 : s.glow; c.shadowColor = CV.hsla(col, 1); }
      c.strokeStyle = CV.hsla(col, 0.35 + gate * 0.5); c.lineWidth = 1.1;
      c.beginPath();
      var STEPS = 280;
      for (var i = 0; i <= STEPS; i++) {
        var u = i / STEPS * 6.2831;
        var x = Math.sin(3 * u + pt * 0.6) * amp * 0.6, y = Math.sin(2 * u) * amp * 0.6, z = Math.cos(5 * u + pt * 0.4) * amp * 0.6;
        var x1 = x * cyR - z * syR, z1 = x * syR + z * cyR;
        var y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
        var persp = 1.7 / (1.7 + z2), px = cx + x1 * R * persp, py = cy + y1 * R * persp;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke(); c.shadowBlur = 0;
      CV.blend(m, c, false);
    }
  });

  // módulos removidos do app (Bruno cortou): saem da lista; o código fica inerte
  ['terreno', 'tunnel', 'mare', 'ascii', 'harmonografo', 'tinta', 'barras', 'colmeia', 'vitral', 'cascata', 'tunelfio', 'no', 'orbita', 'contorno'].forEach(function (id) {
    delete CV.registry[id];
    var ix = CV.order.indexOf(id);
    if (ix >= 0) CV.order.splice(ix, 1);
  });

})();
