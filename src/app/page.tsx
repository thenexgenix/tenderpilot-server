"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";

/* User session shape for authentication state detection */
type SessionUser = {
  name?: string | null;
  email?: string | null;
};

/* Frequently asked questions data providing answers to common user inquiries */
const faqs = [
  {
    question: "What types of tender documents are supported?",
    answer:
      "TenderPilot AI processes standard digital PDF tenders up to 150 pages and 20 MB. Documents must contain selectable vector text. Scanned raster documents without OCR layers are automatically detected and flagged to maintain verification accuracy.",
  },
  {
    question: "How does TenderPilot AI prevent AI hallucinations?",
    answer:
      "Every requirement extracted by our analysis pipeline includes a verbatim source quote, exact page number reference, and character span. If a requirement cannot be verified directly in the source text, it is flagged with a warning banner.",
  },
  {
    question: "Can I manually add or edit extracted requirements?",
    answer:
      "Yes. The platform provides full human-in-the-loop review actions. You can confirm verified requirements, edit category classifications or obligations, reject invalid suggestions, and manually add custom criteria.",
  },
  {
    question: "How does the proposal draft generation work?",
    answer:
      "The draft generator synthesizes reviewed requirements into 5 structured tender proposal sections: Executive Summary, Technical Approach, Work Plan, Team Qualifications, and Compliance Matrix. Specific company data points are highlighted with bracketed placeholders for human completion.",
  },
  {
    question: "What format is the final proposal exported in?",
    answer:
      "Proposals are exported as structured Microsoft Word (.docx) documents featuring clean corporate typography, formatted section headers, and styled tables ready for your team's final polish.",
  },
];

/* Step-by-step workflow stages representing the five core phases of tender intelligence */
const workflowSteps = [
  {
    step: "01",
    title: "Upload & Ingest",
    description:
      "Upload PDF tender documents up to 150 pages. The ingestion engine validates file integrity, detects duplicates via SHA-256, and extracts page-level text.",
    badge: "Vector Text PDF",
    accent: "from-blue-600 to-indigo-600",
  },
  {
    step: "02",
    title: "Extract Requirements",
    description:
      "AI automatically discovers and categorizes requirements into Technical, Financial, Legal, and Experience criteria with exact page and quote citations.",
    badge: "Source-Grounded",
    accent: "from-amber-600 to-amber-700",
  },
  {
    step: "03",
    title: "Compliance Checklist",
    description:
      "Track compliance status (Compliant, Partial, Non-Compliant) across every item with inline reviewer notes and team clarification tracking.",
    badge: "Audit Matrix",
    accent: "from-emerald-600 to-teal-600",
  },
  {
    step: "04",
    title: "AI Proposal Drafting",
    description:
      "Generate 5 comprehensive proposal sections based solely on verified requirements, complete with clear placeholders for your company specifics.",
    badge: "5 Standard Sections",
    accent: "from-blue-600 to-cyan-600",
  },
  {
    step: "05",
    title: "Export to DOCX",
    description:
      "Download a production-grade Microsoft Word document formatted with executive headings, compliance tables, and document metadata.",
    badge: "Ready for Human Review",
    accent: "from-indigo-600 to-violet-600",
  },
];

/* Platform feature highlights displaying core technical capabilities */
const features = [
  {
    title: "Verbatim Source Grounding",
    description:
      "Every detected clause is matched to an exact quote and page number, providing an audit trail that eliminates guesswork.",
    tag: "Audit Trail",
    isGold: true,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Dual-Pass Verification",
    description:
      "An automated verification pass checks all AI-proposed clauses against raw document text before marking them as verified.",
    tag: "Verification Pass",
    isGold: false,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Human-in-the-Loop Actions",
    description:
      "Confirm, edit, reject, or manually create requirements so your bid team maintains complete editorial control.",
    tag: "Full Oversight",
    isGold: false,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    title: "Duplicate PDF Protection",
    description:
      "SHA-256 content hashing prevents accidental duplicate uploads, saving processing time and avoiding redundant projects.",
    tag: "Integrity",
    isGold: false,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Pipeline Polling",
    description:
      "Background worker architecture processes large PDFs asynchronously with live status feedback without blocking navigation.",
    tag: "Non-Blocking",
    isGold: false,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: "Corporate Word DOCX Export",
    description:
      "Generate clean .docx deliverables that adhere to bidding standards, complete with formatted compliance tables and clear callouts.",
    tag: "DOCX Export",
    isGold: true,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

/* Mockup tab identifiers for the interactive hero frame preview */
type MockupTab = "requirements" | "checklist" | "draft" | "export";

export default function LandingPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeMockupTab, setActiveMockupTab] = useState<MockupTab>("requirements");

  /* Session state detection on mount */
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          setSessionUser(data.user);
        } else {
          setSessionUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setSessionUser(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleFaq(index: number) {
    setOpenFaq((current) => (current === index ? null : index));
  }

  return (
    <div className="min-h-screen bg-[#f7faff] text-[#0f2a47]">
      {/* Top navigation header with refined glass effect */}
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition opacity-95 hover:opacity-100">
            <Image
              src="/images/tenderpilot-symbol.png"
              alt="TenderPilot AI Logo"
              width={34}
              height={34}
              className="h-8 w-auto object-contain"
              priority
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-[#0f2a47] leading-tight">
                TenderPilot <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase leading-none">
                Enterprise Intelligence
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#workflow" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              Workflow
            </a>
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              Features
            </a>
            <a href="#guidelines" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              Guidelines
            </a>
            <a href="#faq" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthLoading ? (
              <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
            ) : sessionUser ? (
              /* Authenticated state: shows Sign Out and Workspace shortcut */
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-3.5 py-2 text-xs font-semibold text-white shadow-sm border-t border-blue-400/30 hover:from-[#1d4ed8] hover:to-[#1742b6] transition-all"
                >
                  <span>Workspace</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:border-red-200 hover:bg-red-50/50 hover:text-red-700 transition-all"
                >
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* Unauthenticated state: shows Sign In and Register buttons, no workspace */
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0f2a47] shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white shadow-sm border-t border-blue-400/30 hover:from-[#1d4ed8] hover:to-[#1742b6] hover:shadow transition-all"
                >
                  <span>Register</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero section with split layout: left headline/CTA, right authentic photo-frame mockup */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-[#f7faff] via-white to-[#f7faff]">
        {/* Subtle ambient lighting decorations */}
        <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left side: Hero textual content and call to action buttons */}
            <div className="lg:col-span-6 xl:col-span-6">
              {/* Premium category tag with burnished gold accent */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/70 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 ring-4 ring-amber-400/20" />
                <span className="tracking-wide">Institutional Tender Intelligence</span>
              </div>

              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0f2a47] sm:text-4xl lg:text-5xl leading-[1.12]">
                Turn 100+ Page Tenders into{" "}
                <span className="relative inline-block bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  Winning Proposals
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Automate requirement discovery with verbatim page citations, verify compliance against every mandatory
                clause, and generate audit-grounded proposals with zero hallucination.
              </p>

              {/* Action buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={sessionUser ? "/dashboard" : "/register"}
                  className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-6 text-sm font-semibold tracking-wide text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] border-t border-blue-400/40 hover:from-[#1d4ed8] hover:to-[#1742b6] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                >
                  <span>{sessionUser ? "Open Tender Workspace" : "Start Free Evaluation"}</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="#workflow"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300/90 bg-white px-5 text-sm font-semibold text-[#0f2a47] shadow-xs hover:border-[#0f2a47] hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                >
                  <span>Explore Workflow</span>
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>

              {/* Key Trust Signals */}
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/90 pt-6 text-slate-600">
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-[#0f2a47]">100%</span>
                  <span className="text-xs text-slate-500 font-medium">Quote Grounded</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-blue-600">150 Pages</span>
                  <span className="text-xs text-slate-500 font-medium">PDF Capacity</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-amber-700">DOCX</span>
                  <span className="text-xs text-slate-500 font-medium">Proposal Export</span>
                </div>
              </div>
            </div>

            {/* Right side: Authentic photo-frame application window mockup */}
            <div className="lg:col-span-6 xl:col-span-6">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Subtle gold badge seal hovering top right */}
                <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100 px-3 py-1 shadow-md">
                  <span className="text-xs font-black text-amber-800">★ VERIFIED AUDIT MATRIX</span>
                </div>

                {/* Photo-frame browser window container */}
                <div className="overflow-hidden rounded-2xl border-2 border-slate-300/90 bg-white shadow-[0_20px_50px_-10px_rgba(15,42,71,0.22)] ring-1 ring-slate-900/5">
                  {/* Window title bar chrome */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-[#0f2a47] px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-400 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
                    </div>

                    <div className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 text-xs text-slate-200 font-mono">
                      <svg className="h-3.5 w-3.5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>workspace / tender-analysis / #WASA-2026</span>
                    </div>

                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Ready
                    </span>
                  </div>

                  {/* Inner Workspace Document Header */}
                  <div className="border-b border-slate-100 bg-[#f7faff] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                            ICB-2026-ENG-402
                          </span>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            ANALYZED
                          </span>
                        </div>
                        <h2 className="mt-1.5 text-sm sm:text-base font-bold text-[#0f2a47]">
                          Supervisory Control & Data Acquisition (SCADA) Upgrade
                        </h2>
                        <p className="text-xs text-slate-500">
                          Dhaka Water Supply & Sewerage Authority · Due: Nov 24, 2026
                        </p>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase block">Compliance</span>
                        <span className="text-base font-extrabold text-emerald-600">92.8%</span>
                      </div>
                    </div>

                    {/* Interactive Tab Switcher in the Mockup Frame */}
                    <div className="mt-4 flex gap-1 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveMockupTab("requirements")}
                        className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                          activeMockupTab === "requirements"
                            ? "border-blue-600 text-blue-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>Requirements</span>
                        <span className="rounded-full bg-blue-100 px-1.5 text-[10px] text-blue-700">28</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMockupTab("checklist")}
                        className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                          activeMockupTab === "checklist"
                            ? "border-blue-600 text-blue-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>Checklist</span>
                        <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] text-emerald-700">100%</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMockupTab("draft")}
                        className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                          activeMockupTab === "draft"
                            ? "border-blue-600 text-blue-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>Draft</span>
                        <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">5 Sec</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMockupTab("export")}
                        className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                          activeMockupTab === "export"
                            ? "border-blue-600 text-blue-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>Export</span>
                        <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] text-indigo-700">DOCX</span>
                      </button>
                    </div>
                  </div>

                  {/* Mockup Tab Body Content */}
                  <div className="p-4 sm:p-5 bg-white min-h-[260px]">
                    {activeMockupTab === "requirements" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-700">Requirement Clause #04</span>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                            Verified Citation ✓
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-[#0f2a47]">
                          Contractor must demonstrate minimum 10 years experience in municipal SCADA infrastructure.
                        </p>

                        <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 p-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
                            <span className="flex items-center gap-1">
                              <span className="text-amber-600 font-black">★</span> Source Quote (Page 18, Para 4)
                            </span>
                            <span className="text-amber-700">100% Match</span>
                          </div>
                          <p className="text-xs font-mono text-amber-950 leading-relaxed">
                            &ldquo;Bidders shall possess at least 10 (ten) consecutive years of certified corporate experience in water utility SCADA deployments.&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                          <span className="font-medium">Category: Technical · Obligation: Mandatory</span>
                          <span className="text-blue-600 font-semibold cursor-pointer">Jump to Page 18 →</span>
                        </div>
                      </div>
                    )}

                    {activeMockupTab === "checklist" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">Compliance Audit Summary</span>
                          <span className="font-bold text-emerald-600">26/28 Compliant</span>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0f2a47]">ISO 9001:2015 Quality Certification</span>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            COMPLIANT
                          </span>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0f2a47]">Key Personnel: Project Manager 15+ Yrs</span>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            COMPLIANT
                          </span>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0f2a47]">Joint Venture Agreement Notarization</span>
                          <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                            PARTIAL REVIEW
                          </span>
                        </div>
                      </div>
                    )}

                    {activeMockupTab === "draft" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-700">Section 2: Technical Methodology</span>
                          <span className="text-xs font-semibold text-blue-600">AI Generated</span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-700">
                          Our proposed SCADA architecture integrates redundant PLC controllers with sub-second failover, adhering directly to Dhaka WASA technical specifications...
                        </p>
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 font-semibold">
                          Placeholder detected: [COMPANY TO PROVIDE: Specific SCADA Server Hardware Model]
                        </div>
                      </div>
                    )}

                    {activeMockupTab === "export" && (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-bold text-[#0f2a47]">Proposal Document Package</h4>
                        <p className="mt-1 text-xs text-slate-500 max-w-xs">
                          Word format (.docx) with formatted cover page, executive summary, and compliance table.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                          Download Proposal DOCX
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Frame caption footer */}
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-xs text-slate-500 font-medium">
                    Click tabs above to preview actual TenderPilot AI workspace capabilities.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Navy Enterprise Feature Banner */}
      <section className="bg-[#0f2a47] py-12 text-white border-b border-blue-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8 text-center">
            <div className="flex flex-col items-center p-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-400">100%</span>
              <span className="mt-1 text-xs sm:text-sm font-medium text-slate-300">Verbatim</span>
              <span className="mt-0.5 text-[11px] text-amber-300 font-semibold">★ Source-Grounded Citations</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-white">150+</span>
              <span className="mt-1 text-xs sm:text-sm font-medium text-slate-300">Pages Supported</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Vector PDF Processing</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">5 Standard</span>
              <span className="mt-1 text-xs sm:text-sm font-medium text-slate-300">Proposal Sections</span>
              <span className="mt-0.5 text-[11px] text-emerald-300">AI Grounded Drafting</span>
            </div>
            <div className="flex flex-col items-center p-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400">0%</span>
              <span className="mt-1 text-xs sm:text-sm font-medium text-slate-300">Hallucination Tolerance</span>
              <span className="mt-0.5 text-[11px] text-amber-300">Strict Human Oversight</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Workflow Walkthrough Section */}
      <section id="workflow" className="py-20 sm:py-28 bg-[#f7faff] border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 uppercase">
              End-to-End Workflow
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f2a47] sm:text-4xl">
              From Raw PDF to Submissible Bid in 5 Steps
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-600">
              A structured lifecycle that enforces strict human oversight and verifiable citations.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:-translate-y-1 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-2xl font-black text-amber-700/80 font-mono">{item.step}</span>
                    <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#0f2a47]">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Capabilities & Deep Navy Contrast Grid */}
      <section id="features" className="py-20 sm:py-28 bg-[#0f2a47] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 uppercase">
              ★ Enterprise-Grade Reliability
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Engineered for Absolute Bid Compliance
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-300">
              Contract review software designed for mission-critical procurement proposals where accuracy cannot be compromised.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs transition hover:border-blue-400/50 hover:bg-white/10 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
                    {feat.icon}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      feat.isGold
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                        : "bg-blue-400/10 text-blue-300 border border-blue-400/20"
                    }`}
                  >
                    {feat.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Guidelines Section */}
      <section id="guidelines" className="py-20 sm:py-28 bg-[#f7faff] border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest text-blue-700 uppercase">
              Best Practices
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f2a47] sm:text-4xl">
              User Guidelines & Preparation Standards
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-600">
              Ensure the highest extraction fidelity and zero parsing warnings by following these standards.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                  1
                </span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                  Essential
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0f2a47]">Selectable Vector Text</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Ensure the PDF tender contains searchable vector text. If uploading a scanned paper tender, run optical character recognition (OCR) first. Maximum size is 20 MB and 150 pages.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                  2
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  Audit Step
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0f2a47]">Review & Confirm Clauses</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Always review AI classifications in the Requirements tab. Confirm verified items, adjust categories if necessary, and use the built-in Page Text Viewer to cross-examine original clauses.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                  3
                </span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Export Prep
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0f2a47]">Complete Company Placeholders</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Before downloading the final Word DOCX, check the Draft tab for company placeholders highlighted in amber. Replace all bracketed items with your company&apos;s specific corporate details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 sm:py-28 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest text-blue-700 uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f2a47] sm:text-4xl">
              Answers for Bidding & Legal Teams
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-600">
              Clear information regarding verification guarantees, security, and proposal deliverable formats.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-xl border border-slate-200 bg-[#f7faff] transition shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 text-left text-base font-semibold text-[#0f2a47] focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 font-bold">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-200/80 px-5 pt-3 pb-5 text-sm leading-relaxed text-slate-600 bg-white rounded-b-xl">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Executive Call to Action Banner */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-[#f7faff]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-blue-900/30 bg-[#0f2a47] p-8 sm:p-12 text-center text-white shadow-xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 uppercase">
                ★ Accelerate Bid Cycles
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Streamline Your Next Tender Proposal?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-300">
                Join forward-thinking bid teams automating requirement parsing, audit tracking, and submissible draft generation.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href={sessionUser ? "/dashboard" : "/register"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 border-t border-blue-400/40 hover:from-[#1d4ed8] hover:to-[#1742b6] transition-all"
                >
                  <span>{sessionUser ? "Open Tender Workspace" : "Create Account"}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20 transition-all"
                >
                  Sign In to Existing Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Corporate Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/tenderpilot-symbol.png"
              alt="TenderPilot Symbol"
              width={26}
              height={26}
              className="h-6 w-auto object-contain"
            />
            <span className="text-sm font-bold text-[#0f2a47]">
              TenderPilot <span className="text-blue-600">AI</span>
            </span>
          </div>

          <p className="text-xs text-slate-400">
            &copy; 2026 TenderPilot AI. All rights reserved. Enterprise Tender Intelligence & Compliance.
          </p>

          <div className="flex items-center gap-5 text-xs text-slate-500 font-medium">
            <Link href="/login" className="hover:text-blue-600 transition">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-blue-600 transition">
              Register
            </Link>
            <Link href="/dashboard" className="hover:text-blue-600 transition">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
