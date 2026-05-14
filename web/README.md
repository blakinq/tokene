# TokenOps · web

The web client for TokenOps — a multi-tenant app for managing design system tokens across design and engineering workflows. See [`../tokene.md`](../tokene.md) for the full architecture spec.

## Stack

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (radix base, nova style)
- Geist Sans + Geist Mono
- Lucide icons

## Getting started

```bash
npm install
npm run dev
```

The app boots at <http://localhost:3000> and redirects to `/tokens`.

Toggle dark mode with the `d` key (wired up by the shadcn `theme-provider`).

## Supabase setup

The slice (PRD §36) runs against a hosted Supabase project.

1. **Create a project** at <https://supabase.com/dashboard>.
2. **Copy credentials** from *Project Settings → API* into `web/.env.local` (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the new `sb_publishable_...` key, or the legacy `anon` key)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the client)
3. **Apply the schema** in one of two ways:
   - **Dashboard:** open the SQL editor and paste the contents of `supabase/migrations/20260514000000_initial_schema.sql`. Then run `supabase/seed.sql`.
   - **CLI:** run `npx supabase login`, then `npx supabase link --project-ref <ref>` from `web/`, then `npx supabase db push`.
4. **Regenerate typed DB types** (optional, recommended):
   ```bash
   npx supabase gen types typescript --linked > lib/supabase/types.ts
   ```

Until env vars are set the app continues to render from `lib/mock-data.ts` — the middleware short-circuits when Supabase isn't configured.

## Routes

| Path | Purpose |
| --- | --- |
| `/tokens` | Token library — searchable, filterable table of all tokens |
| `/tokens/[tokenId]` | Token detail — value preview, references, dependents, history |
| `/change-requests` | List of open / approved / closed change requests |
| `/change-requests/[id]` | Diff, validation, reviewers, discussion |
| `/releases` | Release timeline |
| `/releases/[releaseId]` | Changelog, snapshot preview, export presets |
| `/imports` | Upload + parse JSON / Style Dictionary files |
| `/exports` | Generate CSS / SCSS / TS / Style Dictionary outputs |
| `/audit` | Tamper-resistant action log |
| `/settings` | Workspace profile, schema rules, approval rules, API keys |
| `/collections` | (Placeholder) grouped tokens |

## Layout

- `app/(app)/layout.tsx` — wraps every internal page with the sidebar shell
- `components/app-sidebar.tsx` — workspace switcher, nav groups, user menu
- `components/site-header.tsx` — per-page topbar with breadcrumb + actions
- `components/command-menu.tsx` — ⌘K / Ctrl+K command palette

## Mock data

All pages render from `lib/mock-data.ts`. Replace with API calls once the backend is wired up.

## Design direction

Minimalist. Neutral palette. Geist Sans for prose, Geist Mono for token names and values. Status uses shadcn Badge variants only — no raw color classes.

## Adding components

```bash
npx shadcn@latest add <component>
```

## Building

```bash
npm run build    # production build
npm run typecheck
npm run lint
```
