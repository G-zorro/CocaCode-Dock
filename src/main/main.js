const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const store = require('./store');
const {
  sanitizeData,
  sanitizeItem,
  sanitizeSettings,
  classify,
  normalizePath,
  isValidAppPath,
  isValidUrl,
  FAV_GROUP,
  BOOKMARK_GROUP,
} = require('./data-schema');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const APP_NAME = 'CocaCode Dock';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.bmp': 'image/bmp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

let mainWindow = null;
let tray = null;
let appData = sanitizeData(store.load());
const settings = appData.settings;

function saveAppData() {
  appData = sanitizeData(appData);
  appData.settings = settings;
  store.save(appData);
  return appData;
}

function getFileIconDataUrl(targetPath) {
  return new Promise((resolve) => {
    try {
      if (typeof targetPath !== 'string' || !fs.existsSync(targetPath)) return resolve(null);
      app.getFileIcon(targetPath, { size: 'large' }).then((icon) => {
        if (!icon || icon.isEmpty()) return resolve(null);
        const dataUrl = icon.toDataURL();
        if (!dataUrl || dataUrl === 'data:image/png;base64,') return resolve(null);
        resolve(dataUrl);
      }).catch(() => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

function splitArgs(input) {
  const str = String(input || '').trim();
  if (!str) return [];
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  let m;
  while ((m = re.exec(str)) !== null) out.push(m[1] || m[2] || m[0]);
  return out.slice(0, 20);
}

// ---------- 本机程序扫描 ----------
const PS_SCAN = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference='SilentlyContinue'
$sh=New-Object -ComObject WScript.Shell
$dirs=@([Environment]::GetFolderPath('StartMenu'),[Environment]::GetFolderPath('CommonStartMenu'))
$out=@()
foreach($d in $dirs){
  Get-ChildItem -Path $d -Recurse -Include *.lnk | ForEach-Object {
    $sc=$sh.CreateShortcut($_.FullName)
    $t=$sc.TargetPath
    if($t -and (Test-Path $t)){
      $ext=([System.IO.Path]::GetExtension($t)).ToLower()
      if(@('.exe','.bat','.cmd','.msi','.ps1','.ahk','.jar','.appref-ms') -contains $ext){
        $out+=@{name=$_.BaseName; target=$t}
      }
    }
  }
}
$out | ConvertTo-Json -Compress
`;

function scanPrograms() {
  return new Promise((resolve) => {
    const os = require('os');
    const psPath = path.join(os.tmpdir(), 'zydock_scan.ps1');
    fs.writeFileSync(psPath, PS_SCAN, 'utf8');
    const { execFile } = require('child_process');
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath],
      { windowsHide: true, timeout: 90000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve([]);
        try {
          let data = JSON.parse(String(stdout || '').trim());
          if (data && !Array.isArray(data)) data = [data];
          const seen = new Set();
          const result = [];
          for (const p of data) {
            const t = p.target;
            if (!t || seen.has(t.toLowerCase())) continue;
            seen.add(t.toLowerCase());
            const name = (p.name || path.basename(t, path.extname(t))).trim();
            result.push({ name, target: t, category: classify(name, t) });
          }
          resolve(result);
        } catch (e) {
          resolve([]);
        }
      });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 740,
    minWidth: 820,
    minHeight: 520,
    frame: true,
    resizable: true,
    backgroundColor: '#f5f5f7',
    show: false,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html')).catch((e) => {
    console.error('Failed to load renderer:', e);
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  registerHotkey();
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow() {
  if (!mainWindow) { createWindow(); showWindow(); return; }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

function buildTray() {
  try {
    const icon = nativeImage.createFromDataURL(trayIconSvg());
    tray = new Tray(icon);
    tray.setToolTip(APP_NAME);
    tray.on('click', () => toggleWindow());
    const ctx = Menu.buildFromTemplate([
      { label: '显示 / 隐藏', click: () => toggleWindow() },
      { label: '设置', click: () => { showWindow(); mainWindow.webContents.send('open-settings'); } },
      { type: 'separator' },
      { label: '退出', click: () => { app.isQuiting = true; app.quit(); } },
    ]);
    tray.setContextMenu(ctx);
  } catch (e) {
    console.error('Tray init failed:', e);
  }
}

function trayIconSvg() {
  const c = '#0071e3';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="${c}"/>
    <circle cx="16" cy="16" r="7" fill="#fff"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const hk = String(settings.hotkey || '').trim();
  if (!hk) return;
  try {
    globalShortcut.register(hk, () => toggleWindow());
  } catch (e) {
    console.error('Failed to register hotkey', hk, e);
  }
}

function applySettings(next) {
  Object.assign(settings, sanitizeSettings(next));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop));
  }
  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.autoStart), path: process.execPath });
  } catch (e) { /* noop */ }
  registerHotkey();
  saveAppData();
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createWindow();
  buildTray();
  applySettings(settings);

  if (settings.autoScan && appData.items.length === 0) {
    try {
      const programs = await scanPrograms();
      if (programs.length) {
        const baseOrder = appData.items.length;
        for (let i = 0; i < programs.length; i++) {
          const p = programs[i];
          const item = sanitizeItem({
            id: Date.now() + Math.floor(Math.random() * 1000) + i,
            name: p.name,
            kind: 'app',
            target: p.target,
            category: p.category,
            order: baseOrder + i,
          }, appData.categories);
          const ic = await getFileIconDataUrl(p.target);
          if (ic) item.icon = ic;
          appData.items.push(item);
        }
        saveAppData();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('data-reloaded', appData);
        }
      }
    } catch (e) {
      console.error('Auto scan failed:', e);
    }
  }
}).catch((e) => {
  console.error('Startup failed:', e);
  app.quit();
});

app.on('before-quit', () => { try { globalShortcut.unregisterAll(); } catch (e) { /* noop */ } });
app.on('window-all-closed', () => { /* 托盘常驻，不退出 */ });
app.on('second-instance', () => { showWindow(); });

// ---------- IPC ----------
ipcMain.handle('get-data', () => appData);

ipcMain.handle('save-data', (_, data) => {
  if (!data || typeof data !== 'object') return false;
  appData = sanitizeData(data);
  appData.settings = settings;
  const saved = store.save(appData);
  return saved;
});

ipcMain.handle('get-app-info', () => ({ name: APP_NAME, version: app.getVersion() }));

ipcMain.handle('save-settings', (_, next) => {
  applySettings(next || {});
  return { ok: true, settings };
});

ipcMain.handle('get-file-icon', async (_, targetPath) => getFileIconDataUrl(targetPath));

ipcMain.handle('browse-target', async () => {
  if (!mainWindow) return null;
  const r = await dialog.showOpenDialog(mainWindow, {
    title: '选择程序 / 快捷方式',
    filters: [{ name: '程序', extensions: ['exe', 'lnk', 'bat', 'cmd', 'msi', 'ps1', 'ahk', 'jar', 'appref-ms'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return r.filePaths[0];
});

ipcMain.handle('pick-icon-file', async () => {
  if (!mainWindow) return null;
  const r = await dialog.showOpenDialog(mainWindow, {
    title: '选择图标图片',
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'ico', 'svg'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    const buf = fs.readFileSync(r.filePaths[0]);
    const ext = path.extname(r.filePaths[0]).toLowerCase();
    const mime = MIME[ext] || 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('scan-programs', async () => {
  const programs = await scanPrograms();
  return { ok: true, programs };
});

ipcMain.handle('save-item', async (_, payload) => {
  const item = sanitizeItem(payload, appData.categories);
  if (item.kind === 'app' && !isValidAppPath(item.target)) return { ok: false, error: 'BAD_PATH' };
  if (item.kind === 'url' && !isValidUrl(item.target)) return { ok: false, error: 'BAD_URL' };
  if (item.kind === 'cmd' && !item.target) return { ok: false, error: 'BAD_CMD' };

  if (item.kind === 'app' && !item.customIcon) {
    const icon = await getFileIconDataUrl(item.target);
    if (icon) item.icon = icon;
  }

  item.sourcePath = normalizePath(payload.sourcePath || item.sourcePath || '');

  const idx = appData.items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    const existing = appData.items[idx];
    item.order = Number.isFinite(existing.order) ? existing.order : appData.items.length;
    appData.items[idx] = item;
  } else {
    item.order = Number.isFinite(item.order) ? item.order : appData.items.length;
    appData.items.push(item);
  }
  saveAppData();
  return { ok: true, item };
});

ipcMain.handle('delete-item', (_, id) => {
  const numId = Number(id);
  const before = appData.items.length;
  appData.items = appData.items.filter((i) => i.id !== numId);
  const changed = appData.items.length !== before;
  if (changed) saveAppData();
  return { ok: true, changed };
});

ipcMain.handle('reclassify-item', (_, { id, category }) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  if (String(category).trim() === FAV_GROUP) {
    item.favorite = true;
  } else if (String(category).trim() === BOOKMARK_GROUP) {
    if (item.kind !== 'url') return { ok: false, error: 'NOT_URL' };
    item.category = BOOKMARK_GROUP;
    item.favorite = false;
  } else {
    const cats = sanitizeData({ categories: appData.categories }).categories;
    const set = new Set(cats.map((c) => c.toLowerCase()));
    if (!set.has(String(category).trim().toLowerCase())) return { ok: false, error: 'BAD_CAT' };
    item.category = String(category).trim();
    item.favorite = false;
  }
  saveAppData();
  return { ok: true, item };
});

ipcMain.handle('toggle-favorite', (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  item.favorite = !item.favorite;
  saveAppData();
  return { ok: true, favorite: item.favorite };
});

ipcMain.handle('launch-item', async (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  try {
    if (item.kind === 'url') {
      await shell.openExternal(item.target);
      return { ok: true };
    }
    if (!fs.existsSync(item.target)) return { ok: false, error: 'PATH_NOT_FOUND' };

    if (item.kind === 'cmd') {
      const child = spawn('cmd.exe', ['/c', item.target], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { ok: true };
    }
    if (item.launchArgs || item.workingDir) {
      const args = splitArgs(item.launchArgs);
      const cwd = (item.workingDir && fs.existsSync(item.workingDir)) ? item.workingDir : path.dirname(item.target);
      const child = spawn(item.target, args, { cwd, detached: true, stdio: 'ignore', windowsHide: false });
      child.unref();
      return { ok: true };
    }
    const err = shell.openPath(item.target);
    if (err && err !== '') return { ok: false, error: err };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

ipcMain.handle('launch-admin', async (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  if (item.kind !== 'app') return { ok: false, error: 'NOT_APP' };
  if (!fs.existsSync(item.target)) return { ok: false, error: 'PATH_NOT_FOUND' };
  try {
    const args = splitArgs(item.launchArgs);
    let cmd;
    const safe = String(item.target).replace(/'/g, "''");
    if (args.length) {
      const safeArgs = args.map((a) => `'${String(a).replace(/'/g, "''")}'`).join(',');
      cmd = `Start-Process -FilePath '${safe}' -ArgumentList @(${safeArgs}) -Verb RunAs`;
    } else {
      cmd = `Start-Process -FilePath '${safe}' -Verb RunAs`;
    }
    const { execFile } = require('child_process');
    await new Promise((resolve, reject) => {
      execFile('powershell', ['-NoProfile', '-Command', cmd], { windowsHide: true, timeout: 30000 },
        (err) => (err ? reject(err) : resolve()));
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

function buildAdminTerminalCommand(item, type) {
  const cwd = (item.workingDir && fs.existsSync(item.workingDir))
    ? item.workingDir
    : (item.target && item.kind === 'app' ? path.dirname(item.target) : '');
  const safeCwd = String(cwd || '').replace(/'/g, "''");
  const safeCmd = String(item.target || '').replace(/'/g, "''");
  if (type === 'cmd') {
    let arg = '/k';
    if (item.kind === 'cmd') {
      arg += ` ${safeCmd}`;
    } else if (safeCwd) {
      arg += ` cd /d "${safeCwd}"`;
    }
    return `Start-Process cmd.exe -Verb RunAs -ArgumentList '${arg}'`;
  }
  // powershell
  const pieces = ["'-NoExit'"];
  if (item.kind === 'cmd') {
    pieces.push("'-Command'", `'${safeCmd}'`);
  } else if (safeCwd) {
    pieces.push("'-Command'", `'Set-Location "${safeCwd}"'`);
  }
  return `Start-Process powershell.exe -Verb RunAs -ArgumentList ${pieces.join(',')}`;
}

async function launchAdminTerminal(id, type) {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  try {
    const cmd = buildAdminTerminalCommand(item, type);
    const { execFile } = require('child_process');
    await new Promise((resolve, reject) => {
      execFile('powershell', ['-NoProfile', '-Command', cmd], { windowsHide: true, timeout: 30000 },
        (err) => (err ? reject(err) : resolve()));
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

ipcMain.handle('launch-admin-cmd', async (_, id) => launchAdminTerminal(id, 'cmd'));
ipcMain.handle('launch-admin-powershell', async (_, id) => launchAdminTerminal(id, 'powershell'));

ipcMain.handle('open-item-folder', async (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  if (item.kind === 'url') return { ok: false, error: 'NO_FOLDER' };
  if (!fs.existsSync(item.target)) return { ok: false, error: 'PATH_NOT_FOUND' };
  try {
    shell.showItemInFolder(item.target);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

ipcMain.handle('open-source-path', async (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  const sp = item.sourcePath || '';
  if (!sp) return { ok: false, error: 'NO_SOURCE_PATH' };
  if (!fs.existsSync(sp)) return { ok: false, error: 'SOURCE_NOT_FOUND' };
  try {
    const err = shell.openPath(sp);
    if (err && err !== '') return { ok: false, error: err };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

ipcMain.handle('uninstall-item', async (_, id) => {
  const item = appData.items.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: 'NOT_FOUND' };
  if (item.kind !== 'app') return { ok: false, error: 'NOT_APP' };
  const safeName = String(item.name || '').replace(/'/g, "''");
  const ps = `
$ErrorActionPreference='SilentlyContinue'
$keys=@('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
$app=Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName -like "*${safeName}*" } | Select-Object -First 1
if($app){
  if($app.QuietUninstallString){ iex $app.QuietUninstallString }
  elseif($app.UninstallString){ iex $app.UninstallString }
  Write-Output "FOUND"
} else {
  Start-Process control.exe appwiz.cpl
  Write-Output "MANUAL"
}`;
  try {
    const { execFile } = require('child_process');
    const out = await new Promise((resolve, reject) => {
      execFile('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 },
        (err, stdout) => (err ? reject(err) : resolve(String(stdout || ''))));
    });
    if (out.includes('MANUAL')) return { ok: true, manual: true };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

ipcMain.handle('export-data', async () => {
  if (!mainWindow) return { ok: false, canceled: true };
  const target = await dialog.showSaveDialog(mainWindow, {
    title: '导出启动栏备份',
    defaultPath: `zydock-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (target.canceled || !target.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(target.filePath, JSON.stringify(sanitizeData(appData), null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

ipcMain.handle('import-data', async () => {
  if (!mainWindow) return { ok: false, canceled: true };
  const picked = await dialog.showOpenDialog(mainWindow, {
    title: '导入启动栏备份',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (picked.canceled || !picked.filePaths[0]) return { ok: false, canceled: true };
  try {
    const parsed = JSON.parse(fs.readFileSync(picked.filePaths[0], 'utf8'));
    appData = sanitizeData(parsed);
    appData.settings = settings;
    store.save(appData);
    return { ok: true, data: appData };
  } catch (e) {
    return { ok: false, error: 'IMPORT_FAIL' };
  }
});

ipcMain.handle('reorder-items', (_, orderedIds) => {
  if (!Array.isArray(orderedIds)) return { ok: false, error: 'BAD_DATA' };
  const map = new Map(appData.items.map((i) => [i.id, i]));
  const next = [];
  for (let idx = 0; idx < orderedIds.length; idx++) {
    const id = Number(orderedIds[idx]);
    const item = map.get(id);
    if (!item) continue;
    item.order = idx;
    next.push(item);
    map.delete(id);
  }
  // 保留未参与排序的项（理论上不应发生）
  for (const item of map.values()) next.push(item);
  appData.items = next;
  saveAppData();
  return { ok: true };
});

ipcMain.handle('save-categories', (_, payload) => {
  const p = (payload && typeof payload === 'object') ? payload : {};
  const incoming = Array.isArray(p.categories) ? p.categories : appData.categories;
  const renamed = (p.renamed && typeof p.renamed === 'object') ? p.renamed : {};
  const removed = (p.removed && typeof p.removed === 'object') ? p.removed : {};

  const newCats = sanitizeCategories(incoming);
  const validSet = new Set(newCats.map((c) => c.toLowerCase()));
  const destFallback = newCats.find((c) => c !== FAV_GROUP && c !== BOOKMARK_GROUP) || '其他';

  for (const item of appData.items) {
    if (item.kind === 'url') { item.category = BOOKMARK_GROUP; continue; }
    let cat = String(item.category || '').trim();
    const low = cat.toLowerCase();
    if (renamed[low]) cat = renamed[low];
    const newLow = String(cat).toLowerCase();
    if (!validSet.has(newLow)) {
      let target = removed[newLow] || destFallback;
      if (!validSet.has(String(target).toLowerCase())) target = destFallback;
      cat = target;
    }
    item.category = cat;
  }
  appData.categories = newCats;
  saveAppData();
  return { ok: true, categories: newCats };
});

ipcMain.on('window-hide', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.on('window-show', () => { showWindow(); });
ipcMain.on('window-close', () => {
  app.isQuiting = true;
  app.quit();
});
