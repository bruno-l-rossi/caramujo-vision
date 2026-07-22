/* Caramujo Vision — app: grade, painéis, ajustes, temas, gravação, fontes de áudio */

(function () {
  'use strict';
  var CV = window.CV;
  var engine = window.engine = new AudioEngine();

  var THEMES = [['mono', 'EXO'], ['psy', 'PSY'], ['neon', 'NEON'], ['vhs', 'VHS']];
  var TEXTURES = [['off', 'SEM TEXTURA'], ['grain', 'GRÃO'], ['vhs', 'VHS']];

  var DEFAULT_LAYOUT = [
    { mod: 'wavescroll', w: 3, h: 2 }, { mod: 'loudness', w: 1, h: 2 },
    { mod: 'gonio', w: 2, h: 2 }, { mod: 'scope', w: 2, h: 2 }, { mod: 'spectrum', w: 4, h: 2 },
    { mod: 'psy', w: 4, h: 4 }, { mod: 'flow', w: 4, h: 4 }, { mod: 'ferro', w: 4, h: 4 },
    { mod: 'trace', w: 8, h: 2 }, { mod: 'ascii', w: 4, h: 2 },
    { mod: 'wavelayers', w: 8, h: 3 }, { mod: 'lissa', w: 4, h: 3 }
  ];

  var state = load() || { theme: 'mono', texture: 'off', panels: null };
  CV.theme = state.theme;
  var panels = [];
  var uid = 0;

  function load() {
    try { return JSON.parse(localStorage.getItem('cv-state-v3')); } catch (e) { return null; }
  }
  function save() {
    state.panels = panels.map(function (p) { return { mod: p.modId, w: p.gw, h: p.gh, s: p.s }; });
    try { localStorage.setItem('cv-state-v3', JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- painéis ---------- */
  var grid = document.getElementById('grid');

  function createPanel(cfg) {
    var def = CV.registry[cfg.mod];
    if (!def) return null;
    var p = {
      id: 'p' + (uid++), modId: cfg.mod, def: def,
      gw: cfg.w || 3, gh: cfg.h || 2,
      s: Object.assign({}, def.defaults, cfg.s || {}),
      st: {}, w: 0, h: 0, dpr: 1
    };
    var el = document.createElement('div');
    el.className = 'panel';
    el.id = p.id;
    el.innerHTML =
      '<canvas></canvas>' +
      '<div class="pbar">' +
      '<span class="ptitle">' + def.name.toUpperCase() + '</span>' +
      '<span class="pbtns">' +
      '<button data-a="cfg" title="Ajustes">⚙</button>' +
      '<button data-a="wminus" title="Mais estreito">‹</button>' +
      '<button data-a="wplus" title="Mais largo">›</button>' +
      '<button data-a="hminus" title="Mais baixo">˄</button>' +
      '<button data-a="hplus" title="Mais alto">˅</button>' +
      '<button data-a="rec" title="Gravar vídeo deste painel">●</button>' +
      '<button data-a="full" title="Tela cheia">⛶</button>' +
      '<button data-a="close" title="Fechar">✕</button>' +
      '</span></div>';
    p.el = el;
    p.canvas = el.querySelector('canvas');
    applySpan(p);
    grid.appendChild(el);

    var ro = new ResizeObserver(function () { resizePanel(p); });
    ro.observe(el);
    resizePanel(p);

    // mouse pro módulo reagir (hover com leitura, arte que segue o cursor)
    p.mouse = { x: 0, y: 0, over: false };
    el.addEventListener('mousemove', function (ev) {
      var r = el.getBoundingClientRect();
      p.mouse.x = ev.clientX - r.left;
      p.mouse.y = ev.clientY - r.top;
      p.mouse.over = true;
    });
    el.addEventListener('mouseleave', function () { p.mouse.over = false; });

    if (!def.webgl) p.ctx = p.canvas.getContext('2d');
    def.init(p);

    el.querySelector('.pbar').addEventListener('click', function (ev) {
      var a = ev.target.getAttribute && ev.target.getAttribute('data-a');
      if (!a) return;
      if (a === 'close') { removePanel(p); }
      if (a === 'wplus') { p.gw = Math.min(12, p.gw + 1); applySpan(p); save(); }
      if (a === 'wminus') { p.gw = Math.max(1, p.gw - 1); applySpan(p); save(); }
      if (a === 'hplus') { p.gh = Math.min(8, p.gh + 1); applySpan(p); save(); }
      if (a === 'hminus') { p.gh = Math.max(1, p.gh - 1); applySpan(p); save(); }
      if (a === 'full') { el.requestFullscreen && el.requestFullscreen(); }
      if (a === 'cfg') { toggleCfg(p); }
      if (a === 'rec') { toggleRec(p, ev.target); }
    });

    // arrastar pela barra do título (o painel em si fica livre pros sliders e mouse)
    var bar = el.querySelector('.pbar');
    bar.setAttribute('draggable', 'true');
    bar.addEventListener('dragstart', function (ev) { ev.dataTransfer.setData('text/plain', p.id); el.classList.add('dragging'); });
    bar.addEventListener('dragend', function () { el.classList.remove('dragging'); });
    el.addEventListener('dragover', function (ev) { ev.preventDefault(); });
    el.addEventListener('drop', function (ev) {
      ev.preventDefault();
      var srcId = ev.dataTransfer.getData('text/plain');
      var src = document.getElementById(srcId);
      if (src && src !== el) { grid.insertBefore(src, el); syncOrder(); save(); }
    });

    panels.push(p);
    return p;
  }

  function applySpan(p) {
    p.el.style.gridColumn = 'span ' + p.gw;
    p.el.style.gridRow = 'span ' + p.gh;
  }
  function resizePanel(p) {
    var r = p.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    p.dpr = Math.min(2, window.devicePixelRatio || 1);
    p.w = Math.round(r.width); p.h = Math.round(r.height);
    p.canvas.width = Math.round(r.width * p.dpr);
    p.canvas.height = Math.round(r.height * p.dpr);
    if (p.ctx) { p.ctx.setTransform(p.dpr, 0, 0, p.dpr, 0, 0); }
  }
  function removePanel(p) {
    if (p.rec) stopRec(p);
    if (drawerPanel === p) closeDrawer();
    p.el.remove();
    panels = panels.filter(function (x) { return x !== p; });
    save();
  }
  function syncOrder() {
    var ordered = [];
    grid.querySelectorAll('.panel').forEach(function (el) {
      var f = panels.find(function (p) { return p.id === el.id; });
      if (f) ordered.push(f);
    });
    panels = ordered;
  }

  /* ---------- ajustes na gaveta lateral (não cobre o visual) ---------- */
  var drawerPanel = null;
  var drawerEl = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawerbody');
  var drawerTitle = document.getElementById('drawertitle');
  document.getElementById('drawerclose').addEventListener('click', closeDrawer);
  function closeDrawer() {
    drawerPanel = null;
    document.body.classList.remove('drawer-open');
  }
  function toggleCfg(p) {
    if (drawerPanel === p) { closeDrawer(); return; }
    drawerPanel = p;
    document.body.classList.add('drawer-open');
    drawerTitle.textContent = p.def.name.toUpperCase();
    var box = drawerBody;
    box.innerHTML = '';
    var rows = [];
    rows.push('<div class="cfgrow"><label>Cor</label><select data-k="colorMode">' +
      '<option value="theme"' + (p.s.colorMode === 'theme' ? ' selected' : '') + '>Tema global</option>' +
      '<option value="custom"' + (p.s.colorMode === 'custom' ? ' selected' : '') + '>Própria</option>' +
      '</select></div>');
    rows.push('<div class="cfgrow"><label>Matiz</label><input type="range" data-k="hue" min="0" max="360" step="1" value="' + p.s.hue + '"></div>');
    (p.def.schema || []).forEach(function (f) {
      if (f.type === 'text') {
        rows.push('<div class="cfgrow"><label>' + f.label + '</label>' +
          '<input type="text" data-k="' + f.k + '" data-type="text" value="' + (p.s[f.k] !== undefined ? p.s[f.k] : f.def) + '"></div>');
      } else {
        rows.push('<div class="cfgrow"><label>' + f.label + '</label>' +
          '<input type="range" data-k="' + f.k + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + (p.s[f.k] !== undefined ? p.s[f.k] : f.def) + '"></div>');
      }
    });
    rows.push('<div class="cfgrow"><button class="reset">Restaurar padrão</button></div>');
    box.innerHTML = rows.join('');
    box.querySelectorAll('input,select').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-k');
        if (inp.tagName === 'SELECT' || inp.getAttribute('data-type') === 'text') p.s[k] = inp.value;
        else p.s[k] = parseFloat(inp.value);
        save();
      });
    });
    box.querySelector('.reset').addEventListener('click', function () {
      p.s = Object.assign({}, p.def.defaults);
      save(); drawerPanel = null; toggleCfg(p);
    });
  }

  /* ---------- gravação por painel ---------- */
  function toggleRec(p, btn) { p.rec ? stopRec(p) : startRec(p, btn); }
  function startRec(p, btn) {
    engine.ensureCtx();
    var stream = p.canvas.captureStream(60);
    var at = engine.recordDest && engine.recordDest.stream.getAudioTracks()[0];
    if (at) stream.addTrack(at);
    var mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      var blob = new Blob(chunks, { type: 'video/webm' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'caramujo-vision-' + p.modId + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.webm';
      a.click();
    };
    rec.start();
    p.rec = rec;
    p.el.classList.add('recording');
  }
  function stopRec(p) {
    if (p.rec) { p.rec.stop(); p.rec = null; }
    p.el.classList.remove('recording');
  }

  /* ---------- barra superior ---------- */
  var elSource = document.getElementById('source');
  var elTheme = document.getElementById('theme');
  var elTexture = document.getElementById('texture');
  var elAdd = document.getElementById('addmod');
  var elHelp = document.getElementById('help');
  var elStatus = document.getElementById('status');

  THEMES.forEach(function (t) {
    var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1];
    if (t[0] === state.theme) o.selected = true;
    elTheme.appendChild(o);
  });
  elTheme.addEventListener('change', function () { state.theme = CV.theme = elTheme.value; save(); });

  TEXTURES.forEach(function (t) {
    var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1];
    if (t[0] === state.texture) o.selected = true;
    elTexture.appendChild(o);
  });
  elTexture.addEventListener('change', function () { state.texture = elTexture.value; save(); });

  Object.keys(CV.registry).forEach(function (id) {
    var o = document.createElement('option');
    o.value = id;
    o.textContent = CV.registry[id].group + ' · ' + CV.registry[id].name;
    elAdd.appendChild(o);
  });
  elAdd.addEventListener('change', function () {
    if (!elAdd.value) return;
    createPanel({ mod: elAdd.value, w: 3, h: 3 });
    elAdd.value = '';
    save();
  });

  function setStatus(txt, ok) {
    elStatus.textContent = txt;
    elStatus.className = ok ? 'ok' : '';
  }

  function populateSources(inputs) {
    elSource.innerHTML = '';
    [['beat', 'LEGO · BEAT DA SEMANA'], ['upload', 'UPLOAD DE FAIXA…'], ['ask', 'ÁUDIO DO COMPUTADOR…'], ['synth', 'BEAT DEMO (SINTÉTICO)']].forEach(function (opt) {
      var o = document.createElement('option'); o.value = opt[0]; o.textContent = opt[1];
      elSource.appendChild(o);
    });
    (inputs || []).forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = (d.label || 'Entrada de áudio').toUpperCase();
      elSource.appendChild(o);
    });
  }
  populateSources([]);

  /* ---------- guarda o beat da semana dentro do navegador (IndexedDB) ---------- */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('cv-store', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function saveBeat(f) {
    idb().then(function (db) {
      db.transaction('files', 'readwrite').objectStore('files').put(f, 'beat');
    }).catch(function () {});
  }
  function loadBeat() {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction('files').objectStore('files').get('beat');
        rq.onsuccess = function () { res(rq.result || null); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }

  var filePick = document.getElementById('filepick');
  function pickFile(cb) {
    filePick.value = '';
    filePick.onchange = function () { cb(filePick.files[0] || null); };
    filePick.click();
  }

  function playBeatFile(file) {
    engine.playFile(file).then(function () {
      engine.sourceLabel = 'LEGO · BEAT DA SEMANA';
      setStatus(engine.sourceLabel, true);
      syncPlayBtn();
    }).catch(function () { setStatus('ERRO AO TOCAR O BEAT', false); });
  }

  /* Beat da semana: 1º do navegador (salvo), 2º da pasta assets (só funciona
     com endereço https), 3º pede o arquivo uma vez e guarda. */
  function beatFlow() {
    loadBeat().then(function (f) {
      if (f) { playBeatFile(f); return; }
      if (location.protocol !== 'file:') {
        engine.startDemo().then(function (kind) {
          if (kind === 'blocked') setStatus('LEGO CARREGADO · CLICA NO ▶', true);
          else if (kind === 'synth') setStatus('DEMO SINTÉTICO · SEM O LEGO EM assets/', false);
          else setStatus(engine.sourceLabel, true);
          syncPlayBtn();
        });
        return;
      }
      // aberto por arquivo: o navegador silencia áudio da pasta; pede o arquivo 1x e salva
      pickFile(function (file) {
        if (!file) {
          engine.startSynth();
          setStatus('DEMO SINTÉTICO · ESCOLHE O BEAT EM FONTE', false);
          syncPlayBtn();
          return;
        }
        saveBeat(file);
        playBeatFile(file);
      });
    });
  }

  function pickLoopback(inputs) {
    return inputs.find(function (d) { return /blackhole|loopback|soundflower|virtual/i.test(d.label); });
  }

  var elPlay = document.getElementById('play');
  function syncPlayBtn() {
    elPlay.textContent = engine.isPlaying() ? '❚❚' : '▶';
    elPlay.style.opacity = engine.canPause() ? 1 : 0.35;
  }
  elPlay.addEventListener('click', function () {
    if (!engine.canPause()) return;
    engine.togglePlay();
    syncPlayBtn();
  });

  elSource.addEventListener('change', function () {
    var v = elSource.value;
    if (v === 'beat') { beatFlow(); return; }
    if (v === 'synth') {
      engine.startSynth();
      setStatus(engine.sourceLabel, true);
      syncPlayBtn();
      return;
    }
    if (v === 'upload') {
      pickFile(function (file) {
        if (!file) { setStatus('UPLOAD CANCELADO', false); return; }
        engine.playFile(file).then(function () {
          setStatus('TOCANDO: ' + file.name.toUpperCase(), true);
          syncPlayBtn();
        }).catch(function () { setStatus('ERRO AO TOCAR ARQUIVO', false); });
      });
      return;
    }
    if (v === 'ask') {
      engine.startInput(undefined).then(function () {
        return engine.listInputs();
      }).then(function (inputs) {
        populateSources(inputs);
        var lb = pickLoopback(inputs);
        if (lb) {
          return engine.startInput(lb.deviceId).then(function () {
            elSource.value = lb.deviceId;
            setStatus('OUVINDO: ' + lb.label.toUpperCase(), true);
            syncPlayBtn();
          });
        }
        setStatus('SEM DRIVER DE LOOPBACK', false);
        showHelp();
        syncPlayBtn();
      }).catch(function (e) {
        setStatus('PERMISSÃO NEGADA', false);
        showHelp();
      });
      return;
    }
    engine.startInput(v).then(function () {
      var opt = elSource.options[elSource.selectedIndex];
      setStatus('OUVINDO: ' + opt.textContent, true);
      syncPlayBtn();
    }).catch(function () { setStatus('ERRO NA ENTRADA', false); });
  });

  document.getElementById('fullapp').addEventListener('click', function () {
    document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  });
  document.getElementById('reset').addEventListener('click', function () {
    if (!confirm('Restaurar o layout padrão? Seus ajustes serão apagados.')) return;
    localStorage.removeItem('cv-state-v3');
    location.reload();
  });

  /* ---------- ajuda (como captar o som do computador) ---------- */
  var modal = document.getElementById('modal');
  elHelp.addEventListener('click', showHelp);
  document.getElementById('modalclose').addEventListener('click', function () { modal.classList.add('hidden'); });
  function showHelp() { modal.classList.remove('hidden'); }

  /* ---------- arrastar arquivo de áudio ---------- */
  window.addEventListener('dragover', function (e) {
    e.preventDefault();
    var isFile = e.dataTransfer && e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0;
    if (isFile) document.body.classList.add('dropping');
  });
  window.addEventListener('dragleave', function (e) { if (e.target === document.body || e.relatedTarget === null) document.body.classList.remove('dropping'); });
  window.addEventListener('drop', function (e) {
    e.preventDefault();
    document.body.classList.remove('dropping');
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || !/audio|mp3|wav|m4a|flac|ogg/i.test(f.type + f.name)) return;
    engine.playFile(f).then(function () {
      setStatus('TOCANDO: ' + f.name.toUpperCase(), true);
      syncPlayBtn();
    }).catch(function () { setStatus('ERRO AO TOCAR ARQUIVO', false); });
  });

  /* ---------- textura global ---------- */
  var tex = document.getElementById('texture-overlay');
  var texCtx = tex.getContext('2d');
  var noiseC = document.createElement('canvas');
  noiseC.width = 256; noiseC.height = 256;
  (function () {
    var nc = noiseC.getContext('2d');
    var img = nc.createImageData(256, 256);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random() * 255;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nc.putImageData(img, 0, 0);
  })();
  function drawTexture(t) {
    var mode = state.texture;
    var w = tex.width = window.innerWidth, h = tex.height = window.innerHeight;
    if (mode === 'off') { texCtx.clearRect(0, 0, w, h); return; }
    texCtx.clearRect(0, 0, w, h);
    texCtx.globalAlpha = mode === 'vhs' ? 0.09 : 0.06;
    var ox = (Math.random() * 256) | 0, oy = (Math.random() * 256) | 0;
    for (var x = -256; x < w + 256; x += 256)
      for (var y = -256; y < h + 256; y += 256)
        texCtx.drawImage(noiseC, x + ox % 256 - 256, y + oy % 256 - 256);
    if (mode === 'vhs') {
      texCtx.globalAlpha = 0.16;
      texCtx.fillStyle = '#000';
      for (var sy = (t * 30 | 0) % 3; sy < h; sy += 3) texCtx.fillRect(0, sy, w, 1);
      texCtx.globalAlpha = 0.05;
      texCtx.fillStyle = '#f00';
      texCtx.fillRect(1, 0, w, h);
    }
    texCtx.globalAlpha = 1;
  }

  /* ---------- layout inicial ---------- */
  (state.panels && state.panels.length ? state.panels : DEFAULT_LAYOUT).forEach(function (cfg) {
    createPanel({ mod: cfg.mod, w: cfg.w, h: cfg.h, s: cfg.s });
  });

  /* ---------- clique inicial pra liberar áudio ---------- */
  var splash = document.getElementById('splash');
  splash.addEventListener('click', function () {
    splash.classList.add('hidden');
    beatFlow();
  });

  /* ---------- loop principal ---------- */
  var last = performance.now(), texFrame = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = now / 1000;
    var d = null;
    if (engine.ctx && engine.sourceKind !== 'none') {
      engine.update(dt);
      d = engine;
    }
    panels.forEach(function (p) {
      if (p.w < 4) return;
      try { p.def.draw(p, d, dt, t); } catch (e) { /* módulo caiu, segue o baile */ }
    });
    if (++texFrame % 3 === 0) drawTexture(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
