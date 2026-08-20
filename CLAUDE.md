# FinLover — Agent Notes

Expense tracker: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + lucide-react + MongoDB/Mongoose + bcrypt/JWT. Single-root repo, npm only (no monorepo).

## UI rules
- Base components MUST use shadcn/ui (`src/components/ui`, add via `npx shadcn add <name>`). Don't hand-roll a button/dialog/input/etc if a shadcn equivalent exists.
- Icons MUST come from `lucide-react` unless a task explicitly specifies otherwise.

## Layout
- `src/app/` — PAGES + ROUTES only, folder name = URL path. No business logic here.
- `src/app/api/` — backend route handlers (`route.ts`, not `page.tsx`)
- `src/components/` — shared UI components (`ui/` = shadcn base components, don't hand-edit)
- `src/lib/` — `db.ts` (mongoose singleton), `auth.ts` (jwt/bcrypt), `utils.ts`
- `src/models/` — mongoose schemas, one file per collection
- `src/types/` — shared TS types, `src/hooks/` — custom hooks (`use` prefix)
- Full "where does my file go" table: `docs/codebase.md`

## Commit message
`tag: message`, e.g. `init: initialize repo`. Case-insensitive, space after colon optional.
Tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`.

## Branch name
`tag/issue-id-slug`, e.g. `feat/1-initialize-project`. Same tag set as commit.

## PR
Use template: `### Issue ID`, `### Description`, `### Image`.

## CI
`.github/workflows/ci.yml`: commit/branch lint (PR), lint + type-check + build, gitleaks secret scan.
