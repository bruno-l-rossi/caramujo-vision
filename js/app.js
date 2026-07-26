/* Caramujo Vision — app: grade, painéis, ajustes, temas, gravação, fontes de áudio */

(function () {
  'use strict';
  var CV = window.CV;
  var engine = window.engine = new AudioEngine();

  var THEMES = [
    ['preto', 'PRETO'], ['papel', 'PAPEL'], ['ardosia', 'ARDÓSIA'],
    ['gelo', 'GELO'], ['areia', 'AREIA'], ['lavanda', 'LAVANDA'],
    ['neon', 'NEON'], ['vhs', 'VHS'], ['oceano', 'OCEANO'], ['floresta', 'FLORESTA'],
    ['rubi', 'RUBI'], ['ambar', 'ÂMBAR'], ['poente', 'POENTE'], ['psy', 'PSY']
  ];
  /* POSIÇÃO: junta num seletor só o arranjo dos módulos e o encaixe da janela.
     Antes eram dois menus quase iguais (layout + barra). dock null = janela normal. */
  var LAYOUTS = [
    ['grid', 'TELA NORMAL', 'off', 'grid'],
    ['dock-top', 'NO TOPO', 'top', 'row'],
    ['dock-bottom', 'NO RODAPÉ', 'bottom', 'row'],
    ['dock-left', 'À ESQUERDA', 'left', 'col'],
    ['dock-right', 'À DIREITA', 'right', 'col']
  ];
  function layoutDef(id) {
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i][0] === id) return LAYOUTS[i];
    return LAYOUTS[0];
  }

  // grade fina (240 col / 240 linhas de referência): passos pequenos = redimensionar liso.
  // valores = 12 colunas antigas × 20, então a aparência é idêntica, só com muito mais precisão.
  var GRID_RES = 240, GW_MAX = 240, GH_MAX = 200;
  var DEFAULT_LAYOUT = [
    { mod: 'spectrum', w: 80, h: 40 }, { mod: 'wavescroll', w: 80, h: 40 },
    { mod: 'loudness', w: 20, h: 40 }, { mod: 'gonio', w: 60, h: 40 },
    { mod: 'scope', w: 80, h: 40 }, { mod: 'spectrogram', w: 80, h: 40 },
    { mod: 'psy', w: 80, h: 80 }, { mod: 'flow', w: 80, h: 80 }, { mod: 'aurora', w: 80, h: 80 },
    { mod: 'enxame', w: 80, h: 80 }, { mod: 'malha', w: 80, h: 80 }, { mod: 'lissa', w: 80, h: 80 },
    { mod: 'trace', w: 160, h: 40 }, { mod: 'cordas', w: 80, h: 40 },
    { mod: 'wavelayers', w: 160, h: 60 }, { mod: 'silk', w: 80, h: 60 }
  ];

  var state = load() || { theme: 'preto', texture: 'off', layout: 'grid', panels: null };
  if (state.theme === 'mono' || state.theme === 'vapor') state.theme = 'preto'; // temas renomeados
  if (!state.layout) state.layout = 'grid';
  // migração pra grade fina: multiplica o tamanho antigo (12 col) por 20. Fica idêntico, só mais preciso.
  if (state.panels && !state.res) {
    var f = GRID_RES / 12;
    state.panels.forEach(function (p) { p.w = Math.round((p.w || 3) * f); p.h = Math.round((p.h || 2) * f); });
  }
  state.res = GRID_RES;
  CV.theme = state.theme;
  var panels = [];
  var uid = 0;

  function load() {
    try { return JSON.parse(localStorage.getItem('cv-state-v7')); } catch (e) { return null; }
  }
  function save() {
    state.panels = panels.map(function (p) { return { mod: p.modId, w: p.gw, h: p.gh, s: p.s }; });
    try { localStorage.setItem('cv-state-v7', JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- painéis ---------- */
  var grid = document.getElementById('grid');

  function createPanel(cfg) {
    var def = CV.registry[cfg.mod];
    if (!def) return null;
    var p = {
      id: 'p' + (uid++), modId: cfg.mod, def: def,
      gw: cfg.w || 60, gh: cfg.h || 40, gx: 0, gy: 0,
      s: Object.assign({}, def.defaults, cfg.s || {}),
      st: {}, w: 0, h: 0, dpr: 1
    };
    var el = document.createElement('div');
    el.className = 'panel';
    el.id = p.id;
    el.innerHTML =
      '<canvas></canvas>' +
      '<div class="pbar">' +
      '<span class="grip" draggable="true" title="Arraste pra reordenar o módulo">⠿</span>' +
      '<span class="pmove" title="Arraste pra mover a janela do app">✥</span>' +
      '<span class="ptitle">' + def.name.toUpperCase() + '</span>' +
      '<span class="pbtns">' +
      '<button data-a="cfg" class="cfg" title="Ajustes deste módulo">⚙</button>' +
      '<button data-a="rec" title="Gravar vídeo deste painel">●</button>' +
      '<button data-a="close" title="Fechar">✕</button>' +
      '</span></div>' +
      '<div class="rz rz-r" data-rz="w" title="Arraste pra mudar a largura">‹›</div>' +
      '<div class="rz rz-b" data-rz="h" title="Arraste pra mudar a altura">˄˅</div>' +
      '<div class="rz rz-c" data-rz="wh" title="Arraste pra redimensionar">⤡</div>';
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
      if (a === 'cfg') { toggleCfg(p); }
      if (a === 'rec') { toggleRec(p, ev.target); }
    });

    // redimensionar arrastando as bordas. Na grade: direita=largura, baixo=altura, canto=os dois.
    // Na linha: só largura. Na coluna: só altura (o peso do painel na fila).
    el.querySelectorAll('.rz').forEach(function (hz) {
      hz.addEventListener('mousedown', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var mode = hz.getAttribute('data-rz'), layout = state.layout;
        var r = el.getBoundingClientRect();
        var colUnit = r.width / Math.max(1, p.gw), rowUnit = r.height / Math.max(1, p.gh);
        var sx = ev.clientX, sy = ev.clientY, gw0 = p.gw, gh0 = p.gh;
        // em linha/coluna, mexer numa borda move SÓ aquela fronteira: o vizinho cede o que este ganha
        var ix = panels.indexOf(p), nb = panels[ix + 1] || null;
        var nbw0 = nb ? nb.gw : 0, nbh0 = nb ? nb.gh : 0;
        var MINU = 8;
        /* GRADE: foto de todo mundo no começo do arrasto. A cada movimento a gente
           recalcula a partir dela, então cruzar uma fronteira nova no meio do caminho
           não acumula erro nem deixa painel por cima de painel. */
        var snap = panels.map(function (o) { return { o: o, gx: o.gx, gy: o.gy, gw: o.gw, gh: o.gh }; });
        var right0 = p.gx + gw0, bottom0 = p.gy + gh0;
        var nbRs = [], nbBs = [], barrierW = GW_MAX - right0, barrierH = GH_MAX - bottom0;
        snap.forEach(function (n) {
          if (n.o === p) return;
          var rowsTouch = (n.gy < p.gy + gh0) && (p.gy < n.gy + n.gh);
          var colsTouch = (n.gx < p.gx + gw0) && (p.gx < n.gx + n.gw);
          if (rowsTouch && n.gx === right0) nbRs.push(n);                       // encosta: cede espaço
          else if (rowsTouch && n.gx > right0) barrierW = Math.min(barrierW, n.gx - right0); // à frente: barreira
          if (colsTouch && n.gy === bottom0) nbBs.push(n);
          else if (colsTouch && n.gy > bottom0) barrierH = Math.min(barrierH, n.gy - bottom0);
        });
        // cresce até o vizinho mais apertado da fronteira, ou até a barreira mais próxima
        var maxGrowW = nbRs.length ? Math.min.apply(null, nbRs.map(function (n) { return n.gw - MINU; })) : barrierW;
        var maxGrowH = nbBs.length ? Math.min.apply(null, nbBs.map(function (n) { return n.gh - MINU; })) : barrierH;
        maxGrowW = Math.min(maxGrowW, barrierW);
        maxGrowH = Math.min(maxGrowH, barrierH);
        document.body.classList.add('resizing'); el.classList.add('rzing');
        function mv(e) {
          if (layout === 'row') {
            if (mode.indexOf('w') < 0) return;
            var dW = Math.round((e.clientX - sx) / colUnit);
            if (nb) {
              dW = Math.max(MINU - gw0, Math.min(nbw0 - MINU, dW)); // nem este nem o vizinho somem
              p.gw = gw0 + dW; nb.gw = nbw0 - dW;
              el.style.flexGrow = p.gw; nb.el.style.flexGrow = nb.gw;
            } else {
              p.gw = Math.max(MINU, Math.min(GW_MAX, gw0 + dW));
              el.style.flexGrow = p.gw;
            }
          } else if (layout === 'col') {
            if (mode.indexOf('h') < 0) return;
            var dH = Math.round((e.clientY - sy) / rowUnit);
            if (nb) {
              dH = Math.max(MINU - gh0, Math.min(nbh0 - MINU, dH));
              p.gh = gh0 + dH; nb.gh = nbh0 - dH;
              el.style.flexGrow = p.gh; nb.el.style.flexGrow = nb.gh;
            } else {
              p.gh = Math.max(MINU, Math.min(GH_MAX, gh0 + dH));
              el.style.flexGrow = p.gh;
            }
          } else {
            // GRADE: mover a fronteira mexe NOS DOIS painéis que se encostam nela.
            // O que cresce empurra o vizinho da direita/de baixo; o lado oposto não sai do lugar.
            // parte SEMPRE da foto inicial: o resultado depende só de onde o mouse está agora
            snap.forEach(function (n) { n.o.gx = n.gx; n.o.gy = n.gy; n.o.gw = n.gw; n.o.gh = n.gh; });
            if (mode.indexOf('w') >= 0) {
              var dGW = Math.max(MINU - gw0, Math.min(maxGrowW, Math.round((e.clientX - sx) / colUnit)));
              p.gw = gw0 + dGW;
              nbRs.forEach(function (n) { n.o.gw = n.gw - dGW; n.o.gx = n.gx + dGW; });
            }
            if (mode.indexOf('h') >= 0) {
              var dGH = Math.max(MINU - gh0, Math.min(maxGrowH, Math.round((e.clientY - sy) / rowUnit)));
              p.gh = gh0 + dGH;
              nbBs.forEach(function (n) { n.o.gh = n.gh - dGH; n.o.gy = n.gy + dGH; });
            }
            snap.forEach(function (n) { applySpan(n.o); });
          }
        }
        function up() {
          window.removeEventListener('mousemove', mv);
          window.removeEventListener('mouseup', up);
          document.body.classList.remove('resizing'); el.classList.remove('rzing');
          // rede de segurança: sobrou alguém por cima de alguém? reorganiza a grade
          if (layout === 'grid' && hasOverlap()) packLayout();
          save();
        }
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
      });
    });

    // trocar de lugar: arrasta pela ALÇA (⠿). O resto da barra move a JANELA (app-region drag).
    var grip = el.querySelector('.grip');
    grip.addEventListener('dragstart', function (ev) {
      ev.dataTransfer.setData('text/plain', p.id);
      ev.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    grip.addEventListener('dragend', function () { el.classList.remove('dragging'); clearDropMarks(); });
    el.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      if (el.classList.contains('dragging')) return;
      var r = el.getBoundingClientRect();
      var after = (state.layout === 'col') ? (ev.clientY - r.top) > r.height / 2 : (ev.clientX - r.left) > r.width / 2;
      clearDropMarks();
      el.classList.add(after ? 'ins-after' : 'ins-before');
    });
    el.addEventListener('dragleave', function () { el.classList.remove('ins-before', 'ins-after'); });
    el.addEventListener('drop', function (ev) {
      ev.preventDefault();
      var after = el.classList.contains('ins-after');
      clearDropMarks();
      var srcId = ev.dataTransfer.getData('text/plain');
      var src = document.getElementById(srcId);
      if (!src || src === el) return;
      grid.insertBefore(src, after ? el.nextSibling : el);
      syncOrder(); packLayout(); save();
    });

    panels.push(p);
    return p;
  }

  // algum painel ficou por cima de outro? (usado como rede de segurança no fim do arrasto)
  function hasOverlap() {
    for (var i = 0; i < panels.length; i++) {
      for (var j = i + 1; j < panels.length; j++) {
        var a = panels[i], b = panels[j];
        if (a.gx < b.gx + b.gw && b.gx < a.gx + a.gw &&
            a.gy < b.gy + b.gh && b.gy < a.gy + a.gh) return true;
      }
    }
    return false;
  }
  function applySpan(p) {
    p.el.style.gridColumn = (p.gx + 1) + ' / span ' + p.gw;
    p.el.style.gridRow = (p.gy + 1) + ' / span ' + p.gh;
  }
  // empacota posições fixas (skyline best-fit, compacto e sem holes grandes).
  // com posição fixa, redimensionar não reordena os vizinhos e a borda esquerda do painel fica travada.
  function packLayout() {
    var COLS = GRID_RES, sky = new Array(COLS), i;
    for (i = 0; i < COLS; i++) sky[i] = 0;
    panels.forEach(function (p) {
      var gw = Math.min(COLS, p.gw), gh = p.gh, bestX = 0, bestY = Infinity, x, k;
      for (x = 0; x + gw <= COLS; x++) {
        var y = 0;
        for (k = x; k < x + gw; k++) if (sky[k] > y) y = sky[k];
        if (y < bestY) { bestY = y; bestX = x; }
      }
      if (bestY === Infinity) bestY = 0;
      p.gx = bestX; p.gy = bestY;
      for (k = bestX; k < bestX + gw; k++) sky[k] = bestY + gh;
      applySpan(p);
    });
  }
  function resizePanel(p) {
    var r = p.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    p.dpr = Math.min(1.5, window.devicePixelRatio || 1) * (window.CV_QUALITY || 1);
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
    packLayout();
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
  function clearDropMarks() {
    grid.querySelectorAll('.panel.ins-before, .panel.ins-after').forEach(function (n) {
      n.classList.remove('ins-before', 'ins-after');
    });
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
    // cor e tema genéricos só pra quem usa o tema; módulos com cor própria (espectro, onda) escondem
    if (p.def.tint !== false) {
      // tema individual: dá pra mesclar temas diferentes em cada módulo
      var curTheme = p.s.theme || 'global';
      var topts = '<option value="global"' + (curTheme === 'global' ? ' selected' : '') + '>Segue o global</option>';
      THEMES.forEach(function (th) {
        topts += '<option value="' + th[0] + '"' + (curTheme === th[0] ? ' selected' : '') + '>' + th[1] + '</option>';
      });
      rows.push('<div class="cfgrow"><label>Tema</label><select data-k="theme">' + topts + '</select></div>');
      rows.push('<div class="cfgrow"><label>Cor</label><select data-k="colorMode">' +
        '<option value="theme"' + (p.s.colorMode === 'theme' ? ' selected' : '') + '>Do tema</option>' +
        '<option value="custom"' + (p.s.colorMode === 'custom' ? ' selected' : '') + '>Própria</option>' +
        '</select></div>');
      rows.push('<div class="cfgrow"><label>Matiz</label><input type="range" data-k="hue" min="0" max="360" step="1" value="' + p.s.hue + '"></div>');
    }
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
  var elAdd = document.getElementById('addmod');
  var elLayout = document.getElementById('layout');
  var elTpl = document.getElementById('tpl');
  var elTplSave = document.getElementById('tplsave');
  var elTplDel = document.getElementById('tpldel');
  var elStatus = document.getElementById('status');

  state.texture = 'off'; // textura removida da UI: sempre sem textura

  // o tema muda o FUNDO do app, a cor do texto e a grade (não só a cor dos traços)
  function applyThemeChrome() {
    var bg = CV.themeBg ? CV.themeBg(CV.theme) : null;
    var root = document.documentElement && document.documentElement.style;
    if (!bg || !root || !root.setProperty) return;
    root.setProperty('--bg', bg.bg);
    root.setProperty('--panel', bg.panel);
    root.setProperty('--panel-hi', bg.panel);
    root.setProperty('--text', bg.text || '#8b8b91');
    root.setProperty('--accent', bg.ink || '#f0efe9');
    root.setProperty('--hair', (bg.light ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + bg.grid + ')');
    root.setProperty('--border', (bg.light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'));
    root.setProperty('--border-hi', (bg.light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.14)'));
    if (document.body.classList.toggle) document.body.classList.toggle('light', !!bg.light);
  }
  elTheme.addEventListener('change', function () {
    if (!elTheme.value) return;
    state.theme = CV.theme = elTheme.value;
    fillSelect(elTheme, 'TEMA', THEMES, state.theme);
    applyThemeChrome();
    save();
  });

  /* ---------- layout: grade / linha / coluna (resize proporcional é automático) ---------- */
  /* seletores que mostram a CATEGORIA quando fechados (TEMA, POSIÇÃO…) e a lista
     com um ✓ no atual quando abertos. Fica óbvio pra quem nunca usou o programa. */
  function fillSelect(el, label, items, current) {
    el.innerHTML = '';
    var head = document.createElement('option');
    head.value = ''; head.textContent = label;
    el.appendChild(head);
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it[0];
      o.textContent = (it[0] === current ? '✓ ' : '   ') + it[1];
      el.appendChild(o);
    });
    el.value = '';
  }
  function applyLayout(mode) {
    document.body.classList.remove('layout-row', 'layout-col');
    if (mode === 'row') document.body.classList.add('layout-row');
    else if (mode === 'col') document.body.classList.add('layout-col');
    // peso de cada painel na fila = seu tamanho de grade (dá pra reajustar arrastando)
    panels.forEach(function (p) {
      if (mode === 'row') p.el.style.flexGrow = p.gw;
      else if (mode === 'col') p.el.style.flexGrow = p.gh;
      else p.el.style.flexGrow = '';
    });
    // os canvases se ajustam via ResizeObserver; força um recálculo depois da troca
    setTimeout(function () { panels.forEach(resizePanel); }, 60);
  }
  /* POSIÇÃO = arranjo + encaixe da janela, num comando só.
     Escolher "BARRA À ESQUERDA" já encaixa a janela na lateral e empilha os módulos. */
  function applyPosition(id, skipDock) {
    var def = layoutDef(id);
    state.pos = def[0];
    state.layout = def[3];
    applyLayout(def[3]);
    if (!skipDock && window.caramujo && window.caramujo.winStick) window.caramujo.winStick(def[2]);
    fillSelect(elLayout, 'POSIÇÃO', LAYOUTS, state.pos);
  }
  elLayout.addEventListener('change', function () {
    if (!elLayout.value) return;
    applyPosition(elLayout.value);
    save();
  });

  /* ---------- reconstrói os painéis (início, reset e templates) ---------- */
  function rebuildPanels(list) {
    if (drawerPanel) closeDrawer();
    panels.slice().forEach(function (p) { if (p.rec) stopRec(p); p.el.remove(); });
    panels = [];
    // array (mesmo vazio) manda; só cai no padrão quando não veio lista nenhuma
    var arr = Array.isArray(list) ? list : DEFAULT_LAYOUT;
    arr.forEach(function (cfg) {
      createPanel({ mod: cfg.mod, w: cfg.w, h: cfg.h, s: cfg.s });
    });
    packLayout();
  }

  /* ---------- templates: guarda a personalização inteira com um nome ----------
     Salva visuais, ajustes de cada um, tema, textura, layout e o tamanho da janela.
     Carregar volta tudo num clique. Ficam separados do estado de trabalho. */
  function loadTemplates() {
    try { return JSON.parse(localStorage.getItem('cv-templates-v1')) || {}; } catch (e) { return {}; }
  }
  function storeTemplates(o) {
    try { localStorage.setItem('cv-templates-v1', JSON.stringify(o)); } catch (e) {}
  }
  function refreshTplSelect(sel) {
    var all = loadTemplates();
    var names = Object.keys(all).sort();
    fillSelect(elTpl, 'TEMPLATES', names.map(function (nm) { return [nm, nm.toUpperCase()]; }), sel || '');
  }
  function snapshotState() {
    return {
      theme: state.theme, texture: state.texture, layout: state.layout, pos: state.pos,
      panels: panels.map(function (p) { return { mod: p.modId, w: p.gw, h: p.gh, s: p.s }; })
    };
  }
  function saveTemplate(name) {
    var snap = snapshotState();
    var finish = function () {
      var all = loadTemplates(); all[name] = snap; storeTemplates(all);
      refreshTplSelect(name);
    };
    if (window.caramujo && window.caramujo.winGetBounds) {
      Promise.resolve(window.caramujo.winGetBounds()).then(function (b) { snap.win = b; finish(); }).catch(finish);
    } else { finish(); }
  }
  function applyTemplate(name) {
    var all = loadTemplates(); var tpl = all[name]; if (!tpl) return;
    state.theme = CV.theme = tpl.theme || 'mono';
    state.texture = 'off';
    fillSelect(elTheme, 'TEMA', THEMES, state.theme);
    applyThemeChrome();
    // template feito pra uma posição (barra lateral, rodapé…) já encaixa a janela sozinho
    var pos = tpl.pos || ({ row: 'row', col: 'col' }[tpl.layout] || 'grid');
    applyPosition(pos);
    rebuildPanels(tpl.panels);
    save();
    if (tpl.win && window.caramujo && window.caramujo.winSetBounds) window.caramujo.winSetBounds(tpl.win);
  }
  elTpl.addEventListener('change', function () {
    if (!elTpl.value) return;
    var nm = elTpl.value;
    applyTemplate(nm);
    refreshTplSelect(nm);
  });
  /* caixinha de nome própria: o Electron não implementa window.prompt (ficava sem efeito) */
  var elAsk = document.getElementById('ask');
  var elAskInput = document.getElementById('askinput');
  var elAskLabel = document.getElementById('asklabel');
  var askCb = null;
  function askName(labelTxt, initial, cb) {
    if (!elAsk) { cb(initial); return; }
    askCb = cb;
    elAskLabel.textContent = labelTxt;
    elAskInput.value = initial || '';
    elAsk.classList.remove('hidden');
    setTimeout(function () { elAskInput.focus(); elAskInput.select(); }, 30);
  }
  function askClose(ok) {
    if (!elAsk) return;
    elAsk.classList.add('hidden');
    var v = (elAskInput.value || '').trim();
    var cb = askCb; askCb = null;
    if (ok && v && cb) cb(v);
  }
  if (elAsk) {
    document.getElementById('askok').addEventListener('click', function () { askClose(true); });
    document.getElementById('askcancel').addEventListener('click', function () { askClose(false); });
    elAskInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') askClose(true);
      if (e.key === 'Escape') askClose(false);
    });
    elAsk.addEventListener('mousedown', function (e) { if (e.target === elAsk) askClose(false); });
  }
  elTplSave.addEventListener('click', function () {
    askName('NOME DO TEMPLATE', '', function (name) {
      var all = loadTemplates();
      if (all[name] && !window.confirm('Já existe "' + name + '". Sobrescrever?')) return;
      saveTemplate(name);
    });
  });
  elTplDel.addEventListener('click', function () {
    var name = elTpl.value;
    if (!name) return;
    if (!window.confirm('Apagar o template "' + name + '"?')) return;
    var all = loadTemplates(); delete all[name]; storeTemplates(all);
    refreshTplSelect('');
  });
  // templates prontos: "padrão" + variações de paleta (paletas comuns + espírito MiniMeters).
  // Semeado uma vez só (marcador de versão): não sobrescreve os seus nem ressuscita os apagados.
  function baseLayout(over) {
    return DEFAULT_LAYOUT.map(function (cfg) {
      var s = over ? over(cfg.mod) : null;
      return s ? { mod: cfg.mod, w: cfg.w, h: cfg.h, s: s } : { mod: cfg.mod, w: cfg.w, h: cfg.h };
    });
  }
  function seedTemplates() {
    var SEED = 'v14';
    if (localStorage.getItem('cv-tpl-seed') === SEED) return;
    var all = loadTemplates();
    // limpa a leva anterior (os SEUS templates, com nome próprio, ficam intactos)
    ['padrão', 'vazio', 'estúdio', 'rua', 'neon noturno', 'maré oceano', 'psicodélico', 'linha',
     'barra · estúdio', 'barra · arte', 'lateral · estúdio', 'lateral · arte',
     'mix · precisão', 'master · loudness', 'grave · low end', 'clipe · vertical',
     'clipe · tela cheia', 'ao vivo · set', 'misto · produção', 'calmo · ambiente',
     'leve · performance', 'novos',
     '1 · mixagem', '2 · master', '3 · grave', '4 · clipe vertical', '5 · show',
     '6 · ambiente', '7 · produção', '8 · barra no rodapé', '9 · coluna lateral',
     '10 · tela limpa'].forEach(function (nm) { delete all[nm]; });

    function T(name, theme, pos, layout, panels) {
      all[name] = { theme: theme, pos: pos, texture: 'off', layout: layout, win: null, panels: panels };
    }

    // 01 MIXAGEM — preto e branco, leitura seca. O básico do estúdio.
    T('01 · mixagem', 'preto', 'grid', 'grid', [
      { mod: 'spectrum', w: 160, h: 95 }, { mod: 'loudness', w: 40, h: 95 }, { mod: 'gonio', w: 40, h: 95 },
      { mod: 'wavescroll', w: 160, h: 55 }, { mod: 'spectrogram', w: 80, h: 55 }
    ]);
    // 02 MASTER — papel: fundo claro, traço escuro. LUFS grande.
    T('02 · master', 'papel', 'grid', 'grid', [
      { mod: 'loudness', w: 60, h: 150 }, { mod: 'spectrum', w: 180, h: 80 },
      { mod: 'gonio', w: 60, h: 70 }, { mod: 'wavescroll', w: 120, h: 70 }
    ]);
    // 03 GRAVE — ardósia quente, foco no low end.
    T('03 · grave', 'ardosia', 'grid', 'grid', [
      { mod: 'spectrum', w: 240, h: 85 },
      { mod: 'scope', w: 120, h: 75 }, { mod: 'spectrogram', w: 120, h: 75 }
    ]);
    // 04 CLIPE VERTICAL — proporção de Reels, arte grande pra gravar.
    T('04 · clipe vertical', 'psy', 'grid', 'grid', [
      { mod: 'psy', w: 120, h: 160 }, { mod: 'wavelayers', w: 120, h: 160 }
    ]);
    // 05 SHOW — neon, tela tomada por arte, zero medidor.
    T('05 · show', 'neon', 'grid', 'grid', [
      { mod: 'flow', w: 120, h: 160 }, { mod: 'enxame', w: 120, h: 160 }
    ]);
    // 06 AMBIENTE — floresta, movimento lento pra deixar rodando.
    T('06 · ambiente', 'floresta', 'grid', 'grid', [
      { mod: 'aurora', w: 120, h: 160 }, { mod: 'silk', w: 120, h: 160 }
    ]);
    // 07 PRODUÇÃO — poente: metade medidor, metade arte.
    T('07 · produção', 'poente', 'grid', 'grid', [
      { mod: 'spectrum', w: 120, h: 80 }, { mod: 'wavescroll', w: 120, h: 80 },
      { mod: 'malha', w: 120, h: 80 }, { mod: 'trace', w: 120, h: 80 }
    ]);
    // 08 RUA — vhs quente e sujo, pegada de fita velha.
    T('08 · rua', 'vhs', 'grid', 'grid', [
      { mod: 'wavescroll', w: 240, h: 70 },
      { mod: 'trace', w: 120, h: 90 }, { mod: 'lissa', w: 120, h: 90 }
    ]);
    // 09 SUBMERSO — oceano, teia e cordas.
    T('09 · submerso', 'oceano', 'grid', 'grid', [
      { mod: 'enxame', w: 120, h: 100 }, { mod: 'cordas', w: 120, h: 100 },
      { mod: 'spectrogram', w: 240, h: 60 }
    ]);
    // 10 BRASA — rubi fechado, escopo e ondas.
    T('10 · brasa', 'rubi', 'grid', 'grid', [
      { mod: 'scope', w: 120, h: 100 }, { mod: 'wavelayers', w: 120, h: 100 },
      { mod: 'loudness', w: 60, h: 60 }, { mod: 'spectrum', w: 180, h: 60 }
    ]);
    // 11 VÁLVULA — âmbar dourado, papelaria de estúdio antigo.
    T('11 · válvula', 'ambar', 'grid', 'grid', [
      { mod: 'spectrum', w: 160, h: 90 }, { mod: 'loudness', w: 80, h: 90 },
      { mod: 'silk', w: 120, h: 70 }, { mod: 'gonio', w: 120, h: 70 }
    ]);
    // 12 NEVE — gelo (fundo claro frio), traço azul profundo.
    T('12 · neve', 'gelo', 'grid', 'grid', [
      { mod: 'malha', w: 120, h: 100 }, { mod: 'cordas', w: 120, h: 100 },
      { mod: 'wavescroll', w: 240, h: 60 }
    ]);
    // 13 DESERTO — areia (fundo claro quente), traço terroso.
    T('13 · deserto', 'areia', 'grid', 'grid', [
      { mod: 'wavelayers', w: 120, h: 100 }, { mod: 'trace', w: 120, h: 100 },
      { mod: 'spectrum', w: 240, h: 60 }
    ]);
    // 14 SONHO — lavanda (fundo claro lilás), arte macia.
    T('14 · sonho', 'lavanda', 'grid', 'grid', [
      { mod: 'aurora', w: 120, h: 100 }, { mod: 'lissa', w: 120, h: 100 },
      { mod: 'silk', w: 240, h: 60 }
    ]);
    // 15 RÉGUA — grudada no rodapé da tela, medidores essenciais.
    T('15 · régua no rodapé', 'preto', 'dock-bottom', 'row', [
      { mod: 'wavescroll', w: 80, h: 60 }, { mod: 'spectrum', w: 80, h: 60 },
      { mod: 'loudness', w: 26, h: 60 }, { mod: 'gonio', w: 40, h: 60 }
    ]);
    // 16 FAIXA — no topo, só arte, pra deixar respirando enquanto trabalha.
    T('16 · faixa no topo', 'vhs', 'dock-top', 'row', [
      { mod: 'flow', w: 80, h: 60 }, { mod: 'trace', w: 80, h: 60 }, { mod: 'wavescroll', w: 80, h: 60 }
    ]);
    // 17 COLUNA — encaixa na direita da tela, empilhado.
    T('17 · coluna à direita', 'ardosia', 'dock-right', 'col', [
      { mod: 'spectrum', w: 60, h: 60 }, { mod: 'cordas', w: 60, h: 60 }, { mod: 'loudness', w: 60, h: 40 }
    ]);
    // 18 TORRE — na esquerda, mistura medidor e arte.
    T('18 · torre à esquerda', 'papel', 'dock-left', 'col', [
      { mod: 'spectrum', w: 60, h: 50 }, { mod: 'malha', w: 60, h: 60 }, { mod: 'gonio', w: 60, h: 50 }
    ]);
    // 19 TELA LIMPA — pra montar do zero.
    T('19 · tela limpa', 'preto', 'grid', 'grid', []);

    storeTemplates(all);
    try { localStorage.setItem('cv-tpl-seed', SEED); } catch (e) {}
  }
  seedTemplates();
  refreshTplSelect('');

  /* ---------- modo visual: o menu só aparece com o mouse no topo ---------- */
  var topbar = document.getElementById('topbar');
  var chromePinned = false, topbarHover = false, menuFocus = false;
  function showChrome() { document.body.classList.add('chrome'); }
  function hideChrome() {
    // segura o menu se: fixado no H, mouse em cima, ou algum controle dele em uso (select aberto)
    if (chromePinned || topbarHover || menuFocus) return;
    document.body.classList.remove('chrome');
  }
  topbar.addEventListener('mouseenter', function () { topbarHover = true; showChrome(); });
  topbar.addEventListener('mouseleave', function () { topbarHover = false; });
  topbar.addEventListener('focusin', function () { menuFocus = true; showChrome(); });
  topbar.addEventListener('focusout', function () { menuFocus = false; setTimeout(hideChrome, 200); });
  /* aba ☰ MENU: encostar no topo só REVELA a aba. O menu abre no CLIQUE e fica aberto
     até clicar fora. Assim dá pra ir ao topo mexer num módulo sem o menu cobrir tudo. */
  var elEdge = document.getElementById('edgetop');
  if (elEdge) {
    window.addEventListener('mousemove', function (e) {
      if (!document.body.classList.toggle) return;
      document.body.classList.toggle('peek', e.clientY <= 34);
    });
    window.addEventListener('mouseleave', function () {
      if (document.body.classList.remove) document.body.classList.remove('peek');
    });
    elEdge.addEventListener('click', function () {
      if (chromePinned) { chromePinned = false; topbarHover = false; hideChrome(); }
      else { chromePinned = true; showChrome(); }
    });
  }

  // janela estreita (barra lateral): o menu vira coluna rolável
  function checkNarrow() {
    if (!document.body.classList.toggle) return;
    document.body.classList.toggle('narrow', window.innerWidth < 560);
  }
  window.addEventListener('resize', checkNarrow);
  checkNarrow();
  // fecha ao clicar fora do menu. IMPORTANTE: os botões de janela (– ⏻) e a gaveta
  // ficam de fora, senão o menu some antes do clique chegar neles (⏻ não fechava o app).
  var elWinCtlBox = document.getElementById('winctl');
  window.addEventListener('mousedown', function (e) {
    if (!chromePinned) return;
    if (topbar.contains(e.target) || (elEdge && elEdge.contains(e.target))) return;
    if (elWinCtlBox && elWinCtlBox.contains(e.target)) return;
    if (drawerEl && drawerEl.contains(e.target)) return;
    chromePinned = false; topbarHover = false; hideChrome();
  });
  window.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if ((e.key === 'h' || e.key === 'H') && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
      chromePinned = !chromePinned;
      chromePinned ? showChrome() : hideChrome();
    }
  });

  /* ---------- botões de janela (só no app de computador) ---------- */
  var elWinCtl = document.getElementById('winctl');
  var elAppQuit = document.getElementById('appquit');
  if (window.caramujo && window.caramujo.winClose) {
    document.getElementById('winmin').addEventListener('click', function () { window.caramujo.winMinimize(); });
    if (elAppQuit) elAppQuit.addEventListener('click', function () { window.caramujo.winClose(); });
  } else if (elWinCtl) {
    elWinCtl.style.display = 'none';
  }

  fillSelect(elAdd, '+ VISUAL', Object.keys(CV.registry).map(function (id) {
    return [id, CV.registry[id].group + ' · ' + CV.registry[id].name];
  }), '');
  elAdd.addEventListener('change', function () {
    if (!elAdd.value) return;
    createPanel({ mod: elAdd.value, w: 60, h: 60 });
    elAdd.value = '';
    packLayout();
    save();
  });

  function setStatus(txt, ok) {
    elStatus.textContent = txt;
    elStatus.className = ok ? 'ok' : '';
  }

  // fonte única: o áudio do computador. Devices de entrada aparecem como alternativa.
  function populateSources(inputs) {
    elSource.innerHTML = '';
    var o0 = document.createElement('option'); o0.value = 'ask'; o0.textContent = 'ÁUDIO DO COMPUTADOR';
    elSource.appendChild(o0);
    (inputs || []).forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = (d.label || 'Entrada de áudio').toUpperCase();
      elSource.appendChild(o);
    });
  }
  populateSources([]);

  function pickLoopback(inputs) {
    return inputs.find(function (d) { return /blackhole|loopback|soundflower|virtual/i.test(d.label); });
  }

  // áudio do computador é ao vivo: não existe play/pause, então o botão some
  var elPlay = document.getElementById('play');
  if (elPlay) elPlay.style.display = 'none';

  /* Liga a fonte: no app, loopback nativo do sistema (sem driver, sem mic).
     Se falhar (macOS antigo/permissão), cai pro BlackHole por device. */
  function startComputerAudio() {
    var goBlackhole = function () {
      engine.startInput(undefined).then(function () {
        return engine.listInputs();
      }).then(function (inputs) {
        populateSources(inputs);
        var lb = pickLoopback(inputs);
        if (lb) {
          return engine.startInput(lb.deviceId).then(function () {
            elSource.value = lb.deviceId;
            setStatus('OUVINDO: ' + lb.label.toUpperCase(), true);
          });
        }
        setStatus('SEM DRIVER DE LOOPBACK', false);
        showHelp();
      }).catch(function () {
        setStatus('PERMISSÃO NEGADA', false);
        showHelp();
      });
    };
    var goLoopback = function (keepStatus) {
      engine.startSystemLoopback().then(function () {
        if (keepStatus) return; // já tem um diagnóstico na tela, não apaga
        var tk = engine.stream && engine.stream.getAudioTracks()[0];
        var ch = (tk && tk.getSettings) ? tk.getSettings().channelCount : 0;
        setStatus(ch === 1 ? 'MONO (loopback)' : '', true);
      }).catch(goBlackhole);
    };
    if (window.caramujo && window.caramujo.nativeStart) {
      setStatus('CONECTANDO…', false);
      // 1º a captura nativa (estéreo de verdade); se não tiver o módulo, cai no loopback
      engine.startNativeCapture().then(function () {
        setStatus('ESTÉREO NATIVO', true);
        setTimeout(function () { setStatus('', true); }, 2500);
      }).catch(function (err) {
        // conta POR QUE falhou (no status e no console), em vez de só cair calado pro mono
        var msg = String((err && err.message) || err);
        console.warn('[caramujo] captura nativa falhou:', msg);
        if (window.caramujo.nativeWhy) {
          Promise.resolve(window.caramujo.nativeWhy()).then(function (d) {
            console.warn('[caramujo] diagnóstico nativo:', JSON.stringify(d));
            if (d && !d.ok) setStatus('NATIVO OFF: ' + String(d.reason).slice(0, 70), false);
            else if (d && d.perm && d.perm.system === false) setStatus('NATIVO OFF: falta permissão de gravação de tela', false);
          }).catch(function () {});
        }
        goLoopback(true);
      });
    } else if (window.caramujo && window.caramujo.enableLoopback) {
      setStatus('CONECTANDO…', false);
      goLoopback();
    } else {
      goBlackhole();
    }
  }

  elSource.addEventListener('change', function () {
    var v = elSource.value;
    if (v === 'ask') { startComputerAudio(); return; }
    engine.startInput(v).then(function () {
      var opt = elSource.options[elSource.selectedIndex];
      setStatus('OUVINDO: ' + opt.textContent, true);
    }).catch(function () { setStatus('ERRO NA ENTRADA', false); });
  });

  /* ---------- modo barra fixa: régua no rodapé, sempre na frente (tipo Stick do MiniMeters) ---------- */
  /* 📌 manter na frente das outras janelas (independente do encaixe) */
  var elPin = document.getElementById('pin');
  if (elPin) {
    if (!(window.caramujo && window.caramujo.winPin)) elPin.style.display = 'none';
    else {
      elPin.classList.toggle('on', !!state.pinned);
      if (state.pinned) window.caramujo.winPin(true);
      elPin.addEventListener('click', function () {
        state.pinned = !state.pinned;
        window.caramujo.winPin(state.pinned);
        elPin.classList.toggle('on', state.pinned);
        save();
      });
    }
  }

  document.getElementById('fullapp').addEventListener('click', function () {
    if (window.caramujo && window.caramujo.winFullscreen) window.caramujo.winFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });

  /* ---------- ajuda (?): como usar, estado do áudio, troca de entrada, contato ---------- */
  var modal = document.getElementById('modal');
  var elAudioStat = document.getElementById('audiostat');
  var elSrcPick = document.getElementById('srcpick');
  document.getElementById('modalclose').addEventListener('click', function () { modal.classList.add('hidden'); });
  function showHelp() {
    modal.classList.remove('hidden');
    if (elAudioStat) {
      elAudioStat.textContent = engine.sourceKind === 'none' ? 'sem sinal'
        : (engine.nativeOn ? 'estéreo' : 'mono');
    }
    // lista as entradas do sistema pra quem precisar trocar (interface, BlackHole…)
    if (elSrcPick && !elSrcPick.dataset.ready) {
      elSrcPick.dataset.ready = '1';
      engine.listInputs().then(function (inputs) {
        elSrcPick.innerHTML = '<option value="ask">ÁUDIO DO COMPUTADOR (padrão)</option>';
        (inputs || []).forEach(function (d) {
          var o = document.createElement('option');
          o.value = d.deviceId; o.textContent = (d.label || 'Entrada de áudio').toUpperCase();
          elSrcPick.appendChild(o);
        });
      }).catch(function () {});
      elSrcPick.addEventListener('change', function () {
        if (elSrcPick.value === 'ask') startComputerAudio();
        else engine.startInput(elSrcPick.value).catch(function () { setStatus('ERRO NA ENTRADA', false); });
      });
    }
  }
  var elHelpBtn = document.getElementById('helpbtn');
  if (elHelpBtn) elHelpBtn.addEventListener('click', showHelp);

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
  rebuildPanels(state.panels);
  fillSelect(elTheme, 'TEMA', THEMES, state.theme);
  applyThemeChrome();
  applyPosition(state.pos || ({ row: 'row', col: 'col' }[state.layout] || 'grid'), true);
  save(); // grava a migração de escala (state.res) pra não re-multiplicar no próximo boot

  /* ---------- abre direto nos visuais: sem tela de boas-vindas ----------
     O áudio começa sozinho. Se o navegador exigir um gesto pra liberar som,
     o primeiro clique em qualquer lugar destrava (no app de desktop nem precisa). */
  startComputerAudio();
  function unlockAudio() {
    if (engine.ctx && engine.ctx.state === 'suspended') engine.ctx.resume();
    if (!engine.ctx || engine.sourceKind === 'none') startComputerAudio();
  }
  window.addEventListener('click', unlockAudio, { once: true });

  /* ---------- loop principal ---------- */
  /* qualidade adaptativa: se os quadros começam a atrasar (muitos módulos abertos),
     baixa a resolução de render; quando sobra folga, devolve. Evita travar/engasgar. */
  window.CV_QUALITY = 1;
  var fpsAcc = 0, fpsN = 0, qCool = 0;
  function watchPerf(dt) {
    fpsAcc += dt; fpsN++;
    qCool -= dt;
    if (fpsAcc < 1) return;
    var avg = fpsAcc / fpsN;
    fpsAcc = 0; fpsN = 0;
    if (qCool > 0) return;
    if (avg > 0.024 && window.CV_QUALITY > 0.55) {         // abaixo de ~42fps: alivia
      window.CV_QUALITY = Math.max(0.55, window.CV_QUALITY - 0.2);
      panels.forEach(resizePanel); qCool = 2;
    } else if (avg < 0.015 && window.CV_QUALITY < 1) {      // acima de ~66fps: devolve
      window.CV_QUALITY = Math.min(1, window.CV_QUALITY + 0.15);
      panels.forEach(resizePanel); qCool = 3;
    }
  }

  var last = performance.now(), texFrame = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    watchPerf(dt);
    var t = now / 1000;
    var d = null;
    if (engine.ctx && engine.sourceKind !== 'none') {
      engine.update(dt);
      d = engine;
    }
    panels.forEach(function (p) {
      if (p.w < 4) return;
      if (p.ctx) { p.ctx.lineJoin = 'round'; p.ctx.lineCap = 'round'; }
      try { p.def.draw(p, d, dt, t); } catch (e) { /* módulo caiu, segue o baile */ }
    });
    if (state.texture !== 'off' && ++texFrame % 3 === 0) drawTexture(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
