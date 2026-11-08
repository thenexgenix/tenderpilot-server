"use client";

import {
    Fragment,
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    Banner,
    Badge,
    Button,
    EmptyState,
    Modal,
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

type DraftUpdateResponse = {
    data?: {
        section: DraftSection;
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

const PLACEHOLDER_PATTERN =
    /\[COMPANY TO PROVIDE INFORMATION:[^\]]+\]/gi;

function getPlaceholders(content: string) {
    return content.match(PLACEHOLDER_PATTERN) ?? [];
}

function renderHighlightedContent(content: string) {
    const parts = content.split(PLACEHOLDER_PATTERN);
    const placeholders = getPlaceholders(content);

    return parts.map((part, index) => (
        <Fragment key={`${index}-${part.slice(0, 20)}`}>
            <span className="whitespace-pre-wrap">
                {part}
            </span>

            {placeholders[index] && (
                <mark className="rounded bg-amber-200 px-1 font-semibold text-amber-950">
                    {placeholders[index]}
                </mark>
            )}
        </Fragment>
    ));
}

export function DraftTab({
    tenderId,
    onDirtyChange,
}: {
    tenderId: string;
    onDirtyChange?: (isDirty: boolean) => void;
}) {
    const [status, setStatus] = useState<DraftStatus>("NOT_STARTED");
    const [sections, setSections] = useState<DraftSection[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [draftContents, setDraftContents] = useState<Record<string, string>>({});
    const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [regenerateOpen, setRegenerateOpen] = useState(false);

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
            setDraftContents(
                Object.fromEntries(
                    data.sections.map((section) => [
                        section.id,
                        section.content,
                    ]),
                ),
            );
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

    async function saveSection(section: DraftSection) {
        const content =
            draftContents[section.id] ?? section.content;

        setSavingSectionId(section.id);
        setSaveError("");
        setSaveMessage("");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/draft/${section.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content }),
                },
            );

            const result =
                (await response.json()) as DraftUpdateResponse;

            if (!response.ok || !result.data?.section) {
                throw new Error(
                    result.error?.message ??
                    "Unable to save this draft section.",
                );
            }

            const updatedSection = result.data.section;

            setSections((currentSections) =>
                currentSections.map((currentSection) =>
                    currentSection.id === updatedSection.id
                        ? updatedSection
                        : currentSection,
                ),
            );

            setDraftContents((currentContents) => ({
                ...currentContents,
                [updatedSection.id]: updatedSection.content,
            }));

            setSaveMessage(`${section.title} saved successfully.`);
        } catch (saveRequestError) {
            setSaveError(
                saveRequestError instanceof Error
                    ? saveRequestError.message
                    : "Unable to save this draft section.",
            );
        } finally {
            setSavingSectionId(null);
        }
    }

    async function startGeneration(
        confirmRegenerate = false,
    ) {
        setError("");
        setStatus("GENERATING");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/draft/generate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        confirmRegenerate,
                    }),
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

    const warningCounts = sections
        .flatMap((section) => section.warnings)
        .reduce<Record<string, number>>((counts, warning) => {
            counts[warning] = (counts[warning] ?? 0) + 1;
            return counts;
        }, {});

    const warnings = Object.entries(warningCounts).map(
        ([message, count]) => {
            if (count === 1) {
                return message;
            }

            const cleanMessage = message.replace(/[.!?]\s*$/, "");

            return `${cleanMessage} (${count} occurrences).`;
        },
    );

    const hasUnsavedChanges = sections.some((section) => {
        const currentContent =
            draftContents[section.id] ?? section.content;

        return currentContent !== section.content;
    });

    const totalPlaceholderCount = sections.reduce(
        (total, section) => {
            const content =
                draftContents[section.id] ?? section.content;

            return total + getPlaceholders(content).length;
        },
        0,
    );

    useEffect(() => {
        onDirtyChange?.(hasUnsavedChanges);

        return () => {
            onDirtyChange?.(false);
        };
    }, [hasUnsavedChanges, onDirtyChange]);

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener(
            "beforeunload",
            handleBeforeUnload,
        );

        return () => {
            window.removeEventListener(
                "beforeunload",
                handleBeforeUnload,
            );
        };
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        function handleNavigationClick(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            if (!(event.target instanceof Element)) {
                return;
            }

            const link = event.target.closest("a[href]");

            if (!(link instanceof HTMLAnchorElement)) {
                return;
            }

            const destination = new URL(
                link.href,
                window.location.href,
            );

            const current = new URL(window.location.href);

            if (
                destination.origin !== current.origin ||
                destination.href === current.href
            ) {
                return;
            }

            const confirmed = window.confirm(
                "You have unsaved draft changes. Leave without saving?",
            );

            if (!confirmed) {
                event.preventDefault();
                event.stopPropagation();
            }
        }

        document.addEventListener(
            "click",
            handleNavigationClick,
            true,
        );

        return () => {
            document.removeEventListener(
                "click",
                handleNavigationClick,
                true,
            );
        };
    }, [hasUnsavedChanges]);

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

                <div className="flex flex-wrap items-center gap-2">
                    {status === "READY" && sections.length > 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setRegenerateOpen(true)}
                            disabled={hasUnsavedChanges}
                            title={
                                hasUnsavedChanges
                                    ? "Save your changes before regenerating."
                                    : undefined
                            }
                        >
                            Regenerate draft
                        </Button>
                    )}

                    <Badge variant={statusVariant(status)}>
                        {statusLabel(status)}
                    </Badge>
                </div>
            </div>

            {error && (
                <Banner variant="error">
                    <p>{error}</p>
                </Banner>
            )}

            {saveError && (
                <Banner variant="error">
                    <p>{saveError}</p>
                </Banner>
            )}

            {saveMessage && (
                <Banner variant="success">
                    <p>{saveMessage}</p>
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
                <Banner
                    variant={
                        totalPlaceholderCount > 0
                            ? "warning"
                            : "success"
                    }
                >
                    <p>
                        {totalPlaceholderCount > 0
                            ? `${totalPlaceholderCount} company information placeholder${totalPlaceholderCount === 1
                                ? ""
                                : "s"
                            } still need completion.`
                            : "No company information placeholders remain."}
                    </p>
                </Banner>
            )}

            {hasUnsavedChanges && (
                <Banner variant="warning">
                    <p>
                        You have unsaved draft changes. Save each edited
                        section before leaving this page.
                    </p>
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
                                value={
                                    draftContents[section.id] ??
                                    section.content
                                }
                                onChange={(event) => {
                                    setDraftContents((currentContents) => ({
                                        ...currentContents,
                                        [section.id]: event.target.value,
                                    }));
                                    setSaveMessage("");
                                    setSaveError("");
                                }}
                                aria-label={section.title}
                                className="mt-4 min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />

                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
                                    Placeholder preview
                                </p>

                                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                    {renderHighlightedContent(
                                        draftContents[section.id] ??
                                        section.content,
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-slate-400">
                                    Changes are saved per section.
                                </p>

                                <Button
                                    type="button"
                                    onClick={() => void saveSection(section)}
                                    disabled={
                                        savingSectionId === section.id ||
                                        (draftContents[section.id] ??
                                            section.content) === section.content
                                    }
                                >
                                    {savingSectionId === section.id
                                        ? "Saving…"
                                        : "Save section"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal
                open={regenerateOpen}
                title="Regenerate draft?"
                onClose={() => setRegenerateOpen(false)}
            >
                <div className="space-y-4">
                    <p className="text-sm leading-6 text-slate-600">
                        Regeneration will create new AI draft sections and
                        replace the current saved draft after generation
                        succeeds. Your current draft will remain unchanged
                        until you confirm.
                    </p>

                    <Banner variant="warning">
                        <p>
                            Review and save any important edits before
                            continuing. Regeneration may replace the current
                            section text.
                        </p>
                    </Banner>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setRegenerateOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                                setRegenerateOpen(false);
                                void startGeneration(true);
                            }}
                        >
                            Confirm regeneration
                        </Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
