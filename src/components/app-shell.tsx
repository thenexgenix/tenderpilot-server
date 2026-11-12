"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

// Primary navigation links with corresponding vector icons and path matching rules
const navigation = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    label: "New Tender",
    href: "/tenders/new",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
  },
];

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";

  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [previousSearch, setPreviousSearch] = useState(currentSearch);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync externally changed URL values before rendering the input.
  if (currentSearch !== previousSearch) {
    setPreviousSearch(currentSearch);
    setSearchQuery(currentSearch);
  }

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

  // Active status evaluation based on current URL pathname
  function isItemActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        (pathname.startsWith("/tenders/") && pathname !== "/tenders/new")
      );
    }
    return pathname === href;
  }

  // Breadcrumb segment labels derived from the current pathname
  const breadcrumbContext = pathname.startsWith("/tenders/new")
    ? "New Tender"
    : pathname.startsWith("/tenders/")
    ? "Tender Workspace"
    : "Dashboard";

  return (
    <div className="tp-shell-bg flex min-h-screen">
      {/* Desktop Persistent Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-[#0f2a47]/30 bg-[#0f2a47] bg-[url('/images/sidebar-bg.png')] bg-[length:100%_100%] bg-top bg-no-repeat text-white shadow-xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <Link href="/" title="Return to TenderPilot AI Home" className="flex items-center gap-3 group">
            <Image
              src="/images/tenderpilot-symbol.png"
              alt="TenderPilot AI symbol"
              width={291}
              height={233}
              className="h-[30px] w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-blue-300 transition-colors">
                TenderPilot <span className="text-blue-400">AI</span>
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                Enterprise Workspace
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </p>
          {navigation.map((item) => {
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-11 items-center gap-3.5 rounded-xl px-3.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[#6857ee] text-white shadow-md shadow-violet-900/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Security and compliance footnote */}
        <div className="border-t border-white/10 p-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>100% Quote Verified</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              Zero AI hallucinations. Every citation links to verifiable document text.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[#0f2a47] bg-[url('/images/sidebar-bg.png')] bg-cover text-white shadow-2xl">
            <div className="flex h-18 items-center justify-between border-b border-white/10 px-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/tenderpilot-symbol.png"
                  alt="TenderPilot AI symbol"
                  width={291}
                  height={233}
                  className="h-[26px] w-auto object-contain"
                />
                <span className="text-lg font-bold text-white">
                  TenderPilot <span className="text-blue-400">AI</span>
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 px-4 py-6">
              {navigation.map((item) => {
                const active = isItemActive(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-12 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition ${
                      active
                        ? "bg-[#2563eb] text-white shadow"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-5">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Modern Application Header */}
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-18 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger button visible only on mobile/tablet */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb path */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              {breadcrumbContext !== "Dashboard" && (
                <>
                  <span>/</span>
                  <span className="text-[#0f2a47]">{breadcrumbContext}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative order-3 w-full flex-none md:order-none md:min-w-[220px] md:max-w-md md:flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              aria-label="Search tenders"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 pl-10 text-xs sm:text-sm text-[#0f2a47] placeholder:text-slate-400 transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100 focus:outline-none"
              placeholder="Search tenders, issuers, keywords..."
            />
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/tenders/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] hover:shadow focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:outline-none active:scale-[0.99]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Tender</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-100 focus-visible:outline-none"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Workspace Canvas Container */}
        <main className="mx-auto w-full max-w-[1500px] min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7faff]">{children}</div>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}
