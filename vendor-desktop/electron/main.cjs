const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { startHost } = require("./server.cjs");

let mainWindow;
let host;
let pdfPrintWindow;

const isDev = !app.isPackaged;

async function openQrPrintWindow(qr, guestUrl) {
  const qrWindow = new BrowserWindow({
    width: 850,
    height: 900,
    minWidth: 600,
    minHeight: 650,
    title: "QR Print Preview",
    backgroundColor: "#f3f5f9",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "qr-print-preload.cjs"),
    },
  });

  try {
    await qrWindow.loadFile(path.join(__dirname, "qr-print.html"));

    // Send data after the preview page has loaded.
    qrWindow.webContents.send("qr-preview:set-data", {
      qr,
      guestUrl,
    });

    return qrWindow;
  } catch (error) {
    if (!qrWindow.isDestroyed()) {
      qrWindow.close();
    }

    throw error;
  }
}

async function printPdf(filePath, printerName, options) {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  pdfPrintWindow = pdfWindow;

  try {
    await pdfWindow.loadFile(path.join(__dirname, "pdf-print.html"));

    await pdfWindow.webContents.executeJavaScript(
      `new Promise((resolve) => {
        if (window.pdfReady) resolve();
        else window.addEventListener("pdf-ready", resolve, { once: true });
      })`,
      true,
    );

    const base64 = fs.readFileSync(filePath).toString("base64");

    await pdfWindow.webContents.executeJavaScript(
      `window.renderPdf(${JSON.stringify(base64)})`,
      true,
    );

    await new Promise((resolve, reject) => {
      pdfWindow.webContents.print(
        {
          silent: true,
          deviceName: printerName,
          copies: options.copies,
          landscape: options.landscape,
          color: options.color,
          collate: options.collate,
          duplexMode: options.duplexMode,
          pageSize: options.pageSize,
          pageRanges: options.pageRanges,
          margins: { marginType: "none" },
          printBackground: false,
        },
        (success, failureReason) => {
          if (success) {
            resolve();
          } else {
            reject(new Error(failureReason || "PDF printing failed."));
          }
        },
      );
    });
  } finally {
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.destroy();
    }

    if (pdfPrintWindow === pdfWindow) {
      pdfPrintWindow = undefined;
    }
  }
}

function getLanIPv4() {
  const nets = os.networkInterfaces();

  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
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

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadURL("http://127.0.0.1:47831/");
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }

    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  host = await startHost({
    getLanIPv4,

    onChange: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("host:changed");
      }
    },

    printPdf,

    onRelayResult: (job) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("relay:result", {
          jobId: job.id,
          success: job.status === "printed",
          status: job.status,
          message: job.message,
        });
      }
    },
  });

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  if (host) {
    await host.close();
  }
});

// Host and job IPC handlers
ipcMain.handle("host:get-state", () => host.getState());

ipcMain.handle("host:clear-completed", () => host.clearCompleted());

ipcMain.handle("host:refresh-printers", () => host.refreshPrinters());

ipcMain.handle("host:queue-cloud-job", (_, metadata, data, printNow) =>
  host.queueCloudJob(metadata, Buffer.from(data), Boolean(printNow)),
);

ipcMain.handle("host:relay-start", (_, metadata) => host.relayStart(metadata));

ipcMain.handle("host:relay-chunk", (_, id, chunk) =>
  host.relayChunk(id, Buffer.from(chunk)),
);

ipcMain.handle("host:relay-end", (_, id) => host.relayEnd(id));

ipcMain.handle("host:relay-cancel", (_, id) => host.relayCancel(id));

// Open the visible QR preview window.
// This handler does NOT initiate printing.
ipcMain.handle("host:open-qr-preview", async (_, qr, guestUrl) => {
  if (
    typeof qr !== "string" ||
    !qr.startsWith("data:image/") ||
    typeof guestUrl !== "string" ||
    !guestUrl.trim()
  ) {
    throw new Error("Invalid QR preview data.");
  }

  await openQrPrintWindow(qr, guestUrl);

  // IPC responses must be serializable; do not return BrowserWindow.
  return { success: true };
});

// Open the native print dialog from inside the QR preview window.
ipcMain.handle("host:qr-print-dialog", async (event) => {
  const printWindow = BrowserWindow.fromWebContents(event.sender);

  if (!printWindow || printWindow.isDestroyed()) {
    throw new Error("QR preview window is unavailable.");
  }

  return new Promise((resolve) => {
    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
      },
      (success, failureReason) => {
        resolve({
          success,
          error: success
            ? undefined
            : failureReason || "Printing was cancelled or failed.",
        });
      },
    );
  });
});

// Close the QR preview window.
ipcMain.handle("host:qr-close-preview", (event) => {
  const qrWindow = BrowserWindow.fromWebContents(event.sender);

  if (qrWindow && !qrWindow.isDestroyed()) {
    qrWindow.close();
  }

  return { success: true };
});
