import type { Session } from "@supabase/supabase-js";
import { Printer, Wifi } from "lucide-react";

type StationHeaderProps = {
  session: Session;
  cloudJobsConnected: boolean;
  onSignOut: () => void;
};

export function StationHeader({
  session,
  cloudJobsConnected,
  onSignOut,
}: StationHeaderProps) {
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#e9edf3] bg-white px-9 xl:px-[max(calc((100vw-1120px)/2),36px)]">
      <div className="flex items-center gap-[11px]">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-[#e6f8f2] text-[#087f68]">
          <Printer size={21} />
        </div>
        <div>
          <strong className="block font-[Manrope,sans-serif] text-xl font-bold tracking-[-0.8px]">
            <span className="text-[#1f2937]">espresso</span>
            <span className="text-[#087f68]">print</span>
          </strong>
          <small className="text-[9px] font-bold tracking-[1.6px] text-[#7d8999]">
            LOCAL PRINT STATION
          </small>
        </div>
      </div>
      <div className="flex items-center gap-3 max-[980px]:gap-2">
        <div className="flex items-center gap-2 rounded-[30px] border border-[#e5eaf0] px-[13px] py-[9px] text-xs font-semibold text-[#536171] max-[980px]:px-2 max-[980px]:text-[10px]">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#10b981] shadow-[0_0_0_3px_#e2f8ef]" />
          <span>Station active</span>
          <span className="mx-[3px] h-[15px] w-px bg-[#e1e6ec]" />
          <Wifi size={14} />
          <span>
            {cloudJobsConnected ? "Cloud jobs connected" : "Waiting for jobs"}
          </span>
        </div>
        <div
          className="flex min-w-0 items-center gap-2"
          title={session.user.email || "Signed in"}>
          <span className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full bg-[#e6f8f2] text-[11px] font-extrabold text-[#087f68]">
            {(session.user.email || "V").slice(0, 1).toUpperCase()}
          </span>
          <span className="max-w-40 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#536171] max-[980px]:hidden">
            {session.user.email}
          </span>
          <button
            className="rounded-lg border border-[#e5eaf0] bg-white px-[9px] py-[7px] text-[10px] font-bold text-[#536171]"
            onClick={onSignOut}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
