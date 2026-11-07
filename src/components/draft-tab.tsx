"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Banner,
    Badge,
    Button,
    EmptyState,
    Skeleton,
} from "@/components/ui";

type DraftStatus =
    | "NOT_STARTED"
    | "GENERATING"
    | "READY"
    | "FAILED";

type DraftSection = {
    id: string;
    key: string;
    title: string;
    position: number;
    content: string;
    generated: boolean;
    warnings: string[];
    updatedAt: string;
};

type DraftResponse = {
    data?: {
        tenderId: string;
        status: DraftStatus;
        errorCode: string | null;
        updatedAt: string | null;
        sections: DraftSection[];
    };
    error?: {
        message?: string;
    };
};

function statusLabel(status: DraftStatus) {
    if (status === "NOT_STARTED") {
        return "NOT STARTED";
    }

    if (status === "GENERATING") {
        return "GENERATING";
    }

    if (status === "READY") {
        return "READY";
    }

    return "FAILED";
}

function statusVariant(
    status: DraftStatus,
): "blue" | "green" | "amber" | "red" {
    if (status === "GENERATING") {
        return "blue";
    }

    if (status === "READY") {
        return "green";
    }

    if (status === "FAILED") {
        return "red";
    }

    return "amber";
}

function getErrorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Unable to load the draft.";
}

export function DraftTab({ tenderId }: { tenderId: string }) {
    const [status, setStatus] =
        useState<DraftStatus>("NOT_STARTED");
    const [sections, setSections] = useState<DraftSection[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchDraft = useCallback(async () => {
        const response = await fetch(
            `/api/tenders/${tenderId}/draft`,
            {
                cache: "no-store",
            },
        );

        const result =
            (await response.json()) as DraftResponse;

        if (!response.ok || !result.data) {
            throw new Error(
                result.error?.message ?? "Unable to load the draft.",
            );
        }

        return result.data;
    }, [tenderId]);

    const applyDraftData = useCallback(
        (data: NonNullable<DraftResponse["data"]>) => {
            setStatus(data.status);
            setSections(data.sections);
            setError(
                data.status === "FAILED"
                    ? data.errorCode ??
                    "Draft generation failed. Please retry."
                    : "",
            );
        },
        [],
    );

    useEffect(() => {
        let cancelled = false;

        async function loadInitialDraft() {
            try {
                const data = await fetchDraft();

                if (!cancelled) {
                    applyDraftData(data);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(getErrorMessage(loadError));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadInitialDraft();

        return () => {
            cancelled = true;
        };
    }, [applyDraftData, fetchDraft]);

    useEffect(() => {
        if (status !== "GENERATING") {
            return;
        }

        let cancelled = false;

        async function pollDraft() {
            try {
                const data = await fetchDraft();

                if (!cancelled) {
                    applyDraftData(data);
                }
            } catch (pollError) {
                if (!cancelled) {
                    setError(getErrorMessage(pollError));
                }
            }
        }

        const intervalId = window.setInterval(() => {
            void pollDraft();
        }, 3000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [applyDraftData, fetchDraft, status]);

    async function startGeneration() {
        setError("");
        setStatus("GENERATING");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/draft/generate`,
                {
                    method: "POST",
                },
            );

            const result =
                (await response.json()) as DraftResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Unable to start draft generation.",
                );
            }

            setStatus(result.data?.status ?? "GENERATING");
        } catch (generationError) {
            setStatus("FAILED");
            setError(getErrorMessage(generationError));
        }
    }

    const warnings = sections.flatMap(
        (section) => section.warnings,
    );

    if (isLoading) {
        return (
            <section className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </section>
        );
    }

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#0f2a47]">
                        Proposal draft
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Generate a source-grounded draft from the tender
                        requirements.
                    </p>
                </div>

                <Badge variant={statusVariant(status)}>
                    {statusLabel(status)}
                </Badge>
            </div>

            {error && (
                <Banner variant="error">
                    <p>{error}</p>
                </Banner>
            )}

            {status === "GENERATING" && (
                <Banner variant="info">
                    Draft generation is running. This page checks for
                    completion every three seconds.
                </Banner>
            )}

            {status === "FAILED" && (
                <EmptyState
                    title="Draft generation failed"
                    description="The tender remains usable. Correct the provider or configuration issue and retry."
                    action={
                        <Button
                            type="button"
                            onClick={() => void startGeneration()}
                        >
                            Retry generation
                        </Button>
                    }
                />
            )}

            {status === "NOT_STARTED" && (
                <EmptyState
                    title="No draft generated yet"
                    description="Generate five draft sections using the reviewed tender requirements."
                    action={
                        <Button
                            type="button"
                            onClick={() => void startGeneration()}
                        >
                            Generate draft
                        </Button>
                    }
                />
            )}

            {status === "READY" && sections.length === 0 && (
                <EmptyState
                    title="Draft sections are unavailable"
                    description="The draft was marked ready but no sections were returned."
                />
            )}

            {status === "READY" && warnings.length > 0 && (
                <Banner variant="warning">
                    <p className="font-semibold">
                        Review warnings before using this draft:
                    </p>

                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {warnings.map((warning, index) => (
                            <li key={`${warning}-${index}`}>{warning}</li>
                        ))}
                    </ul>
                </Banner>
            )}

            {status === "READY" && sections.length > 0 && (
                <div className="space-y-4">
                    {sections.map((section) => (
                        <article
                            key={section.id}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <h3 className="text-base font-bold text-[#0f2a47]">
                                {section.position + 1}. {section.title}
                            </h3>

                            <textarea
                                readOnly
                                value={section.content}
                                aria-label={section.title}
                                className="mt-4 min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none"
                            />

                            <p className="mt-2 text-xs text-slate-400">
                                Editing and saving will be added in Day 15.
                            </p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}