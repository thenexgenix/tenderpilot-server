"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My tenders", href: "/dashboard", icon: "▤" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

export function AppShell({ children }: { children: ReactNode }) {

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0f2a47] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-7">
          <div className="text-3xl text-blue-400">✦</div>
          <span className="text-xl font-bold">
            TenderPilot <span className="text-blue-400">AI</span>
          </span>
        </div>

        <nav className="space-y-2 px-4 py-7">
          {navigation.map((item) => {
            const active = item.label === "Dashboard";

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-12 items-center gap-4 rounded-lg px-4 text-sm font-medium transition ${active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-5">
          <div className="rounded-2xl bg-blue-600/20 p-4 text-sm text-blue-100">
            <div className="mb-3 text-3xl">🤖</div>
            <p className="font-semibold">Work smarter with AI</p>
            <p className="mt-1 text-xs text-blue-100/70">
              Find requirements and draft proposals faster.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-20 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="relative min-w-[220px] flex-1">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-12 pl-10 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Search tenders, issues, keywords..."
            />
          </div>

          <Link
            href="/tenders/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <span className="text-lg">+</span>
            New tender
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
