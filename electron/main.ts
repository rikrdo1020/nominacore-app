import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initUpdater, checkForUpdates, quitAndInstall } from './updater';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'NominaCore - Control de Horas',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  initUpdater(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for auto-updater
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

ipcMain.on('quit-and-install', () => {
  quitAndInstall();
});
