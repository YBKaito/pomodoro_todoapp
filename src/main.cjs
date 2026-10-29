const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
let win;
let expandedBounds;
let compact = false;
let dock = 'none';
let focusLocked = false;
function positionDock() {
  if (!win || compact || dock === 'none') return;
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const width = Math.min(450, area.width);
  win.setBounds({ x: dock === 'left' ? area.x : area.x + area.width - width, y: area.y, width, height: area.height });
}
function createWindow() {
  win = new BrowserWindow({ width: 1140, height: 780, minWidth: 340, minHeight: 220,
    backgroundColor: '#0b1527', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(__dirname, 'desktop.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  screen.on('display-metrics-changed', positionDock);
  win.on('close', event => { if (compact && focusLocked) { event.preventDefault(); win.show(); } });
  win.on('closed', () => { win = null; });
}
ipcMain.handle('window-mode', (event, mode) => {
  if (event.sender !== win?.webContents || !['compact', 'note', 'full', 'left', 'right', 'none'].includes(mode)) return;
  if (mode === 'compact' || mode === 'note') {
    if (!compact) expandedBounds = win.getBounds(); compact = true;
    win.setMinimumSize(340, 220); win.setAlwaysOnTop(true);
    const area = screen.getDisplayMatching(expandedBounds).workArea;
    win.setBounds({ x: area.x + area.width - 360, y: area.y + 24, width: 350, height: Math.min(mode === 'note' ? 560 : 320, area.height) });
  } else if (mode === 'full' && compact) {
    compact = false; win.setAlwaysOnTop(false);
    if (expandedBounds) win.setBounds(expandedBounds);
    positionDock();
  } else if (['left', 'right', 'none'].includes(mode)) {
    if (compact) { compact = false; win.setAlwaysOnTop(false); }
    dock = mode;
    if (mode === 'none') {
      const area = screen.getDisplayMatching(win.getBounds()).workArea;
      win.setBounds({ x: area.x + 30, y: area.y + 30, width: Math.min(1140, area.width - 60), height: Math.min(780, area.height - 60) });
    } else positionDock();
  }
  return { compact, dock };
});
ipcMain.handle('focus-lock', (event, locked) => {
  if (event.sender !== win?.webContents || typeof locked !== 'boolean') return;
  focusLocked = locked;
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
