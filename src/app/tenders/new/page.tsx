"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, Input, Select } from "@/components/ui";

export default function NewTenderPage() {
  const [fileName, setFileName] = useState("");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600">
          ← Back to dashboard
        </Link>

        <div className="mt-5">
          <h1 className="text-3xl font-bold text-[#0f2a47]">
            Create new tender
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            MOCK DATA 
          </p>
        </div>

        <form className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Tender title"
              placeholder="Network upgrade supply"
              minLength={3}
              maxLength={200}
              required
            />
            <Input label="Issuer" placeholder="Dhaka WASA" required />
            <Input label="Reference" placeholder="TP-2024-0321" />
            <Input label="Deadline" type="datetime-local" />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>Notes</span>
            <textarea
              className="min-h-28 rounded-lg border border-slate-200 px-3 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Add any notes for this tender..."
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Tender PDF
            </p>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center hover:bg-blue-50">
              <span className="text-4xl">📄</span>
              <span className="mt-3 text-sm font-semibold text-blue-700">
                {fileName || "Click to choose a PDF"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PDF only, maximum 20 MB
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  setFileName(event.target.files?.[0]?.name ?? "");
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            >
              Cancel
            </Link>
            <Button type="submit">Upload and analyze</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
