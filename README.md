# Payment Gateway System

A modern payment gateway integration using Hono on Cloudflare Workers, Better Auth for authentication, Drizzle ORM with Cloudflare D1 (SQLite), and React SPA on the frontend.

## Stack
- **Backend:** Hono, running on Cloudflare Workers
- **Frontend:** React, Tailwind CSS, TanStack Router
- **Database:** Drizzle ORM + Cloudflare D1 (SQLite)
- **Auth:** Better Auth (credential provider)

## Get Started

### 1. Install dependencies
```bash
bun install
```

### 2. Set environment variables
Create `.dev.vars` for local development:
```env
BETTER_AUTH_SECRET="your-better-auth-secret-min-32-chars"
BETTER_AUTH_URL="http://localhost:5173"
SUMOPOD_API_KEY="your-sumopod-sandbox-api-key"
SUMOPOD_WEBHOOK_TOKEN="your-sumopod-webhook-token"
```

### 3. Run migrations and seed data
```bash
bun run db:migrate:local
bun run db:seed
```

### 4. Start local development server
```bash
bun run dev
```

## Production Deployment

### 1. Deploy to Cloudflare
```bash
bun run db:migrate:remote
bun run deploy
```

## Scripts
- `bun run dev`: Start local development server (Vite)
- `bun run build`: Build client & worker for production
- `bun run deploy`: Build and deploy to Cloudflare
- `bun run db:generate`: Generate migration files
- `bun run db:migrate:local`: Apply migrations to local D1 SQLite DB
- `bun run db:migrate:remote`: Apply migrations to remote D1 DB on Cloudflare
- `bun run db:seed`: Seed local database with user & admin accounts
- `bun run db:studio`: Open Drizzle Studio to inspect local DB
- `bun run cf-typegen`: Generate Cloudflare binding types

## API Documentation
Interactive API docs (Swagger UI) are available at:
- `/api/docs`
- Spec definition served at `/api/openapi.json`
