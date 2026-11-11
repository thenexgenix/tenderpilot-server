"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Banner,
  EmptyState,
  Skeleton,
  StatusBadge,
  Table,
  type TenderStatusKey,
} from "@/components/ui";

type Tender = {
  id: string;
  title: string;
  issuerName: string;
  reference: string | null;
  deadlineAt: string | null;
  status: TenderStatusKey;
  stage: string | null;
  createdAt: string;
};

type TendersResponse = {
  data?: Tender[];
  error?: {
    message?: string;
  };
};

/* Format utility rendering human-readable dates for deadlines and timestamps */
function formatDate(value: string | null): string {
  if (!value) {
    return "No deadline specified";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/* Time-aware greeting resolving the appropriate salutation */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

/* Stat card presentation component with distinct tone styling and SVG vector icons */
function MetricStatCard({
  icon,
  title,
  value,
  caption,
  tone,
  isActive = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  caption: string;
  tone: "blue" | "amber" | "slate" | "green";
  isActive?: boolean;
  onClick?: () => void;
}) {
  const toneStyles = {
    blue: {
      bg: "bg-blue-50/80 text-blue-700 border-blue-200/80",
      accent: "text-blue-700",
      activeRing: "ring-2 ring-blue-500 border-blue-400",
    },
    amber: {
      bg: "bg-amber-50/80 text-amber-800 border-amber-200/80",
      accent: "text-amber-800",
      activeRing: "ring-2 ring-amber-500 border-amber-400",
    },
    slate: {
      bg: "bg-slate-100/80 text-slate-700 border-slate-200/80",
      accent: "text-slate-800",
      activeRing: "ring-2 ring-slate-500 border-slate-400",
    },
    green: {
      bg: "bg-emerald-50/80 text-emerald-800 border-emerald-200/80",
      accent: "text-emerald-800",
      activeRing: "ring-2 ring-emerald-500 border-emerald-400",
    },
  };

  const style = toneStyles[tone];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          : ""
      } ${isActive ? style.activeRing : ""}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${style.bg} transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {title}
          </p>
          <p className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2a47]">
            {value}
          </p>
          <p className="text-xs text-slate-400 font-medium">{caption}</p>
        </div>
      </div>

      {onClick && (
        <span className="text-slate-300 transition-colors group-hover:text-slate-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadTenders = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const response = await fetch("/api/tenders", {
          cache: "no-store",
        });

        const result = (await response.json()) as TendersResponse;

        if (!response.ok) {
          setErrorMessage(
            result.error?.message ?? "Unable to load your tenders.",
          );
          return;
        }

        setTenders(result.data ?? []);
      } catch {
        setErrorMessage("Unable to connect to the server. Please try again.");
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /* Initial mount data retrieval */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTenders(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTenders]);

  /* Status polling for tenders currently in processing */
  useEffect(() => {
    const hasProcessingTender = tenders.some(
      (tender) => tender.status === "PROCESSING",
    );

    if (!hasProcessingTender) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadTenders(false);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadTenders, tenders]);

  /* Metric aggregations */
  const needsReviewCount = useMemo(() => {
    return tenders.filter(
      (tender) =>
        tender.status === "ATTENTION_REQUIRED" ||
        tender.status === "PROCESSING_FAILED",
    ).length;
  }, [tenders]);

  const draftsCount = useMemo(() => {
    return tenders.filter((tender) => tender.status === "DRAFT").length;
  }, [tenders]);

  const analyzedCount = useMemo(() => {
    return tenders.filter((tender) => tender.status === "ANALYZED").length;
  }, [tenders]);

  /* Search and status filtering */
  const searchTerm = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filteredTenders = useMemo(() => {
    return tenders.filter((tender) => {
      const matchesSearch =
        !searchTerm ||
        [tender.title, tender.issuerName, tender.reference ?? ""].some(
          (value) => value.toLowerCase().includes(searchTerm),
        );

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "ALL") {
        return true;
      }
      if (statusFilter === "NEEDS_REVIEW") {
        return (
          tender.status === "ATTENTION_REQUIRED" ||
          tender.status === "PROCESSING_FAILED"
        );
      }
      return tender.status === statusFilter;
    });
  }, [searchTerm, statusFilter, tenders]);

  return (
    <AppShell>
      <div className="space-y-7">
        {/* Workspace context header banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-700 uppercase shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Tender Portfolio & Compliance Hub
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0f2a47] sm:text-3xl lg:text-4xl">
              {getTimeGreeting()}, review with confidence
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              AI suggestions extract mandatory criteria with source citations. Always verify important clauses against
              the original tender document.
            </p>
          </div>
        </div>

        {/* High-level metric cards with interactive filter toggles */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricStatCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            title="Total Tenders"
            value={String(tenders.length)}
            caption="Active repository"
            tone="blue"
            isActive={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />

          <MetricStatCard
            icon={
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Analyzed"
            value={String(analyzedCount)}
            caption="Requirements verified"
            tone="green"
            isActive={statusFilter === "ANALYZED"}
            onClick={() => setStatusFilter(statusFilter === "ANALYZED" ? "ALL" : "ANALYZED")}
          />

          <MetricStatCard
            icon={
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            title="Needs Review"
            value={String(needsReviewCount)}
            caption="Attention required"
            tone="amber"
            isActive={statusFilter === "NEEDS_REVIEW"}
            onClick={() => setStatusFilter(statusFilter === "NEEDS_REVIEW" ? "ALL" : "NEEDS_REVIEW")}
          />

          <MetricStatCard
            icon={
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Drafts"
            value={String(draftsCount)}
            caption="Pending processing"
            tone="slate"
            isActive={statusFilter === "DRAFT"}
            onClick={() => setStatusFilter(statusFilter === "DRAFT" ? "ALL" : "DRAFT")}
          />
        </section>

        {/* Main data card container */}
        <section className="rounded-xl border border-slate-200/90 bg-white shadow-xs">
          {/* Card toolbar with title and status filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#0f2a47]">Your Tenders</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {filteredTenders.length} {filteredTenders.length === 1 ? "document" : "documents"}
              </span>
            </div>

            {/* Status Filter Pill Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-[#0f2a47]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ANALYZED")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  statusFilter === "ANALYZED"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-[#0f2a47]"
                }`}
              >
                Analyzed ({analyzedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NEEDS_REVIEW")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  statusFilter === "NEEDS_REVIEW"
                    ? "bg-white text-amber-800 shadow-2xs"
                    : "text-slate-600 hover:text-[#0f2a47]"
                }`}
              >
                Needs Review ({needsReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  statusFilter === "DRAFT"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-600 hover:text-[#0f2a47]"
                }`}
              >
                Drafts ({draftsCount})
              </button>
            </div>
          </div>

          <div className="p-5">
            {errorMessage && (
              <div className="space-y-3">
                <Banner variant="error">{errorMessage}</Banner>
                <button
                  type="button"
                  onClick={() => void loadTenders()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {!errorMessage && isLoading && <DashboardSkeleton />}

            {!errorMessage && !isLoading && tenders.length === 0 && (
              <div className="py-8 text-center">
                <EmptyState
                  title="No tender documents found"
                  description="Use the New Tender button in the application header to upload a procurement PDF."
                />
              </div>
            )}

            {!errorMessage &&
              !isLoading &&
              tenders.length > 0 &&
              filteredTenders.length === 0 && (
                <EmptyState
                  title="No matching tenders found"
                  description="Try adjusting your search keyword or selected status filter."
                  action={
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ALL")}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear Status Filter
                    </button>
                  }
                />
              )}

            {!errorMessage && !isLoading && filteredTenders.length > 0 && (
              <>
                {/* Desktop Data Table */}
                <div className="hidden md:block">
                  <Table>
                    <thead className="border-b border-slate-200/90 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">Tender Document</th>
                        <th className="px-5 py-3.5">Procuring Issuer</th>
                        <th className="px-5 py-3.5">Submission Deadline</th>
                        <th className="px-5 py-3.5">Lifecycle Status</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredTenders.map((tender) => (
                        <tr
                          key={tender.id}
                          className="group hover:bg-blue-50/40 transition-colors duration-150"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/tenders/${tender.id}`}
                              className="flex items-center gap-3.5"
                            >
                              {/* Vector document icon */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50 text-blue-700 shadow-2xs group-hover:scale-105 group-hover:border-blue-400 group-hover:bg-blue-100 transition-all duration-150">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>

                              <div>
                                <span className="block font-bold text-sm text-[#0f2a47] group-hover:text-blue-700 transition-colors">
                                  {tender.title}
                                </span>
                                <span className="mt-0.5 inline-block font-mono text-xs text-slate-500">
                                  Ref: {tender.reference || "None specified"}
                                </span>
                              </div>
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {tender.issuerName}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDate(tender.deadlineAt)}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={tender.status} />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/tenders/${tender.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                            >
                              <span>Inspect</span>
                              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="space-y-3 md:hidden">
                  {filteredTenders.map((tender) => (
                    <Link
                      key={tender.id}
                      href={`/tenders/${tender.id}`}
                      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0f2a47] group-hover:text-blue-700 transition-colors">
                              {tender.title}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {tender.reference || "No ref"} · {tender.issuerName}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={tender.status} />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(tender.deadlineAt)}
                        </span>

                        <span className="font-semibold text-blue-600 group-hover:underline">
                          Open Workspace →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <DashboardSkeleton />
        </AppShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
