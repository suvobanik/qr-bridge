const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("printHost", {
  getState: () => ipcRenderer.invoke("host:get-state"),

  clearCompleted: () => ipcRenderer.invoke("host:clear-completed"),

  refreshPrinters: () => ipcRenderer.invoke("host:refresh-printers"),

  queueCloudJob: (metadata, data, printNow) =>
    ipcRenderer.invoke("host:queue-cloud-job", metadata, data, printNow),

  relayStart: (metadata) => ipcRenderer.invoke("host:relay-start", metadata),

  relayChunk: (id, chunk) => ipcRenderer.invoke("host:relay-chunk", id, chunk),

  relayEnd: (id) => ipcRenderer.invoke("host:relay-end", id),

  relayCancel: (id) => ipcRenderer.invoke("host:relay-cancel", id),

  onRelayResult: (callback) => {
    const listener = (_, result) => callback(result);

    ipcRenderer.on("relay:result", listener);

    return () => ipcRenderer.removeListener("relay:result", listener);
  },

  onChange: (callback) => {
    const listener = () => callback();

    ipcRenderer.on("host:changed", listener);

    return () => ipcRenderer.removeListener("host:changed", listener);
  },
});
