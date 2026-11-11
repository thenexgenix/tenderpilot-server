"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Banner,
  EmptyState,
  Skeleton,
  StatusBadge,
  type TenderStatusKey,
} from "@/components/ui";
import { RequirementsTab } from "@/components/requirements-tab";
import { ChecklistTab } from "@/components/checklist-tab";
import { DraftTab } from "@/components/draft-tab";
import { ExportTab } from "@/components/export-tab";

type Tender = {
  id: string;
  title: string;
  issuerName: string;
  reference: string | null;
  deadlineAt: string | null;
  notes: string | null;
  status: TenderStatusKey;
  stage: string | null;
  errorCode: string | null;
  createdAt: string;
};

type TenderPage = {
  pageNumber: number;
  text: string;
  characterCount: number;
  hasText: boolean;
  extractionStatus: string;
  errorCode: string | null;
};

type TenderResponse = {
  data?: Tender;
  error?: {
    message?: string;
  };
};

type StatusResponse = {
  data?: {
    tenderId: string;
    status: TenderStatusKey;
    stage: string | null;
    errorCode: string | null;
    pageCount: number;
    pagesWithText: number;
    pagesWithoutText: number;
  };
  error?: {
    message?: string;
  };
};

type PageResponse = {
  data?: {
    tenderId: string;
    status: TenderStatusKey;
    stage: string | null;
    errorCode: string | null;
    pageCount: number;
    page: TenderPage | null;
  };
  error?: {
    message?: string;
  };
};

type ProcessResponse = {
  data?: {
    tenderId: string;
    status: TenderStatusKey;
    stage: string | null;
  };
  error?: {
    message?: string;
  };
};

const tabs = ["Requirements", "Checklist", "Draft", "Export"] as const;
type TabName = (typeof tabs)[number];

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

/* User-facing description for current document processing stages */
function stageLabel(stage: string | null): string {
  if (stage === "QUEUED") {
    return "Waiting in processing queue";
  }
  if (stage === "EXTRACTING_TEXT") {
    return "Extracting vector text from PDF";
  }
  if (stage === "TEXT_EXTRACTED") {
    return "Text extraction complete";
  }
  if (stage === "TEXT_EXTRACTION_FAILED") {
    return "Text extraction failed";
  }
  if (stage === "ANALYZING_REQUIREMENTS") {
    return "Analyzing and categorizing requirements";
  }
  if (stage === "REQUIREMENTS_VERIFIED") {
    return "Requirements verified against source text";
  }

  return stage || "Waiting for processing";
}

/* User-facing error message resolution for PDF processing errors */
function errorLabel(errorCode: string | null): string {
  if (errorCode === "AI_CHUNK_FAILED") {
    return "The AI could not analyze one or more sections of this tender after retrying. The requirements shown below are partial and may be incomplete. Retry processing; if the problem continues, contact support.";
  }
  if (errorCode === "AI_PROCESSING_FAILED") {
    return "The AI analysis could not be completed because of a processing error. Retry processing; if it continues, check the server's AI provider configuration and logs.";
  }
  if (errorCode === "AI_MALFORMED_RESPONSE") {
    return "The AI returned an invalid response while analyzing this tender. Retry processing; if it continues, check the server's AI provider configuration and logs.";
  }
  if (errorCode === "AI_LIMIT_REACHED" || errorCode === "DAILY_ANALYSIS_LIMIT_REACHED") {
    return "Today's AI analysis limit has been reached. Try again tomorrow.";
  }
  if (errorCode === "PASSWORD_PROTECTED_PDF") {
    return "This PDF is password-protected and cannot be processed.";
  }
  if (errorCode === "CORRUPT_PDF") {
    return "This PDF file could not be opened.";
  }
  if (errorCode === "TOO_MANY_PAGES") {
    return "This PDF exceeds the 150-page processing limit.";
  }
  if (errorCode === "NO_READABLE_TEXT") {
    return "No selectable vector text was detected. Scanned documents must be processed with OCR first.";
  }
  if (errorCode === "PAGE_EXTRACTION_FAILED") {
    return "Text could not be extracted from one of the document pages.";
  }
  if (errorCode === "TEXT_EXTRACTION_FAILED") {
    return "Text extraction failed unexpectedly.";
  }

  return errorCode || "An unexpected error occurred during processing.";
}

/* Four-stage workflow stepper component illustrating progress through the proposal pipeline */
function PipelineStepper({
  status,
  stage,
}: {
  status: TenderStatusKey;
  stage: string | null;
}) {
  const isIngested = status !== "DRAFT" || stage === "TEXT_EXTRACTED";
  const isAnalyzed =
    status === "ANALYZED" ||
    stage === "REQUIREMENTS_VERIFIED" ||
    status === "ATTENTION_REQUIRED";

  const steps = [
    {
      id: "1",
      name: "PDF Ingestion",
      isComplete: isIngested,
      isCurrent: status === "DRAFT" && stage !== "TEXT_EXTRACTED",
    },
    {
      id: "2",
      name: "Requirement Extraction",
      isComplete: isAnalyzed,
      isCurrent: status === "PROCESSING",
    },
    {
      id: "3",
      name: "Compliance Audit",
      isComplete: isAnalyzed,
      isCurrent: isAnalyzed && status !== "PROCESSING_FAILED",
    },
    {
      id: "4",
      name: "Proposal & Export",
      isComplete: false,
      isCurrent: isAnalyzed,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 border-l-2 pl-3 transition-colors sm:border-l-0 sm:border-t-2 sm:pt-2 sm:pl-0"
              style={{
                borderColor: step.isComplete
                  ? "#059669"
                  : step.isCurrent
                  ? "#2563eb"
                  : "#e2e8f0",
              }}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.isComplete
                    ? "bg-emerald-100 text-emerald-800"
                    : step.isCurrent
                    ? "bg-blue-100 text-blue-800 animate-pulse"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.isComplete ? "✓" : index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#0f2a47]">
                  {step.name}
                </p>
                <p className="text-[10px] font-medium text-slate-400">
                  {step.isComplete
                    ? "Complete"
                    : step.isCurrent
                    ? "Active Phase"
                    : "Upcoming"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Document processing panel providing real-time stage progress and retry capabilities */
function ProcessingPanel({
  tender,
  isStarting,
  onRetry,
}: {
  tender: Tender;
  isStarting: boolean;
  onRetry: () => void;
}) {
  const canRetry =
    tender.status === "PROCESSING_FAILED" ||
    tender.status === "ATTENTION_REQUIRED";

  /* When analysis is fully complete, renders a concise verification indicator */
  if (tender.status === "ANALYZED") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">
              Analysis Verified & Source-Grounded
            </h3>
            <p className="text-xs text-emerald-800">
              All extracted clauses have been verified against original PDF text with exact page numbers.
            </p>
          </div>
        </div>
        <StatusBadge status={tender.status} />
      </div>
    );
  }

  if (tender.status !== "PROCESSING") {
    const isHardFailure = tender.status === "PROCESSING_FAILED";

    return (
      <section
        className={`rounded-xl border p-5 shadow-2xs ${
          isHardFailure
            ? "border-red-200 bg-red-50/40"
            : "border-amber-200 bg-amber-50/40"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className={`text-xs font-semibold tracking-wider uppercase ${
                isHardFailure ? "text-red-700" : "text-amber-800"
              }`}
            >
              {isHardFailure ? "Processing failed" : "Review needed"}
            </p>
            <h2 className="mt-1 text-base font-bold text-[#0f2a47]">
              {isHardFailure
                ? "The tender could not be analyzed"
                : "Analysis is incomplete"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {isHardFailure
                ? "No new requirements were produced by this processing attempt. Retry processing to try again."
                : "Some parts of the tender were analyzed, but the result is not complete. Do not rely on it until processing succeeds."}
            </p>
          </div>

          <StatusBadge status={tender.status} />
        </div>

        {tender.errorCode && (
          <div className="mt-4">
            <Banner
              variant={
                isHardFailure || tender.errorCode === "AI_CHUNK_FAILED"
                  ? "error"
                  : "warning"
              }
            >
              {errorLabel(tender.errorCode)}
            </Banner>
          </div>
        )}

        {canRetry && (
          <div className="mt-4 flex justify-end border-t border-slate-200/80 pt-3">
            <button
              type="button"
              onClick={onRetry}
              disabled={isStarting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white shadow-2xs border-t border-blue-400/30 hover:from-[#1d4ed8] hover:to-[#1742b6] disabled:opacity-50 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isStarting ? "Retrying…" : "Retry Processing"}</span>
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <span>Document Processing</span>
          </div>

          <h2 className="mt-1 text-base font-bold text-[#0f2a47]">
            {stageLabel(tender.stage)}
          </h2>

          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Background engine is reading clauses. Updates automatically every 3 seconds.
          </p>
        </div>

        <StatusBadge status={tender.status} />
      </div>

      {tender.status === "PROCESSING" && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-medium text-blue-700">
          <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Polling server pipeline every 3 seconds…</span>
        </div>
      )}

    </section>
  );
}

function TenderDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenderId = params.id;

  const [tender, setTender] = useState<Tender | null>(null);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: TabName =
    tabFromUrl && (tabs as readonly string[]).includes(tabFromUrl)
      ? (tabFromUrl as TabName)
      : "Requirements";

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingProcessing, setIsStartingProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [draftHasUnsavedChanges, setDraftHasUnsavedChanges] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPageViewer, setShowPageViewer] = useState(false);

  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [page, setPage] = useState<TenderPage | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const processingStartedRef = useRef(false);

  const loadTender = useCallback(
    async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const response = await fetch(`/api/tenders/${tenderId}`, {
          cache: "no-store",
        });

        const result = (await response.json()) as TenderResponse;

        if (!response.ok) {
          setErrorMessage(result.error?.message ?? "Tender not found.");
          return;
        }

        setTender(result.data ?? null);
      } catch {
        setErrorMessage("Unable to connect to the server. Please try again.");
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [tenderId],
  );

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/status`, {
        cache: "no-store",
      });

      const result = (await response.json()) as StatusResponse;

      if (!response.ok) {
        setErrorMessage(
          result.error?.message ?? "Unable to load processing status.",
        );
        return;
      }

      if (!result.data) {
        return;
      }

      setPageCount(result.data.pageCount);

      setTender((currentTender) => {
        if (!currentTender) {
          return currentTender;
        }

        return {
          ...currentTender,
          status: result.data!.status,
          stage: result.data!.stage,
          errorCode: result.data!.errorCode,
        };
      });
    } catch {
      setErrorMessage("Unable to refresh processing status.");
    }
  }, [tenderId]);

  const startProcessing = useCallback(async () => {
    setIsStartingProcessing(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tenders/${tenderId}/process`, {
        method: "POST",
      });

      const result = (await response.json()) as ProcessResponse;

      if (!response.ok) {
        setErrorMessage(
          result.error?.message ?? "Unable to start PDF processing.",
        );
        return;
      }

      if (result.data) {
        setTender((currentTender) => {
          if (!currentTender) {
            return currentTender;
          }

          return {
            ...currentTender,
            status: result.data!.status,
            stage: result.data!.stage,
            errorCode: null,
          };
        });
      }

      await loadStatus();
    } catch {
      setErrorMessage("Unable to connect to the server. Please try again.");
    } finally {
      setIsStartingProcessing(false);
    }
  }, [loadStatus, tenderId]);

  const loadPage = useCallback(
    async (pageNumber: number) => {
      setIsPageLoading(true);
      setPageError("");

      try {
        const response = await fetch(
          `/api/tenders/${tenderId}/pages?page=${pageNumber}`,
          {
            cache: "no-store",
          },
        );

        const result = (await response.json()) as PageResponse;

        if (!response.ok) {
          setPageError(
            result.error?.message ?? "Unable to load this document page.",
          );
          setPage(null);
          return;
        }

        if (!result.data) {
          setPageError("The document page response was empty.");
          setPage(null);
          return;
        }

        setPageCount(result.data.pageCount);
        setPage(result.data.page);
      } catch {
        setPageError("Unable to connect while loading the document page.");
        setPage(null);
      } finally {
        setIsPageLoading(false);
      }
    },
    [tenderId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTender(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTender]);

  useEffect(() => {
    if (!tender?.id) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [tender?.id, loadStatus]);

  useEffect(() => {
    if (
      !tender ||
      searchParams.get("startProcessing") !== "1" ||
      processingStartedRef.current
    ) {
      return;
    }

    processingStartedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      router.replace(`/tenders/${tenderId}`);
      void startProcessing();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    router,
    searchParams,
    startProcessing,
    tender,
    tenderId,
  ]);

  useEffect(() => {
    if (tender?.status !== "PROCESSING") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStatus, tender?.status]);

  useEffect(() => {
    if (
      tender?.status !== "DRAFT" &&
      tender?.status !== "ANALYZED" &&
      tender?.status !== "ATTENTION_REQUIRED"
    ) {
      return;
    }

    if (!showPageViewer) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPage(currentPage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentPage, loadPage, showPageViewer, tender?.id, tender?.status]);

  function handleTabChange(tab: TabName) {
    if (draftHasUnsavedChanges && tab !== "Draft") {
      const confirmed = window.confirm(
        "You have unsaved draft changes. Leave without saving?",
      );

      if (!confirmed) {
        return;
      }
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (tab === "Requirements") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    const query = nextParams.toString();
    router.replace(`/tenders/${tenderId}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this tender workspace? All extracted requirements and compliance data will be removed.",
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
      setErrorMessage("Unable to connect to the server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!tender) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-5 py-8 text-center">
          <Banner variant="error">{errorMessage || "Tender document not found."}</Banner>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition"
          >
            <svg
              className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Tenders</span>
          </Link>

          <span className="font-mono text-xs text-slate-400">
            ID: {tender.id.slice(0, 8)}…
          </span>
        </div>

        {errorMessage && <Banner variant="error">{errorMessage}</Banner>}

        {/* Workspace Title & Actions Header */}
        <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-blue-100/80 px-2 py-0.5 font-mono text-xs font-bold text-blue-800">
                {tender.reference || "No Reference Specified"}
              </span>
              <StatusBadge status={tender.status} />
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0f2a47] sm:text-3xl">
              {tender.title}
            </h1>

            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <span>{tender.issuerName}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Submission Deadline: {formatDate(tender.deadlineAt)}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{isDeleting ? "Deleting…" : "Delete"}</span>
            </button>
          </div>
        </section>

        {/* 4-Stage Lifecycle Stepper */}
        <PipelineStepper status={tender.status} stage={tender.stage} />

        {/* Processing Notification / Status Alert */}
        <ProcessingPanel
          tender={tender}
          isStarting={isStartingProcessing}
          onRetry={() => void startProcessing()}
        />

        {/* Collapsible Notes Disclosure */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowNotes((current) => !current)}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showNotes ? "rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Tender Notes & Context</span>
              {tender.notes && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                  Notes available
                </span>
              )}
            </button>

            <span className="text-[11px] text-slate-400">
              Created: {formatDate(tender.createdAt)}
            </span>
          </div>

          {showNotes && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {tender.notes || "No context notes provided for this tender."}
              </p>
            </div>
          )}
        </div>

        {/* Workspace Tab Bar with Vector Icons */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;

            const tabIcons = {
              Requirements: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
              Checklist: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              Draft: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ),
              Export: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              ),
            };

            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`relative flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {tabIcons[tab]}
                <span>{tab}</span>
                {tab === "Draft" && draftHasUnsavedChanges && (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500"
                    title="You have unsaved draft edits."
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Global Verification Disclaimer Banner */}
        <Banner variant="warning">
          AI suggestions highlight key tender insights. Always cross-verify critical specifications and submission criteria against the original PDF.
        </Banner>

        {/* Tab 1: Requirements Analysis */}
        {activeTab === "Requirements" && (
          <div className="space-y-6">
            {/* Toggleable Page Text Viewer Accordion */}
            <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowPageViewer((current) => !current)}
                  className="flex items-center gap-2 text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        showPageViewer ? "rotate-90" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0f2a47]">
                      Raw PDF Page Text Inspector
                    </h3>
                    <p className="text-xs text-slate-400">
                      {showPageViewer ? "Click to collapse" : "Click to expand extracted source pages"}
                    </p>
                  </div>
                </button>

                <p className="text-xs font-semibold text-slate-500">
                  {pageCount > 0 ? `Page ${currentPage} of ${pageCount}` : "No pages indexed"}
                </p>
              </div>

              {showPageViewer && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {pageError && (
                    <div className="mb-4">
                      <Banner variant="error">{pageError}</Banner>
                    </div>
                  )}

                  <div className="min-h-56 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    {isPageLoading && (
                      <div className="space-y-2.5">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-10/12" />
                        <Skeleton className="h-4 w-9/12" />
                      </div>
                    )}

                    {!isPageLoading && !page && !pageError && (
                      <EmptyState
                        title="Document pages not ready"
                        description="Pages will appear once PDF text parsing completes."
                      />
                    )}

                    {!isPageLoading && page && (
                      <>
                        {!page.hasText && (
                          <Banner variant="warning">
                            No selectable vector text was found on page {currentPage}.
                          </Banner>
                        )}

                        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                          {page.text || "This page contains no extracted text."}
                        </pre>
                      </>
                    )}
                  </div>

                  {/* Compact Pagination Controls */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={isPageLoading || currentPage <= 1 || pageCount === 0}
                      onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Previous Page</span>
                    </button>

                    <span className="text-xs font-medium text-slate-500">
                      Page {currentPage} of {pageCount}
                    </span>

                    <button
                      type="button"
                      disabled={isPageLoading || pageCount === 0 || currentPage >= pageCount}
                      onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      <span>Next Page</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Extracted Requirements Table Component */}
            {tender.errorCode === "AI_CHUNK_FAILED" && (
              <Banner variant="error">
                These requirements come only from the sections the AI processed successfully. The list is incomplete until you retry processing and it finishes without this error.
              </Banner>
            )}
            <RequirementsTab key={tender.status} tenderId={tender.id} />
          </div>
        )}

        {/* Tab 2: Compliance Checklist */}
        {activeTab === "Checklist" && (
          <ChecklistTab key={tender.status} tenderId={tender.id} />
        )}

        {/* Tab 3: Proposal Draft Generation */}
        {activeTab === "Draft" && (
          <DraftTab
            key={tender.id}
            tenderId={tender.id}
            onDirtyChange={setDraftHasUnsavedChanges}
          />
        )}

        {/* Tab 4: DOCX Export */}
        {activeTab === "Export" && <ExportTab tenderId={tender.id} />}
      </div>
    </AppShell>
  );
}

function TenderDetailsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
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
