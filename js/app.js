/* Caramujo Vision 2 · app: layout em linhas, barra de ferramentas, ajustes, presets,
   temas, posição da janela, gravação, pós e o laço de desenho.

   NORTE DA V2: a experiência do MiniMeters. Abre e já mede. A interface some quando
   o mouse sai, volta quando ele entra, e tudo que dá pra mudar mora em dois lugares
   só: a barra de ferramentas (o que se troca toda hora) e a folha de Ajustes (o resto).

   O LAYOUT É UMA LISTA DE LINHAS, cada linha uma lista de visuais com peso. Não existe
   mais grade de 240 colunas com encaixe: toda tela é sempre preenchida, sem buraco e
   sem sobreposição, por construção. Na barra encaixada (topo ou rodapé) as linhas são
   achatadas numa fileira só; na coluna lateral, numa pilha só. Cada forma guarda o
   próprio peso (w na janela livre, bw na barra, ch na coluna), então arrumar a barra
   não bagunça a janela livre. */

(function () {
  'use strict';
  var CV = window.CV;
  var engine = window.engine = new AudioEngine();
  var desk = (window.caramujo && window.caramujo.isDesktop) ? window.caramujo : null;
  var body = document.body;
  function $(id) { return document.getElementById(id); }

  /* ================= ÍCONES (traço fino, cor do tema) ================= */
  var SVG0 = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    chev: '<path d="M4.5 6.5 8 10l3.5-3.5"/>',
    theme: '<circle cx="8" cy="8" r="5.6"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor" stroke="none"/>',
    pin: '<path d="M6.1 2.5h3.8l-.5 4 2.1 2.1v1.1H4.5V8.6l2.1-2.1z"/><path d="M8 9.7V14"/>',
    pause: '<path d="M6 4v8M10 4v8"/>',
    play: '<path d="M5.5 3.8 12 8l-6.5 4.2z" fill="currentColor"/>',
    sliders: '<path d="M2.5 4.5h6M12.5 4.5h1M2.5 8h1.5M7.5 8h6M2.5 11.5h7M13 11.5h.5"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.7" cy="8" r="1.5"/><circle cx="11.3" cy="11.5" r="1.5"/>',
    dots: '<circle cx="3.6" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="12.4" cy="8" r=".9" fill="currentColor"/>',
    min: '<path d="M4 8.5h8"/>',
    close: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
    grip: '<circle cx="6" cy="4" r=".95" fill="currentColor" stroke="none"/><circle cx="10" cy="4" r=".95" fill="currentColor" stroke="none"/><circle cx="6" cy="8" r=".95" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r=".95" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r=".95" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r=".95" fill="currentColor" stroke="none"/>',
    rec: '<circle cx="8" cy="8" r="3.6" fill="currentColor" stroke="none"/>',
    plus: '<path d="M8 3.5v9M3.5 8h9"/>',
    check: '<path d="M3.5 8.5 6.5 11.5 12.5 4.5"/>',
    swap: '<path d="M3 5.5h9.5L10 3M13 10.5H3.5L6 13"/>',
    full: '<path d="M3 6.5V3h3.5M9.5 3H13v3.5M13 9.5V13H9.5M6.5 13H3V9.5"/>',
    hud: '<path d="M2.5 12.5h11M4.5 10V7.5M8 10V4.5M11.5 10V6.5"/>',
    help: '<circle cx="8" cy="8" r="5.6"/><path d="M6.5 6.4a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.8.6-.8 1.2"/><circle cx="8" cy="11.1" r=".55" fill="currentColor" stroke="none"/>',
    save: '<path d="M3.5 3h7l2 2v8h-9z"/><path d="M5.5 3v3h4V3M5.5 13v-3.5h5V13"/>',
    undo: '<path d="M5 6.5H10a3 3 0 0 1 0 6H6.5"/><path d="M7 4.2 4.7 6.5 7 8.8"/>',
    trash: '<path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M4.8 4.5l.6 8.5h5.2l.6-8.5"/>',
    tb: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M2.5 6.2h11"/>',
    'pos-free': '<rect x="2.5" y="3.5" width="11" height="9" rx="1.4"/>',
    'pos-top': '<rect x="2.5" y="3.5" width="11" height="9" rx="1.4"/><path d="M3.2 5.5h9.6" stroke-width="2.6"/>',
    'pos-bottom': '<rect x="2.5" y="3.5" width="11" height="9" rx="1.4"/><path d="M3.2 10.5h9.6" stroke-width="2.6"/>',
    'pos-left': '<rect x="2.5" y="3.5" width="11" height="9" rx="1.4"/><path d="M4.6 4.3v7.4" stroke-width="2.6"/>',
    'pos-right': '<rect x="2.5" y="3.5" width="11" height="9" rx="1.4"/><path d="M11.4 4.3v7.4" stroke-width="2.6"/>'
  };
  function ic(name) { return SVG0 + (ICONS[name] || '') + '</svg>'; }
  function paintIcons(root) {
    (root || document).querySelectorAll('i[data-ic]').forEach(function (n) { n.innerHTML = ic(n.getAttribute('data-ic')); });
  }
  function setIcon(btn, name) { var i = btn && btn.querySelector('i[data-ic]'); if (i) { i.setAttribute('data-ic', name); i.innerHTML = ic(name); } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  /* ================= CATÁLOGO ================= */
  /* DEZ TEMAS, escolhidos pra cobrir a escada de luz inteira sem dois parecidos:
     quatro escuros, dois médios, quatro claros. Os que saíram da lista (carvão, musgo,
     jornal) continuam no código e quem estava num deles cai no vizinho mais próximo. */
  var THEMES = [
    ['minimeters', 'MiniMeters'], ['preto', 'Preto'], ['fosforo', 'Fósforo'], ['planta', 'Planta'],
    ['ardosia', 'Ardósia'], ['chumbo', 'Chumbo'], ['tijolo', 'Tijolo'],
    ['areia', 'Areia'], ['gelo', 'Gelo'], ['papel', 'Papel']
  ];
  var THEME_FORA = { carvao: 'chumbo', musgo: 'areia', jornal: 'areia' };
  /* POSIÇÃO: onde a janela fica e, junto, a forma do layout. */
  var POSITIONS = [
    { id: 'free', nome: 'Janela livre', dock: 'off', mode: 'free', icon: 'pos-free' },
    { id: 'top', nome: 'Barra no topo', dock: 'top', mode: 'row', icon: 'pos-top' },
    { id: 'bottom', nome: 'Barra no rodapé', dock: 'bottom', mode: 'row', icon: 'pos-bottom' },
    { id: 'left', nome: 'Coluna à esquerda', dock: 'left', mode: 'col', icon: 'pos-left' },
    { id: 'right', nome: 'Coluna à direita', dock: 'right', mode: 'col', icon: 'pos-right' }
  ];
  var POS = {}; POSITIONS.forEach(function (p) { POS[p.id] = p; });
  var FX_NOMES = { off: 'Desligado', regua: 'Régua', prata: 'Prata', vidro: 'Vidro' };
  var FX_ORDEM = ['off', 'regua', 'prata', 'vidro'];
  var REC_SIZES = [['tela', 'Tamanho do painel'], ['916', '9:16 Reels'], ['11', '1:1 Feed'], ['169', '16:9 YouTube']];
  var REC_PX = { '916': [1080, 1920], '11': [1080, 1080], '169': [1920, 1080] };
  var FPS_OPTS = [[0, 'Da tela'], [60, '60'], [30, '30']];
  var BAR_DEF = 170, COL_DEF = 300;

  /* PRESETS: o trabalho, não a cara. Escolher um troca os visuais e o tamanho de
     cada um; tema e posição ficam como estão. Cada visual: [módulo, peso na janela
     livre, peso na barra]. A barra achata as linhas na ordem em que aparecem. */
  var PRESETS = [
    { id: 'barra', nome: 'Barra', grupo: 'Medição', rows: [
      [1.1, ['wavescroll', 1.1, 3], ['spectrum', 1.5, 4.2]],
      [1, ['loudness', 0.55, 1.05], ['gonio', 0.8, 1.6], ['scope', 1.2, 2.4]]] },
    { id: 'quad', nome: 'Quad', grupo: 'Medição', rows: [
      [1, ['spectrum', 1.3, 3.4], ['gonio', 1, 1.6]],
      [1, ['wavescroll', 1.3, 3], ['loudness', 1, 1.1]]] },
    { id: 'mix', nome: 'Mixagem', grupo: 'Medição', rows: [
      [1.35, ['spectrum', 1, 4.4]],
      [1, ['wavescroll', 1.5, 3], ['loudness', 0.5, 1.05], ['gonio', 0.75, 1.6]]] },
    { id: 'master', nome: 'Master', grupo: 'Medição', rows: [
      [1.2, ['loudness', 0.55, 1.2], ['spectrum', 1.6, 4]],
      [1, ['spectrogram', 1.4, 3], ['vu', 0.9, 1.9]]] },
    { id: 'analogico', nome: 'Analógico', grupo: 'Medição', rows: [
      [1, ['vu', 1, 2.1], ['scope', 1.3, 2.6]],
      [1, ['gonio', 0.8, 1.5], ['wavescroll', 1.5, 3]]] },
    { id: 'clipe', nome: 'Clipe', grupo: 'Arte', rows: [[1, ['psy', 1, 1], ['wavelayers', 1, 1]]] },
    { id: 'show', nome: 'Show', grupo: 'Arte', rows: [[1, ['flow', 1, 1], ['enxame', 1, 1]]] },
    { id: 'ambiente', nome: 'Ambiente', grupo: 'Arte', rows: [[1, ['aurora', 1, 1], ['silk', 1, 1]]] },
    { id: 'producao', nome: 'Produção', grupo: 'Misto', rows: [
      [1, ['spectrum', 1, 3], ['wavescroll', 1, 3]],
      [1, ['malha', 1, 2], ['trace', 1, 2]]] }
  ];
  var PRESET = {}; PRESETS.forEach(function (p) { PRESET[p.id] = p; });

  /* ================= ESTADO =================
     Chave nova (cv2-state): o layout mudou de natureza, então a v1 não serve como
     está. Na primeira vez o estado antigo é lido e convertido: tema, posição, pin,
     tamanho da janela e gravação passam direto, e a tela antiga inteira vira o
     preset "Minha tela antiga", a um clique. Nada do que você montou se perde. */
  var KEY = 'cv2-state', KEY_USER = 'cv2-presets';
  var uidN = 0;
  function newUid() { return 'c' + Date.now().toString(36) + (uidN++).toString(36); }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function rowsFromPreset(pr) {
    return pr.rows.map(function (r) {
      return { h: r[0], cells: r.slice(1).map(function (c) { return { uid: newUid(), mod: c[0], w: c[1], bw: c[2], ch: 1, s: {} }; }) };
    });
  }
  function cloneRows(rows) {
    return (rows || []).map(function (r) {
      return { h: +r.h || 1, cells: (r.cells || []).map(function (c) {
        return { uid: newUid(), mod: c.mod, w: +c.w || 1, bw: +c.bw || +c.w || 1, ch: +c.ch || 1, s: JSON.parse(JSON.stringify(c.s || {})) };
      }) };
    });
  }
  function freshState() {
    return {
      v: 2, theme: 'minimeters', pos: desk ? 'bottom' : 'free', pinned: false, fps: 0,
      fx: { preset: 'off', amount: 0.8 }, recSize: 'tela', barH: BAR_DEF, colW: COL_DEF,
      toolbar: 'auto', preset: 'barra', dirty: false, rows: rowsFromPreset(PRESET.barra), firstRun: true
    };
  }

  /* --- conversão da v1 --- */
  var POS_V1 = { grid: 'free', 'dock-top': 'top', 'dock-bottom': 'bottom', 'dock-left': 'left', 'dock-right': 'right' };
  function rowsFromV1(panelsV1, forma) {
    var list = (panelsV1 || []).filter(function (p) { return p && CV.registry[p.mod]; });
    if (!list.length) return [];
    var cell = function (p) { return { uid: newUid(), mod: p.mod, w: Math.max(1, p.w || 60), bw: Math.max(1, p.w || 60), ch: Math.max(1, p.h || 40), s: p.s || {} }; };
    if (forma === 'row' || forma === 'col') return [{ h: 1, cells: list.map(cell) }];
    // grade antiga: refaz o encaixe (skyline) pra saber quem estava em cada altura
    var COLS = 240, sky = [], i, k;
    for (i = 0; i < COLS; i++) sky[i] = 0;
    var placed = list.map(function (p) {
      var gw = Math.min(COLS, p.w || 60), gh = p.h || 40, bestX = 0, bestY = Infinity;
      for (var x = 0; x + gw <= COLS; x++) {
        var y = 0; for (k = x; k < x + gw; k++) if (sky[k] > y) y = sky[k];
        if (y < bestY) { bestY = y; bestX = x; }
      }
      for (k = bestX; k < bestX + gw; k++) sky[k] = bestY + gh;
      return { p: p, x: bestX, y: bestY, h: gh };
    });
    var byY = {};
    placed.forEach(function (o) { (byY[o.y] = byY[o.y] || []).push(o); });
    return Object.keys(byY).map(Number).sort(function (a, b) { return a - b; }).map(function (y) {
      var g = byY[y].sort(function (a, b) { return a.x - b.x; });
      return { h: Math.max.apply(null, g.map(function (o) { return o.h; })), cells: g.map(function (o) { return cell(o.p); }) };
    });
  }
  var TPL_SEMENTE = /^(faixa|coluna|tela) · (mixagem|master|grave|espectro|fita|rua|medição|loudness|teia|cordas|estúdio|clipe|show|ambiente|produção|limpa)$/;
  function migrateV1(old, st) {
    if (old.theme) {
      var th = CV.themeMigra ? CV.themeMigra(old.theme) : old.theme;
      st.theme = THEME_FORA[th] || th;
    }
    if (old.pos && POS_V1[old.pos]) st.pos = POS_V1[old.pos];
    else if (old.layout === 'row') st.pos = 'bottom';
    st.pinned = !!old.pinned;
    if (old.win && old.win.width > 60) st.win = old.win;
    if (old.recSize) st.recSize = old.recSize;
    var user = readJSON(KEY_USER) || [];
    var forma = old.layout === 'row' || old.layout === 'col' ? old.layout : 'grid';
    var antiga = rowsFromV1(old.panels, forma);
    if (antiga.length) user.push({ id: 'u-antiga', nome: 'Minha tela antiga', rows: antiga });
    var tpls = readJSON('cv-templates-v1') || {};
    Object.keys(tpls).forEach(function (k) {
      if (TPL_SEMENTE.test(k)) return;   // os prontos da v1 viraram os presets novos
      var t = tpls[k], r = rowsFromV1(t.panels, t.forma || t.layout);
      if (r.length) user.push({ id: 'u-' + newUid(), nome: String(t.nome || k).slice(0, 40), rows: r });
    });
    writeJSON(KEY_USER, user);
    st.firstRun = true;
  }
  function normalize(st) {
    var base = freshState();
    Object.keys(base).forEach(function (k) { if (st[k] === undefined) st[k] = base[k]; });
    if (!THEMES.some(function (t) { return t[0] === st.theme; })) st.theme = THEME_FORA[st.theme] || 'minimeters';
    if (!POS[st.pos]) st.pos = base.pos;
    if (!desk && POS[st.pos].dock !== 'off' && POS[st.pos].mode === 'row') { /* navegador: a forma vale, o encaixe não */ }
    if ([0, 30, 60].indexOf(+st.fps) < 0) st.fps = 0;
    st.fps = +st.fps;
    if (!st.fx || !(st.fx.preset in FX_NOMES)) st.fx = { preset: 'off', amount: 0.8 };
    st.fx.amount = Math.max(0, Math.min(1, +st.fx.amount || 0));
    if (!REC_PX[st.recSize] && st.recSize !== 'tela') st.recSize = 'tela';
    st.barH = Math.max(60, Math.min(600, +st.barH || BAR_DEF));
    st.colW = Math.max(140, Math.min(900, +st.colW || COL_DEF));
    st.rows = (Array.isArray(st.rows) ? st.rows : []).map(function (r) {
      return { h: Math.max(0.05, +r.h || 1), cells: (r.cells || []).filter(function (c) { return c && CV.registry[c.mod]; }).map(function (c) {
        return { uid: c.uid || newUid(), mod: c.mod, w: Math.max(0.02, +c.w || 1), bw: Math.max(0.02, +c.bw || +c.w || 1), ch: Math.max(0.02, +c.ch || 1), s: c.s || {} };
      }) };
    }).filter(function (r) { return r.cells.length; });
    if (!st.rows.length) { st.rows = rowsFromPreset(PRESET.barra); st.preset = 'barra'; }
    // ajustes salvos são só a DIFERENÇA do padrão: aqui eles voltam a ser o objeto inteiro
    st.rows.forEach(function (r) { r.cells.forEach(function (c) { c.s = Object.assign({}, CV.registry[c.mod].defaults, c.s); }); });
    return st;
  }
  function loadState() {
    var st = readJSON(KEY);
    if (st && st.v === 2) return normalize(st);
    st = freshState();
    var old = readJSON('cv-state-v7');
    if (old) { try { migrateV1(old, st); } catch (e) { console.warn('[caramujo] migração da v1 falhou:', e); } }
    return normalize(st);
  }
  var state = loadState();
  CV.theme = state.theme;
  CV.cmap0 = 'auto';
  CV.bgAdj = { l: 0, s: 0, h: 0, c: 0 };

  function diffS(c) {
    var def = CV.registry[c.mod].defaults, o = {};
    Object.keys(c.s).forEach(function (k) { if (c.s[k] !== def[k]) o[k] = c.s[k]; });
    return o;
  }
  var saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(saveNow, 120);
  }
  function saveNow() {
    var out = {};
    Object.keys(state).forEach(function (k) { if (k !== 'rows') out[k] = state[k]; });
    out.rows = state.rows.map(function (r) {
      return { h: r.h, cells: r.cells.map(function (c) { return { uid: c.uid, mod: c.mod, w: c.w, bw: c.bw, ch: c.ch, s: diffS(c) }; }) };
    });
    writeJSON(KEY, out);
  }
  function userPresets() { var u = readJSON(KEY_USER); return Array.isArray(u) ? u : []; }
  function presetById(id) {
    if (PRESET[id]) return PRESET[id];
    var u = userPresets(); for (var i = 0; i < u.length; i++) if (u[i].id === id) return u[i];
    return null;
  }
  function presetName(id) { var p = presetById(id); return p ? p.nome : 'Personalizado'; }

  /* ================= PAINÉIS ================= */
  var gridEl = $('grid');
  var panels = Object.create(null);   // uid → painel vivo
  var viewRows = [];                    // o que está na tela agora (linhas já achatadas)

  function allCells() {
    var out = [];
    viewRows.forEach(function (vr) { vr.cells.forEach(function (c) { out.push(c); }); });
    return out;
  }
  function findCell(uid) {
    for (var r = 0; r < state.rows.length; r++) {
      var cs = state.rows[r].cells;
      for (var i = 0; i < cs.length; i++) if (cs[i].uid === uid) return { row: state.rows[r], ri: r, ci: i, cell: cs[i] };
    }
    return null;
  }

  function createPanel(cell) {
    var def = CV.registry[cell.mod];
    var p = {
      id: cell.uid, cell: cell, modId: cell.mod, def: def, s: cell.s, st: {},
      w: 0, h: 0, dpr: 1, mouse: { x: 0, y: 0, over: false }
    };
    var el = document.createElement('div');
    el.className = 'panel';
    el.setAttribute('data-uid', cell.uid);
    el.innerHTML =
      '<canvas></canvas>' +
      '<div class="rectag">REC 0:00</div>' +
      '<div class="pctl">' +
        '<span class="pname">' + esc(def.name) + '</span>' +
        '<span class="pb grip" draggable="true" title="Arraste pra trocar de lugar">' + ic('grip') + '</span>' +
        '<button class="pb" data-a="cfg" title="Ajustes deste visual">' + ic('sliders') + '</button>' +
        '<button class="pb rec" data-a="rec" title="Gravar vídeo deste visual">' + ic('rec') + '</button>' +
        '<button class="pb" data-a="close" title="Remover da tela">' + ic('close') + '</button>' +
      '</div>' +
      '<div class="dv" title="Arraste pra mudar o tamanho"></div>';
    p.el = el;
    p.canvas = el.querySelector('canvas');
    p.dv = el.querySelector('.dv');
    p.recTag = el.querySelector('.rectag');
    if (!def.webgl) p.ctx = p.canvas.getContext('2d');
    try { def.init(p); } catch (e) { console.error('[caramujo] init de ' + cell.mod, e); }

    el.addEventListener('mousemove', function (ev) {
      var r = el.getBoundingClientRect();
      p.mouse.x = ev.clientX - r.left; p.mouse.y = ev.clientY - r.top; p.mouse.over = true;
    });
    el.addEventListener('mouseleave', function () { p.mouse.over = false; });
    el.addEventListener('contextmenu', function (ev) { ev.preventDefault(); panelMenu(p, { x: ev.clientX, y: ev.clientY }); });
    el.querySelector('.pctl').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-a]') : null;
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'cfg') openSettings('visuais', p.id);
      else if (a === 'rec') toggleRec(p);
      else if (a === 'close') removeCell(p.id);
    });
    p.dv.addEventListener('mousedown', function (ev) { startResizeCells(ev, p); });
    p.dv.addEventListener('dblclick', function () { equalizeRow(p); });

    // trocar de lugar: arrasta pela alça
    var grip = el.querySelector('.grip');
    grip.addEventListener('dragstart', function (ev) {
      dragUid = p.id;
      try { ev.dataTransfer.setData('text/plain', 'cv:' + p.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
      try { ev.dataTransfer.setDragImage(el, 24, 24); } catch (e) {}
      el.classList.add('dragging');
      body.classList.add('dnd');
    });
    grip.addEventListener('dragend', function () { dragUid = null; el.classList.remove('dragging'); body.classList.remove('dnd'); clearDrop(); });
    el.addEventListener('dragover', function (ev) {
      if (!dragUid) return;
      ev.preventDefault();
      if (dragUid === p.id) { clearDrop(); return; }
      var z = dropZone(el, ev.clientX, ev.clientY);
      if (el.getAttribute('data-drop') !== z) { clearDrop(); el.classList.add('drop-' + z); el.setAttribute('data-drop', z); }
    });
    el.addEventListener('dragleave', function (ev) {
      if (ev.relatedTarget && el.contains(ev.relatedTarget)) return;
      el.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom'); el.removeAttribute('data-drop');
    });
    el.addEventListener('drop', function (ev) {
      if (!dragUid) return;
      ev.preventDefault(); ev.stopPropagation();
      var z = el.getAttribute('data-drop'), src = dragUid;
      clearDrop();
      if (z && src !== p.id) moveCell(src, p.id, z);
    });

    var ro = new ResizeObserver(function () { resizeSoon(); });
    ro.observe(el);
    p.ro = ro;
    panels[cell.uid] = p;
    return p;
  }
  function destroyPanel(p) {
    if (p.rec) stopRec(p);
    if (fxi) fxi.drop(p.id);
    try { p.ro.disconnect(); } catch (e) {}
    if (p.def.webgl && p.st && p.st.gl) {
      try { var lose = p.st.gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) {}
    }
    if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    delete panels[p.id];
    if (setFocusUid === p.id) setFocusUid = null;
  }
  function ensurePanel(cell) {
    var p = panels[cell.uid];
    if (p && p.modId === cell.mod) { p.cell = cell; p.s = cell.s; return p; }
    if (p) destroyPanel(p);
    return createPanel(cell);
  }

  /* RESOLUÇÃO POR TIPO: medidor 2x (1,5x se usa buffer), arte no tamanho real da tela,
     shader 1,5x. A qualidade adaptativa só mexe na arte: o medidor nunca cede. */
  function dprCap(def) {
    if (def.webgl) return 1.5;
    if (def.group === 'Estúdio') return (def.buffered ? 1.5 : 2);
    return 2;
  }
  function resizePanel(p, force) {
    var r = p.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) { p.w = 0; return; }
    p.w = Math.round(r.width); p.h = Math.round(r.height);
    if (p.el.classList) p.el.classList.toggle('slim', p.w < 230);
    if (window.CV_DRAGGING && !force) return;   // durante o arrasto o CSS estica o bitmap antigo
    var q = (p.def.group === 'Estúdio') ? 1 : (window.CV_QUALITY || 1);
    var dpr = Math.min(dprCap(p.def), window.devicePixelRatio || 1) * q;
    var cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
    if (p.canvas.width === cw && p.canvas.height === ch) return;
    p.dpr = dpr;
    p.canvas.width = cw; p.canvas.height = ch;
    if (p.ctx) p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resizeAll(force) { Object.keys(panels).forEach(function (id) { resizePanel(panels[id], force); }); markFx(); }
  var roPending = 0;
  function resizeSoon() {
    if (roPending) return;
    roPending = requestAnimationFrame(function () { roPending = 0; resizeAll(false); });
  }

  /* ================= LAYOUT ================= */
  function layoutMode() { return POS[state.pos].mode; }
  function wKey(mode) { return mode === 'row' ? 'bw' : mode === 'col' ? 'ch' : 'w'; }
  function pct(a, sum) { return (sum > 0 ? a / sum * 100 : 0).toFixed(4); }
  function sumOf(cells, k) { var s = 0; cells.forEach(function (c) { s += c[k]; }); return s; }

  function renderLayout() {
    var mode = layoutMode(), k = wKey(mode);
    gridEl.className = 'mode-' + mode;
    var vrs;
    if (mode === 'free') vrs = state.rows.map(function (r) { return { row: r, h: r.h, cells: r.cells.slice() }; });
    else {
      var all = [];
      state.rows.forEach(function (r) { all = all.concat(r.cells); });
      vrs = [{ row: null, h: 1, cells: all }];
    }
    var keep = Object.create(null), sumH = 0;
    vrs.forEach(function (vr) { sumH += vr.h; });
    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
    vrs.forEach(function (vr, ri) {
      var rowEl = document.createElement('div');
      rowEl.className = 'row';
      if (mode === 'free') rowEl.style.flex = '0 0 ' + pct(vr.h, sumH) + '%';
      var sw = sumOf(vr.cells, k);
      vr.cells.forEach(function (cell, ci) {
        var p = ensurePanel(cell);
        keep[cell.uid] = 1;
        p.el.style.flex = '0 0 ' + pct(cell[k], sw) + '%';
        p.vr = vr; p.vi = ci;
        p.dv.style.display = ci < vr.cells.length - 1 ? '' : 'none';
        rowEl.appendChild(p.el);
      });
      if (mode === 'free' && ri < vrs.length - 1) {
        var dh = document.createElement('div');
        dh.className = 'dh'; dh.title = 'Arraste pra mudar a altura';
        dh.addEventListener('mousedown', function (ev) { startResizeRows(ev, ri); });
        dh.addEventListener('dblclick', function () { equalizeRows(); });
        rowEl.appendChild(dh);
        vr.dh = dh;
      }
      gridEl.appendChild(rowEl);
      vr.el = rowEl;
    });
    Object.keys(panels).forEach(function (id) { if (!keep[id]) destroyPanel(panels[id]); });
    viewRows = vrs;
    markFx();
    resizeSoon();
    refreshToolbar();
    if (setOpen && setTab === 'visuais') renderSettings();
  }

  function markDirty() { state.dirty = true; refreshToolbar(); }

  /* ARRASTAR A DIVISÓRIA: só os dois vizinhos trocam espaço. A soma dos pesos dos
     dois não muda, então nenhum outro visual sai do lugar. */
  function dragOn(cls) {
    window.CV_DRAGGING = true;
    body.classList.add('resizing'); if (cls) body.classList.add(cls);
  }
  function dragOff() {
    window.CV_DRAGGING = false;
    body.classList.remove('resizing', 'rz-col', 'rz-row');
    resizeAll(true);
  }
  function startResizeCells(ev, p) {
    if (ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    var mode = layoutMode(), k = wKey(mode), vr = p.vr;
    var a = vr.cells[p.vi], b = vr.cells[p.vi + 1];
    if (!a || !b) return;
    var pa = panels[a.uid], pb = panels[b.uid];
    var horiz = mode !== 'col';
    var ra = pa.el.getBoundingClientRect(), rb = pb.el.getBoundingClientRect();
    var sa = horiz ? ra.width : ra.height, tot = sa + (horiz ? rb.width : rb.height);
    var wsum = a[k] + b[k], sumRow = sumOf(vr.cells, k);
    var start = horiz ? ev.clientX : ev.clientY;
    var MIN = Math.min(44, tot / 2 - 1);
    dragOn(horiz ? 'rz-col' : 'rz-row');
    p.dv.classList.add('on');
    var pend = start, raf = 0;
    function apply() {
      raf = 0;
      var na = Math.max(MIN, Math.min(tot - MIN, sa + (pend - start)));
      a[k] = wsum * na / tot; b[k] = wsum - a[k];
      pa.el.style.flex = '0 0 ' + pct(a[k], sumRow) + '%';
      pb.el.style.flex = '0 0 ' + pct(b[k], sumRow) + '%';
    }
    function mv(e) { pend = horiz ? e.clientX : e.clientY; if (!raf) raf = requestAnimationFrame(apply); }
    function up() {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      if (raf) { cancelAnimationFrame(raf); apply(); }
      p.dv.classList.remove('on');
      dragOff(); markDirty(); save();
    }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  function startResizeRows(ev, ri) {
    if (ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    var va = viewRows[ri], vb = viewRows[ri + 1];
    if (!va || !vb || !va.row || !vb.row) return;
    var a = va.row, b = vb.row;
    var ha = va.el.getBoundingClientRect().height, tot = ha + vb.el.getBoundingClientRect().height;
    var hsum = a.h + b.h, sumH = 0;
    state.rows.forEach(function (r) { sumH += r.h; });
    var start = ev.clientY, pend = start, raf = 0, MIN = Math.min(40, tot / 2 - 1);
    dragOn('rz-row');
    if (va.dh) va.dh.classList.add('on');
    function apply() {
      raf = 0;
      var na = Math.max(MIN, Math.min(tot - MIN, ha + (pend - start)));
      a.h = hsum * na / tot; b.h = hsum - a.h;
      va.el.style.flex = '0 0 ' + pct(a.h, sumH) + '%';
      vb.el.style.flex = '0 0 ' + pct(b.h, sumH) + '%';
    }
    function mv(e) { pend = e.clientY; if (!raf) raf = requestAnimationFrame(apply); }
    function up() {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
      if (raf) { cancelAnimationFrame(raf); apply(); }
      if (va.dh) va.dh.classList.remove('on');
      dragOff(); markDirty(); save();
    }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  // duplo clique na divisória: iguala a linha (ou as linhas)
  function equalizeRow(p) {
    var k = wKey(layoutMode());
    p.vr.cells.forEach(function (c) { c[k] = 1; });
    renderLayout(); markDirty(); save();
  }
  function equalizeRows() {
    state.rows.forEach(function (r) { r.h = 1; });
    renderLayout(); markDirty(); save();
  }

  /* ARRASTAR PRA TROCAR DE LUGAR. Soltar na metade esquerda ou direita encaixa ao
     lado; na faixa de cima ou de baixo (só na janela livre) abre uma linha nova. */
  var dragUid = null;
  function dropZone(el, x, y) {
    var r = el.getBoundingClientRect(), rx = (x - r.left) / r.width, ry = (y - r.top) / r.height;
    var mode = layoutMode();
    if (mode === 'row') return rx < 0.5 ? 'left' : 'right';
    if (mode === 'col') return ry < 0.5 ? 'top' : 'bottom';
    if (ry < 0.24) return 'top';
    if (ry > 0.76) return 'bottom';
    return rx < 0.5 ? 'left' : 'right';
  }
  function clearDrop() {
    gridEl.querySelectorAll('.panel[data-drop]').forEach(function (n) {
      n.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom'); n.removeAttribute('data-drop');
    });
  }
  function moveCell(srcUid, dstUid, zone) {
    var src = findCell(srcUid), dst = findCell(dstUid);
    if (!src || !dst || src.cell === dst.cell) return;
    var mode = layoutMode(), cell = src.cell, deLinha = src.row;
    src.row.cells.splice(src.ci, 1);
    if (mode === 'free' && (zone === 'top' || zone === 'bottom')) {
      var di = state.rows.indexOf(dst.row);
      cell.w = 1;
      state.rows.splice(zone === 'top' ? di : di + 1, 0, { h: dst.row.h, cells: [cell] });
    } else {
      var idx = dst.row.cells.indexOf(dst.cell);
      var antes = zone === 'left' || zone === 'top';
      if (deLinha !== dst.row && dst.row.cells.length) cell.w = sumOf(dst.row.cells, 'w') / dst.row.cells.length;
      dst.row.cells.splice(antes ? idx : idx + 1, 0, cell);
    }
    state.rows = state.rows.filter(function (r) { return r.cells.length; });
    renderLayout(); markDirty(); save();
  }

  /* ================= ADICIONAR, TROCAR, REMOVER ================= */
  function addModule(mod, nearUid) {
    if (!CV.registry[mod]) return null;
    var cell = { uid: newUid(), mod: mod, w: 1, bw: 1, ch: 1, s: Object.assign({}, CV.registry[mod].defaults) };
    var all = []; state.rows.forEach(function (r) { all = all.concat(r.cells); });
    if (all.length) { cell.bw = sumOf(all, 'bw') / all.length; cell.ch = sumOf(all, 'ch') / all.length; }
    var near = nearUid ? findCell(nearUid) : null;
    var row;
    if (near) row = near.row;
    else if (!state.rows.length) { row = { h: 1, cells: [] }; state.rows.push(row); }
    else if (layoutMode() === 'free') {
      // a linha com menos visuais recebe (empate: a de baixo)
      row = state.rows[0];
      state.rows.forEach(function (r) { if (r.cells.length <= row.cells.length) row = r; });
    } else row = state.rows[state.rows.length - 1];
    if (row.cells.length) cell.w = sumOf(row.cells, 'w') / row.cells.length;
    if (near) row.cells.splice(near.ci + 1, 0, cell); else row.cells.push(cell);
    renderLayout(); markDirty(); save();
    return cell;
  }
  function replaceCell(uid, mod) {
    var f = findCell(uid);
    if (!f || !CV.registry[mod] || f.cell.mod === mod) return;
    f.cell.mod = mod;
    f.cell.s = Object.assign({}, CV.registry[mod].defaults);
    renderLayout(); markDirty(); save();
  }
  function removeCell(uid) {
    var f = findCell(uid);
    if (!f) return;
    f.row.cells.splice(f.ci, 1);
    state.rows = state.rows.filter(function (r) { return r.cells.length; });
    renderLayout(); markDirty(); save();
  }

  /* ================= PRESETS ================= */
  function applyPreset(id) {
    var pr = presetById(id);
    if (!pr) return;
    state.rows = PRESET[id] ? rowsFromPreset(pr) : cloneRows(pr.rows);
    state.rows.forEach(function (r) { r.cells.forEach(function (c) { c.s = Object.assign({}, CV.registry[c.mod].defaults, c.s); }); });
    state.preset = id; state.dirty = false;
    renderLayout(); save();
  }
  function snapshotRows() {
    return state.rows.map(function (r) {
      return { h: r.h, cells: r.cells.map(function (c) { return { mod: c.mod, w: c.w, bw: c.bw, ch: c.ch, s: diffS(c) }; }) };
    });
  }
  function savePresetAs(nome) {
    var u = userPresets();
    var ja = u.filter(function (p) { return p.nome.toLowerCase() === nome.toLowerCase(); })[0];
    if (ja) ja.rows = snapshotRows();
    else { ja = { id: 'u-' + newUid(), nome: nome, rows: snapshotRows() }; u.push(ja); }
    writeJSON(KEY_USER, u);
    state.preset = ja.id; state.dirty = false;
    refreshToolbar(); save();
    toast('Preset “' + nome + '” salvo');
  }
  function saveIntoCurrent() {
    var u = userPresets(), id = state.preset;
    u.forEach(function (p) { if (p.id === id) p.rows = snapshotRows(); });
    writeJSON(KEY_USER, u);
    state.dirty = false; refreshToolbar(); save();
    toast('Alterações salvas em “' + presetName(id) + '”');
  }
  function deletePreset(id) {
    var u = userPresets().filter(function (p) { return p.id !== id; });
    writeJSON(KEY_USER, u);
    if (state.preset === id) { state.preset = 'custom'; state.dirty = false; }
    refreshToolbar(); save();
  }

  /* ================= TEMA ================= */
  function hexRgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [parseInt(h.substr(0, 2), 16) || 0, parseInt(h.substr(2, 2), 16) || 0, parseInt(h.substr(4, 2), 16) || 0];
  }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  /* O tema muda o fundo dos visuais E o cromo inteiro: barra, menus e ajustes saem
     das mesmas cores, então trocar de tema troca de aparelho. */
  function applyThemeChrome() {
    var b = CV.themeBg(state.theme);
    var root = document.documentElement.style;
    var light = !!b.light;
    var vars = {
      '--bg': b.bg, '--panel': b.panel, '--text': b.text || '#9a9a9a', '--ink': b.ink || '#ececec',
      '--surface': light ? mix(b.panel, '#ffffff', 0.62) : mix(b.panel, '#ffffff', 0.065),
      '--surface-hi': light ? '#ffffff' : mix(b.panel, '#ffffff', 0.15),
      '--well': light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      '--line': light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)',
      '--line-2': light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.15)',
      '--hover': light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
      '--active': light ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.11)',
      '--accent': b.ink || '#ececec',
      '--on-accent': b.panel,
      '--red': light ? '#d1293d' : '#ff4d5e',
      '--shadow': light ? '0 10px 30px rgba(40,30,20,0.18)' : '0 10px 34px rgba(0,0,0,0.45)'
    };
    Object.keys(vars).forEach(function (k) { root.setProperty(k, vars[k]); });
    body.classList.toggle('light', light);
    markFx();
  }
  function setTheme(th) {
    if (!THEMES.some(function (t) { return t[0] === th; })) return;
    state.theme = CV.theme = th;
    /* a onda e o espectrograma guardam o passado desenhado: sem zerar, a cor do tema
       anterior ficava rolando na tela por vários segundos */
    Object.keys(panels).forEach(function (id) {
      var p = panels[id];
      if (p.def.buffered) { p.st = {}; try { p.def.init(p); } catch (e) {} }
    });
    applyThemeChrome(); save();
    if (setOpen && setTab === 'aparencia') renderSettings();
  }
  function cycleTheme(dir) {
    var i = 0;
    THEMES.forEach(function (t, k) { if (t[0] === state.theme) i = k; });
    var nx = THEMES[(i + (dir || 1) + THEMES.length) % THEMES.length];
    setTheme(nx[0]);
    toast('Tema ' + nx[1]);
  }

  /* ================= POSIÇÃO DA JANELA ================= */
  var applyingPos = false;
  function applyPosition(id, opts) {
    if (!POS[id]) return;
    opts = opts || {};
    var antes = state.pos;
    var reabrir = setOpen && desk && !opts.semJanela ? setTab : null;
    if (reabrir) closeSettings(true);
    state.pos = id;
    renderLayout();
    if (desk && desk.winStick && !opts.semJanela) {
      var def = POS[id];
      applyingPos = true;
      var size = def.mode === 'row' ? state.barH : def.mode === 'col' ? state.colW : 0;
      Promise.resolve(desk.winStick(def.dock, size)).then(function () {
        if (def.dock === 'off' && POS[antes] && POS[antes].dock === 'off' && state.win) desk.winSetBounds(state.win);
      }).catch(function () {}).then(function () { setTimeout(function () { applyingPos = false; }, 400); });
    }
    save(); checkNarrow();
    if (reabrir) setTimeout(function () { openSettings(reabrir); }, 650);
    else if (setOpen && setTab === 'janela') renderSettings();
  }
  function setThickness(px) {
    var mode = layoutMode();
    if (mode === 'row') state.barH = px; else if (mode === 'col') state.colW = px; else return;
    if (desk && desk.winStick) {
      applyingPos = true;
      Promise.resolve(desk.winStick(POS[state.pos].dock, px)).catch(function () {})
        .then(function () { setTimeout(function () { applyingPos = false; }, 300); });
    }
    save();
  }
  function togglePin(force) {
    state.pinned = force === undefined ? !state.pinned : !!force;
    if (desk && desk.winPin) desk.winPin(state.pinned);
    refreshToolbar(); save();
    toast(state.pinned ? 'Sempre na frente: ligado' : 'Sempre na frente: desligado');
  }

  /* ================= BARRA DE FERRAMENTAS =================
     Aparece quando o mouse mexe dentro da janela e some 1,8s depois. Fica enquanto
     o mouse está em cima dela, com menu aberto, ou se você fixou (H). */
  var tbEl = $('toolbar'), tbHover = false, tbTimer = 0;
  function showToolbar() {
    body.classList.add('tb-on');
    clearTimeout(tbTimer);
    tbTimer = setTimeout(hideToolbar, 1800);
  }
  function hideToolbar(now) {
    if (state.toolbar === 'fixo' || menuOpen || (!now && tbHover)) { clearTimeout(tbTimer); tbTimer = setTimeout(hideToolbar, 1200); return; }
    body.classList.remove('tb-on');
  }
  tbEl.addEventListener('mouseenter', function () { tbHover = true; });
  tbEl.addEventListener('mouseleave', function () { tbHover = false; });
  window.addEventListener('mousemove', showToolbar, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () {
    tbHover = false;
    clearTimeout(tbTimer);
    tbTimer = setTimeout(function () { hideToolbar(true); }, 500);
  });
  function refreshToolbar() {
    var pb = $('tbPreset');
    var nome = state.preset && state.preset !== 'custom' ? presetName(state.preset) : 'Personalizado';
    pb.querySelector('.tb-name').textContent = nome;
    pb.classList.toggle('dirty', !!state.dirty);
    pb.title = 'Preset: ' + nome + (state.dirty ? ' (com alterações)' : '');
    setIcon($('tbPos'), POS[state.pos].icon);
    $('tbPos').title = 'Posição: ' + POS[state.pos].nome;
    $('tbPin').classList.toggle('on', !!state.pinned);
    $('tbPause').classList.toggle('on', paused);
    setIcon($('tbPause'), paused ? 'play' : 'pause');
    $('tbPause').title = paused ? 'Continuar (P)' : 'Pausar (P)';
    $('tbSettings').classList.toggle('on', setOpen);
    if (state.toolbar === 'fixo') body.classList.add('tb-on');
  }
  function checkNarrow() {
    body.classList.toggle('narrow', window.innerWidth < 560);
    body.classList.toggle('tiny', window.innerWidth < 330);
  }
  window.addEventListener('resize', function () { checkNarrow(); closeMenu(); markFx(); });

  $('tbPreset').addEventListener('click', function () { menuToggle(this, presetMenu); });
  $('tbTheme').addEventListener('click', function () { menuToggle(this, themeMenu); });
  $('tbPos').addEventListener('click', function () { menuToggle(this, posMenu); });
  $('tbPin').addEventListener('click', function () { togglePin(); });
  $('tbPause').addEventListener('click', function () { togglePause(); });
  $('tbSettings').addEventListener('click', function () { setOpen ? closeSettings() : openSettings(); });
  $('tbMore').addEventListener('click', function () { menuToggle(this, moreMenu); });
  tbEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b && b.blur) b.blur();
  });
  if (desk) {
    body.classList.add('desk');
    $('tbMin').addEventListener('click', function () { desk.winMinimize(); });
    $('tbClose').addEventListener('click', function () { saveNow(); desk.winClose(); });
  }

  /* ================= MENUS ================= */
  var menuEl = $('menu'), menuOpen = false, menuPanel = null, menuAnchor = null, lastClosed = { el: null, t: 0 };
  /* clicar de novo no botão que abriu o menu FECHA o menu (o mousedown já fechou,
     então o clique que vem logo depois não pode reabrir) */
  function menuToggle(btn, fn) {
    if (lastClosed.el === btn && performance.now() - lastClosed.t < 450) return;
    fn(btn);
  }
  function mItem(label, act, o) { o = o || {}; o.t = 'i'; o.label = label; o.act = act; return o; }
  function mHead(label) { return { t: 'h', label: label }; }
  var mSep = { t: 's' };
  function openMenu(at, items) {
    closeMenu();
    var html = '';
    items.forEach(function (it, i) {
      if (it.t === 'h') html += '<div class="mh">' + esc(it.label) + '</div>';
      else if (it.t === 's') html += '<div class="ms"></div>';
      else {
        var lead = it.swatch ? '<span class="sw" style="background:' + esc(it.swatch) + '"></span>'
          : '<span class="ck">' + (it.check ? ic('check') : it.icon ? ic(it.icon) : '') + '</span>';
        html += '<button class="mi' + (it.danger ? ' danger' : '') + '" data-i="' + i + '"' + (it.disabled ? ' disabled' : '') +
          (it.tip ? ' title="' + esc(it.tip) + '"' : '') + '>' + lead + '<span>' + esc(it.label) + '</span>' +
          (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</button>';
      }
    });
    menuEl.innerHTML = html;
    menuEl.className = '';
    menuEl.style.cssText = 'left:0;top:0;visibility:hidden';
    var r = at.getBoundingClientRect ? at.getBoundingClientRect() : { left: at.x, right: at.x, top: at.y, bottom: at.y };
    var avail = window.innerHeight - 12;
    var mh = menuEl.scrollHeight, mw = menuEl.offsetWidth;
    /* JANELA BAIXA (barra de 170px): o menu não cabe em pé, então vira colunas.
       Nada de menu cortado com o último item fora da tela. */
    if (mh > avail) {
      var ncol = Math.min(6, Math.ceil(mh / avail) + (mh / avail > 2.5 ? 1 : 0));
      menuEl.className = 'cols';
      menuEl.style.columnCount = ncol;
      menuEl.style.width = Math.min(window.innerWidth - 12, mw * ncol + 4 * (ncol - 1) + 10) + 'px';
      menuEl.style.height = avail + 'px';
      mh = avail; mw = menuEl.offsetWidth;
    }
    var x = r.left, y = r.bottom + 4;
    if (y + mh > window.innerHeight - 6) y = r.top - 4 - mh;
    if (y < 6) y = Math.max(6, window.innerHeight - 6 - mh);
    if (x + mw > window.innerWidth - 6) x = Math.max(6, window.innerWidth - 6 - mw);
    menuEl.style.left = Math.round(x) + 'px';
    menuEl.style.top = Math.round(y) + 'px';
    menuEl.style.visibility = '';
    menuEl.onclick = function (ev) {
      var b = ev.target.closest ? ev.target.closest('.mi') : null;
      if (!b) return;
      var it = items[+b.getAttribute('data-i')];
      closeMenu();
      if (it && it.act) it.act();
    };
    menuOpen = true;
    menuAnchor = at && at.nodeType ? at : null;
    showToolbar();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    lastClosed = { el: menuAnchor, t: performance.now() };
    menuAnchor = null;
    menuEl.className = 'hidden';
    menuEl.innerHTML = '';
    if (menuPanel) { menuPanel.el.classList.remove('menu-on'); menuPanel = null; }
  }
  window.addEventListener('mousedown', function (e) {
    if (menuOpen && !menuEl.contains(e.target)) {
      closeMenu();
    }
  }, true);
  window.addEventListener('blur', closeMenu);

  function presetMenu(anchor) {
    var items = [];
    ['Medição', 'Arte', 'Misto'].forEach(function (g) {
      items.push(mHead(g));
      PRESETS.filter(function (p) { return p.grupo === g; }).forEach(function (p) {
        items.push(mItem(p.nome, function () { applyPreset(p.id); }, { check: state.preset === p.id, sub: p.rows.map(function (r) { return r.length - 1; }).reduce(function (a, b) { return a + b; }, 0) + ' visuais' }));
      });
    });
    var u = userPresets();
    if (u.length) {
      items.push(mHead('Meus presets'));
      u.forEach(function (p) { items.push(mItem(p.nome, function () { applyPreset(p.id); }, { check: state.preset === p.id })); });
    }
    items.push(mSep);
    var meu = /^u-/.test(state.preset || '');
    if (meu && state.dirty) items.push(mItem('Salvar alterações em “' + presetName(state.preset) + '”', saveIntoCurrent, { icon: 'save' }));
    items.push(mItem('Salvar como novo preset…', function () {
      askName('Nome do preset', '', function (nome) { savePresetAs(nome); });
    }, { icon: 'plus' }));
    if (state.dirty && presetById(state.preset)) items.push(mItem('Desfazer alterações', function () { applyPreset(state.preset); }, { icon: 'undo' }));
    if (meu) items.push(mItem('Apagar “' + presetName(state.preset) + '”', function () { deletePreset(state.preset); toast('Preset apagado'); }, { icon: 'trash', danger: true }));
    openMenu(anchor, items);
  }
  function themeMenu(anchor) {
    var items = [mHead('Tema')];
    THEMES.forEach(function (t) {
      var pv = CV.themePreview(t[0]);
      items.push(mItem(t[1], function () { setTheme(t[0]); }, { swatch: pv.panel, sub: state.theme === t[0] ? '✓' : '' }));
    });
    items.push(mSep);
    items.push(mItem('Mais opções de aparência…', function () { openSettings('aparencia'); }, { icon: 'sliders' }));
    openMenu(anchor, items);
  }
  function posMenu(anchor) {
    var items = [mHead('Posição')];
    POSITIONS.forEach(function (p) {
      items.push(mItem(p.nome, function () { applyPosition(p.id); }, { icon: p.icon, sub: state.pos === p.id ? '✓' : '' }));
    });
    if (desk) {
      items.push(mSep);
      items.push(mItem('Sempre na frente', function () { togglePin(); }, { check: state.pinned }));
    }
    openMenu(anchor, items);
  }
  function moreMenu(anchor) {
    var items = [
      mItem('Adicionar visual…', function () { modulePicker(anchor, function (mod) { addModule(mod); }); }, { icon: 'plus' }),
      mItem('Tela cheia', toggleFull, { icon: 'full' }),
      mSep,
      mItem('Barra de ferramentas sempre visível', function () { setToolbarMode(state.toolbar === 'fixo' ? 'auto' : 'fixo'); }, { check: state.toolbar === 'fixo', sub: 'H' }),
      mItem('Mostrar desempenho', toggleHud, { check: hudOn, sub: 'F' }),
      mItem('Mostrar último vídeo no Finder', function () { if (desk && desk.showFile && ultimoVideo) desk.showFile(ultimoVideo); }, { icon: 'rec', disabled: !(desk && ultimoVideo) }),
      mSep,
      mItem('Atalhos e ajuda', function () { openSettings('atalhos'); }, { icon: 'help' })
    ];
    openMenu(anchor, items);
  }
  function modulePicker(at, cb, current) {
    var items = [], ids = Object.keys(CV.registry);
    [['Estúdio', 'Medidores'], ['Arte', 'Arte']].forEach(function (g) {
      items.push(mHead(g[1]));
      ids.filter(function (id) { return CV.registry[id].group === g[0]; }).forEach(function (id) {
        var d = CV.registry[id];
        items.push(mItem(d.name, function () { cb(id); }, { check: current === id, tip: d.desc || '' }));
      });
    });
    openMenu(at, items);
  }
  function panelMenu(p, at) {
    var items = [
      mHead(p.def.name),
      mItem('Ajustes deste visual', function () { openSettings('visuais', p.id); }, { icon: 'sliders' }),
      mItem(p.rec ? 'Parar gravação' : 'Gravar vídeo', function () { toggleRec(p); }, { icon: 'rec' }),
      mSep,
      mItem('Trocar por…', function () { modulePicker(at, function (mod) { replaceCell(p.id, mod); }, p.modId); }, { icon: 'swap' }),
      mItem('Adicionar ao lado…', function () { modulePicker(at, function (mod) { addModule(mod, p.id); }); }, { icon: 'plus' }),
      mSep,
      mItem('Remover da tela', function () { removeCell(p.id); }, { icon: 'close', danger: true })
    ];
    openMenu(at, items);
    menuPanel = p; p.el.classList.add('menu-on');
  }

  /* ================= AJUSTES ================= */
  var setEl = $('settings'), setBody = $('setbody');
  var setOpen = false, setTab = 'visuais', setFocusUid = null, setGrew = false;
  var SET_H = 300;
  function sheetGrowsWindow() {
    if (!desk || !desk.winSettings) return false;
    var mode = layoutMode();
    if (mode === 'row') return true;                         // barra encaixada: a janela cresce
    if (mode === 'free' && window.innerHeight < 560) return true;
    return false;
  }
  function openSettings(tab, uid) {
    if (tab) setTab = tab;
    if (uid) setFocusUid = uid;
    closeMenu();
    renderSettings();
    if (setOpen) { refreshToolbar(); return; }
    setOpen = true;
    if (sheetGrowsWindow()) {
      /* A JANELA CRESCE em vez da folha cobrir os visuais (é o que o MiniMeters faz).
         O tamanho da grade fica travado no que ela tinha, então nada pisca enquanto
         a janela estica. */
      setGrew = true;
      body.classList.add('set-grew');
      /* barra no rodapé: a folha abre EM CIMA dela, então os medidores não saem do
         lugar na tela. Nas outras posições ela abre embaixo. */
      var emCima = state.pos === 'bottom';
      body.classList.toggle('set-top', emCima);
      gridEl.style.height = window.innerHeight + 'px';
      if (emCima) { gridEl.style.top = 'auto'; gridEl.style.bottom = '0'; }
      else gridEl.style.bottom = 'auto';
      body.classList.add('set-open');
      Promise.resolve(desk.winSettings(true, SET_H, false)).then(function (b) {
        setTimeout(function () {
          if (!setOpen) return;
          var cresceu = window.innerHeight - parseFloat(gridEl.style.height || '0');
          if (cresceu > 40) document.documentElement.style.setProperty('--set-h', Math.round(cresceu) + 'px');
          resizeAll(true);
        }, 160);
      }).catch(function () {});
    } else {
      setGrew = false;
      body.classList.add('set-open');
      setTimeout(function () { resizeAll(true); }, 230);
    }
    refreshToolbar();
  }
  function closeSettings(semAnimar) {
    if (!setOpen) return;
    setOpen = false;
    if (setGrew) {
      gridEl.style.height = gridEl.getBoundingClientRect().height + 'px';
      body.classList.remove('set-open');
      Promise.resolve(desk.winSettings(false)).catch(function () {}).then(function () {
        setTimeout(function () {
          if (setOpen) return;
          gridEl.style.height = ''; gridEl.style.bottom = ''; gridEl.style.top = '';
          body.classList.remove('set-top');
          document.documentElement.style.removeProperty('--set-h');
          resizeAll(true);
        }, 160);
      });
    } else {
      body.classList.remove('set-open');
      setTimeout(function () { resizeAll(true); }, semAnimar ? 0 : 230);
    }
    setGrew = false;
    body.classList.remove('set-grew');
    refreshToolbar();
  }
  $('setclose').addEventListener('click', function () { closeSettings(); });
  $('settabs').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-tab]') : null;
    if (!b) return;
    setTab = b.getAttribute('data-tab');
    renderSettings();
  });

  function fmtVal(f, v) {
    if (f.fmt === 'pct') return Math.round(v * 100) + '%';
    if (f.fmt === 'db') return (v > 0 ? '+' : '') + (+v).toFixed(1) + ' dB';
    if (f.fmt === 'int') return String(Math.round(v));
    if (f.fmt === 'px') return Math.round(v) + ' px';
    var st = +f.step || 0.01;
    return st >= 1 ? String(Math.round(v)) : (+v).toFixed(st >= 0.1 ? 1 : 2);
  }
  function ctrlHtml(f, val, key) {
    var h = '<div class="fr"><label title="' + esc(f.label) + '">' + esc(f.label) + '</label>';
    if (f.type === 'seg') {
      h += '<div class="seg" data-k="' + esc(key) + '">';
      f.opts.forEach(function (o) {
        h += '<button data-v="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>';
      });
      h += '</div>';
    } else if (f.type === 'select') {
      h += '<select class="sel" data-k="' + esc(key) + '">';
      f.opts.forEach(function (o) {
        h += '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      });
      h += '</select>';
    } else if (f.type === 'toggle') {
      h += '<button class="tog' + (val ? ' on' : '') + '" data-k="' + esc(key) + '" aria-pressed="' + (val ? 'true' : 'false') + '"></button>';
    } else {
      h += '<div class="rng"><input type="range" data-k="' + esc(key) + '" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 0.01) + '" value="' + val + '">' +
        '<output>' + fmtVal(f, +val) + '</output></div>';
    }
    return h + '</div>';
  }
  /* liga os controles de uma área: cada um chama set(chave, valor) */
  function wireCtrls(root, fields, set) {
    root.querySelectorAll('.seg[data-k]').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button') : null;
        if (!b) return;
        var k = seg.getAttribute('data-k'), raw = b.getAttribute('data-v');
        var v = /^-?\d+(\.\d+)?$/.test(raw) ? parseFloat(raw) : raw;
        seg.querySelectorAll('button').forEach(function (o) { o.classList.toggle('on', o === b); });
        set(k, v);
      });
    });
    root.querySelectorAll('input[type="range"][data-k]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-k'), v = parseFloat(inp.value);
        var f = fields[k], out = inp.parentNode.querySelector('output');
        if (out && f) out.textContent = fmtVal(f, v);
        set(k, v);
      });
    });
    root.querySelectorAll('select[data-k]').forEach(function (sel) {
      sel.addEventListener('change', function () { set(sel.getAttribute('data-k'), sel.value); });
    });
    root.querySelectorAll('.tog[data-k]').forEach(function (b) {
      b.addEventListener('click', function () {
        var on = !b.classList.contains('on');
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        set(b.getAttribute('data-k'), on);
      });
    });
  }

  function renderSettings() {
    $('settabs').querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === setTab); });
    var fn = { visuais: tabVisuais, aparencia: tabAparencia, janela: tabJanela, audio: tabAudio, gravacao: tabGravacao, atalhos: tabAtalhos }[setTab] || tabVisuais;
    fn();
  }

  function tabVisuais() {
    var cells = allCells();
    var foco = null;
    cells.forEach(function (c) { if (c.uid === setFocusUid) foco = c; });
    if (!foco && cells.length) foco = cells[0];
    setFocusUid = foco ? foco.uid : null;
    var conta = {};
    var h = '<div class="chips">';
    cells.forEach(function (c) {
      var nm = CV.registry[c.mod].name;
      conta[c.mod] = (conta[c.mod] || 0) + 1;
      var rep = cells.filter(function (o) { return o.mod === c.mod; }).length > 1 ? ' ' + conta[c.mod] : '';
      h += '<button class="chip' + (c === foco ? ' on' : '') + '" data-uid="' + c.uid + '">' + esc(nm + rep) + '</button>';
    });
    h += '<button class="chip add" id="setadd">' + ic('plus') + 'Adicionar</button></div>';
    var fields = {};
    if (foco) {
      var def = CV.registry[foco.mod];
      (def.schema || []).forEach(function (f) { fields[f.k] = f; });
      var fxOn = state.fx.preset !== 'off';
      if (fxOn) fields.fx = { k: 'fx', label: 'Acabamento aqui', type: 'range', min: 0, max: 1, step: 0.05, fmt: 'pct' };
      h += '<div class="form">';
      // controle que só faz sentido com outro ligado (o Mapa da onda só vale com Cor = Mapa)
      (def.schema || []).forEach(function (f) {
        if (f.when && String(foco.s[f.when[0]]) !== String(f.when[1])) return;
        h += ctrlHtml(f, foco.s[f.k] !== undefined ? foco.s[f.k] : f.def, f.k);
      });
      if (fxOn) h += ctrlHtml(fields.fx, foco.s.fx !== undefined ? foco.s.fx : 1, 'fx');
      h += '</div>';
      if (!(def.schema || []).length && !fxOn) h += '<p class="note">Este visual não tem ajustes: ele já sai do jeito certo.</p>';
      if (def.desc) h += '<p class="note" style="margin-top:12px">' + esc(def.desc) + '.</p>';
      h += '<div class="acts">' +
        '<button class="btn" id="setreset">' + ic('undo') + 'Restaurar padrão</button>' +
        '<button class="btn" id="setswap">' + ic('swap') + 'Trocar visual</button>' +
        '<button class="btn danger" id="setrem">' + ic('close') + 'Remover</button></div>';
    } else {
      h += '<p class="note">Nenhum visual na tela. Adicione um ou escolha um preset na barra de ferramentas.</p>';
    }
    setBody.innerHTML = h;
    setBody.querySelectorAll('.chip[data-uid]').forEach(function (b) {
      b.addEventListener('click', function () { setFocusUid = b.getAttribute('data-uid'); renderSettings(); });
    });
    $('setadd').addEventListener('click', function () {
      modulePicker(this, function (mod) { var c = addModule(mod); if (c) { setFocusUid = c.uid; renderSettings(); } });
    });
    if (!foco) return;
    var manda = {};
    (def && def.schema || []).forEach(function (f) { if (f.when) manda[f.when[0]] = 1; });
    wireCtrls(setBody, fields, function (k, v) {
      foco.s[k] = v;
      if (k === 'hue' && foco.s.colorMode !== undefined) foco.s.colorMode = 'custom';
      if (k === 'fx') markFx();
      markDirty(); save();
      if (manda[k]) renderSettings();
    });
    $('setreset').addEventListener('click', function () {
      var keep = foco.s.fx;
      foco.s = Object.assign({}, CV.registry[foco.mod].defaults);
      if (keep !== undefined && state.fx.preset !== 'off') foco.s.fx = keep;
      var p = panels[foco.uid]; if (p) p.s = foco.s;
      markDirty(); save(); renderSettings();
    });
    $('setswap').addEventListener('click', function () {
      var uid = foco.uid;
      modulePicker(this, function (mod) { replaceCell(uid, mod); setFocusUid = uid; renderSettings(); }, foco.mod);
    });
    $('setrem').addEventListener('click', function () { removeCell(foco.uid); });
  }

  function themeCard(th, nome) {
    var pv = CV.themePreview(th);
    var lines = pv.cores.map(function (c, i) {
      var y0 = 44 - i * 9, d = 'M0 ' + (y0 + 8);
      for (var x = 0; x <= 124; x += 6) d += ' L' + x + ' ' + (y0 + Math.sin(x / (9 + i * 3) + i) * (5 + i * 2) - x * 0.06).toFixed(1);
      return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.4" opacity="0.95"/>';
    }).join('');
    var gridA = Math.min(0.4, pv.grid * 0.6), gc = pv.light ? 'rgba(0,0,0,' + gridA + ')' : 'rgba(255,255,255,' + gridA + ')';
    return '<button class="th' + (state.theme === th ? ' on' : '') + '" data-th="' + th + '" title="' + esc(nome) + '">' +
      '<svg viewBox="0 0 124 70" preserveAspectRatio="none"><rect width="124" height="70" fill="' + pv.panel + '"/>' +
      '<path d="M31 0V70M62 0V70M93 0V70" stroke="' + gc + '" stroke-width="0.6"/>' + lines + '</svg>' +
      '<span class="nm" style="color:' + pv.ink + '">' + esc(nome) + '</span></button>';
  }
  function tabAparencia() {
    var h = '<div class="sec"><h4>Tema</h4><div class="themes">';
    THEMES.forEach(function (t) { h += themeCard(t[0], t[1]); });
    h += '</div></div>';
    var fields = {
      fxp: { k: 'fxp', label: 'Acabamento', type: 'seg', opts: FX_ORDEM.map(function (k) { return [k, FX_NOMES[k]]; }) },
      fxa: { k: 'fxa', label: 'Intensidade', type: 'range', min: 0.05, max: 1, step: 0.05, fmt: 'pct' }
    };
    h += '<div class="sec"><h4>Acabamento de filme</h4><div class="form">' + ctrlHtml(fields.fxp, state.fx.preset, 'fxp');
    if (state.fx.preset !== 'off') h += ctrlHtml(fields.fxa, state.fx.amount, 'fxa');
    h += '</div><p class="note" style="margin-top:10px">Uma passada de luz de cinema por cima de tudo: halação, grão e vinheta. ' +
      '<b>Régua</b> é o acabamento discreto dos medidores; <b>Prata</b> e <b>Vidro</b> são pra clipe e show. ' +
      'Custa placa de vídeo, então nasce desligado. Os medidores nunca recebem borrão nem aberração.</p>';
    if (!fxi) h += '<p class="note">Esta placa de vídeo não aceita a passada de acabamento.</p>';
    h += '</div>';
    setBody.innerHTML = h;
    setBody.querySelectorAll('.th[data-th]').forEach(function (b) {
      b.addEventListener('click', function () { setTheme(b.getAttribute('data-th')); });
    });
    wireCtrls(setBody, fields, function (k, v) {
      if (k === 'fxp') { state.fx.preset = v; fxOverload = false; markFx(); save(); renderSettings(); }
      if (k === 'fxa') { state.fx.amount = v; save(); }
    });
  }

  function tabJanela() {
    var mode = layoutMode();
    var h = '<div class="sec"><h4>Posição</h4><div class="posgrid">';
    POSITIONS.forEach(function (p) {
      h += '<button class="pos' + (state.pos === p.id ? ' on' : '') + '" data-pos="' + p.id + '">' + ic(p.icon) + '<span>' + esc(p.nome) + '</span></button>';
    });
    h += '</div>';
    if (!desk) h += '<p class="note" style="margin-top:10px">No navegador a posição só muda o arranjo dos visuais. Encaixar a janela na borda da tela é coisa do app instalado.</p>';
    h += '</div>';
    var fields = {
      pin: { k: 'pin', label: 'Sempre na frente', type: 'toggle' },
      esp: mode === 'row' ? { k: 'esp', label: 'Altura da barra', type: 'range', min: 80, max: 360, step: 2, fmt: 'px' }
        : { k: 'esp', label: 'Largura da coluna', type: 'range', min: 180, max: 640, step: 4, fmt: 'px' },
      fps: { k: 'fps', label: 'Quadros/s', type: 'seg', opts: FPS_OPTS },
      tb: { k: 'tb', label: 'Ferramentas', type: 'seg', opts: [['auto', 'Somem sozinhas'], ['fixo', 'Sempre visíveis']] }
    };
    h += '<div class="sec"><h4>Comportamento</h4><div class="form">';
    if (desk) h += ctrlHtml(fields.pin, !!state.pinned, 'pin');
    if (desk && mode !== 'free') h += ctrlHtml(fields.esp, mode === 'row' ? state.barH : state.colW, 'esp');
    h += ctrlHtml(fields.fps, state.fps, 'fps') + ctrlHtml(fields.tb, state.toolbar, 'tb') + '</div>';
    h += '<p class="note" style="margin-top:10px">Quadros "da tela" acompanha o monitor: 120 numa tela ProMotion, 60 numa comum. ' +
      '30 economiza bateria e deixa a máquina livre pro FL Studio.</p></div>';
    setBody.innerHTML = h;
    setBody.querySelectorAll('.pos[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () { applyPosition(b.getAttribute('data-pos')); });
    });
    var espT = 0;
    wireCtrls(setBody, fields, function (k, v) {
      if (k === 'pin') togglePin(v);
      if (k === 'fps') { state.fps = v; save(); }
      if (k === 'tb') setToolbarMode(v);
      if (k === 'esp') { clearTimeout(espT); espT = setTimeout(function () { setThickness(v); }, 120); }
    });
  }

  var audioStat = { txt: 'Conectando…', nivel: 'warn', det: '' };
  function setAudioStat(txt, nivel, det) {
    audioStat = { txt: txt, nivel: nivel, det: det || '' };
    if (setOpen && setTab === 'audio') renderSettings();
  }
  function audioAgora() {
    // o que está tocando de fato manda no texto (demo e arquivo podem entrar por fora)
    var k = engine.sourceKind;
    if (k === 'demo') return { txt: 'Beat demo', nivel: 'ok', det: '' };
    if (k === 'synth') return { txt: 'Demo sintético', nivel: 'ok', det: '' };
    if (k === 'file') return { txt: 'Tocando ' + (engine.sourceLabel || 'arquivo').toLowerCase(), nivel: 'ok', det: 'Clique em Reconectar pra voltar a ouvir o computador.' };
    return audioStat;
  }
  function tabAudio() {
    var as = audioAgora();
    var h = '<div class="sec"><h4>Entrada</h4><div class="form">' +
      '<div class="fr"><label>Ouvindo</label><select class="sel" id="srcpick"><option value="auto">Áudio do computador (padrão)</option></select></div>' +
      '<div class="fr"><label>Estado</label><span class="stat ' + ({ ok: 'ok', warn: 'warn', bad: 'bad' }[as.nivel] || '') + '">' + esc(as.txt) + '</span></div>' +
      '</div>';
    if (as.det) h += '<p class="note" style="margin-top:8px">' + esc(as.det) + '</p>';
    h += '<div class="acts"><button class="btn" id="audretry">Reconectar</button>' +
      '<button class="btn" id="auddemo">Testar com o beat demo</button></div></div>';
    h += '<div class="sec"><h4>Dicas</h4>' +
      '<p class="note">O app escuta o que sai das caixas: FL Studio, YouTube, Spotify. Não precisa de driver.</p>' +
      '<p class="note">Estéreo de verdade vem do módulo nativo (o estado mostra <b>Estéreo nativo</b>). Sem ele o app segue em mono pelo sistema; o passo a passo está no README.</p>' +
      '<p class="note">Também dá pra soltar um arquivo de áudio na janela: ele toca e os visuais reagem, bom pra gravar clipe de uma faixa pronta.</p></div>';
    setBody.innerHTML = h;
    var pick = $('srcpick');
    engine.listInputs().then(function (inputs) {
      (inputs || []).forEach(function (d) {
        if (!d.deviceId || d.deviceId === 'default') return;
        var o = document.createElement('option');
        o.value = d.deviceId; o.textContent = d.label || 'Entrada de áudio';
        pick.appendChild(o);
      });
      if (state.audioIn && state.audioIn !== 'auto') pick.value = state.audioIn;
    }).catch(function () {});
    pick.addEventListener('change', function () {
      state.audioIn = pick.value; save();
      if (pick.value === 'auto') startComputerAudio();
      else startDevice(pick.value, pick.options[pick.selectedIndex].textContent);
    });
    $('audretry').addEventListener('click', function () { state.audioIn = 'auto'; save(); startComputerAudio(); });
    $('auddemo').addEventListener('click', function () {
      engine.startDemo().then(function (r) {
        setAudioStat(r === 'synth' ? 'Demo sintético' : 'Beat demo', 'ok');
        toast(r === 'synth' ? 'Tocando o demo sintético' : 'Tocando o beat demo');
      });
    });
  }
  function tabGravacao() {
    var fields = { rec: { k: 'rec', label: 'Medida do vídeo', type: 'seg', opts: REC_SIZES } };
    var h = '<div class="sec"><h4>Vídeo</h4><div class="form">' + ctrlHtml(fields.rec, state.recSize, 'rec') + '</div>' +
      '<p class="note" style="margin-top:10px">Passe o mouse num visual e clique no <b>●</b> (ou clique com o botão direito nele). ' +
      'O vídeo sai em MP4 com o áudio junto, já sincronizado. Clique de novo pra parar.</p>' +
      '<p class="note">Com uma medida fixa o visual é redesenhado fora da tela no tamanho exato, então ele já sai pronto pro Reels ou pro YouTube, sem reenquadrar no Final Cut. O acabamento de filme entra no vídeo também.</p></div>';
    setBody.innerHTML = h;
    wireCtrls(setBody, fields, function (k, v) { state.recSize = v; save(); });
  }
  function tabAtalhos() {
    var keys = [
      ['S', 'Abre e fecha os ajustes'], ['P', 'Pausa e continua'], ['T', 'Troca de tema'],
      ['H', 'Barra de ferramentas sempre visível'], ['F', 'Mostra fps e o atraso do som até a tela'],
      ['Esc', 'Fecha o que estiver aberto'], ['Botão direito', 'Menu do visual: ajustes, gravar, trocar, remover'],
      ['Duplo clique', 'Na divisória: iguala os tamanhos'], ['⌘Q', 'Fecha o programa']
    ];
    var h = '<div class="sec"><h4>Atalhos</h4><div class="keys">';
    keys.forEach(function (k) { h += '<span><span class="kbd">' + esc(k[0]) + '</span></span><span>' + esc(k[1]) + '</span>'; });
    h += '</div></div><div class="sec"><h4>Como usar</h4>' +
      '<p class="note">Arraste a divisória entre dois visuais pra mudar o tamanho. Arraste pela alça <b>⋮⋮</b> pra trocar de lugar: solte do lado pra encaixar na linha, em cima ou embaixo pra abrir uma linha nova.</p>' +
      '<p class="note">O preset guarda quais visuais estão na tela e o tamanho de cada um. Tema e posição são separados.</p></div>' +
      '<div class="sec"><h4>Sobre</h4><p class="note"><b>Caramujo Vision 2.0</b> · rideblan / Caramujo Records · @rideblan33</p></div>';
    setBody.innerHTML = h;
  }
  function setToolbarMode(m) {
    state.toolbar = m === 'fixo' ? 'fixo' : 'auto';
    if (state.toolbar === 'fixo') body.classList.add('tb-on'); else showToolbar();
    save();
    if (setOpen && setTab === 'janela') renderSettings();
  }

  /* ================= CAIXA DE NOME ================= */
  var askCb = null;
  function askName(label, initial, cb) {
    askCb = cb;
    $('asklabel').textContent = label;
    $('askinput').value = initial || '';
    $('ask').classList.remove('hidden');
    setTimeout(function () { $('askinput').focus(); $('askinput').select(); }, 30);
  }
  function askClose(ok) {
    $('ask').classList.add('hidden');
    var v = ($('askinput').value || '').trim(), cb = askCb;
    askCb = null;
    if (ok && v && cb) cb(v.slice(0, 40));
  }
  $('askok').addEventListener('click', function () { askClose(true); });
  $('askcancel').addEventListener('click', function () { askClose(false); });
  $('askinput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') askClose(true);
    if (e.key === 'Escape') { e.stopPropagation(); askClose(false); }
  });
  $('ask').addEventListener('mousedown', function (e) { if (e.target === $('ask')) askClose(false); });

  /* ================= AVISOS ================= */
  var toastT = 0;
  function toast(txt, ms) {
    var t = $('toast');
    t.textContent = txt;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, ms || 2200);
  }

  /* ================= PAUSA, TELA CHEIA, HUD ================= */
  var paused = false;
  function togglePause() {
    paused = !paused;
    body.classList.toggle('paused', paused);
    refreshToolbar();
  }
  function toggleFull() {
    if (desk && desk.winFullscreen) desk.winFullscreen();
    else if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }
  var hudEl = $('hud'), hudOn = false, hudAcc = 0, hudN = 0;
  function toggleHud() { hudOn = !hudOn; hudEl.classList.toggle('on', hudOn); }

  /* ================= ÁUDIO =================
     Ordem de tentativa no app: captura nativa (estéreo) → loopback do sistema
     (mono) → BlackHole por dispositivo. No navegador: entrada padrão. */
  function pickLoopback(inputs) {
    return inputs.find(function (d) { return /blackhole|loopback|soundflower|virtual/i.test(d.label); });
  }
  function startDevice(id, label) {
    setAudioStat('Conectando…', 'warn');
    engine.startInput(id).then(function () {
      setAudioStat('Entrada: ' + (label || 'dispositivo'), 'ok');
    }).catch(function () { setAudioStat('Não deu pra abrir essa entrada', 'bad', 'Confira se o macOS deu permissão de microfone pro app.'); });
  }
  function startComputerAudio() {
    var goBlackhole = function (motivo) {
      engine.startInput(undefined).then(function () { return engine.listInputs(); }).then(function (inputs) {
        var lb = pickLoopback(inputs || []);
        if (lb) return engine.startInput(lb.deviceId).then(function () { setAudioStat('Ouvindo ' + lb.label, 'ok'); });
        if (desk) setAudioStat('Sem captura do sistema', 'bad', (motivo ? motivo + '. ' : '') + 'Autorize a gravação de tela em Ajustes do Sistema › Privacidade e reabra o app.');
        else setAudioStat('Ouvindo a entrada padrão', 'warn', 'No navegador não existe captura do sistema: o app ouve o microfone ou a entrada escolhida.');
      }).catch(function () {
        setAudioStat('Sem permissão de áudio', 'bad', desk ? 'Autorize a gravação de tela e o microfone em Ajustes do Sistema › Privacidade.' : 'O navegador bloqueou o microfone. Use “Testar com o beat demo” ou solte um arquivo de áudio na janela.');
      });
    };
    var goLoopback = function (diag) {
      engine.startSystemLoopback().then(function () {
        setAudioStat('Áudio do computador (mono)', 'ok', diag || 'Estéreo de verdade pede o módulo nativo: veja o README.');
      }).catch(function () { goBlackhole('O loopback do sistema não respondeu'); });
    };
    setAudioStat('Conectando…', 'warn');
    if (desk && desk.nativeStart) {
      engine.startNativeCapture().then(function () {
        setAudioStat('Estéreo nativo', 'ok');
      }).catch(function (err) {
        var msg = String((err && err.message) || err);
        console.warn('[caramujo] captura nativa falhou:', msg);
        if (desk.nativeWhy) {
          Promise.resolve(desk.nativeWhy()).then(function (d) {
            console.warn('[caramujo] diagnóstico nativo:', JSON.stringify(d));
            var det = d && !d.ok ? 'Módulo nativo fora: ' + String(d.reason).slice(0, 90) : (d && d.perm && d.perm.system === false ? 'Falta a permissão de gravação de tela pro estéreo nativo.' : '');
            goLoopback(det);
          }).catch(function () { goLoopback(); });
        } else goLoopback();
      });
    } else if (desk && desk.enableLoopback) goLoopback();
    else goBlackhole();
  }
  function unlockAudio() {
    if (engine.ctx && engine.ctx.state === 'suspended') engine.ctx.resume();
    if (!engine.hasSignal()) startComputerAudio();
  }
  window.addEventListener('click', unlockAudio, { once: true });

  /* SOLTAR UM ARQUIVO DE ÁUDIO NA JANELA: toca e os visuais reagem. */
  function temArquivo(e) {
    var t = e.dataTransfer && e.dataTransfer.types;
    return t && Array.prototype.indexOf.call(t, 'Files') >= 0;
  }
  window.addEventListener('dragover', function (e) { if (temArquivo(e)) { e.preventDefault(); body.classList.add('dropping'); } });
  window.addEventListener('dragleave', function (e) { if (!e.relatedTarget) body.classList.remove('dropping'); });
  window.addEventListener('drop', function (e) {
    body.classList.remove('dropping');
    if (!temArquivo(e)) return;
    e.preventDefault();
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || !/^audio\/|\.(wav|mp3|m4a|aac|flac|ogg|aif|aiff)$/i.test(f.type || f.name)) { toast('Isso não parece um arquivo de áudio'); return; }
    engine.playFile(f).then(function () {
      setAudioStat('Tocando ' + f.name, 'ok', 'Clique em Reconectar pra voltar a ouvir o computador.');
      toast('Tocando ' + f.name);
    }).catch(function () { toast('Não deu pra tocar ' + f.name); });
  });

  /* ================= GRAVAÇÃO POR PAINEL ================= */
  function toggleRec(p) { p.rec ? stopRec(p) : startRec(p); }
  function startRec(p) {
    Promise.resolve(engine.ensureRecordFeed ? engine.ensureRecordFeed() : engine.ensureCtx())
      .then(function () { beginRec(p); }).catch(function () { beginRec(p); });
  }
  /* MP4 com H.264 primeiro: o Final Cut não abre webm. */
  var REC_MIMES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1',
    'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  function pickRecMime() {
    for (var i = 0; i < REC_MIMES.length; i++) {
      try { if (MediaRecorder.isTypeSupported(REC_MIMES[i])) return REC_MIMES[i]; } catch (e) {}
    }
    return 'video/webm';
  }
  var REC_DPR = 2;
  function makeRecPanel(p, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var rp = { id: p.id + '-rec', modId: p.modId, def: p.def, s: p.s, st: {}, canvas: cv,
      w: Math.round(w / REC_DPR), h: Math.round(h / REC_DPR), dpr: REC_DPR, mouse: { x: 0, y: 0, over: false } };
    if (!p.def.webgl) { rp.ctx = cv.getContext('2d'); rp.ctx.setTransform(REC_DPR, 0, 0, REC_DPR, 0, 0); }
    p.def.init(rp);
    return rp;
  }
  function setupRecTarget(p) {
    var px = REC_PX[state.recSize], fixo = !!px, comPos = fxActive();
    if (!fixo && !comPos) { p.recDireto = true; return p.canvas; }
    var sz = px ? [px[0], px[1]] : [p.canvas.width, p.canvas.height];
    p.recSrc = makeRecPanel(p, sz[0], sz[1]);
    if (!comPos) return p.recSrc.canvas;
    var out = document.createElement('canvas');
    out.width = sz[0]; out.height = sz[1];
    p.recOut = out;
    p.recFx = window.FX ? FX.create(out) : null;
    if (!p.recFx) return p.recSrc.canvas;
    p.recRect = [{ key: 'rec', x: 0, y: 0, w: sz[0] / REC_DPR, h: sz[1] / REC_DPR, dose: panelDose(p), bg: panelBg(p),
      meter: p.def.group === 'Estúdio' ? 1 : 0, light: CV.themeBg(CV.themeOf(p)).light ? 1 : 0 }];
    p.recFx.setLayout(p.recRect, sz[0] / REC_DPR, sz[1] / REC_DPR);
    return out;
  }
  function fillBg(p, canvas, ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = CV.bgOf(p);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  function drawRec(p, d, dt, t) {
    if (!p.recSrc) return;
    if (p.recSrc.ctx) { p.recSrc.ctx.lineJoin = 'round'; p.recSrc.ctx.lineCap = 'round'; }
    try { p.def.draw(p.recSrc, d, dt, t); } catch (e) {}
    if (p.recSrc.ctx) fillBg(p, p.recSrc.canvas, p.recSrc.ctx);
    if (!p.recFx) return;
    var vale = !!FX.PRESETS[state.fx.preset];
    p.recFx.upload('rec', p.recSrc.canvas);
    p.recFx.render({ w: p.recOut.width, h: p.recOut.height, cssW: p.recOut.width / REC_DPR, cssH: p.recOut.height / REC_DPR, dpr: REC_DPR,
      preset: vale ? state.fx.preset : 'regua', amount: vale ? state.fx.amount * fxAuto : 0,
      energy: fxE, time: t, rects: p.recRect, center: [0.5, 0.5] });
  }
  function beginRec(p) {
    if (typeof MediaRecorder === 'undefined') { toast('Este navegador não grava vídeo'); return; }
    var capture = setupRecTarget(p);
    var stream = capture.captureStream(60);
    var syncMs = 0;
    if (engine.setRecordDelayMs) syncMs = engine.setRecordDelayMs((engine.latencyMs || 0) + presentMs());
    var at = engine.recordDest && engine.recordDest.stream.getAudioTracks()[0];
    if (at) stream.addTrack(at);
    var mime = pickRecMime(), ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', rec;
    try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 }); }
    catch (e) { rec = new MediaRecorder(stream, { videoBitsPerSecond: 12000000 }); ext = 'webm'; }
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      var blob = new Blob(chunks, { type: mime.split(';')[0] });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'caramujo-vision-' + p.modId + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + ext;
      a.click();
      if (engine.setRecordDelayMs) engine.setRecordDelayMs(0);
    };
    rec.start(1000);
    p.rec = rec; p.recT0 = performance.now();
    p.el.classList.add('recording');
    toast('Gravando ' + (p.def.name) + ' · ' + capture.width + '×' + capture.height + (p.recFx ? ' · com acabamento' : '') +
      (syncMs > 0.5 ? ' · sincronia ' + syncMs.toFixed(0) + ' ms' : ''));
  }
  function stopRec(p) {
    if (p.rec) { try { p.rec.stop(); } catch (e) {} p.rec = null; if (!desk) toast('Vídeo pronto: o navegador vai baixar o arquivo'); }
    if (p.recFx) { p.recFx.dispose(); p.recFx = null; }
    p.recSrc = null; p.recOut = null; p.recRect = null; p.recDireto = false;
    p.el.classList.remove('recording');
  }

  /* ================= PÓS-PRODUÇÃO (js/fx.js) =================
     Desligado por padrão na v2: o medidor não precisa de luz de cinema, e a passada
     custa placa de vídeo o tempo todo. Ligado, funciona igual à v1. */
  var fxCanvas = $('fx');
  var fxi = null;
  try { fxi = (window.FX && fxCanvas && fxCanvas.getContext) ? FX.create(fxCanvas) : null; } catch (e) { fxi = null; }
  var fxDirty = true, fxRects = [], fxE = 0, fxAuto = 1, fxMs = 0, fxMsUp = 0, fxCssW = 0, fxCssH = 0, fxOverload = false;
  function panelDose(p) { return p.s && p.s.fx !== undefined ? p.s.fx : 1; }
  function panelBg(p) {
    var c = hexRgb(CV.bgOf(p) || '#050506');
    return [c[0] / 255, c[1] / 255, c[2] / 255];
  }
  function markFx() { fxDirty = true; }
  function fxActive() { return !!fxi && !fxOverload && state.fx.preset !== 'off' && state.fx.amount > 0 && !window.CV_DRAGGING; }
  function fxDesliga(motivo, err) {
    if (err) console.error('[fx]', motivo, err);
    fxOverload = true;
    body.classList.remove('fx-on');
    toast('Acabamento desligado: ' + motivo, 4000);
  }
  function buildFx() {
    if (!fxi) return;
    fxCssW = window.innerWidth; fxCssH = window.innerHeight;
    fxRects = Object.keys(panels).map(function (id) {
      var p = panels[id], r = p.el.getBoundingClientRect();
      return { key: p.id, x: r.left, y: r.top, w: r.width, h: r.height, dose: panelDose(p), bg: panelBg(p),
        meter: p.def.group === 'Estúdio' ? 1 : 0, light: CV.themeBg(CV.themeOf(p)).light ? 1 : 0 };
    }).filter(function (r) { return r.w > 2 && r.h > 2; });
    fxi.setLayout(fxRects, fxCssW, fxCssH);
    fxDirty = false;
  }
  function fxUpload() {
    if (!fxActive()) return;
    var t0 = performance.now();
    try {
      for (var id in panels) {
        var p = panels[id];
        if (!p.drew) continue;
        p.drew = false;
        fxi.upload(p.id, p.canvas);
      }
    } catch (e) { fxDesliga('a placa recusou o desenho', e); return; }
    fxMsUp += (performance.now() - t0 - fxMsUp) * 0.1;
  }
  function fxUploadJa(p) {
    if (!fxActive()) return;
    p.drew = false;
    try { fxi.upload(p.id, p.canvas); } catch (e) { fxDesliga('a placa recusou o desenho', e); }
  }
  function fxRender(t) {
    var on = fxActive();
    body.classList.toggle('fx-on', on);
    if (!on) return;
    var dpr = window.devicePixelRatio || 1;
    var W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    if (fxCanvas.width !== W || fxCanvas.height !== H) { fxCanvas.width = W; fxCanvas.height = H; fxDirty = true; }
    if (fxDirty) buildFx();
    var t0 = performance.now();
    try {
      fxi.render({ w: W, h: H, cssW: fxCssW, cssH: fxCssH, dpr: dpr, preset: state.fx.preset, amount: state.fx.amount * fxAuto,
        energy: fxE, time: t, rects: fxRects, center: [0.5, 0.5] });
    } catch (e) { fxDesliga('a placa recusou a passada', e); return; }
    fxMs += (performance.now() - t0 - fxMs) * 0.1;
  }

  /* ================= TECLADO ================= */
  window.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    var digitando = /INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range';
    if (e.key === 'Escape') {
      if (!$('ask').classList.contains('hidden')) { askClose(false); return; }
      if (menuOpen) { closeMenu(); return; }
      if (setOpen) { closeSettings(); return; }
      if (state.toolbar !== 'fixo') hideToolbar(true);
      if (e.target && e.target.blur) e.target.blur();
      return;
    }
    if (digitando || e.altKey || e.ctrlKey) return;
    if (e.metaKey) {
      if (e.key === ',') { e.preventDefault(); setOpen ? closeSettings() : openSettings(); }
      return;
    }
    var k = e.key.toLowerCase();
    if (k === 's') { setOpen ? closeSettings() : openSettings(); }
    else if (k === 'p') togglePause();
    else if (k === 't') cycleTheme(e.shiftKey ? -1 : 1);
    else if (k === 'h') setToolbarMode(state.toolbar === 'fixo' ? 'auto' : 'fixo');
    else if (k === 'f') toggleHud();
  });

  /* ================= JANELA (app de computador) ================= */
  if (desk && desk.onBounds) {
    desk.onBounds(function (b) {
      if (!b || !b.width || applyingPos || setOpen || setGrew) return;
      var mode = layoutMode();
      if (POS[state.pos].dock === 'off') state.win = b;
      else if (mode === 'row' && b.height >= 60 && b.height <= 600) state.barH = b.height;
      else if (mode === 'col' && b.width >= 140 && b.width <= 900) state.colW = b.width;
      save();
    });
  }
  if (desk && desk.onDownload) {
    desk.onDownload(function (d) {
      if (d && d.ok) { toast('Vídeo salvo em Downloads: ' + d.name, 4200); ultimoVideo = d.path; }
      else toast('Não deu pra salvar o vídeo', 4000);
    });
  }
  var ultimoVideo = null;
  window.addEventListener('beforeunload', saveNow);

  /* ================= PARTIDA ================= */
  paintIcons();
  applyThemeChrome();
  checkNarrow();
  renderLayout();
  (function restoreSession() {
    if (!desk) return;
    var def = POS[state.pos];
    applyingPos = true;
    var p0 = def.dock !== 'off'
      ? Promise.resolve(desk.winStick(def.dock, def.mode === 'row' ? state.barH : state.colW))
      : Promise.resolve(state.win && state.win.width > 60 ? desk.winSetBounds(state.win) : null);
    p0.catch(function () {}).then(function () { setTimeout(function () { applyingPos = false; }, 600); });
    if (state.pinned && desk.winPin) desk.winPin(true);
  })();
  refreshToolbar();
  if (state.firstRun) {
    state.firstRun = false;
    setTimeout(function () { showToolbar(); toast('Passe o mouse pela janela pra ver o menu. S abre os ajustes.', 6000); }, 900);
  }
  save();
  startComputerAudio();

  /* ================= LAÇO PRINCIPAL ================= */
  /* QUALIDADE ADAPTATIVA: mediana dos últimos 45 quadros. Quem cede primeiro é o
     acabamento (desliga), depois a resolução da arte, e só então a arte pula quadro.
     O medidor nunca entra na conta. */
  window.CV_QUALITY = 1;
  var ART_SKIP = 1;
  var ftimes = new Float32Array(45), fti = 0, ftn = 0, qCool = 0, sortBuf = new Float32Array(45);
  function medianFrame() {
    var n = ftn < 45 ? ftn : 45;
    if (n < 12) return 0.0166;
    for (var i = 0; i < n; i++) sortBuf[i] = ftimes[i];
    var a = sortBuf.subarray(0, n);
    a.sort();
    return a[n >> 1];
  }
  /* entre desenhar e o pixel acender existe a fila de composição do macOS: 2 quadros
     de tela, mais 1 com o acabamento ligado (ele mostra o quadro anterior) */
  var PRESENT_FRAMES = 2;
  function presentMs() { return medianFrame() * 1000 * (PRESENT_FRAMES + (fxActive() ? 1 : 0)); }
  function watchPerf(dt) {
    ftimes[fti] = dt; fti = (fti + 1) % 45; ftn++;
    qCool -= dt;
    if (qCool > 0 || ftn % 20 !== 0) return;
    var med = medianFrame(), alvo = state.fps ? 1 / state.fps : 1 / 60;
    if (med > alvo * 1.3 && med > 0.0215) {
      if (fxActive()) { fxDesliga('não coube nesta máquina'); qCool = 3; }
      else if (window.CV_QUALITY > 0.6) { window.CV_QUALITY = Math.max(0.6, window.CV_QUALITY - 0.2); resizeAll(true); qCool = 2; }
      else if (ART_SKIP < 2) { ART_SKIP = 2; qCool = 1.5; }
    } else if (med < alvo * 0.85) {
      if (ART_SKIP > 1) { ART_SKIP = 1; qCool = 2.5; }
      else if (window.CV_QUALITY < 1) { window.CV_QUALITY = Math.min(1, window.CV_QUALITY + 0.2); resizeAll(true); qCool = 2.5; }
    }
  }
  function drawHud(dt) {
    hudAcc += dt; hudN++;
    if (hudAcc < 0.25) return;
    var fps = hudN / hudAcc;
    hudAcc = 0; hudN = 0;
    var ana = engine.latencyMs || 0, tela = presentMs();
    var via = engine.nativeOn ? 'nativo' : (engine.sab ? 'direto' : (engine.tapNode ? 'tap' : (engine.analyser ? 'reserva' : 'sem som')));
    var n = Object.keys(panels).length;
    hudEl.textContent = fps.toFixed(0) + ' fps · ' + n + ' visuais' + (state.fps ? ' · limite ' + state.fps : '') +
      '\nsom → olho ' + (ana + tela).toFixed(0) + ' ms (análise ' + ana.toFixed(1) + ' + tela ' + tela.toFixed(0) + ')' +
      '\nbloco ' + (engine.chunkMs || 0).toFixed(1) + ' ms · ' + via +
      '\nacabamento ' + (fxActive() ? state.fx.preset + ' ' + (fxMs + fxMsUp).toFixed(2) + ' ms' : 'off') +
      (ART_SKIP > 1 ? ' · arte 1/2' : '') + (window.CV_QUALITY < 1 ? ' · arte ' + Math.round(window.CV_QUALITY * 100) + '%' : '');
  }

  /* aviso do meio da tela: sem áudio nenhum (com botão) ou silêncio longo (discreto) */
  var emptyEl = $('empty'), emptyMsg = $('emptymsg'), semSinal = 0, emptyKind = '';
  function setEmpty(kind) {
    if (kind === emptyKind) return;
    emptyKind = kind;
    emptyEl.className = kind ? (kind === 'erro' ? 'erro' : 'quieto') : 'hidden';
    if (kind === 'erro') emptyMsg.textContent = audioStat.nivel === 'bad' ? audioStat.txt : 'Sem áudio chegando';
    if (kind === 'quieto') emptyMsg.textContent = 'Aguardando som';
  }
  $('emptybtn').addEventListener('click', function () { openSettings('audio'); });

  var FRAME_MIN = 1 / 144;
  var last = performance.now(), frameN = 0, silTime = 0, uiAcc = 0, dormindo = false;
  function loop(now) {
    requestAnimationFrame(loop);
    var raw = (now - last) / 1000;
    var minDt = state.fps ? 0.92 / state.fps : FRAME_MIN;
    if (raw < minDt) return;
    var dt = Math.min(0.05, raw);
    last = now;
    if (paused) return;
    frameN++;
    watchPerf(dt);
    var t = now / 1000;
    var d = null;
    if (engine.hasSignal()) { engine.update(dt); d = engine; }
    var tgE = d ? Math.min(1, d.level * 5 + d.bass * 0.8) : 0;
    fxE += (tgE - fxE) * Math.min(1, dt * (tgE > fxE ? 12 : 2.5));
    /* SILÊNCIO LIMPA A TELA (o "Fade Out Modules During Silence" do MiniMeters):
       0,5s de espera e 2,2s pra sumir, sem o módulo precisar saber. */
    var quieto = !d || ((d.rms || 0) < 0.0009 && (d.level || 0) < 0.004);
    silTime = quieto ? silTime + dt : 0;
    semSinal = d ? 0 : semSinal + dt;
    var silFade = silTime < 0.5 ? 1 : Math.max(0, 1 - (silTime - 0.5) / 2.2);
    /* DORMIR NO SILÊNCIO. Depois que o fade apaga tudo, desenhar painel vazio 120
       vezes por segundo é trabalho jogado fora, e é o caso mais comum: o FL Studio
       parado com o app aberto do lado. Limpa uma vez e para de desenhar até o som
       voltar. O motor de áudio continua rodando pra acordar no primeiro kick. */
    var gravando = false;
    for (var gid in panels) if (panels[gid].rec) { gravando = true; break; }
    if (silFade <= 0 && !gravando) {
      if (!dormindo) {
        dormindo = true;
        for (var cid in panels) {
          var cp = panels[cid];
          if (cp.ctx) { cp.ctx.save(); cp.ctx.setTransform(1, 0, 0, 1, 0, 0); cp.ctx.clearRect(0, 0, cp.canvas.width, cp.canvas.height); cp.ctx.restore(); }
          cp.drew = true;
        }
        fxUpload(); fxRender(t);
      }
      uiTick(dt);
      if (hudOn) drawHud(dt);
      return;
    }
    dormindo = false;
    fxUpload();
    var artDt = dt * ART_SKIP, drawArt = (ART_SKIP === 1) || (frameN % ART_SKIP === 0);
    for (var id in panels) {
      var p = panels[id];
      if (p.w < 4) continue;
      var isArt = p.def.group !== 'Estúdio';
      if (p.rec) drawRec(p, d, dt, t);
      if (isArt && !drawArt) continue;
      if (p.ctx) { p.ctx.lineJoin = 'round'; p.ctx.lineCap = 'round'; }
      try { p.def.draw(p, d, isArt ? artDt : dt, t); } catch (e) { if (!p.erro) { p.erro = 1; console.error('[caramujo] ' + p.modId, e); } }
      // o fundo vem do CSS do painel; só o vídeo gravado direto precisa dele pintado
      if (p.recDireto && p.ctx) fillBg(p, p.canvas, p.ctx);
      if (silFade < 1 && p.ctx) {
        p.ctx.save();
        p.ctx.setTransform(1, 0, 0, 1, 0, 0);
        p.ctx.globalCompositeOperation = 'destination-out';
        p.ctx.fillStyle = 'rgba(0,0,0,' + (1 - silFade).toFixed(3) + ')';
        p.ctx.fillRect(0, 0, p.canvas.width, p.canvas.height);
        p.ctx.restore();
      }
      p.drew = true;
      if (p.def.webgl) fxUploadJa(p);
    }
    if (frameN % 30 === 0) markFx();
    fxRender(t);
    uiTick(dt);
    if (hudOn) drawHud(dt);
  }
  function uiTick(dt) {
    uiAcc += dt;
    if (uiAcc < 0.25) return;
    uiAcc = 0;
    setEmpty(semSinal > 2.5 ? 'erro' : (silTime > 6 ? 'quieto' : ''));
    for (var rid in panels) {
      var rp = panels[rid];
      if (rp.rec) {
        var sec = Math.floor((performance.now() - rp.recT0) / 1000);
        rp.recTag.textContent = 'REC ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
      }
    }
  }
  requestAnimationFrame(loop);

  /* ponte pros testes e pro console */
  window.CVAPP = {
    state: state, panels: panels, presets: PRESETS, themes: THEMES, positions: POSITIONS,
    applyPreset: applyPreset, addModule: addModule, removeCell: removeCell, replaceCell: replaceCell, moveCell: moveCell,
    setTheme: setTheme, applyPosition: applyPosition, openSettings: openSettings, closeSettings: closeSettings,
    renderLayout: renderLayout, savePresetAs: savePresetAs, deletePreset: deletePreset, userPresets: userPresets,
    togglePause: togglePause, rowsFromV1: rowsFromV1, migrateV1: migrateV1, normalize: normalize, freshState: freshState,
    saveNow: saveNow, viewRows: function () { return viewRows; }, layoutMode: layoutMode, startComputerAudio: startComputerAudio,
    fxActive: fxActive, presentMs: presentMs, toast: toast
  };
})();
