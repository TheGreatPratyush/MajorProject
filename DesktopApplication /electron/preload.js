import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('startupAyushDesktop', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
});
