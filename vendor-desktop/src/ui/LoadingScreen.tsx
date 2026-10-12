import { Printer } from "lucide-react";

type LoadingScreenProps = {
  title: string;
  message: string;
};

export function LoadingScreen({ title, message }: LoadingScreenProps) {
  return (
    <main className="flex h-screen flex-col items-center justify-center text-[#182230]">
      <div className="grid h-[55px] w-[55px] place-items-center rounded-[13px] bg-[#e6f8f2] text-[#087f68]">
        <Printer />
      </div>
      <h2 className="mt-5 mb-1 font-[Manrope,sans-serif] text-xl font-bold">
        {title}
      </h2>
      <p className="text-[13px] text-[#758294]">{message}</p>
    </main>
  );
}
