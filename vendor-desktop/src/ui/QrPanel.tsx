import { Copy, Wifi } from "lucide-react";
import type { State } from "./types";

type QrPanelProps = {
  state: State;
  qr: string;
  onCopyUrl: () => void;
};

export function QrPanel({ state, qr, onCopyUrl }: QrPanelProps) {
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
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_0_3px_#e2f8ef]" />{" "}
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
          className="grid h-[27px] w-[27px] place-items-center rounded-[7px] border border-[#e8edf2] bg-white text-[#596779]"
          onClick={onCopyUrl}
          title="Copy guest link">
          <Copy size={15} />
        </button>
      </div>
    </article>
  );
}
