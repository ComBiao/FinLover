# FinLover — Agent Notes

Expense tracker: Next.js (App Router) + TypeScript + Tailwind + MongoDB/Mongoose + bcrypt/JWT. Single-root repo, npm only (no monorepo).

## Layout
- `src/app/` — pages/routes, `src/app/api/` — backend route handlers
- `src/components/` — UI components
- `src/lib/` — `db.ts` (mongoose singleton), `auth.ts` (jwt/bcrypt)
- `src/models/` — mongoose schemas
- `src/types/`, `src/hooks/`
- Full detail: `docs/codebase.md`

## Commit message
`tag: message`, e.g. `init: initialize repo`. Case-insensitive, space after colon optional.
Tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`.

## Branch name
`tag/issue-id-slug`, e.g. `feat/1-initialize-project`. Same tag set as commit.

## PR
Use template: `### Issue ID`, `### Description`, `### Image`.

## CI
`.github/workflows/ci.yml`: commit/branch lint (PR), lint + type-check + build, gitleaks secret scan.
