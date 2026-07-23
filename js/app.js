/* Caramujo Vision — app: grade, painéis, ajustes, temas, gravação, fontes de áudio */

(function () {
  'use strict';
  var CV = window.CV;
  var engine = window.engine = new AudioEngine();

  var THEMES = [
    ['mono', 'EXO'], ['psy', 'PSY'], ['neon', 'NEON'], ['vhs', 'VHS'],
    ['poente', 'POENTE'], ['gelo', 'GELO'], ['oceano', 'OCEANO'], ['floresta', 'FLORESTA'],
    ['vapor', 'VAPORWAVE'], ['rubi', 'RUBI'], ['ambar', 'ÂMBAR']
  ];
  var LAYOUTS = [['grid', 'GRADE'], ['row', 'LINHA →'], ['col', 'COLUNA ↓']];

  // grade fina (240 col / 240 linhas de referência): passos pequenos = redimensionar liso.
  // valores = 12 colunas antigas × 20, então a aparência é idêntica, só com muito mais precisão.
  var GRID_RES = 240, GW_MAX = 240, GH_MAX = 200;
  var DEFAULT_LAYOUT = [
    { mod: 'spectrum', w: 80, h: 40 }, { mod: 'wavescroll', w: 80, h: 40 },
    { mod: 'loudness', w: 20, h: 40 }, { mod: 'gonio', w: 60, h: 40 },
    { mod: 'scope', w: 80, h: 40 }, { mod: 'spectrogram', w: 80, h: 40 },
    { mod: 'psy', w: 80, h: 80 }, { mod: 'flow', w: 80, h: 80 }, { mod: 'terreno', w: 80, h: 80 },
    { mod: 'aurora', w: 80, h: 80 }, { mod: 'enxame', w: 80, h: 80 }, { mod: 'harmonografo', w: 80, h: 80 },
    { mod: 'orbita', w: 80, h: 80 }, { mod: 'mare', w: 80, h: 80 }, { mod: 'tunnel', w: 80, h: 80 },
    { mod: 'trace', w: 160, h: 40 }, { mod: 'ascii', w: 80, h: 40 },
    { mod: 'wavelayers', w: 160, h: 60 }, { mod: 'lissa', w: 80, h: 60 }, { mod: 'silk', w: 80, h: 60 }
  ];

  var state = load() || { theme: 'mono', texture: 'off', layout: 'grid', panels: null };
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
    try { return JSON.parse(localStorage.getItem('cv-state-v4')); } catch (e) { return null; }
  }
  function save() {
    state.panels = panels.map(function (p) { return { mod: p.modId, w: p.gw, h: p.gh, s: p.s }; });
    try { localStorage.setItem('cv-state-v4', JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- painéis ---------- */
  var grid = document.getElementById('grid');

  function createPanel(cfg) {
    var def = CV.registry[cfg.mod];
    if (!def) return null;
    var p = {
      id: 'p' + (uid++), modId: cfg.mod, def: def,
      gw: cfg.w || 60, gh: cfg.h || 40,
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
        el.setAttribute('draggable', 'false'); // segurar a borda redimensiona, não reordena
        document.body.classList.add('resizing'); el.classList.add('rzing');
        function mv(e) {
          if (layout === 'row') {
            if (mode.indexOf('w') < 0) return;
            p.gw = Math.max(1, Math.min(GW_MAX, gw0 + Math.round((e.clientX - sx) / colUnit)));
            el.style.flexGrow = p.gw;
          } else if (layout === 'col') {
            if (mode.indexOf('h') < 0) return;
            p.gh = Math.max(1, Math.min(GH_MAX, gh0 + Math.round((e.clientY - sy) / rowUnit)));
            el.style.flexGrow = p.gh;
          } else {
            if (mode.indexOf('w') >= 0) p.gw = Math.max(1, Math.min(GW_MAX, gw0 + Math.round((e.clientX - sx) / colUnit)));
            if (mode.indexOf('h') >= 0) p.gh = Math.max(1, Math.min(GH_MAX, gh0 + Math.round((e.clientY - sy) / rowUnit)));
            applySpan(p);
          }
        }
        function up() {
          window.removeEventListener('mousemove', mv);
          window.removeEventListener('mouseup', up);
          document.body.classList.remove('resizing'); el.classList.remove('rzing');
          el.setAttribute('draggable', 'true');
          save();
        }
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
      });
    });

    // trocar de lugar: arrasta o módulo por QUALQUER ponto dele; uma linha mostra onde ele entra
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', function (ev) {
      ev.dataTransfer.setData('text/plain', p.id);
      ev.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', function () { el.classList.remove('dragging'); clearDropMarks(); });
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
      syncOrder(); save();
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

  THEMES.forEach(function (t) {
    var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1];
    if (t[0] === state.theme) o.selected = true;
    elTheme.appendChild(o);
  });
  elTheme.addEventListener('change', function () { state.theme = CV.theme = elTheme.value; save(); });

  /* ---------- layout: grade / linha / coluna (resize proporcional é automático) ---------- */
  LAYOUTS.forEach(function (t) {
    var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1];
    if (t[0] === state.layout) o.selected = true;
    elLayout.appendChild(o);
  });
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
  elLayout.addEventListener('change', function () {
    state.layout = elLayout.value; applyLayout(state.layout); save();
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
    elTpl.innerHTML = '';
    var head = document.createElement('option');
    head.value = ''; head.textContent = names.length ? 'TEMPLATES…' : 'SEM TEMPLATE';
    elTpl.appendChild(head);
    names.forEach(function (nm) {
      var o = document.createElement('option'); o.value = nm; o.textContent = nm.toUpperCase();
      elTpl.appendChild(o);
    });
    elTpl.value = (sel && all[sel]) ? sel : '';
  }
  function snapshotState() {
    return {
      theme: state.theme, texture: state.texture, layout: state.layout,
      panels: panels.map(function (p) { return { mod: p.modId, w: p.gw, h: p.gh, s: p.s }; })
    };
  }
  function saveTemplate(name) {
    var snap = snapshotState();
    var finish = function () {
      var all = loadTemplates(); all[name] = snap; storeTemplates(all);
      refreshTplSelect(name);
      setStatus('TEMPLATE SALVO: ' + name.toUpperCase(), true);
    };
    if (window.caramujo && window.caramujo.winGetBounds) {
      Promise.resolve(window.caramujo.winGetBounds()).then(function (b) { snap.win = b; finish(); }).catch(finish);
    } else { finish(); }
  }
  function applyTemplate(name) {
    var all = loadTemplates(); var tpl = all[name]; if (!tpl) return;
    state.theme = CV.theme = tpl.theme || 'mono';
    state.texture = 'off';
    state.layout = tpl.layout || 'grid';
    elTheme.value = state.theme; elLayout.value = state.layout;
    applyLayout(state.layout);
    rebuildPanels(tpl.panels);
    save();
    if (tpl.win && window.caramujo && window.caramujo.winSetBounds) window.caramujo.winSetBounds(tpl.win);
    setStatus('TEMPLATE: ' + name.toUpperCase(), true);
  }
  elTpl.addEventListener('change', function () { if (elTpl.value) applyTemplate(elTpl.value); });
  elTplSave.addEventListener('click', function () {
    var name = (window.prompt('Nome do template:', '') || '').trim();
    if (!name) return;
    var all = loadTemplates();
    if (all[name] && !window.confirm('Já existe "' + name + '". Sobrescrever?')) return;
    saveTemplate(name);
  });
  elTplDel.addEventListener('click', function () {
    var name = elTpl.value;
    if (!name) { setStatus('ESCOLHE UM TEMPLATE PRA APAGAR', false); return; }
    if (!window.confirm('Apagar o template "' + name + '"?')) return;
    var all = loadTemplates(); delete all[name]; storeTemplates(all);
    refreshTplSelect('');
    setStatus('TEMPLATE APAGADO', false);
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
    var SEED = 'v5';
    if (localStorage.getItem('cv-tpl-seed') === SEED) return;
    var all = loadTemplates();
    // as paletas viraram só temas: remove os templates de paleta antigos (seus próprios ficam intactos)
    ['neon', 'rua (vhs)', 'poente', 'gelo', 'vaporwave', 'floresta', 'âmbar'].forEach(function (nm) { delete all[nm]; });
    all['padrão'] = { theme: 'mono', texture: 'off', layout: 'grid', win: null, panels: baseLayout(null) };
    all['vazio'] = { theme: 'mono', texture: 'off', layout: 'grid', win: null, panels: [] };
    storeTemplates(all);
    try { localStorage.setItem('cv-tpl-seed', SEED); } catch (e) {}
  }
  seedTemplates();
  refreshTplSelect('');

  /* ---------- modo visual: o menu só aparece com o mouse no topo ---------- */
  var topbar = document.getElementById('topbar');
  var chromePinned = false, topbarHover = false;
  function showChrome() { document.body.classList.add('chrome'); }
  function hideChrome() { if (!chromePinned && !topbarHover) document.body.classList.remove('chrome'); }
  topbar.addEventListener('mouseenter', function () { topbarHover = true; showChrome(); });
  topbar.addEventListener('mouseleave', function () { topbarHover = false; hideChrome(); });
  topbar.addEventListener('focusin', function () { chromePinned = true; showChrome(); });
  topbar.addEventListener('focusout', function () { chromePinned = false; setTimeout(hideChrome, 120); });
  // o menu só abre no topo EXTREMO da tela (≤4px), pra não cobrir os botões (⚙/✕) dos módulos da fileira de cima
  window.addEventListener('mousemove', function (e) {
    if (e.clientY <= 4) showChrome();
    else if (e.clientY > 44 && !topbarHover && !chromePinned) hideChrome();
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

  Object.keys(CV.registry).forEach(function (id) {
    var o = document.createElement('option');
    o.value = id;
    o.textContent = CV.registry[id].group + ' · ' + CV.registry[id].name;
    elAdd.appendChild(o);
  });
  elAdd.addEventListener('change', function () {
    if (!elAdd.value) return;
    createPanel({ mod: elAdd.value, w: 60, h: 60 });
    elAdd.value = '';
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
    if (window.caramujo && window.caramujo.enableLoopback) {
      setStatus('CONECTANDO…', false);
      engine.startSystemLoopback().then(function () {
        setStatus('', true);
      }).catch(goBlackhole);
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

  document.getElementById('fullapp').addEventListener('click', function () {
    if (window.caramujo && window.caramujo.winFullscreen) window.caramujo.winFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });

  /* ---------- ajuda: abre sozinho se a captura falhar (não tem mais botão) ---------- */
  var modal = document.getElementById('modal');
  document.getElementById('modalclose').addEventListener('click', function () { modal.classList.add('hidden'); });
  function showHelp() { modal.classList.remove('hidden'); }

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
  applyLayout(state.layout);
  save(); // grava a migração de escala (state.res) pra não re-multiplicar no próximo boot

  /* ---------- clique inicial pra liberar áudio ---------- */
  var splash = document.getElementById('splash');
  splash.addEventListener('click', function () {
    splash.classList.add('hidden');
    startComputerAudio();
    // mostra o menu por alguns segundos pra você achar os controles, depois some
    showChrome();
    setTimeout(hideChrome, 3200);
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
