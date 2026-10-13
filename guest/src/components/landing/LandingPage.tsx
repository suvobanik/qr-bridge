import {
  Printer,
  LogIn,
  Download,
  MapPin,
  QrCode,
  ArrowRight,
  Sparkles,
  Smartphone,
  Laptop,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ed] px-4 py-4 text-[#14232c] sm:px-8 sm:py-6">
      <div className="mx-auto flex min-h-[96vh] max-w-[1040px] flex-col justify-between">

        {/* Navigation Bar */}
        <LandingNavigation />

        {/* Main Content Area */}
        <div className="my-auto space-y-7 py-6 sm:space-y-8">
          <HeroWithCenterActions />
          <VisualBenefitsGrid />
          <VendorPreviewStrip />
        </div>

        {/* Bottom Ad Space */}
        <footer className="mt-4 pb-2">
          <div
            aria-label=""
            className="flex h-12 w-full items-center justify-center rounded-xl border border-[#ded8c8] bg-[#ede8d8]/65 text-center text-[10.5px] font-bold tracking-widest text-[#8b8577] uppercase transition-colors"
          >
            ADVERTISEMENT SPACE
          </div>
        </footer>

      </div>
    </main>
  );
}

function LandingNavigation() {
  return (
    <nav
      className="flex w-full items-center justify-between border-b border-[#e2ded2] pb-3"
      aria-label="Main navigation"
    >
      <a
        href="/"
        className="inline-flex items-center gap-2 font-display text-[17px] font-extrabold tracking-tight text-[#14232c] no-underline"
      >
        <span>
          espresso<strong className="text-[#07866b]">print</strong>
        </span>
      </a>

      <div className="flex items-center gap-2">
        <a
          href="/v/demo"
          className="text-xs font-semibold text-[#5b6e76] transition-colors hover:text-[#07866b]"
        >
          Customer Demo
        </a>
      </div>
    </nav>
  );
}

function HeroWithCenterActions() {
  return (
    <section className="text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f6f0] px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#07866b]">

        <span>Empowering Local Print Shops & Cyber Cafés</span>
      </div>

      <h1 className="mx-auto mt-3 max-w-[700px] text-[34px] font-black tracking-tight text-[#102434] sm:text-[46px] leading-[1.08]">
        Supercharge Your Print Shop.
      </h1>

      <p className="mx-auto mt-2.5 max-w-[560px] text-xs leading-relaxed text-[#5b6e76] sm:text-[14px]">
        No more taking files over WhatsApp or email. Let nearby customers send print jobs right to your counter.
      </p>

      {/* HIGHLIGHTED CENTER ACTION BUTTONS */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/download"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#07866b] px-6 text-[13px] font-bold text-white no-underline shadow-sm transition-all hover:bg-[#06725b] hover:shadow-md active:scale-[0.98]"
        >
          <Download size={17} />
          <span>Download App (Windows)</span>
        </a>
        {/* 
        <a
          href="/login"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#cbd8d2] bg-white px-6 text-[13px] font-bold text-[#14232c] no-underline shadow-xs transition-colors hover:bg-[#f6faf8] active:scale-[0.98]"
        >
          <LogIn size={16} className="text-[#07866b]" />
          <span>Vendor Login</span>
        </a> */}
      </div>
    </section>
  );
}

function VisualBenefitsGrid() {
  return (
    <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {/* Visual Benefit 3: Local Marketing Badge */}
      <div className="flex flex-col justify-between rounded-2xl border border-[#e5ebe7] bg-white p-4 shadow-2xs">
        {/* Graphic */}
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-[#faf5f0] border border-[#ede3d8]">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xs border border-[#eadfd4]">
            <MapPin size={22} className="text-[#c0392b]" />
            <div className="text-left">
              <span className="block text-[10px] font-bold text-[#14232c]">Store Promoted</span>
              <span className="block text-[8.5px] text-[#c0392b] font-medium">Shown to local students</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-[13.5px] font-extrabold text-[#14232c]">
            Free Counter Marketing
          </h2>
          <p className="mt-0.5 text-[11px] text-[#6b7f88]">
            Feature your store on our local print network.
          </p>
        </div>
      </div>

      {/* Visual Benefit 1: Touchless Orders */}
      <div className="flex flex-col justify-between rounded-2xl border border-[#e5ebe7] bg-white p-4 shadow-2xs">
        {/* Graphic */}
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-[#f0f9f5] border border-[#d8ebe2]">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xs border border-[#e2ece7]">
            <QrCode size={24} className="text-[#07866b]" />
            <div className="text-left">
              <span className="block text-[10px] font-bold text-[#14232c]">Scan &amp; Upload</span>
              <span className="block text-[8.5px] text-[#07866b] font-medium">Instant phone transfer</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-[13.5px] font-extrabold text-[#14232c]">
            Zero-Contact Transfers
          </h2>
          <p className="mt-0.5 text-[11px] text-[#6b7f88]">
            No mobile numbers or emails exchanged.
          </p>
        </div>
      </div>

      {/* Visual Benefit 2: Live Desktop Queue */}
      <div className="flex flex-col justify-between rounded-2xl border border-[#e5ebe7] bg-white p-4 shadow-2xs">
        {/* Graphic */}
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-[#f0f6fa] border border-[#dbe6ee]">
          <div className="w-[82%] space-y-1.5 rounded-xl bg-white p-2.5 shadow-xs border border-[#e0e8ed]">
            <div className="flex items-center justify-between text-[9px] font-bold text-[#1e6ca8]">
              <span className="flex items-center gap-1">
                <Laptop size={11} /> Ready to Print
              </span>
              <span className="text-[#07866b]">Auto</span>
            </div>
            <div className="h-1.5 w-full rounded bg-[#e8eef2]" />
            <div className="h-1.5 w-2/3 rounded bg-[#07866b]" />
          </div>
        </div>
        <div className="mt-3">
          <h2 className="text-[13.5px] font-extrabold text-[#14232c]">
            Automated Desktop Queue
          </h2>
          <p className="mt-0.5 text-[11px] text-[#6b7f88]">
            One click to print right from your PC.
          </p>
        </div>
      </div>


    </section>
  );
}

function VendorPreviewStrip() {
  return (
    <section className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#e0e7e3] bg-white p-4 shadow-2xs sm:flex-row sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcf5ec] text-[#07866b]">
          <TrendingUp size={20} />
        </div>
        <div className="text-left">
          <h3 className="text-xs font-extrabold text-[#14232c] sm:text-[13px]">
            Ready to speed up your counter line?
          </h3>
          <p className="text-[11px] text-[#6c7f8d]">
            Free setup. Works alongside your existing Windows printer.
          </p>
        </div>
      </div>

      <a
        href="/vendor-signup"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#14232c] px-4 text-xs font-bold text-white no-underline shadow-xs transition-colors hover:bg-[#20333f]"
      >
        <span>Partner with Us</span>
        <ArrowRight size={13} />
      </a>
    </section>
  );
}