"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My tenders", href: "/dashboard", icon: "▤" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const nextParams = new URLSearchParams();
      const trimmedValue = value.trim();

      if (trimmedValue) {
        nextParams.set("search", trimmedValue);
      }

      const query = nextParams.toString();
      router.replace(`/dashboard${query ? `?${query}` : ""}`);
    }, 250);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-[#0f2a47] bg-[url('/images/sidebar-bg.png')] bg-[length:100%_100%] bg-top bg-no-repeat text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-7">
          <Image
            src="/images/tenderpilot-symbol.png"
            alt="TenderPilot AI symbol"
            width={40}
            height={32}
            className="object-contain"
          />
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
                className={`flex min-h-12 items-center gap-4 rounded-lg px-4 text-sm font-medium transition ${
                  active
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
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-20 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="relative min-w-[220px] flex-1">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              aria-label="Search tenders"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-12 pl-10 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Search tenders, issues, keywords..."
            />
          </div>

          <Link
            href="/tenders/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:outline-none"
          >
            <span className="text-lg">+</span>
            New tender
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-4 focus-visible:ring-slate-200 focus-visible:outline-none"
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

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-slate-50">{children}</div>}
    >
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}
