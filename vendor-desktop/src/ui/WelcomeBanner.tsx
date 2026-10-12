import { Printer, Sparkles } from "lucide-react";

export function WelcomeBanner() {
  return (
    <section className="relative isolate flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-br from-white via-orange-50/60 to-amber-100/70 my-4 px-4 shadow-sm sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-8 -top-8 -z-10 h-36 w-36 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="relative z-10 min-w-0 flex-1">
        <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold tracking-wider">
          YOUR PRINTER, READY TO SHARE
        </div>

        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-3xl">
          Print without{" "}
          <em className="font-serif font-medium text-orange-600">
            the back-and-forth.
          </em>
        </h1>

        <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-600 sm:text-sm">
          Scan the QR, upload your file, and let the printer do the rest.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="relative hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/65 shadow-sm backdrop-blur-sm sm:flex md:h-24 md:w-24">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-600/20 md:h-14 md:w-14">
          <Printer size={28} strokeWidth={1.6} />
        </div>
      </div>
    </section>
  );
}
