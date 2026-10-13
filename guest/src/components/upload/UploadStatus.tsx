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

export function UploadStatus({
  job,
  onSendAnother,
}: UploadStatusProps) {
  const finished = job.status === "printed";
  const failed = job.status === "failed";

  return (
    <div
      className={`flex flex-col items-center rounded-xl px-3 py-5 text-center ${
        finished
          ? "bg-[#effbf6]"
          : failed
            ? "bg-[#fff5f3]"
            : "bg-[#f6f9fc]"
      }`}
    >
      <div
        className={`mb-3 grid h-12 w-12 place-items-center rounded-[14px] ${
          finished
            ? "bg-[#d8f7e9] text-[#07866b]"
            : failed
              ? "bg-[#ffe1dd] text-[#c14c43]"
              : "bg-[#e6f1ff] text-[#3978be]"
        }`}
      >
        {finished ? (
          <CheckCircle2 className="h-6 w-6" />
        ) : failed ? (
          <AlertCircle className="h-6 w-6" />
        ) : (
          <Printer className="h-6 w-6" />
        )}
      </div>

      <strong className="text-sm">
        {finished
          ? "Print job sent"
          : failed
            ? "Could not print"
            : job.status === "received"
              ? "File received"
              : "Sending your file"}
      </strong>

      <p className="my-2 text-[11px] leading-[1.6] text-[#758294]">
        {job.message || "Keep this page open for updates."}
      </p>

      {(finished || failed) && (
        <button
          type="button"
          className="mt-1 rounded-lg border border-[#dce5e8] bg-white px-3.5 py-2 text-[11px] font-bold text-[#3d5d53] transition-colors hover:bg-[#f3f9f6]"
          onClick={onSendAnother}
        >
          Send another file
        </button>
      )}
    </div>
  );
}