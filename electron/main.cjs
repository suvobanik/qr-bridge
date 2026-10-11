const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const { startHost } = require("./server.cjs");

let mainWindow;
let host;
const isDev = !app.isPackaged;

function getLanIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: "#f6f7fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (isDev) await mainWindow.loadURL("http://localhost:5173");
  else await mainWindow.loadURL("http://127.0.0.1:47831/");
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  host = await startHost({
    getLanIPv4,
    onChange: () => mainWindow?.webContents.send("host:changed"),
    onRelayResult: (job) =>
      mainWindow?.webContents.send("relay:result", {
        jobId: job.id,
        success: job.status === "printed",
        message: job.message,
      }),
  });
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", async () => {
  if (host) await host.close();
});

ipcMain.handle("host:get-state", () => host.getState());
ipcMain.handle("host:set-auto-approve", (_, value) =>
  host.setAutoApprove(Boolean(value)),
);
ipcMain.handle("host:approve", (_, id) => host.decideJob(id, true));
ipcMain.handle("host:reject", (_, id) => host.decideJob(id, false));
ipcMain.handle("host:clear-completed", () => host.clearCompleted());
ipcMain.handle("host:refresh-printers", () => host.refreshPrinters());
ipcMain.handle("host:relay-start", (_, metadata) => host.relayStart(metadata));
ipcMain.handle("host:relay-chunk", (_, id, chunk) =>
  host.relayChunk(id, Buffer.from(chunk)),
);
ipcMain.handle("host:relay-end", (_, id) => host.relayEnd(id));
ipcMain.handle("host:relay-cancel", (_, id) => host.relayCancel(id));
