"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const updater_1 = require("./updater");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: 'NominaCore - Control de Horas',
    });
    mainWindow.loadFile(path_1.default.join(__dirname, '..', 'dist', 'index.html'));
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
    (0, updater_1.initUpdater)(mainWindow);
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC handlers for auto-updater
electron_1.ipcMain.on('check-for-updates', () => {
    (0, updater_1.checkForUpdates)();
});
electron_1.ipcMain.on('quit-and-install', () => {
    (0, updater_1.quitAndInstall)();
});
//# sourceMappingURL=main.js.map