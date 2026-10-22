"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { requirements } from "@/components/mock-data";
import { Badge, Banner, Button, Select, Table } from "@/components/ui";

const tabs = ["Requirements", "Checklist", "Draft", "Export"];

export default function TenderDetailsPage() {
  const [activeTab, setActiveTab] = useState("Requirements");

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600">
          ← Tenders
        </Link>

        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">TP-2024-0321</p>
            <h1 className="mt-1 text-3xl font-bold text-[#0f2a47]">
              Network upgrade supply
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Dhaka WASA · Deadline: 28 May 2024, 10:00 AM
            </p>
          </div>
          <Badge variant="green">ANALYZED</Badge>
        </section>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-12 border-b-2 px-4 text-sm font-semibold whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Banner variant="warning">
          AI results can be wrong. Check important items against the original
          page.
        </Banner>

        {activeTab === "Requirements" && <RequirementsTab />}
        {activeTab === "Checklist" && <ChecklistTab />}
        {activeTab === "Draft" && <DraftTab />}
        {activeTab === "Export" && <ExportTab />}
      </div>
    </AppShell>
  );
}

function RequirementsTab() {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Deadline"
          value="28 May 2024"
          source="Page 4 · VERIFIED"
        />
        <FactCard
          label="Bid security"
          value="NOT FOUND"
          source="Review original PDF"
        />
        <FactCard
          label="Validity"
          value="NOT FOUND"
          source="Review original PDF"
        />
        <FactCard
          label="Submission method"
          value="NOT FOUND"
          source="Review original PDF"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select className="w-auto min-w-40" defaultValue="all">
          <option value="all">All categories</option>
        </Select>
        <Select className="w-auto min-w-40" defaultValue="all">
          <option value="all">All obligations</option>
        </Select>
        <Select className="w-auto min-w-40" defaultValue="all">
          <option value="all">All verification</option>
        </Select>
        <Button variant="secondary">+ Add manual requirement</Button>
      </div>

      <div className="hidden md:block">
        <Table>
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Requirement</th>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Verification</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement) => (
              <tr
                key={requirement.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-4 font-mono text-xs">
                  {requirement.id}
                </td>
                <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                  {requirement.category}
                </td>
                <td className="px-4 py-4 text-slate-700">{requirement.text}</td>
                <td className="px-4 py-4 text-slate-600">{requirement.page}</td>
                <td className="px-4 py-4">
                  <Badge
                    variant={
                      requirement.verification === "VERIFIED"
                        ? "green"
                        : "amber"
                    }
                  >
                    {requirement.verification}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {requirements.map((requirement) => (
          <div
            key={requirement.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs text-slate-500">
                {requirement.id}
              </span>
              <Badge
                variant={
                  requirement.verification === "VERIFIED" ? "green" : "amber"
                }
              >
                {requirement.verification}
              </Badge>
            </div>
            <p className="mt-3 font-semibold text-slate-800">
              {requirement.text}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {requirement.category} · Page {requirement.page}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactCard({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase">{label}</p>
      <p className="mt-2 font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{source}</p>
    </div>
  );
}

function ChecklistTab() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-[#0f2a47]">Compliance checklist</h2>
      <p className="mt-2 text-sm text-slate-500">
        MOCK DATA
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <FactCard label="Not reviewed" value="2" source="Requirements" />
        <FactCard label="Satisfied" value="1" source="Requirements" />
        <FactCard label="Needs clarification" value="0" source="Requirements" />
      </div>
    </section>
  );
}

function DraftTab() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-[#0f2a47]">Proposal draft</h2>
      <p className="mt-2 text-sm text-slate-500">
        MOCK DATA
      </p>
      <Button className="mt-6">Generate draft</Button>
    </section>
  );
}

function ExportTab() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-[#0f2a47]">Export</h2>
      <p className="mt-2 text-sm text-slate-500">
        MOCK DATA
      </p>
      <label className="mt-6 flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" className="mt-1 h-4 w-4" />I have reviewed this
        against the original tender document.
      </label>
      <Button className="mt-5">Download DOCX</Button>
    </section>
  );
}
