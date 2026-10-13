import { SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { X, CircleHelp } from "lucide-react";

// qrcode does not ship TypeScript declarations in this project.
// @ts-expect-error — the package is used through its JavaScript API.
import QRCode from "qrcode";

import { connectVendorJobs, type VendorQueueJob } from "../lib/vendorJobs";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

import { AuthScreen } from "./AuthScreen";
import { JobsPanel } from "./JobsPanel";
import { LoadingScreen } from "./LoadingScreen";
import { PreviewDialog } from "./PreviewDialog";
import { QrPanel } from "./QrPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StationHeader } from "./StationHeader";
import type { Job, State } from "./types";
import { WelcomeBanner } from "./WelcomeBanner";

type VendorProfile = {
  prop_name: string;
  shop_name: string;
  address: string;
  offer: string;
};

const EMPTY_PROFILE: VendorProfile = {
  prop_name: "",
  shop_name: "",
  address: "",
  offer: "",
};

const PROFILE_FIELDS: {
  key: keyof VendorProfile;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  {
    key: "prop_name",
    label: "Proprietor Name",
    placeholder: "Enter proprietor name",
  },
  {
    key: "shop_name",
    label: "Shop Name",
    placeholder: "Enter shop name",
  },
  {
    key: "address",
    label: "Shop Address",
    placeholder: "Enter your complete shop address",
    multiline: true,
  },
  {
    key: "offer",
    label: "Offers for Customers",
    placeholder: "e.g. 10% off on printing, student discounts...",
    multiline: true,
  },
];

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

  // Vendor profile
  const [profile, setProfile] = useState<VendorProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const cloudJobsRef = useRef<VendorQueueJob[]>([]);
  const cloudJobIdsRef = useRef(new Set<string>());
  const refreshInFlightRef = useRef(false);

  function mergeJobs(localJobs: Job[], cloudJobs = cloudJobsRef.current) {
    const merged = new Map(
      localJobs
        .filter((job) => !cloudJobIdsRef.current.has(job.id))
        .map((job) => [job.id, job]),
    );

    for (const job of cloudJobs) {
      merged.set(job.id, job);
    }

    return Array.from(merged.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }

  // Connect to the vendor's cloud print queue.
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
        current
          ? {
              ...current,
              jobs: mergeJobs(current.jobs, jobs),
            }
          : current,
      );
    });
  }, [session?.user.id]);

  // Restore the authentication session.
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

  // Load the saved vendor profile, including the customer offer.
  useEffect(() => {
    let alive = true;

    setProfile(EMPTY_PROFILE);
    setProfileLoading(true);

    async function loadProfile() {
      if (!session?.user.id || !supabase) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("vendor_profiles")
          .select("prop_name, shop_name, address, offer")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!alive) return;

        setProfile({
          prop_name: data?.prop_name ?? "",
          shop_name: data?.shop_name ?? "",
          address: data?.address ?? "",
          offer: data?.offer ?? "",
        });
      } catch (error) {
        if (!alive) return;

        setNotice(
          error instanceof Error
            ? `Could not load vendor profile: ${error.message}`
            : "Could not load vendor profile.",
        );
      } finally {
        if (alive) setProfileLoading(false);
      }
    }

    void loadProfile();

    return () => {
      alive = false;
    };
  }, [session?.user.id]);

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
            data: {
              display_name: authName.trim() || "Print Vendor",
            },
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

    if (error) {
      setNotice(error.message);
    } else {
      setNotice("You have been logged out.");
    }
  }

  // Save vendor details and the offer to Supabase.
  async function saveProfile(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !supabase || profileSaving) return;

    setProfileSaving(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("vendor_profiles")
        .update({
          prop_name: profile.prop_name.trim() || null,
          shop_name: profile.shop_name.trim() || null,
          address: profile.address.trim() || null,
          offer: profile.offer.trim() || null,
        })
        .eq("id", session.user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "No vendor profile was updated. Check that your vendor_profiles row exists and your Supabase policies allow the update.",
        );
      }

      setNotice("Shop profile and offer saved successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Could not save profile: ${error.message}`
          : "Could not save profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // Prepare the permanent guest URL and QR code.
  async function refresh() {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;

    try {
      const next = await window.printHost.getState();
      next.jobs = mergeJobs(next.jobs);

      const baseUrl = import.meta.env.VITE_GUEST_BASE_URL as string | undefined;

      const { data: vendorProfile, error: profileError } =
        session && supabase
          ? await supabase
              .from("vendor_profiles")
              .select("slug")
              .eq("id", session.user.id)
              .maybeSingle()
          : { data: null, error: null };

      if (profileError) throw profileError;

      let guestUrl = "";

      if (vendorProfile?.slug && baseUrl) {
        const guestBase = new URL(baseUrl);

        if (/\.html$/i.test(guestBase.pathname)) {
          guestBase.searchParams.set("slug", vendorProfile.slug);
        } else {
          const basePath = guestBase.pathname.replace(/\/$/, "");

          guestBase.pathname = `${basePath}/v/${encodeURIComponent(
            vendorProfile.slug,
          )}`;
        }

        guestUrl = guestBase.toString();
      }

      if (guestUrl) {
        setState({ ...next, guestUrl });

        setQr(
          await QRCode.toDataURL(guestUrl, {
            width: 320,
            margin: 2,
            color: {
              dark: "#101828",
              light: "#ffffff",
            },
          }),
        );
      } else {
        setState({ ...next, guestUrl: "" });
        setQr("");
        setNotice("");
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

  // Refresh printer state and listen for local changes.
  useEffect(() => {
    void refresh();

    const unsubscribe = window.printHost.onChange(() => void refresh());

    const timer = setInterval(() => void refresh(), 2500);

    return () => {
      clearInterval(timer);
      unsubscribe?.();
    };
  }, [session?.user.id]);

  const pending = useMemo(
    () => state?.jobs.filter((job) => job.status === "pending").length || 0,
    [state],
  );

  const done = useMemo(
    () =>
      state?.jobs.filter((job) => ["printed", "rejected"].includes(job.status))
        .length || 0,
    [state],
  );

  if (authLoading) {
    return (
      <LoadingScreen
        title="Restoring your session…"
        message="Checking whether you are already signed in."
      />
    );
  }

  if (!session) {
    return (
      <AuthScreen
        authMode={authMode}
        authSubmitting={authSubmitting}
        authError={authError}
        authNotice={authNotice}
        authEmail={authEmail}
        authPassword={authPassword}
        authName={authName}
        isSupabaseConfigured={isSupabaseConfigured}
        onSubmit={submitAuth}
        onAuthModeChange={() => {
          setAuthMode(authMode === "login" ? "signup" : "login");
          setAuthError("");
          setAuthNotice("");
        }}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onNameChange={setAuthName}
      />
    );
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

  if (loading || !state) {
    return (
      <LoadingScreen
        title="Starting your print station…"
        message="Checking your local printer and preparing the QR session."
      />
    );
  }

  return (
    <div className="min-h-screen">
      <StationHeader
        session={session}
        cloudJobsConnected={cloudJobsConnected}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-[1120px] px-0 pb-[25px] pt-[39px] max-[1150px]:mx-7">
        <WelcomeBanner
          profile={profile}
          profileLoading={profileLoading}
          profileSaving={profileSaving}
          onProfileChange={(nextProfile) =>
            setProfile((current) => ({ ...current, ...nextProfile }))
          }
          onSaveProfile={saveProfile}
        />

        {/* Printer QR and settings */}
        <section className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
          <QrPanel state={state} qr={qr} onCopyUrl={copyUrl} />

          <SettingsPanel
            state={state}
            pending={pending}
            done={done}
            onToggleAuto={() =>
              window.printHost.setAutoApprove(!state.autoApprove).then(refresh)
            }
            onRefreshPrinters={() =>
              window.printHost.refreshPrinters().then(refresh)
            }
          />
        </section>

        {/* Print jobs */}
        <JobsPanel
          jobs={state.jobs}
          done={done}
          onClearCompleted={clearCompleted}
          onPreview={setPreviewJob}
        />

        <footer className="flex items-center justify-between px-[3px] pt-[22px] text-[10px] text-[#98a1ad]">
          <span>Made for quick, local printing.</span>

          <span className="flex items-center gap-1.5">
            <CircleHelp size={14} />
            Keep this app open while guests print.
          </span>
        </footer>
      </main>

      {/* Dismissible notification */}
      {notice && (
        <button
          className="fixed bottom-[22px] right-6 flex max-w-[420px] items-center gap-3.5 rounded-[11px] border border-[#d8e9e3] bg-white px-[15px] py-[13px] text-left text-xs text-[#34594f] shadow-[0_8px_35px_#18223020]"
          onClick={() => setNotice("")}
          type="button">
          <span>{notice}</span>
          <X size={15} className="shrink-0" />
        </button>
      )}

      {/* Print job preview */}
      {previewJob && (
        <PreviewDialog job={previewJob} onClose={() => setPreviewJob(null)} />
      )}
    </div>
  );
}
