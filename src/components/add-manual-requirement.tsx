"use client";

import { useState, type FormEvent } from "react";
import {
    Banner,
    Button,
    Input,
    Modal,
} from "@/components/ui";

type ManualRequirement = {
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

type ManualResponse = {
    data?: {
        requirement: ManualRequirement;
    };
    error?: {
        message?: string;
    };
};

export function AddManualRequirement({
    tenderId,
    onCreated,
}: {
    tenderId: string;
    onCreated: (requirement: ManualRequirement) => void;
}) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const [category, setCategory] = useState("MANUAL_REVIEW");
    const [text, setText] = useState("");
    const [obligation, setObligation] = useState("MANDATORY");
    const [pageNumber, setPageNumber] = useState("");
    const [quote, setQuote] = useState("");
    const [checkNote, setCheckNote] = useState("");

    function resetForm() {
        setCategory("MANUAL_REVIEW");
        setText("");
        setObligation("MANDATORY");
        setPageNumber("");
        setQuote("");
        setCheckNote("");
        setError("");
    }

    function closeModal() {
        if (!isSaving) {
            setOpen(false);
            resetForm();
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedText = text.trim();
        const trimmedCategory = category.trim();
        const trimmedPageNumber = pageNumber.trim();
        const parsedPageNumber = trimmedPageNumber
            ? Number(trimmedPageNumber)
            : null;

        if (!trimmedText || !trimmedCategory) {
            setError("Requirement text and category are required.");
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

        setIsSaving(true);
        setError("");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/requirements`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        category: trimmedCategory,
                        text: trimmedText,
                        obligation,
                        pageNumber: parsedPageNumber,
                        quote: quote.trim() || null,
                        checkNote: checkNote.trim() || null,
                    }),
                },
            );

            const result =
                (await response.json()) as ManualResponse;

            if (!response.ok) {
                throw new Error(
                    result.error?.message ??
                    "Manual requirement could not be added.",
                );
            }

            if (result.data?.requirement) {
                onCreated(result.data.requirement);
            }

            setOpen(false);
            resetForm();
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Manual requirement could not be added.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <Button
                type="button"
                variant="secondary"
                onClick={() => {
                    setError("");
                    setOpen(true);
                }}
            >
                + Add manual requirement
            </Button>

            <Modal
                open={open}
                title="Add manual requirement"
                onClose={closeModal}
            >
                <form
                    className="space-y-4"
                    onSubmit={handleSubmit}
                >
                    <Input
                        label="Requirement text"
                        value={text}
                        onChange={(event) =>
                            setText(event.target.value)
                        }
                        placeholder="Enter the requirement"
                        required
                    />

                    <Input
                        label="Category"
                        value={category}
                        onChange={(event) =>
                            setCategory(event.target.value)
                        }
                        required
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
                        label="Source page (optional)"
                        type="number"
                        min={1}
                        value={pageNumber}
                        onChange={(event) =>
                            setPageNumber(event.target.value)
                        }
                    />

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Source quote (optional)
                        <textarea
                            value={quote}
                            onChange={(event) =>
                                setQuote(event.target.value)
                            }
                            rows={3}
                            maxLength={400}
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
                        Reviewer note (optional)
                        <textarea
                            value={checkNote}
                            onChange={(event) =>
                                setCheckNote(event.target.value)
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
                            onClick={closeModal}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>

                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Adding…" : "Add requirement"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}