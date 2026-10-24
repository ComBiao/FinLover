# FinLover — Codebase Guide

FinLover is one Next.js application and deployment unit with frontend features and a modular, layered server. Use npm at the repository root, one package.json and one package-lock.json. [Database diagram](ERD.md), [API guide](api/README.md), [implementation plan](frontend-backend-refactor-plan.md).

## 1. Quickstart

Use Node.js 24 (package minimum 22.12), npm, and a MongoDB replica set. Docker Compose is optional when a managed replica set is already available.

```bash
npm ci
cp .env.example .env.local
# Fill JWT_SECRET; set MONGODB_URI if using an external replica set.
npm run infra:up
npm run dev
```

App and API share `http://localhost:3000`; Swagger is `/api/docs`. `infra:up` starts only MongoDB. `infra:down` stops the dev container without removing its named data volume. There are no application Dockerfiles or frontend/backend proxy servers.

Existing databases created with the old category uniqueness rule must run `npm run db:migrate:category-index` once. The migration removes the obsolete unique `(userId, name)` index and ensures the unique `(userId, type, name)` index exists before registration seeds both income and expense `Others` categories.

## 2. Stack and layout

| Area | Responsibility |
| --- | --- |
| UI | Next.js App Router, React, Tailwind, shadcn/ui, lucide-react |
| UI state | Zustand for modals/filters; TanStack Query for real API mutations/server data |
| Server | Next.js Node Route Handlers, Zod, Mongoose/MongoDB, bcrypt/JWT |
| Contracts | Browser-safe Zod schemas/types in shared source; no separate package build |
| Tests | Vitest node by default; UI tests explicitly use jsdom |
| Tooling | TypeScript strict, ESLint, Husky, GitHub Actions, OpenAPI/Swagger |

```text
FinLover/
├── package.json / package-lock.json
├── next.config.ts / tsconfig.json / eslint.config.mjs / vitest.config.ts
├── components.json / postcss.config.mjs / .env.example
├── public/ / .github/ / .husky/
├── infra-dev/
│   ├── compose.yml                # local MongoDB replica set
│   └── scripts/                   # commit check, ERD/OpenAPI/docs generators
├── docs/
└── src/
    ├── app/                       # page/layout composition and thin API entries
    ├── features/                  # auth, categories, transactions, wallets, homepage, profile UI
    ├── components/                # shared UI, ui/ = shadcn base components
    ├── lib/ / types/               # browser-safe helpers, UI types
    ├── shared/contracts/          # shared HTTP schemas/types, source imports
    ├── server/
    │   ├── composition/           # constructor injection and public handlers
    │   ├── modules/               # auth/users/categories/transactions/wallets
    │   ├── shared/                # auth, http guards/adapters, ports, config, docs
    │   ├── db/                    # connection, models, UnitOfWork, migrations
    │   │   └── legacy-cascades/    # existing internal persistence/cascade entry points
    │   └── __tests__/             # HTTP integration/contract tests
    └── test/setup.ts
```

## 3. Where code belongs

| Work | Location |
| --- | --- |
| Page or layout | `src/app/<path>/page.tsx` / `layout.tsx` |
| Feature UI/hooks/store | `src/features/<feature>/` |
| Shared controls | `src/components/`; shadcn in `src/components/ui/` |
| Shared HTTP schema/type | `src/shared/contracts/` |
| Client-only types | frontend feature or `src/types/` |
| HTTP method entry | `src/app/api/**/route.ts` |
| Transport/DTO mapping | module controllers and `src/server/shared/http/` adapters |
| Business use case | module services with `execute()` |
| Query/write | module repositories |
| Cross-module contract | `src/server/shared/ports/`; wire implementations in composition |
| Persistence/transaction context | `src/server/db/` |
| Test | nearby `__tests__/*.test.ts(x)` or server API integration suite |

Requests flow through auth/CSRF guards, controller.handle, service.execute, repository and MongoDB. Controllers do not query models; services do not know Next.js/HTTP. API versions share business services and auth policy; only input/output contracts differ. Cross-module dependencies are passed through ports. Repositories/composition/production DB entry use `server-only`; ESLint prohibits frontend/shared-contract imports of server code.

Transaction services own balance deltas and validate references. Repositories recheck wallet/category ownership and type compatibility immediately before create/update. Each model write needs a repository-issued, single-use capability bound to an active transaction session; save, query mutations, insertMany and bulkWrite otherwise reject. Create/update/delete and balance changes share a UnitOfWork. Use services for application writes. Raw collection access bypasses middleware and is reserved for migrations, explicit test fixtures and internal cascades that delete the owning wallet(s). Category deletion clears references without changing balances. Wallet deletion removes the wallet's transactions through `TransactionRepository.removeByWallet` (guarded) and the wallet cascade in the same UnitOfWork. System-category guards and user/wallet persistence cascades remain for internal compatibility and propagate caller sessions. Migrations are operational source and never run during installation/build/startup.

## 4. UI rules and integration status

Use shadcn/ui base controls and lucide-react icons. Add shadcn components from root using `npx shadcn add <name>`. Validate external data with Zod. Keep client-only form validation separate from persisted HTTP schemas. Zustand holds UI state; TanStack Query handles actual API mutations through the root QueryClientProvider.

Login/register/logout now use `/api/v1/auth/*`. `/` redirects to `/login`. Login and registration are public only while no valid session exists; authenticated users are redirected to `/homepage`. The `/homepage`, `/category`, `/transactions`, `/wallets` and `/profile` layouts share a server-side session guard, so invalid, expired, tampered or missing cookies redirect before private UI renders. Registration sends the display name (optional on the API, stored on the User), matching passwords and consent. User creation and the 14 default system categories run in one MongoDB transaction, so a seed failure rolls back the new account. Successful login redirects to the homepage; logout clears the cookie and query cache before redirecting. Errors remain visible rather than reporting fake success. The auth forms contain no inactive Google OAuth control or password-reset dead link.

Every screen now uses the real API; no mock data remains. A 401 from any query or mutation redirects the browser to `/login` (see `src/app/providers.tsx`). `GET /api/v1/auth/me` returns `{ user: { id, email, name? } }` for the session principal, and `GET /api/v1/categories` (optional `?type=income|expense`) lists the caller's categories, system defaults included. The v1 API provides monthly transaction reads through `GET /api/v1/transactions?month=YYYY-MM` (defaulting with `APPLICATION_TIMEZONE`) with an optional case-insensitive `search` over title and note (max 100 characters). `GET /api/v1/transactions/summary?from=&to=` (plus optional `walletId`, `categoryId`, `type`, `search`) aggregates the filtered totals in MongoDB; the Transactions summary cards read it through `useTransactionSummary` (search debounced) instead of totalling rows in the browser. The v1 wallet API supports `GET` and `POST /api/v1/wallets`, `GET`, `PUT` and `DELETE /api/v1/wallets/{id}` (delete removes the wallet's transactions in the same UnitOfWork), and `PATCH /api/v1/wallets/{id}/saving` (saving on needs a goal above 0; off clears it); legacy has no wallet operations. `GET /api/v1/home/summary?month=YYYY-MM&walletId=all|<id>` (a `home` server module) returns the Home page figures, which the Home cards read through `homeService.getHomeSummary` instead of computing them in the browser; `balance.totalBalance` sums the current balances of the scoped owned wallets and `balance.savingGoal` reports a selected saving wallet's goal progress; `income`, `expense` and `net` cover that month's transactions in the same scope, and `topCategories` ranks the top three expense categories (category-less expenses count as `Others`). Wallet creation currently has no per-user limit. Reports are unimplemented, and the sidebar's Reports and Settings links have no pages yet. Browser routes are `/`, `/login`, `/register`, `/homepage`, `/category`, `/transactions`, `/wallets`, `/profile`.

The Category screen is driven by `GET /api/v1/categories` and the category create/update/delete endpoints through TanStack Query hooks in `src/features/categories`. `isSystem` categories (the 14 seeded at registration) are read-only in the UI and on the server; the seeded Others stays last per type. Category colors are stored as `#RRGGBB` and icons as one of `CATEGORY_ICON_NAMES`. Deleting a category clears it from its transactions without touching balances. The Profile screen (`/profile`) shows the user from `GET /api/v1/auth/me` and calls `DELETE /api/v1/auth/delete-account`.

## 5. Auth and CSRF

Both legacy and v1 protected APIs use the same resolver and principal. Browser auth uses HttpOnly `session_token`, seven-day lifetime, Path=/, SameSite=Lax, Secure in production and no Domain attribute. The browser never reads or stores JWTs in localStorage.

An explicit Authorization header takes precedence and must be a valid Bearer token; it cannot fall back to cookies when invalid. Bearer remains available for compatibility/non-browser clients. Services receive a validated user ID, never cookies or tokens.

Unsafe cookie requests require an exact trusted Origin. Login/register/logout require Origin even without a session cookie. Missing, null, malformed or foreign Origin returns 403; body-bearing requests on those flows must have application/json or return 415. Verified Bearer requests to protected APIs do not require Origin. GET/HEAD must not mutate data. No exemption is based merely on the presence of an unverified header.

Logout clears the browser cookie but does not revoke a stateless JWT already issued. Legacy response envelopes/statuses remain except the explicitly added common auth/Origin/media-type policy. v1 validation is 400; legacy transaction validation is 422 and malformed JSON remains 500. Legacy transaction DELETE is empty 204; v1 is 200 with data:null.

## 6. Environment and Vercel

| Variable | Purpose |
| --- | --- |
| MONGODB_URI | Replica set connection string; local compose sample uses directConnection=true for Docker hostname discovery |
| JWT_SECRET | Server-only signing/verification secret |
| BCRYPT_SALT_ROUNDS | Existing 4–31 validation/fallback, default 10 |
| PUBLIC_ORIGINS | Exact comma-separated local/production origins |
| PREVIEW_ORIGINS | Optional explicit preview aliases; production origins are not inherited in preview |
| CRON_SECRET | Bearer secret Vercel Cron sends to `/api/internal/cron/schedulers`; with none set the route always returns 401 |
| VERCEL_ENV / VERCEL_URL / VERCEL_BRANCH_URL | Platform-owned metadata used for exact preview deployment/branch origins |

Never trust request Host/X-Forwarded-Host as an origin allowlist. No wildcard *.vercel.app. System deployment URLs are hostnames and become HTTPS origins. Verify aliases and deployment protection on a real preview before release.

Deploy the repository root as one native Next.js Vercel project with npm ci and npm run build. Browser API calls are relative and need no BACKEND_URL/rewrite. Use external managed MongoDB such as Atlas, with separate preview/prod credentials and data. Decide Atlas IP allowlisting/egress using the actual Vercel plan before production. A single app does not remove that network requirement.

Database connections are cached per warm instance, not globally across deployments. Atomicity depends on MongoDB transactions, never process-local locks. Existing Google fonts require network access during builds. Swagger assets must be included in deployed function output and verified on preview. No Vercel deployment has been performed by this change.

### Schedulers (repeating transactions)

A **Scheduler** (see `GLOSSARY.md`, [ADR 0001](adr/0001-scheduler-entity-and-fixed-thai-business-date.md)) creates a Transaction every N days, weeks, months or years until its end condition (never, after N, an inclusive end date, or a span converted to an end date). It lives in the `schedulers` collection (`src/server/db/models/Scheduler.ts`); `Transaction.recurrence` was removed (operational migration `npm run db:migrate:unset-transaction-recurrence`, never run automatically).

- API: `/api/v1/schedulers` (GET, POST), `/{id}` (GET, PUT, DELETE), `/{id}/status` (PATCH `pause` / `resume`). Only the Creator can see or change a Scheduler; `canManage` marks it for the future shared-wallet view. At most 50 active or paused per user. A span counts the start period as the first (5 months = 5 monthly runs).
- Dates are calendar dates in Asia/Bangkok. `vercel.json` runs `/api/internal/cron/schedulers` daily at `0 17 * * *` UTC (00:00 Bangkok; Hobby cron may drift up to an hour, same date). The route requires `Authorization: Bearer $CRON_SECRET`, is not part of the OpenAPI product API, and returns a run summary.
- Each occurrence is posted by `RunDueSchedulersService` through `CreateTransactionService.post` in one UnitOfWork with a compare-and-set advance of `nextDueDate`, so repeated or concurrent runs never duplicate. Missed days are caught up with their original dates (up to 366 per Scheduler per run). Balances may go negative. A start date of today posts at creation; a past start date waits for the next cycle. Month-end days clamp (31 Jan, 28 Feb, 31 Mar).
- Pause skips the paused period on resume. Completed (end reached) and cancelled (the Creator lost wallet access; `SchedulerRepository.cancelByCreatorAndWallet` is the hook for shared wallets) are terminal. Edits apply to future Transactions only.
- Cascades: deleting a wallet or account deletes the related Schedulers; deleting a category moves them to the type's "Others". Generated Transactions carry no `schedulerId`; deleting a Scheduler keeps them.

## 7. Conventions and CI

Commit: `tag: message`, case-insensitive, optional space after colon. Tags: init, feat, fix, chore, docs, refactor, test, style, perf, ci, build, revert. Branch: `tag/issue-id-slug` (convention). PR headings: `### Issue ID`, `### Description`, `### Image`. Commit/push/deployment are separate actions and require task authorization.

Husky commit-msg calls `infra-dev/scripts/check-commit-msg.js`; pre-commit runs lint/type-check. CI uses Node.js 24, npm ci, API/docs checks, lint, typegen/type-check, tests, ERD sync and one app build. Commit lint and gitleaks remain. MongoDB test binary version is pinned to 8.2.6 in CI; first test run may download it.

## 8. Commands (repository root)

| Command | Purpose |
| --- | --- |
| npm ci | Install using the single lockfile |
| npm run dev | Run the Next.js app on port 3000 |
| npm run build / npm start | Build / run local production server |
| npm run lint / npm run type-check | ESLint / Next typegen and TypeScript |
| npm test | UI, service, model and HTTP integration tests |
| npm run api:generate / api:validate / api:check | Generate or validate/check OpenAPI drift and request examples/handler coverage |
| npm run docs:generate / docs:check | Generate or verify the codebase HTML mirror |
| npm run generate-erd | Regenerate root docs/ERD.md from models |
| npm run infra:up / infra:down | Start dev MongoDB / stop dev compose |
| npm run db:migrate:category-index | Replace the legacy category-name index in an existing database |

Generators work without DB/secrets and resolve paths relative to their files. Never hand-edit generated ERD/HTML/OpenAPI artifacts. Update README, codebase, API docs, manifests, CI and agent instructions together when paths/commands change. See [validation report](refactor-validation.md) for actual checks and remaining deployment limits.

Production builds explicitly use `next build --webpack`; this environment rejected Turbopack worker port creation (EPERM). Development still uses `next dev`.

HTTP errors share one mapper and first-issue Zod field mapping. Unknown failures return `INTERNAL_ERROR`; server diagnostics include request ID, error type, numeric driver code and stack frames, excluding error messages and attached private payloads. Legacy transaction validation remains 422; malformed JSON is 400 in both versions. Category create/update reuse the shared Zod schemas. `TransactionResponseDTO` provides legacy and v1 mappings for transaction responses. Category HTTP and compatibility callers share one delete service instance.

## Shared Wallet foundation and invitations

[Shared Wallet API guide](api/shared-wallets.md) documents implemented E7-01b/02 and future contracts. POST wallets accepts isShared; create/list/detail expose role, memberCount, membersPreview and ownerName. Wallet list/detail allow accepted Contributors; findOwned and wallet mutations remain Owner-only. Invitation create/inbox/accept/decline are implemented through wallet module controllers/services and repository ports. Pending has no access. New WalletMember unique/index definitions are in the model and generated ERD.

Membership operations use wallet/user write locks inside UnitOfWork to serialize concurrent invitations, acceptance and deletion. Wallet deletion cleans memberships; account deletion blocks owned accepted Contributors and preserves transactions in surviving shared wallets. The existing transaction API uses PersonalWalletAccess to reject shared writes until E7-11. Home All excludes shared balances; selected shared summary remains pending E7-15. No production migration was run. Real HTTP validation is reproducible with `node infra-dev/scripts/smoke-shared-wallets.mjs` after a build, against a disposable database.

### Shared member management (E7-07 / E7-04)

Members GET, member DELETE (including pending cancellation), leave and ownership transfer are implemented. The membership management port is separate from existing invitation/access ports; all mutations reuse wallet locks and UnitOfWork. Transfer locks both user accounts, changes Wallet.userId, removes the new Owner's member row and creates the former Owner's accepted membership atomically. Name collisions roll back with 409. Wallet metadata/saving writes match current Owner atomically. User deletion locks joined wallets before revocation so stale shared balance writes retry authorization. No new schema or migration is needed for this increment; response attribution for deleted authors remains E7-06. See the [Shared Wallet API guide](api/shared-wallets.md).
