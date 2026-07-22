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
  var PALETTES = {
    neon: [[312, 100, 58], [187, 100, 50], [258, 90, 66], [157, 100, 50]],
    vhs:  [[4, 100, 59], [35, 100, 50], [50, 100, 52], [347, 100, 59]],
    mono: [[0, 0, 100], [0, 0, 78], [0, 0, 58], [0, 0, 90]]
  };
  CV.pal = function (m, idx, t) {
    if (m.s.colorMode === 'custom') return [(m.s.hue + idx * 32) % 360, 92, 60];
    var th = CV.theme || 'psy';
    if (th === 'psy') return [(t * 26 + idx * 65) % 360, 95, 60];
    var p = PALETTES[th] || PALETTES.neon;
    return p[((idx % p.length) + p.length) % p.length];
  };
  CV.hsla = function (c, a) { return 'hsla(' + c[0].toFixed(1) + ',' + c[1] + '%,' + c[2] + '%,' + (a === undefined ? 1 : a) + ')'; };
  CV.isMono = function (m) { return m.s.colorMode !== 'custom' && CV.theme === 'mono'; };

  var NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  CV.noteName = function (freq) {
    if (freq < 20) return '';
    var n = Math.round(12 * Math.log2(freq / 440));
    var name = NOTES[((n % 12) + 12) % 12];
    var oct = 4 + Math.floor((n + 9) / 12);
    return name + oct;
  };
  CV.fmtHz = function (f) { return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + 'kHz' : Math.round(f) + 'Hz'; };

  var COMMON = [
    { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
    { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
    { k: 'glow', label: 'Brilho', min: 0, max: 40, step: 1, def: 14 }
  ];
  function defs(extra) {
    var d = { sens: 1, speed: 1, glow: 14, colorMode: 'theme', hue: 180 };
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
  function label(c, txt, x, y, align, col) {
    c.font = '9px "SF Mono", ui-monospace, monospace';
    c.textAlign = align || 'left';
    c.fillStyle = col || 'rgba(255,255,255,0.4)';
    c.fillText(txt, x, y);
  }

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
    // o tempo interno anda no ritmo da música: grave e beat empurram, silêncio congela
    m.st.pt += dt * m.s.speed * (0.03 + gate * 1.1 + (d ? d.beatPulse * 0.7 : 0));
    var hue;
    if (m.s.colorMode === 'custom') hue = m.s.hue / 360;
    else if (CV.theme === 'neon') hue = 0.8;
    else if (CV.theme === 'vhs') hue = 0.05;
    else hue = m.st.pt * 0.02;
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
    gl.uniform1f(m.st.u.u_sat, (CV.theme === 'mono' && m.s.colorMode !== 'custom') ? 0 : 1);
    gl.uniform1f(m.st.u.u_a, extraA || 0);
    gl.uniform1f(m.st.u.u_b, extraB || 0);
    gl.uniform1f(m.st.u.u_gate, gate);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  /* ================= ESPECTRO ================= */
  CV.register('spectrum', {
    name: 'Espectro', group: 'Estúdio',
    defaults: defs({ fill: 1, smooth: 1.4, guias: 0, nivelar: 0.7 }),
    schema: COMMON.concat([
      { k: 'smooth', label: 'Suavidade', min: 0.2, max: 3, step: 0.05, def: 1.4 },
      { k: 'nivelar', label: 'Nivelar volume', min: 0, max: 1, step: 0.05, def: 0.7 },
      { k: 'fill', label: 'Preenchimento', min: 0, max: 1, step: 1, def: 1 },
      { k: 'guias', label: 'Guias de faixa', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) { m.st.vals = []; m.st.peaks = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var N = 96, f = d.freq, n = f.length;
      if (m.st.vals.length !== N) { m.st.vals = new Array(N).fill(0); m.st.peaks = new Array(N).fill(0); }
      var col = CV.pal(m, 0, t), col2 = CV.pal(m, 1, t);
      var FMIN = 30, FMAX = 16000, i;
      function xToFreq(x) { return FMIN * Math.pow(FMAX / FMIN, x / w); }
      var att = Math.min(1, 8 * dt / s.smooth), rel = Math.min(1, 3.5 * dt / s.smooth);
      for (i = 0; i < N; i++) {
        var fr = FMIN * Math.pow(FMAX / FMIN, i / (N - 1));
        var bin = Math.min(n - 1, Math.round(fr / (22050 / n)));
        // nivelamento: compensa a queda natural dos agudos pra curva ficar uniforme
        var tilt = 1 + (Math.min(3.5, Math.pow(fr / 90, 0.32)) - 1) * s.nivelar;
        var v = Math.pow(f[bin] / 255, 1.4) * s.sens * tilt; if (v > 1) v = 1;
        var cur = m.st.vals[i];
        m.st.vals[i] = cur + (v - cur) * (v > cur ? att : rel);
        m.st.peaks[i] = Math.max(m.st.vals[i], m.st.peaks[i] - dt * 0.3);
      }
      // guias de faixa
      if (s.guias >= 0.5) {
        var bands = [[150, 'GRAVE'], [2000, 'MÉDIO'], [10000, 'AGUDO']];
        bands.forEach(function (bd) {
          var x = Math.log(bd[0] / FMIN) / Math.log(FMAX / FMIN) * w;
          c.strokeStyle = 'rgba(255,255,255,0.1)';
          c.setLineDash([3, 5]);
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
          c.setLineDash([]);
          label(c, bd[1], x - 4, 12, 'right');
        });
        label(c, 'AR', w - 6, 12, 'right');
      }
      // curva suave (quadráticas pelos pontos médios)
      var grad = c.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, CV.hsla(col, 0.06));
      grad.addColorStop(0.6, CV.hsla(col, 0.35));
      grad.addColorStop(1, CV.hsla(col2, 0.8));
      function pt(i2) { return [i2 / (N - 1) * w, h - m.st.vals[i2] * h * 0.92]; }
      c.beginPath(); c.moveTo(0, h);
      c.lineTo(pt(0)[0], pt(0)[1]);
      for (i = 1; i < N - 1; i++) {
        var p0 = pt(i), p1 = pt(i + 1);
        c.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
      }
      c.lineTo(w, pt(N - 1)[1]); c.lineTo(w, h);
      if (s.fill >= 0.5) { c.fillStyle = grad; c.fill(); }
      c.shadowBlur = s.glow; c.shadowColor = CV.hsla(col2, 1);
      c.strokeStyle = CV.hsla(col2, 0.95); c.lineWidth = 1.6; c.stroke();
      c.shadowBlur = 0;
      for (i = 0; i < N; i += 2) {
        c.fillStyle = CV.hsla(CV.pal(m, 2, t), 0.85);
        c.fillRect(i / (N - 1) * w - 1, h - m.st.peaks[i] * h * 0.92 - 2, 2, 2);
      }
      // hover: frequência, nota e nível
      if (m.mouse && m.mouse.over) {
        var mxx = m.mouse.x, fr2 = xToFreq(mxx);
        var bin2 = Math.min(n - 1, Math.round(fr2 / (22050 / n)));
        var db = d.freq[bin2] > 0 ? (20 * Math.log10(d.freq[bin2] / 255)).toFixed(0) : '-∞';
        c.strokeStyle = 'rgba(240,239,233,0.5)';
        c.beginPath(); c.moveTo(mxx, 0); c.lineTo(mxx, h); c.stroke();
        var txt = CV.fmtHz(fr2) + ' · ' + CV.noteName(fr2) + ' · ' + db + 'dB';
        c.font = '10px "SF Mono", ui-monospace, monospace';
        var tw = c.measureText(txt).width;
        var tx = Math.min(w - tw - 10, Math.max(6, mxx + 8));
        c.fillStyle = 'rgba(7,7,11,0.85)';
        c.fillRect(tx - 4, m.mouse.y - 22, tw + 8, 16);
        c.fillStyle = '#f0efe9';
        c.textAlign = 'left';
        c.fillText(txt, tx, m.mouse.y - 10);
      }
    }
  });

  /* ================= ONDA ROLANTE ================= */
  CV.register('wavescroll', {
    name: 'Onda rolante', group: 'Estúdio',
    defaults: defs({ smooth: 1.2, corGrave: 8, corAgudo: 195 }),
    schema: COMMON.concat([
      { k: 'smooth', label: 'Suavidade', min: 0.2, max: 3, step: 0.05, def: 1.2 },
      { k: 'corGrave', label: 'Cor do grave', min: 0, max: 360, step: 1, def: 8 },
      { k: 'corAgudo', label: 'Cor do agudo', min: 0, max: 360, step: 1, def: 195 }
    ]),
    init: function (m) { m.st.emx = 0; m.st.emn = 0; m.st.erms = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d) { c.clearRect(0, 0, w, h); return; }
      var dx = Math.max(1, Math.round(1.4 * s.speed * (m.dpr || 1)));
      bc.globalCompositeOperation = 'copy';
      bc.drawImage(buf, -dx, 0);
      bc.globalCompositeOperation = 'source-over';
      var td = d.time, mn = 0, mx = 0, i;
      for (i = 0; i < td.length; i++) { if (td[i] < mn) mn = td[i]; if (td[i] > mx) mx = td[i]; }
      mn *= s.sens; mx *= s.sens;
      // envelope suavizado
      var att = Math.min(1, 10 * dt / s.smooth), rel = Math.min(1, 4 * dt / s.smooth);
      m.st.emx += (mx - m.st.emx) * (mx > m.st.emx ? att : rel);
      m.st.emn += (mn - m.st.emn) * (mn < m.st.emn ? att : rel);
      var rms = Math.min(1, d.rms * 2.6 * s.sens);
      m.st.erms += (rms - m.st.erms) * (rms > m.st.erms ? att : rel);
      // cor pelo conteúdo: grave puxa uma cor, agudo puxa outra, transição contínua
      var bal = Math.min(1, Math.max(0, d.centroid * 3.2 - 0.12));
      if (m.st.hueSm === undefined) m.st.hueSm = 0.5;
      m.st.hueSm += (bal - m.st.hueSm) * Math.min(1, dt * 6);
      var hue = s.corGrave + (s.corAgudo - s.corGrave) * m.st.hueSm;
      var col = [((hue % 360) + 360) % 360, 88, 55 + d.rms * 100];
      var H = buf.height, mid = H / 2, amp = H * 0.47;
      bc.clearRect(buf.width - dx, 0, dx, H);
      var y0 = mid - Math.min(1, m.st.emx) * amp, y1 = mid - Math.max(-1, m.st.emn) * amp;
      // coluna com borda macia (gradiente vertical)
      var g = bc.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, CV.hsla(col, 0.15));
      g.addColorStop(0.25, CV.hsla(col, 0.85));
      g.addColorStop(0.75, CV.hsla(col, 0.85));
      g.addColorStop(1, CV.hsla(col, 0.15));
      bc.fillStyle = g;
      bc.fillRect(buf.width - dx, y0, dx, Math.max(1, y1 - y0));
      bc.fillStyle = CV.hsla(col, 0.5);
      bc.fillRect(buf.width - dx, mid - m.st.erms * amp, dx, Math.max(1, m.st.erms * amp * 2));
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
      var lufs = d.lufsApprox ? d.lufsApprox() : -70;
      var avg = d.lufsAvgVal !== undefined ? d.lufsAvgVal : -70;
      var LMIN = -36, LMAX = 0;
      function toY(v) { return 8 + (1 - (Math.max(LMIN, Math.min(LMAX, v)) - LMIN) / (LMAX - LMIN)) * (h - 52); }
      var col = CV.pal(m, 0, t), colHot = CV.pal(m, 3, t);
      var barW = Math.min(30, w * 0.3), x = w / 2 - barW / 2;
      // trilho e marcas da régua
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(x, 8, barW, h - 52);
      [-30, -23, -14, -9, -6, -3].forEach(function (mk) {
        var y = toY(mk);
        c.fillStyle = 'rgba(255,255,255,0.14)';
        c.fillRect(x - 4, y, barW + 8, 1);
        label(c, String(mk), x - 8, y + 3, 'right');
      });
      // barra atual
      var yv = toY(lufs);
      var hot = lufs > -9;
      c.shadowBlur = s.glow; c.shadowColor = CV.hsla(hot ? colHot : col, 1);
      c.fillStyle = CV.hsla(hot ? colHot : col, 0.92);
      c.fillRect(x, yv, barW, 8 + (h - 52) - yv);
      c.shadowBlur = 0;
      // marcador da média
      var ya = toY(avg);
      c.fillStyle = '#fff';
      c.fillRect(x - 6, ya - 1, barW + 12, 2);
      // marcador do alvo
      var yt = toY(s.alvo);
      c.strokeStyle = 'rgba(240,239,233,0.6)';
      c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(x - 6, yt); c.lineTo(x + barW + 6, yt); c.stroke();
      c.setLineDash([]);
      // números
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.font = '600 ' + Math.min(20, h * 0.14) + 'px "SF Mono", ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText(lufs <= -69 ? '-∞' : lufs.toFixed(1), w / 2, h - 24);
      c.font = '10px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillText('MÉD ' + (avg <= -69 ? '-∞' : avg.toFixed(1)), w / 2, h - 10);
      label(c, 'LUFS≈', w / 2, 14, 'center');
    }
  });

  /* ================= ESPAÇO ESTÉREO ================= */
  CV.register('gonio', {
    name: 'Espaço estéreo', group: 'Estúdio',
    defaults: defs({ trail: 0.15, fog: 0.9 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0.02, max: 0.5, step: 0.01, def: 0.15 },
      { k: 'fog', label: 'Ambiente', min: 0, max: 1.5, step: 0.05, def: 0.9 }
    ]),
    init: function (m) { m.st.rot = 0; m.st.wsm = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
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
        c.globalCompositeOperation = 'lighter';
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
        c.globalCompositeOperation = 'source-over';
      }
      // nuvem orgânica de amostras: sem grade, sem mira
      var L = d.timeL, Rr = d.timeR, n = Math.min(L.length, Rr.length);
      var sc = R * s.sens;
      var mono = CV.isMono(m);
      c.globalCompositeOperation = 'lighter';
      for (var i = 0; i < n; i += 3) {
        var x = (L[i] - Rr[i]) * 0.707, y = -(L[i] + Rr[i]) * 0.707;
        var depth = 1 - i / n; // amostra recente = mais perto
        var r2 = Math.sqrt(x * x + y * y);
        var col = mono ? [0, 0, 100] : CV.pal(m, Math.floor(r2 * 8), t);
        var sz = 0.6 + depth * 1.6 + r2 * 2.4;
        c.fillStyle = CV.hsla(col, Math.min(0.6, (0.05 + r2 * 1.3) * (0.35 + depth)));
        c.beginPath();
        c.arc(cx + x * sc * (1 + tiltX), cy + y * sc * (0.9 + tiltY), sz, 0, 6.283);
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
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
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(w * 0.2, h - 12, w * 0.6, 2);
      c.fillStyle = CV.hsla(acc, 0.75);
      c.fillRect(w / 2 - bw / 2, h - 12, bw, 2);
      label(c, 'L', w * 0.2 - 10, h - 8);
      label(c, 'R', w * 0.8 + 4, h - 8);
    }
  });

  /* ================= OSCILOSCÓPIO ================= */
  CV.register('scope', {
    name: 'Osciloscópio', group: 'Estúdio',
    defaults: defs({ trail: 0.25, glow: 18, linhas: 1, fosforo: 1 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Persistência', min: 0.05, max: 0.6, step: 0.01, def: 0.25 },
      { k: 'linhas', label: 'Camadas', min: 1, max: 3, step: 1, def: 1 },
      { k: 'fosforo', label: 'Verde fósforo', min: 0, max: 1, step: 1, def: 1 }
    ]),
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
      c.fillRect(0, 0, w, h);
      if (!d) return;
      var td = d.time, n = td.length;
      var start = 0;
      for (var i = 1; i < n / 2; i++) if (td[i - 1] <= 0 && td[i] > 0) { start = i; break; }
      var span = Math.floor(n / 2);
      var layers = Math.round(s.linhas);
      for (var ly = 0; ly < layers; ly++) {
        var col;
        if (s.fosforo >= 0.5) col = [130, 90, 62];
        else col = CV.isMono(m) ? [0, 0, 96] : CV.pal(m, 1 + ly, t);
        var off = ly * 40, ampMul = 1 - ly * 0.25;
        c.shadowBlur = s.glow; c.shadowColor = CV.hsla(col, 1);
        c.strokeStyle = CV.hsla(col, 0.95 - ly * 0.3);
        c.lineWidth = 1.8 - ly * 0.4; c.beginPath();
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
    defaults: defs(),
    schema: COMMON,
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d) { c.clearRect(0, 0, w, h); return; }
      var dx = Math.max(1, Math.round(1.2 * s.speed * (m.dpr || 1)));
      bc.globalCompositeOperation = 'copy';
      bc.drawImage(buf, -dx, 0);
      bc.globalCompositeOperation = 'source-over';
      var H = buf.height, n = d.freq.length;
      var FMIN = 30, FMAX = 16000;
      bc.clearRect(buf.width - dx, 0, dx, H);
      var rows = Math.min(160, H);
      for (var r = 0; r < rows; r++) {
        var fr = FMIN * Math.pow(FMAX / FMIN, 1 - r / (rows - 1));
        var bin = Math.min(n - 1, Math.round(fr / (22050 / n)));
        var v = Math.pow(d.freq[bin] / 255, 1.3) * s.sens; if (v > 1) v = 1;
        if (v < 0.03) continue;
        var col;
        if (m.s.colorMode !== 'custom' && CV.theme === 'mono') col = [0, 0, v * 100];
        else { var base = CV.pal(m, 0, t); col = [(base[0] + v * 70) % 360, base[1], 12 + v * 55]; }
        bc.fillStyle = CV.hsla(col, Math.min(1, 0.15 + v));
        bc.fillRect(buf.width - dx, r / rows * H, dx, H / rows + 1);
      }
      c.clearRect(0, 0, w, h);
      c.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, w, h);
      // hover: qual frequência é essa linha
      if (m.mouse && m.mouse.over) {
        var fr2 = FMIN * Math.pow(FMAX / FMIN, 1 - m.mouse.y / h);
        c.strokeStyle = 'rgba(240,239,233,0.45)';
        c.beginPath(); c.moveTo(0, m.mouse.y); c.lineTo(w, m.mouse.y); c.stroke();
        var txt = CV.fmtHz(fr2) + ' · ' + CV.noteName(fr2);
        c.font = '10px "SF Mono", ui-monospace, monospace';
        var tw = c.measureText(txt).width;
        c.fillStyle = 'rgba(7,7,11,0.85)';
        c.fillRect(6, m.mouse.y - 20, tw + 8, 15);
        c.fillStyle = '#f0efe9';
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
    '  float lum = 0.10 + f*f*(0.6 + u_bass*1.3) + u_bass*0.75 + mpush*0.5;',
    '  col *= lum;',
    '  col += u_high * 0.55 * pow(noise(p*40.0 + t*8.0), 6.0);',
    '  col += u_beat * 0.25;',
    '  float vig = 1.0 - dot(uv,uv)*0.55;',
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
        c.fillStyle = '#07070b'; c.fillRect(0, 0, m.w, m.h);
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
    '  col *= (0.2 + stripes*0.5 + tex*0.6) * (0.55 + u_bass*0.9);',
    '  col += pal(u_hue + 0.5) * rings * (0.12 + u_beat*0.5);',
    '  col += u_high * 0.4 * pow(noise(vec2(a*30.0, depth*2.0) + t*4.0), 5.0);',
    '  col *= smoothstep(0.0, 0.14, r);',
    '  float vig = 1.0 - dot(uv,uv)*0.4;',
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
        c.fillStyle = '#07070b'; c.fillRect(0, 0, m.w, m.h);
      }
    }
  });

  /* ================= CALEIDOSCÓPIO ================= */
  var KALEIDO_FRAG = [
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);',
    '  float t = u_t;',
    '  float r = length(uv);',
    '  float a = atan(uv.y, uv.x) + t*0.15 + (u_mouse.x - 0.5)*2.0;',
    '  float seg = max(2.0, u_a + floor(u_mid*4.0));',
    '  float wedge = 6.2831 / seg;',
    '  a = abs(mod(a, wedge) - wedge*0.5);',
    '  vec2 p = vec2(cos(a), sin(a)) * r * 2.2;',
    '  vec2 q = vec2(fbm(p + t*0.12), fbm(p - t*0.1 + vec2(3.7,9.1)));',
    '  float f = fbm(p + (u_b + u_bass*3.0)*q);',
    '  vec3 col = pal(u_hue + f*1.4 + r*0.3);',
    '  col *= (0.25 + f*f*1.5 + u_bass*0.8);',
    '  col += u_beat * 0.25 * pal(u_hue + 0.4);',
    '  col += u_high * 0.5 * pow(noise(p*30.0 + t*6.0), 6.0);',
    '  col *= 1.0 - r*0.35;',
    '  gl_FragColor = vec4(col * (0.02 + 0.98*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('kaleido', {
    name: 'Caleidoscópio', group: 'Arte', webgl: true,
    defaults: defs({ seg: 6, warp: 3 }),
    schema: [
      { k: 'sens', label: 'Sensibilidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'seg', label: 'Espelhos', min: 2, max: 14, step: 1, def: 6 },
      { k: 'warp', label: 'Derretimento', min: 0.5, max: 8, step: 0.1, def: 3 }
    ],
    init: function (m) { CV.glSetup(m, KALEIDO_FRAG); },
    draw: function (m, d, dt, t) {
      if (!CV.glFrame(m, d, dt, m.s.seg, m.s.warp)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = '#07070b'; c.fillRect(0, 0, m.w, m.h);
      }
    }
  });

  /* ================= FERRO (fluido 3D) ================= */
  CV.register('ferro', {
    name: 'Ferro (fluido)', group: 'Arte',
    defaults: defs({ goo: 16, gloss: 1.2, inverte: 0 }),
    schema: COMMON.concat([
      { k: 'goo', label: 'Viscosidade', min: 6, max: 26, step: 1, def: 16 },
      { k: 'gloss', label: 'Acabamento 3D', min: 0, max: 2, step: 0.05, def: 1.2 },
      { k: 'inverte', label: 'Fundo claro', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) {
      m.st.balls = [];
      for (var i = 0; i < 8; i++) {
        m.st.balls.push({ x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6.28, r0: 0.5 + Math.random() * 0.6 });
      }
      // textura fina pra pele do fluido
      var nz = document.createElement('canvas');
      nz.width = nz.height = 128;
      var nc = nz.getContext('2d');
      if (nc && nc.createImageData) {
        var img = nc.createImageData(128, 128);
        for (var j = 0; j < img.data.length; j += 4) {
          var v = 108 + Math.random() * 40;
          img.data[j] = v; img.data[j + 1] = v; img.data[j + 2] = v; img.data[j + 3] = 255;
        }
        nc.putImageData(img, 0, 0);
      }
      m.st.noise = nz;
    },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      var inv = s.inverte >= 0.5;
      bc.fillStyle = '#000'; bc.fillRect(0, 0, buf.width, buf.height);
      var cx = buf.width / 2, cy = buf.height / 2;
      var base = Math.min(buf.width, buf.height);
      var gate = CV.gate(m, d, dt);
      var bass = d ? d.bass * s.sens : 0, beat = d ? d.beatPulse : 0, high = d ? d.high : 0;
      // sem áudio o fluido encolhe até sumir; grave infla
      var R = base * (0.015 + (0.085 + bass * 0.18) * gate);
      // o relógio do fluido é a música
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.08 + gate * 1.3 + beat * 0.8);
      var dpr = m.dpr || 1;
      // mouse puxa o fluido
      var mAtt = null;
      if (m.mouse && m.mouse.over) mAtt = { x: (m.mouse.x - w / 2) * dpr, y: (m.mouse.y - h / 2) * dpr };
      bc.fillStyle = '#fff';
      m.st.balls.forEach(function (b, i) {
        var tt = m.st.pt;
        var orb = 0.25 + gate * 0.75;
        var tx = Math.cos(b.ph + tt * (0.4 + i * 0.07)) * base * (0.06 + bass * 0.16 + beat * 0.12) * orb;
        var ty = Math.sin(b.ph * 1.7 + tt * (0.5 + i * 0.05)) * base * (0.05 + bass * 0.13 + beat * 0.12) * orb;
        if (mAtt) { tx = tx * 0.4 + mAtt.x * 0.6; ty = ty * 0.4 + mAtt.y * 0.6; }
        b.vx += ((tx - b.x) * 6 - b.vx * 3.5) * dt;
        b.vy += ((ty - b.y) * 6 - b.vy * 3.5) * dt;
        if (d && d.beat) { b.vx += (Math.random() - 0.5) * base * 64 * dt; b.vy += (Math.random() - 0.5) * base * 64 * dt; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        bc.beginPath();
        bc.arc(cx + b.x, cy + b.y, R * b.r0, 0, 6.283);
        bc.fill();
        if (high > 0.12) {
          for (var k2 = 0; k2 < 3; k2++) {
            var an = b.ph + k2 * 2.1 + t * 2.4;
            var rr = R * b.r0 * (1 + high * 1.9);
            bc.beginPath();
            bc.arc(cx + b.x + Math.cos(an) * rr, cy + b.y + Math.sin(an) * rr, R * 0.16 * (0.6 + high), 0, 6.283);
            bc.fill();
          }
        }
      });
      // goo: blur + contraste
      c.clearRect(0, 0, w, h);
      c.save();
      c.filter = 'blur(' + s.goo + 'px) contrast(30)';
      c.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, w, h);
      c.restore();
      var mono = CV.isMono(m);
      // tinta
      c.save();
      if (inv) {
        c.globalCompositeOperation = 'difference';
        c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      } else if (!mono) {
        c.globalCompositeOperation = 'multiply';
        var col = CV.pal(m, 0, t), col2 = CV.pal(m, 1, t);
        var g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, CV.hsla(col, 1)); g.addColorStop(1, CV.hsla(col2, 1));
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
      c.restore();
      /* acabamento 3D: luz, espelho e sombra (só onde tem fluido) */
      if (s.gloss > 0) {
        var lit = s.gloss * (0.15 + gate * 0.85);
        // recorte aproximado: círculos dos glóbulos
        c.save();
        c.beginPath();
        m.st.balls.forEach(function (b) {
          c.moveTo(w / 2 + (b.x + R * b.r0 * 1.15) / dpr, h / 2 + b.y / dpr);
          c.arc(w / 2 + b.x / dpr, h / 2 + b.y / dpr, R * b.r0 * 1.15 / dpr, 0, 6.283);
        });
        c.clip();
        // brilho especular no alto de cada glóbulo
        c.globalCompositeOperation = inv ? 'multiply' : 'screen';
        m.st.balls.forEach(function (b) {
          var bx = w / 2 + b.x / dpr, by = h / 2 + b.y / dpr, br = R * b.r0 / dpr;
          var sg = c.createRadialGradient(bx - br * 0.35, by - br * 0.45, 0, bx - br * 0.35, by - br * 0.45, br * 0.9);
          var hi = inv ? 'rgba(60,60,60,' : 'rgba(255,255,255,';
          sg.addColorStop(0, hi + (0.4 * lit * (0.5 + bass)) + ')');
          sg.addColorStop(0.4, hi + (0.1 * lit) + ')');
          sg.addColorStop(1, hi + '0)');
          c.fillStyle = sg;
          c.fillRect(bx - br * 1.4, by - br * 1.4, br * 2.8, br * 2.8);
        });
        // reflexo que varre (ambiente passando pelo metal)
        c.globalCompositeOperation = inv ? 'multiply' : 'overlay';
        var sweep = ((t * 60 * s.speed) % (w + 300)) - 150;
        var rg = c.createLinearGradient(sweep - 50, 0, sweep + 50, h * 0.4);
        var rc = inv ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
        rg.addColorStop(0, rc + '0)');
        rg.addColorStop(0.5, rc + (0.24 * lit * (0.5 + (d ? d.mid : 0))) + ')');
        rg.addColorStop(1, rc + '0)');
        c.fillStyle = rg;
        c.fillRect(0, 0, w, h);
        // pele do fluido: textura granular fina se movendo devagar
        c.globalCompositeOperation = 'overlay';
        c.globalAlpha = 0.22 * lit;
        var ox = (t * 26 * s.speed) % 128, oy = (t * 15 * s.speed) % 128;
        for (var nx = -128; nx < w + 128; nx += 128)
          for (var nyy = -128; nyy < h + 128; nyy += 128)
            c.drawImage(m.st.noise, nx + ox, nyy + oy);
        c.globalAlpha = 1;
        // sombreamento esférico por glóbulo: centro claro, borda funda
        c.globalCompositeOperation = 'multiply';
        m.st.balls.forEach(function (b) {
          var bx = w / 2 + b.x / dpr, by = h / 2 + b.y / dpr, br = R * b.r0 / dpr * 1.18;
          if (br < 2) return;
          var sph = c.createRadialGradient(bx - br * 0.22, by - br * 0.28, br * 0.1, bx, by, br);
          sph.addColorStop(0, 'rgba(255,255,255,1)');
          sph.addColorStop(0.7, 'rgba(228,228,232,1)');
          sph.addColorStop(1, 'rgba(140,140,152,1)');
          c.fillStyle = sph;
          c.fillRect(bx - br, by - br, br * 2, br * 2);
        });
        // glint: o pontinho de luz dura que vende o 3D
        c.globalCompositeOperation = inv ? 'multiply' : 'screen';
        m.st.balls.forEach(function (b) {
          var bx = w / 2 + b.x / dpr, by = h / 2 + b.y / dpr, br = R * b.r0 / dpr;
          if (br < 3) return;
          c.fillStyle = inv ? 'rgba(45,45,45,0.5)' : 'rgba(255,255,255,' + (0.55 * lit) + ')';
          c.beginPath();
          c.ellipse(bx - br * 0.3, by - br * 0.42, br * 0.13, br * 0.07, -0.5, 0, 6.283);
          c.fill();
          c.fillStyle = inv ? 'rgba(45,45,45,0.3)' : 'rgba(255,255,255,' + (0.25 * lit) + ')';
          c.beginPath();
          c.ellipse(bx + br * 0.18, by + br * 0.3, br * 0.05, br * 0.03, 0.6, 0, 6.283);
          c.fill();
        });
        // sombra interna embaixo: volume
        c.globalCompositeOperation = 'multiply';
        var dg = c.createLinearGradient(0, h * 0.4, 0, h);
        dg.addColorStop(0, 'rgba(255,255,255,1)');
        dg.addColorStop(1, 'rgba(130,130,150,1)');
        c.fillStyle = dg;
        c.fillRect(0, 0, w, h);
        c.restore();
      }
    }
  });

  /* ================= LISSAJOUS ================= */
  CV.register('lissa', {
    name: 'Lissajous', group: 'Arte',
    defaults: defs({ trail: 0.06, modo: 0 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Persistência', min: 0.02, max: 0.3, step: 0.01, def: 0.06 },
      { k: 'modo', label: 'Harmônico', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) { m.st.rot = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
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
      c.globalCompositeOperation = 'lighter';
      c.shadowBlur = s.glow * 0.5; c.shadowColor = CV.hsla(col, 1);
      if (s.modo >= 0.5) {
        var a = 2 + Math.round(d.bass * s.sens * 5), b2 = 3 + Math.round(d.high * s.sens * 6);
        var ph = t * 0.5 * s.speed, amp = sc * (0.12 + d.level * 3 * s.sens) * (0.2 + 0.8 * gate);
        c.strokeStyle = CV.hsla(col, 0.22 * (0.1 + 0.9 * gate));
        c.lineWidth = 0.8;
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
          c.strokeStyle = CV.hsla(cl, 0.16 * (0.1 + 0.9 * gate));
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
      c.globalCompositeOperation = 'source-over';
      c.shadowBlur = 0;
    }
  });

  /* ================= TRAÇO (linha viva) ================= */
  CV.register('trace', {
    name: 'Traço', group: 'Arte',
    defaults: defs({ glow: 8, trail: 0.14, tensao: 1 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Persistência', min: 0.04, max: 0.4, step: 0.01, def: 0.14 },
      { k: 'tensao', label: 'Tensão', min: 0.2, max: 3, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.ys = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
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
      c.shadowBlur = s.glow; c.shadowColor = CV.hsla(col, 1);
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
    defaults: defs({ glow: 4, dens: 1, trail: 0.08 }),
    schema: COMMON.concat([
      { k: 'dens', label: 'Densidade', min: 0.3, max: 2.5, step: 0.05, def: 1 },
      { k: 'trail', label: 'Persistência', min: 0.02, max: 0.3, step: 0.01, def: 0.08 }
    ]),
    init: function (m) { m.st.ps = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
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
      c.globalCompositeOperation = 'lighter';
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
        var bright = p.b > 0.92 ? 0.7 : 0.16; // poucas estrelas, muito pó
        c.fillStyle = CV.hsla(col, (0.03 + bright * p.life * (0.25 + energy)) * (0.1 + 0.9 * gate));
        if (s.glow > 0 && p.b > 0.92) { c.shadowBlur = s.glow; c.shadowColor = CV.hsla(col, 1); }
        c.fillRect(p.x, p.y, p.b > 0.92 ? 1.8 : 1.1, p.b > 0.92 ? 1.8 : 1.1);
        c.shadowBlur = 0;
      }
      c.globalCompositeOperation = 'source-over';
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
    defaults: defs({ glow: 6, camadas: 14 }),
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
        if (depth > 0.9 && s.glow > 0) { c.shadowBlur = s.glow; c.shadowColor = CV.hsla(col, 1); }
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
    defaults: defs({ trail: 0.07, fios: 5, glow: 10 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Persistência', min: 0.02, max: 0.3, step: 0.01, def: 0.07 },
      { k: 'fios', label: 'Fios', min: 2, max: 9, step: 1, def: 5 }
    ]),
    init: function (m) { m.st.threads = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.fillStyle = 'rgba(7,7,11,' + s.trail + ')';
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
      c.globalCompositeOperation = 'lighter';
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
          c.shadowBlur = s.glow * age; c.shadowColor = CV.hsla(cl, 1);
          c.beginPath();
          c.moveTo(th.hist[k2 - 1][0], th.hist[k2 - 1][1]);
          c.lineTo(th.hist[k2][0], th.hist[k2][1]);
          c.stroke();
        }
      });
      c.shadowBlur = 0;
      c.globalCompositeOperation = 'source-over';
    }
  });

})();
