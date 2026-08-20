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
├── app/            pages + routes (what user sees, App Router)
│   └── api/        backend endpoints (login, expenses, etc)
├── components/     reusable UI pieces (buttons, cards, forms)
├── lib/            shared logic — db.ts (database connect), auth.ts (jwt/bcrypt)
├── models/         Mongoose schemas (User, Expense, Category)
├── types/          shared TypeScript types
└── hooks/          custom React hooks
```

## 5. Branch naming rule
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
5. Wait for CI green (commit-lint, build, secret-scan)
6. Merge

Direct push to `main` is blocked — always go through a branch + PR.
