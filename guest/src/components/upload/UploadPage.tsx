import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { supabase } from "../../lib/supabase";
import { GuestBrand } from "./GuestBrand";
import { GuestPrivacyNote } from "./GuestPrivacyNote";
import { UploadForm } from "./UploadForm";
import { UploadStatus } from "./UploadStatus";
import type { Job } from "./UploadStatus";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

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
      readyRef.current?.reject(
        new Error("The print station is unavailable."),
      );
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

        if (message.type === "connected") {
          setAvailable(true);
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

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const socket = socketRef.current;

    if (!file || busy) return;

    if (
      (!useCloudJobs &&
        (!socket || socket.readyState !== WebSocket.OPEN)) ||
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
        const { data: reservation, error: reserveError } =
          await supabase!.rpc("reserve_guest_print_job", {
            p_vendor_slug: slug,
            p_original_name: file.name,
            p_mime_type: file.type,
            p_file_size: file.size,
            p_print_settings: {},
          });

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

        window.setTimeout(
          () =>
            reject(
              new Error("The print station did not accept the upload."),
            ),
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

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-3 pt-3 sm:px-[18px] sm:pt-4">
      <GuestBrand />

      <section className="w-full max-w-[440px] rounded-[20px] border border-[#e7ebf1] bg-white px-5 pb-4 pt-4 shadow-[0_8px_28px_#17203308] max-[400px]:px-4 max-[400px]:py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-extrabold tracking-[1.1px] text-[#0a9b7d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          Send PDF/file directly to the
          station&apos;s printer.
        </div>

        <h1 className="mb-2 mt-0 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-1.4px] text-[#172033] max-[400px]:text-[29px]">
          Send it to
          <br />
          <em className="not-italic text-[#079879]">the printer.</em>
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

        <GuestPrivacyNote />
      </section>

      <p className="mb-0 mt-3 text-center text-[10px] text-[#a0a9b4]">
        No account. No app download. Just print.
      </p>
    </main>
  );
}