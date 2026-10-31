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
import { Badge, Banner, Button, EmptyState, Skeleton } from "@/components/ui";

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
    status: TenderStatus;
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
    status: TenderStatus;
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
    status: TenderStatus;
    stage: string | null;
  };
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
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}

function stageLabel(stage: string | null) {
  if (stage === "QUEUED") {
    return "Waiting to start";
  }

  if (stage === "EXTRACTING_TEXT") {
    return "Extracting text from the PDF";
  }

  if (stage === "TEXT_EXTRACTED") {
    return "Text extraction complete";
  }

  if (stage === "TEXT_EXTRACTION_FAILED") {
    return "Text extraction failed";
  }

  return stage || "Waiting for processing";
}

function errorLabel(errorCode: string | null) {
  if (errorCode === "PASSWORD_PROTECTED_PDF") {
    return "This PDF is password-protected and cannot be processed.";
  }

  if (errorCode === "CORRUPT_PDF") {
    return "This PDF could not be opened.";
  }

  if (errorCode === "TOO_MANY_PAGES") {
    return "This PDF contains more than 150 pages.";
  }

  if (errorCode === "NO_READABLE_TEXT") {
    return "No readable text was found. Scanned PDFs are not supported yet.";
  }

  if (errorCode === "PAGE_EXTRACTION_FAILED") {
    return "Text could not be extracted from one of the pages.";
  }

  if (errorCode === "TEXT_EXTRACTION_FAILED") {
    return "Text extraction failed unexpectedly.";
  }

  return errorCode;
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Document processing
          </p>

          <h2 className="mt-1 text-lg font-bold text-[#0f2a47]">
            {stageLabel(tender.stage)}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {tender.status === "PROCESSING"
              ? "The page will update automatically while the PDF is being processed."
              : tender.status === "DRAFT"
                ? "The PDF text is ready for review. AI requirement analysis comes in the next stage."
                : tender.status === "ATTENTION_REQUIRED"
                  ? "Some pages need your attention before analysis can continue."
                  : tender.status === "PROCESSING_FAILED"
                    ? "The PDF could not be processed."
                    : "Document status is ready for the next workflow step."}
          </p>
        </div>

        <StatusBadge status={tender.status} />
      </div>

      {tender.status === "PROCESSING" && (
        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Checking status every 3 seconds…
        </div>
      )}

      {tender.errorCode && (
        <div className="mt-4">
          <Banner variant="warning">
            {errorLabel(tender.errorCode)}
          </Banner>
        </div>
      )}

      {canRetry && (
        <Button
          type="button"
          className="mt-4"
          onClick={onRetry}
          disabled={isStarting}
        >
          {isStarting ? "Retrying..." : "Retry processing"}
        </Button>
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
  const [activeTab, setActiveTab] = useState("Requirements");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingProcessing, setIsStartingProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

    const timeoutId = window.setTimeout(() => {
      void loadPage(currentPage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentPage, loadPage, tender?.id, tender?.status]);

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
      setErrorMessage("Unable to connect to the server. Please try again.");
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
          <Banner variant="error">{errorMessage || "Tender not found."}</Banner>

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600"
          >
            ← Back to dashboard
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
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600"
        >
          ← Back to tenders
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

        <ProcessingPanel
          tender={tender}
          isStarting={isStartingProcessing}
          onRetry={() => void startProcessing()}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">
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
              className={`min-h-12 border-b-2 px-4 text-sm font-semibold whitespace-nowrap ${activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Banner variant="warning">
          AI results can be wrong. Check important items against the original
          tender document.
        </Banner>

        {activeTab === "Requirements" && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    Source document
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-[#0f2a47]">
                    Page text viewer
                  </h2>
                </div>

                <p className="text-sm font-semibold text-slate-500">
                  {pageCount > 0
                    ? `Page ${currentPage} of ${pageCount}`
                    : "No pages available"}
                </p>
              </div>

              {pageError && (
                <div className="mt-4">
                  <Banner variant="error">{pageError}</Banner>
                </div>
              )}

              <div className="mt-5 min-h-64 rounded-xl border border-slate-200 bg-slate-50 p-5">
                {isPageLoading && (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-9/12" />
                  </div>
                )}

                {!isPageLoading && !page && !pageError && (
                  <EmptyState
                    title="Pages are not available yet"
                    description="Pages will appear after PDF processing finishes."
                  />
                )}

                {!isPageLoading && page && (
                  <>
                    {!page.hasText && (
                      <Banner variant="warning">
                        No readable text was found on this page.
                      </Banner>
                    )}

                    <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
                      {page.text || "This page contains no extracted text."}
                    </pre>
                  </>
                )}
              </div>

              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isPageLoading ||
                    currentPage <= 1 ||
                    pageCount === 0
                  }
                  onClick={() =>
                    setCurrentPage((value) => Math.max(1, value - 1))
                  }
                >
                  ← Previous page
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isPageLoading ||
                    pageCount === 0 ||
                    currentPage >= pageCount
                  }
                  onClick={() =>
                    setCurrentPage((value) =>
                      Math.min(pageCount, value + 1),
                    )
                  }
                >
                  Next page →
                </Button>
              </div>
            </section>

            <TabPlaceholder
              title="Requirements analysis comes next"
              description="The extracted source pages are ready. AI requirement extraction will be implemented in Days 9–11."
            />
          </>
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