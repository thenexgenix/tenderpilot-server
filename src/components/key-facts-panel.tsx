"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { Banner, Skeleton } from "@/components/ui";

type Requirement = {
    category: string;
    text: string;
    pageNumber: number | null;
    quote: string | null;
    verification: string;
};

type RequirementsResponse = {
    data?: {
        requirements: Requirement[];
    };
    error?: {
        message?: string;
    };
};

const factDefinitions = [
    {
        label: "Deadline",
        categories: [],
        patterns: [
            /\bsubmission\s+deadline\b/i,
            /\b(tender\s+)?submission\s+deadline\s+is\b/i,
            /\bdeadline\s+for\s+submission\s+is\b/i,
            /\blast\s+date\s+for\s+submission\s+is\b/i,
        ],
    },
    {
        label: "Validity",
        categories: ["VALIDITY_PERIOD", "VALIDITY"],
        patterns: [
            /\bvalidity\b/i,
            /\bvalid for\b/i,
            /\bvalidity period\b/i,
        ],
    },
    {
        label: "Bid security",
        categories: ["BID_SECURITY"],
        patterns: [
            /\bbid security\b/i,
            /\btender security\b/i,
            /\bperformance security\b/i,
        ],
    },
    {
        label: "Submission method",
        categories: [],
        patterns: [
            /\be[- ]tender\b/i,
            /\bonline submission\b/i,
            /\bphysical submission\b/i,
            /\bsealed envelope\b/i,
            /\btechnical and financial proposals\b/i,
        ],
    },
    {
        label: "Contact",
        categories: ["CONTACT"],
        patterns: [
            /\bcontact person\b/i,
            /\bcontact details\b/i,
            /\btelephone\b/i,
            /\bphone\b/i,
            /\bemail address\b/i,
        ],
    },
];

function normalizeCategory(value: string) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");
}

export function KeyFactsPanel({
    tenderId,
}: {
    tenderId: string;
}) {
    const [requirements, setRequirements] =
        useState<Requirement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadRequirements = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/requirements`,
            );

            const result =
                (await response.json()) as RequirementsResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Key facts could not be loaded.",
                );
            }

            setRequirements(result.data?.requirements ?? []);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Key facts could not be loaded.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [tenderId]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadRequirements();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadRequirements]);

    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {factDefinitions.map((fact) => (
                    <Skeleton
                        key={fact.label}
                        className="h-28 w-full"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return <Banner variant="error">{error}</Banner>;
    }

    return (
        <section>
            <div className="mb-3">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    Key facts
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#0f2a47]">
                    Important tender information
                </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {factDefinitions.map((fact) => {
                    const requirement = requirements
                        .map((item) => {
                        const normalizedCategory =
                            normalizeCategory(item.category);

                        const categoryMatches =
                            fact.categories.includes(normalizedCategory);

                        const textMatches = fact.patterns.some((pattern) =>
                            pattern.test(item.text),
                        );

                        if (!categoryMatches && !textMatches) {
                            return { item, score: -1 };
                        }

                        let score = categoryMatches ? 1 : 0;

                        if (textMatches) {
                            score += 2;
                        }

                        if (/include:|following requirements?:?$/i.test(item.text)) {
                            score -= 5;
                        }

                        if (fact.label === "Submission method" && /sealed envelope|technical and financial proposals/i.test(item.text)) {
                            score += 5;
                        }

                        if (fact.label === "Contact" && /email|telephone|phone|contact person/i.test(item.text)) {
                            score += 4;
                        }

                        if (fact.label === "Deadline" && /\b\d{1,2}[:.]\d{2}\b|\b\d{4}\b/i.test(item.text)) {
                            score += 2;
                        }

                        return { item, score };
                    })
                        .sort((left, right) => right.score - left.score)[0]?.item;

                    const hasSource =
                        requirement?.pageNumber !== null &&
                        requirement?.pageNumber !== undefined &&
                        Boolean(requirement.quote?.trim());

                    return (
                        <div
                            key={fact.label}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                {fact.label}
                            </p>

                            <p className="mt-2 line-clamp-3 text-sm font-semibold text-slate-800">
                                {hasSource
                                    ? requirement.text
                                    : "NOT FOUND"}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                                {hasSource
                                    ? `Page ${requirement.pageNumber} · ${requirement.verification}`
                                    : "No sourced fact found"}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
