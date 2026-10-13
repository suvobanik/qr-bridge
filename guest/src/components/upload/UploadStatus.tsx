import { AlertCircle, CheckCircle2, Printer } from "lucide-react";

export interface Job {
  id: string;
  status: string;
  message?: string;
}

interface UploadStatusProps {
  job: Job;
  onSendAnother: () => void;
}

export function UploadStatus({ job, onSendAnother }: UploadStatusProps) {
  const finished = job.status === "printed";
  const failed = job.status === "failed";

  return (
    <div
      className={`flex flex-col items-center rounded-xl px-3 py-4 text-center transition-all ${finished
        ? "bg-[#eef8f3]"
        : failed
          ? "bg-[#fdf0ef]"
          : "bg-[#f4f7f8]"
        }`}
    >
      <div
        className={`mb-2.5 grid h-10 w-10 place-items-center rounded-xl ${finished
          ? "bg-[#d4f2e3] text-[#07866b]"
          : failed
            ? "bg-[#fbdcd9] text-[#c0392b]"
            : "bg-[#e3ecf0] text-[#2c5364]"
          }`}
      >
        {finished ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : failed ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <Printer className="h-5 w-5 animate-pulse" />
        )}
      </div>

      <strong className="text-[13px] font-bold text-[#14232c]">
        {finished
          ? "Print job sent"
          : failed
            ? "Could not print"
            : job.status === "received"
              ? "File received"
              : "Sending your file"}
      </strong>

      <p className="my-1.5 text-[10.5px] leading-relaxed text-[#687a82]">
        {job.message || "Keep this page open for updates."}
      </p>

      {(finished || failed) && (
        <button
          type="button"
          className="mt-2 rounded-lg border border-[#c8d6d2] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#07866b] shadow-xs transition-colors hover:bg-[#f6faf8]"
          onClick={onSendAnother}
        >
          Send another file
        </button>
      )}
    </div>
  );
}