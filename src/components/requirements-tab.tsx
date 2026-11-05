"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Banner, EmptyState, Skeleton } from "@/components/ui";
import { KeyFactsPanel } from "@/components/key-facts-panel";
import { RequirementReviewActions } from "@/components/requirement-review-actions";
import { AddManualRequirement } from "@/components/add-manual-requirement";

type Requirement = {
    id: string;
    displayId: string;
    category: string;
    text: string;
    explanation: string | null;
    obligation: string;
    pageNumber: number | null;
    quote: string | null;
    verification: string;
    origin: string;
    checkStatus: string;
    checkNote: string | null;
};

type RequirementsResponse = {
    data?: {
        requirements: Requirement[];
    };
    error?: {
        message?: string;
    };
};

type SourcePage = {
    pageNumber: number;
    text: string;
};

type PageResponse = {
    data?: {
        page: SourcePage | null;
    };
    error?: {
        message?: string;
    };
};

export function RequirementsTab({
    tenderId,
}: {
    tenderId: string;
}) {
    const [requirements, setRequirements] =
        useState<Requirement[]>([]);
    const [category, setCategory] = useState("");
    const [obligation, setObligation] = useState("");
    const [verification, setVerification] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedRequirement, setSelectedRequirement] =
        useState<Requirement | null>(null);
    const [sourcePage, setSourcePage] =
        useState<SourcePage | null>(null);
    const [sourceLoading, setSourceLoading] =
        useState(false);
    const [sourceError, setSourceError] =
        useState("");

    function handleRequirementSelect(
        requirement: Requirement,
    ) {
        setSelectedRequirement(requirement);
        setSourcePage(null);
        setSourceError("");
    }

    function handleRequirementUpdated(
        updatedRequirement: Requirement,
    ) {
        setRequirements((current) =>
            current.map((requirement) =>
                requirement.id === updatedRequirement.id
                    ? updatedRequirement
                    : requirement,
            ),
        );

        setSelectedRequirement((current) =>
            current?.id === updatedRequirement.id
                ? updatedRequirement
                : current,
        );

        setSourcePage(null);
        setSourceError("");
    }

    function handleRequirementCreated(
        createdRequirement: Requirement,
    ) {
        setRequirements((current) => [
            ...current,
            createdRequirement,
        ]);

        setSelectedRequirement(null);
        setSourcePage(null);
        setSourceError("");
    }

    const loadSourcePage = useCallback(
        async (pageNumber: number) => {
            setSourceLoading(true);
            setSourceError("");

            try {
                const response = await fetch(
                    `/api/tenders/${tenderId}/pages?page=${pageNumber}`,
                );

                const result =
                    (await response.json()) as PageResponse;

                if (!response.ok) {
                    throw new Error(
                        result.error?.message ??
                        "Source page could not be loaded.",
                    );
                }

                setSourcePage(result.data?.page ?? null);
            } catch (requestError) {
                setSourceError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Source page could not be loaded.",
                );
                setSourcePage(null);
            } finally {
                setSourceLoading(false);
            }
        },
        [tenderId],
    );

    useEffect(() => {
        if (!selectedRequirement?.pageNumber) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void loadSourcePage(
                selectedRequirement.pageNumber as number,
            );
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        loadSourcePage,
        selectedRequirement?.id,
        selectedRequirement?.pageNumber,
    ]);

    useEffect(() => {
        if (!selectedRequirement?.id) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            document
                .getElementById("requirement-source-evidence")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [selectedRequirement?.id]);

    const loadRequirements = useCallback(async () => {
        setIsLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (category) {
            params.set("category", category);
        }

        if (obligation) {
            params.set("obligation", obligation);
        }

        if (verification) {
            params.set("verification", verification);
        }

        try {
            const query = params.toString();
            const response = await fetch(
                `/api/tenders/${tenderId}/requirements${query ? `?${query}` : ""
                }`,
            );

            const result =
                (await response.json()) as RequirementsResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Requirements could not be loaded.",
                );
            }

            setRequirements(result.data?.requirements ?? []);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Requirements could not be loaded.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        category,
        obligation,
        tenderId,
        verification,
    ]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadRequirements();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadRequirements]);

    const categories = useMemo(
        () =>
            Array.from(
                new Set(
                    requirements
                        .map((requirement) => requirement.category)
                        .filter(Boolean),
                ),
            ).sort(),
        [requirements],
    );

    const verifiedCount = requirements.filter(
        (requirement) =>
            requirement.verification === "VERIFIED",
    ).length;

    const unverifiedCount = requirements.filter(
        (requirement) =>
            requirement.verification === "UNVERIFIED",
    ).length;

    return (
        <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    label="Total requirements"
                    value={requirements.length}
                />
                <SummaryCard
                    label="Verified"
                    value={verifiedCount}
                    tone="green"
                />
                <SummaryCard
                    label="Needs review"
                    value={unverifiedCount}
                    tone="amber"
                />
            </div>

            <KeyFactsPanel tenderId={tenderId} />

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex justify-end">
                    <AddManualRequirement
                        tenderId={tenderId}
                        onCreated={handleRequirementCreated}
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={category}
                        onChange={(event) =>
                            setCategory(event.target.value)
                        }
                        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                        <option value="">All categories</option>
                        {categories.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    <select
                        value={obligation}
                        onChange={(event) =>
                            setObligation(event.target.value)
                        }
                        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                        <option value="">All obligations</option>
                        <option value="MANDATORY">Mandatory</option>
                        <option value="OPTIONAL">Optional</option>
                        <option value="UNCLEAR">Unclear</option>
                    </select>

                    <select
                        value={verification}
                        onChange={(event) =>
                            setVerification(event.target.value)
                        }
                        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                        <option value="">All verification</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="UNVERIFIED">Unverified</option>
                    </select>
                </div>
            </div>

            {error && <Banner variant="error">{error}</Banner>}

            {isLoading && (
                <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}

            {!isLoading && !error && requirements.length === 0 && (
                <EmptyState
                    title="No requirements found"
                    description="The document did not produce requirements for the selected filters."
                />
            )}

            {!isLoading && requirements.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Requirement</th>
                                    <th className="px-4 py-3">Obligation</th>
                                    <th className="px-4 py-3">Page</th>
                                    <th className="px-4 py-3">Verification</th>
                                    <th className="px-4 py-3">Review</th>
                                </tr>
                            </thead>

                            <tbody>
                                {requirements.map((requirement) => (
                                    <tr
                                        key={requirement.id}
                                        onClick={() =>
                                            handleRequirementSelect(requirement)
                                        }
                                        className="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50/50 last:border-0"
                                    >
                                        <td className="px-4 py-4 font-mono text-xs text-slate-500">
                                            {requirement.displayId}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-slate-600">
                                            {requirement.category}
                                        </td>
                                        <td className="max-w-xl px-4 py-4 text-slate-700">
                                            {requirement.text}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge>
                                                {requirement.obligation}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">
                                            {requirement.pageNumber
                                                ? `Page ${requirement.pageNumber}`
                                                : "NOT FOUND"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge
                                                tone={
                                                    requirement.verification ===
                                                        "VERIFIED"
                                                        ? "green"
                                                        : "amber"
                                                }
                                            >
                                                {requirement.verification}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <RequirementReviewActions
                                                requirement={requirement}
                                                onUpdated={handleRequirementUpdated}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                        {requirements.map((requirement) => (
                            <article
                                key={requirement.id}
                                onClick={() =>
                                    handleRequirementSelect(requirement)
                                }
                                role="button"
                                tabIndex={0}
                                className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-mono text-xs text-slate-500">
                                        {requirement.displayId}
                                    </span>

                                    <StatusBadge
                                        tone={
                                            requirement.verification ===
                                                "VERIFIED"
                                                ? "green"
                                                : "amber"
                                        }
                                    >
                                        {requirement.verification}
                                    </StatusBadge>
                                </div>

                                <p className="mt-3 font-semibold text-slate-800">
                                    {requirement.text}
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                    {requirement.category} ·{" "}
                                    {requirement.obligation} ·{" "}
                                    {requirement.pageNumber
                                        ? `Page ${requirement.pageNumber}`
                                        : "Page not found"}
                                </p>

                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <RequirementReviewActions
                                        requirement={requirement}
                                        onUpdated={handleRequirementUpdated}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                </>

            )}
            {selectedRequirement && (
                <section
                    id="requirement-source-evidence"
                    className="scroll-mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase">
                                Source evidence
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-[#0f2a47]">
                                {selectedRequirement.displayId}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Page{" "}
                                {selectedRequirement.pageNumber ??
                                    "not available"}{" "}
                                · {selectedRequirement.verification}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedRequirement(null)}
                            className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>

                    {sourceError && (
                        <div className="mt-4">
                            <Banner variant="error">{sourceError}</Banner>
                        </div>
                    )}

                    {sourceLoading && (
                        <div className="mt-5 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-10/12" />
                        </div>
                    )}

                    {!sourceLoading && sourcePage && (
                        <pre className="mt-5 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-700">
                            {renderHighlightedText(
                                sourcePage.text,
                                selectedRequirement.quote,
                            )}
                        </pre>
                    )}

                    {!sourceLoading &&
                        !sourceError &&
                        !sourcePage && (
                            <p className="mt-5 text-sm text-slate-500">
                                Source page text is not available.
                            </p>
                        )}
                </section>
            )}

        </section>

    );
}

function SummaryCard({
    label,
    value,
    tone = "blue",
}: {
    label: string;
    value: number;
    tone?: "blue" | "green" | "amber";
}) {
    const styles = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {label}
            </p>
            <p
                className={`mt-2 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${styles[tone]}`}
            >
                {value}
            </p>
        </div>
    );
}

function StatusBadge({
    children,
    tone = "blue",
}: {
    children: string;
    tone?: "blue" | "green" | "amber";
}) {
    const styles = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}
        >
            {children}
        </span>
    );
}

function renderHighlightedText(
    text: string,
    quote: string | null,
): ReactNode {
    if (!quote?.trim()) {
        return text;
    }

    const escapedQuote = quote
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+");

    const pattern = new RegExp(escapedQuote, "gi");
    const matches = Array.from(text.matchAll(pattern));

    if (matches.length === 0) {
        return text;
    }

    const result: ReactNode[] = [];
    let cursor = 0;

    matches.forEach((match, index) => {
        const start = match.index ?? cursor;

        if (start > cursor) {
            result.push(
                <span key={`text-${index}`}>
                    {text.slice(cursor, start)}
                </span>,
            );
        }

        result.push(
            <mark
                key={`quote-${index}`}
                className="rounded bg-yellow-200 px-1 text-slate-900"
            >
                {match[0]}
            </mark>,
        );

        cursor = start + match[0].length;
    });

    if (cursor < text.length) {
        result.push(
            <span key="text-final">
                {text.slice(cursor)}
            </span>,
        );
    }

    return result;
}
