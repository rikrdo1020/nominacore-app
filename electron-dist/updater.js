"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initUpdater = initUpdater;
exports.checkForUpdates = checkForUpdates;
exports.quitAndInstall = quitAndInstall;
const electron_updater_1 = require("electron-updater");
let mainWindowRef = null;
function initUpdater(mainWindow) {
    mainWindowRef = mainWindow;
    // Skip auto-updater in development (not a packaged app)
    if (!isPackaged()) {
        console.log('[Updater] Skipping auto-updater in development mode');
        return;
    }
    electron_updater_1.autoUpdater.logger = console;
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        sendStatus({ status: 'checking' });
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        sendStatus({ status: 'available', version: info.version });
    });
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        sendStatus({ status: 'not-available' });
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        sendStatus({
            status: 'downloading',
            progress: Math.round(progressObj.percent),
        });
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        sendStatus({ status: 'downloaded', version: info.version });
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err);
        // Silently ignore "no published versions" — expected on first install before any release exists
        if (err.message.includes('No published versions')) {
            sendStatus({ status: 'not-available' });
            return;
        }
        sendStatus({ status: 'error', error: err.message });
    });
    // Check for updates shortly after startup (delay to not block window load)
    setTimeout(() => {
        checkForUpdates();
    }, 5000);
    // Re-check every hour while the app is open
    setInterval(() => {
        checkForUpdates();
    }, 60 * 60 * 1000);
}
function checkForUpdates() {
    if (!isPackaged()) {
        console.log('[Updater] Cannot check for updates in development mode');
        return;
    }
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error('[Updater] Failed to check for updates:', err);
    });
}
function quitAndInstall() {
    electron_updater_1.autoUpdater.quitAndInstall();
}
function sendStatus(payload) {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('update-status', payload);
    }
}
function isPackaged() {
    return process.env.NODE_ENV !== 'development' && !process.argv.includes('--dev');
}
//# sourceMappingURL=updater.js.map