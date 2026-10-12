import { X } from "lucide-react";
import type { Job } from "./types";

type PreviewDialogProps = {
  job: Job;
  onClose: () => void;
};

export function PreviewDialog({ job, onClose }: PreviewDialogProps) {
  if (!job.previewUrl) return null;

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-[#18223080] p-6"
      onClick={onClose}>
      <section
        className="flex h-[min(720px,100%)] w-[min(820px,100%)] flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_#18223040]"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-[#eff1f5] px-[18px] pl-[18px]">
          <strong
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            title={job.originalName}>
            {job.originalName}
          </strong>
          <button
            className="grid h-[27px] w-[27px] place-items-center rounded-[7px] border border-[#e8edf2] bg-white text-[#596779]"
            onClick={onClose}
            title="Close preview">
            <X size={16} />
          </button>
        </div>
        {job.mimeType === "application/pdf" ? (
          <iframe
            className="min-h-0 w-full flex-1 border-0 bg-[#f5f7fa]"
            src={job.previewUrl}
            title={`Preview of ${job.originalName}`}
          />
        ) : (
          <img
            className="min-h-0 w-full flex-1 border-0 bg-[#f5f7fa] object-contain"
            src={job.previewUrl}
            alt={`Preview of ${job.originalName}`}
          />
        )}
      </section>
    </div>
  );
}
