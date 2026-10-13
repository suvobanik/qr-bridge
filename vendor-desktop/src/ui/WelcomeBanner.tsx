import { Printer } from "lucide-react";

type VendorProfile = {
  prop_name: string;
  shop_name: string;
  address: string;
  offer: string;
};

type WelcomeBannerProps = {
  profile: VendorProfile;
  profileLoading: boolean;
  profileSaving: boolean;
  onProfileChange: (profile: VendorProfile) => void;
  onSaveProfile: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function WelcomeBanner({
  profile,
  profileLoading,
  profileSaving,
  onProfileChange,
  onSaveProfile,
}: WelcomeBannerProps) {
  const fields: {
    key: Exclude<keyof VendorProfile, "offer">;
    label: string;
  }[] = [
    { key: "shop_name", label: "Shop name" },
    { key: "prop_name", label: "Proprietor" },
    { key: "address", label: "Shop address" },
  ];

  return (
    <section className="my-3 rounded-2xl border border-black/[0.06] bg-gradient-to-br from-white via-orange-50/60 to-amber-100/70 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9px] font-bold tracking-wider text-orange-700">
            YOUR PRINTER, READY TO SHARE
          </p>

          <h1 className="text-xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-2xl">
            Print without{" "}
            <em className="font-serif font-medium text-orange-600">
              the back-and-forth.
            </em>
          </h1>

          <p className="mt-1 text-[11px] text-neutral-600">
            Scan the QR, upload your file, and print.
          </p>
        </div>

        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-orange-600 shadow-sm sm:flex">
          <Printer size={25} strokeWidth={1.6} />
        </div>
      </div>

      <div className="my-3 border-t border-orange-200/70" />

      <form onSubmit={onSaveProfile} className="flex flex-col gap-2">
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          {fields.map(({ key, label }) => (
            <input
              key={key}
              aria-label={label}
              placeholder={label}
              value={profile[key]}
              disabled={profileLoading || profileSaving}
              onChange={(event) =>
                onProfileChange({
                  ...profile,
                  [key]: event.target.value,
                })
              }
              className="min-w-0 rounded-md border border-orange-200/80 bg-white/70 px-2.5 py-2 text-xs text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-orange-400 disabled:opacity-60"
            />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="vendor-offer"
            className="text-[10px] font-semibold text-neutral-700">
            Offers for Customers
            <span className="ml-1 font-normal text-neutral-500">
              (optional)
            </span>
          </label>

          <textarea
            id="vendor-offer"
            aria-label="Offers for Customers"
            placeholder="e.g. 10% off on printing, drink discounts on friday..."
            value={profile.offer}
            disabled={profileLoading || profileSaving}
            rows={2}
            maxLength={500}
            onChange={(event) =>
              onProfileChange({
                ...profile,
                offer: event.target.value,
              })
            }
            className="min-w-0 resize-y rounded-md border border-orange-200/80 bg-white/70 px-2.5 py-2 text-xs text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-orange-400 disabled:opacity-60"
          />

          <p className="text-right text-[10px] text-neutral-500">
            {profile.offer.length}/500
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileLoading || profileSaving}
            className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">
            {profileSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
