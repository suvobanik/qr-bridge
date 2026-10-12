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
  QrCode,
  Upload,
  PackageCheck,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./ui/guest.css";

interface Job {
  id: string;
  status: string;
  message?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="landing-brand" href="/" aria-label="Espresso Print home">
          <span className="landing-brand-mark">
            <Printer size={18} />
          </span>
          <span>
            espresso <strong>print</strong>
          </span>
        </a>
        <a className="landing-nav-link" href="#how-it-works">
          How it works
        </a>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">
            <span /> SIMPLE PRINTING, WHEREVER YOU ARE
          </p>
          <h1>Your documents. Printed in minutes.</h1>
          <p className="landing-intro">
            Scan a print shop&apos;s QR code, upload your file from your phone,
            and collect your pages when they&apos;re ready. No app or account
            required.
          </p>
          <a className="landing-cta" href="#how-it-works">
            See how it works <span aria-hidden="true">→</span>
          </a>
          <p className="landing-note">
            At a print shop? Scan its QR code to get started.
          </p>
        </div>
        <div className="landing-visual" aria-hidden="true">
          <div className="paper-sheet paper-back" />
          <div className="paper-sheet paper-front">
            <div className="paper-topline" />
            <div className="paper-title" />
            <div className="paper-line paper-line-wide" />
            <div className="paper-line" />
            <div className="paper-line paper-line-short" />
            <div className="paper-qr">
              <QrCode size={82} strokeWidth={1.25} />
            </div>
            <span className="paper-stamp">READY TO PRINT</span>
          </div>
          <div className="landing-visual-label">
            <Printer size={15} />
            <span>Print shop ready</span>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <p className="landing-eyebrow">HOW IT WORKS</p>
          <h2>Three easy steps.</h2>
        </div>
        <div className="steps-grid">
          <article className="step-item">
            <div className="step-icon">
              <QrCode size={21} />
            </div>
            <span className="step-number">01</span>
            <h3>Scan QR</h3>
            <p>Find the Espresso Print code at your local print shop.</p>
          </article>
          <article className="step-item">
            <div className="step-icon">
              <Upload size={21} />
            </div>
            <span className="step-number">02</span>
            <h3>Upload file</h3>
            <p>Choose a PDF or image right from your phone.</p>
          </article>
          <article className="step-item">
            <div className="step-icon">
              <PackageCheck size={21} />
            </div>
            <span className="step-number">03</span>
            <h3>Collect prints</h3>
            <p>Pick up your pages when the shop has finished printing.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <span>
          espresso <strong>print</strong>
        </span>
        <span>Simple printing for real life.</span>
      </footer>
    </main>
  );
}

function UploadPage() {
  const routeParts = window.location.pathname.split("/").filter(Boolean);
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  const slug =
    querySlug ||
    (routeParts[0] === "v"
      ? routeParts[1] || ""
      : routeParts[routeParts.length - 1] || "");
  const useCloudJobs = Boolean(supabase);
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
    if (useCloudJobs) {
      if (!slug) {
        setAvailable(false);
        setError("This print station link is not configured correctly.");
        return;
      }
      supabase!
        .from("vendor_profiles")
        .select("id")
        .eq("slug", slug)
        .eq("accepting_jobs", true)
        .maybeSingle()
        .then(({ data, error: profileError }) => {
          if (profileError || !data) {
            setAvailable(false);
            setError("This print station is currently unavailable.");
            return;
          }
          setAvailable(true);
        });
      return;
    }
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
  }, [relayUrl, slug, useCloudJobs]);

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
    if (
      (!useCloudJobs && (!socket || socket.readyState !== WebSocket.OPEN)) ||
      available !== true
    ) {
      setError(
        "The print station is currently unavailable. Try again shortly.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (useCloudJobs) {
        const { data: reservation, error: reserveError } = await supabase!.rpc(
          "reserve_guest_print_job",
          {
            p_vendor_slug: slug,
            p_original_name: file.name,
            p_mime_type: file.type,
            p_file_size: file.size,
            p_print_settings: {},
          },
        );
        if (reserveError) throw reserveError;
        const reserved = Array.isArray(reservation)
          ? reservation[0]
          : reservation;
        if (!reserved?.job_id || !reserved.storage_path) {
          throw new Error("The print station returned an invalid job.");
        }
        setJob({
          id: reserved.job_id,
          status: "uploading",
          message: "Uploading your file securely.",
        });
        const { error: uploadError } = await supabase!.storage
          .from("print-jobs")
          .upload(reserved.storage_path, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { error: completeError } = await supabase!.rpc(
          "complete_guest_print_job",
          { p_job_id: reserved.job_id },
        );
        if (completeError) throw completeError;
        setBusy(false);
        setJob({
          id: reserved.job_id,
          status: "pending",
          message: "File received. Waiting for the print station.",
        });
        return;
      }
      if (!socket) throw new Error("The print station relay is unavailable.");
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
                Your file is stored privately until the print station finishes
                the job.
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

function GuestApp() {
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  if (window.location.pathname === "/" && !querySlug) return <LandingPage />;
  return <UploadPage />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GuestApp />
  </React.StrictMode>,
);
