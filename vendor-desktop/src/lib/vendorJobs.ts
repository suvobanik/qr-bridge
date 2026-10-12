import { supabase } from "./supabase";

type PrintJob = {
  id: string;
  vendor_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  status: string;
  created_at: string;
  result_message: string | null;
  error_message: string | null;
  print_settings: Record<string, unknown>;
};

export type VendorQueueJob = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  message: string;
  previewUrl?: string;
};

type JobResult = {
  jobId: string;
  success: boolean;
  status: string;
  message: string;
};

export function connectVendorJobs(
  vendorId: string,
  onStatus: (connected: boolean) => void,
  onJobs: (jobs: VendorQueueJob[]) => void,
) {
  if (!supabase) {
    onJobs([]);
    return () => {};
  }

  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  const processing = new Set<string>();
  const previewUrls = new Map<string, string>();
  let latestJobs: PrintJob[] = [];
  const channel = supabase.channel(`vendor-print-jobs-${vendorId}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "print_jobs",
      filter: `vendor_id=eq.${vendorId}`,
    },
    () => void recover(),
  );

  function setRealtimeStatus(connected: boolean) {
    onStatus(connected);
    if (connected) {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    } else if (!pollTimer) {
      pollTimer = setInterval(() => void recover(), 60_000);
    }
  }

  async function updateJob(id: string, values: Record<string, unknown>) {
    const { error } = await supabase!
      .from("print_jobs")
      .update(values)
      .eq("id", id);
    return error;
  }

  function emitJobs(jobs: PrintJob[]) {
    const currentIds = new Set(jobs.map((job) => job.id));
    for (const [id, url] of previewUrls) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(url);
        previewUrls.delete(id);
      }
    }
    onJobs(
      jobs.map((job) => ({
        id: job.id,
        originalName: job.original_name,
        mimeType: job.mime_type,
        size: job.file_size,
        status: job.status,
        createdAt: job.created_at,
        message:
          job.result_message ||
          job.error_message ||
          (job.status === "pending" ? "Waiting for host approval" : ""),
        previewUrl: previewUrls.get(job.id),
      })),
    );
  }

  async function finishJob(result: JobResult) {
    const values = result.success
      ? {
          status: "printed",
          result_message: result.message,
          error_message: null,
        }
      : result.status === "rejected"
        ? {
            status: "rejected",
            result_message: result.message,
            error_message: null,
          }
        : {
            status: "failed",
            error_message: result.message,
          };
    const updateError = await updateJob(result.jobId, values);
    if (updateError) {
      processing.delete(result.jobId);
      return;
    }
    if (result.success) {
      const { data: job } = await supabase!
        .from("print_jobs")
        .select("storage_path")
        .eq("id", result.jobId)
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (job?.storage_path) {
        await supabase!.storage.from("print-jobs").remove([job.storage_path]);
      }
    }
    processing.delete(result.jobId);
  }

  const unsubscribeRelayResult = window.printHost.onRelayResult(
    (result: JobResult) => {
      if (processing.has(result.jobId)) void finishJob(result);
    },
  );

  async function process(job: PrintJob) {
    if (stopped || processing.has(job.id)) return;
    processing.add(job.id);
    try {
      const { data: claimed, error: claimError } = await supabase!
        .from("print_jobs")
        .update({ status: "queued", error_message: null })
        .eq("id", job.id)
        .eq("vendor_id", vendorId)
        .in("status", ["pending", "queued"])
        .select("*")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        processing.delete(job.id);
        return;
      }

      const { data: file, error: downloadError } = await supabase!.storage
        .from("print-jobs")
        .download(job.storage_path);
      if (downloadError) throw downloadError;
      if (file.size !== job.file_size)
        throw new Error("Uploaded file is incomplete.");

      const existingPreview = previewUrls.get(job.id);
      if (existingPreview) URL.revokeObjectURL(existingPreview);
      previewUrls.set(job.id, URL.createObjectURL(file));
      emitJobs(latestJobs);

      await window.printHost.queueCloudJob(
        {
          jobId: job.id,
          name: job.original_name,
          mimeType: job.mime_type,
          size: file.size,
          options: job.print_settings,
        },
        await file.arrayBuffer(),
        job.status === "queued",
      );
    } catch (error) {
      await updateJob(job.id, {
        status: "failed",
        error_message:
          error instanceof Error
            ? error.message
            : "Could not prepare the file.",
      });
      processing.delete(job.id);
    }
  }

  async function recover() {
    if (stopped) return;
    const { data, error } = await supabase!
      .from("print_jobs")
      .select(
        "id,vendor_id,storage_path,original_name,mime_type,file_size,print_settings,status,created_at,result_message,error_message",
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: true });
    if (error) return;
    const jobs = (data || []) as PrintJob[];
    latestJobs = jobs;
    emitJobs(jobs);
    for (const job of jobs) {
      if (["pending", "queued"].includes(job.status)) void process(job);
    }
  }

  channel.subscribe((status) => {
    const connected = status === "SUBSCRIBED";
    setRealtimeStatus(connected);
    if (connected) void recover();
  });
  void recover();

  return () => {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
    void supabase!.removeChannel(channel);
    unsubscribeRelayResult();
    for (const url of previewUrls.values()) URL.revokeObjectURL(url);
    previewUrls.clear();
    onStatus(false);
    processing.clear();
  };
}
