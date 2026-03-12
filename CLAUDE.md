# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is
A Next.js + TypeScript + Tailwind CSS Japanese HR onboarding system for 人事CREW / TECH CREW株式会社. Automates the full employee onboarding lifecycle: admin creates contracts → employee signs and uploads identity documents → Claude AI does OCR and data validation → admin reviews and exports to CSV.

## Stack (do not change these without asking)
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Database**: PostgreSQL via Prisma 5 ORM (`/prisma/schema.prisma`)
- **File storage**: Cloudinary (document images)
- **AI**: Anthropic Claude API `claude-sonnet-4-20250514` — vision for OCR, text for validation
- **PDF**: pdf-lib (server-side, in API routes)
- **UI libs**: lucide-react (icons), sonner (toast notifications), zod (validation), date-fns (date formatting), react-signature-canvas (signature capture)
- **Deploy target**: Railway with `output: 'standalone'` in next.config.js. Deploy runs `prisma migrate deploy` then `node .next/standalone/server.js` (see railway.json)

## Development commands
```bash
npm run dev                 # Start dev server (localhost:3000)
npm run build               # Production build (standalone output)
npm run start               # Start production server (requires build first)
npm run lint                # ESLint
npx prisma migrate dev      # Apply schema changes + generate client
npx prisma generate         # Regenerate client without migrating
npx prisma studio           # Visual DB browser (localhost:5555)
```

## Architecture

### Path alias
`@/*` maps to the project root (configured in tsconfig.json). Always use `@/lib/...`, `@/components/...` etc. for imports.

### Data flow
Admin creates contract → PDF generated server-side (pdf-lib) → Employee receives token link (`/onboard/[token]`) → Employee signs contract, uploads ID docs → Claude vision API extracts data via OCR → Employee fills remaining forms (commute, family, emergency) → Claude text API validates all data → Admin reviews on dashboard → Export to CSV.

### Key files to read before touching anything
- `/lib/types.ts` — all TypeScript interfaces and `generateToken()`. Never redefine types inline, always import from here.
- `/lib/prompts.ts` — all Claude AI system prompts (OCR, validation, contract summary). Never write inline prompts in API routes.
- `/lib/db.ts` — Prisma singleton. Always import `prisma` from here, never instantiate directly.
- `/lib/cloudinary.ts` — `uploadDocument()` and `deleteDocument()`. Always use these for file operations.
- `/lib/pdf-template.ts` — PDF generation with pdf-lib (server-side only). Fetches Noto Sans JP from Google Fonts at runtime with Helvetica fallback. Supports multi-page auto-pagination.
- `/prisma/schema.prisma` — single `Onboarding` model with JSON fields for contract/personal/documents data.

### Prisma JSON field pattern
The `Onboarding` model stores `contract`, `personal`, `documents`, and `aiReview` as Prisma `Json` fields. When writing to these fields, serialize with `JSON.parse(JSON.stringify(data))` to strip non-plain objects. When reading, cast to the corresponding TypeScript type from `/lib/types.ts`.

### Route structure
- `/app/api/onboarding/` — GET: list all records (ordered by createdAt desc)
- `/app/api/onboarding/create/` — POST: creates new onboarding record, returns token + URL
- `/app/api/onboarding/[token]/` — GET: fetch record by token; PATCH: update personal/signature/documents/status
- `/app/api/onboarding/[token]/submit/` — POST: submit onboarding, runs AI validation, updates status
- `/app/api/generate-contract/` — GET: generates PDF by `?token=` lookup; POST: generates PDF from contract data in body
- `/app/api/generate-contract-summary/` — POST: AI-generated contract summary (bullet points)
- `/app/api/parse-document/` — OCR via Claude vision API
- `/app/api/validate-data/` — AI data validation
- `/app/api/commute-route/` — commute route lookup
- `/app/api/export-csv/` — GET: CSV export (optional ?token= for single record). UTF-8 BOM for Excel.
- `/app/api/health/` — GET: returns `{ status: 'ok', timestamp }` for Railway health checks
- `/app/admin/` — admin pages (dashboard, new-contract, review/[token])
- `/app/onboard/[token]` — employee-facing onboarding flow (multi-step wizard)
- `/app/page.tsx` — landing page with admin/employee entry points

### Employee onboarding architecture
- `/lib/useOnboarding.ts` — custom hook managing fetch, auto-save (1s debounce), and state for the onboarding flow. Auto-save is silent/best-effort.
- `/app/onboard/[token]/page.tsx` — orchestrator page. Renders step components based on `steps[currentStep]` label. Steps are dynamically built: inserts "在留カード" step for non-Japanese employees.
- Employee step components in `/components/employee/` all follow the `onComplete: (data) => void` callback pattern — parent merges data into `collectedData` and auto-advances.
- Onboarding status transitions: `pending` → `in_progress` → `submitted` → `reviewed` → `completed`. Pages guard on status (e.g., submitted records show a "done" screen).

### Component organization
- `/components/ui/` — reusable UI (OptionCard, StepIndicator, AINote)
- `/components/admin/` — admin-specific components (currently empty — admin UI lives directly in `/app/admin/` page files)
- `/components/employee/` — employee onboarding step components (ContractViewer, SignaturePad, DocumentUploader, ForeignerDocUploader, CommuteSelector, FamilyDataForm, EmergencyContactForm, ReviewSubmit). All implemented.

## Conventions
- All AI prompts must return pure JSON — strip markdown fences before `JSON.parse`
- All form labels are bilingual: Japanese primary, English secondary in smaller text
- Colors use Tailwind 4 default utilities (e.g., `teal-600`, `amber-500`). No tailwind.config.ts — Tailwind 4 uses `@import "tailwindcss"` in globals.css. Primary: teal `#0f6b5e`, Accent: amber `#f59e0b`, Font: Noto Sans JP (loaded via `next/font/google` as CSS variable `--font-noto-sans-jp`)
- Never use localStorage — all state persists via Prisma + Cloudinary
- API routes use Next.js Route Handlers (not pages/api). All return `{ success, data?, error? }` envelope.
- Next.js 16 async params: route handlers and pages use `params: Promise<{ token: string }>` — always `await params`
- Toast notifications: `import { toast } from 'sonner'` — Toaster is mounted in root layout
- Custom CSS animation `slideIn` is defined in `globals.css` — use `animate-[slideIn_0.3s_ease-out]` for mount animations
- `next.config.js` uses CommonJS (`module.exports`), not ESM

## Validation
No test runner is configured. To validate changes:
```bash
npm run build && npm run lint
```
Both must pass before considering a change complete.

## Environment variables expected in .env.local
DATABASE_URL, ANTHROPIC_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_APP_URL, GOOGLE_MAPS_API_KEY (optional)

## Current build status
- [x] Prompt 0 — Project init + Prisma + Cloudinary + railway.json
- [x] Prompt 1 — AI prompts library (/lib/prompts.ts)
- [x] Prompt 2 — UI components (OptionCard, StepIndicator, AINote)
- [x] Prompt 3 — Admin contract builder
- [x] Prompt 4 — PDF generation
- [x] Prompt 5 — Employee onboarding shell
- [x] Prompt 6 — Document upload + OCR
- [x] Prompt 7 — Commute selector
- [x] Prompt 8 — Family data + emergency contact
- [x] Prompt 9 — Review & submit
- [ ] Prompt 10 — AI data validation
- [x] Prompt 11 — Admin dashboard + review
- [x] Prompt 12 — Contract viewer + signature pad
- [x] Prompt 13 — Polish + Railway deploy
