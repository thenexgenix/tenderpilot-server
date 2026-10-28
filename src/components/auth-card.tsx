import Image from "next/image";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold text-[#0f2a47]">
          <Image
            src="/images/tenderpilot-symbol.png"
            alt="TenderPilot AI symbol"
            width={40}
            height={32}
            className="h-8 w-10 object-contain"
          />
          <span>
            TenderPilot <span className="text-blue-600">AI</span>
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h1 className="text-2xl font-bold text-[#0f2a47]">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-500">
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
}
