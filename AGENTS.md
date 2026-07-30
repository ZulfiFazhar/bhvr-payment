# Project Instructions for AI Agents

Welcome! This file contains essential developer command flows and technical quirks for this workspace.

## Tech Stack
- **Backend:** Hono, running on Cloudflare Workers.
- **Database:** Cloudflare D1 (SQLite) with Drizzle ORM.
- **Authentication:** Better Auth.
- **Frontend:** React SPA, TanStack Router.

---

## Developer Commands

### 1. Database Operations
Always execute migrations before seeding or starting the server:
- **Generate migrations:** `bun run db:generate`
- **Apply migrations (Local):** `bun run db:migrate:local`
- **Apply migrations (Remote):** `bun run db:migrate:remote`
- **Seed database:** `bun run db:seed`
- **Open Drizzle Studio:** `bun run db:studio`

### 2. Development & Deployment
- **Local Dev Server:** `bun run dev` (starts Vite)
- **Production Build:** `bun run build`
- **Deploy to Cloudflare:** `bun run deploy`

---

## Seed Accounts
Database seeder creates two accounts (hashed via Better Auth `credential` provider):
- **User:** `user@sumopod.com` / `password123` (Initial balance: Rp 100.000)
- **Admin:** `admin@sumopod.com` / `password123` (Initial balance: Rp 0)

---

## Known Quirks & Gotchas
1. **Local SQLite File Locking:** When running `wrangler dev` (via `bun run dev`), the local SQLite file in `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` might be locked. Using `npm` to install packages or write to the database might fail with `EBUSY`. Use `bun` commands to bypass lock issues.
2. **API Payload Mappings:** SumoPod Sandbox API expects/returns:
   - `payment_id` (not `id`)
   - `payment_link_url` (not `payment_url` or `paymentUrl`)
   - Webhook validation requires matching `X-Webhook-Token` (token based validation).
3. **Interactive API Docs:** Available locally or in production at `/api/docs` (Swagger UI). Spec is served at `/api/openapi.json`.
