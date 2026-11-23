const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  setFocusLock: locked => ipcRenderer.invoke('focus-lock', locked),
  setMode: mode => ipcRenderer.invoke('window-mode', mode),
  notify: (title, body, taskId = null) => ipcRenderer.invoke('show-notification', title, body, taskId),
  onNotificationClick: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, taskId) => callback(taskId);
    ipcRenderer.on('notification-click', listener);
    return () => ipcRenderer.removeListener('notification-click', listener);
  }
});
