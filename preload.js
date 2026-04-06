const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('credentialStore', {
  save:  (email, password) => ipcRenderer.invoke('credentials:save', { email, password }),
  load:  ()                => ipcRenderer.invoke('credentials:load'),
  clear: ()                => ipcRenderer.invoke('credentials:clear'),
});
