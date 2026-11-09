"use client";

import { useState, type FormEvent } from "react";
import { Banner, Button } from "@/components/ui";

type ExportResponse = {
    error?: {
        message?: string;
    };
};

export function ExportTab({
    tenderId,
}: {
    tenderId: string;
}) {
    const [confirmReviewed, setConfirmReviewed] =
        useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function handleExport(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setIsExporting(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `/api/tenders/${tenderId}/export?format=docx`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        confirmReviewed,
                    }),
                },
            );

            if (!response.ok) {
                const result =
                    (await response.json()) as ExportResponse;

                throw new Error(
                    result.error?.message ??
                    "The DOCX export failed.",
                );
            }

            const blob = await response.blob();
            const downloadUrl =
                window.URL.createObjectURL(blob);

            const contentDisposition =
                response.headers.get(
                    "content-disposition",
                );

            const filenameMatch =
                contentDisposition?.match(
                    /filename="([^"]+)"/i,
                );

            const filename =
                filenameMatch?.[1] ??
                `tender-${tenderId}-proposal.docx`;

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
            }, 1000);

            setMessage(
                "DOCX export downloaded successfully.",
            );
        } catch (exportError) {
            setError(
                exportError instanceof Error
                    ? exportError.message
                    : "The DOCX export failed.",
            );
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-xl font-bold text-[#0f2a47]">
                    Export proposal
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Download the reviewed draft as a Microsoft Word
                    document.
                </p>
            </div>

            {error && (
                <Banner variant="error">
                    <p>{error}</p>
                </Banner>
            )}

            {message && (
                <Banner variant="success">
                    <p>{message}</p>
                </Banner>
            )}

            <form
                onSubmit={(event) => void handleExport(event)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <input
                        type="checkbox"
                        checked={confirmReviewed}
                        onChange={(event) =>
                            setConfirmReviewed(
                                event.target.checked,
                            )
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span>
                        I reviewed this draft against the original
                        tender and understand that it is
                        AI-assisted and must be checked by a person
                        before submission.
                    </span>
                </label>

                <Button
                    type="submit"
                    className="mt-5"
                    disabled={
                        !confirmReviewed || isExporting
                    }
                >
                    {isExporting
                        ? "Preparing DOCX…"
                        : "Download DOCX"}
                </Button>
            </form>
        </section>
    );
}