// main.js – Electron entry point

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let httpServer;

async function startBackend() {
  try {
    const serverPath = path.join(__dirname, 'server', 'index.mjs');
    const serverFileUrl = pathToFileURL(serverPath).href;
    const serverModule = await import(serverFileUrl);
    httpServer = serverModule.startServer(3000);
    console.log('Backend started on port 3000');
  } catch (err) {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox(
      'Backend startup error',
      err.stack || String(err)
    );
    throw err;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 1500,
    backgroundColor: '#0F0E17',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
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
    // already handled by dialog, but keep a log
    console.error('App startup failed:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (httpServer && httpServer.close) {
    httpServer.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});