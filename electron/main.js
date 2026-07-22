/* Caramujo Vision — janela do programa de computador */
const { app, BrowserWindow, systemPreferences } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 640,
    minHeight: 420,
    backgroundColor: '#080809',
    title: 'Caramujo Vision',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { spellcheck: false }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(async () => {
  // no Mac, já pede a permissão de microfone (por onde o BlackHole entra)
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch (e) {}
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { app.quit(); });
