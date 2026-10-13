const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { randomUUID, randomBytes } = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const DATA_DIR = path.join(os.homedir(), "QRPrintBridge");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function runPowerShell(script, args = []) {
  return execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
      ...args,
    ],
    {
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function normalizePrintOptions(options = {}) {
  const copies = Number.isInteger(options.copies)
    ? Math.min(99, Math.max(1, options.copies))
    : 1;

  const pageSize =
    typeof options.paperSize === "string"
      ? { name: options.paperSize }
      : undefined;

  const pageRanges = Array.isArray(options.pageRanges)
    ? options.pageRanges
        .filter(
          (range) =>
            Number.isInteger(range?.from) &&
            Number.isInteger(range?.to) &&
            range.from >= 0 &&
            range.to >= range.from,
        )
        .map((range) => ({
          from: range.from,
          to: range.to,
        }))
    : undefined;

  return {
    copies,
    landscape: options.orientation === "landscape",
    color: options.color !== false,
    collate: options.collate !== false,
    duplexMode: ["simplex", "shortEdge", "longEdge"].includes(options.duplex)
      ? options.duplex
      : "simplex",
    pageSize,
    pageRanges,
  };
}

async function getPrinters() {
  if (process.platform !== "win32") return [];

  try {
    const script =
      "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress";

    const { stdout } = await runPowerShell(script);
    const parsed = JSON.parse(stdout.trim() || "[]");

    return (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
  } catch {
    return [];
  }
}

async function getDefaultPrinter() {
  if (process.platform !== "win32") return "";

  try {
    const script =
      "(Get-CimInstance Win32_Printer -Filter 'Default=True' | Select-Object -First 1 -ExpandProperty Name)";

    const { stdout } = await runPowerShell(script);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function printFile(
  filePath,
  mimeType,
  printerName,
  options = {},
  printPdf,
) {
  if (process.platform !== "win32") {
    throw new Error("This MVP currently supports Windows only.");
  }

  if (!printerName) {
    throw new Error(
      "No printer selected. Choose an installed printer in the laptop app.",
    );
  }

  if (
    mimeType === "application/pdf" ||
    filePath.toLowerCase().endsWith(".pdf")
  ) {
    if (!printPdf) {
      throw new Error("PDF printing is not available.");
    }

    await printPdf(filePath, printerName, normalizePrintOptions(options));
    return;
  }

  // Native Windows image printing without a browser print dialog.
  const script = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$path = $args[0]
$printer = $args[1]
$image = [System.Drawing.Image]::FromFile($path)

try {
    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $printer

    if (-not $doc.PrinterSettings.IsValid) {
        throw "Printer is unavailable: $printer"
    }

    $doc.DocumentName = [System.IO.Path]::GetFileName($path)

    $doc.add_PrintPage({
        param($sender, $e)

        $bounds = $e.MarginBounds
        $ratio = [Math]::Min(
            $bounds.Width / $image.Width,
            $bounds.Height / $image.Height
        )

        $w = [int]($image.Width * $ratio)
        $h = [int]($image.Height * $ratio)

        $x = $bounds.Left + [int](($bounds.Width - $w) / 2)
        $y = $bounds.Top + [int](($bounds.Height - $h) / 2)

        $e.Graphics.DrawImage($image, $x, $y, $w, $h)
        $e.HasMorePages = $false
    })

    $doc.Print()
    $doc.Dispose()
} finally {
    $image.Dispose()
}
`;

  await runPowerShell(script, [filePath, printerName]);
}

async function startHost({ getLanIPv4, onChange, onRelayResult, printPdf }) {
  const app = express();
  const server = http.createServer(app);

  const upload = multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (_, file, cb) =>
        cb(
          null,
          `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
        ),
    }),
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
    fileFilter: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();

      const allowedExtension = [
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
      ].includes(ext);

      const allowedMime =
        file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("image/");

      cb(null, allowedExtension && allowedMime);
    },
  });

  const sessionToken = randomBytes(18).toString("hex");
  const jobs = [];

  let selectedPrinter = await getDefaultPrinter();
  let printers = await getPrinters();

  const lanUrl = () => `http://${getLanIPv4()}:47831/guest/${sessionToken}`;

  function notify() {
    onChange?.();
  }

  function isSupportedSignature(buffer, mimeType) {
    if (mimeType === "application/pdf") {
      return buffer.subarray(0, 5).toString() === "%PDF-";
    }

    if (mimeType === "image/jpeg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimeType === "image/png") {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }

    return false;
  }

  function sanitizeFileName(name) {
    return path
      .basename(name.replace(/\\/g, "/"))
      .replace(/[\x00-\x1f]/g, "_")
      .slice(0, 200);
  }

  function createRelayJob(metadata) {
    if (!metadata || typeof metadata !== "object") {
      throw new Error("Invalid print metadata.");
    }

    if (
      typeof metadata.name !== "string" ||
      !metadata.name.trim() ||
      !ALLOWED_MIME_TYPES.has(metadata.mimeType)
    ) {
      throw new Error("Unsupported file type.");
    }

    if (
      !Number.isSafeInteger(metadata.size) ||
      metadata.size < 1 ||
      metadata.size > MAX_FILE_SIZE
    ) {
      throw new Error("File must be between 1 byte and 25 MB.");
    }

    const safeName = sanitizeFileName(metadata.name);

    const filePath = path.join(
      UPLOAD_DIR,
      `${Date.now()}-${randomUUID()}${path.extname(safeName).toLowerCase()}`,
    );

    const stream = fs.createWriteStream(filePath, {
      flags: "wx",
      mode: 0o600,
    });

    const job = {
      id: metadata.jobId || randomUUID(),
      originalName: safeName,
      mimeType: metadata.mimeType,
      size: metadata.size,
      status: "queued",
      createdAt: new Date().toISOString(),
      message: "Queued",
      path: filePath,
      relayStream: stream,
      relayBytes: 0,
      relayFirstChunk: Buffer.alloc(0),
      relayDone: false,
      printOptions: metadata.options || {},
    };

    jobs.unshift(job);
    notify();

    return job;
  }

  async function relayStart(metadata) {
    const job = createRelayJob(metadata);

    try {
      await new Promise((resolve, reject) => {
        job.relayStream.once("open", resolve);
        job.relayStream.once("error", reject);
      });

      return {
        id: job.id,
        size: job.size,
      };
    } catch (error) {
      const index = jobs.indexOf(job);
      if (index >= 0) jobs.splice(index, 1);

      try {
        fs.unlinkSync(job.path);
      } catch {}

      throw error;
    }
  }

  async function relayChunk(id, chunk) {
    const job = jobs.find((item) => item.id === id);

    if (!job || job.relayDone || !job.relayStream) {
      throw new Error("Upload is no longer active.");
    }

    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    if (!buffer.length || job.relayBytes + buffer.length > job.size) {
      throw new Error("Uploaded file exceeded its declared size.");
    }

    if (job.relayBytes === 0) {
      job.relayFirstChunk = buffer.subarray(0, 16);

      if (!isSupportedSignature(buffer, job.mimeType)) {
        throw new Error("File content does not match its declared type.");
      }
    }

    if (!job.relayStream.write(buffer)) {
      await new Promise((resolve) => job.relayStream.once("drain", resolve));
    }

    job.relayBytes += buffer.length;
  }

  async function relayEnd(id) {
    const job = jobs.find((item) => item.id === id);

    if (!job || job.relayDone || !job.relayStream) {
      throw new Error("Upload is no longer active.");
    }

    if (job.relayBytes !== job.size) {
      throw new Error("Upload was incomplete.");
    }

    await new Promise((resolve, reject) => {
      job.relayStream.once("finish", resolve);
      job.relayStream.once("error", reject);
      job.relayStream.end();
    });

    job.relayDone = true;
    job.relayStream = null;
    job.status = "queued";
    job.message = "Queued";

    notify();

    // Intentionally do not print automatically.
    return {
      status: job.status,
      message: job.message,
    };
  }

  async function queueCloudJob(metadata, data) {
    if (!metadata || typeof metadata !== "object") {
      throw new Error("Invalid print metadata.");
    }

    if (
      typeof metadata.jobId !== "string" ||
      !metadata.jobId.trim() ||
      typeof metadata.name !== "string" ||
      !metadata.name.trim() ||
      !ALLOWED_MIME_TYPES.has(metadata.mimeType)
    ) {
      throw new Error("Unsupported file type.");
    }

    // Prevent duplicate local jobs when cloud recovery/realtime events repeat.
    const existingJob = jobs.find((job) => job.id === metadata.jobId);

    if (existingJob) {
      return {
        id: existingJob.id,
        size: existingJob.size,
      };
    }

    if (
      !Number.isSafeInteger(metadata.size) ||
      metadata.size < 1 ||
      metadata.size > MAX_FILE_SIZE ||
      !Buffer.isBuffer(data) ||
      data.length !== metadata.size
    ) {
      throw new Error("Uploaded file is invalid or incomplete.");
    }

    if (!isSupportedSignature(data, metadata.mimeType)) {
      throw new Error("File content does not match its declared type.");
    }

    const safeName = sanitizeFileName(metadata.name);

    const filePath = path.join(
      UPLOAD_DIR,
      `${Date.now()}-${randomUUID()}${path.extname(safeName).toLowerCase()}`,
    );

    fs.writeFileSync(filePath, data, {
      flag: "wx",
      mode: 0o600,
    });

    const job = {
      id: metadata.jobId,
      originalName: safeName,
      mimeType: metadata.mimeType,
      size: metadata.size,
      status: "queued",
      createdAt: new Date().toISOString(),
      message: "Queued",
      path: filePath,
      relayStream: null,
      relayBytes: data.length,
      relayFirstChunk: data.subarray(0, 16),
      relayDone: true,
      printOptions: metadata.options || {},
    };

    jobs.unshift(job);
    notify();

    // Keep cloud jobs queued. Do not call processJob here.
    return {
      id: job.id,
      size: job.size,
    };
  }

  function relayCancel(id) {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;

    if (job.relayStream) {
      job.relayStream.destroy();
    }

    try {
      fs.unlinkSync(job.path);
    } catch {}

    const index = jobs.indexOf(job);
    if (index >= 0) jobs.splice(index, 1);

    notify();
  }

  function publicState() {
    return {
      host: getLanIPv4(),
      port: 47831,
      guestUrl: lanUrl(),
      sessionToken,
      printers,
      selectedPrinter,
      jobs: jobs.map(
        ({ id, originalName, mimeType, size, status, createdAt, message }) => ({
          id,
          originalName,
          mimeType,
          size,
          status,
          createdAt,
          message,
        }),
      ),
    };
  }

  // Retained for future explicit print functionality.
  // No upload or cloud-queue handler calls this function.
  async function processJob(job) {
    try {
      job.status = "printing";
      job.message = "Sending to printer";
      notify();

      await printFile(
        job.path,
        job.mimeType,
        selectedPrinter,
        job.printOptions || {},
        printPdf,
      );

      job.status = "printed";
      job.message = "Submitted to the printer system";
    } catch (error) {
      job.status = "failed";
      job.message = error.message || "Printing failed";
    } finally {
      if (job.relayStream) {
        job.relayStream.destroy();
      }

      if (job.relayDone || !job.relayStream) {
        try {
          fs.unlinkSync(job.path);
        } catch {}
      }

      onRelayResult?.(job);
      notify();
    }
  }

  app.use(express.json());

  app.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });

  app.get("/api/health", (_, res) => {
    res.json({ ok: true });
  });

  app.get("/api/public/:token", (req, res) => {
    if (req.params.token !== sessionToken) {
      return res
        .status(404)
        .json({ error: "This QR session is no longer available." });
    }

    res.json({
      active: true,
      maxFileSizeMB: 25,
      allowedTypes: ["PDF", "PNG", "JPG", "WEBP", "BMP"],
    });
  });

  app.post("/api/submit/:token", (req, res, next) => {
    if (req.params.token !== sessionToken) {
      return res.status(404).json({ error: "Session expired." });
    }

    upload.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "Maximum file size is 25 MB."
              : error.message || "Upload failed.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Choose a PDF or image file.",
        });
      }

      const job = {
        id: randomUUID(),
        originalName: path.basename(req.file.originalname),
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: "queued",
        createdAt: new Date().toISOString(),
        message: "Queued",
      };

      jobs.unshift(job);
      notify();

      // Upload is accepted and queued; no automatic printing.
      res.json({
        ok: true,
        id: job.id,
        status: job.status,
      });
    });
  });

  app.get("/api/job/:token/:id", (req, res) => {
    if (req.params.token !== sessionToken) {
      return res.status(404).json({ error: "Session expired." });
    }

    const job = jobs.find((item) => item.id === req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    res.json({
      status: job.status,
      message: job.message,
    });
  });

  app.get("/guest/:token", (req, res) => {
    if (req.params.token !== sessionToken) {
      return res.status(404).send("QR session expired.");
    }

    res.sendFile(path.join(__dirname, "../dist/guest.html"), (error) => {
      if (error) {
        res
          .status(503)
          .send("Guest page not built yet. Build the app and reopen it.");
      }
    });
  });

  // Guest static assets from the production Vite output.
  app.use("/assets", express.static(path.join(__dirname, "../dist/assets")));

  app.use(
    "/guest-assets",
    express.static(path.join(__dirname, "../dist/guest-assets")),
  );

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(47831, "0.0.0.0", resolve);
  });

  return {
    getState: () => publicState(),

    clearCompleted: () => {
      for (let i = jobs.length - 1; i >= 0; i--) {
        if (jobs[i].status === "printed") {
          try {
            fs.unlinkSync(jobs[i].path);
          } catch {}

          jobs.splice(i, 1);
        }
      }

      notify();
      return publicState();
    },

    queueCloudJob,

    refreshPrinters: async () => {
      printers = await getPrinters();

      if (!printers.includes(selectedPrinter)) {
        selectedPrinter = printers[0] || "";
      }

      notify();
      return publicState();
    },

    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

module.exports = { startHost };
