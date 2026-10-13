import { Printer, LogIn, Download } from "lucide-react";

export function GuestBrand() {
  return (
    <header className="mb-2 flex w-full max-w-[420px] items-center justify-between gap-2 px-1 py-1">
      {/* Brand logo & title */}
      <div className="flex items-center gap-2">
        <div>
          <strong className="block font-display text-[15px] font-extrabold tracking-[-0.5px] leading-tight text-[#172033]">
            espresso<span className="text-[#0a9b7d]">print</span>
          </strong>
        </div>
      </div>
    </header>
  );
}