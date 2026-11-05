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
    // ---- ESCUROS ----
    preto:    [[0, 0, 100], [0, 0, 74], [0, 0, 50], [0, 0, 88]],           // branco puro, sem cor
    // fósforo: UMA cor, quatro luzes. É assim que tubo de osciloscópio se comporta.
    fosforo:  [[138, 88, 62], [136, 70, 40], [144, 100, 82], [128, 60, 26]],
    // planta: creme e branco de nanquim sobre o azul; a cor mora no fundo, não no traço
    planta:   [[42, 34, 92], [30, 18, 78], [0, 0, 100], [50, 46, 66]],
    /* minimeters: uma cor por módulo, na ordem que os nossos leem a paleta.
       0 = curva esquerda do espectro (vermelho), 1 = osciloscópio (verde),
       2 = curva direita (azul), 3 = estéreo (laranja). */
    minimeters: [[352, 78, 58], [122, 45, 58], [212, 72, 60], [28, 88, 58]],
    // ---- MÉDIOS ----
    ardosia:  [[44, 68, 78], [12, 74, 64], [172, 34, 74], [30, 62, 72]],
    // carvão: branco quente sobre grafite, variação só de luz
    carvao:   [[36, 16, 98], [0, 0, 80], [28, 22, 62], [42, 12, 90]],
    // ---- MÉDIOS DE MEIO-TOM ----
    chumbo:   [[0, 0, 96], [202, 34, 86], [38, 42, 80], [0, 0, 72]],
    // ---- CLAROS: traço ESCURO, senão some no fundo ----
    tijolo:   [[16, 72, 22], [352, 56, 26], [32, 62, 18], [0, 0, 14]],
    musgo:    [[92, 58, 18], [64, 52, 24], [148, 42, 20], [30, 50, 16]],
    areia:    [[16, 92, 26], [0, 78, 32], [32, 100, 22], [350, 62, 20]],
    // jornal: tinta sépia gasta, faixa curta de luz (impressão barata não tem contraste)
    jornal:   [[26, 62, 16], [16, 45, 28], [38, 52, 22], [8, 40, 12]],
    gelo:     [[214, 100, 22], [196, 100, 30], [246, 62, 40], [178, 96, 18]],
    papel:    [[0, 0, 8], [0, 0, 26], [0, 0, 42], [0, 0, 16]]
  };



  /* ================= COLOR MAPS =================
     A ideia que o MiniMeters separa e a gente tinha juntado: TEMA é o cromo (fundo,
     texto, cor da linha) e COLOR MAP é um gradiente contínuo que cada módulo aplica na
     SUA própria grandeza. O espectro pinta por magnitude, o espectrograma por energia,
     a onda por banda, o estéreo por canal. Mesmo mapa, resultado diferente em cada
     painel: é isso que tira a monotonia de todos os módulos saírem da mesma cor.
     Pontos de controle em RGB 0-255, interpolados. */
  var CMAPS = {
    viridis:   [[68,1,84],[72,40,120],[62,74,137],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[109,205,89],[180,222,44],[253,231,37]],
    magma:     [[0,0,4],[28,16,68],[79,18,123],[129,37,129],[181,54,122],[229,80,100],[251,135,97],[254,194,135],[252,253,191]],
    inferno:   [[0,0,4],[31,12,72],[85,15,109],[136,34,106],[186,54,85],[227,89,51],[249,142,9],[252,200,45],[252,255,164]],
    plasma:    [[13,8,135],[75,3,161],[125,3,168],[168,34,150],[203,70,121],[229,107,93],[248,148,65],[253,195,40],[240,249,33]],
    rocket:    [[3,5,26],[47,15,61],[95,20,80],[145,26,80],[194,45,60],[228,88,53],[240,138,90],[247,187,145],[250,235,221]],
    mako:      [[11,4,10],[35,23,55],[46,52,98],[45,86,124],[42,120,137],[47,155,141],[80,188,131],[147,215,131],[222,238,180]],
    crest:     [[164,220,141],[121,204,143],[81,186,150],[52,165,156],[42,141,158],[45,116,152],[47,91,140],[42,68,124]],
    flare:     [[237,206,138],[240,169,110],[238,133,97],[228,99,101],[209,70,114],[178,53,124],[143,45,124],[109,42,113]],
    cubehelix: [[0,0,0],[27,25,66],[26,66,86],[36,105,79],[80,130,64],[150,140,74],[210,148,126],[236,175,192],[240,215,232],[255,255,255]],
    turbo:     [[48,18,59],[62,73,196],[42,142,240],[26,196,192],[93,229,116],[176,238,55],[240,199,36],[254,132,25],[224,60,10],[122,4,3]],
    fogo:      [[0,0,0],[60,0,0],[130,10,0],[200,50,0],[240,120,10],[255,190,60],[255,245,190]],
    gelo:      [[2,4,20],[10,30,70],[16,64,124],[30,110,170],[70,160,205],[140,205,230],[220,245,255]],
    cinza:     [[0,0,0],[64,64,64],[128,128,128],[192,192,192],[255,255,255]],
    rua:       [[6,4,4],[52,10,8],[112,20,12],[178,44,14],[226,96,20],[246,160,44],[255,214,120]]
  };
  CV.CMAP_LIST = [
    ['auto', 'Do tema'], ['viridis', 'Viridis'], ['magma', 'Magma'], ['inferno', 'Inferno'],
    ['plasma', 'Plasma'], ['rocket', 'Rocket'], ['mako', 'Mako'], ['crest', 'Crest'],
    ['flare', 'Flare'], ['cubehelix', 'Cubehelix'], ['turbo', 'Turbo'], ['fogo', 'Fogo'],
    ['gelo', 'Gelo'], ['cinza', 'Cinza'], ['rua', 'Rua']
  ];
  // cada tema tem o mapa que combina com ele; 'auto' usa este
  var THEME_CMAP = {
    preto: 'cinza', fosforo: 'crest', minimeters: 'flare', planta: 'gelo', ardosia: 'flare',
    carvao: 'cinza', chumbo: 'gelo', tijolo: 'fogo', musgo: 'crest',
    areia: 'fogo', jornal: 'rocket', gelo: 'gelo', papel: 'cinza'
  };
  CV.cmap0 = 'auto';   // escolha global (menu Color Map)
  var _cmCache = new Map();
  /* devolve a cor do mapa na posição v (0..1). Retorna string CSS pronta, com cache:
     um espectro de 800 barras chamaria isto 800 vezes por quadro. */
  /* UM MAPA DE COR POR MÓDULO, quando o tema pede.
     Um mapa só pro tema inteiro não dá conta de copiar o MiniMeters: lá o loudness
     é azul, o osciloscópio verde, o estéreo amarelo e o espectro vermelho, tudo ao
     mesmo tempo. THEME_MOD_CMAP resolve isso sem tirar de você a escolha por
     painel, que continua tendo a última palavra. */
  var THEME_MOD_CMAP = {
    minimeters: {
      spectrum: 'rocket', wavescroll: 'rocket', loudness: 'gelo',
      gonio: 'viridis', scope: 'crest', spectrogram: 'magma'
    }
  };
  CV.cmapName = function (m) {
    var own = m && m.s && m.s.cmap;
    if (own && own !== 'auto') return own;
    if (CV.cmap0 && CV.cmap0 !== 'auto') return CV.cmap0;
    var th = CV.themeOf(m);
    var porMod = THEME_MOD_CMAP[th];
    if (porMod && m && m.modId && porMod[m.modId]) return porMod[m.modId];
    return THEME_CMAP[th] || 'cinza';
  };
  CV.cmapRgb = function (name, v) {
    var pts = CMAPS[name] || CMAPS.cinza;
    if (v < 0) v = 0; else if (v > 1) v = 1;
    var x = v * (pts.length - 1), i = x | 0;
    if (i > pts.length - 2) i = pts.length - 2;
    var f = x - i, a = pts[i], b = pts[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  CV.cmap = function (m, v, alpha) {
    var name = CV.cmapName(m);
    /* FUNDO CLARO INVERTE O MAPA. Os mapas vão do escuro pro claro, então no papel o
       sinal forte saía quase branco em cima de branco (o osciloscópio sumia no tema
       PAPEL). Com o mapa do tema, no fundo claro o forte vira escuro. Mapa escolhido
       a dedo no painel continua do jeito que veio. */
    if (!(m && m.s && m.s.cmap && m.s.cmap !== 'auto') && CV.isLight(m)) v = 1 - v * 0.92;
    var q = (v * 127) | 0; if (q < 0) q = 0; else if (q > 127) q = 127;
    var qa = alpha === undefined ? 32 : (alpha * 32) | 0;
    if (qa < 0) qa = 0; else if (qa > 32) qa = 32;
    var key = name + (q + qa * 128);
    var s = _cmCache.get(key);
    if (s !== undefined) return s;
    var c = CV.cmapRgb(name, q / 127);
    s = qa >= 32
      ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
      : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (qa / 32) + ')';
    if (_cmCache.size > 12000) _cmCache.clear();
    _cmCache.set(key, s);
    return s;
  };

  /* fundo por tema: contraste e temperatura mudam junto com a paleta.
     bg = fundo do painel, ink = quanto a cor "pega" na tela (grade, textos). */
  /* ================= TEMAS: NOVE LUGARES DIFERENTES =================
     A leva anterior tinha oito temas escuros que eram o mesmo tema com outra
     matiz (neon, vhs, âmbar, poente, psy, rubi, floresta, oceano). Trocar entre
     eles não mudava nada além da cor do traço. Saíram todos.
     Cada tema que ficou muda CINCO coisas, e nenhuma delas é só a matiz:
       1. a luz do fundo, numa escada larga: 0 · 5 · 29 · 65 · 90 · 199 · 211 · 228 · 231
       2. a força da grade, de invisível (0,06) a papel milimetrado (0,45)
       3. a ESPESSURA do traço (lw), que muda a personalidade do desenho inteiro
       4. a paleta, e quanta variação de luz existe dentro dela
       5. o mapa de cor padrão
     Fósforo tem traço gordo e brilho de tubo. Planta é o único onde a grade é a
     estrela e o traço é fio. Papel quase não tem grade; gelo é papel milimetrado.
     Trocar de tema tem que dar a sensação de trocar de aparelho. */
  var THEME_BG = {
    // --- escuros ---
    // preto absoluto e traço gordo de tubo de osciloscópio: o verde é consequência, não o assunto
    fosforo:  { bg: '#000000', panel: '#010401', grid: 0.22, text: '#4fbf6a', ink: '#c6ffd6', lw: 1.45,
      cor: { spectrum: ['#5dff8f', '#2f9e55', '#0b3a1a'], loudness: ['#5dff8f', '#0c2414'], scope: ['#7dffa6', '#1f6b3a'], gonio: ['#2fbf5f', '#c6ffd6'], wavescroll: ['#4fe880'], vu: ['#9dffb8', '#ff5a4a'] } },
    // o padrão limpo: quase preto, grade que some, fio de 1px sozinho na tela
    preto:    { bg: '#050506', panel: '#08080a', grid: 0.06, text: '#8b8b91', ink: '#f0efe9', lw: 1,
      cor: { spectrum: ['#f0efe9', '#8d8d93', '#2a2a2e'], loudness: ['#f0efe9', '#1c1c20'], scope: ['#f0efe9', '#4a4a50'], gonio: ['#8a8a92', '#ffffff'], wavescroll: ['#e8e8e4'], vu: ['#f0efe9', '#ff5a6a'] } },
    /* MINIMETERS: réplica do print, pra comparar os dois lado a lado. Fundo quase
       preto neutro e uma cor por módulo (vermelho e azul no espectro, verde no
       osciloscópio, laranja no estéreo), que é como o dele se distribui. */
    /* cores medidas pixel a pixel num quadro do vídeo dele, não estimadas:
       fundo #191919, onda #fd5648, loudness #4da9fc, osciloscópio #52945d sobre
       #3e6944, estéreo #e5003a com creme #d4ab8d, espectro #fc4c69 e #3a93fb. */
    minimeters: {
      bg: '#191919', panel: '#191919', grid: 0.22, text: '#9a9a9a', ink: '#e8e8e8', lw: 1,
      cor: {
        spectrum: ['#fc4c69', '#3a93fb', '#4a0a1c'],
        loudness: ['#4da9fc', '#1e2529'],
        scope: ['#6fb87b', '#3e6944'],
        gonio: ['#e5003a', '#f0e0cc'],
        wavescroll: ['#fd5648'],
        vu: ['#e8e8e8', '#fc4c69']
      }
    },
    // planta de arquiteto: aqui a GRADE é o desenho e o traço é fio fino por cima
    planta:   { bg: '#0e2038', panel: '#132a4c', grid: 0.5, text: '#93b4d8', ink: '#f4ecda', lw: 0.75,
      cor: { spectrum: ['#f4ecda', '#9cc3ff', '#1d3c66'], loudness: ['#f4ecda', '#1c375e'], scope: ['#f4ecda', '#4f73a3'], gonio: ['#9cc3ff', '#f4ecda'], wavescroll: ['#e9e1cc'], vu: ['#f4ecda', '#ff7a6a'] } },
    // --- médios ---
    // ardósia: cinza-azulado com creme quente, grade média
    ardosia:  { bg: '#374545', panel: '#3e4e4e', grid: 0.2, text: '#c2ccc8', ink: '#f6ecc9', lw: 1,
      cor: { spectrum: ['#f6ecc9', '#9fd3c7', '#2c3a3a'], loudness: ['#f6ecc9', '#334242'], scope: ['#f6ecc9', '#6f8c85'], gonio: ['#e6b07a', '#f6ecc9'], wavescroll: ['#f0dfb0'], vu: ['#f6ecc9', '#ff8a6a'] } },
    // carvão: chapa de grafite CLARA o bastante pra não ser "mais um fundo escuro".
    // Fundo cinza neutro alto, grade fraca, traço branco quente e grosso.
    carvao:   { bg: '#5b5d60', panel: '#65676a', grid: 0.14, text: '#e2e4e8', ink: '#ffffff', lw: 1.25 },
    // --- MÉDIOS DE VERDADE: a faixa entre 93 e 199 estava vazia ---
    // chumbo: cinza-azulado de meio-tom, ainda com traço claro
    chumbo:   { bg: '#6f7480', panel: '#787d8a', grid: 0.24, text: '#e6ebf2', ink: '#ffffff', lw: 1,
      cor: { spectrum: ['#ffffff', '#c4e2ff', '#5f6470'], loudness: ['#ffffff', '#666b77'], scope: ['#ffffff', '#9aa4b6'], gonio: ['#cfe6ff', '#ffffff'], wavescroll: ['#f4f7fb'], vu: ['#ffffff', '#ff6b6b'] } },
    // tijolo: barro claro, traço escuro. O primeiro que inverte, e já bem levantado
    tijolo:   { bg: '#b08268', panel: '#bd9077', grid: 0.18, text: '#4a2c1c', ink: '#2a1409', light: 1, lw: 1.2,
      cor: { spectrum: ['#3a1606', '#7a2e12', '#a5735a'], loudness: ['#3a1606', '#a87a62'], scope: ['#2a1409', '#8a4a2c'], gonio: ['#7a2e12', '#2a1409'], wavescroll: ['#3a1606'], vu: ['#2a1409', '#a4161a'] } },
    // musgo: verde-oliva desbotado com grade forte, quase um papel de horta
    musgo:    { bg: '#b9bd9a', panel: '#c6c9a9', grid: 0.34, text: '#4b512f', ink: '#20240f', light: 1, lw: 0.95 },
    // --- claros, cada um com uma grade de personalidade diferente ---
    // areia: bege médio, o mais escuro dos claros, grade fraca
    areia:    { bg: '#d6c5a8', panel: '#e4d7c0', grid: 0.22, text: '#6b5a44', ink: '#241a10', light: 1, lw: 1.15,
      cor: { spectrum: ['#2a1c10', '#a4521f', '#c9b693'], loudness: ['#3a2a18', '#d3c3a5'], scope: ['#241a10', '#a68c66'], gonio: ['#a4521f', '#241a10'], wavescroll: ['#3a2a18'], vu: ['#241a10', '#b3261e'] } },
    // jornal: papel amarelado meio sujo, tinta sépia escura, traço encorpado
    jornal:   { bg: '#ded3b8', panel: '#e9e0c9', grid: 0.3, text: '#6b6045', ink: '#1a1408', light: 1, lw: 1.3 },
    // gelo: papel MILIMETRADO frio, a grade mais forte de todas
    gelo:     { bg: '#dbe7ee', panel: '#eef5f9', grid: 0.45, text: '#4a6270', ink: '#0d2733', light: 1, lw: 1,
      cor: { spectrum: ['#0d2733', '#2f7fc1', '#c9dce8'], loudness: ['#0d4a66', '#d4e3ec'], scope: ['#0d2733', '#7aa6c2'], gonio: ['#2f7fc1', '#0d2733'], wavescroll: ['#123a4d'], vu: ['#0d2733', '#c62828'] } },
    // papel: folha limpa, quase sem grade, fio fino: o desenho flutua
    papel:    { bg: '#e9e7e0', panel: '#f4f2ec', grid: 0.14, text: '#55554e', ink: '#121210', light: 1, lw: 0.9,
      cor: { spectrum: ['#121210', '#7a7a74', '#d8d5cc'], loudness: ['#121210', '#dedbd2'], scope: ['#121210', '#9a978e'], gonio: ['#55554e', '#121210'], wavescroll: ['#1e1e1b'], vu: ['#121210', '#c62828'] } }
  };
  /* AMOSTRA DO TEMA pro cartão da tela de ajustes: fundo, tinta e as cores que os
     visuais vão usar. Sai do mesmo lugar que os módulos leem, então o cartão nunca
     mente sobre o que o tema faz. */
  CV.themePreview = function (th) {
    var b = THEME_BG[th] || THEME_BG.preto;
    var cores = [];
    if (b.cor) {
      ['spectrum', 'scope', 'loudness', 'gonio'].forEach(function (k) { if (b.cor[k]) cores.push(b.cor[k][0]); });
    } else {
      (PALETTES[th] || PALETTES.preto).slice(0, 3).forEach(function (c) {
        cores.push('hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)');
      });
    }
    return { bg: b.bg, panel: b.panel, ink: b.ink, text: b.text, light: !!b.light, grid: b.grid, cores: cores };
  };

  /* tema que saiu vira o mais próximo, sem apagar nada do que ele salvou */
  var THEME_MIGRA = {
    mono: 'preto', vapor: 'preto', psy: 'fosforo', neon: 'fosforo',
    vhs: 'jornal', ambar: 'jornal', poente: 'areia',
    oceano: 'planta', rubi: 'carvao', floresta: 'carvao', lavanda: 'papel'
  };
  CV.themeMigra = function (th) { return THEME_MIGRA[th] || (THEME_BG[th] ? th : 'preto'); };


  /* ajuste fino do fundo (CV.bgAdj, mexido pelo botão ◐ do menu):
     claridade, saturação, matiz e contraste aplicados por cima do tema escolhido. */
  CV.bgAdj = { l: 0, s: 0, h: 0, c: 0 };
  function hexToRgb(x) { return [parseInt(x.substr(1, 2), 16), parseInt(x.substr(3, 2), 16), parseInt(x.substr(5, 2), 16)]; }
  function rgbToHex(r, g, b) {
    function c2(v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + c2(r) + c2(g) + c2(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, h = 0;
    if (mx !== mn) {
      var dd = mx - mn;
      s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      if (mx === r) h = (g - b) / dd + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / dd + 2;
      else h = (r - g) / dd + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), mm = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return [(r + mm) * 255, (g + mm) * 255, (b + mm) * 255];
  }
  CV.adjHex = function (hex, extraL) {
    var a = CV.bgAdj;
    if (!a.l && !a.s && !a.h && !a.c && !extraL) return hex;
    var rgb = hexToRgb(hex), hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    var L = hsl[2] + a.l + (extraL || 0);
    // contraste afasta o fundo do cinza médio (ou aproxima, se negativo)
    L = 50 + (L - 50) * (1 + a.c / 100);
    var out = hslToRgb(hsl[0] + a.h, Math.max(0, Math.min(100, hsl[1] + a.s)), Math.max(0, Math.min(100, L)));
    return rgbToHex(out[0], out[1], out[2]);
  };
  CV.themeBg = function (th) {
    var b = THEME_BG[th] || THEME_BG.preto;
    var a = CV.bgAdj;
    if (!a.l && !a.s && !a.h && !a.c) return b;
    var o = {}; for (var k in b) o[k] = b[k];
    o.bg = CV.adjHex(b.bg); o.panel = CV.adjHex(b.panel);
    // se o fundo clareou muito, o módulo passa a se comportar como tema claro
    var rgb = hexToRgb(o.bg), lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    o.light = lum > 128 ? 1 : 0;
    return o;
  };
  // fundo do painel do módulo (respeita tema próprio do módulo)
  CV.bgOf = function (m) { return CV.themeBg(CV.themeOf(m)).panel; };
  // tema efetivo do módulo: o dele (m.s.theme) se escolhido, senão o global. Permite mesclar temas.
  CV.themeOf = function (m) {
    return (m && m.s && m.s.theme && m.s.theme !== 'global') ? m.s.theme : (CV.theme || 'preto');
  };
  CV.pal = function (m, idx, t) {
    /* mapa de cor escolhido no módulo vira a paleta dele: 4 amostras espalhadas.
       É o que deixa dois módulos com o mesmo tema saírem de cores diferentes. */
    var cm = m && m.s && m.s.cmap;
    if (cm && cm !== 'auto') {
      var rgbp = CV.cmapRgb(cm, ((idx % 4) + 0.5) / 4);
      var hsl = rgbToHsl(rgbp[0], rgbp[1], rgbp[2]);
      return [hsl[0], Math.min(100, hsl[1] * 1.05), Math.max(28, Math.min(88, hsl[2]))];
    }
    if (m.s.colorMode === 'custom') return [(m.s.hue + idx * 32) % 360, 92, 60];
    var th = CV.themeOf(m);
    if (th === 'fosforo') return [(136 + idx * 5) % 360, 84, 34 + ((idx * 19) % 52)];
    var p = PALETTES[th] || PALETTES.preto;
    return p[((idx % p.length) + p.length) % p.length];
  };
  /* CV.hsla com CACHE. Era o 3º gargalo do app: Campo de fluxo montava 520 frases de
     cor por quadro (31 mil por segundo) só pra jogar fora. Agora a cor é arredondada
     (0,5° de matiz, 1% de sat/luz, 1/128 de opacidade) e a MESMA string é reaproveitada.
     Dobra o ganho: some a montagem da frase E o navegador não re-interpreta a cor,
     porque reconhece a string por identidade. */
  var _hslaCache = new Map();
  CV.hsla = function (c, a) {
    if (a === undefined) a = 1;
    var h = c[0], s = c[1], l = c[2];
    if (h < 0 || h >= 360) h = ((h % 360) + 360) % 360;
    if (s < 0) s = 0; else if (s > 100) s = 100;
    if (l < 0) l = 0; else if (l > 100) l = 100;
    if (a < 0) a = 0; else if (a > 1) a = 1;
    var qh = (h * 2) | 0, qs = (s + 0.5) | 0, ql = (l + 0.5) | 0, qa = (a * 128) | 0;
    var key = qh + qs * 720 + ql * 72720 + qa * 7344720;
    var v = _hslaCache.get(key);
    if (v !== undefined) return v;
    v = 'hsla(' + (qh * 0.5) + ',' + qs + '%,' + ql + '%,' + (qa / 128) + ')';
    if (_hslaCache.size > 24000) _hslaCache.clear();
    _hslaCache.set(key, v);
    return v;
  };
  /* tabela de opacidades pronta pra um lote de partículas: em vez de uma frase por
     ponto, o módulo pinta em N faixas de opacidade e troca de cor N vezes por quadro. */
  CV.alphaSteps = function (m, key, col, steps, maxA) {
    var st = m.st, cache = st._as || (st._as = {});
    var e = cache[key];
    var sig = col[0].toFixed(1) + '|' + col[1] + '|' + col[2] + '|' + steps + '|' + maxA.toFixed(3);
    if (!e || e.sig !== sig) {
      e = cache[key] = { sig: sig, arr: new Array(steps) };
      for (var i = 0; i < steps; i++) e.arr[i] = CV.hsla(col, maxA * (i + 1) / steps);
    }
    return e.arr;
  };
  // só o tema MONO força branco puro. O PAPEL (fundo claro) passa pela paleta,
  // que já devolve tons escuros, então os módulos ficam legíveis sem código extra.
  CV.isMono = function (m) {
    if (m.s.colorMode === 'custom') return false;
    /* mapa de cor escolhido MANDA: sem isto os módulos que checam isMono primeiro
       (fluxo, enxame, cordas, malha) continuavam brancos no tema preto e o mapa não
       fazia nada. Era metade da monotonia. */
    if (m.s && m.s.cmap && m.s.cmap !== 'auto') return false;
    if (CV.cmap0 && CV.cmap0 !== 'auto') return false;
    var th = CV.themeOf(m);
    return th === 'preto' || th === 'mono' || th === 'carvao';
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
  // espessura de linha do usuário multiplicando o valor pensado pelo módulo
  /* ESPESSURA POR TEMA. É o que faz FÓSFORO parecer tubo (traço gordo) e PLANTA
     parecer nanquim técnico (fio), com o mesmo desenho por baixo. */
  /* COR EXATA POR MÓDULO, quando o tema traz uma. É o que permite copiar um app
     inteiro sem torcer o mapa de cor: o tema diz "o loudness é #4da9fc" e pronto.
     Devolve null quando o tema não define, e aí o módulo segue pelo caminho normal
     (paleta ou mapa de cor). A escolha do painel continua ganhando de tudo. */
  CV.corRGB = function (m, idx) {
    if (!m || !m.modId) return null;
    if (m.s && m.s.cmap && m.s.cmap !== 'auto') return null;
    if (CV.cmap0 && CV.cmap0 !== 'auto') return null;
    var t = THEME_BG[CV.themeOf(m)];
    var lista = t && t.cor && t.cor[m.modId];
    if (!lista) return null;
    var hex = lista[Math.min(idx, lista.length - 1)];
    return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)];
  };
  CV.corMod = function (m, idx, alpha) {
    if (!m || !m.modId) return null;
    if (m.s && m.s.cmap && m.s.cmap !== 'auto') return null;
    if (m.s && m.s.colorMode === 'custom') return null;
    if (CV.cmap0 && CV.cmap0 !== 'auto') return null;
    var t = THEME_BG[CV.themeOf(m)];
    var lista = t && t.cor && t.cor[m.modId];
    if (!lista) return null;
    var hex = lista[Math.min(idx, lista.length - 1)];
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha === undefined ? 1 : alpha) + ')';
  };
  CV.lw = function (m, base) {
    // lê o THEME_BG direto: CV.themeBg refaz contas de cor e isto aqui roda a cada traço
    var t = THEME_BG[CV.themeOf(m)];
    return Math.max(0.3, base * ((m.s && m.s.lw) || 1) * ((t && t.lw) || 1));
  };
  CV.trailClear = function (v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return 0.5 - 0.47 * v; };
  /* RASTRO QUE APAGA DE VERDADE. O véu na cor do fundo (source-over) empacava: em
     8 bits a conta arredonda pra baixo e o fundo parava em 18 quando o tema pede 25,
     então todo painel com rastro virava um quadrado mais escuro que os vizinhos. Agora
     o rastro some tirando opacidade (destination-out): o canvas volta a ser
     transparente e o fundo que aparece é o do painel, igual em todos os visuais. */
  CV.fade = function (m, c, v) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,' + CV.trailClear(v).toFixed(3) + ')';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
  };
  // véu de limpeza na cor de fundo DO TEMA (antes era preto fixo: por isso os temas mudavam pouco)
  CV.trailFill = function (m, v) {
    var hex = CV.bgOf(m), r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + CV.trailClear(v) + ')';
  };

  /* TABELA DE BINS pronta. Espectro, espectrograma e Cordas faziam um Math.pow e uma
     divisão por PONTO, em TODO quadro (220 + 160 + 28 = 408 potências por quadro, 24 mil
     por segundo) pra chegar sempre no mesmo índice. Agora a tabela é montada uma vez e
     refeita só quando o tamanho ou a taxa de amostragem muda. */
  CV.binTable = function (m, key, N, nBins, binHz, fmin, fmax, invert) {
    var st = m.st, cache = st._bt || (st._bt = {});
    var e = cache[key];
    var sig = N + '|' + nBins + '|' + binHz.toFixed(3) + '|' + fmin + '|' + fmax + '|' + (invert ? 1 : 0);
    if (!e || e.sig !== sig) {
      var arr = new Int32Array(N), hz = new Float32Array(N), ratio = fmax / fmin;
      for (var i = 0; i < N; i++) {
        var u = N > 1 ? i / (N - 1) : 0;
        var fr = fmin * Math.pow(ratio, invert ? 1 - u : u);
        hz[i] = fr;
        var b = Math.round(fr / binHz);
        arr[i] = b < 0 ? 0 : b > nBins - 1 ? nBins - 1 : b;
      }
      e = cache[key] = { sig: sig, bins: arr, hz: hz };
    }
    return invert === undefined ? e : e.bins;
  };
  CV.binTableFull = function (m, key, N, nBins, binHz, fmin, fmax, invert) {
    CV.binTable(m, key, N, nBins, binHz, fmin, fmax, invert);
    return m.st._bt[key];
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
    { k: 'sens', label: 'Reação', type: 'range', min: 0.2, max: 2.5, step: 0.05, def: 1, fmt: 'pct' },
    { k: 'speed', label: 'Velocidade', type: 'range', min: 0.2, max: 3, step: 0.05, def: 1 },
    { k: 'cmap', label: 'Cor', type: 'select', opts: CV.CMAP_LIST, def: 'auto' }
  ];
  function defs(extra) {
    // fx = dose de pós-produção deste visual (1 = a intensidade global inteira)
    var d = { sens: 1, speed: 1, colorMode: 'theme', hue: 180, theme: 'global', lw: 1, cmap: 'auto', fx: 1 };
    if (extra) for (var k in extra) d[k] = extra[k];
    return d;
  }
  function offscreen(m, key) {
    var o = m.st[key];
    if (!o || o.width !== m.canvas.width || o.height !== m.canvas.height) {
      o = document.createElement('canvas');
      o.width = Math.max(2, m.canvas.width); o.height = Math.max(2, m.canvas.height);
      m.st[key] = o;
      m.st[key + 'Cur'] = 0;   // cursor do anel: ver CV.scrollRing
    }
    return o;
  }
  /* ROLAGEM EM ANEL (onda rolante e espectrograma).
     Antes: a cada quadro o buffer inteiro era copiado sobre si mesmo deslocado 1px
     (numa faixa de 1440x200 são 288 mil pixels lidos e reescritos, 60 vezes por segundo).
     Agora a coluna nova é escrita num cursor que anda em círculo, e a tela é montada
     com 2 recortes. Mesmo desenho, um passe de pixel a menos por quadro. */
  /* PASSO DA ROLAGEM EM TEMPO, não em quadro. Era um tanto fixo de pixels por
     quadro: a 120Hz a onda corria o dobro de 60Hz, e com o limite de 30 quadros
     andava pela metade. Agora a velocidade é a mesma em qualquer tela; o resto
     fracionário fica guardado pro quadro seguinte. */
  CV.passo = function (m, pxPor60, dt) {
    var acc = (m.st._pa || 0) + pxPor60 * Math.min(0.1, dt || 1 / 60) * 60;
    var dx = Math.floor(acc);
    m.st._pa = acc - dx;
    return dx;   // pode dar 0: numa tela de 120Hz a faixa anda um quadro sim, outro não
  };
  CV.scrollRing = {
    // devolve o x onde escrever a coluna nova (e limpa a área)
    next: function (m, key, buf, bc, dx) {
      var cur = m.st[key + 'Cur'] || 0;
      if (cur + dx > buf.width) {
        // limpa o resto da faixa antes de voltar pro começo, senão sobra uma tira congelada
        if (cur < buf.width) bc.clearRect(cur, 0, buf.width - cur, buf.height);
        cur = 0;
      }
      bc.clearRect(cur, 0, dx, buf.height);
      m.st[key + 'Cur'] = cur + dx;
      return cur;
    },
    // monta o painel: o que está depois do cursor é o mais VELHO, vem primeiro
    /* frac = o pedaço de pixel que a faixa já andou e ainda não virou coluna (o resto
       do CV.passo). Puxar a imagem por essa fração é o que tira o tranco de 1 e 2
       pixels da rolagem: a faixa desliza em vez de pular. O pedaço velho estica 1
       pixel por cima da emenda, senão a borda meio coberta dos dois desenhos deixa
       um fio transparente andando pela tela. */
    blit: function (m, key, buf, c, w, h, frac) {
      var end = m.st[key + 'Cur'] || 0, W = buf.width, k = w / W;
      var tailW = W - end, off = (frac || 0) * k;
      c.clearRect(0, 0, w, h);
      if (end > 0) c.drawImage(buf, 0, 0, end, buf.height, tailW * k - off, 0, end * k, h);
      if (tailW > 0) c.drawImage(buf, end, 0, tailW, buf.height, -off, 0, tailW * k + (end > 0 && off > 0 ? k : 0), h);
    }
  };
  /* tamanho de fonte proporcional ao painel: um módulo pequeno na régua não pode
     ter a mesma letra de um em tela cheia. base = tamanho pensado pra um painel ~340x200. */
  /* v2: o texto cresce até 1,35x, não 2,6x. Rótulo de instrumento não é manchete:
     num painel de 800px o "1kHz" de 23px brigava com a curva. Quem precisa crescer
     de verdade (o número do LUFS) mede a sobra do painel e cresce por conta própria. */
  CV.fs = function (m, base) {
    if (!m || !m.w) return base;
    var k = Math.sqrt((m.w * m.h) / (340 * 200));
    return Math.max(7, Math.min(base * 1.35, base * Math.max(0.7, Math.min(1.35, k))));
  };
  // tamanho que acompanha o painel sem teto baixo: só pro número grande do LUFS
  CV.fsBig = function (m, base) {
    if (!m || !m.w) return base;
    var k = Math.sqrt((m.w * m.h) / (340 * 200));
    return Math.max(7, base * Math.max(0.62, Math.min(2.6, k)));
  };
  CV.font = function (m, base, weight) {
    return (weight ? weight + ' ' : '') + CV.fs(m, base).toFixed(1) + 'px "SF Mono", ui-monospace, monospace';
  };

  /* DETALHE PROPORCIONAL AO PAINEL.
     As contagens da arte eram números fixos, escolhidos num painel de 340x200. Em
     tela cheia o mesmo número vira faceta visível: 140 pontos numa linha de 1400
     pixels são 10 pixels por ponto, e a curva mostra os cantos; 520 partículas num
     painel de 1600x900 são poeira rala. Aqui a contagem acompanha a raiz da área
     (o dobro de lado = o dobro de pontos), com piso no valor antigo e teto pra não
     explodir. Quem segura a conta continua sendo a qualidade adaptativa do app:
     quando a máquina aperta ela baixa a resolução da arte e pula quadro dela. */
  CV.det = function (m, base, teto) {
    if (!m || !m.w) return base;
    var k = Math.sqrt((m.w * m.h) / (340 * 200));
    return Math.round(Math.max(base, Math.min(teto === undefined ? base * 2.5 : teto, base * k)));
  };

  // rótulo dentro do módulo: escurece sozinho quando o tema é de fundo claro
  function label(c, txt, x, y, align, col, m) {
    c.font = CV.font(m, 9);
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
    'uniform float u_t, u_bass, u_mid, u_high, u_beat, u_hue, u_sat, u_a, u_b, u_gate, u_lock;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }',
    /* fbm de 3 oitavas (era 5). O PSY chama fbm 5 vezes POR PIXEL: com 5 oitavas eram
       25 amostras de ruído por pixel, e num painel grande em Retina isso passa de 50
       milhões de amostras por quadro. As 2 últimas oitavas só somam detalhe do tamanho
       de um pixel, que ninguém vê. Corta ~40% da conta de GPU do módulo mais caro. */
    'float fbm(vec2 p){ float v = 0.0, a = 0.5;',
    '  for(int i=0;i<3;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7); a *= 0.5; }',
    '  return v * 1.143; }',
    'vec3 hue2rgb(float hh){ vec3 k = mod(vec3(5.0,3.0,1.0) + hh*6.0, 6.0);',
    '  return clamp(min(k, 4.0-k), 0.0, 1.0); }',
    'vec3 pal(float x){ vec3 rain = 0.5 + 0.5*cos(6.2831*(x + vec3(0.0,0.33,0.67)));',
    '  vec3 base = hue2rgb(fract(u_hue));',
    '  float lv = 0.30 + 0.85*fract(x);',
    '  vec3 solid = mix(base, vec3(1.0), max(0.0, lv-1.0)) * min(1.15, lv);',
    '  vec3 c = mix(rain, solid, u_lock);',
    '  return mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, u_sat); }'
  ].join('\n');

  CV.glSetup = function (m, fragBody) {
    /* preserveDrawingBuffer FALSE: com true o navegador copia o buffer inteiro a cada
       quadro pra poder "preservar" (e nenhum shader daqui precisa: todos repintam a tela
       toda). alpha false tira a mistura com a página. high-performance pede a GPU boa
       no Mac com duas placas. */
    var gl = m.canvas.getContext('webgl', {
      antialias: false, preserveDrawingBuffer: false, alpha: false,
      depth: false, stencil: false, powerPreference: 'high-performance',
      desynchronized: true
    });
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
    ['u_res', 'u_mouse', 'u_t', 'u_bass', 'u_mid', 'u_high', 'u_beat', 'u_hue', 'u_sat', 'u_a', 'u_b', 'u_gate', 'u_lock'].forEach(function (n) {
      m.st.u[n] = gl.getUniformLocation(pr, n);
    });
    m.st.gl = gl;
    m.st.pt = 0;
  };

  /* ================= v2.2 · REAÇÃO AO SOM =================
     Pedido do Bruno: a música mexendo MAIS nos visuais, principalmente o grave, e cada
     visual crescendo até ocupar boa parte do painel. A causa do visual parado era o
     sinal, não o desenho: o d.bass vivia no talo (mediana 0,997 no beat demo), então o
     kick não tinha pra onde subir. O motor agora entrega sinais que se ajustam ao
     volume da música (audio.js, updateReacao): grave, soco, energia, medio, agudo e o
     ondaRef pro autoganho da forma de onda.
     Quanto o som mexe em cada visual = Reação geral (Ajustes) x Reação do visual. */
  CV.reacao = 1;          // o app escreve aqui: Leve 0,45 · Média 0,7 · Forte 1 · Máxima 1,45
  CV.REACOES = [['leve', 'Leve', 0.45], ['media', 'Média', 0.7], ['forte', 'Forte', 1], ['maxima', 'Máxima', 1.45]];
  CV.rx = function (m) {
    var s = m && m.s && m.s.sens !== undefined ? +m.s.sens : 1;
    return (CV.reacao === undefined ? 1 : CV.reacao) * (s >= 0 ? s : 1);
  };
  /* os sinais novos. Um motor sem eles (objeto de teste, versão antiga) cai numa
     reserva tirada dos sinais velhos, sem quebrar nada. */
  var SOM_RES = { grave: 0, soco: 0, energia: 0, medio: 0, agudo: 0, ondaRef: 0.5, ondaVivo: 0.5 };
  CV.som = function (d) {
    if (!d) { SOM_RES.grave = SOM_RES.soco = SOM_RES.energia = SOM_RES.medio = SOM_RES.agudo = 0; return SOM_RES; }
    if (d.grave !== undefined) return d;
    SOM_RES.grave = Math.min(1, d.bass || 0); SOM_RES.soco = d.beatPulse || 0;
    SOM_RES.energia = Math.min(1, (d.level || 0) * 4); SOM_RES.medio = d.mid || 0; SOM_RES.agudo = d.high || 0;
    SOM_RES.ondaRef = SOM_RES.ondaVivo = 0.5;
    return SOM_RES;
  };
  /* o tamanho que respira: 'repouso' é a fração do painel sem batida; com o sinal em 1
     (o kick) chega no painel inteiro. Reação abaixo de 1 segura perto do repouso;
     acima de 1 encosta na borda mais cedo e fica mais tempo lá. */
  CV.respira = function (m, sinal, repouso) {
    var v = sinal * CV.rx(m);
    if (v > 1) v = 1; else if (v < 0) v = 0;
    return repouso + (1 - repouso) * v;
  };
  // envelope próprio do painel, em segundos: sobe em 'sobe', desce em 'desce'
  CV.env = function (m, key, alvo, dt, sobe, desce) {
    var st = m.st, v = st[key];
    if (v === undefined) v = alvo;
    var tau = alvo > v ? sobe : desce;
    v += (alvo - v) * (tau > 0 ? 1 - Math.exp(-Math.min(0.1, dt) / tau) : 1);
    st[key] = v;
    return v;
  };
  /* AUTOGANHO DA FORMA DE ONDA: o pico recente da música vira 'alvo' (fração da
     metade do painel). Lissajous, Traço e Camadas desenhavam a amostra crua: com a
     música a -12 LUFS a figura do Lissajous ocupava 25% da largura do painel.
     A arte usa a régua viva (desce em 0,8s): na quebra sem grave ela volta a encher. */
  CV.ganhoOnda = function (d, alvo, teto) {
    var ref = d && d.ondaVivo > 0 ? d.ondaVivo : (d && d.ondaRef > 0 ? d.ondaRef : 0.5);
    var g = (alvo === undefined ? 0.92 : alvo) / ref;
    return g > (teto || 12) ? (teto || 12) : g;
  };
  /* curva que abre o miolo: amostra pequena cresce mais que a grande (|v|^0,65).
     A figura de fase vive concentrada perto do zero; sem isso ela vira um caroço
     aceso no meio e o resto do painel fica vazio. */
  CV.abreMiolo = function (v) { return v < 0 ? -Math.pow(-v, 0.65) : Math.pow(v, 0.65); };
  /* joelho macio: até 75% do limite passa reto, daí em diante encosta devagar no
     limite (tanh). Deixa o visual chegar na borda no kick sem ser cortado reto. */
  CV.joelho = function (v, lim) {
    var a = v < 0 ? -v : v, k = lim * 0.75;
    if (a <= k) return v;
    var o = k + (lim - k) * Math.tanh((a - k) / (lim - k));
    return v < 0 ? -o : o;
  };
  /* quanto os medidores de forma (onda, osciloscópio, estéreo) enchem o painel no
     modo Encher: o pico recente da música vai a 95% da faixa na Reação Forte */
  CV.alvoEncher = function () {
    var r = CV.reacao === undefined ? 1 : CV.reacao;
    return Math.min(1.15, 0.5 + 0.45 * r);
  };

  /* velocidade do relógio interno, suavizada. O beat sobe de 0 a 1 num salto seco:
     usado cru, o visual "pula". Aqui ele entra com inércia, então o movimento é contínuo.
     v2.2: o empurrão é o soco do grave (contínuo, do tamanho do kick) e cresce com a Reação. */
  CV.rate = function (m, d, dt, base, gateAmt, beatAmt) {
    var gate = CV.gate(m, d, dt), sm = CV.som(d);
    var pulso = d ? Math.max(d.beatPulse || 0, sm.soco) : 0;
    var tgt = base + gate * gateAmt + pulso * beatAmt * Math.min(1.6, CV.rx(m));
    if (m.st.rt === undefined) m.st.rt = tgt;
    m.st.rt += (tgt - m.st.rt) * Math.min(1, dt * 7);
    return m.st.rt;
  };

  /* portão de energia: o áudio é quem molda; silêncio = quieto e apagado.
     v2.2: a Reação NÃO entra aqui. Ela diz quanto o som mexe, não se tem som. */
  CV.gate = function (m, d, dt) {
    var tg = d ? Math.min(1, (d.level * 5 + d.bass * 0.8)) : 0;
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
    // matiz do shader por tema. Sem entrada aqui, a matiz gira sozinha.
    var THEME_HUE = { fosforo: 0.34, planta: 0.58, gelo: 0.58, jornal: 0.09, areia: 0.07,
      ardosia: 0.11, minimeters: 0.97, chumbo: 0.58, tijolo: 0.05, musgo: 0.28 };
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
    /* v2.2: o shader recebe o grave que se ajusta ao volume. O d.bass antigo chegava
       ali no talo o tempo todo (1,4 cravado), e o líquido não sabia quando era kick. */
    var sm = CV.som(d), ax = CV.rx(m);
    var gS = CV.env(m, 'glG', sm.grave, dt, 0.012, 0.09);
    gl.uniform1f(m.st.u.u_bass, d ? Math.min(1.4, (0.26 + 1.0 * gS + 0.35 * sm.soco) * ax) : 0);
    gl.uniform1f(m.st.u.u_mid, d ? Math.min(1, sm.medio * ax) : 0);
    gl.uniform1f(m.st.u.u_high, d ? Math.min(1, sm.agudo * ax * 1.1) : 0);
    gl.uniform1f(m.st.u.u_beat, d ? Math.min(1, Math.max(d.beatPulse * 0.6, sm.soco) * Math.min(1.2, ax)) : 0);
    gl.uniform1f(m.st.u.u_hue, hue);
    gl.uniform1f(m.st.u.u_sat, ((th === 'mono' || th === 'preto' || th === 'carvao' || th === 'papel') && m.s.colorMode !== 'custom') ? 0 : 1);
    gl.uniform1f(m.st.u.u_lock, m.s.colorMode === 'custom' ? 1 : 0);
    gl.uniform1f(m.st.u.u_a, extraA || 0);
    gl.uniform1f(m.st.u.u_b, extraB || 0);
    gl.uniform1f(m.st.u.u_gate, gate);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  /* ================= v2.1 · MEDIDORES LISOS =================
     Pedido do Bruno: os visuais estavam pesados; ele quer clima smooth e pleasing, no
     molde do MiniMeters, bonito, leve, liso e responsivo. O que pesava, medido numa barra de
     720x170 em Retina: o espectro fazia 8.711 chamadas de desenho por quadro (um ponto
     por pixel de DISPOSITIVO, tudo em reta), o osciloscópio 2.896, a onda
     pintava uma cor nova por coluna (fita de ruído) e o loudness era um bloco azul
     sólido. Regras desta rodada:
       1. Um ponto a cada 2 pixels de tela, desenhado em CURVA (quadrática pelo meio de
          cada par). Menos pontos e mais liso ao mesmo tempo.
       2. Preenchimento em véu (degradê que some no rodapé), nunca bloco chapado.
       3. Movimento em segundos: ataque curto pra responder, queda macia pra assentar.
       4. Texto pequeno e apagado; leitura grande só onde ela é o instrumento (LUFS). */

  /* caminho liso por uma lista de pontos: reta até o meio de cada par, curva no ponto */
  CV.curva = function (c, X, Y, n) {
    c.moveTo(X[0], Y[0]);
    if (n < 3) { for (var k = 1; k < n; k++) c.lineTo(X[k], Y[k]); return; }
    for (var i = 1; i < n - 1; i++) c.quadraticCurveTo(X[i], Y[i], (X[i] + X[i + 1]) * 0.5, (Y[i] + Y[i + 1]) * 0.5);
    c.lineTo(X[n - 1], Y[n - 1]);
  };
  // cor rgba com cache (a mesma string volta toda vez: o navegador nem relê a cor)
  var _rgba = new Map();
  CV.rgba = function (rgb, a) {
    var qa = Math.round((a === undefined ? 1 : a) * 100);
    var key = ((rgb[0] | 0) << 16 | (rgb[1] | 0) << 8 | (rgb[2] | 0)) * 101 + qa;
    var v = _rgba.get(key);
    if (v === undefined) {
      v = 'rgba(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ',' + (qa / 100) + ')';
      if (_rgba.size > 8000) _rgba.clear();
      _rgba.set(key, v);
    }
    return v;
  };
  function hslRgb(hh, ss, ll) {
    hh = ((hh % 360) + 360) % 360; ss /= 100; ll /= 100;
    var cc = (1 - Math.abs(2 * ll - 1)) * ss, xx = cc * (1 - Math.abs((hh / 60) % 2 - 1)), mm = ll - cc / 2, r, g, b;
    if (hh < 60) { r = cc; g = xx; b = 0; } else if (hh < 120) { r = xx; g = cc; b = 0; } else if (hh < 180) { r = 0; g = cc; b = xx; }
    else if (hh < 240) { r = 0; g = xx; b = cc; } else if (hh < 300) { r = xx; g = 0; b = cc; } else { r = cc; g = 0; b = xx; }
    return [(r + mm) * 255, (g + mm) * 255, (b + mm) * 255];
  }
  /* a cor N do medidor: a desenhada pelo tema; se o painel escolheu um mapa, sai do
     mapa; sem nada, da paleta do tema */
  function corMedidor(m, idx, posMapa) {
    var rgb = CV.corRGB(m, idx);
    if (rgb) return rgb;
    if (m.s && m.s.cmap && m.s.cmap !== 'auto') return CV.cmapRgb(m.s.cmap, posMapa === undefined ? 0.85 : posMapa);
    var p = CV.isMono(m) ? [0, 0, CV.isLight(m) ? 12 : 92] : CV.pal(m, idx);
    return hslRgb(p[0], p[1], p[2]);
  }
  function misturaRgb(a, b, t, o) {
    o = o || [0, 0, 0];   // passe um array pronto no laço de cada quadro: nada de lixo pro coletor
    o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t;
    return o;
  }
  function rotulo(c, m, txt, x, y, align, alpha) {
    c.font = CV.font(m, 9);
    c.textAlign = align || 'left';
    c.fillStyle = CV.gridInk(m, alpha === undefined ? 0.42 : alpha);
    c.fillText(txt, x, y);
  }

  /* ================= ESPECTRO ================= */
  CV.register('spectrum', {
    name: 'Espectro', group: 'Estúdio', desc: 'Frequências em tempo real, com leitura de nota',
    defaults: { estilo: 'ambos', smooth: 0.9, tilt: 4.5, fft: 4096, escala: 'log', acende: 1, cmap: 'auto' },
    schema: [
      { k: 'estilo', label: 'Estilo', type: 'seg', opts: [['fft', 'Linha'], ['barras', 'Barras'], ['ambos', 'Os dois']], def: 'ambos' },
      { k: 'smooth', label: 'Suavidade', type: 'range', min: 0, max: 0.98, step: 0.01, def: 0.9, fmt: 'pct' },
      { k: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 9, step: 0.25, def: 4.5, fmt: 'db' },
      { k: 'fft', label: 'FFT', type: 'seg', opts: [[1024, '1k'], [2048, '2k'], [4096, '4k'], [8192, '8k'], [16384, '16k']], def: 4096 },
      { k: 'escala', label: 'Escala', type: 'seg', opts: [['mel', 'Mel'], ['log', 'Log'], ['lin', 'Linear']], def: 'log' },
      { k: 'acende', label: 'Brilho na batida', type: 'seg', opts: [[0, 'Não'], [1, 'Sim']], def: 1 },
      { k: 'cmap', label: 'Cor', type: 'select', opts: CV.CMAP_LIST, def: 'auto' }
    ],
    init: function (m) { m.st.v = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s, st = m.st;
      c.clearRect(0, 0, w, h);
      if (!d || !d.spectrum) return;
      var FMIN = 20, FMAX = 20000;
      var dbL = d.spectrum(s.fft, 'l'), nb = dbL.length, binHz = d.specBinHz;
      var dbR = d.spectrum(s.fft, 'r');
      var N = Math.max(64, Math.min(1000, Math.round(w / 2)));
      if (!st.v || st.v.length !== N) {
        st.v = new Float32Array(N); st.v2 = new Float32Array(N); st.raw = new Float32Array(N);
        st.X = new Float32Array(N); st.Y = new Float32Array(N); st.Y2 = new Float32Array(N); st.Yf = new Float32Array(N);
      }
      var v = st.v, v2 = st.v2, raw = st.raw, X = st.X, Y = st.Y, Y2 = st.Y2, Yf = st.Yf, i;

      /* EIXO: cada ponto cobre um pedaço do espectro (lo..hi). Onde o pedaço tem mais
         de uma raia, vale o MAIOR (o pico não some no agudo); onde não tem, interpola. */
      var ax = st.ax, sig = N + '|' + nb + '|' + binHz.toFixed(4) + '|' + s.escala + '|' + s.tilt + '|' + w;
      if (!ax || ax.sig !== sig) {
        ax = st.ax = { sig: sig, pos: new Float32Array(N), lo: new Int32Array(N), hi: new Int32Array(N), tilt: new Float32Array(N), hz: new Float32Array(N) };
        var mMin = 2595 * Math.log10(1 + FMIN / 700), mMax = 2595 * Math.log10(1 + FMAX / 700);
        var freqDe = function (u) {
          if (s.escala === 'lin') return FMIN + (FMAX - FMIN) * u;
          if (s.escala === 'mel') return 700 * (Math.pow(10, (mMin + (mMax - mMin) * u) / 2595) - 1);
          return FMIN * Math.pow(FMAX / FMIN, u);
        };
        for (i = 0; i < N; i++) {
          var u = i / (N - 1), fr = freqDe(u);
          var fa = freqDe(Math.max(0, u - 0.5 / (N - 1))), fb = freqDe(Math.min(1, u + 0.5 / (N - 1)));
          ax.hz[i] = fr; ax.pos[i] = fr / binHz;
          ax.lo[i] = Math.max(0, Math.floor(fa / binHz)); ax.hi[i] = Math.min(nb - 1, Math.ceil(fb / binHz));
          // tilt em dB por oitava a partir de 1kHz, e o subgrave abaixo de 45Hz cai 14dB/oitava (rumble)
          var sub = fr < 45 ? -14 * Math.log(45 / fr) / Math.LN2 : 0;
          ax.tilt[i] = s.tilt * Math.log(fr / 1000) / Math.LN2 + sub;
          X[i] = u * w;
        }
        st.grade = null;
      }
      // janela vertical medida contra o vídeo do MiniMeters: -66 a -14 dBFS
      var piso = -66, span = 52;
      var tUp = 0.016, tDn = 0.06 + s.smooth * 0.86;
      var kUp = 1 - Math.exp(-dt / tUp), kDn = 1 - Math.exp(-dt / tDn);
      var maxV = 0, maxI = 0;
      for (var cc = 0; cc < 2; cc++) {
        var src = cc === 0 ? dbL : dbR, alvo = cc === 0 ? v : v2;
        for (i = 0; i < N; i++) {
          var lo = ax.lo[i], hi = ax.hi[i], dbv;
          if (hi > lo + 1) { dbv = -200; for (var q = lo; q <= hi; q++) if (src[q] > dbv) dbv = src[q]; }
          else {
            /* entre duas raias (o grave, onde há mais ponto que raia): Catmull-Rom em
               vez de reta. A reta deixava um bico em cada raia e o grave saía poligonal. */
            var p0 = ax.pos[i], i0 = p0 | 0; if (i0 > nb - 3) i0 = nb - 3; if (i0 < 1) i0 = 1;
            var f = p0 - i0, ya = src[i0 - 1], yb = src[i0], yc = src[i0 + 1], yd = src[i0 + 2];
            dbv = yb + 0.5 * f * (yc - ya + f * (2 * ya - 5 * yb + 4 * yc - yd + f * (3 * (yb - yc) + yd - ya)));
          }
          var nv = (dbv + ax.tilt[i] - piso) / span;
          if (nv < 0) nv = 0; else if (nv > 0.86) nv = 0.86 + 0.14 * Math.tanh((nv - 0.86) / 0.14);
          raw[i] = nv;
        }
        // 1-2-1 entre vizinhos: tira o dente de um pixel só, mantém a altura
        var ant = raw[0];
        for (i = 0; i < N; i++) {
          var atual = raw[i], prox = i < N - 1 ? raw[i + 1] : atual;
          var sm = (ant + 2 * atual + prox) * 0.25;
          ant = atual;
          alvo[i] += (sm - alvo[i]) * (sm > alvo[i] ? kUp : kDn);
          // a nota do canto procura só a região musical: pico em 11kHz é chimbal, não nota
          if (cc === 0 && alvo[i] > maxV && ax.hz[i] >= 30 && ax.hz[i] <= 5000) { maxV = alvo[i]; maxI = i; }
        }
      }

      var topo = h * 0.96;
      for (i = 0; i < N; i++) { Y[i] = h - v[i] * topo; Y2[i] = h - v2[i] * topo; Yf[i] = h - Math.min(v[i], v2[i]) * topo; }
      var corL = corMedidor(m, 0, 0.88), corR = corMedidor(m, 1, 0.55), sombra = CV.corRGB(m, 2) || misturaRgb(corL, [0, 0, 0], 0.6);

      /* BRILHO NA BATIDA: cada faixa se compara com a própria média lenta, e o que
         passou dela acende. A v2.0 pintava isso em 240 a 640 faixas, e a borda entre
         uma e outra virava listra vertical. Agora são 48 paradas de um degradê só:
         a luz escorre de uma faixa pra outra, sem degrau. */
      var NB = 48, lz = null, algum = 0, b;
      if (s.acende) {
        var med = st.med || (st.med = new Float32Array(NB));
        lz = st.lz || (st.lz = new Float32Array(NB));
        var kM = 1 - Math.exp(-dt / 0.6), kL = Math.exp(-dt / 0.22);
        for (b = 0; b < NB; b++) {
          var ia = (b * N / NB) | 0, ib = ((b + 1) * N / NB) | 0, top = 0;
          for (i = ia; i < ib; i++) if (v[i] > top) top = v[i];
          var sobe = Math.max(0, top - med[b]);
          med[b] += (top - med[b]) * kM;
          lz[b] = Math.max(lz[b] * kL, Math.min(1, sobe * 4 * Math.pow(top, 1.2)));
          if (lz[b] > 0.04) algum = 1;
        }
      }

      /* PREENCHIMENTO PELA ALTURA, o do MiniMeters: debaixo de cada trecho a cor vai
         da sombra (curva baixa) ao vivo (curva alta), então o que toca forte acende e
         o resto fica escuro. Depois um degradê APAGA o preenchimento em direção ao
         rodapé (destination-out: até ali o painel só tem ele). A v2.0 era um bloco
         rosa de 30% a 92% com listras por cima; aqui o mais aceso fica em 38%. */
      if (s.estilo !== 'fft') {
        var forte = s.estilo === 'barras', tmpC = st.tmpC || (st.tmpC = [0, 0, 0]);
        var gh = c.createLinearGradient(0, 0, w, 0);
        for (b = 0; b < NB; b++) {
          var ja = (b * N / NB) | 0, jb = ((b + 1) * N / NB) | 0, alto = 0;
          for (i = ja; i < jb; i++) { var mn = forte ? v[i] : v[i] < v2[i] ? v[i] : v2[i]; if (mn > alto) alto = mn; }
          var u2 = Math.min(1, alto / 0.86);
          u2 = Math.round(u2 * u2 * 40) / 40;
          var la = lz && lz[b] > 0.03 ? Math.round(lz[b] * 20) / 20 : 0;
          var a2 = forte ? 0.32 + 0.5 * u2 + 0.18 * la : 0.07 + 0.31 * u2 + 0.24 * la;
          gh.addColorStop((b + 0.5) / NB, CV.rgba(misturaRgb(sombra, corL, Math.min(1, u2 + la * 0.6), tmpC), a2));
        }
        c.beginPath();
        CV.curva(c, X, forte ? Y : Yf, N);   // Barras não tem a curva da direita: enche até a da esquerda
        c.lineTo(w, h); c.lineTo(0, h); c.closePath();
        c.fillStyle = gh;
        c.fill();
        var fsig = h + '|' + forte;
        if (st.fsig !== fsig) {
          var gv = c.createLinearGradient(0, 0, 0, h);
          gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.4, 'rgba(0,0,0,0.15)');
          gv.addColorStop(1, forte ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.8)');
          st.gv = gv; st.fsig = fsig;
        }
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = st.gv;
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'source-over';
      }

      // grade discreta: décadas com rótulo, intermediárias quase sumidas
      var gk = st.grade;
      if (!gk) {
        gk = st.grade = { fraca: [], forte: [] };
        var marcas = [[50, 0], [100, '100'], [200, 0], [500, 0], [1000, '1k'], [2000, 0], [5000, 0], [10000, '10k']];
        for (var g2 = 0; g2 < marcas.length; g2++) {
          var fq = marcas[g2][0], gx = -1;
          for (var q2 = 0; q2 < N - 1; q2++) if (ax.hz[q2] <= fq && ax.hz[q2 + 1] >= fq) { gx = X[q2] + (X[q2 + 1] - X[q2]) * (fq - ax.hz[q2]) / (ax.hz[q2 + 1] - ax.hz[q2]); break; }
          if (gx < 0) continue;
          gx = Math.round(gx) + 0.5;
          if (marcas[g2][1]) gk.forte.push([gx, marcas[g2][1]]); else gk.fraca.push(gx);
        }
      }
      c.lineWidth = 1;
      c.strokeStyle = CV.gridInk(m, 0.035);
      c.beginPath();
      for (i = 0; i < gk.fraca.length; i++) { c.moveTo(gk.fraca[i], 0); c.lineTo(gk.fraca[i], h); }
      c.stroke();
      c.strokeStyle = CV.gridInk(m, 0.075);
      c.beginPath();
      for (i = 0; i < gk.forte.length; i++) { c.moveTo(gk.forte[i][0], 0); c.lineTo(gk.forte[i][0], h); }
      c.stroke();
      if (h > 60) for (i = 0; i < gk.forte.length; i++) rotulo(c, m, gk.forte[i][1], gk.forte[i][0] + 4, CV.fs(m, 9) + 3, 'left', 0.34);

      // o traço da esquerda clareia onde a faixa acendeu
      var luzL = null;
      if (algum) {
        var ext = CV.isLight(m) ? [0, 0, 0] : [255, 255, 255];
        luzL = c.createLinearGradient(0, 0, w, 0);
        var tmpL = st.tmpL || (st.tmpL = [0, 0, 0]);
        for (b = 0; b < NB; b++) luzL.addColorStop((b + 0.5) / NB, CV.rgba(misturaRgb(corL, ext, Math.round(lz[b] * 20) / 20 * 0.5, tmpL), 1));
      }

      // as duas curvas: direita por baixo, esquerda por cima
      c.lineJoin = 'round';
      c.lineWidth = 1.15;
      if (s.estilo !== 'barras') {
        c.strokeStyle = CV.rgba(corR, 0.8);
        c.beginPath(); CV.curva(c, X, Y2, N); c.stroke();
      }
      c.strokeStyle = luzL || CV.rgba(corL, s.estilo === 'barras' ? 0.95 : 1);
      if (luzL) c.lineWidth = 1.4;
      c.beginPath(); CV.curva(c, X, Y, N); c.stroke();

      // leitura: no hover segue o mouse; parado, só a nota do pico, pequena no canto
      if (m.mouse && m.mouse.over) {
        var ri = Math.max(0, Math.min(N - 1, Math.round(m.mouse.x / w * (N - 1))));
        var fr2 = ax.hz[ri], bin2 = Math.max(0, Math.min(nb - 1, Math.round(fr2 / binHz)));
        c.strokeStyle = CV.gridInk(m, 0.22); c.lineWidth = 1;
        c.beginPath(); c.moveTo(Math.round(X[ri]) + 0.5, 0); c.lineTo(Math.round(X[ri]) + 0.5, h); c.stroke();
        var txt = (dbL[bin2] > -119 ? dbL[bin2].toFixed(1) : '-∞') + ' dB  ' + CV.fmtHz(fr2) + '  ' + CV.noteCents(fr2);
        c.font = CV.font(m, 9.5);
        var tw = c.measureText(txt).width, fsz = CV.fs(m, 9.5);
        var tx = Math.min(w - tw - 10, Math.max(6, X[ri] + 8)), ty = Math.max(fsz * 2.6, Math.min(h - 6, m.mouse.y));
        c.fillStyle = CV.isLight(m) ? 'rgba(250,248,242,0.92)' : 'rgba(10,10,12,0.78)';
        c.fillRect(tx - 5, ty - fsz - 4, tw + 10, fsz + 8);
        c.fillStyle = CV.isLight(m) ? '#141412' : '#ececec';
        c.textAlign = 'left';
        c.fillText(txt, tx, ty);
      } else if (maxV > 0.12 && h > 70) {
        // a nota do pico mora na segunda linha: na primeira ela batia no rótulo do 10k
        var fp = ax.hz[maxI];
        rotulo(c, m, CV.noteName(fp) + '  ' + CV.fmtHz(fp), w - 8, CV.fs(m, 9) * 2 + 7, 'right', 0.45);
      }
    }
  });

  /* ================= ONDA ================= */
  /* TRÊS BANDAS EM CAMADAS, como a onda multibanda do MiniMeters: o grave por trás,
     o médio no meio, o agudo na frente, cada um com a própria altura. A v2.0 pintava
     uma cor por coluna a partir do "brilho" do som e a faixa virava ruído colorido.
     Agora a cor quer dizer uma coisa só (qual banda) e a forma é lisa. */
  var ONDA_BANDA = { lo: [253, 86, 72], mid: [104, 211, 116], hi: [77, 169, 252] };
  CV.register('wavescroll', {
    name: 'Onda', group: 'Estúdio', buffered: true, desc: 'A forma de onda passando, em três bandas, um canal por faixa',
    defaults: { ch1: 'l', ch2: 'r', cor: 'auto', speed: 1, sens: 1, tamanho: 'encher', cmap: 'auto' },
    schema: [
      { k: 'ch1', label: 'Canal 1', type: 'seg', opts: [['l', 'Esq'], ['r', 'Dir'], ['m', 'Mid'], ['s', 'Side']], def: 'l' },
      { k: 'ch2', label: 'Canal 2', type: 'seg', opts: [['off', 'Off'], ['l', 'Esq'], ['r', 'Dir'], ['m', 'Mid'], ['s', 'Side']], def: 'r' },
      { k: 'tamanho', label: 'Tamanho', type: 'seg', opts: [['encher', 'Encher'], ['real', 'Nível real']], def: 'encher' },
      { k: 'cor', label: 'Cor', type: 'seg', opts: [['auto', 'Do tema'], ['banda', 'Bandas'], ['fixa', 'Uma cor'], ['mapa', 'Mapa']], def: 'auto' },
      { k: 'speed', label: 'Rolagem', type: 'range', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'cmap', label: 'Mapa', type: 'select', opts: CV.CMAP_LIST, def: 'auto', when: ['cor', 'mapa'] }
    ],
    init: function (m) { m.st.f = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s, st = m.st;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d || !d.timeL) { c.clearRect(0, 0, w, h); return; }
      if (!st.f) st.f = [];
      var chans = [s.ch1];
      if (s.ch2 && s.ch2 !== 'off') chans.push(s.ch2);
      var lanes = chans.length;
      var dx = CV.passo(m, 1.4 * s.speed * (m.dpr || 1), dt);
      st._dtA = (st._dtA || 0) + dt;
      if (dx >= 1) {
        var dtCol = Math.min(0.1, st._dtA); st._dtA = 0;
        bc.globalCompositeOperation = 'source-over';
        var x = CV.scrollRing.next(m, 'buf', buf, bc, dx);
        var H = buf.height, laneH = H / lanes, sr = d.sr || 48000;
        var L = d.timeL, R = d.timeR, n = L.length;
        var fresh = Math.min(n, Math.max(48, Math.round(sr * dtCol)));
        var aLo = Math.exp(-2 * Math.PI * 220 / sr), aHi = Math.exp(-2 * Math.PI * 2400 / sr);
        var modo = s.cor === 'auto' ? (CV.themeOf(m) === 'minimeters' ? 'banda' : 'tema') : s.cor;
        var cLo, cMid, cHi, cUma;
        if (modo === 'banda') { cLo = CV.rgba(ONDA_BANDA.lo, 1); cMid = CV.rgba(ONDA_BANDA.mid, 0.92); cHi = CV.rgba(ONDA_BANDA.hi, 0.92); }
        else if (modo === 'tema') {
          var base = corMedidor(m, 0);
          cLo = CV.rgba(base, 0.3); cMid = CV.rgba(base, 0.58); cHi = CV.rgba(base, 0.95);
        } else if (modo === 'fixa') cUma = CV.rgba(corMedidor(m, 0), 0.9);
        /* v2.2 ENCHER: o pico recente da música vai a 95% da faixa (Reação Forte), em
           qualquer volume de entrada. Nível real = o ganho fixo de antes, pra ler folga. */
        var g = s.tamanho === 'real' ? s.sens : Math.min(10, CV.alvoEncher() / Math.max(0.02, CV.som(d).ondaRef)), porCol = fresh / dx;
        for (var li = 0; li < lanes; li++) {
          var ch = chans[li], fs = st.f[li] || (st.f[li] = { lo: 0, hi: 0 });
          var mid = laneH * (li + 0.5), amp = laneH * 0.46;
          for (var cx = 0; cx < dx; cx++) {
            var a0 = n - fresh + Math.floor(cx * porCol), a1 = n - fresh + Math.floor((cx + 1) * porCol);
            if (a1 <= a0) a1 = a0 + 1;
            var pk = 0, pMid = 0, pHi = 0, flo = fs.lo, fhi = fs.hi;
            for (var i = a0; i < a1; i++) {
              var a = L[i], b = R[i];
              var smp = ch === 'l' ? a : ch === 'r' ? b : ch === 'm' ? (a + b) * 0.5 : (a - b) * 0.5;
              flo = smp + (flo - smp) * aLo;
              fhi = smp + (fhi - smp) * aHi;
              // grave = abaixo de 220Hz, médio = 220 a 2400Hz, agudo = o resto
              var vm = fhi - flo, vh = smp - fhi, va = smp < 0 ? -smp : smp;
              if (vm < 0) vm = -vm; if (vh < 0) vh = -vh;
              if (va > pk) pk = va; if (vm > pMid) pMid = vm; if (vh > pHi) pHi = vh;
            }
            fs.lo = flo; fs.hi = fhi;
            var px = x + cx;
            if (modo === 'banda' || modo === 'tema') {
              var hl = Math.min(1, pk * g) * amp, hm = Math.min(1, pMid * g * 1.1) * amp, hh = Math.min(1, pHi * g * 0.9) * amp;
              bc.fillStyle = cLo; bc.fillRect(px, mid - hl, 1, hl * 2 + 1);
              bc.fillStyle = cMid; bc.fillRect(px, mid - hm, 1, hm * 2 + 1);
              bc.fillStyle = cHi; bc.fillRect(px, mid - hh, 1, hh * 2 + 1);
            } else {
              var ht = Math.min(1, pk * g) * amp;
              bc.fillStyle = modo === 'mapa' ? CV.cmap(m, 0.2 + Math.min(1, pk * g) * 0.8, 1) : cUma;
              bc.fillRect(px, mid - ht, 1, ht * 2 + 1);
            }
          }
        }
      }
      // rola com fração de pixel: sem isso a faixa anda aos pulinhos de 1 e 2 pixels
      CV.scrollRing.blit(m, 'buf', buf, c, w, h, st._pa || 0);
      c.fillStyle = CV.gridInk(m, 0.06);
      for (var z = 0; z < lanes; z++) c.fillRect(0, Math.round(h * (z + 0.5) / lanes), w, 1);
      if (lanes > 1) { c.fillStyle = CV.gridInk(m, 0.035); c.fillRect(0, Math.round(h / 2), w, 1); }
    }
  });

  /* ================= LOUDNESS ================= */
  /* Duas barras (CURTO e MÉDIO), régua à esquerda e o número do LUFS médio ao lado.
     O bloco sólido de cor saiu: o número fica na cor do medidor, grande, sem caixa.
     A leitura é a mesma da v2.0. */
  CV.register('loudness', {
    name: 'Loudness', group: 'Estúdio', desc: 'LUFS curto e médio pela norma BS.1770',
    defaults: { alvo: -14, barras: 2, cmap: 'auto' },
    schema: [
      { k: 'cmap', label: 'Cor', type: 'select', opts: CV.CMAP_LIST, def: 'auto' }
    ],
    init: function (m) { m.st.sb = []; m.st.ph = []; m.st.pt = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, st = m.st;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      if (!st.sb) { st.sb = []; st.ph = []; st.pt = []; }
      var vM = d.lufsM !== undefined ? d.lufsM : -70, vS = d.lufsS !== undefined ? d.lufsS : -70;
      var vI = d.lufsAvgVal !== undefined ? d.lufsAvgVal : -70;
      if (st.sm === undefined) st.sm = vI;
      st.sm += (vI - st.sm) * (1 - Math.exp(-dt / (vI > st.sm ? 0.09 : 0.45)));
      var LMIN = -50, LMAX = 0, fs = CV.fs(m, 8.5);
      var pad = Math.max(5, Math.min(12, w * 0.04));
      var topo = fs * 0.9 + 4, base = h - fs * 1.9 - 2, trilho = Math.max(8, base - topo);
      var toY = function (vv) { return topo + (1 - (Math.max(LMIN, Math.min(LMAX, vv)) - LMIN) / (LMAX - LMIN)) * trilho; };
      var cor = corMedidor(m, 0, 0.72), corT = CV.corRGB(m, 1);
      var trilhoCor = corT ? CV.rgba(corT, 1) : CV.gridInk(m, 0.06);
      // régua
      var x0 = Math.round(pad + fs * 1.5 + 4);
      var bw = Math.max(6, Math.min(30, w * 0.1)), gap = Math.max(3, Math.round(bw * 0.35)), totW = bw * 2 + gap;
      c.font = CV.font(m, 8.5); c.textAlign = 'right';
      [0, 6, 12, 24, 36, 50].forEach(function (mk) {
        var y = Math.round(toY(-mk)) + 0.5;
        c.fillStyle = CV.gridInk(m, 0.06); c.fillRect(x0 - 2, y, totW + 4, 1);
        c.fillStyle = CV.gridInk(m, 0.4); c.fillText(String(mk), x0 - 5, y + fs * 0.35);
      });
      var vals = [vS, vI], nomes = ['CURTO', 'MÉDIO'];
      // o nome inteiro só entra se couber no passo da barra; senão vira a inicial
      c.font = CV.font(m, 7.5);
      var cabe = c.measureText('CURTO').width <= bw + gap - 6;
      for (var i = 0; i < 2; i++) {
        var alvo = vals[i];
        if (st.sb[i] === undefined) st.sb[i] = alvo;
        st.sb[i] += (alvo - st.sb[i]) * (1 - Math.exp(-dt / (alvo > st.sb[i] ? 0.06 : 0.22)));
        // marca de pico: segura 1,5s e desce devagar
        if (st.ph[i] === undefined || st.sb[i] > st.ph[i]) { st.ph[i] = st.sb[i]; st.pt[i] = 1.5; }
        else if ((st.pt[i] -= dt) <= 0) st.ph[i] -= dt * 8;
        var bx = x0 + i * (bw + gap), y = toY(st.sb[i]);
        c.fillStyle = trilhoCor; c.fillRect(bx, topo, bw, trilho);
        c.fillStyle = CV.rgba(cor, i === 0 ? 0.62 : 0.95); c.fillRect(bx, y, bw, topo + trilho - y);
        if (st.ph[i] > LMIN + 1) { c.fillStyle = CV.rgba(cor, 1); c.fillRect(bx, Math.round(toY(st.ph[i])), bw, 1.5); }
        c.font = CV.font(m, 7.5); c.textAlign = 'center'; c.fillStyle = CV.gridInk(m, 0.4);
        c.fillText(cabe ? nomes[i] : nomes[i].charAt(0), bx + bw / 2, base + fs * 1.45);
      }
      // o número: grande, na cor do medidor, sem caixa
      var lbl = st.sm <= -69 ? '-∞' : st.sm.toFixed(1);
      var xn = x0 + totW + Math.max(10, w * 0.05), sobra = w - xn - pad;
      if (sobra >= 34) {
        var fn = Math.max(11, Math.min(trilho * 0.36, sobra / 3.6, 64));
        c.font = '500 ' + fn.toFixed(1) + 'px "SF Mono", ui-monospace, monospace';
        c.textAlign = 'left'; c.fillStyle = CV.rgba(cor, 1);
        c.fillText(lbl, xn, topo + fn * 0.82);
        rotulo(c, m, 'LUFS', xn + 1, topo + fn + fs * 1.3, 'left', 0.42);
        if (sobra >= 70 && topo + fn + fs * 2.9 < h - 4) rotulo(c, m, 'curto ' + (vS <= -69 ? '-∞' : vS.toFixed(1)) + '   mom ' + (vM <= -69 ? '-∞' : vM.toFixed(1)), xn + 1, topo + fn + fs * 2.8, 'left', 0.32);
      } else {
        c.font = '500 ' + Math.max(9, fs * 1.2).toFixed(1) + 'px "SF Mono", ui-monospace, monospace';
        c.textAlign = 'right'; c.fillStyle = CV.rgba(cor, 1);
        c.fillText(lbl, w - 4, topo - 2);
      }
    }
  });

  /* ================= ESTÉREO ================= */
  /* Nuvem de pontos REDONDOS e pequenos (círculo com borda suavizada) no lugar dos
     quadradinhos de 1 a 3 pixels, que davam textura de areia. Mesma geometria: cúpula
     com a raiz no rodapé, ângulo pelo balanço, raio pela amplitude. Testei carimbo
     com degradê (drawImage por ponto): ficava lindo e custava 1ms por quadro só de
     JavaScript. O círculo no mesmo caminho sai por um quarto disso. */
  CV.register('gonio', {
    name: 'Estéreo', group: 'Estúdio', desc: 'Largura e balanço da mixagem',
    defaults: { estilo: 'cupula', cor: 'auto', ponto: 0, sens: 1, tamanho: 'encher', trail: 0.62, guias: 0, regua: 0, cmap: 'auto' },
    schema: [
      { k: 'estilo', label: 'Estilo', type: 'seg', opts: [['cupula', 'Cúpula'], ['lissa', 'Lissajous']], def: 'cupula' },
      { k: 'tamanho', label: 'Tamanho', type: 'seg', opts: [['encher', 'Encher'], ['real', 'Nível real']], def: 'encher' },
      { k: 'cor', label: 'Cor', type: 'seg', opts: [['auto', 'Do tema'], ['mapa', 'RGB'], ['lr', 'L/R'], ['fixa', 'Fixa']], def: 'auto' },
      { k: 'ponto', label: 'Ponto', type: 'range', min: 0, max: 3, step: 0.1, def: 0, fmt: 'int' }
    ],
    init: function (m) { m.st.wsm = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      CV.fade(m, c, s.trail);
      if (!d || !d.timeL) return;
      var L = d.timeL, R = d.timeR, n = Math.min(L.length, R.length), i;
      var cupula = s.estilo === 'cupula', encher = s.tamanho !== 'real';
      var padB = Math.max(4, h * 0.04);
      var cx = w / 2, cy = cupula ? h - padB : h / 2;
      var RR = cupula ? Math.min(w * 0.47, h - padB - 4) : Math.min(w, h) * 0.44;
      /* v2.2 ENCHER: a cúpula vira meia ELIPSE do formato do painel (até 2,8x mais larga
         que alta), a nuvem entra com autoganho e o ponto engorda no grave. Numa barra
         de 1440x170 a cúpula redonda cabia em 22% da largura e a nuvem em 6%. */
      var RX = RR, RY = RR, G = 0.72 * s.sens, sm = CV.som(d);
      if (encher) {
        if (cupula) { RY = Math.min(h - padB - 4, w * 0.47 * 1.5); RX = Math.min(w * 0.47, RY * 2.8); }
        else { RY = Math.min(h * 0.44, w * 0.44 * 1.4); RX = Math.min(w * 0.44, RY * 2.4); }
        G = 1.3 * CV.alvoEncher() / (2 * Math.max(0.05, sm.ondaRef));
      }
      var gS = CV.env(m, 'goG', sm.grave, dt, 0.01, 0.12);
      var sz = s.ponto > 0.05 ? s.ponto : Math.max(0.9, Math.min(1.8, Math.sqrt(w * h) / 150));
      if (encher) sz *= 1 + 0.5 * Math.min(1, gS * CV.rx(m));
      // painel grande ganha mais pontos (até as 1024 amostras do quadro), pequeno fica leve
      var step = Math.max(1, Math.round(n / Math.min(1024, 300 + Math.sqrt(w * h) * 0.9)));
      if (s.guias >= 0.5) {
        c.strokeStyle = CV.gridInk(m, 0.06); c.lineWidth = 1;
        c.beginPath();
        if (cupula) { c.ellipse(cx, cy, RX, RY, 0, Math.PI, 0); c.moveTo(cx, cy); c.lineTo(cx, cy - RY); }
        else { c.ellipse(cx, cy, RX, RY, 0, 0, Math.PI * 2); c.moveTo(cx - RX, cy); c.lineTo(cx + RX, cy); }
        c.stroke();
      }
      var bB = Math.min(1, d.bass * 1.5), bM = Math.min(1, d.mid * 2.2), bH = Math.min(1, d.high * 2.6);
      var hueBanda = (0 * bB * bB + 120 * bM * bM + 215 * bH * bH) / (bB * bB + bM * bM + bH * bH + 1e-6);
      var corG = s.cor === 'auto' ? (CV.themeOf(m) === 'minimeters' ? 'mapa' : 'tema') : s.cor;
      var gA = CV.corRGB(m, 0), gB = CV.corRGB(m, 1);
      if (corG === 'tema' && !(gA && gB)) corG = 'fixa';
      var CN = 5, AN = 4, bk = m.st._bk;
      if (!bk || bk.length !== CN * AN) { bk = m.st._bk = []; for (i = 0; i < CN * AN; i++) bk.push([]); }
      for (i = 0; i < bk.length; i++) bk[i].length = 0;
      for (i = 0; i < n; i += step) {
        var a = L[i], b = R[i], px, py, cv;
        if (cupula) {
          var sum = Math.abs(a) + Math.abs(b);
          if (sum < 1e-5) continue;
          var pan = (Math.abs(b) - Math.abs(a)) / sum;
          pan = pan < 0 ? -Math.pow(-pan, 0.45) : Math.pow(pan, 0.45);
          // no Encher a ponta encosta macia na borda (cortar em 1 empilhava uma faixa branca no arco)
          var ang = pan * Math.PI / 2, rn = encher ? CV.joelho(sum * G, 1) : Math.min(1, sum * G);
          px = cx + Math.sin(ang) * rn * RX; py = cy - Math.cos(ang) * rn * RY;
          cv = s.cor === 'lr' ? (pan + 1) * 0.5 : Math.min(1, rn * 1.15);
        } else {
          var xx = (a - b) * 0.707, yy = -(a + b) * 0.707, gl = encher ? G * 1.39 : s.sens;
          px = cx + (encher ? CV.joelho(xx * gl, 1) : xx * gl) * RX; py = cy + (encher ? CV.joelho(yy * gl, 1) : yy * gl) * RY;
          cv = Math.min(1, Math.sqrt(xx * xx + yy * yy) * 1.4);
        }
        var ai = (Math.min(0.999, 0.25 + (1 - i / n) * 0.75) * AN) | 0;
        var ci = (cv * CN) | 0; if (ci > CN - 1) ci = CN - 1; if (ci < 0) ci = 0;
        bk[ci * AN + ai].push(px, py);
      }
      CV.blend(m, c);
      var raio = Math.max(0.6, sz * 0.72), volta = Math.PI * 2;
      for (var ci2 = 0; ci2 < CN; ci2++) {
        var cpos = (ci2 + 0.5) / CN, rgb;
        if (corG === 'tema') rgb = misturaRgb(gA, gB, cpos);
        else if (corG === 'lr') rgb = cpos < 0.5 ? [240, 88, 72] : [72, 150, 245];
        else if (corG === 'fixa') rgb = corMedidor(m, 0);
        else { var lav = Math.max(0, cpos - 0.55) / 0.45; rgb = hslRgb(hueBanda, 90 - lav * 70, 50 + cpos * 18 + lav * 22); }
        for (var ai2 = 0; ai2 < AN; ai2++) {
          var arr = bk[ci2 * AN + ai2]; if (!arr.length) continue;
          c.fillStyle = CV.rgba(rgb, (ai2 + 0.5) / AN * 0.6);
          c.beginPath();
          for (var q = 0; q < arr.length; q += 2) { c.moveTo(arr[q] + raio, arr[q + 1]); c.arc(arr[q], arr[q + 1], raio, 0, volta); }
          c.fill();
        }
      }
      CV.blend(m, c, false);
    }
  });

  /* ================= OSCILOSCÓPIO ================= */
  /* Linha lisa (média de cada pedaço, desenhada em curva) com um véu até a linha do
     meio. O contorno mínimo/máximo por pixel de dispositivo dava 2.896 chamadas por
     quadro e uma borda serrilhada. A trava no tom (YIN) é a mesma. */
  CV.register('scope', {
    name: 'Osciloscópio', group: 'Estúdio', desc: 'A onda parada no tom, com a nota',
    defaults: { modo: 'pitch', ciclo: 'multi', sens: 1, tamanho: 'encher', cheio: 1, trail: 0, cmap: 'auto' },
    schema: [
      { k: 'modo', label: 'Trava', type: 'seg', opts: [['pitch', 'Tom'], ['free', 'Livre']], def: 'pitch' },
      { k: 'ciclo', label: 'Ciclo', type: 'seg', opts: [['multi', 'Múltiplo'], ['single', 'Único']], def: 'multi' },
      { k: 'tamanho', label: 'Tamanho', type: 'seg', opts: [['encher', 'Encher'], ['real', 'Nível real']], def: 'encher' },
      { k: 'cmap', label: 'Cor', type: 'select', opts: CV.CMAP_LIST, def: 'auto' }
    ],
    init: function (m) { m.st.per = 512; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s, st = m.st;
      if (s.trail > 0.001) CV.fade(m, c, s.trail); else c.clearRect(0, 0, w, h);
      if (!d || !d.time) return;
      var td = d.time, n = td.length, i;
      c.fillStyle = CV.gridInk(m, 0.06); c.fillRect(0, Math.round(h / 2), w, 1);
      // trava no tom: YIN (diferença acumulada normalizada), a cada 2 quadros
      var per = st.per || 512;
      st.pf = (st.pf || 0) + 1;
      if (s.modo === 'pitch' && st.pf % 2 === 0) {
        var win = Math.min(1024, n >> 1), lagMin = 20, lagMax = Math.min(760, n - win - 1);
        var off = n - win - lagMax; if (off < 0) { off = 0; lagMax = Math.max(lagMin + 1, n - win - 1); }
        var e0 = 0;
        for (i = 0; i < win; i += 2) e0 += td[off + i] * td[off + i];
        if (e0 > 1e-5) {
          var dd = st._dd;
          if (!dd || dd.length < lagMax + 1) dd = st._dd = new Float32Array(lagMax + 1);
          var run = 0, bestLag = 0, bestVal = 2;
          for (var lag = lagMin; lag <= lagMax; lag++) {
            var acc = 0;
            for (i = 0; i < win; i += 4) { var df = td[off + i] - td[off + i + lag]; acc += df * df; }
            dd[lag] = acc; run += acc;
            var nv = acc * (lag - lagMin + 1) / (run || 1);
            if (nv < bestVal) { bestVal = nv; bestLag = lag; }
            if (nv < 0.16 && lag > lagMin + 2 && dd[lag - 1] <= acc) { bestLag = lag - 1; bestVal = nv; break; }
          }
          /* só troca de tom quando a periodicidade é de verdade (vale fundo). Chimbal e
             chiado não têm período: antes a trava pulava pra 2kHz no meio do beat e
             a tela virava uma reta. Sem período claro, fica o último tom bom. */
          if (bestLag && bestVal < 0.3) {
            var jump = Math.abs(bestLag - per) / Math.max(1, per);
            per += (bestLag - per) * (jump > 0.35 ? 1 : Math.min(1, dt * 10));
            st.per = per;
          }
        }
      }
      var cycles = s.ciclo === 'single' ? 1 : 3;
      var span = s.modo === 'pitch' ? Math.max(64, Math.min(n - 2, Math.round(per * cycles))) : Math.floor(n / 2);
      var start = n - span - 1; if (start < 0) start = 0;
      var mid = h / 2, amp = h * 0.44 * s.sens, encher = s.tamanho !== 'real';
      var pts = Math.max(32, Math.min(700, Math.round(w / 2), span));
      if (!st.X || st.X.length !== pts) { st.X = new Float32Array(pts); st.Y = new Float32Array(pts); }
      var X = st.X, Y = st.Y, pkV = 0;
      for (i = 0; i < pts; i++) {
        var a0 = start + ((i * span / pts) | 0), a1 = start + (((i + 1) * span / pts) | 0);
        if (a1 <= a0) a1 = a0 + 1;
        var sm = 0, cnt = 0;
        for (var q = a0; q < a1 && q < n; q++) { sm += td[q]; cnt++; }
        X[i] = i / (pts - 1) * w;
        Y[i] = cnt ? sm / cnt : 0;
        if (Y[i] > pkV) pkV = Y[i]; else if (-Y[i] > pkV) pkV = -Y[i];
      }
      /* v2.2 ENCHER: o osciloscópio mede o pico da PRÓPRIA curva (sobe em 30ms, desce em
         1,5s) e ajusta a altura pra ele bater em 95% da metade do painel. A média de
         cada pedaço come o pico do agudo, então o pico do som não serviria de régua. */
      var gO = 1;
      if (encher) {
        if (st.opk === undefined) st.opk = pkV;
        st.opk = pkV > st.opk ? st.opk + (pkV - st.opk) * (1 - Math.exp(-dt / 0.03)) : st.opk * Math.exp(-dt / 1.5);
        if (st.opk < 0.012) st.opk = 0.012;
        gO = Math.min(12, CV.alvoEncher() / st.opk);
        amp = h * 0.47;
      }
      for (i = 0; i < pts; i++) {
        var yv = Y[i] * gO;
        Y[i] = mid - (encher ? CV.joelho(yv, 1.02) : Math.max(-1.05, Math.min(1.05, yv))) * amp;
      }
      var col = corMedidor(m, 0, 0.88), colF = CV.corRGB(m, 1);
      c.lineJoin = 'round';
      if (s.cheio >= 0.5) {
        c.fillStyle = colF ? CV.rgba(colF, 0.8) : CV.rgba(col, 0.16);
        c.beginPath(); CV.curva(c, X, Y, pts); c.lineTo(w, mid); c.lineTo(0, mid); c.closePath(); c.fill();
      }
      c.strokeStyle = CV.rgba(col, 1); c.lineWidth = 1.4;
      c.beginPath(); CV.curva(c, X, Y, pts); c.stroke();
      if (s.modo === 'pitch' && d.sr && h > 40) {
        var f0 = d.sr / Math.max(1, per);
        if (f0 > 25 && f0 < 4000 && d.rms > 0.004) rotulo(c, m, CV.noteName(f0) + '  ' + CV.fmtHz(f0), 7, h - 7, 'left', 0.42);
      }
    }
  });

  /* ================= ESPECTROGRAMA ================= */
  CV.register('spectrogram', {
    name: 'Espectrograma', group: 'Estúdio', buffered: true, desc: 'Histórico das frequências',
    defaults: { sens: 1, speed: 1, contraste: 1.5, cmap: 'auto' },
    schema: [
      { k: 'sens', label: 'Ganho', type: 'range', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'speed', label: 'Rolagem', type: 'range', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'contraste', label: 'Contraste', type: 'range', min: 0.6, max: 3, step: 0.05, def: 1.5 },
      { k: 'cmap', label: 'Cor', type: 'select', opts: CV.CMAP_LIST, def: 'auto' }
    ],
    init: function (m) {},
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      var buf = offscreen(m, 'buf'), bc = buf.getContext('2d');
      if (!d) { c.clearRect(0, 0, w, h); return; }
      var dx = CV.passo(m, 1.2 * s.speed * (m.dpr || 1), dt);
      var FMIN = 30, FMAX = 16000;
      if (dx >= 1) CV.registry.spectrogram.coluna(m, d, s, buf, bc, dx, FMIN, FMAX);
      CV.scrollRing.blit(m, 'buf', buf, c, w, h, m.st._pa || 0);
      // hover: qual frequência é essa linha (a cada quadro: antes piscava a 120Hz)
      if (m.mouse && m.mouse.over) {
        var fr2 = FMIN * Math.pow(FMAX / FMIN, 1 - m.mouse.y / h);
        c.strokeStyle = CV.isLight(m) ? 'rgba(20,20,18,0.5)' : 'rgba(240,239,233,0.45)';
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(0, m.mouse.y); c.lineTo(w, m.mouse.y); c.stroke();
        var txt = CV.fmtHz(fr2) + ' · ' + CV.noteName(fr2);
        c.font = CV.font(m, 10);
        var tw = c.measureText(txt).width;
        c.fillStyle = CV.isLight(m) ? 'rgba(245,243,236,0.9)' : 'rgba(7,7,11,0.85)';
        c.fillRect(6, m.mouse.y - 20, tw + 8, 15);
        c.fillStyle = CV.isLight(m) ? '#141412' : '#f0efe9';
        c.textAlign = 'left';
        c.fillText(txt, 10, m.mouse.y - 8);
      }
    },
    coluna: function (m, d, s, buf, bc, dx, FMIN, FMAX) {
      CV.blend(m, bc, false);
      var H = buf.height, n = d.freq.length;
      var x = CV.scrollRing.next(m, 'buf', buf, bc, dx);
      /* MAIS LINHAS, E CADA UMA LEVA O MAIOR DO INTERVALO DELA.
         Duas coisas apertavam a imagem. O teto de 160 linhas: num painel alto em
         Retina sobrava pixel sem informação, e a faixa saía em degraus grossos. E
         a escolha do bin MAIS PRÓXIMO: nos agudos vários bins caem na mesma linha,
         e pegar o mais próximo joga fora o pico que estava ao lado, então prato e
         chimbal saíam apagados. Agora a linha leva o maior do intervalo, o mesmo
         critério que o espectro usa. O custo é uma varredura de n bins por coluna,
         que é a mesma conta que a FFT já entregou pronta. */
      var rows = Math.min(720, Math.max(24, Math.round(H)));
      /* v2: A FFT DE 4096 DO ESPECTRO, em dBFS, no lugar da de 1024 da v1. Cada raia
         caiu de 23Hz pra 11,7Hz: no grave a faixa parava de sair em blocos (de 30 a
         200Hz eram 7 raias pra pintar a altura inteira). Inclinação de 3dB por oitava
         a partir de 1kHz, senão o agudo de qualquer música sai apagado. */
      var sdb = d.spectrum ? d.spectrum(4096) : null;
      var nb2 = sdb ? sdb.length : n, bHz = sdb ? d.specBinHz : d.binHz;
      var tab = CV.binTableFull(m, 'sg', rows, nb2, bHz, FMIN, FMAX, true);
      var bins = tab.bins, hzs = tab.hz;
      var rh = H / rows + 1;
      for (var r = 0; r < rows; r++) {
        // a tabela vem invertida (linha 0 = agudo), então o intervalo desce
        var b0 = bins[r], b1 = r < rows - 1 ? bins[r + 1] : b0;
        var bLo = b1 < b0 ? b1 : b0, bHi = b1 < b0 ? b0 : b1, raw, qb, lv;
        if (sdb) {
          raw = sdb[b0];
          if (bHi > bLo + 1) { for (qb = bLo; qb <= bHi; qb++) if (sdb[qb] > raw) raw = sdb[qb]; }
          else {
            /* v2.1: no grave cada raia cobre várias linhas, e a linha pegava a raia
               mais próxima: o grave saía em degraus. Agora interpola entre as raias
               (Catmull-Rom, a mesma do espectro) e vira degradê. */
            var pf = hzs[r] / bHz, i0 = pf | 0; if (i0 < 1) i0 = 1; if (i0 > nb2 - 3) i0 = nb2 - 3;
            var fr = pf - i0, ya = sdb[i0 - 1], yb = sdb[i0], yc = sdb[i0 + 1], yd = sdb[i0 + 2];
            raw = yb + 0.5 * fr * (yc - ya + fr * (2 * ya - 5 * yb + 4 * yc - yd + fr * (3 * (yb - yc) + yd - ya)));
          }
          lv = (raw + 3 * Math.log(hzs[r] / 1000) / Math.LN2 + 92) / 70;
        } else {
          raw = d.freq[b0];
          if (bHi > bLo + 1) { raw = 0; for (qb = bLo; qb <= bHi; qb++) if (d.freq[qb] > raw) raw = d.freq[qb]; }
          lv = raw / 255;
        }
        if (lv <= 0) continue;
        var v = Math.pow(lv > 1 ? 1 : lv, s.contraste) * s.sens; if (v > 1) v = 1;
        if (v < 0.04) continue;
        // energia direto no COLOR MAP: é o que o MiniMeters faz e o que dá o gradiente rico
        bc.fillStyle = CV.cmap(m, v, Math.min(1, 0.2 + v));
        bc.fillRect(x, r / rows * H, dx, rh);
      }
    }
  });

  /* ================= VU (o sétimo medidor do MiniMeters) =================
     Ponteiro de VU de verdade: a escala é linear em TENSÃO, não em dB. Por isso o
     0 VU cai a 71% do arco e o -20 fica espremido no começo, igual ao aparelho.
     Balística de 300 milésimos, subindo e descendo no mesmo tempo, que é o que
     define um VU. A referência diz quantos dBFS valem 0 VU: -18 é o padrão de estúdio. */
  var VU_MARKS = [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3];
  function vuPos(db) {
    var p = Math.pow(10, db / 20) / 1.4125;   // 1.4125 = +3 VU no fim do arco
    return p < 0 ? 0 : p > 1.06 ? 1.06 : p;
  }
  CV.register('vu', {
    name: 'VU', group: 'Estúdio', desc: 'Ponteiro analógico com balística de 300 ms',
    /* REFERÊNCIA PADRÃO -8 dBFS. Em -18 (o padrão de mixagem) um beat masterizado a
       -12 LUFS deixa o ponteiro grudado no fim da escala e o VU vira enfeite; em -8 ele
       dança em volta do 0 e entra no vermelho no kick. Pra mixar, troque pra -18. */
    defaults: { estilo: 'agulha', ref: -8 },
    schema: [
      { k: 'estilo', label: 'Estilo', type: 'seg', opts: [['agulha', 'Agulha'], ['barra', 'Barra']], def: 'agulha' },
      { k: 'ref', label: '0 VU em', type: 'seg', opts: [[-18, '-18 mix'], [-12, '-12'], [-8, '-8 master']], def: -8 }
    ],
    init: function (m) { m.st.p = [0, 0]; m.st.led = [0, 0]; m.st.hold = [0, 0]; m.st.holdT = [0, 0]; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s, st = m.st;
      c.clearRect(0, 0, w, h);
      if (!st.p) this.init(m);
      // nível de cada lado nas amostras novas do quadro
      var pos = [0, 0], over = [false, false];
      if (d && d.timeL) {
        var n = d.timeL.length;
        var fresh = Math.min(n, Math.max(256, Math.round((d.sr || 48000) * dt * 1.2)));
        var src = [d.timeL, d.timeR];
        for (var ch = 0; ch < 2; ch++) {
          var arr = src[ch], acc = 0, pk = 0;
          for (var i = n - fresh; i < n; i++) { var x = arr[i]; acc += x * x; if (x > pk) pk = x; else if (-x > pk) pk = -x; }
          var rms = Math.sqrt(acc / fresh);
          // RMS x raiz de 2 lê como o pico de um seno, que é como VU se calibra
          var db = rms > 1e-7 ? 20 * Math.log10(rms * Math.SQRT2) - (+s.ref || -8) : -60;
          pos[ch] = vuPos(db);
          over[ch] = pk > 0.891;   // -1 dBFS na amostra
        }
      }
      var k = 1 - Math.exp(-dt / 0.065);
      for (var q = 0; q < 2; q++) {
        st.p[q] += (pos[q] - st.p[q]) * k;
        st.led[q] = (over[q] || st.p[q] > 0.89) ? 0.5 : Math.max(0, st.led[q] - dt);
        if (st.p[q] >= st.hold[q] || st.holdT[q] <= 0) { st.hold[q] = st.p[q]; st.holdT[q] = 1.4; }
        else st.holdT[q] -= dt;
      }
      var light = CV.isLight(m);
      var ink = CV.corMod(m, 0) || CV.hsla(CV.isMono(m) ? [0, 0, light ? 10 : 94] : CV.pal(m, 0, t), 0.95);
      var red = CV.corMod(m, 1) || (light ? 'hsl(354,70%,40%)' : 'hsl(354,84%,62%)');
      var escala = CV.gridInk(m, 0.42), texto = CV.gridInk(m, 0.6);
      var lados = ['L', 'R'];

      if (s.estilo === 'barra' || w < 70 || h < 46) {
        /* BARRA: escala em dB linear de -20 a +3, que lê melhor em tira. */
        var deitada = w >= h;
        var fsB = CV.fs(m, 8.5);
        for (var b = 0; b < 2; b++) {
          var vdb = st.p[b] > 0.0005 ? 20 * Math.log10(st.p[b] * 1.4125) : -40;
          var hdb = st.hold[b] > 0.0005 ? 20 * Math.log10(st.hold[b] * 1.4125) : -40;
          var u = Math.max(0, Math.min(1, (vdb + 20) / 23)), uh = Math.max(0, Math.min(1, (hdb + 20) / 23));
          var u0 = 20 / 23;
          if (deitada) {
            var bx = fsB * 2.2, bw = w - bx - 8, bh = Math.max(4, (h - fsB * 3) / 2 - 4), by = fsB * 1.4 + b * (bh + 6);
            c.fillStyle = CV.gridInk(m, 0.07); c.fillRect(bx, by, bw, bh);
            c.fillStyle = ink; c.fillRect(bx, by, bw * Math.min(u, u0), bh);
            if (u > u0) { c.fillStyle = red; c.fillRect(bx + bw * u0, by, bw * (u - u0), bh); }
            c.fillStyle = uh > u0 ? red : ink; c.fillRect(bx + bw * uh - 1, by, 2, bh);
            c.font = CV.font(m, 8.5); c.textAlign = 'right'; c.fillStyle = texto;
            c.fillText(lados[b], bx - 5, by + bh / 2 + fsB * 0.35);
            if (b === 1) {
              c.textAlign = 'center';
              [-20, -10, -5, -3, 0, 3].forEach(function (mk) {
                var tx = bx + bw * (mk + 20) / 23;
                c.fillStyle = mk > 0 ? red : texto;
                c.fillText(mk > 0 ? '+' + mk : String(mk), tx, by + bh + fsB * 1.3);
              });
            }
          } else {
            var bw2 = Math.max(4, Math.min(26, w * 0.24)), gap2 = 6, x0 = w / 2 - bw2 - gap2 / 2 + b * (bw2 + gap2);
            var top = fsB * 1.6, bh2 = h - top - fsB * 2;
            c.fillStyle = CV.gridInk(m, 0.07); c.fillRect(x0, top, bw2, bh2);
            var yv = top + bh2 * (1 - Math.min(u, u0));
            c.fillStyle = ink; c.fillRect(x0, yv, bw2, top + bh2 - yv);
            if (u > u0) { c.fillStyle = red; c.fillRect(x0, top + bh2 * (1 - u), bw2, bh2 * (u - u0)); }
            c.fillStyle = uh > u0 ? red : ink; c.fillRect(x0, top + bh2 * (1 - uh) - 1, bw2, 2);
            c.font = CV.font(m, 8.5); c.textAlign = 'center'; c.fillStyle = texto;
            c.fillText(lados[b], x0 + bw2 / 2, h - fsB * 0.6);
          }
        }
        return;
      }

      /* AGULHA: dois mostradores, lado a lado se o painel é largo, empilhados se é alto. */
      var lado = w / h > 1.5;
      var fw = lado ? w / 2 : w, fh = lado ? h : h / 2;
      var fs = CV.fs(m, 8.5);
      for (var f = 0; f < 2; f++) {
        var fx = lado ? f * fw : 0, fy = lado ? 0 : f * fh;
        // o pivô fica um pouco abaixo do mostrador, como no aparelho
        var R = Math.min((fh - fs * 1.6 - 4) / 0.9, (fw - 12) / 1.7 - fs);
        if (R < 14) R = 14;
        var cx = fx + fw / 2, cy = fy + fh + R * 0.1 - 2;
        var A0 = -0.84, A1 = 0.84;   // ±48°
        var ang = function (p) { return A0 + (A1 - A0) * p; };
        c.save();
        c.beginPath(); c.rect(fx, fy, fw, fh); c.clip();
        // arco da escala: fio até o 0, vermelho mais grosso do 0 ao +3
        c.lineWidth = 1; c.strokeStyle = escala;
        c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + ang(0.05), -Math.PI / 2 + ang(vuPos(0))); c.stroke();
        c.lineWidth = Math.max(2, R * 0.03); c.strokeStyle = red;
        c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + ang(vuPos(0)), -Math.PI / 2 + ang(1)); c.stroke();
        // marcas e números
        c.font = CV.font(m, 8.5); c.textAlign = 'center';
        var poucos = R < 46;
        for (var mi = 0; mi < VU_MARKS.length; mi++) {
          var mk2 = VU_MARKS[mi], a2 = ang(vuPos(mk2)), sn = Math.sin(a2), cs = Math.cos(a2);
          var r0 = R - Math.max(4, R * 0.08), r1 = R;
          c.strokeStyle = mk2 > 0 ? red : escala; c.lineWidth = 1;
          c.beginPath(); c.moveTo(cx + sn * r0, cy - cs * r0); c.lineTo(cx + sn * r1, cy - cs * r1); c.stroke();
          if (poucos && [-20, -10, -5, 0, 3].indexOf(mk2) < 0) continue;
          var rl = R + fs * 0.95;
          c.fillStyle = mk2 > 0 ? red : texto;
          c.fillText(String(Math.abs(mk2)), cx + sn * rl, cy - cs * rl + fs * 0.35);
        }
        // VU no meio do mostrador e o lado no canto
        c.font = CV.font(m, 10, 600); c.fillStyle = CV.gridInk(m, 0.34);
        c.fillText('VU', cx, cy - R * 0.45);
        c.font = CV.font(m, 8.5); c.textAlign = 'left'; c.fillStyle = texto;
        c.fillText(lados[f], fx + 7, fy + fh - 7);
        // agulha
        var an = ang(Math.min(1.06, st.p[f]));
        c.strokeStyle = ink; c.lineWidth = Math.max(1.25, R * 0.018);
        c.beginPath(); c.moveTo(cx + Math.sin(an) * R * 0.18, cy - Math.cos(an) * R * 0.18);
        c.lineTo(cx + Math.sin(an) * R * 1.02, cy - Math.cos(an) * R * 1.02); c.stroke();
        // led de pico
        c.fillStyle = st.led[f] > 0 ? red : CV.gridInk(m, 0.12);
        c.beginPath(); c.arc(fx + fw - 9, fy + 9, 2.6, 0, Math.PI * 2); c.fill();
        c.restore();
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
    '  float lum = 0.06 + f*f*(0.85 + u_bass*0.9) + u_bass*0.32 + mpush*0.5;',
    '  col *= lum;',
    '  col += u_high * 0.18 * pow(noise(p*40.0 + t*8.0), 6.0);',
    '  col += u_beat * 0.12;',
    /* vinheta pela PROPORÇÃO do painel (era pelo lado menor: numa barra de 1440x170
       tudo além de 1,2 altura do centro ficava preto e o PSY acendia 13% da faixa).
       No kick ela abre e o líquido toma o painel inteiro. */
    '  vec2 vv = (gl_FragCoord.xy / u_res - 0.5) * 2.0;',
    '  float vig = 1.0 - dot(vv,vv) * 0.17 * (1.0 - 0.55*min(u_bass, 1.0));',
    '  gl_FragColor = vec4(col * vig * (0.02 + 0.98*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('psy', {
    name: 'PSY', group: 'Arte', webgl: true, desc: 'Líquido psicodélico que derrete no grave',
    defaults: defs({ warp: 3, zoom: 1.6, mousef: 1 }),
    schema: [
      { k: 'sens', label: 'Reação', min: 0.2, max: 2.5, step: 0.05, def: 1, fmt: 'pct' },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'warp', label: 'Derretimento', min: 0.5, max: 8, step: 0.1, def: 3 },
      { k: 'zoom', label: 'Zoom', min: 0.5, max: 4, step: 0.05, def: 1.6 },
      { k: 'mousef', label: 'Reação ao mouse', min: 0, max: 2, step: 0.1, def: 1 }
    ],
    init: function (m) { CV.glSetup(m, PSY_FRAG); },
    draw: function (m, d, dt, t) {
      /* u_a carrega derretimento x mouse. v2.2: o grave derrete (de metade do
         derretimento no vale até quase o dobro no kick) e APROXIMA: o zoom cai até
         ~40% no kick, então a mancha cresce na batida e volta no vale. */
      var sm = CV.som(d), ax = CV.rx(m);
      var gS = CV.env(m, 'psyG', sm.grave, dt, 0.015, 0.12);
      var mouse = m.mouse && m.mouse.over ? (1 + m.s.mousef * 0.4) : 1;
      var warp = m.s.warp * (0.5 + (d ? (0.75 * gS + 0.45 * sm.soco) * ax : 0)) * mouse;
      var zoom = m.s.zoom / (1 + 0.42 * Math.min(1.5, (0.55 * gS + 0.6 * sm.soco) * ax));
      if (!CV.glFrame(m, d, dt, warp, zoom)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, m.w, m.h);
      }
    }
  });


  /* ================= LISSAJOUS ================= */
  CV.register('lissa', {
    name: 'Lissajous', group: 'Arte', desc: 'Figura de fase desenhada pelo som',
    defaults: defs({ trail: 0.8, modo: 0 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.8 },
      { k: 'modo', label: 'Harmônico', min: 0, max: 1, step: 1, def: 0 }
    ]),
    init: function (m) { m.st.rot = 0; },
    /* v2.2: a figura enche o painel e respira no grave.
       Antes: amostra crua x 42% do lado MENOR. Com a música a -12 LUFS a figura ocupava
       25% da largura num painel 640x360 e 6% numa barra de 1440x170.
       Agora: autoganho (o pico recente da música vai a 60% do raio, antes de abrir o
       miolo), um raio pra cada eixo (a barra larga ganha figura larga), o kick empurra
       de 72% a 100% e um joelho macio segura a ponta antes da borda. */
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      CV.fade(m, c, s.trail);
      if (!d) return;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var gS = CV.env(m, 'lsG', sm.grave, dt, 0.01, 0.1);
      var rotSpeed = 0.02 + gate * 0.35 + 0.9 * sm.soco * Math.min(1.5, ax);
      if (m.mouse && m.mouse.over) rotSpeed += (m.mouse.x / w - 0.5) * 1.2;
      m.st.rot += dt * rotSpeed * s.speed;
      // um raio por eixo, com teto de 5:1: numa barra muito larga a figura vira faixa, não risco
      var cx = w / 2, cy = h / 2, sy = Math.min(h * 0.47, w * 0.47 * 5), sx = Math.min(w * 0.47, sy * 5);
      var pump = CV.respira(m, 0.55 * gS + 0.7 * sm.soco, 0.72);
      if (m.mouse && m.mouse.over) pump *= 1 + (0.5 - m.mouse.y / h) * 0.4;
      var cr = Math.cos(m.st.rot), sr = Math.sin(m.st.rot);
      var col = CV.pal(m, 0, t);
      CV.blend(m, c);
      /* abre o miolo (raio^0,65: a nuvem de fase sai do caroço e ocupa o painel) e
         segura a ponta num joelho macio: passou de 0,86, encosta devagar na borda */
      var abre = s.modo < 0.5;
      var pX = function (x, y) {
        var r = Math.sqrt(x * x + y * y);
        if (abre && r > 1e-6) { var e = Math.pow(r, -0.35); x *= e; y *= e; r *= e; }
        var xr = x * cr - y * sr, yr = x * sr + y * cr;
        if (r > 0.86) { var k = (0.86 + 0.14 * Math.tanh((r - 0.86) / 0.14)) / r; xr *= k; yr *= k; }
        _lp[0] = cx + xr * sx; _lp[1] = cy + yr * sy;
        return _lp;
      };
      var P;
      if (s.modo >= 0.5) {
        var gH = CV.env(m, 'lsH', gS, dt, 0.25, 0.6), hH = CV.env(m, 'lsA', sm.agudo, dt, 0.25, 0.6);
        var a = 2 + Math.round(Math.min(1, gH * ax) * 4), b2 = 3 + Math.round(Math.min(1, hH * ax) * 5);
        var ph = t * 0.5 * s.speed, amp = 0.9 * pump * (0.2 + 0.8 * gate);
        c.strokeStyle = CV.hsla(col, 0.32 * (0.1 + 0.9 * gate));
        c.lineWidth = CV.lw(m, 0.9);
        c.beginPath();
        var STEPS = CV.det(m, 700, 1800);
        for (var i2 = 0; i2 <= STEPS; i2++) {
          var u = i2 / STEPS * 6.283 * 2;
          P = pX(Math.sin(a * u + ph) * amp * (0.8 + 0.2 * Math.sin(u * 3 + t)), Math.sin(b2 * u) * amp * (0.8 + 0.2 * Math.cos(u * 2 - t)));
          i2 === 0 ? c.moveTo(P[0], P[1]) : c.lineTo(P[0], P[1]);
        }
        c.stroke();
      } else {
        var L = d.timeL, R = d.timeR, n = Math.min(L.length, R.length);
        var g = CV.ganhoOnda(d, 0.6) * Math.pow(pump, 1.54);   // pump^1,54 compensa o ^0,65 do miolo
        c.lineWidth = CV.lw(m, 0.7);
        // a cada 4 amostras a figura fica facetada em painel grande: lá o passo cai pra 2
        var passo = w > 640 ? 2 : 4;
        for (var layer = 0; layer < 3; layer++) {
          var off = layer * 90, gl2 = g * (1 + layer * 0.12);
          var cl = CV.pal(m, layer, t);
          c.strokeStyle = CV.hsla(cl, 0.24 * (0.1 + 0.9 * gate));
          c.beginPath();
          for (var j = 0; j + off < n; j += passo) {
            P = pX(L[j] * gl2, R[j + off] * gl2);
            j === 0 ? c.moveTo(P[0], P[1]) : c.lineTo(P[0], P[1]);
          }
          c.stroke();
        }
      }
      CV.blend(m, c, false);
    }
  });
  var _lp = [0, 0];

  /* ================= TRAÇO (linha viva) ================= */
  CV.register('trace', {
    name: 'Traço', group: 'Arte', desc: 'Linha viva que respira com a música',
    defaults: defs({ trail: 0.7, tensao: 1 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 },
      { k: 'tensao', label: 'Tensão', min: 0.2, max: 3, step: 0.05, def: 1 }
    ]),
    init: function (m) { m.st.ys = null; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      CV.fade(m, c, s.trail);
      if (!d) return;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var N = CV.det(m, 140, 420), i;
      if (!m.st.ys || m.st.ys.length !== N) { m.st.ys = new Float32Array(N); m.st.pt = m.st.pt || 0; }
      m.st.pt += dt * s.speed * (0.05 + gate * 1.4 + 0.8 * sm.soco * Math.min(1.5, ax));
      var pt2 = m.st.pt, ys = m.st.ys;
      var td = d.time, step = Math.floor(td.length / N);
      var k = Math.min(1, dt * (4 + s.tensao * 8));
      /* v2.2: a onda entra com autoganho (o pico recente vai a 40% da altura), a
         ondulação lenta cresce com o grave e o kick estufa a linha inteira (de 85% a
         100%). Era amostra crua x 34%: a linha ocupava a metade do meio do painel. */
      var gS = CV.env(m, 'trG', sm.grave, dt, 0.012, 0.12);
      var gW = CV.ganhoOnda(d, 1, 10);
      var pump = CV.respira(m, 0.55 * gS + 0.6 * sm.soco, 0.85);
      var ond = h * 0.22 * (0.9 + Math.min(1.3, (0.55 * sm.medio + 0.9 * gS) * ax));
      for (i = 0; i < N; i++) {
        var env = Math.sin(i / (N - 1) * Math.PI); // pontas presas nas bordas
        var wave = CV.abreMiolo(td[i * step] * gW) * h * 0.4;
        var drift = Math.sin(i * 0.05 + pt2 * 2.0) * Math.cos(i * 0.021 - pt2 * 1.3) * ond;
        ys[i] += ((wave + drift) * env * gate * pump - ys[i]) * k;
      }
      // tensão: a linha se alisa como corda
      for (var pass = 0; pass < 2; pass++)
        for (i = 1; i < N - 1; i++) ys[i] += ((ys[i - 1] + ys[i + 1]) * 0.5 - ys[i]) * 0.5;
      // joelho macio só no desenho: a corda encosta na borda sem sair do painel
      var yd = m.st.yd && m.st.yd.length === N ? m.st.yd : (m.st.yd = new Float32Array(N));
      for (i = 0; i < N; i++) yd[i] = h / 2 + CV.joelho(ys[i], h * 0.47);
      var col = CV.isMono(m) ? [0, 0, 96] : CV.pal(m, 0, t);
      c.strokeStyle = CV.hsla(col, 0.3 + gate * 0.6);
      c.lineWidth = CV.lw(m, 1.4);
      c.beginPath();
      c.moveTo(0, yd[0]);
      for (i = 1; i < N - 1; i++) {
        var x0 = i / (N - 1) * w, x1 = (i + 1) / (N - 1) * w;
        c.quadraticCurveTo(x0, yd[i], (x0 + x1) / 2, (yd[i] + yd[i + 1]) / 2);
      }
      c.lineTo(w, yd[N - 1]);
      c.stroke();
    }
  });

  /* ================= CAMPO DE FLUXO ================= */
  CV.register('flow', {
    name: 'Fluxo', group: 'Arte', desc: 'Pó de partículas num campo de vento',
    defaults: defs({ dens: 1, trail: 0.8 }),
    schema: COMMON.concat([
      { k: 'dens', label: 'Densidade', min: 0.3, max: 2.5, step: 0.05, def: 1 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.8 }
    ]),
    init: function (m) { m.st.ps = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      CV.fade(m, c, s.trail);
      if (!d) return;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var gS = CV.env(m, 'flG', sm.grave, dt, 0.01, 0.12);
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.03 + gate * 0.9 + sm.soco * 0.6 * Math.min(1.5, ax));
      var pt2 = m.st.pt;
      var ps = m.st.ps, want = Math.round(CV.det(m, 520, 1600) * s.dens);
      while (ps.length < want) ps.push({ x: Math.random() * w, y: Math.random() * h, life: Math.random(), b: Math.random() });
      if (ps.length > want) ps.length = want;
      /* v2.2: o grave EMPURRA o campo. Velocidade, curva do vento, tamanho do grão e
         uma expansão a partir do centro saem do grave e do soco, então o pó inteiro
         abre na batida e se recolhe devagar no vale. Antes a velocidade saía de um
         grave cravado no talo e o pó andava sempre no mesmo passo. */
      var energy = Math.min(1.2, 0.25 + 0.75 * sm.energia);
      var k1 = 0.011, k2 = 0.014, turb = 1 + Math.min(2.2, 1.4 * gS * ax);
      var kV = Math.max(0.7, Math.min(2.4, Math.sqrt(w * h) / 380));
      var abre = (Math.min(1.6, (0.3 * gS + 1.7 * sm.soco) * ax) - 0.12) * dt, cxF = w / 2, cyF = h / 2;
      var grao = 1 + Math.min(0.7, 0.5 * gS * ax);
      CV.blend(m, c);
      var mono = CV.isMono(m);
      /* 520 partículas EM LOTES: 4 cores × 5 faixas de opacidade = 20 trocas de cor por
         quadro, no lugar de 520 frases de cor (31 mil por segundo). */
      var CN = mono ? 1 : 4, AN = 5, bk = m.st._bk;
      if (!bk || bk.length !== CN * AN) { bk = m.st._bk = []; for (var z = 0; z < CN * AN; z++) bk.push([]); }
      for (z = 0; z < bk.length; z++) bk[z].length = 0;
      var vstep = (8 + 70 * energy + Math.min(2.4, 1.0 * gS + 1.3 * sm.soco) * ax * 140) * kV * dt;
      var jit = sm.agudo * Math.min(2, ax) * 5, gm = 0.1 + 0.9 * gate;
      var maxA = 0.03 + 0.7 * (0.25 + energy);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        var a = (Math.sin(p.y * k1 + pt2 * 1.7) + Math.cos(p.x * k2 - pt2 * 1.2)) * Math.PI * turb;
        p.x += Math.cos(a) * vstep + (Math.random() - 0.5) * jit + (p.x - cxF) * abre;
        p.y += Math.sin(a) * vstep + (Math.random() - 0.5) * jit + (p.y - cyF) * abre;
        p.life -= dt * 0.22;
        if (p.life <= 0 || p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4) {
          p.x = Math.random() * w; p.y = Math.random() * h; p.life = 1; p.b = Math.random();
          continue;
        }
        var star2 = p.b > 0.92;
        var al = (0.03 + (star2 ? 0.7 : 0.16) * p.life * (0.25 + energy)) * gm;
        var ai = (al / maxA * AN) | 0; if (ai > AN - 1) ai = AN - 1; if (ai < 0) ai = 0;
        var ci = mono ? 0 : ((p.b * 4) | 0) & 3;
        bk[ci * AN + ai].push(p.x, p.y, (star2 ? 2.2 : 1.1) * grao);
      }
      for (var ci2 = 0; ci2 < CN; ci2++) {
        var pcol = mono ? [0, 0, 100] : CV.pal(m, ci2, t);
        for (var ai2 = 0; ai2 < AN; ai2++) {
          var pts = bk[ci2 * AN + ai2]; if (!pts.length) continue;
          c.fillStyle = CV.hsla(pcol, maxA * (ai2 + 0.5) / AN * gm);
          c.beginPath();
          for (var k4 = 0; k4 < pts.length; k4 += 3) c.rect(pts[k4], pts[k4 + 1], pts[k4 + 2], pts[k4 + 2]);
          c.fill();
        }
      }
      CV.blend(m, c, false);
    }
  });


  /* ================= ONDAS EM CAMADAS ================= */
  CV.register('wavelayers', {
    name: 'Camadas', group: 'Arte', desc: 'Ondas empilhadas em relevo',
    defaults: defs({ camadas: 14 }),
    schema: COMMON.concat([{ k: 'camadas', label: 'Camadas', min: 6, max: 24, step: 1, def: 14 }]),
    init: function (m) { m.st.hist = []; m.st.skip = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      c.clearRect(0, 0, w, h);
      if (!d) return;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var K = Math.round(s.camadas);
      var gS = CV.env(m, 'wlG', sm.grave, dt, 0.01, 0.12);
      /* v2.2b: a PILHA INTEIRA respira no grave. Medido na bancada: com o kick só no
         retrato novo, a pilha sempre carregava um beat inteiro de cristas (14 camadas =
         0,7s) e ficava do mesmo tamanho no kick e no vale (altura 0,68 > 0,65). Agora o
         kick estica a pilha pra cima (o topo sobe de 20% pra 4% da altura) e estufa
         todas as cristas; no vale ela assenta. O pé fica preso no rodapé. */
      var pk = CV.env(m, 'wlP', Math.min(1, (0.55 * gS + 0.7 * sm.soco) * ax), dt, 0.012, 0.15);
      var infla = 0.8 + 0.45 * pk;
      /* v2.2: cada retrato já nasce com autoganho e com o tamanho do grave daquele
         instante. A pilha vira um registro do ritmo: a camada do kick sobe alta, a do
         vale fica baixa. Antes era amostra crua x 16% da altura. */
      if (++m.st.skip % Math.max(1, Math.round(3 / s.speed)) === 0) {
        var td = d.time, P = CV.det(m, 96, 288), snap = new Float32Array(P);
        var stp = Math.floor(td.length / P);
        var gk = CV.ganhoOnda(d, 0.95, 8) * CV.respira(m, 0.6 * gS + 0.6 * sm.soco, 0.5);
        for (var i = 0; i < P; i++) snap[i] = td[i * stp] * gk;
        m.st.hist.push(snap);
        if (m.st.hist.length > K) m.st.hist.shift();
      }
      var hist = m.st.hist, L = hist.length;
      if (!L) return;
      var mono = CV.isMono(m);
      // a pilha desce do alto até o rodapé, e as cristas da frente sobem por cima das de trás
      var top = h * (0.2 - 0.16 * pk), span = h * 0.94 - top;
      for (var j = 0; j < L; j++) {
        var depth = j / Math.max(1, L - 1); // 1 = mais recente, embaixo
        var snap2 = hist[j];
        var yBase = top + depth * span;
        var amp = h * 0.24 * infla * (0.4 + depth * 0.6) * (0.15 + 0.85 * gate);
        var col = mono ? [0, 0, 100] : CV.pal(m, j, t);
        var alpha = 0.08 + depth * 0.72;
        c.strokeStyle = CV.hsla(col, alpha);
        c.lineWidth = CV.lw(m, 0.8 + depth * 0.7);
        c.beginPath();
        for (var x2 = 0; x2 < snap2.length; x2++) {
          var px = x2 / (snap2.length - 1) * w;
          var sobe = Math.abs(snap2[x2]) * amp + snap2[x2] * amp * 0.4;
          var py = yBase - (sobe > 0 ? CV.joelho(sobe, yBase - 1) : sobe);
          x2 === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.stroke();
      }
    }
  });

  /* ================= FITA (linhas de seda) ================= */
  CV.register('silk', {
    name: 'Fita', group: 'Arte', desc: 'Fios de seda perseguindo o som',
    defaults: defs({ trail: 0.82, fios: 5 }),
    schema: COMMON.concat([
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.82 },
      { k: 'fios', label: 'Fios', min: 2, max: 9, step: 1, def: 5 }
    ]),
    init: function (m) { m.st.threads = []; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      if (!d) { CV.fade(m, c, s.trail); return; }
      var want = Math.round(s.fios);
      while (m.st.threads.length < want) {
        var idx = m.st.threads.length;
        m.st.threads.push({ i: idx, hist: [], r: 0, rv: 0 });
      }
      if (m.st.threads.length > want) m.st.threads.length = want;
      /* v2.2: os fios correm numa ELIPSE do tamanho do painel (era um círculo do
         tamanho do lado menor: numa barra de 1440x170 eles viviam nos 14% do meio).
         O raio é uma mola: o grave e a energia abrem a órbita, o soco do kick dá o
         coice pra fora e o vale recolhe. Raio em fração da metade do painel. */
      var cx = w / 2, cy = h / 2, RXf = w * 0.46, RYf = h * 0.46;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var gS = CV.env(m, 'fiG', sm.grave, dt, 0.01, 0.12);
      var abre = CV.respira(m, 0.6 * gS + 0.4 * sm.energia, 0.55);
      var coice = 17 * sm.soco * Math.min(1.6, ax) * dt;   // ~2,5/s de empurrão por kick
      /* v2.2b: a mola só mexia na CABEÇA do fio, e o rastro (70 a 150 pontos, 1 a 2,5s)
         segurava o desenho do mesmo tamanho no kick e no vale (medido: área 0,57 > 0,56).
         Agora o rastro guarda a posição em relação ao centro e o desenho inteiro é
         escalado pelo grave de AGORA: no kick a fita toda abre até a borda, no vale
         recolhe pra 2/3. Abre em 35ms e solta em 0,25s: abrindo em 12ms o fade deixava
         cópias da fita em anéis (efeito mola) e soltando mais rápido virava borrão de
         zoom a cada recolhida. O joelho entra só no desenho, então nada sai do painel. */
      var P = CV.env(m, 'fiP', CV.respira(m, 0.5 * gS + 0.7 * sm.soco, 0.66), dt, 0.035, 0.25);
      /* enquanto a fita muda de escala, o rastro do fade apaga mais rápido: cada quadro
         antigo ficou num tamanho diferente, e 20 quadros de rastro viravam 20 contornos
         da mesma fita (hachura). Parada, o rastro volta a ser o do controle. */
      var dP = m.st.fiP0 === undefined ? 0 : Math.abs(P - m.st.fiP0);
      m.st.fiP0 = P;
      CV.fade(m, c, s.trail * (1 - Math.min(0.85, dP * 40)));
      // o relógio dos fios é a música: sem som eles param no lugar
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * (0.05 + gate * 1.4 + sm.soco * 0.8 * Math.min(1.5, ax));
      var pt2 = m.st.pt;
      CV.blend(m, c);
      m.st.threads.forEach(function (th) {
        var i = th.i;
        var sp = s.speed * (0.5 + i * 0.09);
        var ang = pt2 * sp * 0.9 + i * (6.283 / m.st.threads.length);
        // v2.2b: órbita maior (no kick o raio chega perto de 1, a borda do painel)
        var rT = (0.1 + 0.95 * abre * (0.85 + 0.15 * Math.sin(pt2 * 0.37 + i * 1.3))) * gate;
        th.rv += coice;
        th.rv += (rT - th.r) * 26 * dt - th.rv * 7 * dt;
        th.r += th.rv * dt;
        if (th.r < 0) { th.r = 0; th.rv = 0; }
        var wob = Math.sin(pt2 * 3.1 + i * 2.2) * 0.05 * (1 + sm.medio * 2) * gate;
        // posição da cabeça EM RELAÇÃO AO CENTRO (px); o centro e o joelho entram no desenho
        var ox = Math.cos(ang) * (th.r + wob) * RXf;
        var oy = Math.sin(ang * 1.3 + i) * (th.r * 0.92 + wob) * RYf;
        // se o mouse está em cima, os fios correm atrás dele
        if (m.mouse && m.mouse.over) {
          ox = ox * 0.45 + (m.mouse.x - cx) * 0.55;
          oy = oy * 0.45 + (m.mouse.y - cy) * 0.55;
        }
        // agudo treme a mão
        ox += (Math.random() - 0.5) * sm.agudo * Math.min(2, ax) * 7;
        oy += (Math.random() - 0.5) * sm.agudo * Math.min(2, ax) * 7;
        th.hist.push([ox, oy]);
        // o rastro acompanha o painel: 70 pontos em tela cheia é uma fita curtinha
        if (th.hist.length > CV.det(m, 70, 150)) th.hist.shift();
        /* ERA O PIOR GARGALO DO APP: 5 fios × 69 segmentos = 345 traços por quadro,
           cada um com uma cor nova e uma sombra desfocada. 20 mil desfoques por segundo.
           Agora o rastro é dividido em 6 pedaços de idade: cada pedaço é UM traço
           contínuo, com uma cor e uma espessura. 30 traços por quadro no lugar de 345,
           e a fita fica mais limpa porque a linha não quebra a cada segmento. */
        var nseg = th.hist.length, SEG = 6;
        if (nseg < 3) return;
        for (var g = 0; g < SEG; g++) {
          var a0 = Math.floor(nseg * g / SEG), a1 = Math.floor(nseg * (g + 1) / SEG);
          if (a1 - a0 < 2) continue;
          var age = (g + 0.5) / SEG;
          var cl = CV.pal(m, i + Math.floor(age * 2), t + age * 0.4);
          c.strokeStyle = CV.hsla(cl, (0.05 + age * 0.5) * (0.1 + 0.9 * gate));
          c.lineWidth = CV.lw(m, 0.5 + age * 2.6 * (0.75 + 0.6 * gS));
          c.beginPath();
          for (var k2 = a0; k2 < a1; k2++) {
            var hp = th.hist[k2];
            var qx = cx + CV.joelho(hp[0] * P, w * 0.49), qy = cy + CV.joelho(hp[1] * P, h * 0.49);
            k2 === a0 ? c.moveTo(qx, qy) : c.lineTo(qx, qy);
          }
          c.stroke();
        }
      });
      CV.blend(m, c, false);
    }
  });



  /* ================= ENXAME (bando de pontos: beat espanta, música reagrupa) ================= */
  CV.register('enxame', {
    name: 'Enxame', group: 'Arte', desc: 'Constelação que junta e rompe no beat',
    defaults: defs({ dens: 1, trail: 0.7 }),
    schema: COMMON.concat([
      { k: 'dens', label: 'Tamanho do bando', min: 0.3, max: 2, step: 0.05, def: 1 },
      { k: 'trail', label: 'Rastro', min: 0, max: 1, step: 0.02, def: 0.7 }
    ]),
    init: function (m) { m.st.ps = []; m.st.pt = 0; },
    draw: function (m, d, dt, t) {
      var c = m.ctx, w = m.w, h = m.h, s = m.s;
      CV.fade(m, c, s.trail);
      if (!d) return;
      var gate = CV.gate(m, d, dt), sm = CV.som(d), ax = CV.rx(m);
      var ps = m.st.ps, want = Math.round(CV.det(m, 90, 170) * s.dens);
      while (ps.length < want) ps.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, b: Math.random() });
      if (ps.length > want) ps.length = want;
      if (m.st.pt === undefined) m.st.pt = 0;
      m.st.pt += dt * s.speed * (0.2 + gate * 0.9 + sm.soco * 0.7 * Math.min(1.5, ax));
      // bando persegue um alvo que passeia; o mouse chama pra ele
      var tx = w * (0.5 + 0.34 * Math.sin(m.st.pt * 0.6));
      var ty = h * (0.5 + 0.34 * Math.cos(m.st.pt * 0.47));
      if (m.mouse && m.mouse.over) { tx = m.mouse.x; ty = m.mouse.y; }
      /* v2.2: o grave AFROUXA o bando. Enquanto o grave segura, a atração cai (até 45%
         no grave cheio) e a constelação se abre pelo painel; no vale ela se junta de
         novo. O estouro do beat é do tamanho do kick e cresce com a Reação. Antes a
         atração saía de um grave cravado no talo e o bando tinha sempre o mesmo aperto.
         Empurrão pra fora contínuo foi testado e descartado: o bando grudava nas bordas. */
      var gS = CV.env(m, 'enG', sm.grave, dt, 0.012, 0.14);
      var energy = Math.min(1.4, 0.3 + sm.energia);
      var solta = 1.1 - 0.62 * Math.min(1, gS * ax);
      var estoura = d.beat ? (0.55 + 0.45 * Math.min(1.6, ax)) * (0.6 + 0.6 * Math.max(sm.soco, gS)) : 0;
      var tr = (sm.agudo * 0.7 + gS * 0.5) * Math.min(2, ax) * 20;
      var mono = CV.isMono(m), n = ps.length, i, j;
      for (i = 0; i < n; i++) {
        var p = ps[i];
        var dxc = tx - p.x, dyc = ty - p.y, dist = Math.sqrt(dxc * dxc + dyc * dyc) + 0.001;
        var pull = (0.5 + energy * 1.6) * (0.25 + 0.75 * gate) * solta;
        p.vx += (dxc / dist) * pull; p.vy += (dyc / dist) * pull;
        if (estoura) { p.vx -= (dxc / dist) * (90 + p.b * 160) * estoura; p.vy -= (dyc / dist) * (90 + p.b * 160) * estoura; }
        p.vx += (Math.random() - 0.5) * tr;
        p.vy += (Math.random() - 0.5) * tr;
        p.vx *= 0.92; p.vy *= 0.92;
        p.x += p.vx * dt * 6; p.y += p.vy * dt * 6;
        if (p.x < 0) { p.x = 0; p.vx *= -0.6; } else if (p.x > w) { p.x = w; p.vx *= -0.6; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.6; } else if (p.y > h) { p.y = h; p.vy *= -0.6; }
      }
      /* fios entre nós próximos. PERFORMANCE: junta os fios em 4 camadas de opacidade
         e desenha 4 traços no total, em vez de um traço por par (eram milhares por quadro).

         O TETO DO SLIDER. O que custa aqui é a QUANTIDADE DE FIOS. Ela cresce com
         o quadrado do bando E com o quanto ele se aperta em volta do alvo: no
         "Tamanho do bando" máximo davam 13.379 fios por quadro contra 3.544 no
         padrão, quase 4x o custo num arrasto de slider.
         Agora o alcance do fio se ajusta sozinho pra manter a conta perto de 3.500,
         que é a densidade do padrão. Ele encolhe quando o bando aperta e volta
         quando ele espalha, devagar (a mudança leva ~0,3s), então não pisca.
         A imagem também melhora: com alcance fixo, o bando cheio virava um borrão
         branco sólido em vez de constelação. */
      var LINK_BUDGET = 3500;
      if (m.st.dk === undefined) m.st.dk = 1;
      var linkD = Math.min(w, h) * (0.22 + 0.12 * gate) * m.st.dk, linkD2 = linkD * linkD;
      CV.blend(m, c);
      var lcol = mono ? [0, 0, 100] : CV.pal(m, 0, t);
      c.lineWidth = CV.lw(m, 1);
      var BK = 4, buckets = m.st.bk;
      if (!buckets) { buckets = m.st.bk = []; for (i = 0; i < BK; i++) buckets.push([]); }
      for (i = 0; i < BK; i++) buckets[i].length = 0;
      var links = 0;
      for (i = 0; i < n; i++) {
        var a = ps[i];
        for (j = i + 1; j < n; j++) {
          var b = ps[j], ddx = a.x - b.x, ddy = a.y - b.y, dd2 = ddx * ddx + ddy * ddy;
          if (dd2 > linkD2) continue;
          if (++links > LINK_BUDGET) break;      // rede de segurança do quadro atual
          var near = 1 - Math.sqrt(dd2) / linkD;
          var bi = (near * near * BK) | 0; if (bi > BK - 1) bi = BK - 1;
          buckets[bi].push(a.x, a.y, b.x, b.y);
        }
        if (links > LINK_BUDGET) break;
      }
      // realimentação: aperta o alcance quando passou do orçamento, solta quando sobrou
      var over = links / LINK_BUDGET;
      var dkT = over > 1 ? m.st.dk / Math.sqrt(over) : Math.min(1, m.st.dk * 1.03);
      m.st.dk += (dkT - m.st.dk) * Math.min(1, dt * 3.5);
      if (m.st.dk < 0.2) m.st.dk = 0.2; else if (m.st.dk > 1) m.st.dk = 1;
      for (i = 0; i < BK; i++) {
        var arr = buckets[i]; if (!arr.length) continue;
        c.strokeStyle = CV.hsla(lcol, ((i + 0.5) / BK) * (0.05 + 0.5 * gate));
        c.beginPath();
        for (j = 0; j < arr.length; j += 4) { c.moveTo(arr[j], arr[j + 1]); c.lineTo(arr[j + 2], arr[j + 3]); }
        c.stroke();
      }
      /* nós: 8 passes (4 cores × 2 tamanhos), cada um com UMA troca de cor e UM caminho.
         Antes era uma paleta nova e uma frase de cor por nó. São só 90 nós, então varrer
         a lista 8 vezes sai mais barato que montar listas separadas (medido). */
      var alphaN = (0.25 + 0.75 * gate);
      var CN = mono ? 1 : 4;
      for (var ci2 = 0; ci2 < CN; ci2++) {
        var ncol = mono ? [0, 0, 100] : CV.pal(m, ci2, t);
        for (var bg = 0; bg < 2; bg++) {
          var sz = (bg ? 4 : 2.4) * (1 + 0.6 * Math.min(1, gS * ax)), off = sz * 0.5, any = false;
          c.beginPath();
          for (j = 0; j < n; j++) {
            var q = ps[j];
            if ((q.b > 0.85) !== (bg === 1)) continue;
            if (!mono && (((q.b * 4) | 0) & 3) !== ci2) continue;
            c.rect(q.x - off, q.y - off, sz, sz);
            any = true;
          }
          if (!any) continue;
          c.fillStyle = CV.hsla(ncol, (bg ? 0.85 : 0.5) * alphaN);
          c.fill();
        }
      }
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
    '  float g = clamp(u_bass, 0.0, 1.4);',
    '  float sway = sin(x * 8.0 + t * 0.6 + g * 3.0) * 0.12 * (0.45 + g);',
    '  float cx = x + (sway + (fold - 0.5) * 0.4) * u_a;',
    '  float curtain = 0.0;',
    /* v2.2: a cortina SOBE com o grave. A faixa acesa ia de 0 a 1,05 da altura com o
       miolo fixo; agora o pé desce e o topo sobe no kick, e a luz toma o painel. */
    '  float vfall = smoothstep(-0.18*g, 0.62 - 0.27*g, uv.y) * (1.0 - smoothstep(0.55 + 0.18*g, 1.08 + 0.15*g, uv.y));',
    '  for (int i = 0; i < 3; i++){',
    '    float fi = float(i);',
    '    float bands = fbm(vec2(cx * (u_b + fi*3.0), uv.y * 1.4 - t * (0.25 + fi*0.12) - fi));',
    '    curtain += bands * vfall * (0.5 - fi*0.12);',
    '  }',
    '  curtain = pow(max(curtain, 0.0), 1.6);',
    '  float shimmer = u_high * 0.4 * pow(fbm(vec2(cx*30.0, uv.y*20.0 - t*4.0)), 4.0) * smoothstep(0.4,1.0,uv.y);',
    '  float hue = u_hue + cx * 0.15 + curtain * 0.15;',
    '  vec3 base = pal(hue);',
    '  vec3 col = base * (curtain * (0.8 + g*0.5) + shimmer);',
    '  col += base * u_beat * 0.15;',
    '  gl_FragColor = vec4(col * (0.03 + 0.97*u_gate), 1.0);',
    '}'
  ].join('\n');

  CV.register('aurora', {
    name: 'Aurora', group: 'Arte', webgl: true, desc: 'Cortinas de luz no céu',
    defaults: defs({ dobra: 1, cortinas: 6 }),
    schema: [
      { k: 'sens', label: 'Reação', min: 0.2, max: 2.5, step: 0.05, def: 1, fmt: 'pct' },
      { k: 'speed', label: 'Velocidade', min: 0.2, max: 3, step: 0.05, def: 1 },
      { k: 'dobra', label: 'Dobra da cortina', min: 0, max: 2.5, step: 0.05, def: 1 },
      { k: 'cortinas', label: 'Nº de cortinas', min: 2, max: 14, step: 0.5, def: 6 }
    ],
    init: function (m) { CV.glSetup(m, AURORA_FRAG); },
    draw: function (m, d, dt, t) {
      // a cortina dobra mais no kick (a dobra vai de 70% no vale a ~130% na batida)
      var sm = CV.som(d), gS = CV.env(m, 'auG', sm.grave, dt, 0.02, 0.16);
      var dobra = m.s.dobra * (0.7 + Math.min(0.9, 0.6 * gS * CV.rx(m)));
      if (!CV.glFrame(m, d, dt, dobra, m.s.cortinas)) {
        var c = m.canvas.getContext('2d'); if (!c) return;
        c.fillStyle = CV.bgOf(m); c.fillRect(0, 0, m.w, m.h);
      }
    }
  });




  /* ================= CORDAS (cordas verticais que vibram por banda) ================= */
  CV.register('cordas', {
    name: 'Cordas', group: 'Arte', desc: 'Harpa de cordas que vibram por banda',
    defaults: defs({ cordas: 28, tensao: 1 }),
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
      var f = d.freq, n = f.length, binHz = d.binHz || ((d.sr || 48000) / 2 / n), mono = CV.isMono(m);
      var pad = w * 0.06, gapx = (w - pad * 2) / Math.max(1, N - 1);
      // tabela de bins e de Hz pronta (era um Math.pow por corda, por quadro)
      var tb = CV.binTableFull(m, 'cd', N, n, binHz, 45, 7000, false);
      var bins = tb.bins, hzs = tb.hz;
      /* envelope e seno do modo por altura, prontos: eram 3 senos e 2 divisões por
         PONTO da corda (28 cordas × ~25 pontos = 2100 senos por quadro). */
      var ys = m.st._ys;
      if (!ys || m.st._ysh !== h) {
        var stepY = Math.max(4, Math.min(10, h / 24));
        var cnt = Math.floor(h / stepY) + 1;
        ys = m.st._ys = { y: new Float32Array(cnt), env: new Float32Array(cnt), u: new Float32Array(cnt) };
        for (var yq = 0; yq < cnt; yq++) {
          var yy = Math.min(h, yq * stepY);
          ys.y[yq] = yy; ys.u[yq] = Math.PI * yy / h; ys.env[yq] = Math.sin(Math.PI * yy / h);
        }
        m.st._ysh = h;
      }
      var yv = ys.y, yenv = ys.env, yu = ys.u, YN = yv.length;
      /* v2.2: cada corda mede a SUA banda em dB contra o próprio pico recente (desce
         8 dB/s). Antes o mapa legado deixava as cordas graves sempre no máximo e só as
         agudas mexiam. As cordas abaixo de 160Hz seguem o grave da música, o soco do
         kick dá a palhetada nelas, e a vibração pode passar do vão entre cordas
         (até 1,8 vão na Reação Forte). */
      var sm = CV.som(d), ax = CV.rx(m), gS = CV.env(m, 'cdG', sm.grave, dt, 0.01, 0.12);
      var fdb = d.freqDb, cref = m.st.cref;
      if (!cref || cref.length !== N) { cref = m.st.cref = new Float32Array(N); for (var z0 = 0; z0 < N; z0++) cref[z0] = -60; }
      var kUp = 1 - Math.exp(-dt / 0.015), kDn = 1 - Math.exp(-dt / 0.25), largura = 0.9 + 0.9 * Math.min(1.5, ax);
      for (var i = 0; i < N; i++) {
        var b0 = bins[i], b1 = i < N - 1 ? bins[i + 1] : b0, dbv = -120;
        if (fdb) { for (var bq = b0; bq <= Math.max(b0, (b0 + b1) >> 1); bq++) if (fdb[bq] > dbv) dbv = fdb[bq]; }
        else dbv = f[b0] / 255 * 70 - 105.1;
        cref[i] = Math.max(dbv, Math.max(-75, cref[i] - 8 * dt));
        var e = (dbv - cref[i] + 22) / 22; e = e < 0 ? 0 : e > 1 ? 1 : e * e;
        if (hzs[i] < 160) e = Math.max(e, gS);
        e = Math.min(1.2, e * Math.min(1.25, ax));
        amp[i] += (e - amp[i]) * (e > amp[i] ? kUp : kDn);
        var xi = pad + i * gapx;
        if (m.mouse && m.mouse.over && Math.abs(m.mouse.x - xi) < gapx * 0.6) amp[i] = Math.min(1, amp[i] + 0.5);
        if (sm.soco > 0.05) amp[i] = Math.min(1.2, amp[i] + 4 * sm.soco * Math.min(1.5, ax) * Math.pow(1 - i / N, 1.5) * dt);
        ph[i] += dt * (6 + hzs[i] * 0.01) * s.tensao * (0.5 + gate);
        var A = amp[i] * gapx * largura * (0.2 + 0.8 * gate);
        var col = mono ? [0, 0, 100] : CV.pal(m, i % 4, t);
        var a1 = Math.min(1, amp[i]);
        var lum = Math.min(92, 40 + a1 * 45);
        c.strokeStyle = CV.hsla([col[0], col[1], lum], 0.22 + a1 * 0.7);
        c.lineWidth = CV.lw(m, 0.8 + a1 * 1.4);
        c.beginPath();
        var mi = mode[i], phi = ph[i];
        for (var yq2 = 0; yq2 < YN; yq2++) {
          var xx = xi + A * yenv[yq2] * Math.sin(mi * yu[yq2] + phi);
          yq2 === 0 ? c.moveTo(xx, yv[yq2]) : c.lineTo(xx, yv[yq2]);
        }
        c.stroke();
      }
    }
  });






  /* ================= MALHA (tecido 3D que ondula com o som) ================= */
  CV.register('malha', {
    name: 'Malha', group: 'Arte', desc: 'Tecido 3D ondulando com o som',
    defaults: defs({ grade: 16 }),
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
      if (m.st.ampS === undefined) { m.st.ampS = 0; }
      var kS = Math.min(1, dt * 6);
      m.st.ampS += (Math.min(w, h) * 0.17 * (0.15 + 0.85 * gate) - m.st.ampS) * kS;
      /* v2.2: o relevo segue o grave que se ajusta ao volume (ataque de 12ms, solta em
         160ms) e o tecido inteiro ESTICA no kick, de 66% a 86% da altura. Antes o grave
         chegava cravado no talo e a malha ondulava sempre do mesmo tamanho. */
      var sm = CV.som(d), ax = CV.rx(m);
      var bass = Math.min(1.3, CV.env(m, 'maG', sm.grave, dt, 0.012, 0.16) * ax);
      var mid = Math.min(1.2, CV.env(m, 'maM', sm.medio, dt, 0.03, 0.2) * ax);
      var puls = CV.env(m, 'maP', sm.soco, dt, 0.01, 0.18);
      var amp = m.st.ampS, yS = 0.66 + 0.2 * Math.min(1, (0.5 * bass + 0.6 * puls * ax)), xS = 0.86 + 0.06 * Math.min(1, puls * ax);
      // relevo: o grave levanta o tecido (de 0,35 a 1,85 do relevo base); o médio enruga
      var zB = 0.35 + 1.15 * bass, zM = 0.2 + 0.55 * mid, zMax = zB + zM;
      var mx = (m.mouse && m.mouse.over) ? (m.mouse.x / w - 0.5) : 0, my = (m.mouse && m.mouse.over) ? (m.mouse.y / h - 0.5) : 0;
      function proj(gx, gy) {
        var nx = gx - 0.5, ny = gy - 0.5;
        var z = Math.sin(gx * 6 + pt * 1.3 + Math.sin(gy * 5 - pt)) * zB + Math.cos(gy * 7 - pt * 1.1) * zM;
        // a borda de cima e a de baixo ondulam menos: sem isso as fileiras do fundo se
        // dobravam umas por cima das outras e a malha virava serrote contra a borda
        z *= amp * (0.5 + 0.5 * Math.cos(ny * 3.1));
        var persp = 1 + ny * (0.5 + my * 0.5);
        return [w * 0.5 + nx * w * xS * persp + mx * 40, h * 0.5 + CV.joelho(ny * h * yS - z, h * 0.49), z];
      }
      var pts = [], yi, xi;
      for (yi = 0; yi <= G; yi++) { var row = []; for (xi = 0; xi <= G; xi++) row.push(proj(xi / G, yi / G)); pts.push(row); }
      // PERFORMANCE: uma linha inteira por traço (2×G traços), em vez de um traço por segmento
      // (eram ~600 chamadas por quadro). O brilho vira 3 faixas de profundidade.
      /* v2.2: a faixa é decidida por SEGMENTO (pelo meio dele), não por ponto. Por ponto, a
         linha só era desenhada entre dois vizinhos da mesma faixa: onde a profundidade
         trocava, sobrava buraco, e o resto virava escada. Agora todo segmento sai, na
         faixa do meio dele, e a malha fica inteira. */
      c.lineWidth = CV.lw(m, 1);
      var BANDS = 3, bi2, row2, p2, q2, zN = 1 / (amp * zMax + 0.001);
      var faixa = function (za, zb) { var bn = (za + zb) * 0.5 * zN * 0.5 + 0.5; return bn < 0 ? 0 : bn > 0.9999 ? 0.9999 : bn; };
      for (bi2 = 0; bi2 < BANDS; bi2++) {
        var lo = bi2 / BANDS, hi = (bi2 + 1) / BANDS, mid2 = (lo + hi) / 2;
        c.strokeStyle = CV.hsla([col[0], col[1], 40 + mid2 * (mono ? 45 : 30)], (0.22 + mid2 * 0.5) * (0.2 + 0.8 * gate));
        c.beginPath();
        for (yi = 0; yi <= G; yi++) {
          row2 = pts[yi];
          var drawing = false;
          for (xi = 0; xi < G; xi++) {
            p2 = row2[xi]; q2 = row2[xi + 1];
            var bn = faixa(p2[2], q2[2]);
            if (bn >= lo && bn < hi) { if (!drawing) { c.moveTo(p2[0], p2[1]); drawing = true; } c.lineTo(q2[0], q2[1]); }
            else drawing = false;
          }
        }
        for (xi = 0; xi <= G; xi++) {
          var drawing2 = false;
          for (yi = 0; yi < G; yi++) {
            p2 = pts[yi][xi]; q2 = pts[yi + 1][xi];
            var bn2 = faixa(p2[2], q2[2]);
            if (bn2 >= lo && bn2 < hi) { if (!drawing2) { c.moveTo(p2[0], p2[1]); drawing2 = true; } c.lineTo(q2[0], q2[1]); }
            else drawing2 = false;
          }
        }
        c.stroke();
      }
    }
  });




})();
