const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("qrPrintHost", {
  onData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("qr-preview:set-data", listener);

    return () => {
      ipcRenderer.removeListener("qr-preview:set-data", listener);
    };
  },

  print: () => ipcRenderer.invoke("host:qr-print-dialog"),

  close: () => ipcRenderer.invoke("host:qr-close-preview"),
});
