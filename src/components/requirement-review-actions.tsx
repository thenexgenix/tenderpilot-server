"use client";

import { useState } from "react";
import {
    Banner,
    Button,
    Input,
    Modal,
} from "@/components/ui";

type ReviewRequirement = {
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

type ReviewResponse = {
    data?: {
        requirement: ReviewRequirement;
    };
    error?: {
        message?: string;
    };
};

type ReviewAction =
    | "CONFIRM"
    | "REJECT"
    | "EDIT";

export function RequirementReviewActions({
    requirement,
    onUpdated,
}: {
    requirement: ReviewRequirement;
    onUpdated: (requirement: ReviewRequirement) => void;
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);

    const [text, setText] = useState(requirement.text);
    const [category, setCategory] = useState(
        requirement.category,
    );
    const [obligation, setObligation] = useState(
        requirement.obligation,
    );
    const [pageNumber, setPageNumber] = useState(
        requirement.pageNumber?.toString() ?? "",
    );
    const [quote, setQuote] = useState(
        requirement.quote ?? "",
    );
    const [note, setNote] = useState(
        requirement.checkNote ?? "",
    );

    function openEdit() {
        setError("");
        setText(requirement.text);
        setCategory(requirement.category);
        setObligation(requirement.obligation);
        setPageNumber(
            requirement.pageNumber?.toString() ?? "",
        );
        setQuote(requirement.quote ?? "");
        setNote(requirement.checkNote ?? "");
        setEditOpen(true);
    }

    function openReject() {
        setError("");
        setNote(requirement.checkNote ?? "");
        setRejectOpen(true);
    }

    async function saveReview(
        action: ReviewAction,
        payload: Record<string, unknown> = {},
    ) {
        setIsSaving(true);
        setError("");

        try {
            const response = await fetch(
                `/api/requirements/${requirement.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action,
                        ...payload,
                    }),
                },
            );

            const result =
                (await response.json()) as ReviewResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Requirement review could not be saved.",
                );
            }

            if (result.data?.requirement) {
                onUpdated(result.data.requirement);
            }

            setEditOpen(false);
            setRejectOpen(false);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Requirement review could not be saved.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    function handleEditSubmit() {
        const trimmedText = text.trim();
        const trimmedCategory = category.trim();
        const trimmedPageNumber = pageNumber.trim();
        const parsedPageNumber = trimmedPageNumber
            ? Number(trimmedPageNumber)
            : null;

        if (!trimmedText || !trimmedCategory) {
            setError("Text and category are required.");
            return;
        }

        if (
            parsedPageNumber !== null &&
            (!Number.isInteger(parsedPageNumber) ||
                parsedPageNumber <= 0)
        ) {
            setError("Page number must be a positive whole number.");
            return;
        }

        void saveReview("EDIT", {
            text: trimmedText,
            category: trimmedCategory,
            obligation,
            pageNumber: parsedPageNumber,
            quote: quote.trim() || null,
            checkNote: note.trim() || null,
        });
    }

    return (
        <div
            className="space-y-2"
            onClick={(event) => event.stopPropagation()}
        >
            {requirement.verification === "UNVERIFIED" && (
                <p className="text-xs font-semibold text-amber-700">
                    Source quote could not be verified.
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    className="min-h-9 px-3 text-xs"
                    onClick={() =>
                        void saveReview("CONFIRM", {
                            checkNote: requirement.checkNote,
                        })
                    }
                    disabled={isSaving}
                >
                    Confirm
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 px-3 text-xs"
                    onClick={openEdit}
                    disabled={isSaving}
                >
                    Edit
                </Button>

                <Button
                    type="button"
                    variant="danger"
                    className="min-h-9 px-3 text-xs"
                    onClick={openReject}
                    disabled={isSaving}
                >
                    Reject
                </Button>
            </div>

            {isSaving && (
                <p className="text-xs font-semibold text-blue-600">
                    Saving…
                </p>
            )}

            {error && (
                <p className="text-xs font-semibold text-red-600">
                    {error}
                </p>
            )}

            <Modal
                open={editOpen}
                title={`Edit ${requirement.displayId}`}
                onClose={() => setEditOpen(false)}
            >
                <div className="space-y-4">
                    <Input
                        label="Requirement text"
                        value={text}
                        onChange={(event) =>
                            setText(event.target.value)
                        }
                    />

                    <Input
                        label="Category"
                        value={category}
                        onChange={(event) =>
                            setCategory(event.target.value)
                        }
                    />

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Obligation
                        <select
                            value={obligation}
                            onChange={(event) =>
                                setObligation(event.target.value)
                            }
                            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
                        >
                            <option value="MANDATORY">
                                MANDATORY
                            </option>
                            <option value="OPTIONAL">
                                OPTIONAL
                            </option>
                            <option value="UNCLEAR">
                                UNCLEAR
                            </option>
                        </select>
                    </label>

                    <Input
                        label="Source page"
                        type="number"
                        min={1}
                        value={pageNumber}
                        onChange={(event) =>
                            setPageNumber(event.target.value)
                        }
                    />

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Source quote
                        <textarea
                            value={quote}
                            onChange={(event) =>
                                setQuote(event.target.value)
                            }
                            rows={4}
                            maxLength={400}
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Reviewer note
                        <textarea
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            rows={3}
                            maxLength={2000}
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                        />
                    </label>

                    {error && <Banner variant="error">{error}</Banner>}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            onClick={handleEditSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : "Save changes"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={rejectOpen}
                title={`Reject ${requirement.displayId}`}
                onClose={() => setRejectOpen(false)}
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Rejected requirements will remain visible in the
                        Requirements tab but will be excluded from the
                        Checklist tab.
                    </p>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Reviewer note
                        <textarea
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            rows={4}
                            maxLength={2000}
                            placeholder="Explain why this requirement was rejected."
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                        />
                    </label>

                    {error && <Banner variant="error">{error}</Banner>}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setRejectOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="danger"
                            onClick={() =>
                                void saveReview("REJECT", {
                                    checkNote: note.trim() || null,
                                })
                            }
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : "Reject requirement"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}