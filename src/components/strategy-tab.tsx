"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner, EmptyState, Skeleton } from "@/components/ui";

type StrategyData = {
  procurementType: "WORKS" | "GOODS" | "GENERAL";
  referenceCount: number;
  analyzedReferenceCount: number;
  currentRequirementCount: number;
  benchmarkThemes: Array<{
    category: string;
    referenceTenderCount: number;
    referenceRequirementCount: number;
    currentRequirementCount: number;
  }>;
  coverage: Array<{
    displayId: string;
    category: string;
    requirement: string;
    matchedReferenceCount: number;
    matchedReferenceTitles: string[];
    priority: "HIGH" | "MEDIUM" | "STANDARD";
    status: "BENCHMARK_SUPPORTED" | "ACTIVE_TENDER_ONLY";
  }>;
  prioritySignals: Array<{
    displayId: string;
    category: string;
    text: string;
    matchedReferences: string[];
    matchedReferenceCount: number;
    priority: "HIGH" | "MEDIUM" | "STANDARD";
    rationale: string;
  }>;
  evidenceGaps: Array<{
    displayId: string;
    category: string;
    request: string;
    pageNumber: number | null;
  }>;
  winThemes: string[];
  references: Array<{
    id: string;
    title: string;
    issuerName: string;
    sourceType: "PUBLIC_REFERENCE" | "SYNTHETIC_REFERENCE";
    requirementCount: number;
    relevanceScore: number;
    matchedRequirementCount: number;
    selected: boolean;
    selectionReason: string;
  }>;
  disclaimer: string;
};

type StrategyResponse = {
  data?: StrategyData;
  error?: { message?: string };
};

function sourceLabel(
  sourceType: StrategyData["references"][number]["sourceType"],
) {
  return sourceType === "SYNTHETIC_REFERENCE"
    ? "Synthetic benchmark"
    : "Public reference";
}

export function StrategyTab({ tenderId }: { tenderId: string }) {
  const [data, setData] = useState<StrategyData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadStrategy = useCallback(async () => {
    const response = await fetch(`/api/tenders/${tenderId}/intelligence`, {
      cache: "no-store",
    });
    const result = (await response.json()) as StrategyResponse;

    if (!response.ok || !result.data) {
      throw new Error(result.error?.message ?? "Unable to load bid strategy.");
    }

    setData(result.data);
  }, [tenderId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadStrategy();
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load bid strategy.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadStrategy]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </section>
    );
  }

  if (error) {
    return (
      <Banner variant="error">
        <p>{error}</p>
      </Banner>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Bid strategy is unavailable"
        description="Analyze this tender and at least one reference tender first."
      />
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0f2a47]">
            Tender intelligence &amp; bid strategy
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Benchmark patterns from your uploaded reference tenders. These
            signals improve structure and focus; they do not prove a winning
            formula.
          </p>
        </div>

        <div className="grid min-w-72 grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-lg font-bold text-blue-800">
              {data.currentRequirementCount}
            </p>
            <p className="text-blue-700">Current requirements</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-lg font-bold text-indigo-800">
              {data.referenceCount}
            </p>
            <p className="text-indigo-700">Benchmarks</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-lg font-bold text-emerald-800">
              {data.analyzedReferenceCount}
            </p>
            <p className="text-emerald-700">Analyzed</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
            <p className="text-lg font-bold text-violet-800">
              {data.procurementType}
            </p>
            <p className="text-violet-700">Proposal mode</p>
          </div>
        </div>
      </div>

      <Banner variant="warning">
        <p>{data.disclaimer}</p>
      </Banner>

      {data.referenceCount === 0 && (
        <EmptyState
          title="No reference tenders selected"
          description="Upload another tender and mark it as a public reference or synthetic benchmark to unlock comparison signals."
        />
      )}

      {data.referenceCount > 0 && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#0f2a47]">
              Reference relevance
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Only the strongest references influence the proposal guidance. Scores are based on category, requirement, and mandatory-item overlap.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.references.map((reference) => (
                <article
                  key={reference.id}
                  className={`rounded-xl border p-3 ${reference.selected ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/60"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-700">
                      {reference.title}
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">
                      {reference.relevanceScore}% relevant
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {reference.selectionReason}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {reference.selected ? "Selected for guidance" : "Not selected for guidance"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#0f2a47]">
                Recommended win themes
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Positioning prompts generated from recurring benchmark
                categories. Attach real company evidence before submission.
              </p>
              <ol className="mt-4 space-y-3">
                {data.winThemes.map((theme, index) => (
                  <li
                    key={theme}
                    className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#0f2a47]">
                Recurring benchmark themes
              </h3>
              {data.benchmarkThemes.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No recurring categories were found in the analyzed reference
                  tenders.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-96 text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="px-2 py-2 font-semibold">Theme</th>
                        <th className="px-2 py-2 font-semibold">References</th>
                        <th className="px-2 py-2 font-semibold">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.benchmarkThemes.map((theme) => (
                        <tr
                          key={theme.category}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-2 py-3 font-semibold text-slate-700">
                            {theme.category}
                          </td>
                          <td className="px-2 py-3 text-slate-500">
                            {theme.referenceTenderCount} tender(s)
                          </td>
                          <td className="px-2 py-3 text-slate-500">
                            {theme.currentRequirementCount} requirement(s)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#0f2a47]">
              Priority requirements to emphasize
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              These requirements either resemble a benchmark pattern or are
              explicitly mandatory in the active tender.
            </p>
            {data.prioritySignals.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No priority signals were detected yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.prioritySignals.slice(0, 6).map((signal) => (
                  <article
                    key={signal.displayId}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                        {signal.displayId}
                      </span>
                      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        {signal.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {signal.text}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {signal.rationale}
                    </p>
                    {signal.matchedReferences.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-blue-700">
                        Related benchmark: {signal.matchedReferences.join(", ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#0f2a47]">
              Requirement coverage map
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              This map shows which active requirements have related patterns and which remain unique to the current tender.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Requirement</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.coverage.slice(0, 20).map((item) => (
                    <tr key={item.displayId} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3 font-mono text-xs font-bold text-slate-600">
                        {item.displayId}
                      </td>
                      <td className="max-w-xl px-3 py-3 text-slate-700">
                        {item.requirement}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.priority === "HIGH" ? "bg-red-50 text-red-700" : item.priority === "MEDIUM" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {item.status === "BENCHMARK_SUPPORTED"
                          ? `${item.matchedReferenceCount} related reference(s)`
                          : "Active tender only"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#0f2a47]">
              Evidence gaps to resolve
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              These are tender requirements that commonly need company-specific
              documents or verified facts.
            </p>
            {data.evidenceGaps.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No evidence-sensitive requirements were detected.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {data.evidenceGaps.map((gap) => (
                  <li
                    key={gap.displayId}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <p className="text-xs font-bold tracking-wide text-amber-800 uppercase">
                      {gap.displayId} · {gap.category}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {gap.request}
                    </p>
                    {gap.pageNumber && (
                      <p className="mt-2 text-xs text-amber-800">
                        Source page: {gap.pageNumber}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#0f2a47]">
              Uploaded benchmark sources
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.references.map((reference) => (
                <div
                  key={reference.id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-700">
                      {reference.title}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {sourceLabel(reference.sourceType)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {reference.issuerName} · {reference.requirementCount} extracted requirement(s)
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
