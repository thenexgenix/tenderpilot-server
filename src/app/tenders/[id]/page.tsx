"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Skeleton,
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
  notes: string | null;
  status: TenderStatus;
  stage: string | null;
  errorCode: string | null;
  createdAt: string;
};

type TenderResponse = {
  data?: Tender;
  error?: {
    message?: string;
  };
};

const tabs = ["Requirements", "Checklist", "Draft", "Export"];

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
  return (
    <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
  );
}

function TabPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-5">
      <EmptyState title={title} description={description} />
    </section>
  );
}

function TenderDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenderId = params.id;

  const [tender, setTender] = useState<Tender | null>(null);
  const [activeTab, setActiveTab] = useState("Requirements");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTender = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as TenderResponse;

      if (!response.ok) {
        setErrorMessage(
          result.error?.message ?? "Tender not found.",
        );
        return;
      }

      setTender(result.data ?? null);
    } catch {
      setErrorMessage(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTender();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTender]);
  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this tender? It will be removed from your dashboard.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tenders/${tenderId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as TenderResponse;

      if (!response.ok) {
        setErrorMessage(
          result.error?.message ?? "Unable to delete the tender.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!tender) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-5">
          <Banner variant="error">
            {errorMessage || "Tender not found."}
          </Banner>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600"
        >
          ← Tenders
        </Link>

        {errorMessage && <Banner variant="error">{errorMessage}</Banner>}

        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {tender.reference || "No reference"}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#0f2a47]">
              {tender.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {tender.issuerName} · Deadline:{" "}
              {formatDate(tender.deadlineAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={tender.status} />

            <Button
              type="button"
              variant="danger"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete tender"}
            </Button>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Notes
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {tender.notes || "No notes added."}
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Created: {formatDate(tender.createdAt)}
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-12 whitespace-nowrap border-b-2 px-4 text-sm font-semibold ${activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Banner variant="warning">
          AI results can be wrong. Check important items against the
          original tender document.
        </Banner>

        {activeTab === "Requirements" && (
          <TabPlaceholder
            title="No requirements yet"
            description="PDF upload and text extraction will be implemented in the next Day 6–8 stages."
          />
        )}

        {activeTab === "Checklist" && (
          <TabPlaceholder
            title="Checklist is not available yet"
            description="The checklist will be created after requirements are extracted."
          />
        )}

        {activeTab === "Draft" && (
          <TabPlaceholder
            title="Draft generation is not available yet"
            description="Draft generation will be implemented after the requirements workflow."
          />
        )}

        {activeTab === "Export" && (
          <TabPlaceholder
            title="Export is not available yet"
            description="DOCX export will be implemented after draft editing."
          />
        )}
      </div>
    </AppShell>
  );
}

function TenderDetailsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </AppShell>
  );
}

export default function TenderDetailsPage() {
  return (
    <Suspense fallback={<TenderDetailsLoading />}>
      <TenderDetailsContent />
    </Suspense>
  );
}