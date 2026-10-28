"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Skeleton,
  Table,
} from "@/components/ui";

type TenderStatus =
  | "DRAFT"
  | "PROCESSING"
  | "ANALYZED"
  | "ATTENTION_REQUIRED"
  | "PROCESSING_FAILED";

type Tender = {
  id: string;
  title: string;
  issuerName: string;
  reference: string | null;
  deadlineAt: string | null;
  status: TenderStatus;
  stage: string | null;
  createdAt: string;
};

type TendersResponse = {
  data?: Tender[];
  error?: {
    message?: string;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: TenderStatus) {
  if (status === "ATTENTION_REQUIRED") {
    return "ATTENTION REQUIRED";
  }

  if (status === "PROCESSING_FAILED") {
    return "PROCESSING FAILED";
  }

  return status;
}

function statusVariant(
  status: TenderStatus,
): "blue" | "green" | "amber" | "red" | "gray" {
  if (status === "ANALYZED") {
    return "green";
  }

  if (status === "PROCESSING") {
    return "blue";
  }

  if (status === "ATTENTION_REQUIRED") {
    return "amber";
  }

  if (status === "PROCESSING_FAILED") {
    return "red";
  }

  return "gray";
}

function StatusBadge({ status }: { status: TenderStatus }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}

function StatCard({
  icon,
  title,
  value,
  caption,
  tone,
}: {
  icon: string;
  title: string;
  value: string;
  caption: string;
  tone: "blue" | "amber" | "green";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${styles[tone]}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-[#0f2a47]">{value}</p>
        <p className="text-xs text-slate-400">{caption}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTenders() {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTenders();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const needsReview = tenders.filter(
    (tender) =>
      tender.status === "ATTENTION_REQUIRED" ||
      tender.status === "PROCESSING_FAILED",
  ).length;

  const drafts = tenders.filter((tender) => tender.status === "DRAFT").length;
  const searchTerm = (searchParams.get("search") ?? "").trim().toLowerCase();
  const visibleTenders = searchTerm
    ? tenders.filter((tender) =>
        [tender.title, tender.issuerName, tender.reference ?? ""].some(
          (value) => value.toLowerCase().includes(searchTerm),
        ),
      )
    : tenders;

  return (
    <AppShell>
      <div className="space-y-7">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold tracking-[0.16em] text-blue-700 uppercase shadow-sm">
            Tender workspace
          </div>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f2a47] lg:text-4xl">
            Good morning, review with confidence
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            AI suggestions highlight key insights. Always verify details against
            the original tender document.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon="▰"
            title="Active tenders"
            value={String(tenders.length)}
            caption="Your tenders"
            tone="blue"
          />

          <StatCard
            icon="!"
            title="Needs review"
            value={String(needsReview)}
            caption="Attention required"
            tone="amber"
          />

          <StatCard
            icon="▤"
            title="Drafts"
            value={String(drafts)}
            caption="Not yet analyzed"
            tone="green"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold text-[#0f2a47]">Your tenders</h2>
          </div>

          <div className="p-5">
            {errorMessage && (
              <div className="space-y-3">
                <Banner variant="error">{errorMessage}</Banner>

                <Button type="button" onClick={() => void loadTenders()}>
                  Try again
                </Button>
              </div>
            )}

            {!errorMessage && isLoading && <DashboardSkeleton />}

            {!errorMessage && !isLoading && tenders.length === 0 && (
              <EmptyState
                title="Upload your first tender"
                description="Create a tender workspace to start organizing its requirements and documents."
                action={
                  <Link
                    href="/tenders/new"
                    className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Create tender
                  </Link>
                }
              />
            )}

            {!errorMessage &&
              !isLoading &&
              tenders.length > 0 &&
              visibleTenders.length === 0 && (
                <EmptyState
                  title="No matching tenders"
                  description="Try a different title, issuer, or reference keyword."
                />
              )}

            {!errorMessage && !isLoading && visibleTenders.length > 0 && (
              <>
                <div className="hidden md:block">
                  <Table>
                    <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold">
                          Tender title
                        </th>
                        <th className="px-4 py-3 font-semibold">Issuer</th>
                        <th className="px-4 py-3 font-semibold">Deadline</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleTenders.map((tender) => (
                        <tr
                          key={tender.id}
                          className="group cursor-pointer border-b border-slate-100 transition duration-200 last:border-0 hover:bg-blue-50/60"
                        >
                          <td className="px-4 py-4">
                            <Link
                              href={`/tenders/${tender.id}`}
                              className="flex items-center gap-3"
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl transition duration-200 group-hover:scale-110 group-hover:bg-blue-100 group-hover:shadow-md">
                                📄
                              </span>

                              <span>
                                <span className="block font-semibold text-slate-800 transition-colors group-hover:text-blue-700">
                                  {tender.title}
                                </span>

                                <span className="text-xs text-slate-500">
                                  {tender.reference || "No reference"}
                                </span>
                              </span>
                            </Link>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {tender.issuerName}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {formatDate(tender.deadlineAt)}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge status={tender.status} />
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-500">
                            {formatDate(tender.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {visibleTenders.map((tender) => (
                    <Link
                      key={tender.id}
                      href={`/tenders/${tender.id}`}
                      className="group block rounded-xl border border-slate-200 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800 transition-colors group-hover:text-blue-700">
                            {tender.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {tender.reference || "No reference"} ·{" "}
                            {tender.issuerName}
                          </p>
                        </div>

                        <StatusBadge status={tender.status} />
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Deadline: {formatDate(tender.deadlineAt)}
                      </p>
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
