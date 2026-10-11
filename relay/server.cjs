require("dotenv").config();

const express = require("express");
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const crypto = require("crypto");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 47832 } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in relay/.env",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024,
  perMessageDeflate: false,
});

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;
const MAX_CHUNK_SIZE = 256 * 1024;
const TRANSFER_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_MESSAGE_SIZE = 32 * 1024;
const MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS || 500);
const MAX_UPLOAD_STARTS_PER_MINUTE = Number(
  process.env.MAX_UPLOAD_STARTS_PER_MINUTE || 20,
);
const RATE_WINDOW_MS = 60 * 1000;
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Vendor user ID -> connected desktop WebSocket
const vendors = new Map();
const connections = new Set();
const uploadStarts = new Map();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function matchesSignature(buffer, mimeType) {
  if (mimeType === "application/pdf")
    return buffer.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/jpeg")
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    onlineVendors: vendors.size,
  });
});

function sendJSON(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendError(socket, message) {
  sendJSON(socket, {
    type: "error",
    message,
  });
}

function frameVendorChunk(jobId, data) {
  const id = Buffer.from(jobId, "utf8");
  const frame = Buffer.allocUnsafe(1 + id.length + data.length);
  frame[0] = id.length;
  id.copy(frame, 1);
  data.copy(frame, 1 + id.length);
  return frame;
}

function releaseTransfer(customer) {
  const vendor = customer.vendorSocket;

  if (customer.transfer?.timeout) clearTimeout(customer.transfer.timeout);

  if (vendor && customer.transfer) {
    vendor.activeCustomers.delete(customer.transfer.jobId);
  }

  customer.vendorSocket = null;
  customer.transfer = null;
}

function abortTransfer(customer, message) {
  const vendor = customer.vendorSocket;

  sendError(customer, message);

  if (vendor && vendor.readyState === WebSocket.OPEN) {
    sendJSON(vendor, {
      type: "print:cancel",
      jobId: customer.transfer?.jobId,
    });
  }

  releaseTransfer(customer);
}

function disconnectVendor(vendor) {
  for (const customer of vendor.activeCustomers.values()) {
    sendError(customer, "The vendor disconnected. Please try again later.");

    customer.vendorSocket = null;
    if (customer.transfer?.timeout) clearTimeout(customer.transfer.timeout);
    customer.transfer = null;
  }
  vendor.activeCustomers.clear();

  if (vendor.vendorId && vendors.get(vendor.vendorId) === vendor) {
    vendors.delete(vendor.vendorId);
  }
}

async function authenticateVendor(accessToken) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error("Invalid or expired vendor session.");
  }

  return user.id;
}

async function findVendorBySlug(slug) {
  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("Could not look up vendor.");
  }

  return data?.id ?? null;
}

server.on("upgrade", async (request, socket, head) => {
  let url;

  try {
    url = new URL(request.url, "http://localhost");
  } catch {
    socket.destroy();
    return;
  }

  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const role = url.searchParams.get("role");

  if (role !== "vendor" && role !== "customer") {
    socket.destroy();
    return;
  }

  const origin = request.headers.origin;
  if (
    role === "customer" &&
    ALLOWED_ORIGINS.size &&
    (!origin || !ALLOWED_ORIGINS.has(origin))
  ) {
    socket.destroy();
    return;
  }

  if (connections.size >= MAX_CONNECTIONS) {
    socket.write(
      "HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n",
    );
    socket.destroy();
    return;
  }

  let vendorId = null;

  if (role === "customer") {
    const slug = url.searchParams.get("slug");

    if (!slug || slug.length > 100) {
      socket.destroy();
      return;
    }

    try {
      vendorId = await findVendorBySlug(slug);
    } catch (error) {
      console.error("Vendor lookup failed:", error.message);
      socket.destroy();
      return;
    }

    if (!vendorId) {
      socket.destroy();
      return;
    }

    if (!vendors.has(vendorId)) {
      socket.write(
        "HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n",
      );
      socket.destroy();
      return;
    }
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    connections.add(ws);
    ws.clientIp = request.socket.remoteAddress || "unknown";
    ws.role = role;
    ws.vendorId = vendorId;
    ws.authenticated = false;
    ws.activeCustomers = new Map();
    ws.vendorSocket = null;
    ws.transfer = null;

    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  // Vendor must authenticate immediately after connecting.
  if (ws.role === "vendor") {
    ws.authTimeout = setTimeout(() => {
      if (!ws.authenticated) {
        sendError(ws, "Authentication timed out.");
        ws.close(4001, "Authentication required");
      }
    }, 10000);
  } else {
    ws.authenticated = true;
    sendJSON(ws, { type: "connected" });
  }

  ws.on("message", async (data, isBinary) => {
    if (!isBinary && data.length > MAX_MESSAGE_SIZE) {
      sendError(ws, "Message is too large.");
      return;
    }

    // Binary messages are file chunks from customers.
    if (isBinary) {
      if (ws.role !== "customer" || !ws.transfer) {
        sendError(ws, "No active upload.");
        return;
      }

      const vendor = ws.vendorSocket;

      if (
        !vendor ||
        vendor.readyState !== WebSocket.OPEN ||
        !vendor.activeCustomers.has(ws.transfer.jobId)
      ) {
        abortTransfer(ws, "Vendor is no longer connected.");
        return;
      }

      const transfer = ws.transfer;
      if (transfer.ended || data.length > MAX_CHUNK_SIZE) {
        abortTransfer(ws, "Invalid upload chunk.");
        return;
      }
      if (transfer.receivedBytes === 0) {
        transfer.firstBytes = Buffer.from(data.subarray(0, 16));
        if (!matchesSignature(transfer.firstBytes, transfer.mimeType)) {
          abortTransfer(ws, "File content does not match its declared type.");
          return;
        }
      }
      transfer.receivedBytes += data.length;

      if (transfer.receivedBytes > transfer.expectedBytes) {
        abortTransfer(ws, "Uploaded file exceeded its declared size.");
        return;
      }

      if (vendor.bufferedAmount > MAX_BUFFERED_BYTES) {
        abortTransfer(ws, "Vendor connection is too slow. Try again.");
        return;
      }

      vendor.send(
        frameVendorChunk(transfer.jobId, data),
        { binary: true },
        (error) => {
          if (error && ws.transfer) {
            abortTransfer(ws, "Could not forward the file.");
          }
        },
      );

      return;
    }

    let message;

    try {
      message = JSON.parse(data.toString());
    } catch {
      sendError(ws, "Invalid message.");
      return;
    }

    // First message from a vendor must contain its Supabase access token.
    if (ws.role === "vendor" && !ws.authenticated) {
      if (message.type !== "vendor:auth" || !message.accessToken) {
        ws.close(4001, "Authentication required");
        return;
      }

      try {
        const vendorId = await authenticateVendor(message.accessToken);

        if (ws.readyState !== WebSocket.OPEN) return;

        clearTimeout(ws.authTimeout);
        ws.authenticated = true;
        ws.vendorId = vendorId;

        // Replace any previous connection for this vendor.
        const previous = vendors.get(vendorId);

        if (previous && previous !== ws) {
          disconnectVendor(previous);
          previous.close(4002, "Replaced by a new connection");
        }

        vendors.set(vendorId, ws);

        sendJSON(ws, { type: "vendor:ready" });
      } catch (error) {
        sendError(ws, error.message);
        ws.close(4001, "Authentication failed");
      }

      return;
    }

    if (!ws.authenticated) {
      return;
    }

    // Vendor reports the result of handling a print job.
    if (ws.role === "vendor") {
      if (message.type === "print:accepted") {
        const customer = ws.activeCustomers.get(message.jobId);
        if (
          !customer ||
          !customer.transfer ||
          message.jobId !== customer.transfer.jobId
        )
          return;
        sendJSON(customer, { type: "print:accepted", jobId: message.jobId });
        return;
      }

      if (message.type === "print:result") {
        const customer = ws.activeCustomers.get(message.jobId);

        if (
          !customer ||
          !customer.transfer ||
          message.jobId !== customer.transfer.jobId
        )
          return;

        sendJSON(customer, {
          type: "print:result",
          jobId: customer.transfer?.jobId,
          success: Boolean(message.success),
          message: String(message.message || "").slice(0, 300),
        });

        releaseTransfer(customer);
      }

      return;
    }

    // Customer starts an upload.
    if (message.type === "print:start") {
      if (ws.transfer) {
        sendError(ws, "Another upload is already in progress.");
        return;
      }

      const vendor = vendors.get(ws.vendorId);

      if (!vendor || vendor.readyState !== WebSocket.OPEN) {
        sendError(ws, "Vendor is currently unavailable.");
        return;
      }

      const now = Date.now();
      const recentStarts = (uploadStarts.get(ws.clientIp) || []).filter(
        (time) => now - time < RATE_WINDOW_MS,
      );
      if (recentStarts.length >= MAX_UPLOAD_STARTS_PER_MINUTE) {
        sendError(ws, "Too many upload attempts. Please try again later.");
        return;
      }
      recentStarts.push(now);
      uploadStarts.set(ws.clientIp, recentStarts);

      const { name, mimeType, size, options } = message;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof mimeType !== "string" ||
        !ALLOWED_MIME_TYPES.has(mimeType) ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > MAX_FILE_SIZE
      ) {
        sendError(ws, "Invalid file. Use a PDF, JPEG, or PNG up to 25 MB.");
        return;
      }

      const safeName = path
        .basename(name.replace(/\\/g, "/"))
        .replace(/[\x00-\x1f]/g, "_")
        .slice(0, 200);

      const jobId = crypto.randomUUID();

      ws.vendorSocket = vendor;
      ws.transfer = {
        jobId,
        expectedBytes: size,
        receivedBytes: 0,
        ended: false,
        firstBytes: Buffer.alloc(0),
        mimeType,
      };
      ws.transfer.timeout = setTimeout(() => {
        if (ws.transfer) abortTransfer(ws, "Upload timed out.");
      }, TRANSFER_TIMEOUT_MS);

      vendor.activeCustomers.set(jobId, ws);

      sendJSON(vendor, {
        type: "print:start",
        jobId,
        name: safeName,
        mimeType,
        size,
        options:
          options && typeof options === "object" && !Array.isArray(options)
            ? Object.fromEntries(Object.entries(options).slice(0, 10))
            : {},
      });

      sendJSON(ws, {
        type: "print:ready",
        jobId,
        chunkSize: 256 * 1024,
      });

      return;
    }

    // Customer signals that all file chunks have been sent.
    if (message.type === "print:end") {
      if (!ws.transfer || !ws.vendorSocket) {
        sendError(ws, "No active upload.");
        return;
      }

      if (ws.transfer.ended) {
        sendError(ws, "Upload has already ended.");
        return;
      }

      if (ws.transfer.receivedBytes !== ws.transfer.expectedBytes) {
        abortTransfer(ws, "Upload was incomplete.");
        return;
      }

      ws.transfer.ended = true;

      sendJSON(ws.vendorSocket, {
        type: "print:end",
        jobId: ws.transfer.jobId,
      });

      sendJSON(ws, {
        type: "print:received",
        jobId: ws.transfer.jobId,
      });

      return;
    }

    if (message.type === "print:cancel" && ws.transfer) {
      abortTransfer(ws, "Upload cancelled.");
    }
  });

  ws.on("close", () => {
    connections.delete(ws);
    clearTimeout(ws.authTimeout);

    if (ws.role === "vendor") {
      disconnectVendor(ws);
      return;
    }

    if (ws.transfer) {
      releaseTransfer(ws);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`QR Print Bridge relay listening on port ${PORT}`);
});
