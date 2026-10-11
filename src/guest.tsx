import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FileUp,
  Printer,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import "./ui/guest.css";

interface Job {
  id: string;
  status: string;
  message?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function GuestApp() {
  const routeParts = window.location.pathname.split("/").filter(Boolean);
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  const slug =
    querySlug ||
    (routeParts[0] === "v" ? routeParts[1] || "" : routeParts.at(-1) || "");
  const relayUrl = import.meta.env.VITE_RELAY_URL as string | undefined;
  const socketRef = useRef<WebSocket | null>(null);
  const readyRef = useRef<{
    resolve: (jobId: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!relayUrl || !slug) {
      setAvailable(false);
      setError("This print station link is not configured correctly.");
      return;
    }
    const url = new URL(relayUrl);
    url.searchParams.set("role", "customer");
    url.searchParams.set("slug", slug);
    const socket = new WebSocket(url.toString());
    socketRef.current = socket;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => setAvailable(true);
    socket.onclose = () => {
      setAvailable(false);
      readyRef.current?.reject(new Error("The print station is unavailable."));
      readyRef.current = null;
    };
    socket.onerror = () => setAvailable(false);
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as {
          type: string;
          jobId?: string;
          success?: boolean;
          message?: string;
        };
        if (message.type === "connected") setAvailable(true);
        if (message.type === "print:ready" && message.jobId) {
          readyRef.current?.resolve(message.jobId);
          readyRef.current = null;
        }
        if (message.type === "print:received")
          setJob((current) =>
            current
              ? {
                  ...current,
                  status: "received",
                  message: "File received by the print station.",
                }
              : current,
          );
        if (message.type === "print:accepted")
          setJob((current) =>
            current
              ? {
                  ...current,
                  status: "pending",
                  message: "Waiting for host approval.",
                }
              : current,
          );
        if (message.type === "print:result") {
          setBusy(false);
          setJob((current) =>
            current
              ? {
                  ...current,
                  status: message.success ? "printed" : "failed",
                  message: message.message,
                }
              : current,
          );
        }
        if (message.type === "error") {
          readyRef.current?.reject(
            new Error(message.message || "Upload failed."),
          );
          readyRef.current = null;
          setBusy(false);
          setError(message.message || "Upload failed.");
        }
      } catch {
        setError("The print station sent an invalid response.");
      }
    };
    return () => {
      readyRef.current?.reject(new Error("Connection closed."));
      socket.close();
      socketRef.current = null;
    };
  }, [relayUrl, slug]);

  function choose(nextFile?: File) {
    setError("");
    setJob(null);
    if (!nextFile) return;
    if (!ALLOWED_TYPES.has(nextFile.type)) {
      setError("Choose a PDF, PNG, or JPG image.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError("Maximum file size is 25 MB.");
      return;
    }
    setFile(nextFile);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const socket = socketRef.current;
    if (!file || busy) return;
    if (!socket || socket.readyState !== WebSocket.OPEN || available !== true) {
      setError(
        "The print station is currently unavailable. Try again shortly.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ready = new Promise<string>((resolve, reject) => {
        readyRef.current = { resolve, reject };
        window.setTimeout(
          () =>
            reject(new Error("The print station did not accept the upload.")),
          10000,
        );
      });
      socket.send(
        JSON.stringify({
          type: "print:start",
          name: file.name,
          mimeType: file.type,
          size: file.size,
          options: {},
        }),
      );
      const jobId = await ready;
      setJob({
        id: jobId,
        status: "uploading",
        message: "Sending file to the print station.",
      });
      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE)
        socket.send(
          await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer(),
        );
      socket.send(JSON.stringify({ type: "print:end" }));
    } catch (submitError) {
      setBusy(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit the file.",
      );
    }
  }

  const finished = job?.status === "printed";
  const failed = job?.status === "failed";
  return (
    <main className="guest-page">
      <div className="guest-brand">
        <div className="guest-logo">
          <Printer size={22} />
        </div>
        <div>
          <strong>
            print<span>bridge</span>
          </strong>
          <small>QUICK PRINT</small>
        </div>
      </div>
      <section className="guest-card">
        <div className="guest-tag">
          <span /> CROSS-NETWORK PRINT STATION
        </div>
        <h1>
          Send it to
          <br />
          <em>the printer.</em>
        </h1>
        <p className="guest-intro">
          Choose a PDF or JPG/PNG image. It will be streamed directly to the
          host&apos;s connected printer.
        </p>
        {job ? (
          <div
            className={`result-card ${finished ? "success" : failed ? "failure" : ""}`}>
            <div className="result-icon">
              {finished ? (
                <CheckCircle2 />
              ) : failed ? (
                <AlertCircle />
              ) : (
                <Printer />
              )}
            </div>
            <strong>
              {finished
                ? "Print job sent"
                : failed
                  ? "Could not print"
                  : job.status === "received"
                    ? "File received"
                    : "Sending your file"}
            </strong>
            <p>{job.message || "Keep this page open for updates."}</p>
            {(finished || failed) && (
              <button
                className="secondary-btn"
                onClick={() => {
                  setFile(null);
                  setJob(null);
                  setError("");
                }}>
                Send another file
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label
              className={`upload-box ${drag ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDrag(false);
                choose(event.dataTransfer.files[0]);
              }}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={(event) => choose(event.target.files?.[0])}
              />
              <div className="upload-icon">
                {file ? (
                  file.type === "application/pdf" ? (
                    <FileText />
                  ) : (
                    <ImageIcon />
                  )
                ) : (
                  <FileUp />
                )}
              </div>
              <strong>{file ? file.name : "Choose a file to print"}</strong>
              <span>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to send`
                  : "PDF or JPG/PNG · Max 25 MB"}
              </span>
              <span className="browse-link">
                {file ? "Choose a different file" : "Browse files"}
              </span>
            </label>
            {error && (
              <div className="guest-error">
                <AlertCircle size={15} />
                {error}
              </div>
            )}
            {!error && available === false && (
              <div className="guest-error">
                <AlertCircle size={15} />
                The print station is offline. Uploads are unavailable right now.
              </div>
            )}
            <div className="guest-safe">
              <ShieldCheck size={17} />
              <span>
                Your file is streamed to this station and is not stored by the
                relay.
              </span>
            </div>
            <button
              className="print-submit"
              type="submit"
              disabled={!file || busy || available !== true}>
              {busy ? (
                "Sending file…"
              ) : (
                <>
                  <Printer size={18} /> Send to printer
                </>
              )}
            </button>
          </form>
        )}
        <div className="guest-foot">
          <ShieldCheck size={14} /> Your file is sent only to this print
          station.
        </div>
      </section>
      <p className="guest-bottom">No account. No app download. Just print.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GuestApp />
  </React.StrictMode>,
);
