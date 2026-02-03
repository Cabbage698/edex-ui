// Minimal preload script to expose a safe, whitelisted API to the renderer
const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');

const allowedSendChannels = [
  'log', // as currently used
  'systeminformation-call',
  // keep other channels that the renderer needs to subscribe to
];

const allowedInvokeChannels = [
  'read-settings',
  'write-settings',
  'get-app-version',
  'get-user-data-path',
  'read-shortcuts',
  'open-path'
];

contextBridge.exposeInMainWorld('edex', {
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
    openPath: (p) => shell.openPath(p)
  },
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  }
});