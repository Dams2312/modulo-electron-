"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('g3ops', {
    getState: () => electron_1.ipcRenderer.invoke('get-state'),
    closeToast: () => electron_1.ipcRenderer.send('close-toast'),
    openDetail: () => electron_1.ipcRenderer.send('open-detail'),
    getDetail: () => electron_1.ipcRenderer.invoke('get-detail'),
    closeDetail: () => electron_1.ipcRenderer.send('close-detail'),
    openAction: (url) => electron_1.ipcRenderer.send('open-action', url),
    ack: (id) => electron_1.ipcRenderer.send('ack', id),
    onDetail: (callback) => {
        electron_1.ipcRenderer.on('detail', (_event, notification) => {
            callback(notification);
        });
    },
    // Canal específico para el Toast
    onToast: (callback) => {
        electron_1.ipcRenderer.on('toast-notification', (_event, notification) => {
            callback(notification);
        });
    }
});
