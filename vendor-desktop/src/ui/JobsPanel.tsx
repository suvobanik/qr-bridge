import { FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import type { Job } from "./types";

type JobsPanelProps = {
  jobs: Job[];
  done: number;
  onClearCompleted: () => void;
  onPreview: (job: Job) => void;
};

const statusLabel: Record<string, string> = {
  uploading: "Uploading",
  pending: "Uploading",
  queued: "Queued",
  printing: "Printing",
  printed: "Submitted",
  rejected: "Rejected",
  failed: "Failed",
};

const statusStyles: Record<string, string> = {
  uploading: "text-[#b67b1c] [&>span]:bg-[#e5a83f]",
  pending: "text-[#b67b1c] [&>span]:bg-[#e5a83f]",
  printed: "text-[#079879] [&>span]:bg-[#10b981]",
  failed: "text-[#cf5149] [&>span]:bg-[#e66b63]",
  rejected: "text-[#cf5149] [&>span]:bg-[#e66b63]",
  printing: "text-[#4776bd] [&>span]:bg-[#6094e2]",
  queued: "text-[#4776bd] [&>span]:bg-[#6094e2]",
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function JobsPanel({
  jobs,
  done,
  onClearCompleted,
  onPreview,
}: JobsPanelProps) {
  return (
    <section className="mt-[18px] rounded-[19px] border border-[#e7ebf1] bg-white px-[25px] pb-2 pt-[22px] shadow-[0_3px_14px_rgba(24,34,48,0.025)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-[7px] bg-[#e6f8f2] px-[7px] py-1.5 text-[10px] font-extrabold text-[#079879]">
            03
          </span>
          <h2 className="font-[Manrope,sans-serif] text-base font-extrabold tracking-[-0.3px]">
            Print queue
          </h2>
          <span className="rounded-md bg-[#f0f3f7] px-[7px] py-1 text-[10px] font-bold text-[#677587]">
            {jobs.length}
          </span>
        </div>

        <button
          className="flex items-center gap-1.5 border-0 bg-transparent p-[7px] text-[11px] font-semibold text-[#687587] disabled:cursor-default disabled:opacity-40"
          onClick={onClearCompleted}
          disabled={!done}>
          <Trash2 size={14} /> Clear completed
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="py-7 pb-[35px] text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[15px] bg-[#f0f8f5] text-[#0b9b7e]">
            <FileText size={24} />
          </div>
          <strong className="text-xs">Nothing in the queue yet</strong>
          <p className="mt-1.5 text-[11px] text-[#8490a0]">
            When someone scans your QR and sends a file, it will appear here.
          </p>
        </div>
      ) : (
        <div>
          {jobs.map((job) => (
            <div
              className="flex min-h-[69px] items-center gap-3 border-t border-[#eff1f5]"
              key={job.id}>
              <div
                className={`grid h-[39px] w-[39px] shrink-0 place-items-center rounded-[11px] ${
                  job.mimeType === "application/pdf"
                    ? "bg-[#fff0ed] text-[#d75b4c]"
                    : "bg-[#eaf3ff] text-[#3c7ec4]"
                }`}>
                {job.mimeType === "application/pdf" ? (
                  <FileText size={20} />
                ) : (
                  <ImageIcon size={20} />
                )}
              </div>

              <div className="flex min-w-[150px] flex-1 flex-col gap-[5px]">
                <strong
                  className="max-w-[310px] overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                  title={job.originalName}>
                  {job.originalName}
                </strong>

                <span className="text-[10px] text-[#8b95a2]">
                  {formatSize(job.size)} ·{" "}
                  {new Date(job.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold ${
                  statusStyles[job.status] ||
                  "text-[#9ba5b2] [&>span]:bg-[#9ba5b2]"
                }`}>
                <span className="h-1.5 w-1.5 rounded-full" />
                {statusLabel[job.status] || job.status}
              </div>

              {job.previewUrl ? (
                <button
                  className="whitespace-nowrap rounded-lg border border-[#d9e6e2] bg-[#f7fbfa] px-2.5 py-2 text-[10px] font-bold text-[#2e7565]"
                  onClick={() => onPreview(job)}>
                  Preview
                </button>
              ) : null}

              <div
                className="max-w-[230px] overflow-hidden text-ellipsis whitespace-nowrap text-right text-[10px] text-[#8b95a2]"
                title={job.message}>
                {job.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
