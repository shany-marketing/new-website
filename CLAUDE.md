# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # local dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run migrate      # run pending SQL migrations against DATABASE_URL
```

No test suite exists. Verification is done by running the dev server and exercising the UI.

**Deploy to production:**
```bash
git add <files> && git commit -m "..." && git push
npx vercel --prod
```
Note: the Vercel auto-deploy webhook is broken — `git push` alone does NOT redeploy. Always run `npx vercel --prod` manually after pushing.

## Architecture

This is a **dual-purpose Next.js 16 app** (App Router, TypeScript, Tailwind v4):
1. **Marketing site** — public homepage, capabilities pages, talk-now landing page
2. **SaaS product dashboard** — hotel review analytics for paying customers

### Data flow for review analytics

```
Apify scraper → POST /api/webhook → normalize → raw_reviews (Postgres)
                                              ↓
                               POST /api/hotels/[id]/pipeline/run
                                              ↓
                    7-stage pipeline (lib/pipeline.ts):
                    baseline_stats → decomposition → embeddings
                    → consensus → mapping → aggregation → insights
```

**Pipeline is async.** `/api/pipeline/run` creates a `pipeline_runs` DB row and returns immediately. The client polls `/api/pipeline/status` and gets per-stage progress via `pipeline-progress.ts`. Each stage result is persisted to Postgres so reruns skip completed work.

### LLM layer (`src/lib/llm.ts`)

Multiple providers implement `LLMProvider` (OpenAI + Anthropic currently). `getActiveProviders()` returns all configured providers. Consensus (`lib/consensus.ts`) runs proposals from all providers and merges them — so adding a new provider means implementing the interface and registering it there. Prompt caching is intentional: system prompts are loaded once and reused across batches.

### Database

Postgres via `pg` pool (`src/lib/db.ts`). Use `query<T>()` / `queryOne<T>()` helpers — never import the pool directly. Migrations are numbered SQL files in `/migrations/` applied in order by `scripts/migrate.mjs`. Always add a new numbered file for schema changes; never edit existing migrations.

### Auth (`src/lib/auth.ts`)

NextAuth v5 with Credentials provider (email + bcrypt). Session carries `hotel_id`, `role` (`user` | `admin` | `chain_manager`), and for chain managers a list of all accessible hotel IDs from the `hotel_access` table. The `auth()` helper from this file guards API routes server-side.

### Marketing lead capture

Homepage forms (`SignupModal.tsx`, FAQ form in `home-client.tsx`) write leads to `localStorage('crm_leads')` via `pushLeadToCRM()` and simultaneously POST to `/api/lead-notify` which emails omri@rating-iq.com. The CRM (`crm.html`, served separately on the same domain) reads from that same localStorage key. The talk-now page (`/talk-now`) uses its own `/api/talk-now` route which also emails Omri directly.

All homepage CTA sources: `hero_cta`, `nav_book_demo`, `cta_strip`, `cornell_gap`, `elaine_feature`, `final_book_demo`, `faq_question`, `talk_now_cta`, `contact_footer`.

### Key lib files

| File | Purpose |
|---|---|
| `lib/pipeline.ts` | Orchestrates the 7-stage analysis pipeline |
| `lib/decompose.ts` | LLM stage: splits reviews into atomic feedback items |
| `lib/consensus.ts` | LLM stage: merges category proposals from multiple providers |
| `lib/mapping.ts` | LLM stage: maps atomic items to final categories |
| `lib/aggregate.ts` | Computes statistics from mapped items |
| `lib/scrape.ts` | Kicks off Apify scraper runs and tracks scrape_runs table |
| `lib/ingest.ts` | Inserts normalized reviews, skips duplicates and reviews >1yr old |
| `lib/normalize.ts` | Transforms raw Apify/Booking payloads into `NormalizedReview` |
| `lib/plan.ts` | Resolves hotel plan tier (free / ratings / premium) |
| `lib/email.ts` | Nodemailer/Gmail transporter — `sendEmail(to, subject, html)` |

### Routing structure

- `/` — marketing homepage (`home-client.tsx`)
- `/capabilities/*` — marketing capability pages (statistics, ratings, premium)
- `/talk-now` — lead capture landing page for email campaign CTAs
- `/dashboard/[hotelId]/*` — product dashboard (requires auth)
- `/dashboard/chain-manager` — multi-property chain manager view
- `/(auth)/login`, `/(auth)/signup` — auth pages
- `/api/webhook` — Apify callback (review ingestion entry point)
- `/api/hotels/[hotelId]/*` — all product API routes
- `/api/admin/*` — admin-only routes
- `/api/lead-notify` — homepage form → email notification
