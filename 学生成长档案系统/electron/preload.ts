import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopRequestInit, DesktopApiResponse, DesktopFileResult } from './types.js';

contextBridge.exposeInMainWorld('archiveDesktop', {
  request(path: string, init: DesktopRequestInit = {}): Promise<DesktopApiResponse> {
    return ipcRenderer.invoke('archive-api:request', path, init);
  },
  exportBackup(): Promise<DesktopFileResult> {
    return ipcRenderer.invoke('archive-data:export');
  },
  importBackup(): Promise<DesktopFileResult> {
    return ipcRenderer.invoke('archive-data:import');
  },
});
