# TenderPilot AI

TenderPilot AI is a source-grounded tender analysis and proposal workspace. It extracts requirements from PDF tenders, verifies source quotes and page numbers, supports compliance review, generates an editable proposal draft, and exports a structured DOCX.

The current bid-intelligence MVP also compares an active tender with uploaded reference tenders. Reference documents can be labeled as public benchmarks or synthetic test material. They are never treated as proof of company experience or previous wins.

## Features

- User registration, login, logout, and protected routes
- Tender upload with PDF signature, size, duplicate, and storage validation
- Per-page PDF text extraction with processing status and retry handling
- AI requirement extraction with schema validation, bounded chunks, one retry, and daily usage limits
- Source quote verification with Unicode, whitespace, and Bangla-digit normalization
- Requirement review, checklist status, notes, and human edits protected from re-analysis
- Five-section source-grounded proposal draft with placeholders for missing company facts
- Bid Strategy tab with benchmark themes, priority requirements, evidence gaps, and source register
- DOCX export with bid strategy, win themes, evidence gaps, benchmark register, proposal sections, highlighted placeholders, and review disclaimer
- Multi-provider AI fallback support for Gemini, Groq, and OpenRouter

## Requirements

- Node.js 22 LTS or newer
- npm
- PostgreSQL 16, either locally or through Docker Compose
- An API key for at least one configured AI provider for real analysis

## Local setup

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start PostgreSQL. The simplest option is:

   ```powershell
   docker compose up -d postgres
   ```

4. Set a strong `AUTH_SECRET` and at least one AI provider key in `.env`.

5. Generate the Prisma client and apply migrations:

   ```powershell
   npx prisma generate
   npx prisma migrate deploy
   ```

6. Start the development server:

   ```powershell
   npm run dev
   ```

Open <http://localhost:3000>.

## Docker Compose setup

Create `.env` from `.env.example`, set `AUTH_SECRET`, and add an AI key. Then run:

```powershell
docker compose up --build
```

The application is available at <http://localhost:3000> and PostgreSQL is available to the host at port `5432`. The Compose application uses the service name `postgres` in `DATABASE_URL`; the host-local value in `.env.example` uses `localhost` instead.

For a clean shutdown:

```powershell
docker compose down
```

Uploaded PDFs are stored in `./storage`. PostgreSQL data is stored in the named `tenderpilot-postgres-data` volume.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret used to sign authentication sessions; use a long random value |
| `AI_PROVIDER_CHAIN` | Comma-separated provider order, for example `gemini,groq,openrouter` |
| `AI_PROVIDER` | Single-provider fallback when `AI_PROVIDER_CHAIN` is not set |
| `AI_MODEL` | Gemini model name |
| `GEMINI_API_KEY` | Gemini API key |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model name |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | OpenRouter model name |
| `STORAGE_DIR` | Private server-side PDF storage directory |
| `RUN_REAL_AI_TEST` | Set to `1` only when intentionally running the opt-in real-provider test |

Never commit `.env`, provider keys, uploaded PDFs, or the local `storage/` directory.

## Database and schema notes

Prisma schema: `prisma/schema.prisma`.

Important relationships:

- `User` owns tenders and daily AI usage records.
- `Tender` stores metadata, private file metadata, processing state, source role, and draft state.
- `DocumentPage` stores extracted text per page.
- `Requirement` stores extracted, verified, and reviewed tender requirements.
- `DraftSection` stores the five editable proposal sections and safety warnings.
- `Tender.sourceType` distinguishes the active bid from `PUBLIC_REFERENCE` and `SYNTHETIC_REFERENCE` benchmark documents.

Apply committed migrations with:

```powershell
npx prisma migrate deploy
```

Do not use `npm audit fix --force` as a Prisma upgrade strategy. The project uses an npm override for the vulnerable transitive `deepmerge-ts` dependency.

## Quality checks

Run these before handover:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
git diff --check
```

The real-provider test is skipped unless `RUN_REAL_AI_TEST=1` and the required provider environment is configured.

## Bid-intelligence workflow

1. Upload the real tender and keep its role as `Active tender to bid on`.
2. Upload a public tender and select `Public reference tender`.
3. Upload a generated or otherwise synthetic test PDF and select `Synthetic benchmark for testing`.
4. Analyze all documents.
5. Open the active tender’s `Strategy` tab.
6. Review benchmark themes, priority requirements, evidence gaps, and source labels.
7. Generate and edit the proposal draft.
8. Complete all company-information placeholders with verified company facts.
9. Export the DOCX only after a person has reviewed it against the original tender.

The reference comparison feature identifies structural patterns. It does not infer competitor behavior, prove that a tender was won, or create company credentials.

## Known limitations

- Scanned PDFs without selectable text are reported as unsupported; OCR is not enabled in the current MVP.
- Company profiles, past-performance libraries, and award outcomes are not yet separate first-class records. Company facts must currently be supplied by the user through verified notes and placeholders.
- Benchmark tenders are not evidence of company experience and must not be presented as such.
- AI-generated content remains subject to human review and may require edits for tone, strategy, and factual completeness.
- Local file storage is suitable for development and demonstration. Production deployment should use private object storage, malware scanning, encrypted backups, and a shared rate-limit store.
- The production build currently reports non-blocking Turbopack warnings about dynamic filesystem tracing in `src/lib/storage.ts`.

## Security notes

- All tender, requirement, draft, and export queries are scoped to the authenticated owner.
- Provider keys are read server-side and are never sent to the browser.
- PDF storage keys are UUID-based and are not directly exposed as public URLs.
- User-provided text is rendered as text; raw HTML injection is not used.
- Export requires an explicit human-review confirmation.

## Project status

The project has completed the core workflow through export and the application-level security review.