export type RelayStatus = "connecting" | "online" | "offline" | "error";

type RelayMessage = {
  type: string;
  jobId?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  message?: string;
  options?: Record<string, unknown>;
};

type VendorJob = {
  hostStart: Promise<unknown>;
  chunkQueue: Promise<void>;
  ended: boolean;
};

export function connectVendorRelay(
  accessToken: string,
  onStatus: (status: RelayStatus, message?: string) => void,
) {
  const relayUrl = import.meta.env.VITE_RELAY_URL;

  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 2000;
  const jobs = new Map<string, VendorJob>();

  function sendPrintFailure(jobId: string, error: unknown) {
    socket?.send(
      JSON.stringify({
        type: "print:result",
        jobId,
        success: false,
        message:
          error instanceof Error ? error.message : "Could not receive file.",
      }),
    );
    window.printHost.relayCancel(jobId);
    jobs.delete(jobId);
  }

  window.printHost.onRelayResult((result) => {
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !jobs.has(result.jobId)
    )
      return;
    socket.send(
      JSON.stringify({
        type: "print:result",
        jobId: result.jobId,
        success: result.success,
        message: result.message,
      }),
    );
    jobs.delete(result.jobId);
  });

  function connect() {
    if (stopped) return;

    if (!relayUrl) {
      onStatus("error", "VITE_RELAY_URL is not configured.");
      return;
    }

    onStatus("connecting");

    try {
      const url = new URL(relayUrl);
      url.searchParams.set("role", "vendor");

      socket = new WebSocket(url.toString());

      socket.onopen = () => {
        if (stopped || !socket) return;

        socket.send(
          JSON.stringify({
            type: "vendor:auth",
            accessToken,
          }),
        );
      };

      socket.onmessage = async (event) => {
        if (typeof event.data !== "string") {
          let jobId = "";
          try {
            const frame = new Uint8Array(
              event.data instanceof Blob
                ? await event.data.arrayBuffer()
                : (event.data as ArrayBuffer),
            );
            const idLength = frame[0];
            jobId = new TextDecoder().decode(frame.slice(1, 1 + idLength));
            const job = jobs.get(jobId);
            if (!job || job.ended || frame.length <= 1 + idLength) {
              sendPrintFailure(
                jobId,
                new Error("Unknown or completed print transfer."),
              );
              return;
            }
            const chunk = frame.slice(1 + idLength).buffer;
            job.chunkQueue = job.chunkQueue
              .then(() => job.hostStart)
              .then(() => window.printHost.relayChunk(jobId, chunk));
            await job.chunkQueue;
          } catch (error) {
            if (jobId) sendPrintFailure(jobId, error);
            onStatus(
              "error",
              error instanceof Error
                ? error.message
                : "Could not receive file.",
            );
          }
          return;
        }
        try {
          const message = JSON.parse(event.data) as RelayMessage;

          if (message.type === "vendor:ready") {
            retryDelay = 2000;
            onStatus("online");
          }

          if (message.type === "error") {
            onStatus("error", message.message);
          }

          if (
            message.type === "print:start" &&
            message.jobId &&
            message.name &&
            message.mimeType &&
            message.size
          ) {
            const hostStart = window.printHost.relayStart({
              jobId: message.jobId,
              name: message.name,
              mimeType: message.mimeType,
              size: message.size,
              options: message.options || {},
            });
            jobs.set(message.jobId, {
              hostStart,
              chunkQueue: Promise.resolve(),
              ended: false,
            });
            hostStart.catch((error) => sendPrintFailure(message.jobId!, error));
          }

          if (
            message.type === "print:end" &&
            message.jobId &&
            jobs.has(message.jobId)
          ) {
            const job = jobs.get(message.jobId)!;
            if (job.ended) return;
            job.ended = true;
            job.chunkQueue
              .then(() => job.hostStart)
              .then(() => window.printHost.relayEnd(message.jobId!))
              .then(() =>
                socket?.send(
                  JSON.stringify({
                    type: "print:accepted",
                    jobId: message.jobId,
                  }),
                ),
              )
              .catch((error) => sendPrintFailure(message.jobId!, error));
          }

          if (message.type === "print:cancel" && message.jobId) {
            window.printHost.relayCancel(message.jobId);
            jobs.delete(message.jobId);
          }
        } catch {
          onStatus("error", "Invalid relay response.");
        }
      };

      socket.onclose = () => {
        if (stopped) return;

        for (const jobId of jobs.keys()) window.printHost.relayCancel(jobId);
        jobs.clear();

        onStatus("offline");
        reconnectTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    } catch {
      onStatus("offline");
      reconnectTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15000);
    }
  }

  connect();

  // Call this when the user logs out or the session changes.
  return () => {
    stopped = true;
    clearTimeout(reconnectTimer);
    socket?.close();
  };
}
