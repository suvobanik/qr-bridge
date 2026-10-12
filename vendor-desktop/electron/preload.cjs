const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("printHost", {
  getState: () => ipcRenderer.invoke("host:get-state"),
  setAutoApprove: (value) => ipcRenderer.invoke("host:set-auto-approve", value),
  approve: (id) => ipcRenderer.invoke("host:approve", id),
  reject: (id) => ipcRenderer.invoke("host:reject", id),
  clearCompleted: () => ipcRenderer.invoke("host:clear-completed"),
  refreshPrinters: () => ipcRenderer.invoke("host:refresh-printers"),
  relayStart: (metadata) => ipcRenderer.invoke("host:relay-start", metadata),
  relayChunk: (id, chunk) => ipcRenderer.invoke("host:relay-chunk", id, chunk),
  relayEnd: (id) => ipcRenderer.invoke("host:relay-end", id),
  relayCancel: (id) => ipcRenderer.invoke("host:relay-cancel", id),
  onRelayResult: (callback) =>
    ipcRenderer.on("relay:result", (_, result) => callback(result)),
  onChange: (callback) => ipcRenderer.on("host:changed", callback),
});
