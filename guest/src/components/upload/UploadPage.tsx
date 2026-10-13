import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { User, MapPin } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { GuestBrand } from "./GuestBrand";
import { UploadForm } from "./UploadForm";
import { UploadStatus } from "./UploadStatus";
import type { Job } from "./UploadStatus";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

interface VendorProfile {
  shop_name?: string | null;
  prop_name?: string | null;
  address?: string | null;
  offer?: string | null;
}

export function UploadPage() {
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
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  // Load vendor details and establish the print connection.
  useEffect(() => {
    let alive = true;

    setVendor(null);
    setVendorLoading(true);

    if (useCloudJobs) {
      if (!slug) {
        setAvailable(false);
        setError("This print station link is not configured correctly.");
        setVendorLoading(false);
        return;
      }

      supabase!
        .from("vendor_profiles")
        .select("id, shop_name, prop_name, address, offer")
        .eq("slug", slug)
        .eq("accepting_jobs", true)
        .maybeSingle()
        .then(
          ({ data, error: profileError }) => {
            if (!alive) return;

            if (profileError || !data) {
              setAvailable(false);
              setError("This print station is currently unavailable.");
              setVendorLoading(false);
              return;
            }

            setVendor({
              shop_name: data.shop_name,
              prop_name: data.prop_name,
              address: data.address,
              offer: data.offer,
            });

            setAvailable(true);
            setVendorLoading(false);
          },
          () => {
            if (!alive) return;

            setAvailable(false);
            setError("Could not load this print station. Please try again.");
            setVendorLoading(false);
          },
        );

      return () => {
        alive = false;
      };
    }

    if (!relayUrl || !slug) {
      setAvailable(false);
      setError("This print station link is not configured correctly.");
      setVendorLoading(false);
      return;
    }

    const url = new URL(relayUrl);
    url.searchParams.set("role", "customer");
    url.searchParams.set("slug", slug);

    const socket = new WebSocket(url.toString());
    socketRef.current = socket;
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      if (alive) setAvailable(true);
    };

    socket.onclose = () => {
      if (alive) {
        setAvailable(false);
        setVendorLoading(false);
      }

      readyRef.current?.reject(new Error("The print station is unavailable."));
      readyRef.current = null;
    };

    socket.onerror = () => {
      if (!alive) return;

      setAvailable(false);
      setVendorLoading(false);
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;

      try {
        const message = JSON.parse(event.data) as {
          type: string;
          jobId?: string;
          success?: boolean;
          message?: string;
          vendor?: VendorProfile;
        };

        if (message.type === "connected") {
          if (!alive) return;

          setAvailable(true);

          if (message.vendor) {
            setVendor(message.vendor);
          }

          setVendorLoading(false);
        }

        if (message.type === "print:ready" && message.jobId) {
          readyRef.current?.resolve(message.jobId);
          readyRef.current = null;
        }

        if (message.type === "print:received") {
          setJob((current) =>
            current
              ? {
                  ...current,
                  status: "received",
                  message: "File received by the print station.",
                }
              : current,
          );
        }

        if (message.type === "print:accepted") {
          setJob((current) =>
            current
              ? {
                  ...current,
                  status: "pending",
                  message: "Waiting for host approval.",
                }
              : current,
          );
        }

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
      alive = false;

      readyRef.current?.reject(new Error("Connection closed."));
      readyRef.current = null;

      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
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

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
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

      if (!socket) {
        throw new Error("The print station relay is unavailable.");
      }

      const ready = new Promise<string>((resolve, reject) => {
        readyRef.current = { resolve, reject };

        window.setTimeout(() => {
          if (readyRef.current?.resolve === resolve) {
            readyRef.current = null;

            reject(new Error("The print station did not accept the upload."));
          }
        }, 10000);
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

      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        socket.send(
          await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer(),
        );
      }

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

  function resetUpload() {
    setFile(null);
    setJob(null);
    setError("");
  }

  const shopName = vendor?.shop_name?.trim();
  const proprietor = vendor?.prop_name?.trim();
  const address = vendor?.address?.trim();
  const offer = vendor?.offer?.trim();

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f7f5ed] px-3.5 pb-4 pt-2.5 sm:px-4">
      {/* Top Navbar */}
      <GuestBrand />

      <div className="w-full max-w-[440px] space-y-3">
        {/* Vendor Station Header Info */}
        <section
          className="px-1 text-left"
          aria-label="Vendor information"
          aria-busy={vendorLoading}>
          {vendorLoading ? (
            <div className="animate-pulse space-y-2 py-0.5" aria-hidden="true">
              {/* Shop name skeleton */}
              <div className="h-6 w-44 max-w-full rounded-md bg-[#e5e7eb]" />

              {/* Proprietor and address skeletons */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-3 w-24 rounded bg-[#e5e7eb]" />
                <div className="h-3 w-36 max-w-full rounded bg-[#e5e7eb]" />
              </div>
            </div>
          ) : (
            <>
              {shopName && (
                <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-[#14232c]">
                  {shopName}
                </h2>
              )}

              {(proprietor || address) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5b6e76]">
                  {proprietor && (
                    <span className="flex items-center gap-1">
                      <User size={12} className="shrink-0 text-[#07866b]" />
                      <span>{proprietor}</span>
                    </span>
                  )}

                  {address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0 text-[#07866b]" />
                      <span>{address}</span>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Compact Upload Card */}
        <section className="rounded-2xl border border-[#e5ebe7] bg-white p-4 shadow-sm">
          <h1 className="mb-3 text-[20px] font-extrabold tracking-tight text-[#14232c]">
            Send it to the printer.
          </h1>

          {job ? (
            <UploadStatus job={job} onSendAnother={resetUpload} />
          ) : (
            <UploadForm
              file={file}
              busy={busy}
              available={available}
              error={error}
              onChoose={choose}
              onSubmit={submit}
            />
          )}
        </section>

        <hr className="border-0 border-t border-[#e8e4d8]" />

        {/* Advertisement Space */}
        <aside
          aria-label="Advertisement"
          className="flex min-h-[140px] items-center justify-center rounded-2xl border border-[#ded8c8] bg-[#ede8d8]/60 p-4 text-center transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b8577]" />
        </aside>

        {/* Customer Offers */}
        {!vendorLoading && offer && (
          <section
            aria-label="Offers for customers"
            className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-white via-orange-50/70 to-amber-100/60 p-4 shadow-sm">
            <hr className="border-0 border-t border-[#e8e4d8]" />
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                🎁
              </span>

              <div>
                <h2 className="text-sm font-extrabold tracking-tight text-[#14232c]">
                  Offers for You
                </h2>
                <p className="text-[10px] text-[#8b6b4a]">
                  Special deals from this print shop
                </p>
              </div>
            </div>

            <p className="whitespace-pre-line break-words text-xs leading-relaxed text-[#5b5147]">
              {offer}
            </p>
          </section>
        )}

        <hr className="border-0 border-t border-[#e8e4d8]" />

        {/* Advertisement Space */}
        <aside
          aria-label="Advertisement"
          className="flex min-h-[140px] items-center justify-center rounded-2xl border border-[#ded8c8] bg-[#ede8d8]/60 p-4 text-center transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b8577]" />
        </aside>
      </div>
    </main>
  );
}
