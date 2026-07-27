const path = require('path');

const FAV_GROUP = '常用';
const BOOKMARK_GROUP = '收藏夹';

const CATEGORY_ORDER = ['常用', '设计', '编程', '办公', '娱乐', '工具', '其他', '收藏夹'];
const AUTO_CATEGORIES = ['设计', '编程', '办公', '娱乐', '工具', '其他'];

const DEFAULT_DATA = {
  items: [],
  categories: CATEGORY_ORDER.slice(),
  settings: {
    accentColor: '#0071e3',
    alwaysOnTop: false,
    autoStart: false,
    autoScan: true,
    viewMode: '48',
    hotkey: 'Alt+Space',
  },
};

const DEFAULT_CATEGORIES = [...CATEGORY_ORDER];
const DEFAULT_ACCENT_COLOR = '#0071e3';
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const VALID_KINDS = new Set(['app', 'url', 'cmd']);
const VALID_VIEW_MODES = new Set(['96', '48', '32', '16', 'list']);
const APP_EXTENSIONS = new Set(['.exe', '.lnk', '.bat', '.cmd', '.msi', '.ps1', '.ahk', '.jar', '.appref-ms']);

const CLASSIFY_RULES = [
  { cat: '设计', kw: ['photoshop', 'illustrator', 'indesign', 'premiere', 'after effects', 'lightroom', 'adobe', 'figma', 'sketch', 'coreldraw', 'cdr', 'blender', 'maya', '3ds max', 'c4d', 'cinema 4d', '剪映', 'capcut', 'axure', 'xd', 'dreamweaver', 'cad', 'autocad', 'solidworks', 'fusion 360', 'sketchup', '可画', 'canva', '蓝湖', 'mastergo', '墨刀', '创客贴', 'ps ', 'ai ', '设计', 'UI', 'logo', '像素', 'paint', 'draw'] },
  { cat: '编程', kw: ['vscode', 'visual studio code', 'visual studio', 'intellij', 'idea', 'pycharm', 'webstorm', 'android studio', 'eclipse', 'sublime', 'notepad++', 'git', 'github', 'gitkraken', 'sourcetree', 'node', 'npm', 'python', 'anaconda', 'conda', 'docker', 'kubernetes', 'kubectl', 'postman', 'insomnia', 'cmder', 'terminal', 'windows terminal', 'powershell', 'wsl', 'jetbrains', 'clion', 'goland', 'rider', 'code', '程序', '编译器', 'android sdk', 'emulator', 'studio', 'dev'] },
  { cat: '办公', kw: ['word', 'excel', 'powerpoint', 'outlook', 'onenote', 'office', 'wps', '钉钉', 'dingtalk', '企业微信', 'wecom', '飞书', 'feishu', 'lark', '腾讯会议', 'voov', 'zoom', 'teams', 'slack', '邮件', 'mail', 'foxmail', '网易邮箱', 'qq邮箱', 'pdf', 'acrobat', '迅捷', '扫描', '百度网盘', '坚果云', 'onedrive', 'dropbox', '腾讯文档', '石墨', '思维导图', 'xmind', 'processon', '有道', '云盘', '会议', 'oa', 'erp', 'crm'] },
  { cat: '娱乐', kw: ['网易云音乐', 'qq音乐', '酷狗', '酷我', 'spotify', 'potplayer', 'vlc', 'kmplayer', '爱奇艺', '优酷', '腾讯视频', 'bilibili', '哔哩', 'steam', 'wegame', 'epic', 'origin', 'uplay', '游戏', 'music', 'video', '播放器', '直播', '抖音', '快手', '网易云', '云音乐', 'bandicam', 'obs', '录音', '剪辑'] },
  { cat: '工具', kw: ['chrome', 'edge', 'firefox', '浏览器', '微信', 'wechat', 'qq', 'tim', 'telegram', 'discord', 'whatsapp', '下载', '迅雷', 'idm', 'utorrent', 'qbittorrent', 'everything', '搜索', '解压', 'winrar', '7-zip', 'bandizip', '360', '2345', '驱动', 'driver', 'clean', '清理', 'ccleaner', 'teamviewer', 'anydesk', 'todesk', '向日葵', '远程', 'vpn', '代理', 'shadowrocket', '截图', 'snipaste', '翻译', '有道词典'] },
];

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clampNumber(value, fallback = 0, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeName(value) {
  return String(value || '').trim().slice(0, 120);
}

function normalizePath(rawPath) {
  return path.normalize(String(rawPath || '').trim());
}

function sanitizeCategories(rawCategories) {
  const source = Array.isArray(rawCategories) ? rawCategories : DEFAULT_CATEGORIES;
  const out = [FAV_GROUP];
  const seen = new Set([FAV_GROUP.toLowerCase()]);
  for (const item of source) {
    const value = String(item || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    if (!value) continue;
    const key = value.toLowerCase();
    if (key === 'all' || key === FAV_GROUP.toLowerCase() || key === BOOKMARK_GROUP.toLowerCase()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  // 无任何用户分组时，回退到默认自动分类，避免空侧栏
  if (out.length === 1) {
    for (const c of AUTO_CATEGORIES) {
      if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push(c); }
    }
  }
  out.push(BOOKMARK_GROUP);
  return out;
}

function isValidAppPath(rawPath) {
  const filePath = normalizePath(rawPath);
  if (!path.isAbsolute(filePath)) return false;
  const ext = path.extname(filePath).toLowerCase();
  return APP_EXTENSIONS.has(ext);
}

function isValidUrl(rawValue) {
  return /^https?:\/\//i.test(String(rawValue || '').trim());
}

function classify(name, target) {
  const hay = `${name || ''} ${target || ''}`.toLowerCase();
  for (const rule of CLASSIFY_RULES) {
    for (const kw of rule.kw) {
      if (kw && hay.includes(String(kw).toLowerCase())) {
        return rule.cat;
      }
    }
  }
  return '其他';
}

function sanitizeItem(rawItem, allowedCategories = DEFAULT_CATEGORIES) {
  const item = asObject(rawItem);
  const id = Number(item.id);
  const name = sanitizeName(item.name) || '未命名';
  const kind = VALID_KINDS.has(item.kind) ? item.kind : 'app';
  const target = String(item.target || '').trim();

  const categories = sanitizeCategories(allowedCategories);
  const categorySet = new Set(categories.map((c) => c.toLowerCase()));

  let category = String(item.category || '').trim();
  if (!categorySet.has(category.toLowerCase())) {
    category = kind === 'url' ? BOOKMARK_GROUP : (categories.find((c) => c !== FAV_GROUP && c !== BOOKMARK_GROUP) || '其他');
  }

  const icon = typeof item.icon === 'string' && item.icon.startsWith('data:image/') ? item.icon : null;
  const customIcon = Boolean(item.customIcon) && Boolean(icon);
  const favorite = Boolean(item.favorite);
  const finalCategory = (kind === 'url') ? BOOKMARK_GROUP : category;
  const order = clampNumber(item.order, 0, 0, 999999);
  const sourcePath = item.sourcePath ? normalizePath(item.sourcePath) : '';

  return {
    id: Number.isFinite(id) && id > 0 ? id : Date.now(),
    name,
    kind,
    target,
    category: finalCategory,
    icon,
    customIcon,
    favorite,
    order,
    sourcePath,
    launchArgs: String(item.launchArgs || '').trim().slice(0, 300),
    workingDir: normalizePath(item.workingDir || ''),
    addedAt: clampNumber(item.addedAt, Date.now(), 0),
  };
}

function sanitizeSettings(rawSettings) {
  const settings = asObject(rawSettings);
  const viewMode = VALID_VIEW_MODES.has(String(settings.viewMode || '').toLowerCase())
    ? settings.viewMode
    : DEFAULT_DATA.settings.viewMode;
  return {
    accentColor: HEX_COLOR_PATTERN.test(String(settings.accentColor || '').trim().toLowerCase()) ? settings.accentColor : DEFAULT_ACCENT_COLOR,
    alwaysOnTop: Boolean(settings.alwaysOnTop),
    autoStart: Boolean(settings.autoStart),
    autoScan: settings.autoScan !== false,
    viewMode,
    hotkey: String(settings.hotkey || '').trim() || DEFAULT_DATA.settings.hotkey,
  };
}

function sanitizeData(rawData) {
  const data = asObject(rawData);
  const categories = sanitizeCategories(data.categories);
  const items = Array.isArray(data.items) ? data.items.map((item) => sanitizeItem(item, categories)) : [];
  const seenIds = new Set();
  const uniqueItems = [];
  for (const item of items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }
  uniqueItems.sort((a, b) => (a.order - b.order) || (a.addedAt - b.addedAt));
  return {
    items: uniqueItems,
    categories,
    settings: sanitizeSettings(data.settings),
  };
}

module.exports = {
  FAV_GROUP,
  BOOKMARK_GROUP,
  CATEGORY_ORDER,
  AUTO_CATEGORIES,
  DEFAULT_DATA,
  classify,
  sanitizeData,
  sanitizeItem,
  sanitizeSettings,
  sanitizeCategories,
  normalizePath,
  isValidAppPath,
  isValidUrl,
  APP_EXTENSIONS,
};
