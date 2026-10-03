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
    ├── features/                  # auth, categories, transactions, dashboard UI
    ├── components/                # shared UI, ui/ = shadcn base components
    ├── lib/ / types/ / mocks/      # browser-safe helpers, UI types, demo data
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
| Client-only types/mocks | frontend feature or `src/types/`, `src/mocks/` |
| HTTP method entry | `src/app/api/**/route.ts` |
| Transport/DTO mapping | module controllers and `src/server/shared/http/` adapters |
| Business use case | module services with `execute()` |
| Query/write | module repositories |
| Cross-module contract | `src/server/shared/ports/`; wire implementations in composition |
| Persistence/transaction context | `src/server/db/` |
| Test | nearby `__tests__/*.test.ts(x)` or server API integration suite |

Requests flow through auth/CSRF guards, controller.handle, service.execute, repository and MongoDB. Controllers do not query models; services do not know Next.js/HTTP. API versions share business services and auth policy; only input/output contracts differ. Cross-module dependencies are passed through ports. Repositories/composition/production DB entry use `server-only`; ESLint prohibits frontend/shared-contract imports of server code.

Transaction services own balance deltas and validate references. Repositories recheck wallet/category ownership and type compatibility immediately before create/update. Each model write needs a repository-issued, single-use capability bound to an active transaction session; save, query mutations, insertMany and bulkWrite otherwise reject. Create/update/delete and balance changes share a UnitOfWork. Use services for application writes. Raw collection access bypasses middleware and is reserved for migrations, explicit test fixtures and internal cascades that delete the owning wallet(s). Category deletion clears references without changing balances. System-category guards and user/wallet persistence cascades remain for internal compatibility and propagate caller sessions. Migrations are operational source and never run during installation/build/startup.

## 4. UI rules and integration status

Use shadcn/ui base controls and lucide-react icons. Add shadcn components from root using `npx shadcn add <name>`. Validate external data with Zod. Keep client-only form validation separate from persisted HTTP schemas. Zustand holds UI state; TanStack Query handles actual API mutations through the root QueryClientProvider.

Login/register/logout now use `/api/v1/auth/*`. Registration sends matching passwords and consent; the existing User schema does not persist the form's name. Successful login redirects to dashboard; logout clears the cookie and query cache before redirecting. Errors remain visible rather than reporting fake success.

Category/transaction/dashboard screens and displayed profile details remain mock/demo data. The v1 wallet API supports `GET` and `POST /api/v1/wallets`, but the wallet screen is not integrated. Wallet creation currently has no per-user limit. Category/transaction lists, reports and current-user APIs remain unimplemented. Existing browser routes remain `/`, `/login`, `/register`, `/dashboard`, `/category`, `/transactions`.

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
| VERCEL_ENV / VERCEL_URL / VERCEL_BRANCH_URL | Platform-owned metadata used for exact preview deployment/branch origins |

Never trust request Host/X-Forwarded-Host as an origin allowlist. No wildcard *.vercel.app. System deployment URLs are hostnames and become HTTPS origins. Verify aliases and deployment protection on a real preview before release.

Deploy the repository root as one native Next.js Vercel project with npm ci and npm run build. Browser API calls are relative and need no BACKEND_URL/rewrite. Use external managed MongoDB such as Atlas, with separate preview/prod credentials and data. Decide Atlas IP allowlisting/egress using the actual Vercel plan before production. A single app does not remove that network requirement.

Database connections are cached per warm instance, not globally across deployments. Atomicity depends on MongoDB transactions, never process-local locks. Existing Google fonts require network access during builds. Swagger assets must be included in deployed function output and verified on preview. No Vercel deployment has been performed by this change.

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

Generators work without DB/secrets and resolve paths relative to their files. Never hand-edit generated ERD/HTML/OpenAPI artifacts. Update README, codebase, API docs, manifests, CI and agent instructions together when paths/commands change. See [validation report](refactor-validation.md) for actual checks and remaining deployment limits.

Production builds explicitly use `next build --webpack`; this environment rejected Turbopack worker port creation (EPERM). Development still uses `next dev`.

HTTP errors share one mapper and first-issue Zod field mapping. Unknown failures return `INTERNAL_ERROR`; server diagnostics include request ID, error type, numeric driver code and stack frames, excluding error messages and attached private payloads. Legacy transaction validation remains 422; malformed JSON is 400 in both versions. Category create/update reuse the shared Zod schemas. The v1 transaction response is mapped only in `versioned-handlers.ts`; the transaction DTO exposes only the legacy representation. Category HTTP and compatibility callers share one delete service instance.
