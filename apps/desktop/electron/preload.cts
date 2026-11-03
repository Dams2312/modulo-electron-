import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('g3ops', {
  getState: () => ipcRenderer.invoke('get-state'),

  closeToast: () => ipcRenderer.send('close-toast'),

  openDetail: () => ipcRenderer.send('open-detail'),

  getDetail: () => ipcRenderer.invoke('get-detail'),
  closeDetail: () => ipcRenderer.send('close-detail'),

  openAction: (url: string) =>
    ipcRenderer.send('open-action', url),

  ack: (id: string) =>
    ipcRenderer.send('ack', id),

  onDetail: (callback: (notification: any) => void) => {
    ipcRenderer.on('detail', (_event, notification) => {
      callback(notification);
    });
  },

  // Canal específico para el Toast
  onToast: (callback: (notification: any) => void) => {
    ipcRenderer.on('toast-notification', (_event, notification) => {
      callback(notification);
    });
  }
});