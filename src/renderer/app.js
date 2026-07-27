(() => {
  'use strict';

  const FAV_GROUP = '常用';
  const BOOKMARK_GROUP = '收藏夹';
  const PALETTE = ['#ff9f0a','#ff375f','#bf5af2','#5e5ce6','#0071e3','#32ade6','#30b0c7','#28cd41','#a2845e','#ff453a'];

  let data = { items: [], categories: [FAV_GROUP, '设计','编程','办公','娱乐','工具','其他',BOOKMARK_GROUP], settings: { viewMode: '48' } };
  let currentCat = '__all';
  let currentSearch = '';
  let dragSrcId = null;
  let dragSrcCat = null;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function colorFromString(str) {
    let h = 0;
    const s = String(str || '?');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function categoryIconSvg(cat) {
    const map = {
      '常用': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      '设计': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      '编程': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
      '办公': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>',
      '娱乐': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 8v8l7-4z"/></svg>',
      '工具': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
      '其他': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
      '收藏夹': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>',
    };
    return map[cat] || map['其他'];
  }

  function iconHtml(item, size) {
    if (item.icon) return `<img src="${item.icon}" alt="" />`;
    if (item.kind === 'url') {
      const ch = (item.name || '?').trim().charAt(0).toUpperCase() || '?';
      const bg = colorFromString(item.name);
      return `<div class="fallback" style="background:${bg}">${ch}</div>`;
    }
    const svg = categoryIconSvg(item.category || '其他');
    return `<div class="fallback fallback-cat" style="color:${colorFromString(item.category || '其他')}">${svg}</div>`;
  }

  function groupItems(cat) {
    if (cat === FAV_GROUP) return data.items.filter((i) => i.favorite).sort(sortByOrder);
    if (cat === BOOKMARK_GROUP) return data.items.filter((i) => i.kind === 'url').sort(sortByOrder);
    return data.items.filter((i) => i.category === cat && i.kind !== 'url' && !i.favorite).sort(sortByOrder);
  }

  function sortByOrder(a, b) {
    const ao = Number.isFinite(a.order) ? a.order : 0;
    const bo = Number.isFinite(b.order) ? b.order : 0;
    if (ao !== bo) return ao - bo;
    return (a.addedAt || 0) - (b.addedAt || 0);
  }

  function filterItems(items) {
    const q = currentSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.target || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }

  function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', color);
    document.documentElement.style.setProperty('--accent-soft', color + '1a');
  }

  // ---------- 渲染：侧栏 ----------
  function renderSidebar() {
    const sb = $('sidebar');
    sb.innerHTML = '';

    const all = el('div', 'side-item' + (currentCat === '__all' ? ' active' : ''), `<span class="side-name">全部</span><span class="side-count">${data.items.length}</span>`);
    all.dataset.cat = '__all';
    all.onclick = () => { currentCat = '__all'; render(); };
    sb.appendChild(all);

    for (const cat of data.categories) {
      const cnt = groupItems(cat).length;
      const classes = ['side-item'];
      if (currentCat === cat) classes.push('active');
      if (cat === FAV_GROUP) classes.push('side-fav');
      if (cat === BOOKMARK_GROUP) classes.push('side-bookmark');
      const item = el('div', classes.join(' '), `<span class="side-name">${cat}</span><span class="side-count">${cnt}</span>`);
      item.dataset.cat = cat;
      item.onclick = () => { currentCat = cat; render(); };
      item.addEventListener('dragover', (e) => e.preventDefault());
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = Number(e.dataTransfer.getData('text/plain'));
        reclassify(id, cat);
      });
      sb.appendChild(item);
    }

    const footer = el('div', 'side-footer');
    const manageBtn = el('button', 'side-manage', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> 管理分组');
    manageBtn.onclick = openCatManager;
    footer.appendChild(manageBtn);
    sb.appendChild(footer);
  }

  // ---------- 渲染：主区 ----------
  function renderGrid(items, container, cat) {
    const view = data.settings.viewMode || '48';
    const isList = view === 'list';
    const grid = el('div', 'grid size-' + view + (isList ? ' list' : ''));
    grid.dataset.cat = cat;

    const filtered = filterItems(items);
    for (const item of filtered) {
      const card = el('div', 'card' + (item.favorite ? ' is-fav' : ''));
      card.draggable = true;
      card.dataset.id = item.id;
      const nameHtml = `<div class="name">${escapeHtml(item.name)}</div>`;
      const pathHtml = (isList && item.kind !== 'url')
        ? `<div class="path">${escapeHtml(item.target)}</div>` : '';
      card.innerHTML = `<span class="fav-badge">${starSvg()}</span><div class="icon">${iconHtml(item)}</div>${nameHtml}${pathHtml}`;
      card.addEventListener('click', () => launch(item.id));
      card.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, item); });
      card.addEventListener('dragstart', (e) => {
        dragSrcId = item.id;
        dragSrcCat = cat;
        e.dataTransfer.setData('text/plain', String(item.id));
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragSrcCat === cat && dragSrcId !== item.id) {
          card.classList.add('drag-over');
          showDropIndicator(grid, e.clientX, e.clientY, isList, cat);
        }
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const insertIndex = currentDropIndex(grid, e.clientX, e.clientY, isList);
        hideDropIndicator();
        if (dragSrcCat === cat && dragSrcId) {
          reorderInsert(cat, dragSrcId, insertIndex);
        }
        dragSrcId = null;
        dragSrcCat = null;
      });
      card.addEventListener('dragend', () => {
        document.querySelectorAll('.card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        hideDropIndicator();
        dragSrcId = null;
        dragSrcCat = null;
      });
      grid.appendChild(card);
    }
    container.appendChild(grid);
  }

  function render() {
    renderSidebar();
    const content = $('content');
    content.innerHTML = '';

    if (currentCat === BOOKMARK_GROUP) {
      renderBookmarkGroup(content);
      return;
    }

    const catsToShow = (currentCat === '__all') ? data.categories : [currentCat];
    for (const cat of catsToShow) {
      const items = groupItems(cat);
      if (!items.length && currentCat !== '__all') continue;
      const group = el('div', 'group' + (cat === FAV_GROUP ? ' group-fav' : ''));
      const head = el('div', 'group-head', `${cat} <span class="cnt">${items.length}</span>`);
      if (cat === BOOKMARK_GROUP) {
        const addBtn = el('button', 'group-add', '+ 添加网址');
        addBtn.onclick = () => openEdit(null, 'url');
        head.appendChild(addBtn);
      }
      group.appendChild(head);
      renderGrid(items, group, cat);
      content.appendChild(group);
    }
    if (!content.children.length) {
      content.appendChild(el('div', 'empty', '这里还没有项目。点右上角“添加”或“扫描”来加入程序。'));
    }
  }

  function renderBookmarkGroup(container) {
    const items = groupItems(BOOKMARK_GROUP);
    const group = el('div', 'group group-bookmark');
    const head = el('div', 'group-head', `${BOOKMARK_GROUP} <span class="cnt">${items.length}</span>`);
    const addBtn = el('button', 'group-add', '+ 添加网址');
    addBtn.onclick = () => openEdit(null, 'url');
    head.appendChild(addBtn);
    group.appendChild(head);

    const view = data.settings.viewMode || '48';
    const isList = view === 'list';
    const grid = el('div', 'grid size-' + view + (isList ? ' list' : '') + ' bookmark-grid');
    grid.dataset.cat = BOOKMARK_GROUP;
    const filtered = filterItems(items);
    for (const item of filtered) {
      const card = el('div', 'card bookmark-card' + (item.favorite ? ' is-fav' : ''));
      card.draggable = true;
      card.dataset.id = item.id;
      card.dataset.url = item.target;
      const pathHtml = isList ? `<div class="path">${escapeHtml(item.target)}</div>` : `<div class="url">${escapeHtml(truncateUrl(item.target))}</div>`;
      card.innerHTML = `<span class="fav-badge">${starSvg()}</span><div class="icon">${iconHtml(item)}</div><div class="name">${escapeHtml(item.name)}</div>${pathHtml}`;
      card.addEventListener('mouseenter', (e) => showUrlTip(e.currentTarget));
      card.addEventListener('mouseleave', hideUrlTip);
      card.addEventListener('mousemove', (e) => moveUrlTip(e));
      card.addEventListener('click', () => launch(item.id));
      card.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, item); });
      card.addEventListener('dragstart', (e) => {
        dragSrcId = item.id;
        dragSrcCat = BOOKMARK_GROUP;
        e.dataTransfer.setData('text/plain', String(item.id));
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragSrcCat === BOOKMARK_GROUP && dragSrcId !== item.id) {
          card.classList.add('drag-over');
          showDropIndicator(grid, e.clientX, e.clientY, isList, BOOKMARK_GROUP);
        }
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const insertIndex = currentDropIndex(grid, e.clientX, e.clientY, isList);
        hideDropIndicator();
        if (dragSrcCat === BOOKMARK_GROUP && dragSrcId) {
          reorderInsert(BOOKMARK_GROUP, dragSrcId, insertIndex);
        }
        dragSrcId = null;
        dragSrcCat = null;
      });
      card.addEventListener('dragend', () => {
        document.querySelectorAll('.card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        hideDropIndicator();
        dragSrcId = null;
        dragSrcCat = null;
      });
      grid.appendChild(card);
    }
    group.appendChild(grid);
    container.appendChild(group);
    if (!items.length) {
      container.appendChild(el('div', 'empty', '收藏夹为空。点击“+ 添加网址”加入常用网站。'));
    }
  }

  function truncateUrl(url) {
    const s = String(url || '').replace(/^https?:\/\//, '');
    return s.length > 28 ? s.slice(0, 26) + '…' : s;
  }

  let urlTipEl = null;
  function ensureUrlTip() {
    if (!urlTipEl) {
      urlTipEl = document.createElement('div');
      urlTipEl.className = 'url-tip';
      document.body.appendChild(urlTipEl);
    }
    return urlTipEl;
  }
  function showUrlTip(card) {
    const url = card.dataset.url;
    if (!url) return;
    const tip = ensureUrlTip();
    tip.textContent = url;
    tip.classList.add('show');
    positionUrlTip(card);
  }
  function moveUrlTip(e) {
    if (!urlTipEl || !urlTipEl.classList.contains('show')) return;
    const card = e.currentTarget;
    positionUrlTip(card);
  }
  function positionUrlTip(card) {
    if (!urlTipEl) return;
    const r = card.getBoundingClientRect();
    const mw = Math.min(urlTipEl.offsetWidth || 240, 320);
    const mh = urlTipEl.offsetHeight || 24;
    const pad = 10;
    let x = r.left + r.width / 2 - mw / 2;
    let y = r.top - mh - 6;
    if (x < pad) x = pad;
    if (x + mw > window.innerWidth - pad) x = window.innerWidth - mw - pad;
    if (y < pad) y = r.bottom + 6;
    urlTipEl.style.left = x + 'px';
    urlTipEl.style.top = y + 'px';
  }
  function hideUrlTip() {
    if (urlTipEl) urlTipEl.classList.remove('show');
  }

  function starSvg() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- 操作 ----------
  async function launch(id) {
    const r = await api.launchItem(id);
    if (!r.ok) showError('启动失败', errMsg(r.error, '启动'));
  }
  async function launchAdmin(id) {
    const r = await api.launchAdmin(id);
    if (!r.ok) showError('管理员运行失败', errMsg(r.error, '以管理员身份运行'));
  }
  async function openFolder(id) {
    const r = await api.openItemFolder(id);
    if (!r.ok) showError('打开安装路径失败', errMsg(r.error, '打开安装路径'));
  }
  async function openSource(id) {
    const r = await api.openSourcePath(id);
    if (!r.ok) showError('打开本地源文件失败', errMsg(r.error, '打开本地源文件'));
  }
  async function reclassify(id, cat) {
    if (cat === '__all') return;
    const r = await api.reclassifyItem(id, cat);
    if (!r.ok) { showError('移动失败', errMsg(r.error, '移动分组')); return; }
    await reload();
    showToast(`已移动到「${cat}」`);
  }
  async function reorderInsert(cat, srcId, insertIndex) {
    const items = groupItems(cat);
    const ids = items.map((i) => i.id);
    const srcIdx = ids.indexOf(srcId);
    if (srcIdx < 0) return;
    ids.splice(srcIdx, 1);
    let targetIndex = insertIndex;
    if (srcIdx < targetIndex) targetIndex--;
    targetIndex = Math.max(0, Math.min(targetIndex, ids.length));
    ids.splice(targetIndex, 0, srcId);
    const r = await api.reorderItems(ids);
    if (!r.ok) { showError('排序失败', '调整顺序时出错。'); return; }
    await reload();
  }

  let dropIndicator = null;
  function getDropIndicator() {
    if (!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'drop-indicator';
      document.body.appendChild(dropIndicator);
    }
    return dropIndicator;
  }
  function currentDropIndex(grid, x, y, isList) {
    const cards = Array.from(grid.querySelectorAll('.card'));
    if (!cards.length) return 0;
    if (isList) {
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return i;
      }
      return cards.length;
    }
    let nearestIdx = -1, minDist = Infinity;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }
    if (nearestIdx < 0) return cards.length;
    const r = cards[nearestIdx].getBoundingClientRect();
    return x < r.left + r.width / 2 ? nearestIdx : nearestIdx + 1;
  }
  function showDropIndicator(grid, x, y, isList, cat) {
    if (dragSrcCat !== cat || !dragSrcId) return;
    const idx = currentDropIndex(grid, x, y, isList);
    const indicator = getDropIndicator();
    const cards = Array.from(grid.querySelectorAll('.card'));
    indicator.className = 'drop-indicator ' + (isList ? 'horiz' : 'vert');
    indicator.style.display = 'block';
    if (!cards.length) return;
    const before = idx < cards.length;
    const ref = cards[Math.min(idx, cards.length - 1)].getBoundingClientRect();
    if (isList) {
      const top = before ? ref.top : ref.bottom;
      indicator.style.left = ref.left + 'px';
      indicator.style.top = (top - 1.5) + 'px';
      indicator.style.width = ref.width + 'px';
      indicator.style.height = '3px';
    } else {
      const left = before ? ref.left : ref.right;
      indicator.style.left = (left - 1.5) + 'px';
      indicator.style.top = ref.top + 'px';
      indicator.style.width = '3px';
      indicator.style.height = ref.height + 'px';
    }
  }
  function hideDropIndicator() {
    if (dropIndicator) dropIndicator.style.display = 'none';
  }
  async function removeItem(item) {
    confirmDialog('删除项目', `确定从启动栏移除“${item.name}”吗？这不会卸载程序。`, async () => {
      const r = await api.deleteItem(item.id);
      if (!r.ok) { showError('删除失败', errMsg(r.error, '删除')); return; }
      await reload();
      showToast('已删除');
    });
  }
  async function uninstall(item) {
    confirmDialog('卸载程序', `确定要卸载“${item.name}”吗？此操作会从电脑移除该程序。`, async () => {
      const r = await api.uninstallItem(item.id);
      if (!r.ok) { showError('卸载失败', errMsg(r.error, '卸载')); return; }
      if (r.manual) showToast('未找到自动卸载入口，已打开“程序和功能”，请手动卸载');
      else showToast('已启动卸载程序');
    });
  }

  function errMsg(error, action) {
    const map = {
      PATH_NOT_FOUND: '找不到该程序，可能已被移动或删除。请在编辑中重新绑定路径。',
      SOURCE_NOT_FOUND: '找不到本地源文件，可能已被移动或删除。',
      NO_SOURCE_PATH: '未填写本地源文件路径。',
      NOT_FOUND: '该项目不存在，可能已被删除。',
      NO_FOLDER: '网址类项目没有本地文件。',
      NOT_APP: '该操作仅适用于程序文件。',
      NOT_URL: '收藏夹只能放置网址。',
      BAD_CAT: '目标分类不存在。',
      BAD_PATH: '目标路径无效（需为本地 exe / 快捷方式 / 脚本）。',
      BAD_URL: '网址格式不正确（需以 http:// 或 https:// 开头）。',
      BAD_CMD: '命令不能为空。',
    };
    return map[error] || (`${action}出错：${error || '未知错误'}`);
  }

  // ---------- 右键菜单 ----------
  async function launchAdminCmd(id) {
    const r = await api.launchAdminCmd(id);
    if (!r.ok) showError('以管理员运行 CMD 失败', errMsg(r.error, '以管理员运行 CMD'));
  }
  async function launchAdminPowershell(id) {
    const r = await api.launchAdminPowershell(id);
    if (!r.ok) showError('以管理员运行 PowerShell 失败', errMsg(r.error, '以管理员运行 PowerShell'));
  }

  function positionMenu(menu, triggerRect, preferBelow) {
    const pad = 8;
    const mw = menu.offsetWidth || 188;
    const mh = menu.offsetHeight || 180;
    let x = triggerRect.left;
    let y = preferBelow ? triggerRect.bottom + pad : triggerRect.top - mh - pad;
    // 水平边界
    if (x + mw > window.innerWidth - pad) x = window.innerWidth - mw - pad;
    if (x < pad) x = pad;
    // 垂直边界：若下方放不下且请求下方，则翻转到上方
    if (preferBelow && y + mh > window.innerHeight - pad) {
      y = triggerRect.top - mh - pad;
    }
    // 若上方放不下，则贴底或贴顶
    if (y < pad) y = pad;
    if (y + mh > window.innerHeight - pad) y = window.innerHeight - mh - pad;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  }

  function showContextMenu(e, item) {
    e.preventDefault();
    const menu = $('ctxMenu');
    menu.innerHTML = '';
    const add = (label, fn, danger, cls) => {
      const it = el('div', 'ctx-item' + (danger ? ' danger' : '') + (cls ? ' ' + cls : ''), label);
      it.onclick = () => { hideCtx(); fn(); };
      menu.appendChild(it);
      return it;
    };
    const sep = () => menu.appendChild(el('div', 'ctx-sep'));

    add('名称（重命名）', () => openEdit(item));
    if (item.kind === 'app') add('管理员身份运行', () => launchAdmin(item.id));
    if (item.kind !== 'url') add('安装路径', () => openFolder(item.id));
    if (item.kind !== 'url') add('打开本地源文件', () => openSource(item.id));
    if (item.kind === 'app') add('卸载', () => uninstall(item), true);
    sep();

    const sub = el('div', 'ctx-sub');
    const trigger = add('移入分组', () => {});
    const submenu = el('div', 'ctx-submenu');
    for (const cat of data.categories) {
      if (cat === BOOKMARK_GROUP && item.kind !== 'url') continue;
      const si = el('div', 'ctx-item', cat);
      si.onclick = () => { hideCtx(); reclassify(item.id, cat); };
      submenu.appendChild(si);
    }
    sub.appendChild(submenu);
    menu.appendChild(sub);
    // 子菜单 click 展开 / 收起，并计算边界位置
    trigger.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isOpen = sub.classList.contains('open');
      // 关闭其他已展开子菜单
      document.querySelectorAll('.ctx-sub.open').forEach((s) => { if (s !== sub) s.classList.remove('open'); });
      sub.classList.toggle('open', !isOpen);
      if (!isOpen) {
        const tr = trigger.getBoundingClientRect();
        const smw = submenu.offsetWidth || 140;
        const smh = submenu.offsetHeight || 180;
        const pad = 8;
        let sx = tr.right + 6;
        let sy = tr.top;
        if (sx + smw > window.innerWidth - pad) sx = Math.max(pad, tr.left - smw - 6);
        if (sy + smh > window.innerHeight - pad) sy = Math.max(pad, window.innerHeight - smh - pad);
        if (sy < pad) sy = pad;
        submenu.style.left = sx + 'px';
        submenu.style.top = sy + 'px';
      }
    });
    // hover 也展开（桌面端更顺手），但 click 兜底
    trigger.addEventListener('mouseenter', () => {
      document.querySelectorAll('.ctx-sub.open').forEach((s) => { if (s !== sub) s.classList.remove('open'); });
      sub.classList.add('open');
      const tr = trigger.getBoundingClientRect();
      const smw = submenu.offsetWidth || 140;
      const smh = submenu.offsetHeight || 180;
      const pad = 8;
      let sx = tr.right + 6;
      let sy = tr.top;
      if (sx + smw > window.innerWidth - pad) sx = Math.max(pad, tr.left - smw - 6);
      if (sy + smh > window.innerHeight - pad) sy = Math.max(pad, window.innerHeight - smh - pad);
      if (sy < pad) sy = pad;
      submenu.style.left = sx + 'px';
      submenu.style.top = sy + 'px';
    });

    add('编辑', () => openEdit(item));
    add('删除', () => removeItem(item), true);
    sep();
    add('以管理员运行 CMD', () => launchAdminCmd(item.id), false, 'terminal');
    add('以管理员运行 PowerShell', () => launchAdminPowershell(item.id), false, 'terminal');

    menu.classList.remove('hidden');
    requestAnimationFrame(() => {
      const rect = { left: e.clientX, top: e.clientY, bottom: e.clientY, right: e.clientX };
      positionMenu(menu, rect, true);
    });
  }
  function hideCtx() {
    $('ctxMenu').classList.add('hidden');
    document.querySelectorAll('.ctx-sub.open').forEach((s) => s.classList.remove('open'));
    hideUrlTip();
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('#ctxMenu')) hideCtx(); });

  // ---------- 添加 / 编辑 ----------
  let editId = null;
  let customIconData = null;

  function openEdit(item, defaultKind) {
    editId = item ? item.id : null;
    customIconData = null;
    $('editTitle').textContent = item ? '编辑' : '添加';
    $('f-name').value = item ? item.name : '';
    $('f-kind').value = item ? item.kind : (defaultKind || 'app');
    $('f-target').value = item ? item.target : '';
    $('f-source').value = item ? (item.sourcePath || '') : '';
    $('f-fav').checked = item ? !!item.favorite : false;
    $('f-customicon').checked = item ? !!item.customIcon : false;
    onKindChange();
    populateCatSelect(item ? item.category : null);
    if (item && item.customIcon && item.icon) {
      $('iconPreview').innerHTML = `<img src="${item.icon}" />`;
      $('f-icon-preview-field').style.display = 'block';
    } else {
      $('iconPreview').innerHTML = '';
      $('f-icon-preview-field').style.display = 'none';
    }
    showModal('editModal');
    setTimeout(() => $('f-name').focus(), 50);
  }

  function populateCatSelect(selected) {
    const sel = $('f-cat');
    sel.innerHTML = '';
    const opts = data.categories.filter((c) => c !== FAV_GROUP && c !== BOOKMARK_GROUP);
    for (const c of opts) {
      const o = el('option', null, c);
      o.value = c;
      if (c === selected) o.selected = true;
      sel.appendChild(o);
    }
    if (!sel.value) sel.value = opts[0] || '其他';
  }

  function onKindChange() {
    const kind = $('f-kind').value;
    const label = $('f-target-label');
    const hint = $('f-target-hint');
    const catField = $('f-cat-field');
    const catSel = $('f-cat');
    if (kind === 'url') {
      label.innerHTML = '网址 <span class="req">*</span>';
      $('f-target').placeholder = 'https://example.com';
      hint.textContent = '以 http:// 或 https:// 开头。';
      catField.style.display = 'none';
      catSel.value = BOOKMARK_GROUP;
      catSel.disabled = true;
    } else if (kind === 'cmd') {
      label.innerHTML = '命令 <span class="req">*</span>';
      $('f-target').placeholder = '例如：ping baidu.com';
      hint.textContent = '填写 cmd 可执行的命令，如 python d:/script.py';
      catField.style.display = '';
      catSel.disabled = false;
    } else {
      label.innerHTML = '目标路径 <span class="req">*</span>';
      $('f-target').placeholder = 'C:\\...\\app.exe';
      hint.textContent = '可粘贴路径，或点“浏览”选择本机程序。';
      catField.style.display = '';
      catSel.disabled = false;
    }
  }

  async function saveEdit() {
    const name = $('f-name').value.trim();
    const kind = $('f-kind').value;
    const target = $('f-target').value.trim();
    if (!name) return showError('请填写名称', '名称是必填项。');
    if (!target) return showError('请填写目标', kind === 'url' ? '网址是必填项。' : (kind === 'cmd' ? '命令是必填项。' : '目标路径是必填项。'));

    const payload = {
      id: editId,
      name,
      kind,
      target,
      category: kind === 'url' ? BOOKMARK_GROUP : $('f-cat').value,
      favorite: $('f-fav').checked,
      customIcon: $('f-customicon').checked && !!customIconData,
      icon: ($('f-customicon').checked && customIconData) ? customIconData : null,
      sourcePath: $('f-source').value.trim(),
    };
    const r = await api.saveItem(payload);
    if (!r.ok) return showError('保存失败', errMsg(r.error, '保存'));
    hideModal('editModal');
    await reload();
    showToast(editId ? '已更新' : '已添加');
  }

  // ---------- 扫描 ----------
  async function openScan() {
    showModal('scanModal');
    $('scanList').innerHTML = '<div class="empty">正在扫描本机程序…</div>';
    const r = await api.scanPrograms();
    const programs = (r && r.programs) || [];
    if (!programs.length) {
      $('scanList').innerHTML = '<div class="empty">未扫描到可添加的程序。</div>';
      return;
    }
    const list = $('scanList');
    list.innerHTML = '';
    for (const p of programs) {
      const row = el('div', 'scan-item');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = true;
      cb.dataset.target = p.target; cb.dataset.name = p.name; cb.dataset.cat = p.category;
      const nm = el('div', 'nm', escapeHtml(p.name));
      const sel = el('select');
      for (const c of data.categories.filter((x) => x !== FAV_GROUP && x !== BOOKMARK_GROUP)) {
        const o = el('option', null, c); o.value = c; if (c === p.category) o.selected = true; sel.appendChild(o);
      }
      cb.addEventListener('change', () => { sel.disabled = !cb.checked; });
      row.appendChild(cb); row.appendChild(nm); row.appendChild(sel);
      list.appendChild(row);
    }
  }

  async function addScanned() {
    const rows = $('scanList').querySelectorAll('.scan-item');
    let added = 0;
    const baseOrder = data.items.length;
    let idx = 0;
    for (const row of rows) {
      const cb = row.querySelector('input[type="checkbox"]');
      if (!cb.checked) continue;
      const sel = row.querySelector('select');
      const payload = {
        name: cb.dataset.name,
        kind: 'app',
        target: cb.dataset.target,
        category: sel.value,
        favorite: false,
        customIcon: false,
        icon: null,
        order: baseOrder + idx,
      };
      const r = await api.saveItem(payload);
      if (r.ok) added++;
      idx++;
    }
    hideModal('scanModal');
    await reload();
    showToast(`已添加 ${added} 个程序`);
  }

  // ---------- 分组管理 ----------
  let catEntries = [];
  let catRemoved = {};

  function openCatManager() {
    catEntries = data.categories
      .filter((c) => c !== FAV_GROUP && c !== BOOKMARK_GROUP)
      .map((c) => ({ orig: c, name: c }));
    catRemoved = {};
    renderCatManager();
    showModal('catModal');
  }

  function renderCatManager() {
    const list = $('catList');
    list.innerHTML = '';
    const sys = el('div', 'cat-sys', '<span class="cat-sys-label">系统分组</span><span class="cat-sys-val">常用 · 收藏夹</span><span class="cat-sys-note">不可编辑</span>');
    list.appendChild(sys);

    catEntries.forEach((entry, idx) => {
      const row = el('div', 'cat-row');
      row.innerHTML =
        '<span class="cat-grip">⋮⋮</span>' +
        `<input class="cat-name" type="text" maxlength="32" value="${escapeHtml(entry.name)}" placeholder="分组名称" />` +
        '<button class="cat-up" title="上移" type="button">↑</button>' +
        '<button class="cat-down" title="下移" type="button">↓</button>' +
        '<button class="cat-del" title="删除" type="button">删除</button>';
      const input = row.querySelector('.cat-name');
      input.addEventListener('input', () => { entry.name = input.value; });
      row.querySelector('.cat-up').onclick = () => {
        if (idx > 0) { const t = catEntries[idx - 1]; catEntries[idx - 1] = catEntries[idx]; catEntries[idx] = t; renderCatManager(); }
      };
      row.querySelector('.cat-down').onclick = () => {
        if (idx < catEntries.length - 1) { const t = catEntries[idx + 1]; catEntries[idx + 1] = catEntries[idx]; catEntries[idx] = t; renderCatManager(); }
      };
      row.querySelector('.cat-del').onclick = () => openCatDel(entry, idx);
      list.appendChild(row);
    });
  }

  function openCatDel(entry, idx) {
    const name = entry.name || entry.orig || '';
    const others = catEntries.filter((_, i) => i !== idx).map((e) => e.name).filter(Boolean);
    if (!others.length) others.push('其他');
    const sel = $('catDelSelect');
    sel.innerHTML = others.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    $('catDelName').textContent = name;
    showModal('catDelModal');
    $('catDelOk').onclick = () => {
      const dest = sel.value;
      if (entry.orig) catRemoved[String(entry.orig).toLowerCase()] = dest;
      catEntries.splice(idx, 1);
      hideModal('catDelModal');
      renderCatManager();
    };
  }

  async function saveCatManager() {
    const names = catEntries.map((e) => e.name.trim()).filter(Boolean);
    if (names.length !== new Set(names.map((n) => n.toLowerCase())).size) {
      return showError('分组名称重复', '存在同名分组，请修改后再保存。');
    }
    for (const n of names) {
      if (n.toLowerCase() === 'all' || n === '全部') return showError('名称不可用', `「${n}」不能作为分组名。`);
      if (n === FAV_GROUP || n === BOOKMARK_GROUP) return showError('名称不可用', `「${n}」是系统分组名，请换一个。`);
    }
    const categories = names;
    const renamed = {};
    for (const e of catEntries) {
      if (e.orig && e.name.trim() && e.name.trim() !== e.orig) renamed[e.orig.toLowerCase()] = e.name.trim();
    }
    const r = await api.saveCategories({ categories, renamed, removed: catRemoved });
    if (!r.ok) return showError('保存失败', '分组保存出错。');
    hideModal('catModal');
    await reload();
    showToast('分组已更新');
  }

  // ---------- 设置 ----------
  function openSettings() {
    $('s-accent').value = data.settings.accentColor || '#0071e3';
    $('s-ontop').checked = !!data.settings.alwaysOnTop;
    $('s-autostart').checked = !!data.settings.autoStart;
    $('s-autoscan').checked = data.settings.autoScan !== false;
    $('s-hotkey').value = data.settings.hotkey || 'Alt+Space';
    showModal('settingsModal');
  }
  async function saveSettings() {
    const next = {
      accentColor: $('s-accent').value,
      alwaysOnTop: $('s-ontop').checked,
      autoStart: $('s-autostart').checked,
      autoScan: $('s-autoscan').checked,
      hotkey: $('s-hotkey').value.trim() || 'Alt+Space',
      viewMode: data.settings.viewMode,
    };
    const r = await api.saveSettings(next);
    if (!r.ok) return showError('保存失败', '设置保存出错。');
    hideModal('settingsModal');
    applyAccent(next.accentColor);
    await reload();
    showToast('设置已保存');
  }

  // ---------- 视图切换 ----------
  function setView(v) {
    data.settings.viewMode = v;
    document.querySelectorAll('#viewSwitch .vbtn').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    api.saveSettings({ ...data.settings, viewMode: v }).catch(() => {});
    render();
  }

  // ---------- 弹窗 / Toast ----------
  function showModal(id) { hideUrlTip(); $(id).classList.remove('hidden'); }
  function hideModal(id) { $(id).classList.add('hidden'); }
  function showError(title, text) {
    $('msgTitle').textContent = title || '提示';
    $('msgText').textContent = text || '';
    showModal('msgModal');
  }
  function confirmDialog(title, text, onOk) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    showModal('confirmModal');
    $('confirmOk').onclick = () => { hideModal('confirmModal'); onOk(); };
  }
  let toastTimer = null;
  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.classList.add('hidden'), 250);
    }, 1800);
  }

  // ---------- 数据加载 ----------
  async function reload() {
    const fresh = await api.getData();
    if (fresh && fresh.items) data = fresh;
    applyAccent(data.settings.accentColor);
    render();
  }

  // ---------- 事件绑定 ----------
  function bind() {
    $('btn-add').onclick = () => openEdit(null);
    $('btn-scan').onclick = openScan;
    $('btn-settings').onclick = openSettings;
    $('btn-export').onclick = async () => { const r = await api.exportData(); if (r && r.ok) showToast('已导出备份'); else if (r && !r.canceled) showError('导出失败', '导出备份出错。'); };
    $('btn-import').onclick = async () => { const r = await api.importData(); if (r && r.ok) { await reload(); showToast('已导入备份'); } else if (r && !r.canceled) showError('导入失败', '备份文件无法读取或格式不正确。'); };
    $('btn-hide').onclick = () => api.hideWindow();

    $('search').addEventListener('input', (e) => { currentSearch = e.target.value; render(); });

    document.querySelectorAll('#viewSwitch .vbtn').forEach((b) => {
      b.onclick = () => setView(b.dataset.view);
    });

    $('editCancel').onclick = () => hideModal('editModal');
    $('editClose').onclick = () => hideModal('editModal');
    $('editSave').onclick = saveEdit;
    $('btn-browse').onclick = async () => {
      const p = await api.browseTarget();
      if (p) $('f-target').value = p;
    };
    $('f-kind').onchange = onKindChange;
    $('f-customicon').onchange = () => {
      $('f-icon-preview-field').style.display = $('f-customicon').checked ? 'block' : 'none';
      if (!$('f-customicon').checked) { customIconData = null; $('iconPreview').innerHTML = ''; }
    };
    $('btn-pickicon').onclick = async () => {
      const d = await api.pickIconFile();
      if (d) { customIconData = d; $('iconPreview').innerHTML = `<img src="${d}" />`; $('f-icon-preview-field').style.display = 'block'; $('f-customicon').checked = true; }
    };

    $('scanCancel').onclick = () => hideModal('scanModal');
    $('scanAdd').onclick = addScanned;

    $('settingsCancel').onclick = () => hideModal('settingsModal');
    $('settingsSave').onclick = saveSettings;

    $('catAdd').onclick = () => {
      catEntries.push({ orig: null, name: '' });
      renderCatManager();
      const inputs = $('catList').querySelectorAll('.cat-name');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
    $('catCancel').onclick = () => hideModal('catModal');
    $('catSave').onclick = saveCatManager;
    $('catDelCancel').onclick = () => hideModal('catDelModal');

    $('msgOk').onclick = () => hideModal('msgModal');
    $('confirmCancel').onclick = () => hideModal('confirmModal');

    document.querySelectorAll('.modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); });
    });

    if (api.onDataReloaded) api.onDataReloaded((d) => { if (d && d.items) { data = d; applyAccent(data.settings.accentColor); render(); } });
    if (api.onOpenSettings) api.onOpenSettings(() => openSettings());

    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden')); });
  }

  (async () => {
    bind();
    try { data = await api.getData(); } catch (e) { /* 用默认 */ }
    applyAccent(data.settings.accentColor);
    document.querySelectorAll('#viewSwitch .vbtn').forEach((b) => b.classList.toggle('active', b.dataset.view === (data.settings.viewMode || '48')));
    render();
  })();
})();
