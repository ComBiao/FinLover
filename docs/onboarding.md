# FinLover — Getting Started

## 1. Clone & setup
```bash
git clone https://github.com/ComBiao/FinLover.git
cd FinLover
npm install
cp .env.example .env
```
Fill `.env` with `MONGODB_URI`, `JWT_SECRET`, `BCRYPT_SALT_ROUNDS`.

## 2. Run dev server
```bash
npm run dev
```
Open http://localhost:3000

## 3. Tech stack (what each does)
- **Next.js** — React framework, handles pages + backend API routes in one project
- **TypeScript** — JavaScript with types, catches bugs before runtime
- **Tailwind CSS** — utility classes for styling, no separate CSS files needed
- **MongoDB + Mongoose** — database + tool to define data schema/models for it
- **bcrypt** — hashes passwords so we never store plain text
- **JWT (jsonwebtoken)** — login tokens, proves who's logged in on each request
- **shadcn/ui** — prebuilt accessible UI components (button, dialog, etc), copied into `src/components/ui`
- **lucide-react** — icon set, `import { IconName } from "lucide-react"`

## 4. Project structure
```
src/
├── app/                 PAGES + ROUTES only. Folder name = URL. No logic here.
│   ├── page.tsx          → /
│   ├── login/page.tsx    → /login
│   ├── expenses/
│   │   ├── page.tsx       → /expenses
│   │   └── [id]/page.tsx  → /expenses/:id
│   └── api/              backend endpoints, route.ts (not page.tsx)
│       └── expenses/route.ts → /api/expenses
├── components/
│   ├── ui/               shadcn base components ONLY — add via `npx shadcn add <name>`, don't hand-write
│   └── [Name].tsx         shared components used on 2+ pages
├── lib/                  db.ts (database connect), auth.ts (jwt/bcrypt), utils.ts
├── models/               Mongoose schemas (User.ts, Expense.ts, Category.ts)
├── types/                shared TypeScript types
└── hooks/                custom React hooks (useX)
```

### Where does my file go?
| Building... | Put it in |
|---|---|
| New page (`/budget`) | `src/app/budget/page.tsx` |
| New backend endpoint | `src/app/api/budget/route.ts` |
| Component used on 2+ pages | `src/components/BudgetCard.tsx` |
| Component used on 1 page only | next to that page's `page.tsx` |
| Base UI piece (button, dialog...) | `npx shadcn add <name>` → `src/components/ui/` |
| Icon | `import { X } from "lucide-react"` (unless told otherwise) |
| Database schema | `src/models/Budget.ts` |
| Custom hook | `src/hooks/useBudget.ts` |

Full detail: `docs/codebase.md`

## 5. Branch naming rule (convention only, not CI-enforced)
```
tag/issue-id-slug
```
Example: `feat/1-initialize-project`
Tags: `init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert`

## 6. Commit message rule
```
tag: message
```
Example: `feat: add login page`
Same tag list as branch. Colon required, case doesn't matter.

## 7. Workflow (must follow — branch protection is on)
1. `git checkout -b feat/2-add-login`
2. Code + commit with correct tag
3. `git push origin feat/2-add-login`
4. Open PR on GitHub — fill template (Issue ID / Description / Image)
5. Wait for CI green (commit-lint checks commit messages only, build, secret-scan)
6. Merge

Direct push to `main` is blocked — always go through a branch + PR.

## 8. UI rule
- Base components (button, input, dialog, card...) MUST be shadcn/ui — never hand-write one that already has a shadcn version.
- Icons MUST be from `lucide-react`, unless a task explicitly says otherwise.
