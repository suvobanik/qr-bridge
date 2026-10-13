const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("printHost", {
  // State and job management
  getState: () => ipcRenderer.invoke("host:get-state"),
  clearCompleted: () => ipcRenderer.invoke("host:clear-completed"),
  refreshPrinters: () => ipcRenderer.invoke("host:refresh-printers"),

  // Cloud print jobs
  queueCloudJob: (metadata, data, printNow) =>
    ipcRenderer.invoke("host:queue-cloud-job", metadata, data, printNow),

  // Relay transfers
  relayStart: (metadata) => ipcRenderer.invoke("host:relay-start", metadata),

  relayChunk: (jobId, chunkIndex, data) =>
    ipcRenderer.invoke("host:relay-chunk", jobId, chunkIndex, data),

  relayEnd: (jobId) => ipcRenderer.invoke("host:relay-end", jobId),

  relayCancel: (jobId) => ipcRenderer.invoke("host:relay-cancel", jobId),

  onRelayResult: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on("host:relay-result", listener);

    return () => {
      ipcRenderer.removeListener("host:relay-result", listener);
    };
  },

  // Open a visible QR preview window.
  // Printing is initiated separately from inside that window.
  openQrPreview: (qr, guestUrl) =>
    ipcRenderer.invoke("host:open-qr-preview", qr, guestUrl),

  // Subscribe to host state changes.
  onChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("host:change", listener);

    return () => {
      ipcRenderer.removeListener("host:change", listener);
    };
  },
});
