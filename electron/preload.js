/* Ponte segura entre a tela (renderer) e o processo principal.
   Só expõe o que o app precisa: loopback de áudio e controle da janela. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('caramujo', {
  isDesktop: true,
  enableLoopback: () => ipcRenderer.invoke('cv-enable-loopback'),
  disableLoopback: () => ipcRenderer.invoke('cv-disable-loopback'),
  winClose: () => ipcRenderer.invoke('cv-win-close'),
  winMinimize: () => ipcRenderer.invoke('cv-win-min'),
  winFullscreen: () => ipcRenderer.invoke('cv-win-fullscreen'),
  winGetBounds: () => ipcRenderer.invoke('cv-win-get-bounds'),
  winSetBounds: (b) => ipcRenderer.invoke('cv-win-set-bounds', b),
  winStick: (pos, size) => ipcRenderer.invoke('cv-win-stick', pos, size),
  winSettings: (open, px, side) => ipcRenderer.invoke('cv-win-settings', open, px, side),
  winPin: (on) => ipcRenderer.invoke('cv-win-pin', on),
  // captura nativa (estéreo de verdade)
  nativeAvailable: () => ipcRenderer.invoke('cv-native-available'),
  nativeWhy: () => ipcRenderer.invoke('cv-native-why'),
  nativeStart: () => ipcRenderer.invoke('cv-native-start'),
  nativeStop: () => ipcRenderer.invoke('cv-native-stop'),
  onNativeAudio: (cb) => ipcRenderer.on('cv-native-audio', (e, buf) => cb(buf)),
  onNativeError: (cb) => ipcRenderer.on('cv-native-error', (e, msg) => cb(msg)),
  onBounds: (cb) => ipcRenderer.on('cv-bounds', (e, b) => cb(b)),
  // gravação salva direto em Downloads
  onDownload: (cb) => ipcRenderer.on('cv-download', (e, d) => cb(d)),
  showFile: (p) => ipcRenderer.invoke('cv-show-file', p)
});
