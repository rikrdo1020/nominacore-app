import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

let mainWindowRef: BrowserWindow | null = null;

export function initUpdater(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Skip auto-updater in development (not a packaged app)
  if (!isPackaged()) {
    console.log('[Updater] Skipping auto-updater in development mode');
    return;
  }

  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendStatus({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatus({
      status: 'downloading',
      progress: Math.round(progressObj.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ status: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
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

export function checkForUpdates(): void {
  if (!isPackaged()) {
    console.log('[Updater] Cannot check for updates in development mode');
    return;
  }
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[Updater] Failed to check for updates:', err);
  });
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

function sendStatus(payload: UpdateStatusPayload): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('update-status', payload);
  }
}

function isPackaged(): boolean {
  return process.env.NODE_ENV !== 'development' && !process.argv.includes('--dev');
}

export interface UpdateStatusPayload {
  status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  version?: string;
  progress?: number;
  error?: string;
}
