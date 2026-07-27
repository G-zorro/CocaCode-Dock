const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Data
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Item
  saveItem: (payload) => ipcRenderer.invoke('save-item', payload),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  reclassifyItem: (id, category) => ipcRenderer.invoke('reclassify-item', { id, category }),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  reorderItems: (orderedIds) => ipcRenderer.invoke('reorder-items', orderedIds),

  // Launch / open
  launchItem: (id) => ipcRenderer.invoke('launch-item', id),
  launchAdmin: (id) => ipcRenderer.invoke('launch-admin', id),
  launchAdminCmd: (id) => ipcRenderer.invoke('launch-admin-cmd', id),
  launchAdminPowershell: (id) => ipcRenderer.invoke('launch-admin-powershell', id),
  openItemFolder: (id) => ipcRenderer.invoke('open-item-folder', id),
  openSourcePath: (id) => ipcRenderer.invoke('open-source-path', id),
  uninstallItem: (id) => ipcRenderer.invoke('uninstall-item', id),

  // Files / scan
  browseTarget: () => ipcRenderer.invoke('browse-target'),
  pickIconFile: () => ipcRenderer.invoke('pick-icon-file'),
  getFileIcon: (targetPath) => ipcRenderer.invoke('get-file-icon', targetPath),
  scanPrograms: () => ipcRenderer.invoke('scan-programs'),

  // Backup
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),

  // Settings
  saveSettings: (next) => ipcRenderer.invoke('save-settings', next),
  saveCategories: (payload) => ipcRenderer.invoke('save-categories', payload),

  // Window
  hideWindow: () => ipcRenderer.send('window-hide'),
  showWindow: () => ipcRenderer.send('window-show'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Events from main
  onDataReloaded: (fn) => ipcRenderer.on('data-reloaded', (_, d) => fn(d)),
  onOpenSettings: (fn) => ipcRenderer.on('open-settings', () => fn()),
});
