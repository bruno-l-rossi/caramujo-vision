/* Caramujo Vision — janela do programa de computador (sem moldura, minimalista) */
const { app, BrowserWindow, session, desktopCapturer, ipcMain, systemPreferences, nativeImage } = require('electron');
const path = require('path');

// nome do app: senão o mac mostra "Electron" no dock e no ⌘Tab rodando via npm start
app.setName('Caramujo Vision');
try { process.title = 'Caramujo Vision'; } catch (e) {}

/* Loopback de áudio do sistema, sem driver nenhum.
   O Chromium de dentro do Electron sabe captar o que sai das caixas; essas flags
   destravam isso no macOS 13+ (ScreenCaptureKit) e no Linux (PulseAudio). */
app.commandLine.appendSwitch(
  'enable-features',
  'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride,PulseaudioLoopbackForScreenShare'
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

/* ---------- ponte com a tela (renderer) ---------- */
ipcMain.handle('cv-enable-loopback', () => { setLoopback(true); return true; });
ipcMain.handle('cv-disable-loopback', () => { setLoopback(false); return true; });
ipcMain.handle('cv-win-close', () => { if (win) win.close(); });
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
