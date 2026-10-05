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

Login, registration and logout call the API. Transaction/category/dashboard screens still use mock data; the displayed profile name remains demo data. Registration's name field is validated in the UI but is not persisted by the existing User schema. Complete server-data integration remains separate work.

The Category screen includes 11 fixed expense categories and 6 fixed income categories. Built-in categories cannot be opened, edited or deleted; custom categories remain editable and appear before the final Other category in each list.

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
