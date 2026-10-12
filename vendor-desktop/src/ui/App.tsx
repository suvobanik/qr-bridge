import { connectVendorJobs, type VendorQueueJob } from "../lib/vendorJobs";
import { SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
// qrcode does not ship TypeScript declarations in this project.
// @ts-expect-error The package API is used at runtime and is typed locally by its consumers.
import QRCode from "qrcode";
import {
  Printer,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Trash2,
  Wifi,
  Copy,
  CircleHelp,
} from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}

type Job = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  message: string;
  previewUrl?: string;
};
type State = {
  host: string;
  port: number;
  guestUrl: string;
  sessionToken: string;
  autoApprove: boolean;
  printers: string[];
  selectedPrinter: string;
  jobs: Job[];
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [qr, setQr] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  const [cloudJobsConnected, setCloudJobsConnected] = useState(false);

  const cloudJobsRef = useRef<VendorQueueJob[]>([]);
  const cloudJobIdsRef = useRef(new Set<string>());
  const refreshInFlightRef = useRef(false);

  function mergeJobs(localJobs: Job[], cloudJobs = cloudJobsRef.current) {
    const merged = new Map(
      localJobs
        .filter((job) => !cloudJobIdsRef.current.has(job.id))
        .map((job) => [job.id, job]),
    );
    for (const job of cloudJobs) merged.set(job.id, job);
    return Array.from(merged.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }

  useEffect(() => {
    if (!session?.user.id || !supabase) {
      setCloudJobsConnected(false);
      cloudJobsRef.current = [];
      cloudJobIdsRef.current = new Set();
      return;
    }
    cloudJobsRef.current = [];
    cloudJobIdsRef.current = new Set();
    return connectVendorJobs(session.user.id, setCloudJobsConnected, (jobs) => {
      cloudJobsRef.current = jobs;
      cloudJobIdsRef.current = new Set([
        ...cloudJobIdsRef.current,
        ...jobs.map((job) => job.id),
      ]);
      setState((current) =>
        current ? { ...current, jobs: mergeJobs(current.jobs, jobs) } : current,
      );
    });
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submitAuth(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { display_name: authName.trim() || "Print Vendor" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthNotice(
            "Account created. Check your email to confirm it, then log in.",
          );
          setAuthMode("login");
        } else {
          setAuthNotice("Account created successfully.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
    else setNotice("You have been logged out.");
  }

  async function refresh() {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const next = await window.printHost.getState();
      next.jobs = mergeJobs(next.jobs);
      const baseUrl = import.meta.env.VITE_GUEST_BASE_URL as string | undefined;
      const { data: profile, error: profileError } =
        session && supabase
          ? await supabase
              .from("vendor_profiles")
              .select("slug")
              .eq("id", session.user.id)
              .maybeSingle()
          : { data: null, error: null };
      if (profileError) throw profileError;
      let guestUrl = "";
      if (profile?.slug && baseUrl) {
        const guestBase = new URL(baseUrl);
        if (/\.html$/i.test(guestBase.pathname)) {
          guestBase.searchParams.set("slug", profile.slug);
        } else {
          const basePath = guestBase.pathname.replace(/\/$/, "");
          guestBase.pathname = `${basePath}/v/${encodeURIComponent(profile.slug)}`;
        }
        guestUrl = guestBase.toString();
      }
      if (guestUrl) {
        setState({ ...next, guestUrl });
        setQr(
          await QRCode.toDataURL(guestUrl, {
            width: 320,
            margin: 2,
            color: { dark: "#101828", light: "#ffffff" },
          }),
        );
      } else {
        setState({ ...next, guestUrl: "" });
        setQr("");
        setNotice(
          "Set VITE_GUEST_BASE_URL and ensure your vendor profile has a slug.",
        );
      }
    } catch (error) {
      setState((current) => (current ? { ...current, guestUrl: "" } : current));
      setQr("");
      setNotice(
        error instanceof Error
          ? `Could not prepare the guest QR: ${error.message}`
          : "Could not prepare the guest QR.",
      );
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const unsubscribe = window.printHost.onChange(() => refresh());
    const timer = setInterval(refresh, 2500);
    return () => {
      clearInterval(timer);
      unsubscribe?.();
    };
  }, [session?.user.id]);
  const pending = useMemo(
    () => state?.jobs.filter((j) => j.status === "pending").length || 0,
    [state],
  );
  const done = useMemo(
    () =>
      state?.jobs.filter((j) => ["printed", "rejected"].includes(j.status))
        .length || 0,
    [state],
  );

  if (authLoading)
    return (
      <main className="loading">
        <div className="brand-mark">
          <Printer />
        </div>
        <h2>Restoring your session…</h2>
        <p>Checking whether you are already signed in.</p>
      </main>
    );

  if (!session)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark">
              <Printer size={22} />
            </div>
            <div>
              <strong>
                print<span>bridge</span>
              </strong>
              <small>YOUR PRINT STATION</small>
            </div>
          </div>
          <div className="auth-intro">
            <div className="eyebrow">VENDOR ACCOUNT</div>
            <h1>
              {authMode === "login" ? "Welcome back." : "Set up your station."}
            </h1>
            <p>
              {authMode === "login"
                ? "Log in to manage your print station."
                : "Create an account to claim your print station."}
            </p>
          </div>
          {!isSupabaseConfigured ? (
            <div className="auth-alert error">
              <strong>Supabase is not configured yet.</strong>
              <span>
                Create a .env file from .env.example and add your Supabase
                Project URL and publishable/anon key, then restart the app.
              </span>
            </div>
          ) : null}
          {authError && <div className="auth-alert error">{authError}</div>}
          {authNotice && <div className="auth-alert success">{authNotice}</div>}
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "signup" && (
              <label>
                Display name
                <input
                  autoComplete="name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Your shop name"
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                minLength={6}
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={!isSupabaseConfigured || authSubmitting}>
              {authSubmitting
                ? "Please wait…"
                : authMode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>
          <div className="auth-switch">
            {authMode === "login"
              ? "New to Print Bridge?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthError("");
                setAuthNotice("");
              }}>
              {authMode === "login" ? "Create account" : "Log in"}
            </button>
          </div>
          <p className="auth-footnote">
            Your session stays saved on this device until you log out.
          </p>
        </section>
      </main>
    );

  async function toggleAuto() {
    if (!state) return;
    await window.printHost.setAutoApprove(!state.autoApprove);
    setNotice(
      !state.autoApprove
        ? "Auto-Approve enabled. New jobs will print without host approval."
        : "Auto-Approve disabled. New jobs require host approval.",
    );
    refresh();
  }
  async function clearCompleted() {
    if (session && supabase) {
      const { error } = await supabase
        .from("print_jobs")
        .delete()
        .eq("vendor_id", session.user.id)
        .in("status", ["printed", "rejected"]);
      if (error) {
        setNotice(`Could not clear completed jobs: ${error.message}`);
        return;
      }
    }
    await window.printHost.clearCompleted();
    await refresh();
  }
  async function copyUrl() {
    if (!state) return;
    await navigator.clipboard.writeText(state.guestUrl);
    setNotice(
      "Permanent guest link copied. It works across different networks.",
    );
  }
  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const statusLabel: Record<string, string> = {
    pending: "Needs approval",
    queued: "Queued",
    printing: "Printing",
    printed: "Submitted",
    rejected: "Rejected",
    failed: "Failed",
  };

  if (loading || !state)
    return (
      <main className="loading">
        <div className="brand-mark">
          <Printer />
        </div>
        <h2>Starting your print station…</h2>
        <p>Checking your local printer and preparing the QR session.</p>
      </main>
    );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Printer size={21} />
          </div>
          <div>
            <strong>
              print<span>bridge</span>
            </strong>
            <small>LOCAL PRINT STATION</small>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="connection-pill">
            <span className="live-dot" />
            <span>Station active</span>
            <span className="pill-divider" />
            <Wifi size={14} />
            <span>
              {cloudJobsConnected ? "Cloud jobs connected" : "Waiting for jobs"}
            </span>
          </div>
          <div
            className="account-chip"
            title={session.user.email || "Signed in"}>
            <span className="account-avatar">
              {(session.user.email || "V").slice(0, 1).toUpperCase()}
            </span>
            <span className="account-email">{session.user.email}</span>
            <button className="logout-button" onClick={signOut}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <section className="welcome">
          <div>
            <div className="eyebrow">YOUR PRINTER, READY TO SHARE</div>
            <h1>
              Print without
              <br />
              <em>the back-and-forth.</em>
            </h1>
            <p>
              Let anyone send a document to this laptop by scanning your QR
              code. No guest app needed.
            </p>
          </div>
          <div className="hero-icon">
            <Printer size={42} />
            <span className="hero-spark">✦</span>
          </div>
        </section>
        <section className="dashboard-grid">
          <article className="panel qr-panel">
            <div className="panel-heading">
              <div>
                <span className="step">01</span>
                <h2>Your print QR</h2>
              </div>
              <span className="active-tag">
                <span className="live-dot" /> LIVE
              </span>
            </div>
            <div className="qr-frame">
              {qr && <img src={qr} alt="QR code for guests to scan" />}
            </div>
            <p className="qr-instruction">
              Scan with your phone camera to upload a file
            </p>
            <div className="url-row">
              <span>{state.guestUrl}</span>
              <button
                className="icon-button"
                onClick={copyUrl}
                title="Copy guest link">
                <Copy size={15} />
              </button>
            </div>
            <div className="network-note">
              <Wifi size={16} />
              <span>
                Guests can connect from any network while this desktop app is
                online.
              </span>
            </div>
          </article>
          <article className="panel settings-panel">
            <div className="panel-heading">
              <div>
                <span className="step">02</span>
                <h2>Print settings</h2>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  window.printHost.refreshPrinters().then(refresh)
                }>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <label className="field-label" htmlFor="printer">
              CONNECTED PRINTER
            </label>
            <div className="select-wrap">
              <Printer size={17} />
              <select
                id="printer"
                value={state.selectedPrinter}
                disabled
                onChange={() => {}}>
                <option>
                  {state.selectedPrinter || "No printer detected"}
                </option>
              </select>
            </div>
            <div className="printer-hint">
              {state.selectedPrinter
                ? "Using your Windows default printer"
                : "No default printer detected. Set one in Windows Settings, then refresh."}
            </div>
            <div className={`auto-card ${state.autoApprove ? "auto-on" : ""}`}>
              <div className="auto-symbol">
                {state.autoApprove ? (
                  <ShieldCheck size={22} />
                ) : (
                  <ShieldAlert size={22} />
                )}
              </div>
              <div className="auto-copy">
                <strong>Auto-Approve</strong>
                <p>
                  {state.autoApprove
                    ? "Incoming files print automatically."
                    : "Review every job before it prints."}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={state.autoApprove}
                className={`switch ${state.autoApprove ? "on" : ""}`}
                onClick={toggleAuto}>
                <span />
              </button>
            </div>
            <div className="security-note">
              <ShieldCheck size={16} />
              <span>
                Auto-Approve only affects new jobs. Keep it off when sharing
                your QR publicly.
              </span>
            </div>
            <div className="stats-row">
              <div>
                <span className="stat-number">{state.jobs.length}</span>
                <span className="stat-label">TOTAL JOBS</span>
              </div>
              <div>
                <span className="stat-number pending-color">{pending}</span>
                <span className="stat-label">NEED APPROVAL</span>
              </div>
              <div>
                <span className="stat-number">{done}</span>
                <span className="stat-label">FINISHED</span>
              </div>
            </div>
          </article>
        </section>
        <section className="panel jobs-panel">
          <div className="panel-heading jobs-heading">
            <div>
              <span className="step">03</span>
              <h2>Print queue</h2>
              <span className="count-badge">{state.jobs.length}</span>
            </div>
            <button
              className="text-button"
              onClick={clearCompleted}
              disabled={!done}>
              <Trash2 size={14} /> Clear completed
            </button>
          </div>
          {state.jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FileText size={24} />
              </div>
              <strong>Nothing in the queue yet</strong>
              <p>
                When someone scans your QR and sends a file, it will appear
                here.
              </p>
            </div>
          ) : (
            <div className="job-list">
              {state.jobs.map((job) => (
                <div className="job-row" key={job.id}>
                  <div
                    className={`file-icon ${job.mimeType === "application/pdf" ? "pdf" : "image"}`}>
                    {job.mimeType === "application/pdf" ? (
                      <FileText size={20} />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                  </div>
                  <div className="job-info">
                    <strong title={job.originalName}>{job.originalName}</strong>
                    <span>
                      {fmtSize(job.size)} ·{" "}
                      {new Date(job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className={`job-status status-${job.status}`}>
                    <span />
                    {statusLabel[job.status] || job.status}
                  </div>
                  {job.previewUrl ? (
                    <button
                      className="preview-btn"
                      onClick={() => setPreviewJob(job)}>
                      Preview
                    </button>
                  ) : null}
                  {job.status === "pending" ? (
                    <div className="job-actions">
                      <button
                        className="approve-btn"
                        onClick={() => window.printHost.approve(job.id)}>
                        <Check size={15} /> Approve & print
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => window.printHost.reject(job.id)}
                        aria-label="Reject job">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="job-message" title={job.message}>
                      {job.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <footer>
          <span>Made for quick, local printing.</span>
          <span>
            <CircleHelp size={14} /> Keep this app open while guests print.
          </span>
        </footer>
      </main>
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
          <X size={15} />
        </button>
      )}
      {previewJob?.previewUrl && (
        <div className="preview-backdrop" onClick={() => setPreviewJob(null)}>
          <section
            className="preview-dialog"
            onClick={(event) => event.stopPropagation()}>
            <div className="preview-heading">
              <strong title={previewJob.originalName}>
                {previewJob.originalName}
              </strong>
              <button
                className="icon-button"
                onClick={() => setPreviewJob(null)}
                title="Close preview">
                <X size={16} />
              </button>
            </div>
            {previewJob.mimeType === "application/pdf" ? (
              <iframe
                className="preview-frame"
                src={previewJob.previewUrl}
                title={`Preview of ${previewJob.originalName}`}
              />
            ) : (
              <img
                className="preview-image"
                src={previewJob.previewUrl}
                alt={`Preview of ${previewJob.originalName}`}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
