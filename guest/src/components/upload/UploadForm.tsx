import { useState } from "react";
import type { SyntheticEvent } from "react";
import {
  AlertCircle,
  FileUp,
  FileText,
  Image as ImageIcon,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

interface UploadFormProps {
  file: File | null;
  busy: boolean;
  available: boolean | null;
  error: string;
  onChoose: (file?: File) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onOpenConfig?: () => void;
}

export function UploadForm({
  file,
  busy,
  available,
  error,
  onChoose,
  onSubmit,
  onOpenConfig,
}: UploadFormProps) {
  const [drag, setDrag] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      {/* Drop / Selection Area */}
      <label
        className={`flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-3 py-3.5 text-center transition-all duration-150 ${drag
            ? "border-[#0a9b7d] bg-[#f0fbf7]"
            : "border-[#b8c9cb] bg-[#fcfdfd] hover:bg-[#f6faf8]"
          }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          onChoose(event.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(event) => onChoose(event.target.files?.[0])}
        />

        <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#dcf5ec] text-[#07866b]">
          {file ? (
            file.type === "application/pdf" ? (
              <FileText className="h-4.5 w-4.5" />
            ) : (
              <ImageIcon className="h-4.5 w-4.5" />
            )
          ) : (
            <FileUp className="h-4.5 w-4.5" />
          )}
        </div>

        <strong className="max-w-full text-[13px] font-bold text-[#14232c] [overflow-wrap:anywhere]">
          {file ? file.name : "Choose a file to print"}
        </strong>

        <span className="mt-0.5 text-[10.5px] text-[#71828a]">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to send`
            : "PDF, JPG, PNG · Max 25 MB"}
        </span>

        <span className="mt-1.5 text-[11px] font-semibold text-[#07866b]">
          {file ? "Choose a different file" : "Browse files"}
        </span>
      </label>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-[#fdeeed] p-2.5 text-[11px] text-[#c0392b]">
          <AlertCircle size={15} className="shrink-0 text-[#c0392b]" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {/* Offline state */}
      {!error && available === false && (
        <div className="flex items-center gap-2 rounded-xl bg-[#fdeeed] p-2.5 text-[11px] text-[#c0392b]">
          <AlertCircle size={15} className="shrink-0 text-[#c0392b]" />
          <span className="leading-tight">
            This print station is not configured correctly.
          </span>
        </div>
      )}

      {/* Privacy Banner */}
      <div className="flex items-center gap-2 rounded-xl bg-[#eef7f3] px-3 py-2 text-[10.5px] text-[#476357]">
        <ShieldCheck size={15} className="shrink-0 text-[#07866b]" />
        <span>Your file is stored privately until the job finishes.</span>
      </div>

      {/* Action Row: Send Button + Square Config Button */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-0 bg-[#07866b] text-xs font-bold text-white shadow-[0_2px_8px_#07866b26] transition-colors hover:bg-[#06725b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!file || busy || available !== true}
        >
          {busy ? (
            "Sending file…"
          ) : (
            <>
              <Printer size={16} />
              Send to printer
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Print settings and configuration"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d3deda] bg-white text-[#476357] shadow-xs transition-colors hover:bg-[#f3f8f6] hover:text-[#07866b] active:scale-[0.97]"
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
    </form>
  );
}