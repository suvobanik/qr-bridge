import { Printer, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import type { State } from "./types";

type SettingsPanelProps = {
  state: State;
  pending: number;
  done: number;
  onRefreshPrinters: () => void;
  onToggleAuto: () => void;
};

export function SettingsPanel({
  state,
  pending,
  done,
  onRefreshPrinters,
  onToggleAuto,
}: SettingsPanelProps) {
  return (
    <article className="rounded-[19px] border border-[#e7ebf1] bg-white p-[23px_25px] shadow-[0_3px_14px_rgba(24,34,48,0.025)]">
      <div className="mb-[22px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-[7px] bg-[#e6f8f2] px-[7px] py-1.5 text-[10px] font-extrabold text-[#079879]">
            02
          </span>
          <h2 className="font-[Manrope,sans-serif] text-base font-extrabold tracking-[-0.3px]">
            Print settings
          </h2>
        </div>
        <button
          className="flex items-center gap-1.5 border-0 bg-transparent p-[7px] text-[11px] font-semibold text-[#687587]"
          onClick={onRefreshPrinters}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <label
        className="mt-0.5 mb-2 block text-[9px] font-extrabold tracking-[1.3px] text-[#7c8998]"
        htmlFor="printer">
        CONNECTED PRINTER
      </label>
      <div className="flex h-[45px] items-center gap-[9px] rounded-[10px] border border-[#e4e9ef] px-3 text-[#687587]">
        <Printer className="text-[#15987c]" size={17} />
        <select
          id="printer"
          value={state.selectedPrinter}
          disabled
          onChange={() => {}}>
          <option>{state.selectedPrinter || "No printer detected"}</option>
        </select>
      </div>
      <div className="mt-2 min-h-[14px] text-[10px] text-[#8993a1]">
        {state.selectedPrinter
          ? "Using your Windows default printer"
          : "No default printer detected. Set one in Windows Settings, then refresh."}
      </div>
      <div
        className={`mt-[21px] flex items-center gap-3 rounded-[13px] border p-[15px_14px] transition ${state.autoApprove ? "border-[#c8f0df] bg-[#effbf6]" : "border-[#edf0f4] bg-[#f8f9fb]"}`}>
        <div
          className={`grid h-10 w-10 place-items-center rounded-[11px] ${state.autoApprove ? "bg-[#d8f7e9] text-[#079879]" : "bg-[#eef1f5] text-[#7c8999]"}`}>
          {state.autoApprove ? (
            <ShieldCheck size={22} />
          ) : (
            <ShieldAlert size={22} />
          )}
        </div>
        <div className="flex-1">
          <strong className="block text-[13px]">Auto-Approve</strong>
          <p className="mt-1 text-[10px] text-[#778394]">
            {state.autoApprove
              ? "Incoming files print automatically."
              : "Review every job before it prints."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={state.autoApprove}
          className={`flex h-6 w-[42px] items-center rounded-[30px] border-0 p-[3px] transition ${state.autoApprove ? "justify-end bg-[#0a9b7d]" : "bg-[#d0d6df]"}`}
          onClick={onToggleAuto}>
          <span className="h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_#0002]" />
        </button>
      </div>
      <div className="mx-px mt-[13px] flex items-start gap-2 text-[11px] leading-[1.5] text-[#677587]">
        <ShieldCheck className="shrink-0 text-[#0b9b7e]" size={16} />
        <span>Auto-Approve new printing jobs.</span>
      </div>
      <div className="mt-[19px] grid grid-cols-3 border-t border-[#edf0f4] pt-[17px]">
        <div className="flex flex-col gap-[5px]">
          <span className="font-[Manrope,sans-serif] text-[23px] font-extrabold tracking-[-0.8px]">
            {state.jobs.length}
          </span>
          <span className="text-[8px] font-extrabold tracking-[1px] text-[#8b95a2]">
            TOTAL JOBS
          </span>
        </div>
        <div className="flex flex-col gap-[5px]">
          <span className="font-[Manrope,sans-serif] text-[23px] font-extrabold tracking-[-0.8px] text-[#c78319]">
            {pending}
          </span>
          <span className="text-[8px] font-extrabold tracking-[1px] text-[#8b95a2]">
            NEED APPROVAL
          </span>
        </div>
        <div className="flex flex-col gap-[5px]">
          <span className="font-[Manrope,sans-serif] text-[23px] font-extrabold tracking-[-0.8px]">
            {done}
          </span>
          <span className="text-[8px] font-extrabold tracking-[1px] text-[#8b95a2]">
            FINISHED
          </span>
        </div>
      </div>
    </article>
  );
}
