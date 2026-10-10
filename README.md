# FinLover

A modular Next.js application with frontend features, server controllers/services/repositories, shared Zod contracts and MongoDB transactions. One package, one lockfile, one Vercel project. Use Node.js 24 and npm.

```bash
npm ci
cp .env.example .env.local
# Set JWT_SECRET; use a MongoDB replica set URI.
npm run infra:up
npm run dev
```

`infra:up` starts a local MongoDB replica set with Docker Compose. An existing managed replica set such as Atlas can be used instead. Open [the app](http://localhost:3000) or [Swagger](http://localhost:3000/api/docs).

Login, registration and logout call the API. `/` redirects to `/login`; authenticated users are redirected away from login/register, while `/homepage`, `/transactions` and `/category` verify the HttpOnly session on the server before rendering. Every screen reads and writes server data through `/api/v1`: wallets, transactions, categories, the Home summary and the signed-in user (`GET /api/v1/auth/me`). `/homepage`, `/transactions`, `/wallets`, `/category` and `/profile` verify the session on the server, and any 401 from the API sends the browser back to `/login`. The v1 wallet API supports create, list, detail, update, saving-goal and delete operations; legacy has no wallet operations. Wallet creation currently has no per-user limit. Registration stores the optional display name; accounts created before that show the part of their email before `@`. The sidebar's Reports and Settings entries have no pages yet.

The Category screen lists the user's categories from `GET /api/v1/categories`: the 14 system defaults seeded at registration (8 expense, 6 income, each type including an Others) plus custom ones. System categories cannot be opened, edited or deleted; custom categories are created, edited and deleted through the API, and the seeded Others stays last in each list. `/profile` shows the account's name and email and can permanently delete the account.

```bash
npm run lint
npm run type-check
npm test
npm run api:check
npm run docs:check
npm run build
npm start
```

Build downloads the existing Google Fonts. Production cookies require HTTPS. Both legacy/v1 browser-auth endpoints and cookie mutations require an explicit trusted Origin. Configure `PUBLIC_ORIGINS` for production/local and deployment-specific preview origins as described in the guide. Do not reuse production data or credentials for previews.

See the [codebase guide](docs/codebase.md) ([HTML](docs/codebase.html)), [API guide](docs/api/README.md), [ERD](docs/ERD.md), [implementation plan](docs/frontend-backend-refactor-plan.md) and [validation report](docs/refactor-validation.md).

Production builds explicitly use `next build --webpack`; this environment rejected Turbopack worker port creation (EPERM). Development still uses `next dev`.

Transaction writes must use application services: repositories enforce reference checks and model write guards require an active transaction. See [codebase rules](docs/codebase.md) and [validation evidence](docs/refactor-validation.md).
