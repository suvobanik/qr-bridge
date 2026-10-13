
import { Printer } from "lucide-react";

export function GuestBrand() {
  return (
    <div className="mb-5 flex w-full max-w-[440px] items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e0f8ef] text-[#07866b]">
        <Printer size={20} />
      </div>

      <div>
        <strong className="block font-display text-[17px] tracking-[-0.6px]">
          espresso<span className="text-[#0a9b7d]">print</span>
        </strong>

        <small className="text-[8px] font-extrabold tracking-[1.3px] text-[#8793a2]">
          PRINTING STATION
        </small>
      </div>
    </div>
  );
}