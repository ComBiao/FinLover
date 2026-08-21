# FinLover — Agent Notes

Expense tracker: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + lucide-react + zod + zustand + @tanstack/react-query + MongoDB/Mongoose + bcrypt/JWT. Single-root repo, npm only (no monorepo).

## UI rules
- Base components MUST use shadcn/ui (`src/components/ui`, add via `npx shadcn add <name>`). Don't hand-roll a button/dialog/input/etc if a shadcn equivalent exists.
- Icons MUST come from `lucide-react` unless a task explicitly specifies otherwise.

## Data & state rules
- Validate any external input (API request body, form input) with **zod** — define schema in `src/types/` or colocated, `schema.parse(...)`.
- Client/UI state (things not from the server — modals, filters, selections) MUST use **zustand**, not prop-drilling or Context for anything non-trivial.
- Server data (fetched from `/api/*`) MUST use **@tanstack/react-query** — don't hand-roll `useEffect` + `fetch` + loading/error state.
- Tests use **vitest** + **@testing-library/react**. Test files live next to what they test in a `__tests__/` folder, named `*.test.ts(x)`. Run: `npm test`.

## Layout
- `src/app/` — PAGES + ROUTES only, folder name = URL path. No business logic here.
- `src/app/api/` — backend route handlers (`route.ts`, not `page.tsx`)
- `src/components/` — shared UI components (`ui/` = shadcn base components, don't hand-edit)
- `src/lib/` — `db.ts` (mongoose singleton), `auth.ts` (jwt/bcrypt), `utils.ts`
- `src/models/` — mongoose schemas, one file per collection
- `src/types/` — shared TS types, `src/hooks/` — custom hooks (`use` prefix)
- `src/store/` — zustand stores, client/UI state only
- Full "where does my file go" table: `docs/codebase.md`

## Commit message
`tag: message`, e.g. `init: initialize repo`. Case-insensitive, space after colon optional.
Tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`.

## Branch name
`tag/issue-id-slug`, e.g. `feat/1-initialize-project`. Same tag set as commit. Convention only, not enforced by CI.

## PR
Use template: `### Issue ID`, `### Description`, `### Image`.

## CI
`.github/workflows/ci.yml`: commit-msg lint (PR), lint + type-check + ERD sync check + build, gitleaks secret scan.

## Docs
`docs/codebase.md` (also `docs/codebase.html`, same content) — everything: quickstart, stack, layout, conventions, CI. `docs/ERD.md` — database diagram, auto-generated, don't hand-edit.
