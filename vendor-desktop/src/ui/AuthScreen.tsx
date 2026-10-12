import type { SyntheticEvent } from "react";
import { Printer } from "lucide-react";

type AuthScreenProps = {
  authMode: "login" | "signup";
  authSubmitting: boolean;
  authError: string;
  authNotice: string;
  authEmail: string;
  authPassword: string;
  authName: string;
  isSupabaseConfigured: boolean;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onAuthModeChange: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
};

export function AuthScreen({
  authMode,
  authSubmitting,
  authError,
  authNotice,
  authEmail,
  authPassword,
  authName,
  isSupabaseConfigured,
  onSubmit,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onNameChange,
}: AuthScreenProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_50%_0%,#e7f8f2_0%,#f6f7fb_52%)] px-[18px] py-8">
      <section className="w-[min(100%,440px)] rounded-3xl border border-[#e7ebf1] bg-white p-9 shadow-[0_18px_60px_rgba(24,34,48,0.08)]">
        <div className="mb-[37px] flex items-center gap-[11px]">
          <div className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-[#e6f8f2] text-[#087f68]">
            <Printer size={22} />
          </div>
          <div>
            <strong className="block font-[Manrope,sans-serif] text-[22px] font-bold tracking-[-0.8px]">
              espresso<span>print</span>
            </strong>
            <small className="text-[9px] font-bold tracking-[1.6px] text-[#7d8999]">
              YOUR PRINT STATION
            </small>
          </div>
        </div>
        <div>
          <div className="mb-3 text-[10px] font-bold tracking-[1.8px] text-[#09977a]">
            VENDOR ACCOUNT
          </div>
          <h1 className="font-[Manrope,sans-serif] text-[31px] font-bold tracking-[-1.2px]">
            {authMode === "login" ? "Welcome back." : "Set up your station."}
          </h1>
          <p className="mt-2 mb-6 text-[13px] leading-[1.6] text-[#687587]">
            {authMode === "login"
              ? "Log in to manage your print station."
              : "Create an account to claim your print station."}
          </p>
        </div>
        {!isSupabaseConfigured ? (
          <div className="mb-[15px] flex flex-col gap-[3px] rounded-[10px] border border-[#f6d2cd] bg-[#fff2f0] p-[11px_12px] text-[11px] leading-[1.5] text-[#a33f35]">
            <strong>Supabase is not configured yet.</strong>
            <span>
              Create a .env file from .env.example and add your Supabase Project
              URL and publishable/anon key, then restart the app.
            </span>
          </div>
        ) : null}
        {authError && (
          <div className="mb-[15px] flex flex-col gap-[3px] rounded-[10px] border border-[#f6d2cd] bg-[#fff2f0] p-[11px_12px] text-[11px] leading-[1.5] text-[#a33f35]">
            {authError}
          </div>
        )}
        {authNotice && (
          <div className="mb-[15px] flex flex-col gap-[3px] rounded-[10px] border border-[#c8f0df] bg-[#effbf6] p-[11px_12px] text-[11px] leading-[1.5] text-[#08785f]">
            {authNotice}
          </div>
        )}
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {authMode === "signup" && (
            <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#455264]">
              Display name
              <input
                className="h-[45px] rounded-[10px] border border-[#e0e6ed] bg-white px-[13px] text-[13px] font-normal text-[#182230] outline-none focus:border-[#0a9b7d] focus:shadow-[0_0_0_3px_#0a9b7d18]"
                autoComplete="name"
                value={authName}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Your shop name"
                maxLength={80}
              />
            </label>
          )}
          <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#455264]">
            Email address
            <input
              className="h-[45px] rounded-[10px] border border-[#e0e6ed] bg-white px-[13px] text-[13px] font-normal text-[#182230] outline-none focus:border-[#0a9b7d] focus:shadow-[0_0_0_3px_#0a9b7d18]"
              type="email"
              autoComplete="email"
              required
              value={authEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-[7px] text-[11px] font-bold text-[#455264]">
            Password
            <input
              className="h-[45px] rounded-[10px] border border-[#e0e6ed] bg-white px-[13px] text-[13px] font-normal text-[#182230] outline-none focus:border-[#0a9b7d] focus:shadow-[0_0_0_3px_#0a9b7d18]"
              type="password"
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              value={authPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <button
            className="mt-1 h-[46px] rounded-[10px] border-0 bg-[#0a9b7d] text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!isSupabaseConfigured || authSubmitting}>
            {authSubmitting
              ? "Please wait…"
              : authMode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
        <div className="mt-[22px] text-center text-[12px] text-[#748092]">
          {authMode === "login"
            ? "New to Print Bridge?"
            : "Already have an account?"}{" "}
          <button
            className="border-0 bg-transparent p-1 font-extrabold text-[#07876d]"
            type="button"
            onClick={onAuthModeChange}>
            {authMode === "login" ? "Create account" : "Log in"}
          </button>
        </div>
        <p className="mt-[21px] mb-0 text-center text-[10px] text-[#98a1ad]">
          Your session stays saved on this device until you log out.
        </p>
      </section>
    </main>
  );
}
