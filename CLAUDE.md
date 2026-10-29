# FinLover — Agent Notes

One modular Next.js application, one root package.json/lockfile, npm only, Node.js 24. Deploy root as one Vercel project. There are no frontend/backend workspaces, app Dockerfiles or API proxy rewrite.

## UI/data
- Base controls MUST use shadcn/ui in `src/components/ui`; add from root via `npx shadcn add <name>`.
- Icons MUST use lucide-react unless explicitly requested otherwise.
- External input uses Zod. Shared HTTP contracts: `src/shared/contracts`; client-only form schemas stay in features/types.
- Zustand holds UI state; TanStack Query holds real server data/mutations. Every screen (auth, wallets, transactions, categories, dashboard, profile) uses the real `/api/v1` APIs; no mock data remains. Reports and Settings (sidebar links) have no pages yet.
- Phones (below `md`): `BottomNav` replaces the Sidebar, dialogs become bottom sheets, and page layouts must not scroll sideways; use `max-md:`/`md:` classes and keep desktop (`md`+) unchanged. Check with `npx playwright test --project=mobile`.

## Architecture
- `src/app` composes pages/layouts and thin HTTP entries. Feature UI/hooks/stores live in `src/features`.
- `src/server/modules`: controllers → services → repositories, constructor injection. Controllers do not query models; services do not import Next/HTTP or return HTTP statuses.
- Wallet v1 supports create/list/detail/update/saving/delete plus invitations (create/inbox/accept/decline), members/remove, leave and atomic ownership transfer. Shared create/list/detail expose role/member metadata; pending never grants access. Keep findOwned and metadata mutations Owner-only; listAccessible/findAccessible serve members. WalletMembershipPort owns membership reads/locks. Shared transaction handlers remain gated through PersonalWalletAccess until E7-11. See docs/api/shared-wallets.md for rollout boundaries. Shared wallets use the fixed preset category list (`SHARED_CATEGORY_PRESETS`, stored as `Transaction.categoryKey`), never a user's Category documents.
- Invitation changes use wallet/user membershipVersion write locks in UnitOfWork. Remove/leave/transfer and account revocation serialize on the same wallet; future shared transaction writes must retain this discipline. Wallet/user cascades clean memberships; Owner account deletion with accepted Contributors conflicts. Never expose internal lock counters or user email in wallet previews.
- Reports (`src/server/modules/reports`, `/api/v1/reports/*`) read only wallets resolved by `ReportWalletScope` (personal wallets by default; a named shared wallet the caller owns or has accepted counts every member's rows, anything else 404). Aggregate in MongoDB via `TransactionRepository` (`sumByType` with `walletIds`, `totalsByDay`, `totalsByCategory`); keep money in whole cents until output. Running balance is worked back from current balances, so it relies on only transactions changing a balance.
- Cross-module ports live in `src/server/shared/ports`; implementations are wired in `src/server/composition`.
- `src/server/db` owns models, connection, UnitOfWork and operational migrations. Transaction services own balance changes; repositories recheck ownership/type references and authorize one model write in an active UnitOfWork. Model middleware rejects unapproved save/query/bulk writes. Do not restore balance hooks or write application transactions directly through models. Raw collection access is reserved for operational migrations, test fixtures and internal cascades that remove the owning wallet(s).
- Existing system-category guards/user-wallet persistence cascades remain for internal compatibility with session propagation. Category cascade clears references without changing balances.
- Production data-access/composition boundaries use server-only; frontend/contracts must not import server implementation. ESLint enforces the source boundary.
- Config belongs at root; dev tooling in infra-dev; migrations remain source and never execute automatically.

## Schedulers
- Repeating transactions are the `Scheduler` entity (`src/server/modules/schedulers`); `Transaction` has no `recurrence` field and no `schedulerId`. Only the Creator can read or change a Scheduler. Due dates are Asia/Bangkok calendar dates; the daily job (`/api/internal/cron/schedulers`, `CRON_SECRET` bearer, `vercel.json`) posts via `CreateTransactionService.post` with a compare-and-set advance of `nextDueDate`. Cancelled/completed are terminal; wallet/account deletion cascades to Schedulers. See `GLOSSARY.md` and `docs/adr/`.

## Auth
- Browser uses HttpOnly session_token; do not store JWT in localStorage. Both legacy/v1 use one resolver and principal.
- Authorization wins over cookies, including invalid headers (reject, no fallback).
- Cookie writes and login/register/logout require an exact trusted Origin; JSON bodies are required. Do not exempt login merely because there is no cookie.
- Preview origins come from trusted platform metadata/explicit configuration, never arbitrary Host headers or a *.vercel.app wildcard.
- Never log request bodies, passwords, cookies, JWTs, query strings or financial payloads. Logout does not revoke previously issued JWTs.

## Checks/docs
Root: npm run lint, npm run type-check, npm test, npm run build. Vitest defaults to node; UI tests explicitly select jsdom. Tests: __tests__/*.test.ts(x). Database integration tests use disposable MongoDB/replica sets.

OpenAPI: api:generate/api:check. HTML: docs:generate/docs:check. ERD: generate-erd, never hand-edit. Update README, docs/codebase.md/html, API docs, manifests/lockfile and agent notes with implementation. Full guide: docs/codebase.md. Distinguish local proof from Vercel deployment proof.

## Git/CI
Commit: tag: message, case-insensitive, optional space after colon. Tags: init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert. Branch: tag/issue-id-slug. PR headings: ### Issue ID, ### Description, ### Image.

CI runs docs/spec drift, lint, types, tests, ERD sync, one build, commit lint and gitleaks. Husky uses infra-dev/scripts/check-commit-msg.js. Do not commit/push or deploy unless requested.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
