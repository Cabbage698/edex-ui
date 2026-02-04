// Minimal preload script to expose a safe, whitelisted API to the renderer
const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');

const allowedSendChannels = [
  'log', // as currently used
  'systeminformation-call',
  'app-focus',
  'app-relaunch',
  'app-quit',
  'shortcuts-register',
  'shortcuts-unregister-all',
  'window-set-fullscreen',
  'window-set-size',
  'window-unmaximize',
  'window-toggle-devtools',
  'window-minimize',
  // keep other channels that the renderer needs to subscribe to
];

const allowedInvokeChannels = [
  'read-settings',
  'write-settings',
  'get-app-version',
  'get-user-data-path',
  'get-process-argv',
  'read-shortcuts',
  'open-path',
  'get-displays',
  'window-get-size',
  'window-is-fullscreen',
  'window-is-maximized'
];

const userDataPath = ipcRenderer.sendSync('get-user-data-path');
const processArgv = ipcRenderer.sendSync('get-process-argv');
const appVersion = ipcRenderer.sendSync('get-app-version');

contextBridge.exposeInMainWorld('edex', {
  app: {
    getVersion: () => appVersion,
    focus: () => ipcRenderer.send('app-focus'),
    relaunch: () => ipcRenderer.send('app-relaunch'),
    quit: () => ipcRenderer.send('app-quit')
  },
  paths: {
    userData: userDataPath
  },
  process: {
    argv: processArgv
  },
  shortcuts: {
    register: (accelerator, payload) => ipcRenderer.send('shortcuts-register', accelerator, payload),
    unregisterAll: () => ipcRenderer.send('shortcuts-unregister-all')
  },
  screen: {
    getAllDisplays: () => ipcRenderer.invoke('get-displays')
  },
  window: {
    getSize: () => ipcRenderer.invoke('window-get-size'),
    isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    setFullScreen: value => ipcRenderer.send('window-set-fullscreen', value),
    setSize: (width, height) => ipcRenderer.send('window-set-size', width, height),
    unmaximize: () => ipcRenderer.send('window-unmaximize'),
    toggleDevTools: () => ipcRenderer.send('window-toggle-devtools'),
    minimize: () => ipcRenderer.send('window-minimize')
  },
  send: (channel, ...args) => {
    if (allowedSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`edex.preload: send to disallowed channel: ${channel}`);
    }
  },
  invoke: async (channel, ...args) => {
    if (allowedInvokeChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    } else {
      console.warn(`edex.preload: invoke to disallowed channel: ${channel}`);
      throw new Error('disallowed channel');
    }
  },
  on: (channel, listener) => {
    // allow renderer to subscribe to some reply channels
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  },
  clipboard: {
    readText: () => clipboard.readText(),
    writeText: (text) => clipboard.writeText(text)
  },
  shell: {
    openPath: (p) => shell.openPath(p),
    openExternal: (url) => shell.openExternal(url)
  },
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  }
});
