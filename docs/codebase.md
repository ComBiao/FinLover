# FinLover — Codebase Layout

Expense tracker web app. Stack: Next.js (App Router) + TypeScript + Tailwind CSS + MongoDB/Mongoose + bcrypt/JWT auth. Single-root repo, npm (no monorepo/workspaces).

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
│   ├── app/                         App Router pages/layouts/routes
│   │   ├── api/                     route handlers (backend), e.g. /api/auth, /api/expenses
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                  shared/reusable UI components
│   ├── lib/
│   │   ├── db.ts                    mongoose connection singleton
│   │   ├── auth.ts                  jwt sign/verify, bcrypt hash/compare
│   │   └── utils.ts
│   ├── models/                      mongoose schemas (User, Expense, Category, ...)
│   ├── types/                       shared TS types/interfaces
│   └── hooks/                       custom React hooks
├── .env.example
├── docs/                            this file + HTML version
├── AGENT.md / CLAUDE.md             brief conventions for AI coding agents
└── package.json
```

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
