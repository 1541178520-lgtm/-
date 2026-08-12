import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalApi } from './localApi.js';
import type { DesktopRequestInit } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localApi = createLocalApi(path.join(app.getPath('userData'), 'archive-data.json'));

async function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: '创新学苑学生成长档案系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    await window.loadURL(devUrl);
  } else {
    await window.loadFile(path.join(__dirname, '..', '..', 'dist-desktop', 'index.html'));
  }
}

ipcMain.handle('archive-api:request', async (_event, requestPath: string, init: DesktopRequestInit = {}) => {
  return localApi.handle(requestPath, init);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
