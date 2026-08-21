# FinLover — Codebase Guide

Expense tracker web app. Single-root repo, npm only (no monorepo/workspaces). Everything you need is in this one file — jump around with the headings below. Database schema diagram lives separately: [`ERD.md`](ERD.md) (auto-generated, don't hand-edit).

## 1. Quickstart

```bash
git clone https://github.com/ComBiao/FinLover.git
cd FinLover
npm install
cp .env.example .env.local
```
Fill `.env.local` with `MONGODB_URI`, `JWT_SECRET`, `BCRYPT_SALT_ROUNDS`.

```bash
npm run dev     # start dev server → http://localhost:3000
npm test        # run unit tests
```

## 2. Tech stack

| Package | What it does |
|---|---|
| Next.js (App Router) | React framework, pages + backend API routes in one project |
| TypeScript | typed JavaScript, catches bugs before runtime |
| Tailwind CSS | utility-class styling |
| shadcn/ui | prebuilt accessible base components, copied into `src/components/ui` |
| lucide-react | icon set |
| zod | runtime schema validation (API input, form input), also derives a TS type from the schema |
| zustand | client/UI state management (modals, filters, selections) — small store, no boilerplate |
| @tanstack/react-query | server data fetching/caching (`/api/*` calls) — handles loading/error/refetch |
| MongoDB + Mongoose | database + schema/ODM layer |
| bcrypt | password hashing |
| jsonwebtoken (JWT) | login/session tokens |
| vitest + @testing-library/react | unit/component tests, run via `npm test` |

## 3. Folder structure

```
/
├── .github/
│   ├── workflows/ci.yml             CI: commit-msg + branch-name lint, build, secret scan
│   └── pull_request_template.md
├── .husky/                          pre-commit (lint + type-check), commit-msg (message format)
├── scripts/
│   ├── check-commit-msg.js          shared regex validator (local hook + CI)
│   ├── check-branch-name.js         branch name validator (CI)
│   └── generate-erd.ts              regenerates docs/ERD.md from src/models
├── public/
├── src/
│   ├── app/                         PAGES + ROUTES only. Folder name = URL path. No business logic here.
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
│   │   ├── ui/                      shadcn/ui base components ONLY. Never hand-edit — regenerate with `npx shadcn add`.
│   │   └── [Name].tsx               shared custom components used on 2+ pages (Navbar, ExpenseCard...)
│   ├── lib/                         cross-cutting helpers, no UI
│   │   ├── db.ts                    mongoose connection singleton
│   │   ├── auth.ts                  jwt sign/verify, bcrypt hash/compare
│   │   └── utils.ts                 generic helpers (cn, formatCurrency, ...)
│   ├── models/                      mongoose schemas, one file per collection (User.ts, Wallet.ts, Category.ts, Transaction.ts)
│   ├── types/                       shared TS interfaces/types + zod schemas
│   ├── hooks/                       custom React hooks (useAuth, useExpenses...)
│   └── store/                       zustand stores — client/UI state only, never server data
├── vitest.config.ts / vitest.setup.ts   test runner config
├── docs/
│   ├── codebase.md                  this file (also codebase.html, browser-friendly mirror)
│   └── ERD.md                       database schema diagram (auto-generated)
├── .env.example
├── AGENT.md / CLAUDE.md             brief conventions for AI coding agents (point back here for detail)
└── package.json
```

## 4. Where does my file go?

| I'm building... | Goes in | Naming |
|---|---|---|
| A new page/screen (e.g. `/budget`) | `src/app/budget/page.tsx` | folder = URL path, lowercase-kebab |
| A new backend endpoint (e.g. `/api/budget`) | `src/app/api/budget/route.ts` | folder = URL path |
| A component used on 2+ pages | `src/components/BudgetCard.tsx` | PascalCase |
| A component used on only 1 page | colocate next to that page, e.g. `src/app/budget/BudgetChart.tsx` | PascalCase |
| A shadcn base component (button, dialog...) | `src/components/ui/` via `npx shadcn add <name>` — don't write by hand | lowercase, shadcn default |
| A database schema | `src/models/Budget.ts` | PascalCase, singular |
| A shared TS type/interface | `src/types/budget.ts` | camelCase file, PascalCase type |
| A zod validation schema | `src/types/budget.ts`, colocated with the type it derives | camelCase, `xSchema` |
| Reusable logic (not UI, not route) | `src/lib/` (e.g. `lib/date.ts`) | camelCase |
| A custom hook | `src/hooks/useBudget.ts` | camelCase, `use` prefix |
| Client/UI state (modal open, filters...) | `src/store/budgetStore.ts` (zustand) | camelCase, `useXStore` |
| Fetching server data (`/api/*`) | `useQuery`/`useMutation` (react-query), wrapped in a `src/hooks/` hook | camelCase, `use` prefix |
| A test | `src/**/__tests__/x.test.ts(x)`, next to the code it tests | same name + `.test` |

Rule of thumb: `app/` only holds pages/routes — no business logic, no reusable component definitions beyond the route handler itself.

## 5. Two hard rules
- Base UI components MUST be shadcn/ui — never hand-write a button/dialog/input that already has a shadcn version.
- Icons MUST be from `lucide-react`, unless a task explicitly says otherwise.

## 6. Conventions

### Commit message
`tag: message` (case-insensitive, space after colon optional), e.g. `init: initialize repo`.
Allowed tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`.
Enforced by `.husky/commit-msg` locally and the `commit-lint` CI job.

### Branch name
`tag/issue-id-slug`, e.g. `feat/1-initialize-project`.
Same tag set as commit messages. Enforced by CI (`commit-lint` job) against the PR's head branch.

### Pull requests
Use the template: `### Issue ID`, `### Description`, `### Image`.

## 7. Workflow
1. `git checkout -b feat/2-add-login`
2. Code + commit with correct tag
3. `git push origin feat/2-add-login`
4. Open PR on GitHub — fill the template (Issue ID / Description / Image)
5. Wait for CI green (commit-lint, build, secret-scan)
6. Merge

Direct push to `main` is blocked — always go through a branch + PR.

## 8. CI checks (`.github/workflows/ci.yml`)

| Job | What it does |
|---|---|
| `commit-lint` (PR only) | validates the branch name + every commit message in the PR against the patterns above |
| `build` | `npm ci` → `npm run lint` → `next typegen` → `npm run type-check` → verifies `docs/ERD.md` is in sync with `src/models` → `npm run build` |
| `secret-scan` | gitleaks, catches committed secrets (`.env`, `JWT_SECRET`, `MONGODB_URI`, etc) |

## 9. All commands

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, JWT_SECRET, BCRYPT_SALT_ROUNDS
npm run dev                  # start dev server
npm test                     # run unit tests (vitest)
npm run lint                 # eslint
npm run type-check           # tsc --noEmit
npm run build                # production build
npm run generate-erd         # regenerate docs/ERD.md after changing a model
```
