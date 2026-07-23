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
  winSetBounds: (b) => ipcRenderer.invoke('cv-win-set-bounds', b)
});
