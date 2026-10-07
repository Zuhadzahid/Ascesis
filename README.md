# Ascesis

Your whole week on one calm, Excalidraw-style canvas. Sign in, and a pan-and-zoom
canvas opens with seven vertical day columns for the current week. Add tasks in
seconds, check them off, drag them between days, and attach markdown notes and
checklists that stay hidden until you hover or click. Switch between **Day**,
**Week** and **Month** views and navigate to any date.

Built with Next.js (App Router) and Supabase, styled with the project palette:
Beige `#F1F3E0`, Tea Green `#D2DCB6`, Muted Teal `#A1BC98`, Dusty Olive `#778873`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) on Vercel
- **Supabase** Postgres + Auth (email/password + Google) with Row Level Security
- **Tailwind v4** design tokens + **lucide-react** icons
- **TanStack Query** with optimistic updates and per-month caching
- **fractional-indexing** for drag ordering, **date-fns** + `@date-fns/tz` for dates
- **Vitest** unit tests, **Playwright** end-to-end tests

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in from your Supabase project (Dashboard → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:4000` in dev)

### 3. Apply the database schema

With Docker running you can develop against a local Supabase:

```bash
npx supabase start          # local Postgres, Auth, Studio, Mailpit
npx supabase db reset       # applies supabase/migrations/*
pnpm db:types               # regenerate src/lib/supabase/database.types.ts
```

Or push the migrations to a hosted project:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Run

```bash
pnpm dev
```

Open http://localhost:4000.

## Supabase configuration checklist

- **Email confirmation**: set the confirm email template to use the token hash so
  links work across browsers:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app`
- **Google OAuth**: in Google Cloud add redirect URI
  `https://<project-ref>.supabase.co/auth/v1/callback`; in Supabase Auth add
  redirect URLs `http://localhost:4000/**` and your production/preview domains.
- **Before public launch**: configure custom SMTP (Resend/Postmark), enable a
  signup captcha (Turnstile), and enable pg_cron for the soft-delete purge in
  `supabase/migrations/0002_purge_cron.sql`.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (no emit) |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e (needs local Supabase + `SUPABASE_SERVICE_ROLE_KEY`) |
| `pnpm format` | Prettier |
| `pnpm db:push` / `pnpm db:reset` / `pnpm db:types` | Supabase schema helpers |

## Project structure

```
supabase/migrations/   SQL schema, RLS, triggers, cron
src/
  proxy.ts             session refresh + /app route guard
  app/                 routes: landing, (auth) login/signup, (app) canvas, auth/* handlers
  features/
    canvas/            React Flow canvas, card nodes, tools, view tabs
    calendar/          view state (URL-synced), world-space layout, toolbar
    tasks/             columns, cards, quick-add, details panel, DnD, queries, mutations
    auth/              forms, Google button, server actions, header
  lib/
    supabase/          browser/server clients, generated types
    dates/             timezone-aware "today", week/month ranges (all ISO-string math)
tests/e2e/             Playwright specs + service-role user fixture
```

## How it scales

- Client talks to PostgREST directly under RLS; policies use `(select auth.uid())`
  so it is evaluated once per query, and one partial index
  (`user_id, task_date, position` where not deleted) serves every read.
- Tasks are cached per month bucket; Day/Week/Month switches reuse the cache.
- Every write is optimistic and patches only the fields it changed, so the UI is
  instant and a late debounced note save can never overwrite a newer move.
- Soft deletes are purged after 30 days; a per-user active-task cap guards abuse.

## AI helpers (optional)

Ascesis works completely without AI. Adding one provider key switches on four
helpers. Each only ever *proposes*: nothing is saved until you accept it.

| Where | What it does |
| --- | --- |
| Start an arc | Drafts 3 to 5 non-negotiable rules and a deep work target from your objective |
| Monthly target | Breaks a deliverable into weekly priorities, linked to it |
| Weekly priority | Breaks a priority into tasks for today, linked to it |
| Task details | Expands a task title into notes and a checklist |

Set one key in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

The key is read server-side only and never reaches the browser. Without a key
the buttons still appear and explain that AI is not set up yet.

## How progress rolls up

- **Yearly visions are always manual.** Some do not decompose, so you move the
  slider yourself.
- **A monthly target with weekly priorities under it** reports the average of
  those priorities, and its slider disappears.
- **A weekly priority with tasks under it** reports how many of them are done.
- **Anything with nothing under it** keeps its manual slider or checkbox.

Linking happens automatically when you use "Break into…", and never gets in the
way when you just want to jot a goal down.

## Canvas controls

| Control | What it does |
| --- | --- |
| Header tabs | Dashboard shows everything connected; other tabs isolate one card |
| Select tool (`V`) | Move cards by their header, edit text, drag empty space to pan |
| Hand tool (`H`) | Drag anywhere to pan, including over cards |
| Card edges | Drag to resize; the size is saved per card |
| Pen icon | Switch typeface between Playpen Sans, Inter, Lora and JetBrains Mono |
