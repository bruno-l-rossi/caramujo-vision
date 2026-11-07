/* Caramujo Vision · janela do programa de computador (sem moldura, minimalista) */
const { app, BrowserWindow, session, desktopCapturer, ipcMain, systemPreferences, nativeImage } = require('electron');
const path = require('path');

// nome do app: senão o mac mostra "Electron" no dock e no ⌘Tab rodando via npm start
app.setName('Caramujo Vision');
try { process.title = 'Caramujo Vision'; } catch (e) {}

/* Loopback de áudio do sistema, sem driver nenhum.
   O Chromium de dentro do Electron sabe captar o que sai das caixas; essas flags
   destravam isso no macOS 13+ (ScreenCaptureKit) e no Linux (PulseAudio).
   MacCatapSystemAudioLoopbackCapture usa os Core Audio taps (macOS 15+): é o
   caminho que pode entregar ESTÉREO (o SCK costuma rebaixar pra mono). Fica junto
   do SCK: se os taps não existirem na versão do macOS, o SCK continua valendo. */
app.commandLine.appendSwitch(
  'enable-features',
  'MacLoopbackAudioForScreenShare,MacCatapSystemAudioLoopbackCapture,MacSckSystemAudioLoopbackOverride,PulseaudioLoopbackForScreenShare,SharedArrayBuffer'
);

/* O MACOS FREAVA O APP quando outra janela cobria a nossa (o Chromium acha que está
   escondido e derruba o ritmo dos quadros pra economizar bateria). Como o Caramujo fica
   embaixo do FL Studio o tempo todo, isso acontecia justamente quando importa.
   Estas três chaves desligam esse freio. */
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

/* AQUI MORAVA O 'disable-frame-rate-limit', E ELE ERA O TRAVAMENTO.
   A ideia na etapa 1 era destravar os 120Hz da tela ProMotion. Só que essa chave
   não levanta o teto de 60 pra 120: ela TIRA O TETO. O app passou a desenhar o
   mais rápido que a máquina aguentasse, e o HUD do Bruno mostrou 630 quadros por
   segundo numa tela que mostra 120. Dez vezes mais desenho do que aparece.
   O resultado é o app comendo a máquina inteira sem folga nenhuma entre um quadro
   e outro: mouse, menu e o resto do sistema passam a disputar espaço, e é isso
   que se sente como travamento.
   Sem a chave, o desenho volta a acompanhar a tela: 120 por segundo numa
   ProMotion, 60 numa tela comum, que é exatamente o que a etapa 1 queria. */
// app.commandLine.appendSwitch('disable-frame-rate-limit');  ← NÃO VOLTAR
// o áudio do sistema chega em bloco pequeno: o buffer padrão do Chromium só somava atraso
app.commandLine.appendSwitch('audio-buffer-size', '256');

let win = null;
const BENCH4 = process.argv.indexOf('--bench4') >= 0;

/* liga/desliga o loopback: quando ligado, o getDisplayMedia do app recebe
   o áudio do sistema em vez de uma tela pra escolher. */
function setLoopback(on) {
  const ses = session.defaultSession;
  try {
    if (on) {
      ses.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
          if (sources && sources.length) callback({ video: sources[0], audio: 'loopback' });
          else callback({}); // sem permissão de tela: nega e a tela cai pro plano B
        }).catch(() => { try { callback({}); } catch (e) {} });
      }, { useSystemPicker: false });
    } else {
      ses.setDisplayMediaRequestHandler(null);
    }
  } catch (e) { /* versão antiga do Electron: o app segue no plano B */ }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    /* tamanho mínimo: janela sem moldura menor que isso some na tela e não tem
       mais onde pegar pra arrastar */
    minWidth: 120,
    minHeight: 48,
    backgroundColor: '#191919',
    title: 'Caramujo Vision',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    frame: false,            // sem moldura: nada de barra de título nem botões
    resizable: true,         // ainda dá pra esticar pelos cantos
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
      backgroundThrottling: false   // idem: a janela coberta continua desenhando a 60fps
    }
  });
  win.setMenuBarVisibility(false); // Win/Linux: sem barra de menu na janela
  /* BANCADA 4 (npm run bench4): mede o custo da passada de pós na máquina de
     verdade. Precisa ser aqui dentro, no mesmo motor gráfico do app: um número
     tirado no navegador comum não vale pra decidir nada. */
  if (BENCH4) {
    win.loadFile(path.join(__dirname, '..', 'test', 'bench4.html'));
    win.webContents.on('console-message', (e, lvl, msg) => { console.log(msg); });
  } else {
    win.loadFile(path.join(__dirname, '..', 'index.html'));
  }
  win.on('closed', () => { win = null; });

  /* GRAVAÇÃO VAI DIRETO PRA PASTA DOWNLOADS, sem a janela de "Salvar como".
     Apertar ● de novo pra parar e o MP4 já está lá: o nome leva data e hora, então
     um clipe nunca escreve por cima do outro. */
  try {
    session.defaultSession.on('will-download', (e, item) => {
      const destino = path.join(app.getPath('downloads'), item.getFilename());
      item.setSavePath(destino);
      item.once('done', (ev, estado) => {
        if (win && !win.isDestroyed()) win.webContents.send('cv-download', { ok: estado === 'completed', path: destino, name: item.getFilename() });
      });
    });
  } catch (e) { /* sem sessão: cai no comportamento padrão do Electron */ }

  /* avisa a tela sempre que a janela muda de tamanho ou lugar, pra ela guardar
     e reabrir exatamente onde parou */
  const tellBounds = () => {
    if (win && !win.isDestroyed()) win.webContents.send('cv-bounds', win.getBounds());
  };
  win.on('resized', tellBounds);
  win.on('moved', tellBounds);
}

/* ---------- captura NATIVA (estéreo de verdade, sem driver externo) ----------
   O loopback do Chromium entrega mono. Este caminho usa o ScreenCaptureKit direto
   (módulo native-recorder-nodejs, binários prontos): no macOS sai estéreo fixo,
   PCM 16-bit 48kHz, com menos buffer no meio. Se o módulo não estiver instalado,
   o app cai sozinho no loopback antigo e continua funcionando. */
let nativeRec = null;
let nativeMod = null;
let nativeErr = '';
function getNativeMod() {
  if (nativeMod !== null) return nativeMod;
  try { nativeMod = require('native-recorder-nodejs'); }
  catch (e) { nativeErr = String((e && e.message) || e); nativeMod = false; }
  return nativeMod;
}

ipcMain.handle('cv-native-available', () => !!getNativeMod());
// diagnóstico: diz POR QUE o nativo não subiu (módulo faltando, binário errado, permissão…)
ipcMain.handle('cv-native-why', () => {
  const mod = getNativeMod();
  if (!mod) return { ok: false, reason: nativeErr || 'modulo nao encontrado' };
  const AudioRecorder = mod.AudioRecorder || (mod.default && mod.default.AudioRecorder);
  if (!AudioRecorder) return { ok: false, reason: 'API inesperada: ' + Object.keys(mod).join(',') };
  let perm = null, outs = [];
  try { perm = AudioRecorder.checkPermission ? AudioRecorder.checkPermission() : null; } catch (e) {}
  try { outs = AudioRecorder.getDevices('output') || []; } catch (e) { return { ok: false, reason: 'getDevices falhou: ' + e.message }; }
  return { ok: true, perm: perm, devices: outs.map(d => d.id + ':' + d.name) };
});

ipcMain.handle('cv-native-start', async () => {
  const mod = getNativeMod();
  if (!mod) throw new Error('sem-modulo-nativo');
  const AudioRecorder = mod.AudioRecorder || (mod.default && mod.default.AudioRecorder);
  const SYS = mod.SYSTEM_AUDIO_DEVICE_ID || 'system';
  if (!AudioRecorder) throw new Error('api-nativa-inesperada');

  try {
    const perm = AudioRecorder.checkPermission ? AudioRecorder.checkPermission() : null;
    if (perm && !perm.system && AudioRecorder.requestPermission) AudioRecorder.requestPermission('system');
  } catch (e) {}

  const outs = AudioRecorder.getDevices('output') || [];
  const sys = outs.find(d => d.id === SYS) || outs.find(d => d.isDefault) || outs[0];
  if (!sys) throw new Error('sem-dispositivo-de-saida');

  let fmt = { sampleRate: 48000, channels: 2 };
  try { fmt = Object.assign(fmt, AudioRecorder.getDeviceFormat(sys.id) || {}); } catch (e) {}

  if (nativeRec) { try { await nativeRec.stop(); } catch (e) {} nativeRec = null; }
  nativeRec = new AudioRecorder();
  /* v2.4: o bloco vai com a HORA EM QUE CHEGOU AQUI (relógio de época, o mesmo nos
     dois processos). A tela usa essa hora pro relógio do som: se ela estiver ocupada
     desenhando quando o bloco atravessa, o atraso da travessia não vira tremida. */
  const relogio = () => performance.timeOrigin + performance.now();
  nativeRec.on('data', (buf) => {
    if (win && !win.isDestroyed()) win.webContents.send('cv-native-audio', buf, relogio());
  });
  nativeRec.on('error', (err) => {
    if (win && !win.isDestroyed()) win.webContents.send('cv-native-error', String((err && err.message) || err));
  });
  await nativeRec.start({ deviceType: 'output', deviceId: sys.id });
  return { sampleRate: fmt.sampleRate || 48000, channels: fmt.channels || 2, name: sys.name || 'ÁUDIO DO COMPUTADOR' };
});

ipcMain.handle('cv-native-stop', async () => {
  if (nativeRec) { try { await nativeRec.stop(); } catch (e) {} nativeRec = null; }
  return true;
});

/* ---------- modo barra fixa (stick): gruda numa borda da tela ----------
   pos: 'off' | 'bottom' | 'top' | 'left' | 'right'. size: a espessura que o
   usuário escolheu (altura da barra ou largura da coluna). A borda é a da tela
   onde a janela está, não sempre a principal: com dois monitores, a barra vai
   pro monitor em que você deixou o app. */
let stickPrevBounds = null;
ipcMain.handle('cv-win-stick', (e, pos, size) => {
  if (!win) return 'off';
  const { screen } = require('electron');
  if (!pos || pos === 'off') {
    if (stickPrevBounds) { win.setBounds(stickPrevBounds); stickPrevBounds = null; }
    return 'off';
  }
  if (!stickPrevBounds) stickPrevBounds = win.getBounds();
  if (win.isFullScreen()) win.setFullScreen(false);
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const sz = Math.round(+size || 0);
  const BAR = Math.max(60, Math.min(area.height, sz || 170));   // altura da barra
  const COL = Math.max(140, Math.min(area.width, sz || 300));   // largura da coluna
  let b;
  if (pos === 'top') b = { x: area.x, y: area.y, width: area.width, height: BAR };
  else if (pos === 'left') b = { x: area.x, y: area.y, width: COL, height: area.height };
  else if (pos === 'right') b = { x: area.x + area.width - COL, y: area.y, width: COL, height: area.height };
  else b = { x: area.x, y: area.y + area.height - BAR, width: area.width, height: BAR };
  win.setBounds(b);
  return pos;
});

/* ---------- CONFIGURAÇÕES: a janela CRESCE em vez de a config cobrir os visuais ----------
   É o que o MiniMeters faz. Na barra do topo (190px de altura) a config não cabe: antes
   ela tomava a tela inteira e o Bruno não via o visual mudando enquanto mexia no slider.
   Agora a janela estica pra baixo pelo tanto que a config precisa, e volta ao fechar.
   Na coluna lateral (260px de largura) a janela alarga, senão as colunas não cabem. */
let settingsPrev = null;
ipcMain.handle('cv-win-settings', (e, open, px, side) => {
  if (!win) return false;
  const { screen } = require('electron');
  if (open) {
    if (settingsPrev) return true;            // já aberto
    settingsPrev = win.getBounds();
    const area = screen.getDisplayMatching(settingsPrev).workArea;
    const b = Object.assign({}, settingsPrev);
    if (side) {
      // encaixe lateral: alarga pro lado que tiver espaço
      b.width = Math.min(area.width, Math.max(b.width, 760));
      if (b.x + b.width > area.x + area.width) b.x = Math.max(area.x, area.x + area.width - b.width);
    } else {
      const grow = Math.max(120, Math.min(px || 240, area.height - b.height));
      b.height = b.height + grow;
      // encostado no rodapé: cresce pra CIMA, senão sairia da tela
      if (b.y + b.height > area.y + area.height) b.y = Math.max(area.y, area.y + area.height - b.height);
    }
    win.setBounds(b);
  } else {
    if (!settingsPrev) return false;
    win.setBounds(settingsPrev);
    settingsPrev = null;
  }
  return win.getBounds();
});

// mostra o vídeo gravado no Finder
ipcMain.handle('cv-show-file', (e, p) => { try { require('electron').shell.showItemInFolder(String(p)); } catch (err) {} return true; });

/* 📌 manter na frente das outras janelas (separado do encaixe) */
ipcMain.handle('cv-win-pin', (e, on) => {
  if (!win) return false;
  win.setAlwaysOnTop(!!on, 'floating');
  try { win.setVisibleOnAllWorkspaces(!!on, { visibleOnFullScreen: true }); } catch (err) {}
  return !!on;
});

/* ---------- ponte com a tela (renderer) ---------- */
ipcMain.handle('cv-enable-loopback', () => { setLoopback(true); return true; });
ipcMain.handle('cv-disable-loopback', () => { setLoopback(false); return true; });
// ⏻ fecha o programa de verdade (não só a janela)
ipcMain.handle('cv-win-close', async () => {
  if (nativeRec) { try { await nativeRec.stop(); } catch (e) {} nativeRec = null; }
  app.quit();
});
ipcMain.handle('cv-win-min', () => { if (win) win.minimize(); });
ipcMain.handle('cv-win-fullscreen', () => { if (win) { win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); } return false; });
ipcMain.handle('cv-win-get-bounds', () => (win ? win.getBounds() : null));
ipcMain.handle('cv-win-set-bounds', (e, b) => {
  if (win && b && typeof b.width === 'number') {
    if (win.isFullScreen()) win.setFullScreen(false);
    win.setBounds({
      x: b.x, y: b.y,
      width: Math.max(1, Math.round(b.width)),
      height: Math.max(1, Math.round(b.height))
    });
  }
});

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    // ícone do dock = logo, mesmo rodando via npm start (sem empacotar)
    try {
      const img = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'logo.png'));
      if (app.dock && !img.isEmpty()) app.dock.setIcon(img);
    } catch (e) {}
    try { app.setAboutPanelOptions({ applicationName: 'Caramujo Vision', applicationVersion: app.getVersion() }); } catch (e) {}
    // permissão de microfone: só serve pro plano B (BlackHole), o nativo não usa mic
    try { await systemPreferences.askForMediaAccess('microphone'); } catch (e) {}
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { app.quit(); });
