"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Banner, Button, Input } from "@/components/ui";

type FieldName =
  | "title"
  | "issuerName"
  | "reference"
  | "deadlineAt"
  | "notes";

type CreateTenderResponse = {
  data?: {
    id: string;
  };
  error?: {
    message?: string;
    fields?: Partial<Record<FieldName, string[]>>;
  };
};

export default function NewTenderPage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setFormError("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    const payload = {
      title: String(formData.get("title") ?? ""),
      issuerName: String(formData.get("issuerName") ?? ""),
      reference: String(formData.get("reference") ?? ""),
      deadlineAt: String(formData.get("deadlineAt") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    try {
      const response = await fetch("/api/tenders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as CreateTenderResponse;

      if (!response.ok) {
        const fields = result.error?.fields ?? {};

        setFieldErrors({
          title: fields.title?.[0],
          issuerName: fields.issuerName?.[0],
          reference: fields.reference?.[0],
          deadlineAt: fields.deadlineAt?.[0],
          notes: fields.notes?.[0],
        });

        setFormError(
          result.error?.message ?? "Unable to create the tender.",
        );

        return;
      }

      if (!result.data?.id) {
        setFormError("The tender was created but no tender ID was returned.");
        return;
      }

      router.push(`/tenders/${result.data.id}`);
      router.refresh();
    } catch {
      setFormError(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-5">
          <h1 className="text-3xl font-bold text-[#0f2a47]">
            Create new tender
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Add the tender details now. PDF upload will be added on Day 6.
          </p>
        </div>

        <form
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
          onSubmit={handleSubmit}
        >
          {formError && <Banner variant="error">{formError}</Banner>}

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Tender title"
              name="title"
              placeholder="Network upgrade supply"
              error={fieldErrors.title}
              minLength={3}
              maxLength={200}
              required
            />

            <Input
              label="Issuer"
              name="issuerName"
              placeholder="Dhaka WASA"
              error={fieldErrors.issuerName}
              maxLength={200}
              required
            />

            <Input
              label="Reference"
              name="reference"
              placeholder="TP-2026-0321"
              error={fieldErrors.reference}
              maxLength={100}
            />

            <Input
              label="Deadline"
              name="deadlineAt"
              type="datetime-local"
              error={fieldErrors.deadlineAt}
            />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Notes</span>

            <textarea
              name="notes"
              className="min-h-32 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Add any notes for this tender..."
              maxLength={5000}
            />

            {fieldErrors.notes && (
              <span className="text-xs text-red-600">
                {fieldErrors.notes}
              </span>
            )}
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating tender..." : "Create tender"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}