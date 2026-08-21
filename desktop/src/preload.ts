import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('eyesbreakerBridge', {
    postMessage: (message: unknown): void => {
        ipcRenderer.send('eyesbreaker:message', message);
    },
    onMessage: (handler: (message: unknown) => void): void => {
        ipcRenderer.on('eyesbreaker:update', (_event, message: unknown) => {
            handler(message);
        });
    },
});
