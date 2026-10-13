import { ShieldCheck } from "lucide-react";

export function GuestPrivacyNote() {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-[#9aa4b0]">
      <ShieldCheck size={13} className="shrink-0" />
      <span>Your file is sent only to this print station.</span>
    </div>
  );
}