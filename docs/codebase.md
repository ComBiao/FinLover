# FinLover — Codebase Layout

Expense tracker web app. Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react icons + MongoDB/Mongoose + bcrypt/JWT auth. Single-root repo, npm (no monorepo/workspaces).

## Folder structure

```
/
├── .github/workflows/ci.yml        CI: commit/branch lint, build, secret scan
├── .github/pull_request_template.md
├── .husky/                          pre-commit (lint+type-check), commit-msg (message format)
├── scripts/
│   ├── check-commit-msg.js          shared regex validator (local hook + CI)
│   └── check-branch-name.js         branch name validator (CI)
├── public/
├── src/
│   ├── app/                         PAGES + ROUTES only. Folder name = URL. No business logic here.
│   │   ├── layout.tsx               root layout (wraps every page — nav, fonts, etc)
│   │   ├── page.tsx                 → /
│   │   ├── login/page.tsx           → /login
│   │   ├── dashboard/page.tsx       → /dashboard
│   │   ├── expenses/
│   │   │   ├── page.tsx             → /expenses (list)
│   │   │   └── [id]/page.tsx        → /expenses/:id (dynamic, one item)
│   │   └── api/                     BACKEND endpoints. route.ts, not page.tsx.
│   │       ├── auth/route.ts        → POST /api/auth
│   │       └── expenses/route.ts    → GET/POST /api/expenses
│   ├── components/
│   │   ├── ui/                      shadcn/ui base components ONLY (button, input, dialog...). Never hand-edit — regenerate with `npx shadcn add`.
│   │   └── [Name].tsx               shared custom components used on 2+ pages (Navbar, ExpenseCard...)
│   ├── lib/                         cross-cutting helpers, no UI
│   │   ├── db.ts                    mongoose connection singleton
│   │   ├── auth.ts                  jwt sign/verify, bcrypt hash/compare
│   │   └── utils.ts                 generic helpers (cn, formatCurrency, ...)
│   ├── models/                      mongoose schemas, one file per collection (User.ts, Expense.ts, Category.ts)
│   ├── types/                       shared TS interfaces/types (Expense, User, ApiResponse...)
│   └── hooks/                       custom React hooks (useAuth, useExpenses...)
├── .env.example
├── docs/                            this file + HTML version
├── AGENT.md / CLAUDE.md             brief conventions for AI coding agents
└── package.json
```

## Where does my file go?

| I'm building... | Goes in | Naming |
|---|---|---|
| A new page/screen (e.g. `/budget`) | `src/app/budget/page.tsx` | folder = URL path, lowercase-kebab |
| A new backend endpoint (e.g. `/api/budget`) | `src/app/api/budget/route.ts` | folder = URL path |
| A component used on 2+ pages | `src/components/BudgetCard.tsx` | PascalCase |
| A component used on only 1 page | colocate next to that page, e.g. `src/app/budget/BudgetChart.tsx` | PascalCase |
| A shadcn base component (button, dialog...) | `src/components/ui/` via `npx shadcn add <name>` — don't write by hand | lowercase, shadcn default |
| Database schema | `src/models/Budget.ts` | PascalCase, singular |
| Shared TS type/interface | `src/types/budget.ts` | camelCase file, PascalCase type |
| Reusable logic (not UI, not route) | `src/lib/` (e.g. `lib/date.ts`) | camelCase |
| A custom hook | `src/hooks/useBudget.ts` | camelCase, `use` prefix |

Rule of thumb: `app/` only holds pages/routes — no business logic, no reusable component definitions inside `app/api` beyond the route handler itself.

## Conventions

### Commit message
`tag: message` (case-insensitive, space after colon optional), e.g. `init: initialize repo`.
Allowed tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`.
Enforced by `.husky/commit-msg` locally and the `commit-lint` CI job.

### Branch name
`tag/issue-id-slug`, e.g. `feat/1-initialize-project`.
Same tag set as commit messages. Enforced by CI (`commit-lint` job) against the PR's head branch.

### Pull requests
Use the template: `### Issue ID`, `### Description`, `### Image`.

## Local dev

```
npm install
cp .env.example .env.local   # fill in MONGODB_URI, JWT_SECRET, BCRYPT_SALT_ROUNDS
npm run dev
```

## CI checks (`.github/workflows/ci.yml`)

- **commit-lint** (PR only): validates branch name + every commit message in the PR against the patterns above.
- **build**: `npm ci`, `npm run lint`, `npm run type-check`, `npm run build`.
- **secret-scan**: gitleaks, catches committed secrets (`.env`, `JWT_SECRET`, `MONGODB_URI`, etc).

## Notes

This doc is hand-written and should be expanded/regenerated (e.g. via the `graphify` skill) once real feature code exists.
