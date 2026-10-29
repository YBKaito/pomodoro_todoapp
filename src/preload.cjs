const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', { setFocusLock: locked => ipcRenderer.invoke('focus-lock', locked), setMode: mode => ipcRenderer.invoke('window-mode', mode) });
