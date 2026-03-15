// Tab & editor state
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let fontSize = 14;
let currentTheme = 'vs-dark';
let monaco;

// Language display names
const LANG_NAMES = {
  plaintext: 'Plain Text', javascript: 'JavaScript', typescript: 'TypeScript',
  python: 'Python', java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#',
  go: 'Go', rust: 'Rust', ruby: 'Ruby', php: 'PHP', swift: 'Swift',
  html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML', yaml: 'YAML',
  markdown: 'Markdown', sql: 'SQL', shell: 'Bash', perl: 'Perl', lua: 'Lua',
};

// File extension to language mapping
const EXT_TO_LANG = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', pyw: 'python',
  java: 'java', class: 'java',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby', rake: 'ruby',
  php: 'php',
  swift: 'swift',
  html: 'html', htm: 'html',
  css: 'css', scss: 'css', less: 'css',
  json: 'json',
  xml: 'xml', svg: 'xml', xsl: 'xml',
  yaml: 'yaml', yml: 'yaml',
  md: 'markdown', markdown: 'markdown',
  sql: 'sql',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  pl: 'perl', pm: 'perl',
  lua: 'lua',
  txt: 'plaintext', log: 'plaintext', cfg: 'plaintext', ini: 'plaintext',
  r: 'r', R: 'r',
};

// Initialize Monaco
require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function (m) {
  monaco = m;

  // Detect platform and add CSS class for macOS traffic light spacing
  window.electronAPI.getPlatform().then(platform => {
    if (platform === 'darwin') {
      document.body.classList.add('platform-darwin');
    }
  });

  createNewTab();
  setupMenuListeners();
  setupUI();
  window.addEventListener('resize', () => {
    const tab = getActiveTab();
    if (tab && tab.editor) tab.editor.layout();
  });
});

function createNewTab(filePath = null, content = '') {
  const id = ++tabCounter;
  const name = filePath ? filePath.split(/[\\/]/).pop() : `Untitled-${id}`;
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const language = EXT_TO_LANG[ext] || 'plaintext';

  const tab = {
    id,
    name,
    filePath,
    language,
    encoding: 'utf-8',
    modified: false,
    model: null,
    editor: null,
    viewState: null,
    savedContent: content,
  };

  tabs.push(tab);
  renderTabs();
  activateTab(id);

  // Set content after editor is created
  if (content) {
    tab.model.setValue(content);
    tab.savedContent = content;
    tab.modified = false;
    renderTabs();
  }

  return tab;
}

function activateTab(id) {
  const prevTab = getActiveTab();
  if (prevTab && prevTab.editor) {
    prevTab.viewState = prevTab.editor.saveViewState();
    prevTab.editor.getModel().onDidChangeContent = null;
  }

  activeTabId = id;
  const tab = getActiveTab();

  // Create or restore editor
  const container = document.getElementById('editor-container');

  if (prevTab && prevTab.editor && prevTab.id !== id) {
    // Hide previous editor by detaching
    prevTab.editor.dispose();
    prevTab.editor = null;
    container.innerHTML = '';
  } else if (!tab.editor) {
    container.innerHTML = '';
  }

  if (!tab.model) {
    tab.model = monaco.editor.createModel(tab.savedContent || '', tab.language);
  }

  if (!tab.editor) {
    tab.editor = monaco.editor.create(container, {
      model: tab.model,
      theme: currentTheme,
      fontSize: fontSize,
      fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      tabSize: 4,
      insertSpaces: true,
      roundedSelection: true,
      mouseWheelZoom: true,
      padding: { top: 8 },
      lineNumbers: 'on',
      folding: true,
      foldingHighlight: true,
      suggest: { showWords: true },
      wordWrap: 'off',
    });

    if (tab.viewState) {
      tab.editor.restoreViewState(tab.viewState);
    }

    // Track modifications
    tab.model.onDidChangeContent(() => {
      const isModified = tab.model.getValue() !== tab.savedContent;
      if (tab.modified !== isModified) {
        tab.modified = isModified;
        renderTabs();
        updateTitle();
      }
    });

    // Update status bar on cursor change
    tab.editor.onDidChangeCursorPosition((e) => {
      updateStatusBar();
    });

    tab.editor.onDidChangeCursorSelection((e) => {
      updateStatusBar();
    });
  }

  tab.editor.focus();
  renderTabs();
  updateStatusBar();
  updateTitle();
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId);
}

function getTabById(id) {
  return tabs.find(t => t.id === id);
}

function renderTabs() {
  const container = document.getElementById('tabs-container');
  container.innerHTML = '';

  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab${tab.id === activeTabId ? ' active' : ''}${tab.modified ? ' modified' : ''}`;
    tabEl.dataset.id = tab.id;

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.name;
    title.title = tab.filePath || tab.name;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tabEl.appendChild(title);
    tabEl.appendChild(closeBtn);

    tabEl.addEventListener('click', () => activateTab(tab.id));
    tabEl.addEventListener('dblclick', () => {
      // Double-click could trigger rename in future
    });

    // Context menu on tab
    tabEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTabContextMenu(e, tab.id);
    });

    container.appendChild(tabEl);
  });
}

async function closeTab(id) {
  const tab = getTabById(id);
  if (!tab) return;

  if (tab.modified) {
    const shouldSave = confirm(`Do you want to save changes to ${tab.name}?`);
    if (shouldSave) {
      const saved = await saveTab(tab);
      if (!saved) return; // Save was cancelled
    }
  }

  // Clean up
  if (tab.editor) {
    tab.editor.dispose();
    tab.editor = null;
  }
  if (tab.model) {
    tab.model.dispose();
    tab.model = null;
  }

  tabs = tabs.filter(t => t.id !== id);

  if (tabs.length === 0) {
    createNewTab();
  } else if (activeTabId === id) {
    activateTab(tabs[tabs.length - 1].id);
  } else {
    renderTabs();
  }
}

async function saveTab(tab) {
  if (!tab) tab = getActiveTab();
  if (!tab) return false;

  if (!tab.filePath) {
    return await saveTabAs(tab);
  }

  const content = tab.model.getValue();
  const result = await window.electronAPI.saveFile({ filePath: tab.filePath, content });

  if (result.success) {
    tab.savedContent = content;
    tab.modified = false;
    renderTabs();
    updateTitle();
    return true;
  } else {
    alert(`Failed to save: ${result.error}`);
    return false;
  }
}

async function saveTabAs(tab) {
  if (!tab) tab = getActiveTab();
  if (!tab) return false;

  const result = await window.electronAPI.saveDialog(tab.filePath || tab.name);
  if (result.canceled) return false;

  tab.filePath = result.filePath;
  tab.name = result.filePath.split(/[\\/]/).pop();

  // Update language based on new extension
  const ext = tab.name.includes('.') ? tab.name.split('.').pop().toLowerCase() : '';
  const newLang = EXT_TO_LANG[ext] || 'plaintext';
  if (newLang !== tab.language) {
    tab.language = newLang;
    monaco.editor.setModelLanguage(tab.model, newLang);
  }

  return await saveTab(tab);
}

async function saveAll() {
  for (const tab of tabs) {
    if (tab.modified) {
      await saveTab(tab);
    }
  }
}

function updateStatusBar() {
  const tab = getActiveTab();
  if (!tab || !tab.editor) return;

  const position = tab.editor.getPosition();
  const selection = tab.editor.getSelection();

  document.getElementById('status-position').textContent =
    `Ln ${position.lineNumber}, Col ${position.column}`;

  // Selection info
  const selText = tab.model.getValueInRange(selection);
  if (selText.length > 0) {
    const lines = selText.split('\n').length;
    document.getElementById('status-selection').textContent =
      `(${selText.length} chars, ${lines} lines selected)`;
  } else {
    document.getElementById('status-selection').textContent = '';
  }

  document.getElementById('status-language').textContent =
    LANG_NAMES[tab.language] || tab.language;
  document.getElementById('status-encoding').textContent =
    tab.encoding.toUpperCase();

  // Detect EOL
  const content = tab.model.getValue();
  const eol = content.includes('\r\n') ? 'CRLF' : 'LF';
  document.getElementById('status-eol').textContent = eol;

  // Indent info
  const options = tab.model.getOptions();
  document.getElementById('status-indent').textContent =
    options.insertSpaces ? `Spaces: ${options.tabSize}` : `Tab Size: ${options.tabSize}`;
}

function updateTitle() {
  const tab = getActiveTab();
  if (!tab) return;
  const modified = tab.modified ? '● ' : '';
  const name = tab.filePath || tab.name;
  window.electronAPI.updateTitle(`${modified}${name} - Notepad++ Mac`);
}

// Tab context menu
function showTabContextMenu(event, tabId) {
  // Remove any existing context menu
  document.querySelectorAll('.tab-context-menu').forEach(el => el.remove());

  const menu = document.createElement('div');
  menu.className = 'tab-context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';

  const items = [
    { label: 'Close', action: () => closeTab(tabId) },
    { label: 'Close Others', action: () => closeOtherTabs(tabId) },
    { label: 'Close All', action: () => closeAllTabs() },
    { separator: true },
    { label: 'Copy File Path', action: () => {
      const tab = getTabById(tabId);
      if (tab && tab.filePath) navigator.clipboard.writeText(tab.filePath);
    }},
  ];

  items.forEach(item => {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'menu-separator';
      menu.appendChild(sep);
    } else {
      const el = document.createElement('div');
      el.className = 'menu-item';
      el.textContent = item.label;
      el.addEventListener('click', () => {
        menu.remove();
        item.action();
      });
      menu.appendChild(el);
    }
  });

  document.body.appendChild(menu);

  // Close on click outside
  const handler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', handler);
    }
  };
  setTimeout(() => document.addEventListener('click', handler), 0);
}

function closeOtherTabs(keepId) {
  const toClose = tabs.filter(t => t.id !== keepId).map(t => t.id);
  toClose.forEach(id => closeTab(id));
}

function closeAllTabs() {
  const allIds = tabs.map(t => t.id);
  allIds.forEach(id => closeTab(id));
}

// Menu event handlers
function setupMenuListeners() {
  window.electronAPI.onNew(() => createNewTab());

  window.electronAPI.onSave(() => saveTab());

  window.electronAPI.onSaveAs(() => saveTabAs());

  window.electronAPI.onSaveAll(() => saveAll());

  window.electronAPI.onCloseTab(() => {
    if (activeTabId) closeTab(activeTabId);
  });

  window.electronAPI.onFind(() => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.getAction('actions.find').run();
    }
  });

  window.electronAPI.onReplace(() => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.getAction('editor.action.startFindReplaceAction').run();
    }
  });

  window.electronAPI.onGotoLine(() => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.getAction('editor.action.gotoLine').run();
    }
  });

  window.electronAPI.onWordWrap((_, enabled) => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
    }
  });

  window.electronAPI.onWhitespace((_, enabled) => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.updateOptions({ renderWhitespace: enabled ? 'all' : 'none' });
    }
  });

  window.electronAPI.onMinimap((_, enabled) => {
    const tab = getActiveTab();
    if (tab && tab.editor) {
      tab.editor.updateOptions({ minimap: { enabled } });
    }
  });

  window.electronAPI.onZoomIn(() => {
    fontSize = Math.min(fontSize + 2, 48);
    applyFontSize();
  });

  window.electronAPI.onZoomOut(() => {
    fontSize = Math.max(fontSize - 2, 8);
    applyFontSize();
  });

  window.electronAPI.onZoomReset(() => {
    fontSize = 14;
    applyFontSize();
  });

  window.electronAPI.onLanguage((_, lang) => {
    const tab = getActiveTab();
    if (tab && tab.model) {
      tab.language = lang;
      monaco.editor.setModelLanguage(tab.model, lang);
      updateStatusBar();
    }
  });

  window.electronAPI.onTheme((_, theme) => {
    currentTheme = theme;
    monaco.editor.setTheme(theme);
    // Update body class for CSS
    document.body.className = theme === 'vs' ? 'theme-light' : '';
  });

  window.electronAPI.onEncoding((_, encoding) => {
    const tab = getActiveTab();
    if (tab) {
      tab.encoding = encoding;
      updateStatusBar();
    }
  });

  window.electronAPI.onFileOpened((_, { filePath, content }) => {
    // Check if file is already open
    const existing = tabs.find(t => t.filePath === filePath);
    if (existing) {
      activateTab(existing.id);
      return;
    }
    createNewTab(filePath, content);
  });

  window.electronAPI.onAppClosing(async () => {
    const unsaved = tabs.filter(t => t.modified);
    if (unsaved.length > 0) {
      const shouldClose = confirm(
        `You have ${unsaved.length} unsaved file(s). Close without saving?`
      );
      if (!shouldClose) {
        window.electronAPI.cancelClose();
        return;
      }
    }
    window.electronAPI.confirmClose();
  });
}

function applyFontSize() {
  tabs.forEach(tab => {
    if (tab.editor) {
      tab.editor.updateOptions({ fontSize });
    }
  });
}

// UI setup
function setupUI() {
  document.getElementById('new-tab-btn').addEventListener('click', () => createNewTab());

  // Drag and drop files
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    for (const file of e.dataTransfer.files) {
      const result = await window.electronAPI.readFile(file.path);
      if (result.success) {
        createNewTab(file.path, result.content);
      }
    }
  });

  // Keyboard shortcuts not handled by menu
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Tab = next tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault();
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const nextIdx = e.shiftKey
        ? (idx - 1 + tabs.length) % tabs.length
        : (idx + 1) % tabs.length;
      activateTab(tabs[nextIdx].id);
    }
  });
}
