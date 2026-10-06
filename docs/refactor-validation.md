# Modular monolith validation — 2026-09-27

Historical validation report: the statement below that no wallet endpoints were added predates issues #71/#72. The v1 wallet create, GET list/detail, and PUT update endpoints are now implemented; legacy has no wallet operations. See the current [API guide](api/README.md).

## Implemented

One root Next.js application replaces the frontend/backend workspaces and contracts package. Routes compose server controllers, services, repositories and ports; shared contracts are browser-safe source. Application transaction services own balance changes in MongoDB transactions. Browser authentication uses HttpOnly cookies; legacy and v1 share principal resolution, authorization precedence and Origin/JSON policy for cookie writes. Login/register/logout are connected to the API.

README, codebase Markdown/HTML, API specs, package manifests/lockfile, environment examples, CI/Husky, AGENT.md and CLAUDE.md now describe the single application. The previous split plan is archived.

## Observed local evidence

| Check | Result |
| --- | --- |
| Clean `npm ci` in an isolated copy without node_modules/build output | Passed; 911 packages installed. Husky correctly skipped because the copy had no .git. |
| Dependency audit during the final clean install | Zero reported vulnerabilities after updating Next.js and eslint-config-next from 16.3.1 to 16.3.6. This is a point-in-time registry audit, not a complete security review. |
| `npm run lint` | Passed with one existing unused `expect` warning in temp4.test.ts. |
| `npm run type-check` | Passed. |
| `npm test` | 19 files, 284 tests passed after the framework patch. Includes policy, contracts, ownership, balance, rollback/concurrency and auth UI coverage. |
| `npm run build` | Passed using Webpack, including Next route type checks. |
| `npm run api:check` | Passed: 9 operations each in legacy and v1, schemas/examples and route drift checked. |
| `npm run docs:generate` / `docs:check` | Passed; HTML mirror regenerated. |
| `npm run generate-erd` | Passed without a schema change. |
| `git diff --check` | Passed. |

A local production server was exercised against a disposable MongoDB replica set with generated test secrets, without using the application database. HTTP checks passed for six UI routes, Swagger HTML/CSS/bundle, both specifications, registration, login cookie attributes, missing-Origin rejection, trusted cookie mutation, legacy Bearer mutation, an atomic transaction/balance update and logout cookie clearing. The smoke was repeated after the framework patch and Swagger fix.

Browser checks confirmed login redirects to dashboard and logout returns to login. After correcting Swagger initialization, the browser rendered the legacy operation list and switched to v1. Production Swagger disables request submission. Registration was verified through HTTP and UI automated tests; no separate manual browser registration claim is made.

## Decisions and remaining limits

- Production builds explicitly use `next build --webpack`. Turbopack worker port creation failed with EPERM in this environment; the verified Webpack build is the root build command. `npm run dev` still uses Next's default development bundler and was not part of the final production smoke.
- Existing Google Fonts need network access during build. Next emits an informational warning about an unrelated parent-directory lockfile being ignored.
- No Vercel deployment was performed. Preview aliases/Origin metadata, deployment protection, packaged Swagger assets on Vercel, function execution and Atlas connectivity/IP allowlisting still require a real preview deployment with separate preview credentials.
- Category/transaction/dashboard data and profile display remain mocked; no list/report/wallet/current-user endpoints were added. This completes the architecture/auth integration scope, not all product functionality.
- Logout clears the browser cookie but does not revoke an already issued stateless JWT. Full name remains a form-only field under the existing user contract.
- No database migration, schema conversion, commit or push was performed.

## Review fixes — 2026-09-28

- Transaction model middleware now rejects save, query mutation, insertMany and bulkWrite unless a repository authorizes the individual operation in an active transaction. Balance ownership remains in application services; repositories independently recheck references on create/update.
- Internal user/wallet cascades use explicitly scoped collection deletion because their owning wallets are removed too; rollback/session propagation is covered. Raw collection access remains a deliberate low-level escape for migrations and test fixtures, not an application API.
- Category routes and the compatibility cascade share one delete service. Removed the unused wallet cascade and unused transaction DTO v1 method; exact v1 response mapping is covered by contract assertions.
- HTTP error handling and Zod issue mapping are shared. Logs retain request ID, error type, numeric driver code and stack frames, excluding messages/private attached data. All unexpected errors use INTERNAL_ERROR. Malformed legacy transaction JSON now returns 400; OpenAPI is regenerated.
- Category services and v1 routes validate with the same shared Zod schemas.

Verification for these fixes: 20 test files / 296 tests passed using disposable local MongoDB replica sets; lint passed with the existing temp4.test.ts warning; type-check, production Webpack build, API drift checks, documentation checks and ERD generation passed. No production database, deployment, commit or push was involved. The earlier browser/HTTP smoke above was not repeated for this patch.
