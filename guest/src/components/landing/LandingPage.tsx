import {
  PackageCheck,
  Printer,
  QrCode,
  Upload,
} from "lucide-react";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ed] px-5 text-[#102a43] sm:px-[6vw]">
      <LandingNavigation />
      <LandingHero />
      <PrintSteps />
      <LandingFooter />
    </main>
  );
}

function LandingNavigation() {
  return (
    <nav
      className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center justify-between border-b border-[#deddd8] sm:h-[82px]"
      aria-label="Main navigation"
    >
      <a
        className="inline-flex items-center gap-[10px] font-display text-[17px] font-bold tracking-[-0.5px] text-[#102a43] no-underline transition-colors hover:text-[#2471b8]"
        href="/"
        aria-label="Espresso Print home"
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[#dcecf8] text-[#2471b8]">
          <Printer size={18} />
        </span>

        <span>
          espresso <strong className="text-[#2471b8]">print</strong>
        </span>
      </a>

      <a
        className="text-xs font-bold text-[#53687b] no-underline transition-colors hover:text-[#2471b8]"
        href="#how-it-works"
      >
        How it works
      </a>
    </nav>
  );
}

function LandingHero() {
  return (
    <section className="mx-auto grid min-h-0 w-full max-w-[1180px] items-center gap-[7vw] py-[66px] pb-[78px] sm:min-h-[590px] sm:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] sm:py-[76px] sm:pb-[92px]">
      <div className="max-w-[620px]">
        <p className="mb-5 flex items-center gap-[9px] text-[10px] font-extrabold tracking-[1.6px] text-[#2471b8]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#2471b8]" />
          SIMPLE PRINTING, WHEREVER YOU ARE
        </p>

        <h1 className="m-0 max-w-[630px] font-display text-[47px] font-extrabold leading-[1.04] tracking-[-2px] text-[#102a43] sm:text-[clamp(42px,5.4vw,74px)] sm:tracking-[-3px]">
          Your documents. Printed in minutes.
        </h1>

        <p className="my-[25px] mb-[29px] max-w-[480px] text-sm leading-[1.7] text-[#62788b] sm:text-base">
          Scan a print shop&apos;s QR code, upload your file from your phone,
          and collect your pages when they&apos;re ready. No app or account
          required.
        </p>

        <a
          className="inline-flex items-center gap-3 rounded-[9px] bg-[#2471b8] px-[19px] py-[14px] text-[13px] font-bold text-white no-underline shadow-[0_8px_18px_#2471b82b] transition-all hover:-translate-y-0.5 hover:bg-[#1e609d] hover:shadow-[0_10px_22px_#2471b83b]"
          href="#how-it-works"
        >
          See how it works
          <span className="text-[19px] leading-none" aria-hidden="true">
            →
          </span>
        </a>

        <p className="mt-5 text-[11px] text-[#7c8c98]">
          At a print shop? Scan its QR code to get started.
        </p>
      </div>

      <LandingVisual />
    </section>
  );
}

function LandingVisual() {
  return (
    <div
      className="relative mt-[34px] grid min-h-[350px] place-items-center sm:mt-0 sm:min-h-[390px]"
      aria-hidden="true"
    >
      <div className="absolute aspect-[0.74] w-[min(290px,72%)] translate-x-[31px] translate-y-[-17px] rotate-[8deg] rounded-[3px] border border-[#d7dfe4] bg-[#e9f1f5] shadow-[0_20px_35px_#102a4317]" />

      <div className="absolute z-[1] aspect-[0.74] w-[min(290px,72%)] rotate-[-5deg] rounded-[3px] border border-[#d7dfe4] bg-[#fffefa] px-[25px] py-[27px] shadow-[0_20px_35px_#102a4317]">
        <div className="mb-[22px] h-[5px] w-[35px] rounded-[2px] bg-[#2471b8]" />

        <div className="mb-3 h-[14px] w-[58%] rounded-[2px] bg-[#102a43]" />

        <div className="mb-3 h-[7px] w-[88%] rounded-[2px] bg-[#c9d9e4]" />

        <div className="mb-3 h-[7px] w-3/4 rounded-[2px] bg-[#c9d9e4]" />

        <div className="mb-3 h-[7px] w-[52%] rounded-[2px] bg-[#c9d9e4]" />

        <div className="mx-auto my-[24px] mb-[19px] grid h-[100px] w-[100px] place-items-center border-[7px] border-[#e1edf5] text-[#102a43]">
          <QrCode size={82} strokeWidth={1.25} />
        </div>

        <span className="mx-auto block w-max border border-[#8bb6d6] px-2 py-[5px] text-[7px] font-extrabold tracking-[1px] text-[#2471b8]">
          READY TO PRINT
        </span>
      </div>

      <div className="absolute bottom-3 right-0 z-[2] flex items-center gap-[7px] rounded-[7px] border border-[#d6e2e9] bg-[#fffefa] px-3 py-[9px] text-[10px] font-bold text-[#2471b8] shadow-[0_8px_18px_#102a4312]">
        <Printer size={15} />
        <span>Print shop ready</span>
      </div>
    </div>
  );
}

function PrintSteps() {
  return (
    <section
      className="mx-auto w-full max-w-[1180px] border-t border-[#deddd8] py-[70px] pb-[80px]"
      id="how-it-works"
    >
      <div>
        <p className="mb-5 flex items-center gap-[9px] text-[10px] font-extrabold tracking-[1.6px] text-[#2471b8]">
          HOW IT WORKS
        </p>

        <h2 className="m-0 font-display text-[33px] tracking-[-1.2px] text-[#102a43]">
          Three easy steps.
        </h2>
      </div>

      <div className="mt-[38px] grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
        <article className="relative min-h-0 rounded-lg border border-[#deddd8] bg-[#fbf9f5] p-[19px] sm:min-h-[190px] sm:px-[25px] sm:py-6">
          <div className="mb-[15px] grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-[#dcecf8] text-[#2471b8] sm:mb-[21px]">
            <QrCode size={21} />
          </div>

          <span className="absolute right-[19px] top-[21px] text-[10px] font-extrabold tracking-[1px] text-[#9baab4] sm:right-[25px] sm:top-[27px]">
            01
          </span>

          <h3 className="mb-[7px] mt-0 font-display text-[17px] text-[#102a43]">
            Scan QR
          </h3>

          <p className="m-0 max-w-[230px] text-xs leading-[1.6] text-[#6c7f8d]">
            Find the Espresso Print code at your local print shop.
          </p>
        </article>

        <article className="relative min-h-0 rounded-lg border border-[#deddd8] bg-[#fbf9f5] p-[19px] sm:min-h-[190px] sm:px-[25px] sm:py-6">
          <div className="mb-[15px] grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-[#dcecf8] text-[#2471b8] sm:mb-[21px]">
            <Upload size={21} />
          </div>

          <span className="absolute right-[19px] top-[21px] text-[10px] font-extrabold tracking-[1px] text-[#9baab4] sm:right-[25px] sm:top-[27px]">
            02
          </span>

          <h3 className="mb-[7px] mt-0 font-display text-[17px] text-[#102a43]">
            Upload file
          </h3>

          <p className="m-0 max-w-[230px] text-xs leading-[1.6] text-[#6c7f8d]">
            Choose a PDF or image right from your phone.
          </p>
        </article>

        <article className="relative min-h-0 rounded-lg border border-[#deddd8] bg-[#fbf9f5] p-[19px] sm:min-h-[190px] sm:px-[25px] sm:py-6">
          <div className="mb-[15px] grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-[#dcecf8] text-[#2471b8] sm:mb-[21px]">
            <PackageCheck size={21} />
          </div>

          <span className="absolute right-[19px] top-[21px] text-[10px] font-extrabold tracking-[1px] text-[#9baab4] sm:right-[25px] sm:top-[27px]">
            03
          </span>

          <h3 className="mb-[7px] mt-0 font-display text-[17px] text-[#102a43]">
            Collect prints
          </h3>

          <p className="m-0 max-w-[230px] text-xs leading-[1.6] text-[#6c7f8d]">
            Pick up your pages when the shop has finished printing.
          </p>
        </article>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1180px] flex-col justify-between gap-4 border-t border-[#deddd8] py-6 pb-[31px] text-[10px] text-[#82909a] sm:flex-row">
      <span className="font-display text-[13px] font-bold text-[#102a43]">
        espresso <strong className="text-[#2471b8]">print</strong>
      </span>

      <span>Simple printing for real life.</span>
    </footer>
  );
}