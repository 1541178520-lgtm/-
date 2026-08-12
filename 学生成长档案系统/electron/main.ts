import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalApi } from './localApi.js';
import { LocalStore } from './localStore.js';
import type { DesktopRequestInit } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(app.getPath('userData'), 'archive-data.json');
const localStore = new LocalStore(dataPath);
const localApi = createLocalApi(dataPath);

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

ipcMain.handle('archive-data:export', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const result = await dialog.showSaveDialog({
    title: '导出数据备份',
    defaultPath: `创新学苑学生成长档案备份-${date}.json`,
    filters: [{ name: '学生档案备份', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await localStore.exportTo(result.filePath);
  return { canceled: false, filePath: result.filePath, message: '数据备份已导出' };
});

ipcMain.handle('archive-data:import', async () => {
  const result = await dialog.showOpenDialog({
    title: '导入数据备份',
    properties: ['openFile'],
    filters: [{ name: '学生档案备份', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  await localStore.importFrom(result.filePaths[0]);
  return { canceled: false, filePath: result.filePaths[0], message: '数据备份已导入' };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
