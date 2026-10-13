import { useState } from "react";
import { Copy, Printer } from "lucide-react";
import type { State } from "./types";

type QrPanelProps = {
  state: State;
  qr: string;
  onCopyUrl: () => void;
};

export function QrPanel({ state, qr, onCopyUrl }: QrPanelProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrintQR = async () => {
    if (!qr || printing) return;

    setPrinting(true);

    try {
      await window.printHost.openQrPreview(qr, state.guestUrl);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? `Could not open printing: ${error.message}`
          : "Could not open printing.",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <article className="rounded-[19px] border border-[#e7ebf1] bg-white p-[23px_25px] shadow-[0_3px_14px_rgba(24,34,48,0.025)]">
      <div className="mb-[22px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-[7px] bg-[#e6f8f2] px-[7px] py-1.5 text-[10px] font-extrabold text-[#079879]">
            01
          </span>
          <h2 className="font-[Manrope,sans-serif] text-base font-extrabold tracking-[-0.3px]">
            Your print QR
          </h2>
        </div>

        <span className="flex items-center gap-2 text-[10px] font-extrabold tracking-[1px] text-[#079879]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_0_3px_#e2f8ef]" />
          LIVE
        </span>
      </div>

      <div className="mx-auto h-[210px] w-[210px] rounded-[15px] border border-[#e8edf2] bg-white p-3">
        {qr && (
          <img
            className="h-full w-full"
            src={qr}
            alt="QR code for guests to scan"
          />
        )}
      </div>

      <p className="my-[13px] mb-4 text-center text-xs text-[#647184]">
        Scan with your phone camera to upload a file
      </p>

      <div className="flex h-[38px] items-center gap-1.5 rounded-[9px] border border-[#e8edf2] bg-[#f7f9fb] py-0 pl-[11px] pr-[7px]">
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#687587]">
          {state.guestUrl}
        </span>

        <button
          type="button"
          className="grid h-[27px] w-[27px] place-items-center rounded-[7px] border border-[#e8edf2] bg-white text-[#596779]"
          onClick={onCopyUrl}
          title="Copy guest link">
          <Copy size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={handlePrintQR}
        disabled={!qr || printing}
        className="mt-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border-0 bg-[#0a9b7d] text-sm font-bold text-white transition hover:bg-[#087f67] disabled:cursor-not-allowed disabled:opacity-60">
        <Printer size={16} />
        {printing ? "Opening print dialog..." : "Print QR"}
      </button>
    </article>
  );
}
