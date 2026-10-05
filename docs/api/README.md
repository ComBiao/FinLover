# API guide

Open `/api/docs` on the application origin (port 3000 locally). Both versions are implemented for the nine operations below. Specs are served at `/api/openapi/legacy.json` and `/api/openapi/v1.json`; committed artifacts are [legacy.json](legacy.json) and [v1.json](v1.json). Relative server `/` keeps requests on the current origin without doubling `/api`.

| Method | Legacy | v1 |
| --- | --- | --- |
| POST | `/api/auth/register` | `/api/v1/auth/register` |
| POST | `/api/auth/login` | `/api/v1/auth/login` |
| POST | `/api/auth/logout` | `/api/v1/auth/logout` |
| POST | `/api/categories` | `/api/v1/categories` |
| PUT, DELETE | `/api/categories/{id}` | `/api/v1/categories/{id}` |
| POST | `/api/transaction` | `/api/v1/transactions` |
| PUT, DELETE | `/api/transaction/{id}` | `/api/v1/transactions/{id}` |

The v1 API implements a monthly transaction read at `GET /api/v1/transactions?month=YYYY-MM`; omitting `month` uses the current month in `APPLICATION_TIMEZONE`. Other GET lists, wallet APIs, reports and current-user endpoints remain unimplemented. Existing UI mock screens do not call all of these APIs.

## Authentication and examples

Register with email, password, matching confirmPassword and `dataPrivacyConsent: true`; then login on the same origin. Login sets an HttpOnly cookie for seven days. JavaScript cannot read that cookie; the browser sends it automatically. Swagger's Bearer Authorize control accepts a test JWT from a trusted test setup; login does not expose a token in the JSON response. Both legacy and v1 protected APIs accept the session cookie or a valid Bearer token through the same principal resolver.

For cookie writes and login/register/logout configure `PUBLIC_ORIGINS` to include the exact origin used by the browser. Unknown, missing, null or malformed Origin is rejected, including on login/register/logout before a session exists. Body-bearing cookie/browser-auth requests must be application/json (otherwise 415). Verified Bearer requests on protected APIs do not require Origin. In previews the exact platform deployment/branch origins plus optional PREVIEW_ORIGINS replace the production allowlist. An Authorization header takes priority over cookies and cannot fall back when invalid. Logout removes the cookie, but an issued JWT remains valid until expiry. Production uses Secure cookies and therefore requires HTTPS.

Example v1 transaction body (replace IDs with records owned by the test user):

```json
{"walletId":"507f1f77bcf86cd799439011","categoryId":null,"type":"expense","amount":42,"date":"2026-09-27","note":"Lunch"}
```

Legacy uses `wallet_id`, `category_id`, and request type `Expense`/`Income`. Responses persist lowercase types. v1 validates ISO calendar dates and minimum amount 0.01; legacy retains its original request parsing/status behavior. Legacy transaction field validation returns 422, malformed JSON returns 500, and DELETE returns empty 204. v1 validation returns 400 and DELETE returns `{ "status": true, "data": null }`. Category updates are partial; transaction updates replace editable fields and cannot move wallet through the HTTP API.

Create/update/delete transaction and balance writes are atomic and require a MongoDB replica set. Category deletion sets linked category references to null without deleting transactions or changing wallet balances. Ownership checks exclude other users' records; system categories cannot be mutated.

## Documentation workflow

Run from the repository root:

```bash
npm run api:generate
npm run api:validate
npm run api:check
```

Shared schemas live in `src/shared/contracts/`; operation metadata lives in `src/server/shared/docs/openapi.ts`. Generation does not need MongoDB or secrets. Update schema, operation metadata, generated artifacts and tests in one change. HTTP contract tests validate handler status/body against the same schema definitions, including errors and empty legacy DELETE responses. Custom rules such as password byte length and confirmPassword equality are described in operation text because JSON Schema alone cannot express them all.

Swagger serves local assets under `/api/docs/assets/` and are included in the single application build. In development, Try it out can create/update/delete test data. In production all submit methods are disabled by the server-rendered configuration; API authentication still applies independently. Use a dedicated test database for manual exploration.

Auth policy changes from the old legacy API: cookie support is now shared with v1; browser-auth and cookie mutations now return 403 for untrusted/missing Origin and 415 for non-JSON bodies. Cookie SameSite alone is not used as CSRF protection. No token is copied into a synthetic Authorization header.
