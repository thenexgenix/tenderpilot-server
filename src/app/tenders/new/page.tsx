"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Banner, Button, Input } from "@/components/ui";

type FieldName =
  "title" | "issuerName" | "reference" | "deadlineAt" | "notes" | "file";

type CreateTenderResponse = {
  data?: {
    id: string;
  };
  error?: {
    code?: string;
    message?: string;
    fields?: Partial<Record<FieldName, string[]>>;
  };
};

export default function NewTenderPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});

  async function submitForm(form: HTMLFormElement, permitDuplicate: boolean) {
    setIsSubmitting(true);
    setFormError("");
    setFieldErrors({});

    if (!permitDuplicate) {
      setDuplicateWarning("");
    }

    const formData = new FormData(form);
    formData.set("allowDuplicate", String(permitDuplicate));

    try {
      const response = await fetch("/api/tenders", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as CreateTenderResponse;

      if (response.status === 409 && result.error?.code === "DUPLICATE_FILE") {
        setDuplicateWarning(
          result.error.message ??
            "This PDF was already uploaded for your account.",
        );
        return;
      }

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
          result.error?.message ?? "Unable to upload the tender PDF.",
        );

        return;
      }

      if (!result.data?.id) {
        setFormError("The tender was created but no tender ID was returned.");
        return;
      }

      form.reset();
      setFileName("");
      setAllowDuplicate(false);
      setDuplicateWarning("");
      setFormError("");
      setFieldErrors({});

      router.push(`/tenders/${result.data.id}?startProcessing=1`);
      router.refresh();
    } catch {
      setFormError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAllowDuplicate(false);
    void submitForm(event.currentTarget, false);
  }

  function handleFileChange(file: File | undefined) {
    setFileName(file?.name ?? "");
    setAllowDuplicate(false);
    setDuplicateWarning("");
    setFormError("");
  }

  function handleDuplicateUpload() {
    if (!formRef.current) {
      return;
    }

    setAllowDuplicate(true);
    void submitForm(formRef.current, true);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm transition duration-200 hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:outline-none"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Back to dashboard
        </Link>

        <div className="mt-5">
          <h1 className="text-3xl font-bold text-[#0f2a47]">
            Create new tender
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Upload a PDF tender document for secure processing.
          </p>
        </div>

        <form
          ref={formRef}
          autoComplete="off"
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
          onSubmit={handleSubmit}
        >
          {formError && <Banner variant="error">{formError}</Banner>}

          {duplicateWarning && (
            <Banner variant="warning">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{duplicateWarning}</span>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDuplicateUpload}
                  disabled={isSubmitting || allowDuplicate}
                >
                  {isSubmitting ? "Uploading..." : "Upload duplicate anyway"}
                </Button>
              </div>
            </Banner>
          )}

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
              <span className="text-xs text-red-600">{fieldErrors.notes}</span>
            )}
          </label>

          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center hover:bg-blue-50">
            <span className="text-4xl">📄</span>

            <span className="mt-3 text-sm font-semibold text-blue-700">
              {fileName || "Click to choose a PDF"}
            </span>

            <span className="mt-1 text-xs text-slate-500">
              PDF only, maximum 20 MB
            </span>

            <input
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              required
              onChange={(event) => {
                handleFileChange(event.target.files?.[0]);
              }}
            />
          </label>

          {fieldErrors.file && (
            <p className="text-xs text-red-600">{fieldErrors.file}</p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload and analyze"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
