from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "TenderPilot_AI_Final_Submission_Report.docx"

NAVY = "0F2A47"
BLUE = "2563EB"
LIGHT_BLUE = "EAF2FF"
LIGHT_GRAY = "F4F6F8"
BORDER = "D9D9D9"
BLACK = "000000"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color=BORDER, size="6"):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    margins = tc_pr.first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        tc_pr.append(margins)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = margins.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            margins.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def set_cell_text(cell, text, bold=False, color=BLACK, size=10.2, align=None):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    if align is not None:
        paragraph.alignment = align
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.05
    run = paragraph.add_run(str(text))
    run.bold = bold
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)


def add_page_number(paragraph):
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr)
    run._r.append(fld_char2)


def set_run_font(run, name="Times New Roman", size=11, bold=False, italic=False, color=BLACK):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:ascii"), name)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def add_rich_paragraph(doc, lead, body, style="Body Text"):
    p = doc.add_paragraph(style=style)
    lead_run = p.add_run(lead)
    set_run_font(lead_run, bold=True)
    body_run = p.add_run(body)
    set_run_font(body_run)
    return p


def add_bullet(doc, lead, body, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.paragraph_format.left_indent = Inches(0.25 + 0.22 * level)
    p.paragraph_format.first_line_indent = Inches(-0.16)
    lead_run = p.add_run(lead)
    set_run_font(lead_run, bold=True)
    body_run = p.add_run(body)
    set_run_font(body_run)
    return p


def add_numbered(doc, text, number):
    p = doc.add_paragraph(style="List Number")
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.18)
    run = p.add_run(text)
    set_run_font(run)
    return p


def add_table(doc, headers, rows, widths=None, font_size=9.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    header_row = table.rows[0]
    set_repeat_table_header(header_row)
    for i, header in enumerate(headers):
        cell = header_row.cells[i]
        set_cell_text(cell, header, bold=True, color=WHITE, size=font_size)
        set_cell_shading(cell, NAVY)
        set_cell_borders(cell)
        if widths:
            cell.width = Inches(widths[i])
    for row_index, row_values in enumerate(rows):
        row = table.add_row()
        for i, value in enumerate(row_values):
            cell = row.cells[i]
            set_cell_text(cell, value, size=font_size)
            set_cell_shading(cell, LIGHT_BLUE if row_index % 2 == 0 else WHITE)
            set_cell_borders(cell)
            if widths:
                cell.width = Inches(widths[i])
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_run_font(run, size=15 if level == 1 else 12.5, bold=True)
    return p


def add_body(doc, text, align=None):
    p = doc.add_paragraph(style="Body Text")
    if align is not None:
        p.alignment = align
    run = p.add_run(text)
    set_run_font(run)
    return p


def add_small(doc, text, italic=False, align=None):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    set_run_font(run, size=9.5, italic=italic, color="444444")
    return p


def add_code_line(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    set_run_font(run, name="Courier New", size=9.5, color=NAVY)
    return p


def configure_styles(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(BLACK)

    for style_name in ("Body Text", "List Bullet", "List Bullet 2", "List Number"):
        style = styles[style_name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style.font.size = Pt(11)
        style.font.color.rgb = RGBColor.from_string(BLACK)
        style.paragraph_format.space_after = Pt(5)
        style.paragraph_format.line_spacing = 1.08

    for level, size in ((1, 15), (2, 12.5)):
        style = styles[f"Heading {level}"]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(BLACK)
        style.paragraph_format.space_before = Pt(13 if level == 1 else 8)
        style.paragraph_format.space_after = Pt(5)
        style.paragraph_format.keep_with_next = True


def add_header_footer(section):
    section.different_first_page_header_footer = True
    header = section.header
    header_p = header.paragraphs[0]
    header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header_p.paragraph_format.space_after = Pt(0)
    r = header_p.add_run("TenderPilot AI  |  Final Submission Report")
    set_run_font(r, size=8.5, color="666666")

    footer = section.footer
    footer_p = footer.paragraphs[0]
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_p.paragraph_format.space_before = Pt(0)
    r = footer_p.add_run("TenderPilot AI  |  Page ")
    set_run_font(r, size=8.5, color="666666")
    add_page_number(footer_p)


def build_document():
    doc = Document()
    configure_styles(doc)
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)
    add_header_footer(section)

    # Title block, following the reference report's opening style without a separate cover.
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run("TenderPilot AI")
    set_run_font(r, size=20, bold=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(15)
    r = p.add_run("Final Submission Report")
    set_run_font(r, size=15, bold=True)

    add_rich_paragraph(
        doc,
        "Project: ",
        "TenderPilot AI - AI-assisted tender analysis and proposal drafting workspace.",
    )
    add_rich_paragraph(
        doc,
        "Team: ",
        "Solo Development Team - Aspire Internship Program.",
    )
    add_rich_paragraph(
        doc,
        "Developer: ",
        "Mushfiqur Rahman.",
    )
    add_rich_paragraph(
        doc,
        "Submission date: ",
        "16 November 2026.",
    )
    add_rich_paragraph(
        doc,
        "Project status: ",
        "Completed and approved by the supervisor for deployment.",
    )
    doc.add_paragraph().paragraph_format.space_after = Pt(1)

    add_heading(doc, "1. Project Overview", 1)
    add_body(
        doc,
        "TenderPilot AI is a full-stack web application designed to help Bangladeshi suppliers, IT firms, contractors, and consultants understand tender documents and prepare structured proposal drafts. The system combines secure tender intake, page-level PDF extraction, AI-assisted requirement analysis, source verification, compliance review, proposal drafting, and DOCX export in one workspace.",
    )
    add_body(
        doc,
        "The project was developed as a 20-day implementation assignment with a clear emphasis on source-grounded results. Every extracted requirement is connected to the original document page and quote, while missing information is surfaced as NOT FOUND instead of being guessed. The final application supports the complete workflow from upload to review and export, with clear processing states and safe error handling throughout.",
    )
    add_rich_paragraph(
        doc,
        "Project objective: ",
        "Deliver a working MVP that allows an authenticated user to upload a tender PDF, extract and verify requirements, review compliance items, generate and edit a proposal draft, and download a professional DOCX document.",
    )
    add_rich_paragraph(
        doc,
        "Delivered outcome: ",
        "A source-grounded tender intelligence and proposal workspace with secure ownership controls, AI provider safeguards, responsive screens, database persistence, deployment configuration, and supervisor approval for deployment.",
    )

    add_heading(doc, "2. Key Features and Modules", 1)
    add_heading(doc, "Authentication and User Workspace", 2)
    add_bullet(doc, "Registration and login: ", "Users register with validated credentials, securely hashed passwords, and protected sessions.")
    add_bullet(doc, "Protected routes: ", "Dashboard, tender pages, and API routes require authentication through the server-side auth layer.")
    add_bullet(doc, "Ownership isolation: ", "Tender, page, requirement, draft, and export queries are scoped to the authenticated owner.")
    add_bullet(doc, "Login protection: ", "Repeated failed login attempts are rate-limited and user-facing errors remain generic.")

    add_heading(doc, "Tender Intake and File Validation", 2)
    add_bullet(doc, "Tender creation: ", "Users can record title, issuer, reference, deadline, notes, and source role.")
    add_bullet(doc, "PDF validation: ", "The server checks the file extension, PDF signature, file size, page limit, encryption state, and file integrity.")
    add_bullet(doc, "Duplicate protection: ", "SHA-256 content hashing identifies duplicate uploads for the same user and presents a clear warning before processing.")
    add_bullet(doc, "Private storage: ", "Uploaded files are stored under UUID-based keys and are not exposed through public file URLs.")

    add_heading(doc, "Document Processing and Page Viewer", 2)
    add_bullet(doc, "Per-page extraction: ", "PDF text is extracted and stored as DocumentPage records with page numbers, character counts, and readable-text status.")
    add_bullet(doc, "Processing lifecycle: ", "The application tracks PROCESSING, ANALYZED, ATTENTION_REQUIRED, and PROCESSING_FAILED states.")
    add_bullet(doc, "Progress and retry: ", "The tender page polls status, shows processing stages, surfaces clear error messages, and provides a retry action.")
    add_bullet(doc, "Source viewer: ", "Users can inspect page text and review the original context behind extracted requirements.")

    add_heading(doc, "AI Requirement Extraction", 2)
    add_bullet(doc, "Bounded analysis: ", "Long documents are divided into bounded page-aware chunks so page references remain available to the extraction process.")
    add_bullet(doc, "Structured output: ", "The provider response is validated with Zod schemas before it can enter the application workflow.")
    add_bullet(doc, "Safe retry: ", "Malformed structured output is retried once, while provider failures are mapped into application-safe errors.")
    add_bullet(doc, "Provider fallback: ", "Gemini, Groq, and OpenRouter can be configured as a provider chain for resilience.")
    add_bullet(doc, "Completeness backstop: ", "Deterministic extraction and consolidation rules preserve high-value eligibility, financial, technical, schedule, and contact requirements from dense document layouts.")
    add_bullet(doc, "Cost control: ", "Chunk limits and per-user daily analysis limits help control provider usage.")

    add_heading(doc, "Source Verification and Key Facts", 2)
    add_bullet(doc, "Quote verification: ", "The application normalizes whitespace, Unicode forms, and Bangla digits before checking a quote against page text.")
    add_bullet(doc, "Page correction: ", "When a quote is found on a different page than the AI-cited page, the verifier can correct the source page.")
    add_bullet(doc, "Verification labels: ", "Requirements are presented as VERIFIED, UNVERIFIED, or NOT FOUND according to the available source evidence.")
    add_bullet(doc, "Key facts panel: ", "Deadline, validity, bid security, submission method, and contact information are shown with source-aware values.")

    add_heading(doc, "Requirements Review and Compliance Checklist", 2)
    add_bullet(doc, "Review actions: ", "Users can confirm, edit, reject, or add manual requirements.")
    add_bullet(doc, "Review persistence: ", "Human-edited and manually added items are protected when processing is run again.")
    add_bullet(doc, "Checklist statuses: ", "Each non-rejected requirement can be marked with a compliance status and reviewer note.")
    add_bullet(doc, "Server-side rules: ", "Mandatory items require an appropriate checklist decision and meaningful notes where the rule applies.")

    add_heading(doc, "Proposal Drafting and DOCX Export", 2)
    add_bullet(doc, "Five-section draft: ", "The system generates a structured proposal draft with sections for company profile, understanding, methodology, work plan, and compliance response.")
    add_bullet(doc, "Source-grounded writing: ", "Missing company facts are represented with explicit placeholders instead of invented claims.")
    add_bullet(doc, "Draft safety checks: ", "Forbidden claims and unsupported numeric statements are detected and surfaced for review.")
    add_bullet(doc, "Editing workflow: ", "Users can edit, save, and regenerate sections with confirmation before replacing existing text.")
    add_bullet(doc, "DOCX export: ", "The exported document includes title information, strategy context, proposal sections, highlighted placeholders, source notes, and a human-review disclaimer.")

    add_heading(doc, "Bid Strategy Intelligence", 2)
    add_bullet(doc, "Reference comparison: ", "Active tenders can be compared with public or synthetic reference tenders to identify structural patterns and recurring themes.")
    add_bullet(doc, "Evidence gaps: ", "The strategy view identifies information the company must provide or verify before submission.")
    add_bullet(doc, "Source register: ", "Reference sources and tender signals remain visible so strategic recommendations stay traceable.")

    add_heading(doc, "3. Technology Stack", 1)
    add_table(
        doc,
        ["Layer", "Technology", "Purpose"],
        [
            ("Application framework", "Next.js 16.4.2 with React 19.3.0", "Full-stack App Router application, server components, pages, and API routes."),
            ("Language and styling", "TypeScript, Tailwind CSS", "Typed application code and responsive interface styling."),
            ("Authentication", "NextAuth 5 credentials provider", "Session-based authentication and protected routes."),
            ("Password security", "bcryptjs", "One-way password hashing and verification."),
            ("Database", "PostgreSQL 16 with Prisma 6.19.3", "Persistent users, tenders, pages, requirements, usage, and draft sections."),
            ("PDF processing", "pdfjs-dist 6.4.299", "PDF validation, page-level text extraction, and document inspection."),
            ("AI integration", "Gemini, Groq, and OpenRouter adapters", "Structured extraction, provider fallback, retry, and error mapping."),
            ("Validation", "Zod 4.6.7", "Request validation and AI response schema validation."),
            ("Testing", "Vitest 4.1.11", "Repeatable unit and provider-behavior test suites."),
            ("Document generation", "docx 9.15.3", "Structured proposal DOCX generation with highlighted review placeholders."),
            ("Deployment", "Docker, Docker Compose, Node.js 22", "Reproducible application runtime with PostgreSQL service."),
        ],
        widths=[1.35, 2.05, 3.15],
    )

    add_heading(doc, "4. Deployment and Configuration", 1)
    add_body(doc, "TenderPilot AI is prepared for deployment through a multi-stage Docker build and Docker Compose configuration. The runtime separates the production application container from the PostgreSQL service and keeps uploaded files in a mounted private storage directory.")
    add_heading(doc, "Local Development", 2)
    add_code_line(doc, "npm ci")
    add_code_line(doc, "Copy-Item .env.example .env")
    add_code_line(doc, "docker compose up -d postgres")
    add_code_line(doc, "npx prisma generate")
    add_code_line(doc, "npx prisma migrate deploy")
    add_code_line(doc, "npm run dev")

    add_heading(doc, "Docker Compose Deployment", 2)
    add_code_line(doc, "Copy-Item .env.example .env")
    add_code_line(doc, "docker compose up --build")
    add_body(doc, "The application is exposed on port 3000, PostgreSQL is provided by the postgres service, and the storage directory is mounted at /app/storage. The application container uses the Compose service name for its database connection.")

    add_heading(doc, "Environment Configuration", 2)
    add_table(
        doc,
        ["Variable", "Purpose"],
        [
            ("DATABASE_URL", "PostgreSQL connection string."),
            ("AUTH_SECRET", "Secret used to sign authentication sessions."),
            ("AI_PROVIDER_CHAIN", "Ordered provider fallback chain."),
            ("AI_PROVIDER / AI_MODEL", "Default provider and model selection."),
            ("GEMINI_API_KEY", "Server-side Gemini provider credential."),
            ("GROQ_API_KEY / GROQ_MODEL", "Server-side Groq provider configuration."),
            ("OPENROUTER_API_KEY / OPENROUTER_MODEL", "Server-side OpenRouter provider configuration."),
            ("STORAGE_DIR", "Private directory for uploaded tender PDFs."),
            ("RUN_REAL_AI_TEST", "Explicit opt-in switch for the real-provider smoke test."),
        ],
        widths=[2.35, 4.2],
    )
    add_body(doc, "All credentials are supplied through environment variables. The repository includes .env.example for setup guidance and excludes local .env files, provider keys, and uploaded storage from version control.")

    add_heading(doc, "Database Schema and Migrations", 2)
    add_body(doc, "The Prisma schema models the complete workflow through User, Tender, DocumentPage, Requirement, AiAnalysisUsage, and DraftSection records. Committed migrations create the schema incrementally for user authentication, tender metadata, page extraction, AI usage limits, requirement review state, draft generation, draft warnings, and tender source roles.")

    add_heading(doc, "5. Project Architecture", 1)
    add_body(doc, "TenderPilot AI follows a modular full-stack architecture. The Next.js application provides the user interface and server API routes, Prisma provides typed database access, dedicated library modules isolate PDF and AI workflows, and the browser communicates with the server through authenticated requests.")
    add_heading(doc, "Request and Processing Flow", 2)
    for i, text in enumerate([
        "The user authenticates and opens the protected dashboard.",
        "The user creates a tender and uploads a PDF with metadata and source role.",
        "The server validates the file, calculates its hash, stores it privately, and creates the tender record.",
        "The processing service extracts page text and persists DocumentPage records.",
        "The AI analysis service builds bounded page-aware chunks, requests structured requirements, validates responses, and consolidates duplicates.",
        "The verification service checks quotes against page text and corrects source locations where necessary.",
        "The user reviews requirements, updates the checklist, and supplies human decisions.",
        "The draft service generates five editable proposal sections, preserves placeholders, and stores warnings.",
        "The export route builds a reviewed DOCX and streams it to the user after explicit confirmation.",
    ], 1):
        add_numbered(doc, text, i)

    add_heading(doc, "API Route Families", 2)
    add_table(
        doc,
        ["Route family", "Primary responsibility", "Protection"],
        [
            ("/api/auth", "Registration and credential authentication.", "Public registration; session-backed login."),
            ("/api/tenders", "Tender list, creation, update, and deletion.", "Authenticated owner checks."),
            ("/api/tenders/[id]/pages", "Page text and page-level source data.", "Authenticated owner checks."),
            ("/api/tenders/[id]/process", "Start and retry document processing.", "Authenticated owner checks."),
            ("/api/tenders/[id]/status", "Processing status and error state polling.", "Authenticated owner checks."),
            ("/api/tenders/[id]/requirements", "Requirements list, review, and manual additions.", "Authenticated owner checks."),
            ("/api/requirements/[rid]", "Requirement review updates.", "Tender ownership verification."),
            ("/api/tenders/[id]/draft", "Draft loading and section management.", "Authenticated owner checks."),
            ("/api/tenders/[id]/draft/generate", "Draft generation and regeneration.", "Authenticated owner checks."),
            ("/api/tenders/[id]/export", "Reviewed DOCX generation and download.", "Authenticated owner and review confirmation."),
            ("/api/tenders/[id]/intelligence", "Bid strategy and reference-tender intelligence.", "Authenticated owner checks."),
        ],
        widths=[1.75, 3.05, 1.75],
        font_size=9.2,
    )

    add_heading(doc, "AI Safety Architecture", 2)
    add_bullet(doc, "Document text is treated as untrusted data: ", "Text extracted from PDFs is clearly separated from system instructions and cannot override the application prompt.")
    add_bullet(doc, "No tool access from the AI request: ", "The provider adapter is used only for structured generation and has no application tools or network actions exposed to document content.")
    add_bullet(doc, "Schema barrier: ", "Zod validation prevents malformed AI data from moving into persistence or user-facing features.")
    add_bullet(doc, "Human review barrier: ", "The export workflow requires explicit human-review confirmation and retains placeholders for facts that must be supplied by the company.")

    add_heading(doc, "6. Repository Structure", 1)
    add_body(doc, "The repository is organized by application route, reusable UI component, and domain-specific library module. This structure keeps the workflow understandable and allows the PDF, AI, requirements, draft, export, and validation concerns to evolve independently.")
    add_table(
        doc,
        ["Path", "Description"],
        [
            ("src/app", "Next.js pages, layouts, landing page, authentication screens, dashboard, and tender workspace."),
            ("src/app/api", "Authenticated route handlers for tenders, pages, processing, requirements, drafts, intelligence, and export."),
            ("src/components", "Reusable application shell, requirements, checklist, draft, strategy, review, and export UI components."),
            ("src/lib/ai", "Provider adapters, schemas, prompts, chunking, analysis orchestration, deterministic extraction, and AI tests."),
            ("src/lib/pdf", "PDF page extraction, processing lifecycle, status transitions, and failure mapping."),
            ("src/lib/requirements", "Normalization, consolidation, quote verification, persistence, and requirement tests."),
            ("src/lib/draft", "Draft generation orchestration and persistence of generated sections and warnings."),
            ("src/lib/export", "DOCX construction, source register, strategy context, placeholders, and review disclaimer."),
            ("src/lib/validation", "Authentication, tender, and PDF validation schemas and server-side rules."),
            ("prisma", "Database schema and committed migrations."),
            ("public/images", "Public product visuals and interface imagery."),
            ("Dockerfile and docker-compose.yml", "Production image build and PostgreSQL-backed deployment configuration."),
            ("README.md and .env.example", "Setup instructions, configuration reference, workflow guidance, and operational notes."),
        ],
        widths=[2.1, 4.45],
        font_size=9.4,
    )

    add_heading(doc, "7. Twenty Day Implementation Summary", 1)
    add_table(
        doc,
        ["Work period", "Major implementation outcome"],
        [
            ("Days 1-2", "Project setup, application skeleton, route structure, reusable UI foundation, environment configuration, and repository conventions."),
            ("Days 3-5", "User registration, password hashing, authentication, protected routes, PostgreSQL schema, Prisma migrations, tender CRUD, and dashboard."),
            ("Days 6-8", "PDF upload validation, private storage, duplicate detection, page-level extraction, processing states, polling, retry, and page viewer."),
            ("Days 9-11", "AI provider abstraction, structured schemas, safe retries, prompt safety, bounded chunks, requirement persistence, quote verification, and source-aware requirements UI."),
            ("Days 12-13", "Compliance checklist, review actions, manual requirements, edited-item protection, status persistence, filtering, and reviewer notes."),
            ("Days 14-16", "Five-section proposal generation, placeholder protection, draft editing and regeneration, review warnings, and DOCX export."),
            ("Days 17-18", "Integration and security hardening, provider failure handling, authorization checks, secret protection, source-grounded extraction safeguards, and structured test coverage."),
            ("Day 19", "Requirement extraction stabilization, duplicate and heading cleanup, mobile responsiveness, error-message polish, README updates, Docker configuration, and draft/export improvements."),
            ("Day 20", "Final acceptance, project documentation, demonstration preparation, deployment approval, and submission handover."),
        ],
        widths=[1.25, 5.3],
        font_size=9.4,
    )

    add_heading(doc, "8. Quality Assurance and Handover", 1)
    add_body(doc, "The project was prepared for final handover through automated verification, source review, workflow checks, and deployment documentation. The quality process covers both the application logic and the user-visible behavior required for a dependable tender workflow.")
    add_heading(doc, "Verification Areas", 2)
    add_bullet(doc, "Authentication and authorization: ", "Registration, login, session protection, ownership checks, and login rate limiting are implemented in the server workflow.")
    add_bullet(doc, "PDF and processing failures: ", "Invalid, encrypted, corrupt, oversized, unsupported, and unreadable documents receive explicit status and user-facing error treatment.")
    add_bullet(doc, "AI reliability: ", "Structured schemas, retry behavior, provider error mapping, fallback configuration, deterministic consolidation, and prompt-injection safeguards are included.")
    add_bullet(doc, "Draft and export safety: ", "Placeholders, unsupported-number warnings, regeneration confirmation, review confirmation, and export failure handling protect the final document workflow.")
    add_bullet(doc, "Responsive interface: ", "The dashboard, tender workspace, requirements table, checklist, draft editor, navigation, and review controls adapt to desktop and mobile layouts.")
    add_bullet(doc, "Deployment readiness: ", "The repository includes Dockerfile, Docker Compose, Prisma migrations, environment template, README setup instructions, and private storage configuration.")

    add_heading(doc, "Handover Items", 2)
    add_table(
        doc,
        ["Item", "Handover status"],
        [
            ("Working source code", "Delivered in the approved Git repository."),
            ("Application setup", "Documented for local Node.js development and Docker Compose deployment."),
            ("Database", "Prisma schema and committed migrations included."),
            ("AI integration", "Provider configuration, prompts, schemas, limits, retries, and environment variables documented in the source and README."),
            ("Security configuration", "Secrets remain server-side and are represented through .env.example without real credentials."),
            ("Testing and quality", "Automated test suite, linting, type checking, and project quality checks included in the repository workflow."),
            ("Demonstration", "Full tender workflow prepared for final demonstration from upload through DOCX export."),
            ("Approval", "Supervisor approval received for deployment."),
        ],
        widths=[2.05, 4.5],
        font_size=9.4,
    )

    add_heading(doc, "9. Conclusion", 1)
    add_body(
        doc,
        "TenderPilot AI delivers a complete, source-grounded tender analysis and proposal drafting workflow. It combines secure authentication, reliable PDF processing, structured AI extraction, page-level verification, compliance review, strategic comparison, editable proposal generation, and professional DOCX export in one coherent application.",
    )
    add_body(
        doc,
        "The implementation is organized for maintainability and deployment, with clear separation between interface components, API routes, database access, AI providers, document processing, requirement verification, drafting, and export. The project has completed its 20-day development plan and has received supervisor approval for deployment.",
    )
    add_small(doc, "Submitted as the final project documentation for the Aspire Internship Program.", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Keep the report's header and footer consistent across the body.
    for section in doc.sections:
        section.header_distance = Inches(0.3)
        section.footer_distance = Inches(0.3)

    doc.core_properties.title = "TenderPilot AI Final Submission Report"
    doc.core_properties.subject = "Final project documentation and handover report"
    doc.core_properties.author = "Mushfiqur Rahman"
    doc.core_properties.keywords = "TenderPilot AI, final report, project documentation, deployment handover"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build_document()
