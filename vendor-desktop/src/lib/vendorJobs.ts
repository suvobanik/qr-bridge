import { supabase } from "./supabase";

type PrintJob = {
  id: string;
  vendor_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  status: string;
};

type JobResult = {
  jobId: string;
  success: boolean;
  status: string;
  message: string;
};

const CHUNK_SIZE = 256 * 1024;

export function connectVendorJobs(
  vendorId: string,
  onStatus: (connected: boolean) => void,
) {
  if (!supabase) return () => {};

  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  const processing = new Set<string>();
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
        .maybeSingle();
      if (job?.storage_path) {
        await supabase!.storage.from("print-jobs").remove([job.storage_path]);
      }
    }
    processing.delete(result.jobId);
  }

  window.printHost.onRelayResult((result: JobResult) => {
    if (processing.has(result.jobId)) void finishJob(result);
  });

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

      await window.printHost.relayStart({
        jobId: job.id,
        name: job.original_name,
        mimeType: job.mime_type,
        size: file.size,
        options: {},
      });
      const buffer = await file.arrayBuffer();
      for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
        await window.printHost.relayChunk(
          job.id,
          buffer.slice(
            offset,
            Math.min(offset + CHUNK_SIZE, buffer.byteLength),
          ),
        );
      }
      await window.printHost.relayEnd(job.id);
    } catch (error) {
      const updateError = await updateJob(job.id, {
        status: "failed",
        error_message:
          error instanceof Error
            ? error.message
            : "Could not prepare the file.",
      });
      if (!updateError) window.printHost.relayCancel(job.id);
      processing.delete(job.id);
    }
  }

  async function recover() {
    if (stopped) return;
    const { data, error } = await supabase!
      .from("print_jobs")
      .select(
        "id,vendor_id,storage_path,original_name,mime_type,file_size,status",
      )
      .eq("vendor_id", vendorId)
      .in("status", ["pending", "queued"])
      .order("created_at", { ascending: true });
    if (error) return;
    for (const job of (data || []) as PrintJob[]) void process(job);
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
    onStatus(false);
    for (const jobId of processing) window.printHost.relayCancel(jobId);
    processing.clear();
  };
}
