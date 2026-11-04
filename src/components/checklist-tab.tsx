"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Banner, EmptyState, Skeleton } from "@/components/ui";

const checklistStatuses = [
    "NOT_REVIEWED",
    "IN_PROGRESS",
    "SATISFIED",
    "NOT_SATISFIED",
    "NEEDS_CLARIFICATION",
    "NOT_APPLICABLE",
] as const;

type ChecklistStatus = (typeof checklistStatuses)[number];

type Requirement = {
    id: string;
    displayId: string;
    category: string;
    text: string;
    obligation: string;
    pageNumber: number | null;
    verification: string;
    checkStatus: ChecklistStatus;
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

type UpdateResponse = {
    data?: {
        requirement: Requirement;
    };
    error?: {
        message?: string;
    };
};

type SaveState = "saving" | "saved" | "error";

function statusLabel(status: ChecklistStatus) {
    return status.replaceAll("_", " ");
}

export function ChecklistTab({
    tenderId,
}: {
    tenderId: string;
}) {
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [saveStates, setSaveStates] = useState<
        Record<string, SaveState | undefined>
    >({});
    const [rowErrors, setRowErrors] = useState<
        Record<string, string | undefined>
    >({});

    const loadRequirements = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/requirements`,
                { cache: "no-store" },
            );

            const result =
                (await response.json()) as RequirementsResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Checklist requirements could not be loaded.",
                );
            }

            setRequirements(result.data?.requirements ?? []);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Checklist requirements could not be loaded.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [tenderId]);

    useEffect(() => {
        void loadRequirements();
    }, [loadRequirements]);

    const checklistRequirements = useMemo(
        () =>
            requirements.filter(
                (requirement) => requirement.verification !== "REJECTED",
            ),
        [requirements],
    );

    const visibleRequirements = useMemo(
        () =>
            statusFilter
                ? checklistRequirements.filter(
                    (requirement) =>
                        requirement.checkStatus === statusFilter,
                )
                : checklistRequirements,
        [checklistRequirements, statusFilter],
    );

    const counts = useMemo(() => {
        return checklistStatuses.reduce(
            (result, status) => {
                result[status] = checklistRequirements.filter(
                    (requirement) => requirement.checkStatus === status,
                ).length;
                return result;
            },
            {} as Record<ChecklistStatus, number>,
        );
    }, [checklistRequirements]);

    const saveRequirement = useCallback(
        async (
            requirement: Requirement,
            nextStatus: ChecklistStatus,
            nextNote: string | null,
        ) => {
            setSaveStates((current) => ({
                ...current,
                [requirement.id]: "saving",
            }));

            setRowErrors((current) => ({
                ...current,
                [requirement.id]: undefined,
            }));

            try {
                const response = await fetch(
                    `/api/requirements/${requirement.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            checkStatus: nextStatus,
                            checkNote: nextNote,
                        }),
                    },
                );

                const result =
                    (await response.json()) as UpdateResponse;

                if (!response.ok) {
                    throw new Error(
                        result.error?.message ??
                        "Checklist update could not be saved.",
                    );
                }

                if (result.data?.requirement) {
                    setRequirements((current) =>
                        current.map((item) =>
                            item.id === requirement.id
                                ? result.data!.requirement
                                : item,
                        ),
                    );
                }

                setSaveStates((current) => ({
                    ...current,
                    [requirement.id]: "saved",
                }));
            } catch (requestError) {
                setSaveStates((current) => ({
                    ...current,
                    [requirement.id]: "error",
                }));

                setRowErrors((current) => ({
                    ...current,
                    [requirement.id]:
                        requestError instanceof Error
                            ? requestError.message
                            : "Checklist update could not be saved.",
                }));
            }
        },
        [],
    );

    function handleStatusChange(
        requirement: Requirement,
        nextStatus: ChecklistStatus,
    ) {
        setRequirements((current) =>
            current.map((item) =>
                item.id === requirement.id
                    ? { ...item, checkStatus: nextStatus }
                    : item,
            ),
        );

        void saveRequirement(
            requirement,
            nextStatus,
            requirement.checkNote,
        );
    }

    function handleNoteChange(
        requirementId: string,
        nextNote: string,
    ) {
        setRequirements((current) =>
            current.map((item) =>
                item.id === requirementId
                    ? { ...item, checkNote: nextNote }
                    : item,
            ),
        );
    }

    function handleNoteBlur(requirement: Requirement) {
        void saveRequirement(
            requirement,
            requirement.checkStatus,
            requirement.checkNote,
        );
    }

    if (isLoading) {
        return (
            <section className="space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </section>
        );
    }

    if (error) {
        return <Banner variant="error">{error}</Banner>;
    }

    return (
        <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    label="Total"
                    value={checklistRequirements.length}
                />

                <SummaryCard
                    label="Not reviewed"
                    value={counts.NOT_REVIEWED}
                    tone="gray"
                />

                <SummaryCard
                    label="In progress"
                    value={counts.IN_PROGRESS}
                    tone="blue"
                />

                <SummaryCard
                    label="Satisfied"
                    value={counts.SATISFIED}
                    tone="green"
                />

                <SummaryCard
                    label="Not satisfied"
                    value={counts.NOT_SATISFIED}
                    tone="red"
                />

                <SummaryCard
                    label="Needs clarification"
                    value={counts.NEEDS_CLARIFICATION}
                    tone="amber"
                />

                <SummaryCard
                    label="Not applicable"
                    value={counts.NOT_APPLICABLE}
                    tone="gray"
                />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        Compliance checklist
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[#0f2a47]">
                        Review each tender requirement
                    </h2>
                </div>

                <label className="flex min-w-52 flex-col gap-1.5 text-sm font-semibold text-slate-700">
                    Filter by status
                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700"
                    >
                        <option value="">All statuses</option>
                        {checklistStatuses.map((status) => (
                            <option key={status} value={status}>
                                {statusLabel(status)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {checklistRequirements.length === 0 && (
                <EmptyState
                    title="No checklist items"
                    description="There are no non-rejected requirements available for review."
                />
            )}

            {checklistRequirements.length > 0 &&
                visibleRequirements.length === 0 && (
                    <EmptyState
                        title="No matching checklist items"
                        description="Try selecting a different checklist status."
                    />
                )}

            {visibleRequirements.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Requirement</th>
                                    <th className="px-4 py-3">Obligation</th>
                                    <th className="px-4 py-3">Evidence</th>
                                    <th className="px-4 py-3">Checklist status</th>
                                    <th className="px-4 py-3">Reviewer note</th>
                                </tr>
                            </thead>

                            <tbody>
                                {visibleRequirements.map((requirement) => (
                                    <ChecklistRow
                                        key={requirement.id}
                                        requirement={requirement}
                                        saveState={saveStates[requirement.id]}
                                        rowError={rowErrors[requirement.id]}
                                        onStatusChange={handleStatusChange}
                                        onNoteChange={handleNoteChange}
                                        onNoteBlur={handleNoteBlur}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                        {visibleRequirements.map((requirement) => (
                            <ChecklistCard
                                key={requirement.id}
                                requirement={requirement}
                                saveState={saveStates[requirement.id]}
                                rowError={rowErrors[requirement.id]}
                                onStatusChange={handleStatusChange}
                                onNoteChange={handleNoteChange}
                                onNoteBlur={handleNoteBlur}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

function ChecklistRow({
    requirement,
    saveState,
    rowError,
    onStatusChange,
    onNoteChange,
    onNoteBlur,
}: {
    requirement: Requirement;
    saveState?: SaveState;
    rowError?: string;
    onStatusChange: (
        requirement: Requirement,
        status: ChecklistStatus,
    ) => void;
    onNoteChange: (id: string, note: string) => void;
    onNoteBlur: (requirement: Requirement) => void;
}) {
    return (
        <tr className="border-b border-slate-100 align-top last:border-0">
            <td className="max-w-md px-4 py-4">
                <p className="font-mono text-xs text-slate-400">
                    {requirement.displayId}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                    {requirement.text}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    {requirement.category}
                    {requirement.pageNumber
                        ? ` · Page ${requirement.pageNumber}`
                        : ""}
                </p>
            </td>

            <td className="px-4 py-4 font-semibold text-slate-600">
                {requirement.obligation}
            </td>

            <td className="px-4 py-4">
                <span
                    className={
                        requirement.verification === "VERIFIED"
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                    }
                >
                    {requirement.verification}
                </span>
            </td>

            <td className="px-4 py-4">
                <select
                    value={requirement.checkStatus}
                    onChange={(event) =>
                        onStatusChange(
                            requirement,
                            event.target.value as ChecklistStatus,
                        )
                    }
                    className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                    {checklistStatuses.map((status) => (
                        <option key={status} value={status}>
                            {statusLabel(status)}
                        </option>
                    ))}
                </select>

                <SaveIndicator
                    saveState={saveState}
                    rowError={rowError}
                />
            </td>

            <td className="px-4 py-4">
                <textarea
                    value={requirement.checkNote ?? ""}
                    onChange={(event) =>
                        onNoteChange(requirement.id, event.target.value)
                    }
                    onBlur={() => onNoteBlur(requirement)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Add reviewer note"
                    className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                />
            </td>
        </tr>
    );
}

function ChecklistCard({
    requirement,
    saveState,
    rowError,
    onStatusChange,
    onNoteChange,
    onNoteBlur,
}: {
    requirement: Requirement;
    saveState?: SaveState;
    rowError?: string;
    onStatusChange: (
        requirement: Requirement,
        status: ChecklistStatus,
    ) => void;
    onNoteChange: (id: string, note: string) => void;
    onNoteBlur: (requirement: Requirement) => void;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-mono text-xs text-slate-400">
                {requirement.displayId}
            </p>

            <p className="mt-2 font-semibold text-slate-800">
                {requirement.text}
            </p>

            <p className="mt-2 text-xs text-slate-500">
                {requirement.category} · {requirement.obligation}
                {requirement.pageNumber
                    ? ` · Page ${requirement.pageNumber}`
                    : ""}
            </p>

            <p className="mt-3 text-xs font-semibold text-slate-500">
                Evidence:{" "}
                <span
                    className={
                        requirement.verification === "VERIFIED"
                            ? "text-emerald-700"
                            : "text-amber-700"
                    }
                >
                    {requirement.verification}
                </span>
            </p>

            <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
                Checklist status
                <select
                    value={requirement.checkStatus}
                    onChange={(event) =>
                        onStatusChange(
                            requirement,
                            event.target.value as ChecklistStatus,
                        )
                    }
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
                >
                    {checklistStatuses.map((status) => (
                        <option key={status} value={status}>
                            {statusLabel(status)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
                Reviewer note
                <textarea
                    value={requirement.checkNote ?? ""}
                    onChange={(event) =>
                        onNoteChange(requirement.id, event.target.value)
                    }
                    onBlur={() => onNoteBlur(requirement)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Add reviewer note"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                />
            </label>

            <SaveIndicator
                saveState={saveState}
                rowError={rowError}
            />
        </article>
    );
}

function SaveIndicator({
    saveState,
    rowError,
}: {
    saveState?: SaveState;
    rowError?: string;
}) {
    if (rowError) {
        return (
            <p className="mt-2 text-xs font-semibold text-red-600">
                {rowError}
            </p>
        );
    }

    if (saveState === "saving") {
        return (
            <p className="mt-2 text-xs font-semibold text-blue-600">
                Saving…
            </p>
        );
    }

    if (saveState === "saved") {
        return (
            <p className="mt-2 text-xs font-semibold text-emerald-600">
                Saved
            </p>
        );
    }

    return null;
}

function SummaryCard({
    label,
    value,
    tone = "blue",
}: {
    label: string;
    value: number;
    tone?: "blue" | "green" | "amber" | "red" | "gray";
}) {
    const styles = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
        gray: "bg-slate-100 text-slate-700",
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