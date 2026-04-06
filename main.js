// main.js – Electron entry point

const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

let httpServer;

// ── Credential storage ─────────────────────────────────────
const credentialsPath = path.join(app.getPath('userData'), 'credentials.json');

ipcMain.handle('credentials:save', (_e, { email, password }) => {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false };
  const data = {
    email:    safeStorage.encryptString(email).toString('base64'),
    password: safeStorage.encryptString(password).toString('base64'),
  };
  fs.writeFileSync(credentialsPath, JSON.stringify(data), 'utf8');
  return { ok: true };
});

ipcMain.handle('credentials:load', () => {
  if (!safeStorage.isEncryptionAvailable()) return null;
  if (!fs.existsSync(credentialsPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return {
      email:    safeStorage.decryptString(Buffer.from(data.email,    'base64')),
      password: safeStorage.decryptString(Buffer.from(data.password, 'base64')),
    };
  } catch {
    return null;
  }
});

ipcMain.handle('credentials:clear', () => {
  if (fs.existsSync(credentialsPath)) fs.unlinkSync(credentialsPath);
  return { ok: true };
});

// ── Backend ────────────────────────────────────────────────
async function startBackend() {
  try {
    const serverPath    = path.join(__dirname, 'server', 'index.mjs');
    const serverFileUrl = pathToFileURL(serverPath).href;
    const serverModule  = await import(serverFileUrl);
    httpServer = serverModule.startServer(3000);
    console.log('Backend started on port 3000');
  } catch (err) {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox('Backend startup error', err.stack || String(err));
    throw err;
  }
}

// ── Window ─────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 1500,
    backgroundColor: '#09090f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.maximize();
  win.loadURL('http://localhost:3000/login.html');
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    console.error('App startup failed:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (httpServer?.close) httpServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
