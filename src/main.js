const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const recentFiles = [];
const MAX_RECENT = 10;
const isMac = process.platform === 'darwin';

// Files queued to open before the window is ready
const pendingFiles = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: 'Notepad++ Mac',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 12, y: 10 } : undefined,
    vibrancy: isMac ? 'under-window' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  buildMenu();

  // Graceful show to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open any files that were queued before window was ready
    for (const filePath of pendingFiles) {
      openFile(filePath);
    }
    pendingFiles.length = 0;
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.webContents.send('app-closing');
  });

  // macOS: restore focus when dock icon clicked
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus');
  });
}

function buildMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => handleOpen() },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
        { label: 'Save All', accelerator: 'CmdOrCtrl+Alt+S', click: () => mainWindow.webContents.send('menu-save-all') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow.webContents.send('menu-close-tab') },
        { type: 'separator' },
        {
          label: 'Recent Files',
          submenu: recentFiles.length > 0
            ? [
                ...recentFiles.map(f => ({
                  label: f,
                  click: () => openFile(f),
                })),
                { type: 'separator' },
                { label: 'Clear Recent Files', click: () => { recentFiles.length = 0; buildMenu(); } },
              ]
            : [{ label: 'No recent files', enabled: false }],
        },
        { type: 'separator' },
        { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: () => mainWindow.webContents.print() },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' }] : []),
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find...', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu-find') },
        { label: 'Replace...', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu-replace') },
        { label: 'Go to Line...', accelerator: 'CmdOrCtrl+G', click: () => mainWindow.webContents.send('menu-goto-line') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Word Wrap', type: 'checkbox', checked: false, click: (item) => mainWindow.webContents.send('menu-word-wrap', item.checked) },
        { label: 'Show Whitespace', type: 'checkbox', checked: false, click: (item) => mainWindow.webContents.send('menu-whitespace', item.checked) },
        { label: 'Show Minimap', type: 'checkbox', checked: true, click: (item) => mainWindow.webContents.send('menu-minimap', item.checked) },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.send('menu-zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.send('menu-zoom-out') },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.send('menu-zoom-reset') },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Encoding',
      submenu: [
        { label: 'UTF-8', type: 'radio', checked: true, click: () => mainWindow.webContents.send('menu-encoding', 'utf-8') },
        { label: 'UTF-8 with BOM', type: 'radio', click: () => mainWindow.webContents.send('menu-encoding', 'utf-8-bom') },
        { label: 'UTF-16 LE', type: 'radio', click: () => mainWindow.webContents.send('menu-encoding', 'utf-16le') },
        { label: 'ISO 8859-1 (Latin-1)', type: 'radio', click: () => mainWindow.webContents.send('menu-encoding', 'latin1') },
        { label: 'Windows-1252', type: 'radio', click: () => mainWindow.webContents.send('menu-encoding', 'win1252') },
      ],
    },
    {
      label: 'Language',
      submenu: [
        { label: 'Plain Text', click: () => mainWindow.webContents.send('menu-language', 'plaintext') },
        { type: 'separator' },
        { label: 'Bash', click: () => mainWindow.webContents.send('menu-language', 'shell') },
        { label: 'C', click: () => mainWindow.webContents.send('menu-language', 'c') },
        { label: 'C++', click: () => mainWindow.webContents.send('menu-language', 'cpp') },
        { label: 'C#', click: () => mainWindow.webContents.send('menu-language', 'csharp') },
        { label: 'CSS', click: () => mainWindow.webContents.send('menu-language', 'css') },
        { label: 'Go', click: () => mainWindow.webContents.send('menu-language', 'go') },
        { label: 'HTML', click: () => mainWindow.webContents.send('menu-language', 'html') },
        { label: 'Java', click: () => mainWindow.webContents.send('menu-language', 'java') },
        { label: 'JavaScript', click: () => mainWindow.webContents.send('menu-language', 'javascript') },
        { label: 'JSON', click: () => mainWindow.webContents.send('menu-language', 'json') },
        { label: 'Lua', click: () => mainWindow.webContents.send('menu-language', 'lua') },
        { label: 'Markdown', click: () => mainWindow.webContents.send('menu-language', 'markdown') },
        { label: 'Perl', click: () => mainWindow.webContents.send('menu-language', 'perl') },
        { label: 'PHP', click: () => mainWindow.webContents.send('menu-language', 'php') },
        { label: 'Python', click: () => mainWindow.webContents.send('menu-language', 'python') },
        { label: 'Ruby', click: () => mainWindow.webContents.send('menu-language', 'ruby') },
        { label: 'Rust', click: () => mainWindow.webContents.send('menu-language', 'rust') },
        { label: 'SQL', click: () => mainWindow.webContents.send('menu-language', 'sql') },
        { label: 'Swift', click: () => mainWindow.webContents.send('menu-language', 'swift') },
        { label: 'TypeScript', click: () => mainWindow.webContents.send('menu-language', 'typescript') },
        { label: 'XML', click: () => mainWindow.webContents.send('menu-language', 'xml') },
        { label: 'YAML', click: () => mainWindow.webContents.send('menu-language', 'yaml') },
      ],
    },
    {
      label: 'Theme',
      submenu: [
        { label: 'Default Dark', type: 'radio', checked: true, click: () => mainWindow.webContents.send('menu-theme', 'vs-dark') },
        { label: 'Default Light', type: 'radio', click: () => mainWindow.webContents.send('menu-theme', 'vs') },
        { label: 'High Contrast', type: 'radio', click: () => mainWindow.webContents.send('menu-theme', 'hc-black') },
      ],
    },
    ...(isMac ? [{
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    }] : []),
    {
      label: 'Help',
      submenu: [
        { label: 'About Notepad++ Mac', click: () => showAbout() },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpen() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'log', 'csv'] },
      { name: 'Source Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 'go', 'rs', 'swift', 'php', 'lua', 'pl'] },
      { name: 'Web Files', extensions: ['html', 'htm', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'svg'] },
      { name: 'Shell Scripts', extensions: ['sh', 'bash', 'zsh'] },
    ],
  });

  if (!result.canceled) {
    for (const filePath of result.filePaths) {
      await openFile(filePath);
    }
  }
}

async function openFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file-opened', { filePath, content });
    addRecentFile(filePath);
    if (isMac) app.addRecentDocument(filePath);
  } catch (err) {
    dialog.showErrorBox('Error', `Failed to open file: ${err.message}`);
  }
}

function addRecentFile(filePath) {
  const index = recentFiles.indexOf(filePath);
  if (index > -1) recentFiles.splice(index, 1);
  recentFiles.unshift(filePath);
  if (recentFiles.length > MAX_RECENT) recentFiles.pop();
  buildMenu();
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Notepad++ Mac',
    message: 'Notepad++ Mac',
    detail: 'Version 1.0.0\n\nA Notepad++ inspired text editor for macOS.\nBuilt with Electron and Monaco Editor.\n\nSupports 20+ programming languages with syntax highlighting,\nmulti-tab editing, find & replace, and more.',
  });
}

// IPC handlers
ipcMain.handle('dialog:save', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt'] },
    ],
  });
  return result;
});

ipcMain.handle('file:save', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    addRecentFile(filePath);
    if (isMac) app.addRecentDocument(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('confirm-close', () => {
  mainWindow.destroy();
});

ipcMain.on('cancel-close', () => {
  // User cancelled, do nothing
});

ipcMain.on('update-title', (event, title) => {
  mainWindow.setTitle(title);
});

ipcMain.handle('get-platform', () => process.platform);

// macOS: handle file open via Finder / double-click / dock drop
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    openFile(filePath);
  } else {
    pendingFiles.push(filePath);
  }
});

// macOS: handle opening URLs (notepadppmac://open?path=...)
app.on('open-url', (event, url) => {
  event.preventDefault();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
