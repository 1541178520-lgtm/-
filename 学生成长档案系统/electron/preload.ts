import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopRequestInit, DesktopApiResponse } from './types.js';

contextBridge.exposeInMainWorld('archiveDesktop', {
  request(path: string, init: DesktopRequestInit = {}): Promise<DesktopApiResponse> {
    return ipcRenderer.invoke('archive-api:request', path, init);
  },
});
