import { useState } from "react";
import type { SyntheticEvent } from "react";
import {
  AlertCircle,
  FileUp,
  FileText,
  Image as ImageIcon,
  Printer,
  ShieldCheck,
} from "lucide-react";

interface UploadFormProps {
  file: File | null;
  busy: boolean;
  available: boolean | null;
  error: string;
  onChoose: (file?: File) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}

export function UploadForm({
  file,
  busy,
  available,
  error,
  onChoose,
  onSubmit,
}: UploadFormProps) {
  const [drag, setDrag] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <label
        className={`flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed px-3 py-4 text-center transition-colors duration-150 ${
          drag
            ? "border-[#0a9b7d] bg-[#effbf6]"
            : "border-[#cbd6e1] bg-[#f9fbfc]"
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

        <div className="mb-2.5 grid h-10 w-10 place-items-center rounded-xl bg-[#e3f8f0] text-[#0a9b7d]">
          {file ? (
            file.type === "application/pdf" ? (
              <FileText className="h-5 w-5" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )
          ) : (
            <FileUp className="h-5 w-5" />
          )}
        </div>

        <strong className="max-w-full text-xs [overflow-wrap:anywhere]">
          {file ? file.name : "Choose a file to print"}
        </strong>

        <span className="mt-1 text-[10px] text-[#8793a2]">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to send`
            : "PDF or JPG/PNG · Max 25 MB"}
        </span>

        <span className="mt-2.5 text-[11px] font-bold text-[#079879]">
          {file ? "Choose a different file" : "Browse files"}
        </span>
      </label>

      {error && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-[#fff1f0] p-2.5 text-[10px] text-[#b7423a]">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && available === false && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-[#fff1f0] p-2.5 text-[10px] text-[#b7423a]">
          <AlertCircle size={15} className="shrink-0" />
          <span>
            The print station is offline. Uploads are unavailable right now.
          </span>
        </div>
      )}

      <div className="my-3 flex items-start gap-2 rounded-[10px] bg-[#f3f9f6] px-2.5 py-2.5 text-[10px] leading-[1.5] text-[#647668]">
        <ShieldCheck
          size={16}
          className="mt-px shrink-0 text-[#0a9b7d]"
        />
        <span>
          Your file is stored privately until the print station finishes the
          job.
        </span>
      </div>

      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border-0 bg-[#079879] text-xs font-bold text-white shadow-[0_4px_10px_#07987922] transition-colors hover:bg-[#07866b] disabled:cursor-not-allowed disabled:opacity-[0.45]"
        disabled={!file || busy || available !== true}
      >
        {busy ? (
          "Sending file…"
        ) : (
          <>
            <Printer size={17} />
            Send to printer
          </>
        )}
      </button>
    </form>
  );
}