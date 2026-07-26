/* Caramujo Vision — janela do programa de computador (sem moldura, minimalista) */
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
  'MacLoopbackAudioForScreenShare,MacCatapSystemAudioLoopbackCapture,MacSckSystemAudioLoopbackOverride,PulseaudioLoopbackForScreenShare'
);

let win = null;

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
    minWidth: 1,
    minHeight: 1,
    backgroundColor: '#080809',
    title: 'Caramujo Vision',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    frame: false,            // sem moldura: nada de barra de título nem botões
    resizable: true,         // ainda dá pra esticar pelos cantos
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false
    }
  });
  win.setMenuBarVisibility(false); // Win/Linux: sem barra de menu na janela
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.on('closed', () => { win = null; });
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
  nativeRec.on('data', (buf) => {
    if (win && !win.isDestroyed()) win.webContents.send('cv-native-audio', buf);
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

/* ---------- modo barra fixa (stick): gruda numa borda da tela, sempre na frente ----------
   pos: 'off' | 'bottom' | 'top' | 'left' | 'right'. Nas laterais fica uma coluna estreita. */
let stickPrevBounds = null;
ipcMain.handle('cv-win-stick', (e, pos) => {
  if (!win) return 'off';
  const { screen } = require('electron');
  if (!pos || pos === 'off') {
    if (stickPrevBounds) { win.setBounds(stickPrevBounds); stickPrevBounds = null; }
    return 'off';
  }
  if (!stickPrevBounds) stickPrevBounds = win.getBounds();
  if (win.isFullScreen()) win.setFullScreen(false);
  const area = screen.getPrimaryDisplay().workArea;
  const BAR = 190;   // espessura da régua horizontal
  const COL = 260;   // largura da coluna lateral
  let b;
  if (pos === 'top') b = { x: area.x, y: area.y, width: area.width, height: BAR };
  else if (pos === 'left') b = { x: area.x, y: area.y, width: COL, height: area.height };
  else if (pos === 'right') b = { x: area.x + area.width - COL, y: area.y, width: COL, height: area.height };
  else b = { x: area.x, y: area.y + area.height - BAR, width: area.width, height: BAR };
  win.setBounds(b);
  return pos;
});

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
    try { app.setAboutPanelOptions({ applicationName: 'Caramujo Vision', applicationVersion: '1.0.0' }); } catch (e) {}
    // permissão de microfone: só serve pro plano B (BlackHole), o nativo não usa mic
    try { await systemPreferences.askForMediaAccess('microphone'); } catch (e) {}
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { app.quit(); });
