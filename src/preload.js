const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveDialog: (defaultPath) => ipcRenderer.invoke('dialog:save', defaultPath),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),

  // Platform
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Window
  updateTitle: (title) => ipcRenderer.send('update-title', title),
  confirmClose: () => ipcRenderer.send('confirm-close'),
  cancelClose: () => ipcRenderer.send('cancel-close'),

  // Menu event listeners
  onNew: (cb) => ipcRenderer.on('menu-new', cb),
  onSave: (cb) => ipcRenderer.on('menu-save', cb),
  onSaveAs: (cb) => ipcRenderer.on('menu-save-as', cb),
  onSaveAll: (cb) => ipcRenderer.on('menu-save-all', cb),
  onCloseTab: (cb) => ipcRenderer.on('menu-close-tab', cb),
  onFind: (cb) => ipcRenderer.on('menu-find', cb),
  onReplace: (cb) => ipcRenderer.on('menu-replace', cb),
  onGotoLine: (cb) => ipcRenderer.on('menu-goto-line', cb),
  onWordWrap: (cb) => ipcRenderer.on('menu-word-wrap', cb),
  onWhitespace: (cb) => ipcRenderer.on('menu-whitespace', cb),
  onMinimap: (cb) => ipcRenderer.on('menu-minimap', cb),
  onZoomIn: (cb) => ipcRenderer.on('menu-zoom-in', cb),
  onZoomOut: (cb) => ipcRenderer.on('menu-zoom-out', cb),
  onZoomReset: (cb) => ipcRenderer.on('menu-zoom-reset', cb),
  onLanguage: (cb) => ipcRenderer.on('menu-language', cb),
  onTheme: (cb) => ipcRenderer.on('menu-theme', cb),
  onEncoding: (cb) => ipcRenderer.on('menu-encoding', cb),
  onFileOpened: (cb) => ipcRenderer.on('file-opened', cb),
  onAppClosing: (cb) => ipcRenderer.on('app-closing', cb),
  onWindowFocus: (cb) => ipcRenderer.on('window-focus', cb),
});
